import { describe, it, expect } from 'vitest'
import { emptyFicha, emptyFichaAtual, PATH_TO_HISTORICO, applyPatches, consolidateFicha, projectToLegacy, seedFichaFromLegacy, deterministicPatches } from '@/lib/ficha/merge'
import type { FichaPatch, SessaoResumo } from '@/lib/types'

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

  it('seed preserva tarefas, alertas e pessoas_chave no round-trip com projectToLegacy', () => {
    const ficha = seedFichaFromLegacy(
      {
        sintese: 'Quadro ansioso.',
        tarefas: 'tarefa A; tarefa B',
        alertas: 'alerta X',
        pessoas_chave: [{ nome: 'Mãe', tipo: 'mae', categoria: 'familia_origem' }],
      },
      {},
    )
    // Verifica seed
    expect(ficha.atual.metas_plano.tarefas_andamento).toEqual(['tarefa A', 'tarefa B'])
    expect(ficha.atual.alertas_ativos).toEqual(['alerta X'])
    expect(ficha.atual.pessoas_chave).toEqual([{ nome: 'Mãe', categoria: 'familia_origem', tipo: 'mae', dinamica: '' }])
    // Round-trip: projectToLegacy deve reemitir os mesmos valores
    const legacy = projectToLegacy(ficha)
    expect(legacy.resumo.tarefas).toBe('tarefa A; tarefa B')
    expect(legacy.resumo.alertas).toBe('alerta X')
    expect(legacy.resumo.pessoas_chave).toEqual([{ nome: 'Mãe', tipo: 'mae', categoria: 'familia_origem' }])
  })
})

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

describe('projectToLegacy — preserva campos não-modelados do prior resumo', () => {
  it('preserva momento, diagnosticos e conflitos do priorResumo enquanto campos modelados vêm da ficha', () => {
    const ficha = emptyFicha()
    ficha.atual.estado_mental.humor = 'eutímico'
    const priorResumo = { momento: 'estável', diagnosticos: 'TAG', conflitos: 'mãe' } as any
    const { resumo } = projectToLegacy(ficha, priorResumo)
    // Campos não-modelados devem ser preservados do prior resumo
    expect(resumo.momento).toBe('estável')
    expect(resumo.diagnosticos).toBe('TAG')
    expect(resumo.conflitos).toBe('mãe')
    // Campo modelado pela ficha deve refletir a ficha
    expect(resumo.humor).toBe('eutímico')
  })

  it('sem priorResumo continua funcionando normalmente (retro-compatibilidade)', () => {
    const ficha = emptyFicha()
    ficha.atual.sintese_clinica = 'Teste sem prior'
    const { resumo } = projectToLegacy(ficha)
    expect(resumo.sintese).toBe('Teste sem prior')
    expect(resumo.momento).toBeUndefined()
  })
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

  it('emite patches de alertas (urgentes e monitorar)', () => {
    const resumo = baseResumo()
    resumo.pontos_atencao.urgentes = ['risco de autoagressão']
    resumo.pontos_atencao.monitorar = ['isolamento social']
    const patches = deterministicPatches(emptyFichaAtual(), resumo)
    expect(patches.some((p) => p.path === 'alertas_ativos[]' && p.depois === 'risco de autoagressão' && p.risco === true)).toBe(true)
    expect(patches.some((p) => p.path === 'alertas_ativos[]' && p.depois === 'isolamento social' && p.risco === true)).toBe(true)
  })
})
