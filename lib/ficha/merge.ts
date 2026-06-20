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
