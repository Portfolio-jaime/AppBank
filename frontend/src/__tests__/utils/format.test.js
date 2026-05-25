import { describe, it, expect } from 'vitest'
import { fmtCOP, fmtPct, fmtMonthYear, fmtMeses } from '../../utils/format.js'

describe('fmtCOP', () => {
  it('formats 1_234_567 with thousands dot separator', () => {
    expect(fmtCOP(1_234_567)).toContain('1.234.567')
  })
  it('includes peso sign', () => {
    expect(fmtCOP(100_000)).toMatch(/\$/)
  })
})

describe('fmtPct', () => {
  it('formats 1.05 as "1,05%"', () => {
    expect(fmtPct(1.05)).toBe('1,05%')
  })
  it('formats 0.20 as "0,20%"', () => {
    expect(fmtPct(0.20)).toBe('0,20%')
  })
})

describe('fmtMonthYear', () => {
  it('formats January 2025', () => {
    expect(fmtMonthYear({ mes: 0, anio: 2025 })).toBe('ene. 2025')
  })
  it('formats December 2029', () => {
    expect(fmtMonthYear({ mes: 11, anio: 2029 })).toBe('dic. 2029')
  })
  it('formats June 2026', () => {
    expect(fmtMonthYear({ mes: 5, anio: 2026 })).toBe('jun. 2026')
  })
})

describe('fmtMeses', () => {
  it('1 -> "1 mes"', () => { expect(fmtMeses(1)).toBe('1 mes') })
  it('6 -> "6 meses"', () => { expect(fmtMeses(6)).toBe('6 meses') })
  it('12 -> "1 año"', () => { expect(fmtMeses(12)).toBe('1 año') })
  it('24 -> "2 años"', () => { expect(fmtMeses(24)).toBe('2 años') })
  it('14 -> "1 año y 2 meses"', () => { expect(fmtMeses(14)).toBe('1 año y 2 meses') })
})
