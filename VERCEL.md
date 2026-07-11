# Deploy no Vercel

Guia de deploy do PsicoSage no Vercel. O projeto foi adaptado para rodar
inteiramente em funções serverless (sem Docker).

## ⚠️ Segurança — leia primeiro

O antigo `deploy.yml` (Docker, removido) tinha a **service_role key do Supabase
embutida como `NEXT_PUBLIC_SUPABASE_ANON_KEY`**. Isso é um vazamento: a
service_role bypassa RLS e ficaria exposta no bundle do browser.

- **Rotacione a service_role key** no Supabase (Settings → API → Reset) antes de ir pra produção.
- No Vercel, use a **anon key** (pública) em `NEXT_PUBLIC_SUPABASE_ANON_KEY` e a
  **service_role** apenas em `SUPABASE_SERVICE_ROLE_KEY` (sem `NEXT_PUBLIC_`).

## 1. Pré-requisitos no Supabase

1. Rode todas as migrations em `supabase/migrations/` (até `018_storage_bucket_audio.sql`).
   A 018 cria o bucket privado `audio-sessoes`.
2. Confirme que o bucket `audio-sessoes` existe e está **privado**.

## 2. Processamento (transcrição + prontuário)

Não há fila externa. O processamento é orquestrado pelo navegador, em duas
etapas síncronas, cada uma cabendo no limite de 60s do Hobby:

1. `POST /api/sessoes/[id]/transcribe` — transcreve o áudio (Groq) e salva a íntegra
2. `POST /api/sessoes/[id]/extract` — gera o prontuário (OpenAI) → `aguardando_aprovacao`

Resiliência sem fila:
- **Retry**: cada etapa é re-tentada 2–3x com backoff (falhas transitórias de API).
- **Recover-on-visit**: ao reabrir uma sessão que ficou travada (ex: aba fechada no
  meio), o cliente retoma automaticamente a etapa que faltou.
- **Manual**: o botão "Reprocessar" refaz o processamento a qualquer momento.

> Não é preciso configurar Inngest nem nenhum serviço de background.

## 3. Variáveis de ambiente no Vercel

Settings → Environment Variables. **Não suba o `.env.example`** — ele é só um
template. Cadastre os valores reais:

| Variável | Obrigatória | Notas |
|----------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | chave **anon** (pública) — nunca a service_role |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | server-side; signed uploads + jobs |
| `GROQ_API_KEY` | ✅ | transcrição (Whisper) |
| `OPENAI_API_KEY` | ✅ | extração do resumo |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅* | Google Meet/Calendar (se usar telehealth) |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL pública do app (ex: `https://seu-app.vercel.app`) |
| `ENCRYPTION_KEY` | ✅ | AES-256-GCM dos dados clínicos. **Se perder, dados ficam irrecuperáveis.** |
| `RESEND_API_KEY` / `RESEND_DOMAIN` | opcional | emails de comprovante |
| `COMPROVANTE_HMAC_SECRET` | opcional | fallback é a service_role |
| `SENTRY_DSN` | opcional | monitoramento |

> Atualize o **Redirect URI** do Google OAuth para
> `{NEXT_PUBLIC_APP_URL}/api/auth/google/callback`.

## 4. Deploy

```bash
# via CLI
npx vercel        # preview
npx vercel --prod # produção
```
Ou conecte o repositório no dashboard do Vercel (auto-deploy no push pra `main`).
O Vercel detecta Next.js automaticamente — sem `vercel.json`.

## Limitações no plano Hobby

- **Timeout de 60s por função.** Transcrição e extração são chamadas separadas,
  cada uma ≤60s. Para caber nesse limite, a gravação usa áudio opus a 32kbps
  (`AUDIO_BITS_PER_SECOND` em `components/session-recorder.tsx`), o que mantém
  sessões de ~50min bem abaixo dos 25MB do Groq.
- **Uploads manuais muito grandes** (ex: mp3 de 1h+ em alta qualidade) podem
  precisar de split via ffmpeg, que é mais lento e pode estourar os 60s. Para
  esses casos, considere o plano **Pro** (até 300s) e aumente `maxDuration` em
  `app/api/sessoes/[id]/transcribe/route.ts` e `.../extract/route.ts`.
- O upload do áudio vai **direto do browser pro Supabase Storage** (via signed
  upload URL), contornando o limite de 4.5MB de body das funções do Vercel.

## Arquitetura de áudio (resumo)

1. Browser pede signed upload URL → `POST /api/sessoes/[id]/upload-url`
2. Browser envia o áudio direto pro Storage (`uploadToSignedUrl`)
3. Browser finaliza → `POST /api/sessoes/[id]/upload-audio` (só metadata)
4. Browser chama `POST .../transcribe` (Groq) e depois `POST .../extract` (OpenAI)
   → sessão fica em `aguardando_aprovacao`. Com retry e recover-on-visit.
