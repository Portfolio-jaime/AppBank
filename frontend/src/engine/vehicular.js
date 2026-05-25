/**
 * vehicular.js — Vehicle loan amortization engine
 *
 * Implements French (fixed-payment) amortization with support for
 * extraordinary payments: one-time (unico) and biannual (semestral).
 */

/**
 * calcularBaseline — no-extra-payments reference run.
 *
 * @param {number} capital     - Loan principal
 * @param {number} tasaMensual - Monthly rate as a percentage (e.g. 1.2 → 1.2%)
 * @param {number} plazoMeses  - Scheduled term in months
 * @returns {{ totalPagado: number, totalIntereses: number, mesesTotales: number }}
 */
export function calcularBaseline(capital, tasaMensual, plazoMeses) {
  const r = tasaMensual / 100

  const cuota =
    r === 0
      ? capital / plazoMeses
      : (capital * r) / (1 - Math.pow(1 + r, -plazoMeses))

  let saldo = capital
  let totalPagado = 0
  let totalIntereses = 0
  let mesesTotales = 0
  const maxIter = 300

  for (let i = 0; i < maxIter; i++) {
    if (saldo <= 0.5) break

    const interes = saldo * r
    let capital_amort = cuota - interes

    // Last period: pay exactly the remaining balance
    if (capital_amort >= saldo) {
      capital_amort = saldo
      const cuotaFinal = capital_amort + interes
      totalPagado += cuotaFinal
      totalIntereses += interes
      saldo = 0
      mesesTotales++
      break
    }

    totalPagado += cuota
    totalIntereses += interes
    saldo -= capital_amort
    mesesTotales++
  }

  return { totalPagado, totalIntereses, mesesTotales }
}

/**
 * calcularVehicular — main amortization engine.
 *
 * @param {object} params
 * @param {number} params.precio        - Vehicle price
 * @param {number} params.enganche      - Down payment
 * @param {number} params.tasaMensual   - Monthly rate as percentage
 * @param {number} params.plazoMeses    - Term in months
 * @param {number} params.mesInicio     - 1-based start month (1=Jan … 12=Dec)
 * @param {number} params.anioInicio    - Start year
 * @param {Array}  params.abonos        - Extraordinary payment descriptors
 *
 * @returns {{
 *   cuota: number,
 *   totalPagado: number,
 *   totalIntereses: number,
 *   interesesAhorrados: number,
 *   mesesAhorrados: number,
 *   tabla: Array
 * }}
 */
export function calcularVehicular({
  precio,
  enganche,
  tasaMensual,
  plazoMeses,
  mesInicio,
  anioInicio,
  abonos = [],
}) {
  const capital = precio - enganche
  const r = tasaMensual / 100

  // French amortization fixed payment; guard for 0% rate
  const cuota =
    r === 0
      ? capital / plazoMeses
      : (capital * r) / (1 - Math.pow(1 + r, -plazoMeses))

  // Baseline for comparison (same loan, no extra payments)
  const baseline = calcularBaseline(capital, tasaMensual, plazoMeses)

  // ── Amortization loop ──────────────────────────────────────────────────────
  const tabla = []
  let saldo = capital
  let totalPagado = 0
  let totalIntereses = 0

  // Convert 1-based mesInicio to 0-based month index
  let mesActual = mesInicio - 1 // 0 = Jan, 11 = Dec
  let anioActual = anioInicio

  for (let periodo = 1; periodo <= plazoMeses; periodo++) {
    if (saldo <= 0.5) break

    const interes = saldo * r
    let capital_amort = cuota - interes

    // Clamp so we never over-pay the principal
    if (capital_amort >= saldo) {
      capital_amort = saldo
    }

    saldo -= capital_amort
    if (saldo < 0) saldo = 0

    // ── Extraordinary payments for this month ────────────────────────────────
    // 1-based month for matching unico.mes (user-facing)
    const mes1Based = mesActual + 1

    let abonoExtra = 0
    for (const abono of abonos) {
      if (abono.tipo === 'unico') {
        if (abono.mes === mes1Based && abono.anio === anioActual) {
          abonoExtra += abono.monto
        }
      } else if (abono.tipo === 'semestral') {
        // Apply in June (mes1Based=6) and December (mes1Based=12)
        if (mes1Based === 6 || mes1Based === 12) {
          abonoExtra += abono.monto
        }
      }
    }

    // Apply extraordinary payment to remaining balance
    if (abonoExtra > 0) {
      saldo -= abonoExtra
      if (saldo < 0) saldo = 0
    }

    // Compute actual cuota paid this period (may be less on last period)
    const cuotaPeriodo = capital_amort + interes

    totalPagado += cuotaPeriodo + abonoExtra
    totalIntereses += interes

    tabla.push({
      periodo,
      mes: mesActual,
      anio: anioActual,
      cuota: cuotaPeriodo,
      capital: capital_amort,
      interes,
      abonoExtra,
      saldo,
    })

    // Advance calendar month
    mesActual++
    if (mesActual > 11) {
      mesActual = 0
      anioActual++
    }

    if (saldo <= 0.5) break
  }

  const interesesAhorrados = baseline.totalIntereses - totalIntereses
  const mesesAhorrados = baseline.mesesTotales - tabla.length

  return {
    cuota,
    totalPagado,
    totalIntereses,
    interesesAhorrados,
    mesesAhorrados,
    tabla,
  }
}
