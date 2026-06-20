import { describe, it, expect } from 'vitest'
import { normalizeRecomendacoes } from '@/lib/ai/gerar-recomendacoes'

describe('normalizeRecomendacoes', () => {
  it('fills safe defaults for an empty payload', () => {
    const r = normalizeRecomendacoes({}, 'gpt-5.2', '2026-06-20T00:00:00.000Z')
    expect(r.tecnicas_sugeridas).toEqual([])
    expect(r.hipoteses_diagnosticas).toEqual([])
    expect(r.escalas_sugeridas).toEqual([])
    expect(r.psicoeducacao).toEqual([])
    expect(r.conducao_proxima_sessao).toEqual([])
    expect(r.alertas_clinicos).toEqual([])
    expect(r.modelo_ia_usado).toBe('gpt-5.2')
    expect(r.gerado_em).toBe('2026-06-20T00:00:00.000Z')
  })

  it('coerces hipotese sistema to a valid value and keeps arrays', () => {
    const r = normalizeRecomendacoes({
      hipoteses_diagnosticas: [
        { hipotese: 'sinais compatíveis com TAG', sistema: 'inventado', sinais_observados: ['preocupação excessiva'], criterios_a_confirmar: ['duração 6m'], perguntas_rastreio: ['Há quanto tempo?'] },
      ],
      tecnicas_sugeridas: [
        { abordagem: 'TCC', nome: 'Reestruturação', descricao_curta: 'd', quando_usar: 'q' },
      ],
    }, 'gpt-5.2', '2026-06-20T00:00:00.000Z')
    expect(r.hipoteses_diagnosticas[0].sistema).toBe('CID-11') // default quando valor inválido
    expect(r.hipoteses_diagnosticas[0].sinais_observados).toEqual(['preocupação excessiva'])
    expect(r.tecnicas_sugeridas[0].abordagem).toBe('TCC')
  })

  it('coerces alerta nivel to a valid value', () => {
    const r = normalizeRecomendacoes({
      alertas_clinicos: [{ nivel: 'qualquer', descricao: 'menção a desesperança' }],
    }, 'gpt-5.2', '2026-06-20T00:00:00.000Z')
    expect(r.alertas_clinicos[0].nivel).toBe('monitorar') // default seguro
    expect(r.alertas_clinicos[0].descricao).toBe('menção a desesperança')
  })
})
