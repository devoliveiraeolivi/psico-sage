# Agente de Recomendações Clínicas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao aprovar o prontuário de uma sessão, gerar recomendações clínicas de apoio à decisão (técnicas por abordagem, hipóteses diagnósticas a investigar, escalas, psicoeducação, condução da próxima sessão e alertas de risco), exibi-las numa aba nova e usá-las para preparar a sessão seguinte.

**Architecture:** Espelha o pipeline de IA existente (`extract-resumo`): função pura de geração via OpenAI GPT-5.2 (`lib/ai/gerar-recomendacoes.ts`) + rota POST (`app/api/sessoes/[id]/recomendacoes/route.ts`) disparada pela UI logo após a aprovação. Resultado salvo criptografado (AES-256-GCM) em nova coluna `sessoes.recomendacoes`. A aba Preparação de uma sessão lê as recomendações da última sessão `realizada` anterior do mesmo paciente (read-on-render), fechando o loop sem escrever em linha futura.

**Tech Stack:** Next.js 14 (App Router, route handlers nodejs runtime), TypeScript, Supabase (Postgres + RLS), OpenAI SDK, Vitest.

## Global Constraints

- Modelo de IA: `gpt-5.2` (constante `MODEL`), `temperature: 0.3`, `response_format: { type: 'json_object' }`, `max_completion_tokens: 12000` — iguais ao `extract-resumo.ts`.
- Toda coluna sensível em `sessoes` é criptografada na aplicação via `encryptJsonField` ao salvar e `decryptJsonField<T>` ao ler (`lib/supabase/encrypt.ts`). `recomendacoes` segue a mesma regra.
- Regras de segurança no prompt (verbatim no SYSTEM_PROMPT): (a) hipóteses diagnósticas SEMPRE condicionais ("sinais compatíveis com… considere investigar"), nunca afirmação; (b) PROIBIDO citar referência bibliográfica específica (autor/ano/livro/artigo); (c) toda técnica vem com rótulo de abordagem; (d) elevar sinais de risco em `alertas_clinicos`.
- A geração de recomendações NUNCA bloqueia nem desfaz a aprovação. Erro é logado (Sentry) e a UI permite "Regerar".
- Migrations são sequenciais e idempotentes (`ADD COLUMN IF NOT EXISTS`). Próximo número: `019`.
- Runtime das rotas de IA: `export const runtime = 'nodejs'` e `export const maxDuration = 60`.

---

### Task 1: Tipo `SessaoRecomendacoes` + coluna no schema

**Files:**
- Modify: `lib/types/database.ts` (adicionar interface após `SessaoResumo`, ~linha 513; e adicionar `recomendacoes` em `sessoes.Row`/`Insert`/`Update`, ~linhas 182/208/219)
- Create: `supabase/migrations/019_sessao_recomendacoes.sql`

**Interfaces:**
- Produces: `SessaoRecomendacoes` e os subtipos `RecomendacaoTecnica`, `HipoteseDiagnostica`, `EscalaSugerida`, `PsicoeducacaoItem`, `ConducaoProximaSessao`, `AlertaClinico` — usados pelas Tasks 2-7.

- [ ] **Step 1: Adicionar os tipos em `lib/types/database.ts`**

Inserir logo após o fechamento da interface `SessaoResumo`:

```typescript
// ===== Recomendações clínicas (apoio à decisão, geradas pós-aprovação) =====

export interface RecomendacaoTecnica {
  abordagem: string          // rótulo da escola: "TCC", "ACT", "Psicanálise", "Sistêmica"...
  nome: string
  descricao_curta: string
  quando_usar: string
}

export interface HipoteseDiagnostica {
  hipotese: string           // sempre condicional ("sinais compatíveis com...")
  sistema: 'CID-11' | 'DSM-5'
  sinais_observados: string[]
  criterios_a_confirmar: string[]
  perguntas_rastreio: string[]
}

export interface EscalaSugerida {
  nome: string               // PHQ-9, GAD-7, etc.
  objetivo: string
  quando_aplicar: string
}

export interface PsicoeducacaoItem {
  tema: string
  descricao_curta: string
}

export interface ConducaoProximaSessao {
  tipo: 'retomar' | 'foco' | 'pergunta' | 'tarefa'
  conteudo: string
}

export interface AlertaClinico {
  nivel: 'urgente' | 'monitorar'
  descricao: string
}

export interface SessaoRecomendacoes {
  tecnicas_sugeridas: RecomendacaoTecnica[]
  hipoteses_diagnosticas: HipoteseDiagnostica[]
  escalas_sugeridas: EscalaSugerida[]
  psicoeducacao: PsicoeducacaoItem[]
  conducao_proxima_sessao: ConducaoProximaSessao[]
  alertas_clinicos: AlertaClinico[]
  gerado_em: string          // ISO timestamp
  modelo_ia_usado: string
}
```

- [ ] **Step 2: Adicionar a coluna ao tipo da tabela `sessoes`**

Em `lib/types/database.ts`, na seção `sessoes`, adicionar `recomendacoes` logo após a linha `resumo: ...` nos três blocos:

Em `Row` (após `resumo: SessaoResumo | null`):
```typescript
          recomendacoes: SessaoRecomendacoes | null
```
Em `Insert` (após `resumo?: SessaoResumo | null`):
```typescript
          recomendacoes?: SessaoRecomendacoes | null
```
Em `Update` (após `resumo?: SessaoResumo | null`):
```typescript
          recomendacoes?: SessaoRecomendacoes | null
```

- [ ] **Step 3: Garantir que `SessaoRecomendacoes` é reexportado de `@/lib/types`**

Verificar como `SessaoResumo` é exportado de `@/lib/types`:

Run: `grep -rn "SessaoResumo" lib/types/index.ts`
Expected: aparece um re-export (ex.: `export type { ... SessaoResumo ... } from './database'` ou `export * from './database'`).

Se for uma lista explícita de nomes (não `export *`), adicionar `SessaoRecomendacoes`, `RecomendacaoTecnica`, `HipoteseDiagnostica`, `EscalaSugerida`, `PsicoeducacaoItem`, `ConducaoProximaSessao`, `AlertaClinico` à lista. Se for `export *`, nada a fazer.

- [ ] **Step 4: Criar a migration `019_sessao_recomendacoes.sql`**

```sql
-- Migration 019: coluna de recomendações clínicas (apoio à decisão)
-- Gerada pela IA após a aprovação do prontuário. Conteúdo criptografado na
-- aplicação (AES-256-GCM), então a coluna guarda string "enc:v1:..." ou JSONB
-- legado. Tipo lógico: SessaoRecomendacoes.

ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS recomendacoes JSONB;

COMMENT ON COLUMN sessoes.recomendacoes IS 'Recomendações clínicas (SessaoRecomendacoes) geradas pela IA após aprovação. Criptografadas na aplicação.';
```

> Nota: NÃO criar índice GIN — o conteúdo é criptografado, então índice por path JSONB seria inútil. Mantém igual a `resumo`/`integra`.

- [ ] **Step 5: Verificar type-check**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a `recomendacoes`/`SessaoRecomendacoes`.

- [ ] **Step 6: Commit**

```bash
git add lib/types/database.ts lib/types/index.ts supabase/migrations/019_sessao_recomendacoes.sql
git commit -m "feat(recomendacoes): tipo SessaoRecomendacoes + coluna sessoes.recomendacoes"
```

---

### Task 2: Suporte de criptografia para `recomendacoes`

**Files:**
- Modify: `lib/supabase/encrypt.ts:69-74` (função `decryptSessao`) + comentário do cabeçalho (linhas 7-13)
- Test: `__tests__/encrypt.test.ts` (bloco `describe('decryptSessao')`)

**Interfaces:**
- Consumes: `encryptJsonField`, `decryptJsonField` (já existem).
- Produces: `decryptSessao` agora também decripta `recomendacoes` in-place.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar dentro de `describe('decryptSessao', ...)` em `__tests__/encrypt.test.ts`:

```typescript
    it('decrypts the recomendacoes field in-place', async () => {
      const { encryptJsonField, decryptSessao } = await import('@/lib/supabase/encrypt')
      const recomendacoes = {
        tecnicas_sugeridas: [{ abordagem: 'TCC', nome: 'Reestruturação cognitiva', descricao_curta: 'x', quando_usar: 'y' }],
        hipoteses_diagnosticas: [],
        escalas_sugeridas: [],
        psicoeducacao: [],
        conducao_proxima_sessao: [],
        alertas_clinicos: [],
        gerado_em: '2026-06-20T00:00:00.000Z',
        modelo_ia_usado: 'gpt-5.2',
      }
      const sessao = { id: '1', recomendacoes: encryptJsonField(recomendacoes) }
      decryptSessao(sessao)
      expect(sessao.recomendacoes).toEqual(recomendacoes)
    })
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run __tests__/encrypt.test.ts -t "decrypts the recomendacoes field"`
Expected: FAIL — `sessao.recomendacoes` continua como string `enc:v1:...` (decryptSessao ainda não trata o campo).

- [ ] **Step 3: Implementar — tratar `recomendacoes` em `decryptSessao`**

Em `lib/supabase/encrypt.ts`, na função `decryptSessao`, adicionar a linha antes do `return sessao`:

```typescript
  if ('recomendacoes' in sessao) sessao.recomendacoes = decryptJsonField(sessao.recomendacoes)
```

E atualizar o comentário do cabeçalho (lista de campos criptografados) adicionando:
```
 *   sessoes.recomendacoes (jsonb) — recomendações clínicas
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run __tests__/encrypt.test.ts`
Expected: PASS (todos os testes do arquivo, incluindo o novo).

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/encrypt.ts __tests__/encrypt.test.ts
git commit -m "feat(recomendacoes): decryptSessao trata coluna recomendacoes"
```

---

### Task 3: Lógica de geração via OpenAI (`lib/ai/gerar-recomendacoes.ts`)

**Files:**
- Create: `lib/ai/gerar-recomendacoes.ts`
- Test: `__tests__/gerar-recomendacoes.test.ts`

**Interfaces:**
- Consumes: `SessaoResumo`, `PacienteResumo`, `SessaoRecomendacoes` (Task 1); `withRetry` (`@/lib/utils/retry`), `logger` (`@/lib/utils/logger`).
- Produces:
  - `normalizeRecomendacoes(parsed: any, modelo: string, geradoEm: string): SessaoRecomendacoes` — função pura que aplica defaults seguros.
  - `generateRecomendacoes(resumo: SessaoResumo, pacienteResumo: PacienteResumo | null): Promise<SessaoRecomendacoes>` — chama a OpenAI e normaliza.

- [ ] **Step 1: Escrever o teste que falha (função pura de normalização)**

Create `__tests__/gerar-recomendacoes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { normalizeRecomendacoes } from '@/lib/ai/gerar-recomendacoes'

describe('normalizeRecomendacoes', () => {
  it('fills safe defaults for an empty payload', () => {
    const r = normalizeRecomendacoes({}, 'gpt-5.2', '2026-06-20T00:00:00.000Z')
    expect(r.tecnicas_sugeridas).toEqual([])
    expect(r.hipoteses_diagnosticas).toEqual([])
    expect(r.escalas_sugeridas).toEqual([])
    expect(r.psicoeducacao).toEqual([])
    expect(r.conducao_proxima_sessao).toEqual([])
    expect(r.alertas_clinicos).toEqual([])
    expect(r.modelo_ia_usado).toBe('gpt-5.2')
    expect(r.gerado_em).toBe('2026-06-20T00:00:00.000Z')
  })

  it('coerces hipotese sistema to a valid value and keeps arrays', () => {
    const r = normalizeRecomendacoes({
      hipoteses_diagnosticas: [
        { hipotese: 'sinais compatíveis com TAG', sistema: 'inventado', sinais_observados: ['preocupação excessiva'], criterios_a_confirmar: ['duração 6m'], perguntas_rastreio: ['Há quanto tempo?'] },
      ],
      tecnicas_sugeridas: [
        { abordagem: 'TCC', nome: 'Reestruturação', descricao_curta: 'd', quando_usar: 'q' },
      ],
    }, 'gpt-5.2', '2026-06-20T00:00:00.000Z')
    expect(r.hipoteses_diagnosticas[0].sistema).toBe('CID-11') // default quando valor inválido
    expect(r.hipoteses_diagnosticas[0].sinais_observados).toEqual(['preocupação excessiva'])
    expect(r.tecnicas_sugeridas[0].abordagem).toBe('TCC')
  })

  it('coerces alerta nivel to a valid value', () => {
    const r = normalizeRecomendacoes({
      alertas_clinicos: [{ nivel: 'qualquer', descricao: 'menção a desesperança' }],
    }, 'gpt-5.2', '2026-06-20T00:00:00.000Z')
    expect(r.alertas_clinicos[0].nivel).toBe('monitorar') // default seguro
    expect(r.alertas_clinicos[0].descricao).toBe('menção a desesperança')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run __tests__/gerar-recomendacoes.test.ts`
Expected: FAIL — módulo `@/lib/ai/gerar-recomendacoes` não existe.

- [ ] **Step 3: Implementar `lib/ai/gerar-recomendacoes.ts`**

```typescript
/**
 * Geração de recomendações clínicas de APOIO À DECISÃO a partir do prontuário
 * aprovado. Usa OpenAI GPT-5.2. Não substitui o julgamento do profissional.
 */

import OpenAI from 'openai'
import type {
  SessaoResumo,
  PacienteResumo,
  SessaoRecomendacoes,
  HipoteseDiagnostica,
  AlertaClinico,
  ConducaoProximaSessao,
} from '@/lib/types'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

const MODEL = 'gpt-5.2'

const SYSTEM_PROMPT = `# PAPEL

Você é um assistente clínico de APOIO À DECISÃO para psicólogos. A partir do prontuário já revisado de uma sessão, sugira caminhos terapêuticos. Você NÃO substitui o julgamento clínico do profissional — apenas oferece opções para ele considerar.

# REGRAS INVIOLÁVEIS

1. **Diagnóstico é HIPÓTESE, nunca afirmação.** Use sempre linguagem condicional: "sinais compatíveis com X, considere investigar". Liste critérios que ainda faltam confirmar e perguntas de rastreio. Ancore em CID-11 ou DSM-5.
2. **NUNCA cite referência bibliográfica específica** (autor, ano, livro, artigo, número de página). Fale "técnica de reestruturação cognitiva", nunca "(Beck, 2011)". Inventar fonte é proibido.
3. **Toda técnica vem com rótulo de abordagem** (ex.: "TCC", "ACT", "Psicanálise", "Sistêmica", "Fenomenológica"). Cubra múltiplas abordagens quando fizer sentido.
4. **Eleve sinais de risco** (ideação suicida, autoagressão, heteroagressão, violência) em alertas_clinicos com nivel "urgente".
5. **Não invente conteúdo** que não tenha base no prontuário. Campo sem base = lista vazia [].

# SAÍDA

Responda APENAS com JSON válido, sem markdown, no formato:

{
  "tecnicas_sugeridas": [
    { "abordagem": "TCC", "nome": "...", "descricao_curta": "...", "quando_usar": "..." }
  ],
  "hipoteses_diagnosticas": [
    { "hipotese": "sinais compatíveis com ...", "sistema": "CID-11", "sinais_observados": ["..."], "criterios_a_confirmar": ["..."], "perguntas_rastreio": ["..."] }
  ],
  "escalas_sugeridas": [
    { "nome": "PHQ-9", "objetivo": "...", "quando_aplicar": "..." }
  ],
  "psicoeducacao": [
    { "tema": "...", "descricao_curta": "..." }
  ],
  "conducao_proxima_sessao": [
    { "tipo": "retomar", "conteudo": "..." }
  ],
  "alertas_clinicos": [
    { "nivel": "monitorar", "descricao": "..." }
  ]
}

Onde "sistema" ∈ {"CID-11","DSM-5"}, "tipo" ∈ {"retomar","foco","pergunta","tarefa"}, "nivel" ∈ {"urgente","monitorar"}.`

const SISTEMAS = ['CID-11', 'DSM-5'] as const
const TIPOS_CONDUCAO = ['retomar', 'foco', 'pergunta', 'tarefa'] as const
const NIVEIS_ALERTA = ['urgente', 'monitorar'] as const

const asArray = (v: any): any[] => (Array.isArray(v) ? v : [])
const asStr = (v: any): string => (typeof v === 'string' ? v : '')
const asStrArray = (v: any): string[] => asArray(v).filter((x) => typeof x === 'string')

export function normalizeRecomendacoes(
  parsed: any,
  modelo: string,
  geradoEm: string
): SessaoRecomendacoes {
  const p = parsed || {}

  const hipoteses: HipoteseDiagnostica[] = asArray(p.hipoteses_diagnosticas).map((h: any) => ({
    hipotese: asStr(h?.hipotese),
    sistema: SISTEMAS.includes(h?.sistema) ? h.sistema : 'CID-11',
    sinais_observados: asStrArray(h?.sinais_observados),
    criterios_a_confirmar: asStrArray(h?.criterios_a_confirmar),
    perguntas_rastreio: asStrArray(h?.perguntas_rastreio),
  }))

  const conducao: ConducaoProximaSessao[] = asArray(p.conducao_proxima_sessao).map((c: any) => ({
    tipo: TIPOS_CONDUCAO.includes(c?.tipo) ? c.tipo : 'foco',
    conteudo: asStr(c?.conteudo),
  }))

  const alertas: AlertaClinico[] = asArray(p.alertas_clinicos).map((a: any) => ({
    nivel: NIVEIS_ALERTA.includes(a?.nivel) ? a.nivel : 'monitorar',
    descricao: asStr(a?.descricao),
  }))

  return {
    tecnicas_sugeridas: asArray(p.tecnicas_sugeridas).map((t: any) => ({
      abordagem: asStr(t?.abordagem),
      nome: asStr(t?.nome),
      descricao_curta: asStr(t?.descricao_curta),
      quando_usar: asStr(t?.quando_usar),
    })),
    hipoteses_diagnosticas: hipoteses,
    escalas_sugeridas: asArray(p.escalas_sugeridas).map((e: any) => ({
      nome: asStr(e?.nome),
      objetivo: asStr(e?.objetivo),
      quando_aplicar: asStr(e?.quando_aplicar),
    })),
    psicoeducacao: asArray(p.psicoeducacao).map((e: any) => ({
      tema: asStr(e?.tema),
      descricao_curta: asStr(e?.descricao_curta),
    })),
    conducao_proxima_sessao: conducao,
    alertas_clinicos: alertas,
    gerado_em: geradoEm,
    modelo_ia_usado: modelo,
  }
}

export async function generateRecomendacoes(
  resumo: SessaoResumo,
  pacienteResumo: PacienteResumo | null
): Promise<SessaoRecomendacoes> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não configurada')
  }

  const openai = new OpenAI({ apiKey })

  const contextoPaciente = pacienteResumo
    ? `\n\n<contexto_paciente>\n${JSON.stringify(pacienteResumo)}\n</contexto_paciente>`
    : ''

  logger.info('OpenAI recomendacoes starting')

  const parsed = await withRetry(
    async () => {
      const response = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        max_completion_tokens: 12000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `A partir do prontuário aprovado a seguir, gere recomendações clínicas de apoio à decisão:\n\n<prontuario>\n${JSON.stringify(resumo)}\n</prontuario>${contextoPaciente}`,
          },
        ],
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('OpenAI retornou resposta vazia')
      }
      try {
        return JSON.parse(content)
      } catch {
        throw new Error(`OpenAI retornou JSON inválido: ${(content || '').slice(0, 200)}`)
      }
    },
    {
      maxRetries: 2,
      timeoutMs: 180_000,
      baseDelayMs: 3000,
      onRetry: (error, attempt) => {
        logger.warn('OpenAI recomendacoes retry', { attempt, error: error.message })
      },
    }
  )

  logger.info('OpenAI recomendacoes complete')

  return normalizeRecomendacoes(parsed, MODEL, new Date().toISOString())
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run __tests__/gerar-recomendacoes.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Verificar type-check**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add lib/ai/gerar-recomendacoes.ts __tests__/gerar-recomendacoes.test.ts
git commit -m "feat(recomendacoes): lógica de geração via OpenAI + normalização"
```

---

### Task 4: Rota POST `app/api/sessoes/[id]/recomendacoes/route.ts`

**Files:**
- Create: `app/api/sessoes/[id]/recomendacoes/route.ts`

**Interfaces:**
- Consumes: `generateRecomendacoes` (Task 3); `requireAuth`, `requireSessionOwner` (`@/lib/utils/auth`); `decryptJsonField`, `encryptJsonField` (`@/lib/supabase/encrypt`); `checkRateLimit`, `RATE_LIMITS` (`@/lib/utils/rate-limit`); `logger`, `captureException`.
- Produces: `POST /api/sessoes/[id]/recomendacoes` → `{ ok: true }` em sucesso.

- [ ] **Step 1: Confirmar a chave de rate limit disponível**

Run: `grep -n "extract\|adjust\|RATE_LIMITS" lib/utils/rate-limit.ts`
Expected: existe um objeto `RATE_LIMITS` com chaves como `extract`. Reutilizaremos `RATE_LIMITS.extract` (mesma classe de operação cara de IA). Se houver uma chave mais específica, prefira-a; caso contrário, `RATE_LIMITS.extract` é o fallback correto.

- [ ] **Step 2: Implementar a rota**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { createClient } from '@/lib/supabase/server'
import { generateRecomendacoes } from '@/lib/ai/gerar-recomendacoes'
import { decryptJsonField, encryptJsonField } from '@/lib/supabase/encrypt'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { captureException } from '@/lib/utils/sentry'
import type { SessaoResumo, PacienteResumo } from '@/lib/types'

export const maxDuration = 60
export const runtime = 'nodejs'

/**
 * POST /api/sessoes/[id]/recomendacoes
 *
 * Gera recomendações clínicas a partir do prontuário (resumo) já aprovado.
 * Idempotente: se já existir `recomendacoes`, só regera quando `?force=1`.
 * Complementar — NUNCA bloqueia/desfaz a aprovação.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError

    const ownership = await requireSessionOwner(db, user!.id, id)
    if (ownership.error) return ownership.error

    const rl = checkRateLimit(`recomendacoes:${user!.id}`, RATE_LIMITS.extract)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em breve.', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429 }
      )
    }

    const force = new URL(request.url).searchParams.get('force') === '1'

    const { data: sessao, error: fetchError } = await db
      .from('sessoes')
      .select('resumo, recomendacoes, pacientes(resumo)')
      .eq('id', id)
      .single()

    if (fetchError || !sessao?.resumo) {
      return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 })
    }

    // Idempotência: não regerar se já existe (a menos que force)
    if (sessao.recomendacoes && !force) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const resumo = decryptJsonField<SessaoResumo>(sessao.resumo)
    if (!resumo) {
      return NextResponse.json({ error: 'Falha ao ler o prontuário' }, { status: 500 })
    }

    const pacienteResumo = decryptJsonField<PacienteResumo>(sessao.pacientes?.resumo)

    logger.info('Recomendacoes starting', { sessaoId: id })
    const recomendacoes = await generateRecomendacoes(resumo, pacienteResumo)

    await db
      .from('sessoes')
      .update({ recomendacoes: encryptJsonField(recomendacoes) })
      .eq('id', id)

    logger.info('Recomendacoes complete', { sessaoId: id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    logger.error('Recomendacoes failed', { sessaoId: id, error: message })
    if (error instanceof Error) captureException(error, { sessaoId: id, operation: 'recomendacoes' })
    return NextResponse.json({ error: 'Erro ao gerar recomendações' }, { status: 500 })
  }
}
```

> Nota: ao contrário do `extract`, NÃO escrevemos `recording_status: 'error'` em falha — recomendações são complementares e não devem alterar o estado da sessão.

- [ ] **Step 3: Verificar type-check e build da rota**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/api/sessoes/[id]/recomendacoes/route.ts
git commit -m "feat(recomendacoes): rota POST que gera e salva recomendações"
```

---

### Task 5: Disparar a geração após a aprovação (UI)

**Files:**
- Modify: `components/approval-modal.tsx:129-146` (função `handleApprove`)

**Interfaces:**
- Consumes: `POST /api/sessoes/[id]/recomendacoes` (Task 4).
- Produces: efeito colateral — recomendações geradas em background após aprovar.

- [ ] **Step 1: Disparar fire-and-forget após aprovação bem-sucedida**

Em `components/approval-modal.tsx`, dentro de `handleApprove`, logo após o `if (!res.ok) { ... return }` e ANTES de `onClose()`, adicionar a chamada não-bloqueante:

```typescript
      // Dispara geração de recomendações em background (não bloqueia a aprovação).
      // Falha aqui é silenciosa — a aba Recomendações oferece "Regerar".
      fetch(`/api/sessoes/${sessaoId}/recomendacoes`, { method: 'POST' }).catch(() => {})
      onClose()
      router.refresh()
```

(O bloco final fica: dispara recomendações → `onClose()` → `router.refresh()`.)

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build conclui sem erros de tipo/lint.

- [ ] **Step 3: Commit**

```bash
git add components/approval-modal.tsx
git commit -m "feat(recomendacoes): dispara geração em background ao aprovar"
```

---

### Task 6: Aba "Recomendações" na sessão

**Files:**
- Create: `components/recomendacoes-tab.tsx`
- Modify: `components/sessao-tabs.tsx` (props, lista de tabs, render do conteúdo)
- Modify: `app/(app)/sessoes/[id]/page.tsx:164-173` (passar a prop `recomendacoes`)

**Interfaces:**
- Consumes: `SessaoRecomendacoes` (Task 1); `sessao.recomendacoes` (já decriptado por `decryptSessao` na página).
- Produces: aba visível quando `recomendacoes` existe, com botão "Regerar".

- [ ] **Step 1: Criar o componente da aba**

Create `components/recomendacoes-tab.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SessaoRecomendacoes } from '@/lib/types'
import { useToast } from './toast'

const DISCLAIMER = 'Sugestões de apoio à decisão geradas por IA. A responsabilidade clínica é do profissional. Hipóteses diagnósticas devem ser investigadas, não assumidas.'

export function RecomendacoesTab({
  recomendacoes,
  sessaoId,
}: {
  recomendacoes: SessaoRecomendacoes | null
  sessaoId: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [regenerating, setRegenerating] = useState(false)

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const res = await fetch(`/api/sessoes/${sessaoId}/recomendacoes?force=1`, { method: 'POST' })
      if (!res.ok) {
        toast('Erro ao gerar recomendações. Tente novamente.', 'error')
        setRegenerating(false)
        return
      }
      router.refresh()
    } catch {
      toast('Erro de conexão. Tente novamente.', 'error')
      setRegenerating(false)
    }
  }

  if (!recomendacoes) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm mb-3">As recomendações são geradas após a aprovação do prontuário.</p>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {regenerating ? 'Gerando...' : 'Gerar recomendações'}
        </button>
      </div>
    )
  }

  const r = recomendacoes

  return (
    <div className="space-y-5">
      {/* Alertas clínicos primeiro (segurança) */}
      {r.alertas_clinicos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">Alertas Clínicos</div>
          <ul className="space-y-1.5">
            {r.alertas_clinicos.map((a, i) => (
              <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${a.nivel === 'urgente' ? 'bg-red-200 text-red-900' : 'bg-amber-100 text-amber-800'}`}>{a.nivel}</span>
                {a.descricao}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Técnicas sugeridas (por abordagem) */}
      {r.tecnicas_sugeridas.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Técnicas Sugeridas</div>
          <div className="space-y-2">
            {r.tecnicas_sugeridas.map((t, i) => (
              <div key={i} className="p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded">{t.abordagem}</span>
                  <span className="text-sm font-medium text-gray-800">{t.nome}</span>
                </div>
                <p className="text-sm text-gray-600">{t.descricao_curta}</p>
                {t.quando_usar && <p className="text-xs text-gray-400 mt-1">Quando: {t.quando_usar}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hipóteses diagnósticas */}
      {r.hipoteses_diagnosticas.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Hipóteses a Investigar</div>
          <div className="space-y-3">
            {r.hipoteses_diagnosticas.map((h, i) => (
              <div key={i} className="p-3 rounded-lg border border-violet-100 bg-violet-50/40">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded">{h.sistema}</span>
                  <span className="text-sm font-medium text-gray-800">{h.hipotese}</span>
                </div>
                {h.sinais_observados.length > 0 && <p className="text-xs text-gray-500 mt-1"><strong>Sinais:</strong> {h.sinais_observados.join('; ')}</p>}
                {h.criterios_a_confirmar.length > 0 && <p className="text-xs text-gray-500 mt-1"><strong>Confirmar:</strong> {h.criterios_a_confirmar.join('; ')}</p>}
                {h.perguntas_rastreio.length > 0 && <p className="text-xs text-gray-500 mt-1"><strong>Rastreio:</strong> {h.perguntas_rastreio.join(' / ')}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escalas sugeridas */}
      {r.escalas_sugeridas.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Escalas / Instrumentos</div>
          <ul className="space-y-1.5">
            {r.escalas_sugeridas.map((e, i) => (
              <li key={i} className="text-sm text-gray-700"><strong>{e.nome}</strong> — {e.objetivo}{e.quando_aplicar ? ` (${e.quando_aplicar})` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Psicoeducação */}
      {r.psicoeducacao.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Psicoeducação</div>
          <ul className="space-y-1.5">
            {r.psicoeducacao.map((p, i) => (
              <li key={i} className="text-sm text-gray-700"><strong>{p.tema}</strong> — {p.descricao_curta}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Condução da próxima sessão */}
      {r.conducao_proxima_sessao.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Para a Próxima Sessão</div>
          <ul className="space-y-1.5">
            {r.conducao_proxima_sessao.map((c, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded shrink-0">{c.tipo}</span>
                {c.conteudo}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer + Regerar */}
      <div className="pt-3 border-t border-gray-100 flex items-start justify-between gap-3">
        <p className="text-xs text-gray-400 italic flex-1">{DISCLAIMER}</p>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0 disabled:opacity-50"
        >
          {regenerating ? 'Gerando...' : 'Regerar'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Integrar a aba em `sessao-tabs.tsx`**

Em `components/sessao-tabs.tsx`:

(a) Importar no topo (após os imports existentes):
```typescript
import { RecomendacoesTab } from './recomendacoes-tab'
import type { SessaoRecomendacoes } from '@/lib/types'
```

(b) Adicionar à interface `SessaoTabsProps`:
```typescript
  recomendacoes: SessaoRecomendacoes | null
```

(c) Adicionar `'recomendacoes'` ao tipo `TabId`:
```typescript
type TabId = 'preparacao' | 'resumo' | 'recomendacoes' | 'transcricao'
```

(d) Adicionar `recomendacoes` aos parâmetros desestruturados de `SessaoTabs({ ... })`.

(e) Adicionar o item de aba ao array `tabs` (após o item `resumo`):
```typescript
    {
      id: 'recomendacoes',
      label: 'Recomendações',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      ),
      available: jaRealizada,
    },
```

(f) Adicionar o render do conteúdo (após o bloco `activeTab === 'resumo'`):
```typescript
        {activeTab === 'recomendacoes' && (
          <RecomendacoesTab recomendacoes={recomendacoes} sessaoId={sessaoId} />
        )}
```

- [ ] **Step 3: Passar a prop a partir da página**

Em `app/(app)/sessoes/[id]/page.tsx`, no JSX `<SessaoTabs ... />` (linha ~164), adicionar a prop:
```typescript
            recomendacoes={sessao.recomendacoes ?? null}
```

(`decryptSessao` na linha 35 já decripta `sessao.recomendacoes` por causa da Task 2.)

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 5: Commit**

```bash
git add components/recomendacoes-tab.tsx components/sessao-tabs.tsx "app/(app)/sessoes/[id]/page.tsx"
git commit -m "feat(recomendacoes): aba Recomendações na sessão"
```

---

### Task 7: Fechar o loop — recomendações da última sessão na Preparação

**Files:**
- Modify: `app/(app)/sessoes/[id]/page.tsx` (novo fetch da última sessão `realizada` + nova prop)
- Modify: `components/sessao-tabs.tsx` (prop `conducaoAnterior` + render em `PreparacaoTab`)

**Interfaces:**
- Consumes: `ConducaoProximaSessao[]` (Task 1); coluna `recomendacoes` (Task 1).
- Produces: a aba Preparação exibe a condução sugerida pela última sessão realizada.

- [ ] **Step 1: Buscar a última sessão realizada anterior na página**

Em `app/(app)/sessoes/[id]/page.tsx`, após o bloco que define `sessao`/`paciente` e antes do `return`, adicionar:

```typescript
  // Loop fechado: condução sugerida pela última sessão realizada anterior
  let conducaoAnterior: import('@/lib/types').ConducaoProximaSessao[] = []
  if (sessao.status !== 'realizada') {
    const { data: anterior } = await db
      .from('sessoes')
      .select('recomendacoes')
      .eq('paciente_id', sessao.paciente_id)
      .eq('status', 'realizada')
      .lt('data_hora', sessao.data_hora)
      .order('data_hora', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (anterior?.recomendacoes) {
      const rec = decryptJsonField<import('@/lib/types').SessaoRecomendacoes>(anterior.recomendacoes)
      conducaoAnterior = rec?.conducao_proxima_sessao ?? []
    }
  }
```

E adicionar o import no topo do arquivo:
```typescript
import { decryptSessao, decryptPaciente, decryptJsonField } from '@/lib/supabase/encrypt'
```
(substitui o import atual da linha 12, que não inclui `decryptJsonField`.)

- [ ] **Step 2: Passar `conducaoAnterior` para `SessaoTabs`**

No JSX `<SessaoTabs ... />`, adicionar:
```typescript
            conducaoAnterior={conducaoAnterior}
```

- [ ] **Step 3: Receber e propagar a prop em `sessao-tabs.tsx`**

Em `components/sessao-tabs.tsx`:

(a) Adicionar à interface `SessaoTabsProps`:
```typescript
  conducaoAnterior?: import('@/lib/types').ConducaoProximaSessao[]
```

(b) Adicionar `conducaoAnterior` aos parâmetros desestruturados de `SessaoTabs`.

(c) Passar para o `PreparacaoTab`:
```typescript
        {activeTab === 'preparacao' && (
          <PreparacaoTab preparacao={preparacao} conducaoAnterior={conducaoAnterior} />
        )}
```

- [ ] **Step 4: Renderizar a condução anterior em `PreparacaoTab`**

Alterar a assinatura de `PreparacaoTab`:
```typescript
function PreparacaoTab({ preparacao, conducaoAnterior }: { preparacao: SessaoPreparacao | null; conducaoAnterior?: import('@/lib/types').ConducaoProximaSessao[] }) {
```

Ajustar o early-return de "sem preparação" para ainda mostrar a condução anterior, se houver. Substituir o `if (!preparacao) { return (...) }` por:
```typescript
  const temConducao = conducaoAnterior && conducaoAnterior.length > 0
  if (!preparacao && !temConducao) {
    return (
      <div className="text-center py-8 text-gray-400">
        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">Preparação será gerada automaticamente antes da sessão</p>
      </div>
    )
  }
```

Trocar o `return ( <div className="space-y-5"> ` de modo a incluir, no topo do conteúdo, o card de condução anterior:
```typescript
  return (
    <div className="space-y-5">
      {/* Condução sugerida pela última sessão realizada (loop fechado) */}
      {temConducao && (
        <div className="bg-sky-50/60 rounded-xl border border-sky-100 p-4">
          <div className="text-xs font-semibold text-sky-700 uppercase tracking-wider mb-2">Vindo da última sessão</div>
          <ul className="space-y-1.5">
            {conducaoAnterior!.map((c, i) => (
              <li key={i} className="text-sm text-sky-900 flex items-start gap-2">
                <span className="text-xs px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded shrink-0">{c.tipo}</span>
                {c.conteudo}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contexto */}
      {preparacao?.contexto && (
```

> Atenção: como agora `preparacao` pode ser null com condução presente, prefixar com `preparacao?.` os acessos subsequentes dentro do `return` (`preparacao?.pontos_retomar`, `preparacao?.tarefas_pendentes`, `preparacao?.perguntas_sugeridas`, `preparacao?.sugestoes`, `preparacao?.alertas`). Cada bloco já é guardado por `&&`, então basta o optional chaining no primeiro acesso de cada condição.

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: build conclui sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/sessoes/[id]/page.tsx" components/sessao-tabs.tsx
git commit -m "feat(recomendacoes): condução da última sessão alimenta a Preparação (loop fechado)"
```

---

## Verificação final (manual, fora dos commits)

Após todas as tasks, validar o fluxo ponta a ponta em dev (`npm run dev`):

1. Aplicar a migration 019 no Supabase do ambiente.
2. Abrir uma sessão em `aguardando_aprovacao`, clicar **Revisar e Aprovar** → **Aprovar**.
3. Confirmar que a sessão vira `realizada` imediatamente (a aprovação não espera a IA).
4. Recarregar; a aba **Recomendações** deve aparecer e, após alguns segundos, conter conteúdo. Se vazia, usar **Gerar recomendações**.
5. Conferir as regras de segurança no output: hipóteses em linguagem condicional, técnicas com rótulo de abordagem, sem citações bibliográficas, disclaimer visível.
6. Abrir a PRÓXIMA sessão agendada do mesmo paciente → aba **Preparação** deve mostrar o card "Vindo da última sessão" com a `conducao_proxima_sessao`.
7. Rodar a suíte: `npm run test` (todos verdes).
