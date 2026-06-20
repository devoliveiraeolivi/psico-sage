# Consolidação da ficha do paciente ao final de cada sessão (IA #2)

**Data:** 2026-06-20
**Status:** Aprovado (design) — aguardando plano de implementação

## Problema

Ao final de cada sessão, as informações estruturadas da sessão precisam ser
consolidadas na ficha do paciente. A ficha deve **acumular** ao longo do
tratamento: o que já está nela tem que ficar e ser complementado a cada sessão,
nunca simplesmente sobrescrito.

### Estado atual (o gap)

- A extração pós-sessão (IA #1, `lib/ai/extract-resumo.ts`) já produz uma
  `SessaoResumo` rica (queixas/sintomas, estado mental, mudanças/padrões,
  pessoas, farmacologia, intervenções, anamnese).
- A ficha do paciente tem dois campos JSONB já pensados para isso:
  - `pacientes.resumo` — "estado atual, sobrescrito após cada sessão"
  - `pacientes.historico` — "histórico evolutivo por tema, append-only"
- A consolidação **existe hoje** em `app/api/sessoes/[id]/approve/route.ts`, mas
  é um **merge ingênuo em TypeScript** que **sobrescreve** `sintese`, `humor`,
  `tarefas`, `alertas` com a última sessão. Os próprios tipos anotam que isso
  deveria ser feito por uma "IA #2".
- A `PacienteResumo` atual é muito mais pobre que a `SessaoResumo` (campos de
  texto plano, strings concatenadas), perdendo a riqueza clínica da sessão.

## Decisões de design (travadas com o usuário)

1. **Ficha rica espelhando a sessão.** A ficha ganha seções estruturadas
   equivalentes às da sessão, cada uma com "estado atual" + histórico
   longitudinal.
2. **Consolidação incremental.** A IA #2 recebe `ficha atual + SessaoResumo` da
   sessão aprovada (não reprocessa todas as sessões; não recebe a transcrição
   bruta).
3. **Gatilho = aprovação da sessão, com revisão humana.** A consolidação roda
   acoplada à ação de aprovar a sessão, mostrando um diff/changelog para o
   psicólogo confirmar antes de gravar.
4. **Merge "atualiza, nunca perde".** O estado atual pode ser revisado (humor
   muda, crença é ressignificada), mas tudo que sai do estado atual desce para o
   histórico append-only. Nada se perde de fato.
5. **Arquitetura híbrida (LLM + código).** O LLM faz o merge inteligente do
   *estado atual* e emite um *changelog*; o código deriva o *histórico*
   append-only de forma determinística. O "nunca perder" é **garantia de
   código**, não promessa do modelo.

## Seção 1 — Modelo de dados da ficha (ficha v2)

Novo JSONB `pacientes.ficha`, espelhando a `SessaoResumo`. Cada seção tem duas
faces: um `atual` (estado presente, revisável pela IA via diff) e um `historico`
(append-only, garantido por código).

### Bloco `atual` (estado vivo — IA revisa, gera diff)

| Seção | Conteúdo | Semântica |
|---|---|---|
| `sintese_clinica` | narrativa de onde o paciente está | revisável |
| `estado_mental` | humor, afeto, insight, juízo, risco (suicida/hetero + última avaliação) | revisável (snapshot atual) |
| `queixas_ativas` | queixas/sintomas em trabalho, intensidade, frequência | revisável |
| `padroes_dinamicas` | padrões, crenças nucleares, defesas, recursos, persistências | acumula + atualiza |
| `pessoas_chave` | mapa de pessoas centrais (papel/dinâmica/intervenção) | atualiza entradas |
| `farmacologia` | medicações atuais, adesão, encaminhamentos | revisável (medicação muda) |
| `metas_plano` | metas ativas, tarefas em andamento, foco próxima sessão | revisável |
| `anamnese` | biográfico consolidado (infância…histórico de tratamentos) | enriquece (raramente muda) |
| `alertas_ativos` | alertas vigentes | revisável (resolve) |

### Bloco `historico` (append-only — garantido por código)

Trilhas longitudinais. Cada item: `{ data, sessao_id, valor, acao }`, onde
`acao ∈ adicionado | atualizado | resolvido | concluida`.

Trilhas: `humor[]`, `risco_suicida[]`, `medicamentos[]`, `diagnosticos[]`,
`crencas[]`, `metas[]`, `tarefas[]`, `insights[]`, `marcos[]`, `alertas[]`,
`pessoas[]`.

### `changelog[]`

Um registro por sessão do que a IA mexeu na ficha:
`{ sessao_id, data, mudancas: [...] }`. É o que alimenta o diff/preview da
revisão humana.

### Compatibilidade

A `PacienteResumo`/`PacienteHistorico` atuais continuam existindo e passam a ser
**derivadas** da `ficha` v2 por uma função de projeção (`lib/ficha/merge.ts`),
mantendo a UI atual funcionando sem reescrever tudo de uma vez. A migração da UI
rica fica para um PR separado.

## Seção 2 — Motor de consolidação híbrido (IA #2)

Novo arquivo `lib/ai/consolidate-ficha.ts`. Mesma stack do `extract-resumo.ts`
(OpenAI `gpt-5.2`, `response_format: json_object`, `withRetry`, defaults seguros
na montagem).

### Etapa 1 — LLM mescla só o `atual` + emite changelog

Entrada: `ficha.atual` existente + `SessaoResumo` aprovada.

Saída (JSON): apenas o **`changelog`** — uma lista de *patches aplicáveis por
código*. Cada item:

```
{
  path,              // ex: "estado_mental.humor", "padroes_dinamicas.crencas_nucleares[]"
  tipo,              // adicionado | atualizado | resolvido | concluida
  antes,             // valor anterior (null se path novo) — para o diff
  depois,            // valor novo a aplicar
  motivo             // justificativa clínica (lida pelo psicólogo no diff)
}
```

**Decisão importante (corrige furo do review):** o LLM **não** devolve um
`atual_novo` mesclado inteiro. Devolve só o changelog/patches. A `atual` final é
derivada por código como **`atual_anterior` + (somente os patches aceitos pelo
psicólogo)**. Isso torna a rejeição por item determinística — não há blob mesclado
do qual "des-aplicar" mudanças. Para seções de lista (`path` terminado em `[]`),
o patch indica adicionar/atualizar/remover um item identificável.

O LLM **não toca no `historico`** e **não recopia nada** — só raciocina sobre o
presente e emite as diferenças. Prompt enxuto, barato, focado em julgamento
clínico.

### Etapa 2 — Código aplica patches e deriva o `historico` (determinístico)

Para cada patch **aceito**, o código:
1. Aplica o `depois` no `path` correspondente da `atual` (partindo de
   `atual_anterior`).
2. Cria a entrada append-only no `historico` (ex.: humor `ansioso → eutímico` →
   `historico.humor.push({ data, sessao_id, valor: "eutímico", acao: "atualizado" })`;
   meta concluída → `historico.metas.push({ ..., acao: "concluida" })`).

O `data` de cada item de histórico usa o **`data_hora` da sessão** (não o
timestamp de aprovação), para ordenação longitudinal correta. O "nunca perder" é
garantido **aqui**, por código testável — o LLM não tem poder de apagar histórico.

**Idempotência (corrige furo do review):** os appends e o bloco de `changelog`
são chaveados por `sessao_id`. Re-consolidar a mesma sessão (re-aprovação,
`ai-adjust`) **substitui** o bloco daquela sessão em vez de acumular — sem
duplicar entradas no histórico.

### Etapa 3 — Validação + montagem da ficha proposta

O código valida o shape de cada patch (path válido, defaults seguros), monta a
`ficha` proposta (`atual` derivada + `historico` derivado + `changelog` da
sessão) e devolve **sem persistir** (persistência só após confirmação humana —
Seção 3).

### Princípios do prompt da IA #2

1. **Atualize, nunca invente** — só mexe no `atual` com base na sessão ou na
   ficha; campo sem evidência nova fica como está.
2. **Distinga mudança real de repetição** — se a sessão repete algo já na ficha,
   não duplica; só registra no changelog se houve evolução/contradição.
3. **Consolide entidades** — reconhece que descrições diferentes podem ser o
   mesmo padrão/pessoa já registrado (merge), em vez de criar item novo.
4. **Justifique cada mudança** (`motivo`) — é o que o psicólogo lê no diff para
   confiar ou rejeitar.
5. **Conservador no risco** — mudança em `risco_suicida` sempre vira item de
   changelog destacado, nunca silenciosa.

## Seção 3 — Fluxo e UX (aprovação como gatilho único)

O `approve` atual (merge ingênuo + grava + cria próxima sessão) é separado em
duas fases para encaixar a revisão humana. A ação "Aprovar" da sessão vira
**"Aprovar e atualizar ficha"**: um clique dispara preview → diff → commit.

### Fase 1 — Preview (gera, não grava)

Novo endpoint `POST /api/sessoes/[id]/consolidar-preview` (com `requireAuth` +
`requireSessionOwner` + rate-limit, espelhando `extract`):

1. Carrega `ficha.atual` do paciente + `SessaoResumo` da sessão (descriptografados).
2. Roda o motor da Seção 2 → ficha proposta + `changelog`.
3. **Não persiste.** Devolve `{ changelog, ficha_proposta }`.

Como é uma chamada de LLM (dezenas de segundos), a UI mostra loading, igual ao
`extract` hoje. Roda na versão **final** da `SessaoResumo` (após eventuais edições
via PATCH / `adjust-resumo`), porque é disparada no momento de aprovar.

### Revisão — o diff

Modal/painel lista o `changelog` agrupado por seção (ex.: "Humor: ansioso →
eutímico — porque…", "Nova crença nuclear: '…'", "Meta concluída: '…'"). Cada
item com checkbox aceitar/rejeitar. Itens de **risco** destacados. O psicólogo
pode desmarcar o que não concorda.

### Fase 2 — Commit (grava só o aceito)

O `approve` existente passa a receber, no body, a lista de **patches aceitos**
(os ids/paths que o psicólogo manteve marcados):

1. Aplica somente os patches aceitos sobre `atual_anterior` e deriva o
   `historico` correspondente (Etapa 2 do motor). Patches rejeitados não alteram
   o `atual` nem descem para o histórico.
2. Persiste via `approve_session_atomic`, que ganha `p_paciente_ficha JSONB`
   (mantém `p_paciente_resumo`/`p_paciente_historico` derivados via projeção, na
   mesma transação atômica).
3. Segue igual: sessão → `realizada`, auto-cria próxima sessão.

### Fallback

Se a IA #2 falhar (timeout/erro), a aprovação **não trava**. Em vez de bifurcar a
fonte de verdade escrevendo nos campos legados, o fallback constrói um
**changelog derivado por código** (regras simples herdadas do merge atual: humor
mudou, tarefas novas, alertas) e o passa pelo *mesmo* `merge.ts` — pulando apenas
o LLM, não a `ficha`. A sessão é marcada como "consolidação automática pendente"
para eventual re-consolidação assistida por IA. A `ficha` permanece a única fonte
de verdade.

### Pontos de mudança no código

- `lib/ai/consolidate-ficha.ts` (novo) — motor IA #2
- `lib/ficha/merge.ts` (novo) — append-only determinístico + projeção para
  `PacienteResumo`/`Historico` legados
- `app/api/sessoes/[id]/consolidar-preview/route.ts` (novo) — Fase 1
- `app/api/sessoes/[id]/approve/route.ts` (editar) — Fase 2 recebe ficha aceita
- `supabase/migrations/019_paciente_ficha.sql` (novo) — coluna `ficha` + RPC
  atualizada
- `components/approval-modal.tsx` (editar) — diff/changelog com checkboxes
- `lib/types/database.ts` (editar) — tipos da `ficha` v2

## Seção 4 — Migração, compatibilidade e testes

### Migração (`019_paciente_ficha.sql`)

- Adiciona `ficha JSONB DEFAULT '{}'::jsonb` em `pacientes` (criptografada at
  rest — adicionar a `decryptPaciente` em `lib/supabase/encrypt.ts` e
  criptografar em toda escrita).
- Atualiza `approve_session_atomic` para receber `p_paciente_ficha` (além dos
  `p_paciente_resumo`/`p_paciente_historico` legados, derivados por projeção).
- **Backfill (corrige furo do review):** o backfill **tem que semear**
  `ficha.atual`/`ficha.historico` a partir do `resumo`/`historico` legados
  existentes de cada paciente. Sem isso, a primeira consolidação projetaria uma
  ficha quase-vazia de volta para os campos legados e **apagaria a tela atual**
  de pacientes existentes. Como reestruturar JSON aninhado é difícil em SQL puro,
  o backfill é um **script TS one-off** (`scripts/`), não a migração SQL.
  Pacientes sem dado legado começam com `ficha` vazia; a primeira consolidação
  preenche.

### Compatibilidade (sem big-bang)

A `ficha` v2 vira a fonte de verdade; a projeção em `lib/ficha/merge.ts` deriva
os campos legados (`PacienteResumo`/`PacienteHistorico`) a cada commit. Página do
paciente e tabs continuam funcionando; a UI rica migra depois em PR separado.

### Testes (TDD)

- **Unit determinístico (sem LLM) — o mais importante:** dado um `changelog`, o
  `merge.ts` produz as entradas append-only corretas; itens rejeitados não
  descem; histórico antigo permanece intacto; projeção legada bate.
- **Unit de projeção:** `ficha` v2 → `PacienteResumo`/`Historico` legados.
- **Validação de shape:** `consolidate-ficha` com mocks de resposta do LLM
  (válida, truncada, campos faltando) cai nos defaults seguros sem quebrar.
- **Integração do approve:** preview não persiste; commit grava só o aceito;
  fallback determinístico quando o motor falha; auto-criação da próxima sessão
  segue intacta.
- **Fixtures:** ficha pré-existente + `SessaoResumo` nova, verificando merge de
  humor, conclusão de meta e adição de pessoa.
- **Idempotência:** consolidar a mesma `sessao_id` duas vezes não duplica
  entradas no histórico (substitui o bloco da sessão).
- **Regressão de backfill:** paciente legado com `resumo`/`historico` populados →
  após semear `ficha` e projetar de volta, os campos legados permanecem
  equivalentes (sem apagar dados de tela).

## Pendência para o plano de implementação

- **Tabela de mapeamento `SessaoResumo → seção da ficha`** (qual campo da sessão
  alimenta qual `path` do bloco `atual`/`historico`) é um entregável do plano —
  precisa ser explícita para o prompt da IA #2 e para o `merge.ts`.

## Fora de escopo (YAGNI)

- Reescrita da UI rica da ficha (PR separado; aqui só a projeção legada).
- Reprocessamento em lote de todas as sessões históricas (a IA é incremental).
- Inclusão da transcrição bruta na entrada da IA #2.
