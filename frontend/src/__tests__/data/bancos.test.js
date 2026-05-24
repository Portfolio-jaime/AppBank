import { describe, it, expect } from 'vitest'
import { BANCOS, getBancoById, getTasaSugerida } from '../../data/bancos.js'

describe('BANCOS', () => {
  it('has 14 entries (13 banks + otro)', () => {
    expect(BANCOS).toHaveLength(14)
  })
  it('all banks except otro have numeric tasaMensual', () => {
    BANCOS.filter(b => b.id !== 'otro').forEach(b => {
      expect(typeof b.tasaMensual).toBe('number')
      expect(b.tasaMensual).toBeGreaterThan(0)
    })
  })
  it('otro bank has null tasaMensual', () => {
    expect(BANCOS.find(b => b.id === 'otro').tasaMensual).toBeNull()
  })
})

describe('getBancoById', () => {
  it('returns Bancolombia with tasa 1.05', () => {
    const b = getBancoById('bancolombia')
    expect(b.nombre).toBe('Bancolombia')
    expect(b.tasaMensual).toBe(1.05)
  })
  it('returns undefined for unknown id', () => {
    expect(getBancoById('xyz')).toBeUndefined()
  })
})

describe('getTasaSugerida', () => {
  it('score >=850 applies -0.15', () => {
    expect(getTasaSugerida(1.05, 870, 'combustion')).toBeCloseTo(0.90, 5)
  })
  it('electrico applies -0.20 (score 700 = delta 0)', () => {
    expect(getTasaSugerida(1.05, 700, 'electrico')).toBeCloseTo(0.85, 5)
  })
  it('score 800 + hibrido: -0.05 + -0.10 = -0.15', () => {
    expect(getTasaSugerida(1.05, 800, 'hibrido')).toBeCloseTo(0.90, 5)
  })
  it('floor at 0.01', () => {
    expect(getTasaSugerida(0.10, 900, 'electrico')).toBeGreaterThanOrEqual(0.01)
  })
})
