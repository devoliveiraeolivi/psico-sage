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
