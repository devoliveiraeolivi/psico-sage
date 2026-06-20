import { describe, it, expect } from 'vitest'
import { emptyFicha, emptyFichaAtual, PATH_TO_HISTORICO, applyPatches } from '@/lib/ficha/merge'
import type { FichaPatch } from '@/lib/types'

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
