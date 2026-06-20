import type {
  PacienteFicha, FichaAtual, FichaHistorico, FichaHistoricoItem,
  FichaPatch, FichaChangelogEntry, PacienteResumo, PacienteHistorico, HistoricoItem, SessaoResumo,
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
