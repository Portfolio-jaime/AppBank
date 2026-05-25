import { useState } from 'react'
import { fmtCOP, fmtMonthYear } from '../../utils/format.js'
import styles from './AmortizationTable.module.css'

/**
 * Groups tabla rows by year.
 * @param {Array} tabla
 * @returns {Map<number, Array>}
 */
function groupByYear(tabla) {
  const map = new Map()
  for (const row of tabla) {
    if (!map.has(row.anio)) {
      map.set(row.anio, [])
    }
    map.get(row.anio).push(row)
  }
  return map
}

/**
 * AmortizationTable — collapsible table grouped by year.
 * All year blocks start closed. Click a year header to expand/collapse.
 * @param {{ tabla: Array }} props
 */
export default function AmortizationTable({ tabla }) {
  const [openYears, setOpenYears] = useState(new Set())

  if (!tabla || tabla.length === 0) return null

  const grouped = groupByYear(tabla)

  function toggleYear(anio) {
    setOpenYears(prev => {
      const next = new Set(prev)
      if (next.has(anio)) {
        next.delete(anio)
      } else {
        next.add(anio)
      }
      return next
    })
  }

  return (
    <div className={styles.wrap}>
      {[...grouped.entries()].map(([anio, rows]) => {
        const isOpen = openYears.has(anio)
        const totalCapital = rows.reduce((s, r) => s + (r.capital ?? 0), 0)
        const totalInteres = rows.reduce((s, r) => s + (r.interes ?? 0), 0)
        const totalAbonoExtra = rows.reduce((s, r) => s + (r.abonoExtra ?? 0), 0)
        const totalPagado = totalCapital + totalInteres + totalAbonoExtra

        return (
          <div key={anio}>
            {/* Year header row */}
            <div
              className={styles.yearRow}
              onClick={() => toggleYear(anio)}
              role="button"
              aria-expanded={isOpen}
            >
              <span>{isOpen ? '▼' : '▶'}</span>
              <span>{anio}</span>
              <span>Capital: {fmtCOP(totalCapital)}</span>
              <span>Interés: {fmtCOP(totalInteres)}</span>
              {totalAbonoExtra > 0 && (
                <span className={styles.accent}>Abono Extra: {fmtCOP(totalAbonoExtra)}</span>
              )}
              <span style={{ marginLeft: 'auto' }}>Total: {fmtCOP(totalPagado)}</span>
            </div>

            {/* Detail rows */}
            {isOpen && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Período</th>
                    <th className={styles.th}>Mes/Año</th>
                    <th className={styles.th}>Cuota</th>
                    <th className={styles.th}>Capital</th>
                    <th className={styles.th}>Interés</th>
                    <th className={styles.th}>Abono Extra</th>
                    <th className={styles.th}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.periodo}>
                      <td className={styles.td}>{row.periodo}</td>
                      <td className={styles.td}>{fmtMonthYear({ mes: row.mes, anio: row.anio })}</td>
                      <td className={styles.td}>{fmtCOP(row.cuota)}</td>
                      <td className={styles.td}>{fmtCOP(row.capital)}</td>
                      <td className={styles.td}>{fmtCOP(row.interes)}</td>
                      <td className={`${styles.td} ${row.abonoExtra > 0 ? styles.accent : ''}`}>
                        {row.abonoExtra > 0 ? fmtCOP(row.abonoExtra) : '—'}
                      </td>
                      <td className={styles.td}>{fmtCOP(row.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </div>
  )
}
