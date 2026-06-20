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
