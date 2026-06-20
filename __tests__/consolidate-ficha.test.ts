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

  it('rejeita patches de paths de listas de objetos (pessoas_chave[] e farmacologia.medicacoes[])', () => {
    const out = validatePatches({ patches: [
      { path: 'pessoas_chave[]', tipo: 'adicionado', depois: 'Mãe', motivo: 'x' },
      { path: 'farmacologia.medicacoes[]', tipo: 'adicionado', depois: 'Sertralina', motivo: 'y' },
    ] })
    expect(out).toEqual([])
  })
})
