import { fmtCOP, fmtMeses } from '../../utils/format.js'
import styles from './CompareSummaryBar.module.css'

/**
 * CompareSummaryBar — renders a compact metric comparison between two simulations.
 * @param {{ simA: object, simB: object }} props  each is { id, params, resultado }
 */
export default function CompareSummaryBar({ simA, simB }) {
  const rA = simA.resultado
  const rB = simB.resultado

  // Winner: lower totalIntereses wins
  const winnerIsA = rA.totalIntereses <= rB.totalIntereses

  const rows = [
    {
      label: 'Total intereses',
      valA: fmtCOP(rA.totalIntereses),
      valB: fmtCOP(rB.totalIntereses),
      winA: rA.totalIntereses <= rB.totalIntereses,
    },
    {
      label: 'Plazo real',
      valA: fmtMeses(rA.tabla.length),
      valB: fmtMeses(rB.tabla.length),
      winA: rA.tabla.length <= rB.tabla.length,
    },
    {
      label: 'Total pagado',
      valA: fmtCOP(rA.totalPagado),
      valB: fmtCOP(rB.totalPagado),
      winA: rA.totalPagado <= rB.totalPagado,
    },
  ]

  return (
    <div className={styles.bar}>
      {/* Header row with winner badges */}
      <div className={styles.row}>
        <div className={styles.val}>
          {winnerIsA && <span className={styles.badge}>Mejor opcion</span>}
        </div>
        <div className={styles.label} />
        <div className={styles.val}>
          {!winnerIsA && <span className={styles.badge}>Mejor opcion</span>}
        </div>
      </div>

      {rows.map(({ label, valA, valB, winA }) => (
        <div key={label} className={styles.row}>
          <div className={`${styles.val}${winA ? ' ' + styles.winner : ''}`}>
            {valA}
          </div>
          <div className={styles.label}>{label}</div>
          <div className={`${styles.val}${!winA ? ' ' + styles.winner : ''}`}>
            {valB}
          </div>
        </div>
      ))}
    </div>
  )
}
