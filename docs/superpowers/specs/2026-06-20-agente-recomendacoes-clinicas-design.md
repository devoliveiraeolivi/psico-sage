# Agente de Recomendações Clínicas — Design

**Data:** 2026-06-20
**Projeto:** PsicoSage
**Status:** Aprovado para planejamento

## Objetivo

Um agente de IA de apoio à decisão para o terapeuta. Com base na sessão do
paciente (prontuário revisado + transcrição + contexto longitudinal), o agente
sugere: técnicas/melhores práticas por abordagem, hipóteses diagnósticas a
investigar, escalas validadas, temas de psicoeducação, condução da próxima
sessão e alertas de risco.

É **apoio à decisão**, não substituição. A responsabilidade clínica é sempre do
profissional.

## Decisões de design (validadas com o usuário)

1. **Loop fechado:** as recomendações são geradas pós-sessão e alimentam a
   preparação da próxima sessão.
2. **Multi-abordagem:** as sugestões cobrem várias escolas (TCC, ACT,
   psicanálise, sistêmica, etc.) e cada uma é **rotulada** com sua abordagem.
3. **Diagnóstico = hipótese a investigar:** nunca afirma diagnóstico. Usa
   linguagem condicional ancorada em CID-11/DSM-5 + sugestão de escalas
   validadas quando couber.
4. **Conhecimento do próprio LLM, sem inventar referência:** o agente sugere
   técnicas e condução, mas é **proibido citar referência bibliográfica
   específica** (autor/ano/artigo) para evitar fonte falsa.
5. **Disparo na aprovação:** roda quando o terapeuta aprova o prontuário
   (status → `realizada`), em cima do conteúdo já revisado.

## Visão geral / fluxo

```
gravar → transcrever (Groq) → extrair resumo (OpenAI) → [terapeuta revisa]
   → APROVA (status: realizada) → gerar recomendações (OpenAI) → salva em sessoes.recomendacoes
                                                                      │
                          aba "Recomendações" da sessão atual ◄───────┤
                                                                      │
   Preparação da PRÓXIMA sessão lê as recomendações da última ◄───────┘
   sessão `realizada` do paciente (read-on-render, sem escrever em linha futura)
```

O loop é fechado por **leitura na renderização**: a aba Preparação de qualquer
sessão busca as `recomendacoes` da última sessão `realizada` daquele paciente e
exibe `conducao_proxima_sessao`. Isso evita acoplamento com a existência da
próxima sessão e é idempotente.

> **Verificado no código:** a página da sessão
> ([app/(app)/sessoes/[id]/page.tsx](../../../app/(app)/sessoes/[id]/page.tsx))
> hoje carrega só a sessão atual (`select('*, pacientes(*)')`). O loop exige um
> **fetch novo**: buscar a última sessão `realizada` anterior do mesmo paciente,
> filtrando `status = 'realizada'` e `data_hora < sessao.data_hora`, ordenando
> `data_hora desc` com `limit 1`. O `recomendacoes` dessa linha é passado como
> prop nova para `SessaoTabs` e renderizado numa seção da aba Preparação.

## Estrutura do output

Novo campo JSONB `recomendacoes` em `sessoes`, com o tipo
`SessaoRecomendacoes`:

- **`tecnicas_sugeridas[]`** — `{ abordagem, nome, descricao_curta, quando_usar }`
  Técnicas e melhores práticas etiquetadas por escola. Multi-abordagem.
- **`hipoteses_diagnosticas[]`** — `{ hipotese, sistema, sinais_observados[], criterios_a_confirmar[], perguntas_rastreio[] }`
  `sistema` ∈ {`CID-11`, `DSM-5`}. Sempre condicional ("sinais compatíveis com…
  considere investigar"). Nunca afirmação.
- **`escalas_sugeridas[]`** — `{ nome, objetivo, quando_aplicar }`
  Instrumentos validados (PHQ-9, GAD-7, etc.).
- **`psicoeducacao[]`** — `{ tema, descricao_curta }`
  Temas que o terapeuta pode explorar com o paciente. Sem referência bibliográfica.
- **`conducao_proxima_sessao[]`** — `{ tipo, conteudo }`
  `tipo` ∈ {`retomar`, `foco`, `pergunta`, `tarefa`}. Alimenta a Preparação seguinte.
- **`alertas_clinicos[]`** — `{ nivel, descricao }`
  `nivel` ∈ {`urgente`, `monitorar`}. Sinais de risco (ideação suicida,
  autoagressão, etc.). Rede de segurança.

Metadados: `modelo_ia_usado`, `gerado_em`.

## Componentes (seguem os padrões existentes)

| Componente | Caminho | Espelha |
|---|---|---|
| Lógica de IA + prompt | `lib/ai/gerar-recomendacoes.ts` | `lib/ai/extract-resumo.ts` |
| Rota de geração | `app/api/sessoes/[id]/recomendacoes/route.ts` | `app/api/sessoes/[id]/extract/route.ts` |
| Tipo | `SessaoRecomendacoes` em `lib/types/database.ts` | `SessaoResumo` |
| Migration | `supabase/migrations/019_sessao_recomendacoes.sql` | `004_sessao_prontuario.sql` |
| Helper de cripto | adicionar `recomendacoes` em `decryptSessao` (`lib/supabase/encrypt.ts`) | `integra`, `resumo` |
| UI — aba nova | `components/sessao-tabs.tsx` (aba "Recomendações") | abas existentes |
| UI — loop na Preparação | fetch da última sessão `realizada` em `page.tsx` + render na aba Preparação | — |

**Padrão a espelhar (verificado):** `lib/ai/extract-resumo.ts` cria o client
OpenAI (`model gpt-5.2`, `temperature 0.3`, `response_format json_object`),
monta `SYSTEM_PROMPT`, faz `JSON.parse` com tratamento de erro e retorna o objeto
tipado. A rota `extract/route.ts` salva com `encryptJsonField(...)` e, em erro,
grava `recording_status: 'error'` + `processing_error` e loga no Sentry. A nova
rota segue o mesmo formato.

## Regras de segurança (embutidas no prompt do sistema)

- Linguagem condicional obrigatória em hipóteses diagnósticas. Proibido afirmar
  diagnóstico.
- Proibido citar referência bibliográfica específica (autor/ano/artigo/livro).
- Toda técnica deve vir com rótulo de abordagem.
- Detecção e elevação de risco em `alertas_clinicos` quando houver sinais.
- Disclaimer fixo na UI: "Sugestões de apoio à decisão. A responsabilidade
  clínica é do profissional."

## Disparo e robustez

- **Gancho:** a UI chama a rota `recomendacoes` **após** a aprovação concluir com
  sucesso. A aprovação hoje passa por `app/api/sessoes/[id]/approve/route.ts`
  (RPC atômico `approve_session_atomic`, que faz a transição para `realizada`).
  Manter a geração **fora** da transação de aprovação preserva a atomicidade e a
  natureza não-bloqueante.
- **Idempotente:** se `recomendacoes` já existe, não regera sozinho; há botão
  "Regerar" manual.
- **Não-bloqueante:** falha na geração não impede a aprovação. Recomendação é
  complementar; erro é logado (Sentry) e a UI oferece "tentar novamente".
- **Criptografia obrigatória:** a coluna `recomendacoes` usa o mesmo esquema
  app-level das demais colunas de IA — AES-256-GCM via `encryptJsonField` ao
  salvar e `decryptJsonField<SessaoRecomendacoes>` ao ler
  ([lib/supabase/encrypt.ts](../../../lib/supabase/encrypt.ts)). Incluir o campo
  no helper `decryptSessao`. RLS já cobre a linha `sessoes`.

## Fora de escopo (YAGNI por agora)

- Base de conhecimento curada / RAG com citações (evolução futura: modo híbrido).
- Sugestões em tempo real durante a sessão.
- Chat livre de consulta à literatura.
- Abordagem configurável por paciente (hoje multi-abordagem cobre o caso).
