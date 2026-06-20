# Consolidação da Ficha do Paciente (IA #2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar os dados estruturados de cada sessão na ficha do paciente ao aprová-la, de forma que o estado atual seja revisado pela IA (com diff humano) e nada do histórico se perca.

**Architecture:** Híbrido LLM+código. Um novo JSONB `pacientes.ficha` (`atual` revisável + `historico` append-only + `changelog`). A IA #2 (`consolidate-ficha.ts`) só emite *patches* sobre o `atual`; `merge.ts` (puro, determinístico) aplica os patches aceitos e deriva o histórico append-only — garantindo "nunca perder" por código. A aprovação da sessão vira o gatilho: preview → diff com checkboxes → commit atômico.

**Tech Stack:** Next.js (App Router) + TypeScript, Supabase (Postgres + RPC), OpenAI `gpt-5.2`, Vitest.

## Global Constraints

- **Modelo IA:** OpenAI `gpt-5.2`, `response_format: { type: 'json_object' }`, via `withRetry` (mesmo padrão de `lib/ai/extract-resumo.ts`).
- **`maxDuration = 60`, `runtime = 'nodejs'`** em qualquer route que chame a IA (teto Vercel Hobby).
- **Criptografia at rest:** todo JSONB sensível de paciente é gravado com `encryptJsonField` e lido com `decryptJsonField`. `ficha` entra em `decryptPaciente`.
- **Fonte de verdade:** `pacientes.ficha`. Os campos legados `pacientes.resumo`/`historico` passam a ser **derivados** por projeção — nunca escritos diretamente pela consolidação.
- **TDD:** funções puras (`lib/ficha/merge.ts`) têm teste antes da implementação. Testes em `__tests__/*.test.ts`, rodam com `npx vitest run`.
- **Idempotência:** appends de histórico e changelog são chaveados por `sessao_id`.
- **Datas:** itens de histórico usam o `data_hora` da sessão, não o timestamp de aprovação.

---

## File Structure

- `lib/types/database.ts` (modify) — tipos da ficha v2 (`PacienteFicha`, `FichaAtual`, `FichaHistorico`, `FichaPatch`, etc.).
- `lib/ficha/merge.ts` (create) — núcleo puro: `emptyFicha`, `applyPatches`, `deriveHistorico`, `consolidateFicha` (orquestra), `projectToLegacy`, `seedFichaFromLegacy`, `deterministicPatches`.
- `lib/ai/consolidate-ficha.ts` (create) — motor IA #2: prompt + chamada + validação → `FichaPatch[]`.
- `supabase/migrations/019_paciente_ficha.sql` (create) — coluna `ficha` + RPC `approve_session_atomic` com `p_paciente_ficha`.
- `lib/supabase/encrypt.ts` (modify) — `ficha` em `decryptPaciente`.
- `scripts/backfill-ficha.ts` (create) — semeia `ficha` a partir do legado.
- `app/api/sessoes/[id]/consolidar-preview/route.ts` (create) — Fase 1 (preview, não persiste).
- `app/api/sessoes/[id]/approve/route.ts` (modify) — Fase 2 (aplica patches aceitos + persiste).
- `components/approval-modal.tsx` (modify) — diff/changelog com checkboxes.

---

## Task 1: Tipos da ficha v2

**Files:**
- Modify: `lib/types/database.ts` (adicionar após o bloco `PacienteHistorico`, ~linha 401)

**Interfaces:**
- Produces: `PacienteFicha`, `FichaAtual`, `FichaHistorico`, `FichaHistoricoItem`, `FichaPatch`, `FichaPatchTipo`, `FichaChangelogEntry`, `PessoaChave`.

- [ ] **Step 1: Adicionar os tipos**

```typescript
// ============================================
// FICHA v2 (pacientes.ficha) — fonte de verdade
// atual = estado vivo (revisável) · historico = append-only · changelog = por sessão
// ============================================

export type FichaPatchTipo = 'adicionado' | 'atualizado' | 'resolvido' | 'concluida'

export interface FichaPatch {
  id: string              // estável p/ aceitar/rejeitar — `${path}#${slug(depois)}`
  path: string            // ex: 'estado_mental.humor' | 'padroes_dinamicas.crencas_nucleares[]'
  tipo: FichaPatchTipo
  antes: string | null    // valor anterior (null se path novo) — exibido no diff
  depois: string          // valor novo a aplicar
  motivo: string          // justificativa clínica (lida no diff)
  risco?: boolean         // destaque visual p/ itens de risco
}

export interface FichaHistoricoItem {
  data: string            // data_hora da sessão (ISO)
  sessao_id: string
  valor: string
  acao: FichaPatchTipo
}

export interface PessoaChave {
  nome: string
  categoria: PessoaCategoria
  tipo: string
  dinamica: string        // papel/dinâmica + intervenção acumulada
}

export interface FichaAtual {
  sintese_clinica: string | null
  estado_mental: {
    humor: string | null
    afeto: string | null
    insight: string | null
    juizo_critica: string | null
    risco_suicida: string
    risco_heteroagressivo: string
    ultima_avaliacao: string | null
  }
  queixas_ativas: {
    queixa: string | null
    sintomas: string[]
    intensidade: number | null
    frequencia: string | null
  }
  padroes_dinamicas: {
    padroes: string[]
    crencas_nucleares: string[]
    defesas: string[]
    recursos: string[]
    persistencias: string[]
  }
  pessoas_chave: PessoaChave[]
  farmacologia: {
    medicacoes: Medicacao[]
    adesao: string | null
    encaminhamento: string | null
  }
  metas_plano: {
    metas_ativas: string[]
    tarefas_andamento: string[]
    foco_proxima_sessao: string | null
  }
  anamnese: {
    infancia: string | null
    adolescencia: string | null
    vida_adulta: string | null
    familia_origem: string | null
    relacionamentos: string | null
    marcos_vida: string | null
    historico_tratamentos: string | null
  }
  alertas_ativos: string[]
}

export interface FichaHistorico {
  humor?: FichaHistoricoItem[]
  risco_suicida?: FichaHistoricoItem[]
  medicamentos?: FichaHistoricoItem[]
  diagnosticos?: FichaHistoricoItem[]
  crencas?: FichaHistoricoItem[]
  metas?: FichaHistoricoItem[]
  tarefas?: FichaHistoricoItem[]
  insights?: FichaHistoricoItem[]
  marcos?: FichaHistoricoItem[]
  alertas?: FichaHistoricoItem[]
  pessoas?: FichaHistoricoItem[]
  [key: string]: FichaHistoricoItem[] | undefined
}

export interface FichaChangelogEntry {
  sessao_id: string
  data: string
  patches: FichaPatch[]   // patches efetivamente aceitos nesta sessão
}

export interface PacienteFicha {
  atual: FichaAtual
  historico: FichaHistorico
  changelog: FichaChangelogEntry[]
  consolidacao_pendente?: boolean   // true quando caiu no fallback determinístico
}
```

- [ ] **Step 2: Verificar compilação de tipos**

Run: `npx tsc --noEmit`
Expected: PASS (sem erros novos referentes a `lib/types/database.ts`)

- [ ] **Step 3: Commit**

```bash
git add lib/types/database.ts
git commit -m "feat: tipos da ficha v2 (PacienteFicha + FichaPatch)"
```

---

## Task 2: `merge.ts` — mapeamento de paths (path → seção de histórico)

**Files:**
- Create: `lib/ficha/merge.ts`
- Test: `__tests__/ficha-merge.test.ts`

**Interfaces:**
- Consumes: tipos da Task 1.
- Produces: `emptyFicha(): PacienteFicha`; `PATH_TO_HISTORICO: Record<string, keyof FichaHistorico>`.

Esta é a **tabela de mapeamento `SessaoResumo → ficha`** exigida pelo spec, na direção path-do-`atual` → trilha-de-`historico`.

- [ ] **Step 1: Escrever o teste falho**

```typescript
import { describe, it, expect } from 'vitest'
import { emptyFicha, PATH_TO_HISTORICO } from '@/lib/ficha/merge'

describe('emptyFicha', () => {
  it('cria ficha vazia com defaults seguros de risco', () => {
    const f = emptyFicha()
    expect(f.atual.estado_mental.risco_suicida).toBe('não avaliado')
    expect(f.atual.padroes_dinamicas.crencas_nucleares).toEqual([])
    expect(f.historico).toEqual({})
    expect(f.changelog).toEqual([])
  })
})

describe('PATH_TO_HISTORICO', () => {
  it('mapeia humor e crenças para suas trilhas', () => {
    expect(PATH_TO_HISTORICO['estado_mental.humor']).toBe('humor')
    expect(PATH_TO_HISTORICO['padroes_dinamicas.crencas_nucleares[]']).toBe('crencas')
    expect(PATH_TO_HISTORICO['metas_plano.metas_ativas[]']).toBe('metas')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run __tests__/ficha-merge.test.ts`
Expected: FAIL ("Cannot find module '@/lib/ficha/merge'")

- [ ] **Step 3: Implementar `emptyFicha` + `PATH_TO_HISTORICO`**

```typescript
import type {
  PacienteFicha, FichaAtual, FichaHistorico, FichaHistoricoItem,
  FichaPatch, FichaChangelogEntry, PacienteResumo, PacienteHistorico,
} from '@/lib/types'

export function emptyFichaAtual(): FichaAtual {
  return {
    sintese_clinica: null,
    estado_mental: {
      humor: null, afeto: null, insight: null, juizo_critica: null,
      risco_suicida: 'não avaliado', risco_heteroagressivo: 'não avaliado',
      ultima_avaliacao: null,
    },
    queixas_ativas: { queixa: null, sintomas: [], intensidade: null, frequencia: null },
    padroes_dinamicas: { padroes: [], crencas_nucleares: [], defesas: [], recursos: [], persistencias: [] },
    pessoas_chave: [],
    farmacologia: { medicacoes: [], adesao: null, encaminhamento: null },
    metas_plano: { metas_ativas: [], tarefas_andamento: [], foco_proxima_sessao: null },
    anamnese: {
      infancia: null, adolescencia: null, vida_adulta: null, familia_origem: null,
      relacionamentos: null, marcos_vida: null, historico_tratamentos: null,
    },
    alertas_ativos: [],
  }
}

export function emptyFicha(): PacienteFicha {
  return { atual: emptyFichaAtual(), historico: {}, changelog: [] }
}

// path do `atual` → trilha de `historico`. Paths terminados em [] são listas.
export const PATH_TO_HISTORICO: Record<string, keyof FichaHistorico> = {
  'sintese_clinica': 'marcos',
  'estado_mental.humor': 'humor',
  'estado_mental.risco_suicida': 'risco_suicida',
  'queixas_ativas.sintomas[]': 'diagnosticos',
  'padroes_dinamicas.padroes[]': 'crencas',
  'padroes_dinamicas.crencas_nucleares[]': 'crencas',
  'padroes_dinamicas.recursos[]': 'insights',
  'pessoas_chave[]': 'pessoas',
  'farmacologia.medicacoes[]': 'medicamentos',
  'metas_plano.metas_ativas[]': 'metas',
  'metas_plano.tarefas_andamento[]': 'tarefas',
  'alertas_ativos[]': 'alertas',
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run __tests__/ficha-merge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ficha/merge.ts __tests__/ficha-merge.test.ts
git commit -m "feat: ficha merge scaffold (emptyFicha + PATH_TO_HISTORICO)"
```

---

## Task 3: `applyPatches` — aplicar patches aceitos sobre `atual`

**Files:**
- Modify: `lib/ficha/merge.ts`
- Test: `__tests__/ficha-merge.test.ts`

**Interfaces:**
- Produces: `applyPatches(atualAnterior: FichaAtual, patches: FichaPatch[]): FichaAtual`. Para `path` escalar, substitui o valor. Para `path` lista (`...[]`), faz upsert do item (`tipo === 'resolvido'/'concluida'` remove da lista). Imutável (não muta a entrada).

- [ ] **Step 1: Escrever os testes falhos**

```typescript
import { applyPatches } from '@/lib/ficha/merge'
import { emptyFichaAtual } from '@/lib/ficha/merge'
import type { FichaPatch } from '@/lib/types'

const p = (over: Partial<FichaPatch>): FichaPatch => ({
  id: 'x', path: 'estado_mental.humor', tipo: 'atualizado',
  antes: null, depois: '', motivo: '', ...over,
})

describe('applyPatches', () => {
  it('substitui valor escalar', () => {
    const atual = emptyFichaAtual()
    const out = applyPatches(atual, [p({ path: 'estado_mental.humor', depois: 'eutímico' })])
    expect(out.estado_mental.humor).toBe('eutímico')
    expect(atual.estado_mental.humor).toBe(null) // imutável
  })

  it('adiciona item em lista sem duplicar', () => {
    const atual = emptyFichaAtual()
    atual.padroes_dinamicas.crencas_nucleares = ['sou uma fraude']
    const out = applyPatches(atual, [
      p({ path: 'padroes_dinamicas.crencas_nucleares[]', tipo: 'adicionado', depois: 'preciso agradar todos' }),
      p({ path: 'padroes_dinamicas.crencas_nucleares[]', tipo: 'adicionado', depois: 'sou uma fraude' }),
    ])
    expect(out.padroes_dinamicas.crencas_nucleares).toEqual(['sou uma fraude', 'preciso agradar todos'])
  })

  it('remove item de lista quando resolvido/concluida', () => {
    const atual = emptyFichaAtual()
    atual.metas_plano.metas_ativas = ['reduzir evitação', 'dormir melhor']
    const out = applyPatches(atual, [
      p({ path: 'metas_plano.metas_ativas[]', tipo: 'concluida', antes: 'dormir melhor', depois: 'dormir melhor' }),
    ])
    expect(out.metas_plano.metas_ativas).toEqual(['reduzir evitação'])
  })

  it('ignora patches não-aceitos (recebe só os aceitos)', () => {
    const atual = emptyFichaAtual()
    const out = applyPatches(atual, [])
    expect(out).toEqual(atual)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run __tests__/ficha-merge.test.ts`
Expected: FAIL ("applyPatches is not a function")

- [ ] **Step 3: Implementar `applyPatches`**

```typescript
function getAtPath(obj: any, segments: string[]): any {
  return segments.reduce((acc, s) => (acc == null ? acc : acc[s]), obj)
}
function setAtPath(obj: any, segments: string[], value: any): void {
  const last = segments[segments.length - 1]
  const parent = segments.slice(0, -1).reduce((acc, s) => acc[s], obj)
  parent[last] = value
}

export function applyPatches(atualAnterior: FichaAtual, patches: FichaPatch[]): FichaAtual {
  const atual: FichaAtual = structuredClone(atualAnterior)
  for (const patch of patches) {
    const isList = patch.path.endsWith('[]')
    const cleanPath = isList ? patch.path.slice(0, -2) : patch.path
    const segments = cleanPath.split('.')

    if (!isList) {
      setAtPath(atual, segments, patch.depois)
      continue
    }
    const list: string[] = getAtPath(atual, segments) ?? []
    if (patch.tipo === 'resolvido' || patch.tipo === 'concluida') {
      setAtPath(atual, segments, list.filter((v) => v !== (patch.antes ?? patch.depois)))
    } else if (!list.includes(patch.depois)) {
      setAtPath(atual, segments, [...list, patch.depois])
    }
  }
  return atual
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run __tests__/ficha-merge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ficha/merge.ts __tests__/ficha-merge.test.ts
git commit -m "feat: applyPatches (aplica patches aceitos sobre o atual)"
```

---

## Task 4: `deriveHistorico` + `consolidateFicha` (orquestra, idempotente)

**Files:**
- Modify: `lib/ficha/merge.ts`
- Test: `__tests__/ficha-merge.test.ts`

**Interfaces:**
- Produces:
  - `deriveHistorico(historicoAtual, patches, sessaoId, dataHora): FichaHistorico` — append-only, usando `PATH_TO_HISTORICO`.
  - `consolidateFicha(ficha, acceptedPatches, sessaoId, dataHora): PacienteFicha` — aplica patches + deriva histórico + grava changelog, **substituindo** o bloco da mesma `sessao_id` (idempotência).

- [ ] **Step 1: Escrever os testes falhos**

```typescript
import { consolidateFicha, emptyFicha } from '@/lib/ficha/merge'

describe('consolidateFicha', () => {
  const HORA = '2026-06-20T14:00:00.000Z'
  const humorPatch = p({ id: 'h1', path: 'estado_mental.humor', tipo: 'atualizado', antes: 'ansioso', depois: 'eutímico' })

  it('aplica patch e cria entrada de histórico com data_hora da sessão', () => {
    const out = consolidateFicha(emptyFicha(), [humorPatch], 'sess-1', HORA)
    expect(out.atual.estado_mental.humor).toBe('eutímico')
    expect(out.historico.humor).toEqual([
      { data: HORA, sessao_id: 'sess-1', valor: 'eutímico', acao: 'atualizado' },
    ])
    expect(out.changelog).toHaveLength(1)
    expect(out.changelog[0].sessao_id).toBe('sess-1')
  })

  it('é idempotente: reconsolidar a mesma sessão não duplica histórico', () => {
    const once = consolidateFicha(emptyFicha(), [humorPatch], 'sess-1', HORA)
    const twice = consolidateFicha(once, [humorPatch], 'sess-1', HORA)
    expect(twice.historico.humor).toHaveLength(1)
    expect(twice.changelog).toHaveLength(1)
  })

  it('preserva histórico de sessões anteriores ao consolidar nova sessão', () => {
    const s1 = consolidateFicha(emptyFicha(), [humorPatch], 'sess-1', HORA)
    const s2 = consolidateFicha(s1, [p({ id: 'h2', path: 'estado_mental.humor', depois: 'disfórico' })], 'sess-2', '2026-06-27T14:00:00.000Z')
    expect(s2.historico.humor).toHaveLength(2)
    expect(s2.changelog.map((c) => c.sessao_id)).toEqual(['sess-1', 'sess-2'])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run __tests__/ficha-merge.test.ts`
Expected: FAIL ("consolidateFicha is not a function")

- [ ] **Step 3: Implementar `deriveHistorico` + `consolidateFicha`**

```typescript
export function deriveHistorico(
  historicoAtual: FichaHistorico, patches: FichaPatch[], sessaoId: string, dataHora: string,
): FichaHistorico {
  const next: FichaHistorico = structuredClone(historicoAtual)
  for (const patch of patches) {
    const trilha = PATH_TO_HISTORICO[patch.path]
    if (!trilha) continue
    const item: FichaHistoricoItem = {
      data: dataHora, sessao_id: sessaoId, valor: patch.depois, acao: patch.tipo,
    }
    next[trilha] = [...(next[trilha] ?? []), item]
  }
  return next
}

export function consolidateFicha(
  ficha: PacienteFicha, acceptedPatches: FichaPatch[], sessaoId: string, dataHora: string,
): PacienteFicha {
  // idempotência: remove qualquer resíduo desta sessão antes de reaplicar
  const historicoLimpo: FichaHistorico = {}
  for (const [trilha, itens] of Object.entries(ficha.historico)) {
    const filtrado = (itens ?? []).filter((i) => i.sessao_id !== sessaoId)
    if (filtrado.length) historicoLimpo[trilha] = filtrado
  }
  const changelogLimpo = ficha.changelog.filter((c) => c.sessao_id !== sessaoId)

  return {
    atual: applyPatches(ficha.atual, acceptedPatches),
    historico: deriveHistorico(historicoLimpo, acceptedPatches, sessaoId, dataHora),
    changelog: [...changelogLimpo, { sessao_id: sessaoId, data: dataHora, patches: acceptedPatches }],
    consolidacao_pendente: ficha.consolidacao_pendente,
  }
}
```

> Nota: o `applyPatches` parte sempre do `ficha.atual` corrente. Como a reconsolidação da mesma sessão recebe o `atual` já com a sessão aplicada, patches escalares são idempotentes (substituem) e os de lista usam `includes` para não duplicar.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run __tests__/ficha-merge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ficha/merge.ts __tests__/ficha-merge.test.ts
git commit -m "feat: deriveHistorico + consolidateFicha idempotente"
```

---

## Task 5: Projeção `ficha → legado` e `seedFichaFromLegacy`

**Files:**
- Modify: `lib/ficha/merge.ts`
- Test: `__tests__/ficha-merge.test.ts`

**Interfaces:**
- Produces:
  - `projectToLegacy(ficha): { resumo: PacienteResumo; historico: PacienteHistorico }` — mantém a UI atual.
  - `seedFichaFromLegacy(resumo: PacienteResumo | null, historico: PacienteHistorico | null): PacienteFicha` — backfill que evita regressão.

- [ ] **Step 1: Escrever os testes falhos (round-trip)**

```typescript
import { projectToLegacy, seedFichaFromLegacy } from '@/lib/ficha/merge'

describe('projeção e seed (round-trip sem regressão)', () => {
  it('projeta sintese e humor do atual para o resumo legado', () => {
    const f = emptyFicha()
    f.atual.sintese_clinica = 'Paciente em fase de estabilização.'
    f.atual.estado_mental.humor = 'eutímico'
    const legacy = projectToLegacy(f)
    expect(legacy.resumo.sintese).toBe('Paciente em fase de estabilização.')
    expect(legacy.resumo.humor).toBe('eutímico')
  })

  it('seed a partir do legado preserva sintese ao projetar de volta', () => {
    const ficha = seedFichaFromLegacy({ sintese: 'Quadro ansioso crônico.', humor: 'ansioso' }, {})
    const legacy = projectToLegacy(ficha)
    expect(legacy.resumo.sintese).toBe('Quadro ansioso crônico.')
    expect(ficha.atual.estado_mental.humor).toBe('ansioso')
  })

  it('seed com legado vazio retorna ficha vazia', () => {
    const ficha = seedFichaFromLegacy(null, null)
    expect(ficha).toEqual(emptyFicha())
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run __tests__/ficha-merge.test.ts`
Expected: FAIL ("projectToLegacy is not a function")

- [ ] **Step 3: Implementar projeção + seed**

```typescript
export function projectToLegacy(ficha: PacienteFicha): { resumo: PacienteResumo; historico: PacienteHistorico } {
  const a = ficha.atual
  const resumo: PacienteResumo = {
    sintese: a.sintese_clinica ?? undefined,
    humor: a.estado_mental.humor ?? undefined,
    tarefas: a.metas_plano.tarefas_andamento.join('; ') || undefined,
    alertas: a.alertas_ativos.join('; ') || undefined,
    crencas_nucleares: a.padroes_dinamicas.crencas_nucleares,
    recursos_paciente: a.padroes_dinamicas.recursos,
    pessoas_chave: a.pessoas_chave.map((p) => ({ nome: p.nome, tipo: p.tipo, categoria: p.categoria })),
    risco: {
      suicida: a.estado_mental.risco_suicida,
      heteroagressivo: a.estado_mental.risco_heteroagressivo,
      ultima_avaliacao: a.estado_mental.ultima_avaliacao ?? '',
    },
    ultima_atualizacao: ficha.changelog.at(-1)?.data,
    ultima_sessao_id: ficha.changelog.at(-1)?.sessao_id,
  }
  // historico legado: mapeia trilhas com o mesmo shape de HistoricoItem
  const historico: PacienteHistorico = {}
  for (const [trilha, itens] of Object.entries(ficha.historico)) {
    historico[trilha] = (itens ?? []).map((i) => ({
      data: i.data, sessao_id: i.sessao_id, valor: i.valor, acao: i.acao,
    }))
  }
  return { resumo, historico }
}

export function seedFichaFromLegacy(
  resumo: PacienteResumo | null, historico: PacienteHistorico | null,
): PacienteFicha {
  if (!resumo && !historico) return emptyFicha()
  const ficha = emptyFicha()
  if (resumo) {
    ficha.atual.sintese_clinica = resumo.sintese ?? null
    ficha.atual.estado_mental.humor = resumo.humor ?? null
    if (resumo.risco) {
      ficha.atual.estado_mental.risco_suicida = resumo.risco.suicida || 'não avaliado'
      ficha.atual.estado_mental.risco_heteroagressivo = resumo.risco.heteroagressivo || 'não avaliado'
      ficha.atual.estado_mental.ultima_avaliacao = resumo.risco.ultima_avaliacao || null
    }
    ficha.atual.padroes_dinamicas.crencas_nucleares = resumo.crencas_nucleares ?? []
    ficha.atual.padroes_dinamicas.recursos = resumo.recursos_paciente ?? []
  }
  if (historico) {
    for (const [trilha, itens] of Object.entries(historico)) {
      ficha.historico[trilha] = (itens ?? []).map((i) => ({
        data: i.data, sessao_id: i.sessao_id, valor: i.valor, acao: (i.acao ?? 'adicionado') as FichaPatch['tipo'],
      }))
    }
  }
  return ficha
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run __tests__/ficha-merge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ficha/merge.ts __tests__/ficha-merge.test.ts
git commit -m "feat: projeção ficha->legado + seedFichaFromLegacy (backfill sem regressão)"
```

---

## Task 6: `deterministicPatches` (fallback sem LLM)

**Files:**
- Modify: `lib/ficha/merge.ts`
- Test: `__tests__/ficha-merge.test.ts`

**Interfaces:**
- Consumes: `SessaoResumo` (Task tipos existentes), `FichaAtual`.
- Produces: `deterministicPatches(atual: FichaAtual, resumo: SessaoResumo): FichaPatch[]` — regras simples (humor, tarefas novas, alertas), usado quando a IA #2 falha.

- [ ] **Step 1: Escrever o teste falho**

```typescript
import { deterministicPatches } from '@/lib/ficha/merge'
import type { SessaoResumo } from '@/lib/types'

const baseResumo = (): SessaoResumo => ({
  resumo: { sintese: '', pontos_principais: [] },
  pontos_atencao: { urgentes: [], monitorar: [], acompanhar_proximas: [] },
  estrategia_plano: { tarefas_novas: [], metas_acordadas: null, foco_proxima_sessao: null },
  evolucao_cfp: '',
  queixas_sintomas: { queixa_sessao: null, sintomas_relatados: [], intensidade: null, frequencia: null, fatores_agravantes: [], fatores_alivio: [] },
  estado_mental: { humor: null, afeto: null, pensamento_curso: null, pensamento_conteudo: null, insight: null, juizo_critica: null, risco_suicida: 'não avaliado', risco_heteroagressivo: 'não avaliado', outras_observacoes: null },
  mudancas_padroes: { mudancas_positivas: [], padroes_identificados: [], crencas_centrais: [], defesas_predominantes: [], recursos_paciente: [], persistencias: [] },
  progresso_tarefas: [], pessoas_centrais: [], pessoas_secundarias: [],
  farmacologia: { medicacoes: null, adesao: null, efeitos_relatados: null, mudancas: null, encaminhamento_psiquiatrico: null },
  intervencoes: { tecnicas_utilizadas: [], temas_trabalhados: [], observacoes_processo: null },
  anamnese: { infancia: null, adolescencia: null, vida_adulta: null, familia_origem: null, relacionamentos: null, marcos_vida: null, historico_tratamentos: null },
})

describe('deterministicPatches (fallback)', () => {
  it('emite patch de humor quando difere do atual', () => {
    const atual = emptyFichaAtual()
    const resumo = baseResumo(); resumo.estado_mental.humor = 'eutímico'
    const patches = deterministicPatches(atual, resumo)
    expect(patches.some((p) => p.path === 'estado_mental.humor' && p.depois === 'eutímico')).toBe(true)
  })

  it('não emite humor quando igual ao atual', () => {
    const atual = emptyFichaAtual(); atual.estado_mental.humor = 'eutímico'
    const resumo = baseResumo(); resumo.estado_mental.humor = 'eutímico'
    expect(deterministicPatches(atual, resumo).some((p) => p.path === 'estado_mental.humor')).toBe(false)
  })

  it('emite patches de tarefas novas', () => {
    const resumo = baseResumo(); resumo.estrategia_plano.tarefas_novas = ['registro de pensamentos']
    const patches = deterministicPatches(emptyFichaAtual(), resumo)
    expect(patches.some((p) => p.path === 'metas_plano.tarefas_andamento[]' && p.depois === 'registro de pensamentos')).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run __tests__/ficha-merge.test.ts`
Expected: FAIL ("deterministicPatches is not a function")

- [ ] **Step 3: Implementar `deterministicPatches`**

```typescript
import type { SessaoResumo } from '@/lib/types'

function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 40)
}

export function deterministicPatches(atual: FichaAtual, resumo: SessaoResumo): FichaPatch[] {
  const patches: FichaPatch[] = []
  const push = (path: string, depois: string, antes: string | null, tipo: FichaPatch['tipo'] = 'atualizado', risco = false) =>
    patches.push({ id: `${path}#${slug(depois)}`, path, tipo, antes, depois, motivo: 'Consolidação automática (fallback).', risco })

  const humor = resumo.estado_mental?.humor
  if (humor && humor !== atual.estado_mental.humor) push('estado_mental.humor', humor, atual.estado_mental.humor)

  for (const t of resumo.estrategia_plano?.tarefas_novas ?? [])
    if (!atual.metas_plano.tarefas_andamento.includes(t)) push('metas_plano.tarefas_andamento[]', t, null, 'adicionado')

  const alertas = [...(resumo.pontos_atencao?.urgentes ?? []), ...(resumo.pontos_atencao?.monitorar ?? [])]
  for (const a of alertas)
    if (!atual.alertas_ativos.includes(a)) push('alertas_ativos[]', a, null, 'adicionado', true)

  return patches
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run __tests__/ficha-merge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ficha/merge.ts __tests__/ficha-merge.test.ts
git commit -m "feat: deterministicPatches (fallback sem LLM) + slug util"
```

---

## Task 7: Motor IA #2 — `consolidate-ficha.ts`

**Files:**
- Create: `lib/ai/consolidate-ficha.ts`
- Test: `__tests__/consolidate-ficha.test.ts`

**Interfaces:**
- Consumes: `FichaAtual`, `SessaoResumo`, `FichaPatch`.
- Produces: `consolidateFichaAI(atual: FichaAtual, resumo: SessaoResumo): Promise<FichaPatch[]>`; `validatePatches(raw: unknown): FichaPatch[]` (exportada p/ teste, sem rede).

- [ ] **Step 1: Escrever o teste falho (validação, sem rede)**

```typescript
import { describe, it, expect } from 'vitest'
import { validatePatches } from '@/lib/ai/consolidate-ficha'

describe('validatePatches', () => {
  it('mantém patch válido e gera id quando ausente', () => {
    const out = validatePatches({ patches: [{ path: 'estado_mental.humor', tipo: 'atualizado', antes: 'ansioso', depois: 'eutímico', motivo: 'melhora' }] })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBeTruthy()
    expect(out[0].risco).toBe(false)
  })

  it('marca risco=true para paths de risco', () => {
    const out = validatePatches({ patches: [{ path: 'estado_mental.risco_suicida', tipo: 'atualizado', depois: 'ideação passiva', motivo: 'x' }] })
    expect(out[0].risco).toBe(true)
  })

  it('descarta patches com path inválido ou depois vazio', () => {
    const out = validatePatches({ patches: [
      { path: 'campo.inexistente', tipo: 'atualizado', depois: 'y', motivo: 'z' },
      { path: 'estado_mental.humor', tipo: 'atualizado', depois: '', motivo: 'z' },
    ] })
    expect(out).toEqual([])
  })

  it('retorna [] para entrada malformada (JSON truncado / sem patches)', () => {
    expect(validatePatches(null)).toEqual([])
    expect(validatePatches({ foo: 1 })).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run __tests__/consolidate-ficha.test.ts`
Expected: FAIL ("Cannot find module '@/lib/ai/consolidate-ficha'")

- [ ] **Step 3: Implementar o motor**

Paths válidos derivados de `PATH_TO_HISTORICO` (Task 2) + paths escalares revisáveis. Prompt segue os 5 princípios do spec.

```typescript
import OpenAI from 'openai'
import type { FichaAtual, FichaPatch } from '@/lib/types'
import type { SessaoResumo } from '@/lib/types'
import { PATH_TO_HISTORICO } from '@/lib/ficha/merge'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

const MODEL = 'gpt-5.2'
const RISCO_PATHS = new Set(['estado_mental.risco_suicida', 'estado_mental.risco_heteroagressivo'])

// Paths que a IA pode emitir (escalares revisáveis + listas do mapa de histórico)
const SCALAR_PATHS = new Set([
  'sintese_clinica', 'estado_mental.humor', 'estado_mental.afeto', 'estado_mental.insight',
  'estado_mental.juizo_critica', 'estado_mental.risco_suicida', 'estado_mental.risco_heteroagressivo',
  'queixas_ativas.queixa', 'queixas_ativas.frequencia', 'farmacologia.adesao',
  'farmacologia.encaminhamento', 'metas_plano.foco_proxima_sessao',
  'anamnese.infancia', 'anamnese.adolescencia', 'anamnese.vida_adulta', 'anamnese.familia_origem',
  'anamnese.relacionamentos', 'anamnese.marcos_vida', 'anamnese.historico_tratamentos',
])
const VALID_PATHS = new Set<string>([...SCALAR_PATHS, ...Object.keys(PATH_TO_HISTORICO)])
const VALID_TIPOS = new Set(['adicionado', 'atualizado', 'resolvido', 'concluida'])

function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 40)
}

export function validatePatches(raw: unknown): FichaPatch[] {
  const arr = (raw as any)?.patches
  if (!Array.isArray(arr)) return []
  const out: FichaPatch[] = []
  for (const r of arr) {
    if (!r || typeof r !== 'object') continue
    const { path, tipo, antes, depois, motivo } = r as Record<string, unknown>
    if (typeof path !== 'string' || !VALID_PATHS.has(path)) continue
    if (typeof tipo !== 'string' || !VALID_TIPOS.has(tipo)) continue
    if (typeof depois !== 'string' || !depois.trim()) continue
    out.push({
      id: `${path}#${slug(depois)}`,
      path, tipo: tipo as FichaPatch['tipo'],
      antes: typeof antes === 'string' && antes ? antes : null,
      depois,
      motivo: typeof motivo === 'string' ? motivo : '',
      risco: RISCO_PATHS.has(path),
    })
  }
  return out
}

const SYSTEM_PROMPT = `# PAPEL
Você é um documentador clínico em psicologia. Recebe a FICHA ATUAL consolidada de um paciente e o RESUMO de uma nova sessão. Sua tarefa é emitir uma lista de PATCHES que atualizam apenas o ESTADO ATUAL da ficha.

# REGRAS
1. ATUALIZE, NUNCA INVENTE: só emita patch com base na sessão ou na ficha. Campo sem evidência nova fica como está (não emita patch).
2. MUDANÇA REAL ≠ REPETIÇÃO: se a sessão repete algo já na ficha, não emita patch. Só emita se houve evolução, contradição ou item novo.
3. CONSOLIDE ENTIDADES: descrições diferentes do mesmo padrão/pessoa já registrados = atualização (não item novo).
4. JUSTIFIQUE: todo patch tem 'motivo' clínico curto (o psicólogo lê no diff).
5. RISCO CONSERVADOR: qualquer mudança em risco_suicida/heteroagressivo SEMPRE vira patch explícito, nunca silenciosa.

# PATHS PERMITIDOS
Escalares (substituem valor): sintese_clinica, estado_mental.humor, estado_mental.afeto, estado_mental.insight, estado_mental.juizo_critica, estado_mental.risco_suicida, estado_mental.risco_heteroagressivo, queixas_ativas.queixa, queixas_ativas.frequencia, farmacologia.adesao, farmacologia.encaminhamento, metas_plano.foco_proxima_sessao, anamnese.* .
Listas (path termina em []): queixas_ativas.sintomas[], padroes_dinamicas.padroes[], padroes_dinamicas.crencas_nucleares[], padroes_dinamicas.recursos[], pessoas_chave[], farmacologia.medicacoes[], metas_plano.metas_ativas[], metas_plano.tarefas_andamento[], alertas_ativos[]. Use tipo 'concluida'/'resolvido' (com 'antes'=item exato) para remover de uma lista.

# FORMATO
Responda APENAS JSON válido, sem markdown:
{ "patches": [ { "path": "...", "tipo": "adicionado|atualizado|resolvido|concluida", "antes": "valor anterior ou null", "depois": "valor novo", "motivo": "..." } ] }
Se nada mudou, retorne { "patches": [] }.`

export async function consolidateFichaAI(atual: FichaAtual, resumo: SessaoResumo): Promise<FichaPatch[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')
  const openai = new OpenAI({ apiKey })

  const parsed = await withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_completion_tokens: 6000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `FICHA ATUAL:\n${JSON.stringify(atual)}\n\nRESUMO DA SESSÃO:\n${JSON.stringify(resumo)}` },
      ],
    })
    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('OpenAI retornou resposta vazia')
    return JSON.parse(content)
  }, { maxRetries: 2, timeoutMs: 120_000, baseDelayMs: 3000,
       onRetry: (e, a) => logger.warn('consolidate-ficha retry', { attempt: a, error: e.message }) })

  return validatePatches(parsed)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run __tests__/consolidate-ficha.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ai/consolidate-ficha.ts __tests__/consolidate-ficha.test.ts
git commit -m "feat: motor IA #2 consolidate-ficha (patches + validação)"
```

---

## Task 8: Migração SQL + encrypt

**Files:**
- Create: `supabase/migrations/019_paciente_ficha.sql`
- Modify: `lib/supabase/encrypt.ts:76-83` (`decryptPaciente`)

**Interfaces:**
- Produces: coluna `pacientes.ficha JSONB`; RPC `approve_session_atomic(p_sessao_id, p_paciente_id, p_paciente_resumo, p_paciente_historico, p_paciente_ficha)`.

- [ ] **Step 1: Escrever a migração**

```sql
-- 019_paciente_ficha.sql — ficha v2 (fonte de verdade)
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS ficha JSONB DEFAULT '{}'::jsonb;

-- RPC atualizada: grava ficha (fonte de verdade) + projeções legadas, atômico
CREATE OR REPLACE FUNCTION approve_session_atomic(
  p_sessao_id UUID,
  p_paciente_id UUID,
  p_paciente_resumo JSONB,
  p_paciente_historico JSONB,
  p_paciente_ficha JSONB
) RETURNS void AS $$
BEGIN
  UPDATE sessoes SET status = 'realizada'
  WHERE id = p_sessao_id AND status = 'aguardando_aprovacao';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão % não está aguardando aprovação', p_sessao_id;
  END IF;

  UPDATE pacientes
  SET resumo = p_paciente_resumo,
      historico = p_paciente_historico,
      ficha = p_paciente_ficha
  WHERE id = p_paciente_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paciente % não encontrado', p_paciente_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

> A assinatura antiga (4 args) é substituída pela nova (5 args). Como Postgres distingue por assinatura, dropar a antiga evita ambiguidade:

```sql
DROP FUNCTION IF EXISTS approve_session_atomic(UUID, UUID, JSONB, JSONB);
```
(coloque o DROP antes do CREATE no arquivo.)

- [ ] **Step 2: Aplicar a migração localmente**

Run: `npx supabase db push` (ou o comando de migração do projeto — checar `package.json scripts`)
Expected: aplica `019` sem erro; `\d pacientes` mostra coluna `ficha`.

- [ ] **Step 3: Adicionar `ficha` ao `decryptPaciente`**

Em `lib/supabase/encrypt.ts`, dentro de `decryptPaciente`, após a linha do `historico`:

```typescript
  if ('historico' in paciente) paciente.historico = decryptJsonField(paciente.historico)
  if ('ficha' in paciente) paciente.ficha = decryptJsonField(paciente.ficha)
```

- [ ] **Step 4: Verificar testes de encrypt seguem passando**

Run: `npx vitest run __tests__/encrypt.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/019_paciente_ficha.sql lib/supabase/encrypt.ts
git commit -m "feat: migração ficha + RPC com p_paciente_ficha + decrypt"
```

---

## Task 9: Script de backfill

**Files:**
- Create: `scripts/backfill-ficha.ts`

**Interfaces:**
- Consumes: `seedFichaFromLegacy` (Task 5), `decryptJsonField`/`encryptJsonField`.

- [ ] **Step 1: Escrever o script**

```typescript
/**
 * Backfill: semeia pacientes.ficha a partir de resumo/historico legados.
 * Evita regressão: sem isso, a 1ª consolidação projetaria ficha vazia de volta.
 * Uso: npx tsx scripts/backfill-ficha.ts
 */
import { createClient } from '@supabase/supabase-js'
import { seedFichaFromLegacy } from '@/lib/ficha/merge'
import { decryptJsonField, encryptJsonField } from '@/lib/supabase/encrypt'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const db = createClient(url, key)

  const { data: pacientes, error } = await db.from('pacientes').select('id, resumo, historico, ficha')
  if (error) throw error

  let seeded = 0
  for (const p of pacientes ?? []) {
    const fichaAtual = decryptJsonField<any>(p.ficha)
    if (fichaAtual?.atual) continue // já tem ficha v2 — não sobrescreve

    const resumo = decryptJsonField<any>(p.resumo)
    const historico = decryptJsonField<any>(p.historico)
    const ficha = seedFichaFromLegacy(resumo ?? null, historico ?? null)

    const { error: upErr } = await db.from('pacientes').update({ ficha: encryptJsonField(ficha) }).eq('id', p.id)
    if (upErr) { console.error(`Falha no paciente ${p.id}:`, upErr.message); continue }
    seeded++
  }
  console.log(`Backfill concluído: ${seeded} pacientes semeados.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Rodar contra o banco local (smoke)**

Run: `npx tsx scripts/backfill-ficha.ts`
Expected: imprime "Backfill concluído: N pacientes semeados." sem erro.

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill-ficha.ts
git commit -m "feat: script de backfill da ficha a partir do legado"
```

---

## Task 10: Endpoint de preview (Fase 1)

**Files:**
- Create: `app/api/sessoes/[id]/consolidar-preview/route.ts`

**Interfaces:**
- Consumes: `consolidateFichaAI` (Task 7), `consolidateFicha`/`emptyFicha` (Tasks 2/4), `decryptJsonField`.
- Produces: `POST` → `{ changelog: FichaPatch[], ficha_proposta: PacienteFicha }`. Não persiste.

- [ ] **Step 1: Escrever a rota**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { decryptJsonField } from '@/lib/supabase/encrypt'
import { consolidateFichaAI } from '@/lib/ai/consolidate-ficha'
import { consolidateFicha, emptyFicha } from '@/lib/ficha/merge'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { captureException } from '@/lib/utils/sentry'
import type { SessaoResumo, PacienteFicha } from '@/lib/types'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError
    const ownership = await requireSessionOwner(db, user!.id, id)
    if (ownership.error) return ownership.error

    const rl = checkRateLimit(`consolidar:${user!.id}`, RATE_LIMITS.extract)
    if (!rl.success) return NextResponse.json({ error: 'Muitas requisições. Tente novamente em breve.' }, { status: 429 })

    const { data: sessao, error } = await db
      .from('sessoes')
      .select('resumo, data_hora, pacientes(ficha)')
      .eq('id', id).single()
    if (error || !sessao?.resumo) return NextResponse.json({ error: 'Sessão ou resumo não encontrado' }, { status: 404 })

    const resumo = decryptJsonField<SessaoResumo>(sessao.resumo)
    const fichaAtual = decryptJsonField<PacienteFicha>((sessao as any).pacientes?.ficha)
    const ficha = fichaAtual?.atual ? fichaAtual : emptyFicha()
    if (!resumo) return NextResponse.json({ error: 'Falha ao ler resumo' }, { status: 500 })

    const patches = await consolidateFichaAI(ficha.atual, resumo)
    const ficha_proposta = consolidateFicha(ficha, patches, id, (sessao as any).data_hora)

    return NextResponse.json({ changelog: patches, ficha_proposta })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    logger.error('Consolidar preview failed', { sessaoId: id, error: message })
    if (error instanceof Error) captureException(error, { sessaoId: id, operation: 'consolidar-preview' })
    return NextResponse.json({ error: 'Erro ao gerar prévia da ficha' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add "app/api/sessoes/[id]/consolidar-preview/route.ts"
git commit -m "feat: endpoint consolidar-preview (Fase 1, não persiste)"
```

---

## Task 11: Approve Fase 2 (aplica patches aceitos + fallback)

**Files:**
- Modify: `app/api/sessoes/[id]/approve/route.ts:46-112` (substituir o bloco de merge ingênuo + chamada RPC)

**Interfaces:**
- Consumes: body `{ acceptedPatches?: FichaPatch[] }`; `consolidateFicha`, `deterministicPatches`, `projectToLegacy`, `emptyFicha`; RPC de 5 args.

- [ ] **Step 1: Ler o body e carregar a ficha**

Substituir a montagem de `novoResumo`/`novoHistorico` (linhas ~46-100) por:

```typescript
import { consolidateFicha, deterministicPatches, projectToLegacy, emptyFicha } from '@/lib/ficha/merge'
import type { FichaPatch, PacienteFicha } from '@/lib/types'

// ...após validar sessao/resumo/paciente:
const body = await request.json().catch(() => ({}))
let acceptedPatches: FichaPatch[] = Array.isArray(body?.acceptedPatches) ? body.acceptedPatches : []

const fichaDecrypted = decryptJsonField<PacienteFicha>(paciente.ficha)
const fichaBase = fichaDecrypted?.atual ? fichaDecrypted : emptyFicha()

// Fallback: sem patches do cliente (IA #2 indisponível no preview) → regras determinísticas
let pendente = false
if (acceptedPatches.length === 0) {
  acceptedPatches = deterministicPatches(fichaBase.atual, resumo)
  pendente = true
}

const fichaNova = consolidateFicha(fichaBase, acceptedPatches, id, sessao.data_hora)
fichaNova.consolidacao_pendente = pendente
const { resumo: novoResumo, historico: novoHistorico } = projectToLegacy(fichaNova)
```

- [ ] **Step 2: Atualizar a chamada RPC (5 args)**

```typescript
const { error: rpcError } = await db.rpc('approve_session_atomic', {
  p_sessao_id: id,
  p_paciente_id: paciente.id,
  p_paciente_resumo: encryptJsonField(novoResumo),
  p_paciente_historico: encryptJsonField(novoHistorico),
  p_paciente_ficha: encryptJsonField(fichaNova),
})
```

Remover os imports/uso de `PacienteResumo`/`PacienteHistorico`/`HistoricoItem` que viraram mortos no arquivo, e garantir que `select` traga `ficha`:

```typescript
.select('*, pacientes(id, status, resumo, historico, ficha, frequencia_sessoes, dia_semana_preferido, hora_preferida, duracao_padrao)')
```

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Teste de fumaça do fluxo (manual)**

Aprovar uma sessão em `aguardando_aprovacao` sem `acceptedPatches` no body → status vira `realizada`, `pacientes.ficha` populada, `consolidacao_pendente=true`. Verificar no banco.

- [ ] **Step 5: Commit**

```bash
git add "app/api/sessoes/[id]/approve/route.ts"
git commit -m "feat: approve Fase 2 aplica patches aceitos + fallback determinístico"
```

---

## Task 12: UI — diff/changelog com checkboxes no `approval-modal`

**Files:**
- Modify: `components/approval-modal.tsx`

**Interfaces:**
- Consumes: `POST /consolidar-preview` → `{ changelog, ficha_proposta }`; `POST /approve` com `{ acceptedPatches }`.

- [ ] **Step 1: Ler o componente atual**

Run: `cat components/approval-modal.tsx`
Expected: entender props/fluxo de aprovação atuais (botão que chama `/approve`).

- [ ] **Step 2: Adicionar etapa de consolidação**

Ao clicar "Aprovar e atualizar ficha":
1. `POST /api/sessoes/[id]/consolidar-preview` (loading state, igual extract).
2. Renderizar `changelog` agrupado por `secao` (derivada de `path.split('.')[0]`), cada item com checkbox marcado por padrão. Itens com `risco===true` destacados (badge vermelho).
3. Botão "Confirmar" → `POST /api/sessoes/[id]/approve` com `{ acceptedPatches: changelog.filter(p => marcados[p.id]) }`.

```tsx
// estado
const [patches, setPatches] = useState<FichaPatch[] | null>(null)
const [aceitos, setAceitos] = useState<Record<string, boolean>>({})
const [loadingPreview, setLoadingPreview] = useState(false)

async function gerarPreview() {
  setLoadingPreview(true)
  try {
    const res = await fetch(`/api/sessoes/${sessaoId}/consolidar-preview`, { method: 'POST' })
    const json = await res.json()
    const ps: FichaPatch[] = json.changelog ?? []
    setPatches(ps)
    setAceitos(Object.fromEntries(ps.map((p) => [p.id, true])))
  } finally { setLoadingPreview(false) }
}

async function confirmar() {
  const acceptedPatches = (patches ?? []).filter((p) => aceitos[p.id])
  await fetch(`/api/sessoes/${sessaoId}/approve`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acceptedPatches }),
  })
  // ...fechar modal / revalidar (manter comportamento existente pós-approve)
}
```

Render do diff (esboço — adaptar às classes Tailwind do projeto):

```tsx
{patches?.map((p) => (
  <label key={p.id} className={`flex gap-2 p-2 rounded ${p.risco ? 'border border-red-300 bg-red-50' : ''}`}>
    <input type="checkbox" checked={!!aceitos[p.id]}
      onChange={(e) => setAceitos((s) => ({ ...s, [p.id]: e.target.checked }))} />
    <span>
      <strong>{p.path.split('.')[0]}</strong>: {p.antes ? `${p.antes} → ` : ''}{p.depois}
      <em className="block text-xs text-gray-500">{p.motivo}</em>
    </span>
  </label>
))}
```

- [ ] **Step 3: Verificar build**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 4: Verificação manual no app**

Abrir uma sessão em `aguardando_aprovacao` → "Aprovar e atualizar ficha" → ver diff → desmarcar 1 item → confirmar → conferir que o item rejeitado não entrou na ficha (banco) e os demais sim.

- [ ] **Step 5: Commit**

```bash
git add components/approval-modal.tsx
git commit -m "feat: diff/changelog com checkboxes na aprovação da sessão"
```

---

## Task 13: Suíte de integração + verificação final

**Files:**
- Test: `__tests__/ficha-integration.test.ts`

- [ ] **Step 1: Teste de fixtures (ficha existente + sessão nova)**

```typescript
import { describe, it, expect } from 'vitest'
import { consolidateFicha, applyPatches, projectToLegacy, emptyFicha } from '@/lib/ficha/merge'
import type { FichaPatch } from '@/lib/types'

describe('integração: consolidação acumulativa', () => {
  it('mantém histórico antigo e adiciona o novo ao longo de 2 sessões', () => {
    const HORA1 = '2026-06-13T14:00:00.000Z', HORA2 = '2026-06-20T14:00:00.000Z'
    const mk = (over: Partial<FichaPatch>): FichaPatch => ({ id: 'i', path: 'estado_mental.humor', tipo: 'atualizado', antes: null, depois: 'x', motivo: '', ...over })

    const s1 = consolidateFicha(emptyFicha(), [
      mk({ id: 'a', path: 'padroes_dinamicas.crencas_nucleares[]', tipo: 'adicionado', depois: 'sou uma fraude' }),
    ], 'sess-1', HORA1)

    const s2 = consolidateFicha(s1, [
      mk({ id: 'b', path: 'estado_mental.humor', depois: 'eutímico', antes: 'ansioso' }),
      mk({ id: 'c', path: 'padroes_dinamicas.crencas_nucleares[]', tipo: 'adicionado', depois: 'preciso agradar' }),
    ], 'sess-2', HORA2)

    // estado atual acumulado
    expect(s2.atual.padroes_dinamicas.crencas_nucleares).toEqual(['sou uma fraude', 'preciso agradar'])
    expect(s2.atual.estado_mental.humor).toBe('eutímico')
    // histórico preserva as duas sessões
    expect(s2.historico.crencas).toHaveLength(2)
    // projeção legada não quebra
    expect(projectToLegacy(s2).resumo.humor).toBe('eutímico')
  })

  it('rejeição: patch não aceito não altera atual nem histórico', () => {
    const out = consolidateFicha(emptyFicha(), [], 'sess-x', '2026-06-20T14:00:00.000Z')
    expect(out.atual).toEqual(emptyFicha().atual)
    expect(out.historico).toEqual({})
  })
})
```

- [ ] **Step 2: Rodar a suíte completa**

Run: `npx vitest run`
Expected: PASS (todos os arquivos, incluindo os legados de encrypt/rate-limit)

- [ ] **Step 3: Type-check + lint final**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add __tests__/ficha-integration.test.ts
git commit -m "test: integração da consolidação acumulativa da ficha"
```

---

## Self-Review (cobertura do spec)

- **Seção 1 (modelo de dados):** Task 1 (tipos) + Task 2 (paths). ✅
- **Seção 2 (motor híbrido):** LLM em Task 7; aplicação+histórico determinístico em Tasks 3–4; idempotência em Task 4. ✅
- **Seção 3 (fluxo/UX):** preview Task 10; approve Fase 2 Task 11; diff UI Task 12; fallback Tasks 6+11. ✅
- **Seção 4 (migração/compat/testes):** migração+encrypt Task 8; backfill Task 9; projeção Task 5; testes ao longo + integração Task 13. ✅
- **Furos do review (changelog-patch, backfill-seed, idempotência, fallback-fonte-única):** Tasks 3/11, 5/9, 4, 6/11. ✅
- **Mapa `SessaoResumo → ficha`:** `PATH_TO_HISTORICO` (Task 2) + `SCALAR_PATHS`/`VALID_PATHS` (Task 7). ✅

**Pendência conhecida (fora de escopo, conforme spec):** reescrita da UI rica da ficha em `app/(app)/pacientes/[id]` continua lendo os campos legados via projeção — PR separado.
