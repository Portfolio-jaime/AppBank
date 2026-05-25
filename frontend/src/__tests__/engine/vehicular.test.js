import { describe, it, expect } from 'vitest'
import { calcularVehicular, calcularBaseline } from '../../engine/vehicular.js'

// Helper: round to 2 decimal places for floating-point comparisons
const r2 = (n) => Math.round(n * 100) / 100

// ─── Test 1: Basic loan, no extra payments ───────────────────────────────────
describe('calcularVehicular — basic loan, no extra payments', () => {
  const params = {
    precio: 50_000_000,
    enganche: 10_000_000,
    tasaMensual: 1.2,
    plazoMeses: 48,
    mesInicio: 1,
    anioInicio: 2025,
    abonos: [],
  }

  it('returns the correct French-amortization cuota', () => {
    const result = calcularVehicular(params)
    const capital = 40_000_000
    const r = 1.2 / 100
    const expected = capital * r / (1 - Math.pow(1 + r, -48))
    expect(r2(result.cuota)).toBe(r2(expected))
  })

  it('tabla has exactly plazoMeses rows', () => {
    const result = calcularVehicular(params)
    expect(result.tabla.length).toBe(48)
  })

  it('saldo in last row is <= 0.5', () => {
    const result = calcularVehicular(params)
    const lastRow = result.tabla[result.tabla.length - 1]
    expect(lastRow.saldo).toBeLessThanOrEqual(0.5)
  })

  it('first row has periodo=1, mes=0 (Jan), anio=2025', () => {
    const result = calcularVehicular(params)
    expect(result.tabla[0].periodo).toBe(1)
    expect(result.tabla[0].mes).toBe(0)
    expect(result.tabla[0].anio).toBe(2025)
  })

  it('all abonoExtra values are 0', () => {
    const result = calcularVehicular(params)
    const anyExtra = result.tabla.some((row) => row.abonoExtra !== 0)
    expect(anyExtra).toBe(false)
  })

  it('interesesAhorrados is 0 (no extras vs baseline)', () => {
    const result = calcularVehicular(params)
    expect(result.interesesAhorrados).toBeCloseTo(0, 0)
  })

  it('mesesAhorrados is 0', () => {
    const result = calcularVehicular(params)
    expect(result.mesesAhorrados).toBe(0)
  })

  it('totalPagado equals cuota * tabla.length (no extras)', () => {
    const result = calcularVehicular(params)
    const expected = result.cuota * result.tabla.length
    expect(result.totalPagado).toBeCloseTo(expected, 0)
  })
})

// ─── Test 2: With one unico extraordinary payment ────────────────────────────
describe('calcularVehicular — with one unico extra payment', () => {
  const params = {
    precio: 50_000_000,
    enganche: 10_000_000,
    tasaMensual: 1.2,
    plazoMeses: 48,
    mesInicio: 1,
    anioInicio: 2025,
    abonos: [
      { tipo: 'unico', monto: 5_000_000, mes: 6, anio: 2025 },
    ],
  }

  it('loan ends earlier than plazoMeses', () => {
    const result = calcularVehicular(params)
    expect(result.tabla.length).toBeLessThan(48)
  })

  it('interesesAhorrados is positive', () => {
    const result = calcularVehicular(params)
    expect(result.interesesAhorrados).toBeGreaterThan(0)
  })

  it('mesesAhorrados is positive', () => {
    const result = calcularVehicular(params)
    expect(result.mesesAhorrados).toBeGreaterThan(0)
  })

  it('extra payment applied in the correct month (June 2025 = mes:5, anio:2025)', () => {
    const result = calcularVehicular(params)
    // June 2025: periodo 6 (mesInicio=1, so 6th period = June)
    const juneRow = result.tabla.find((row) => row.mes === 5 && row.anio === 2025)
    expect(juneRow).toBeDefined()
    expect(juneRow.abonoExtra).toBe(5_000_000)
  })
})

// ─── Test 3: With semestral payments ─────────────────────────────────────────
describe('calcularVehicular — with semestral payments', () => {
  const params = {
    precio: 50_000_000,
    enganche: 10_000_000,
    tasaMensual: 1.2,
    plazoMeses: 48,
    mesInicio: 1,
    anioInicio: 2025,
    abonos: [
      { tipo: 'semestral', monto: 2_000_000 },
    ],
  }

  it('reduces term vs no-extra baseline', () => {
    const result = calcularVehicular(params)
    expect(result.tabla.length).toBeLessThan(48)
  })

  it('applies extra in June months (mes=5)', () => {
    const result = calcularVehicular(params)
    const juneRows = result.tabla.filter((row) => row.mes === 5)
    expect(juneRows.length).toBeGreaterThan(0)
    juneRows.forEach((row) => {
      expect(row.abonoExtra).toBeGreaterThanOrEqual(2_000_000)
    })
  })

  it('applies extra in December months (mes=11)', () => {
    const result = calcularVehicular(params)
    const decRows = result.tabla.filter((row) => row.mes === 11)
    expect(decRows.length).toBeGreaterThan(0)
    decRows.forEach((row) => {
      expect(row.abonoExtra).toBeGreaterThanOrEqual(2_000_000)
    })
  })

  it('months other than June/December have abonoExtra=0', () => {
    const result = calcularVehicular(params)
    const otherRows = result.tabla.filter((row) => row.mes !== 5 && row.mes !== 11)
    otherRows.forEach((row) => {
      expect(row.abonoExtra).toBe(0)
    })
  })

  it('interesesAhorrados is positive', () => {
    const result = calcularVehicular(params)
    expect(result.interesesAhorrados).toBeGreaterThan(0)
  })
})

// ─── Test 4: calcularBaseline matches known totalIntereses ───────────────────
describe('calcularBaseline', () => {
  it('matches expected totalIntereses for a known loan', () => {
    // capital=40M, r=1.2%, 48 months
    const capital = 40_000_000
    const tasaMensual = 1.2
    const plazoMeses = 48
    const r = tasaMensual / 100
    const cuota = capital * r / (1 - Math.pow(1 + r, -plazoMeses))
    const expectedTotal = cuota * plazoMeses
    const expectedIntereses = expectedTotal - capital

    const result = calcularBaseline(capital, tasaMensual, plazoMeses)
    expect(result.mesesTotales).toBe(48)
    expect(result.totalPagado).toBeCloseTo(expectedTotal, 0)
    expect(result.totalIntereses).toBeCloseTo(expectedIntereses, 0)
  })

  it('returns mesesTotales equal to plazoMeses when no extra payments', () => {
    const result = calcularBaseline(10_000_000, 1.0, 24)
    expect(result.mesesTotales).toBe(24)
  })
})

// ─── Test 5: Edge case — tasaMensual = 0 ─────────────────────────────────────
describe('calcularVehicular — edge case tasaMensual = 0', () => {
  const params = {
    precio: 30_000_000,
    enganche: 5_000_000,
    tasaMensual: 0,
    plazoMeses: 25,
    mesInicio: 3,
    anioInicio: 2026,
    abonos: [],
  }

  it('cuota equals capital / plazoMeses', () => {
    const result = calcularVehicular(params)
    const capital = 25_000_000
    expect(r2(result.cuota)).toBe(r2(capital / 25))
  })

  it('tabla has plazoMeses rows', () => {
    const result = calcularVehicular(params)
    expect(result.tabla.length).toBe(25)
  })

  it('totalIntereses is 0', () => {
    const result = calcularVehicular(params)
    expect(result.totalIntereses).toBeCloseTo(0, 0)
  })
})
