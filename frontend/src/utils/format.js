/**
 * Colombian peso formatter.
 * @param {number} n
 * @returns {string}  e.g. "$ 1.234.567"
 */
export function fmtCOP(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

/**
 * Percentage formatter using es-CO locale (comma as decimal separator).
 * @param {number} n        numeric value, e.g. 1.5
 * @param {number} decimals number of decimal places (default 2)
 * @returns {string}  e.g. "1,50%"
 */
export function fmtPct(n, decimals = 2) {
  return (
    new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n) + '%'
  )
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * Month-year formatter.
 * @param {{ mes: number, anio: number }} param  mes is 0-based (0=Jan)
 * @returns {string}  e.g. "ene. 2025"
 */
export function fmtMonthYear({ mes, anio }) {
  return `${MESES_CORTOS[mes]}. ${anio}`
}

/**
 * Duration formatter in months, expressed as years/months in Spanish.
 * @param {number} n  number of months
 * @returns {string}  e.g. "6 meses", "1 año", "1 año y 2 meses"
 */
export function fmtMeses(n) {
  if (n === 1) return '1 mes'

  const years = Math.floor(n / 12)
  const months = n % 12

  if (years === 0) return `${n} meses`

  const yearStr = years === 1 ? '1 año' : `${years} años`
  if (months === 0) return yearStr

  const monthStr = months === 1 ? '1 mes' : `${months} meses`
  return `${yearStr} y ${monthStr}`
}
