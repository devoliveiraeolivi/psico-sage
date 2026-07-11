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
