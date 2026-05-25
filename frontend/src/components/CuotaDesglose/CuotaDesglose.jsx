import { fmtCOP } from '../../utils/format.js'
import styles from './CuotaDesglose.module.css'

/**
 * CuotaDesglose — shows the first installment's capital/interest breakdown
 * as a stacked bar and labelled amounts.
 * @param {{ resultado: object }} props
 */
export default function CuotaDesglose({ resultado }) {
  const primeraFila = resultado.tabla[0]
  if (!primeraFila) return null

  const { capital, interes } = primeraFila
  const total = capital + interes
  const capitalPct = total > 0 ? (capital / total) * 100 : 0
  const interesPct = 100 - capitalPct

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>Desglose primera cuota</div>
      <div className={styles.bar}>
        <div className={styles.capital} style={{ width: `${capitalPct}%` }} />
        <div className={styles.interes} style={{ width: `${interesPct}%` }} />
      </div>
      <div className={styles.labels}>
        <span>Capital: <strong>{fmtCOP(capital)}</strong></span>
        <span>Interés: <strong>{fmtCOP(interes)}</strong></span>
      </div>
    </div>
  )
}
