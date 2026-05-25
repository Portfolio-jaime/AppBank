import { fmtCOP, fmtPct, fmtMeses } from '../../utils/format.js'
import styles from './KPIGrid.module.css'

/**
 * KPIGrid — displays 10 key performance indicators for a simulation.
 * @param {{ resultado: object, params: object }} props
 */
export default function KPIGrid({ resultado, params }) {
  const capitalFinanciado = params.precio - params.enganche
  const totalAbonosExtra = resultado.tabla.reduce((s, r) => s + r.abonoExtra, 0)

  const kpis = [
    { label: 'Cuota mensual',      value: fmtCOP(resultado.cuota),               accent: false },
    { label: 'Capital financiado', value: fmtCOP(capitalFinanciado),             accent: false },
    { label: 'Total pagado',       value: fmtCOP(resultado.totalPagado),         accent: false },
    { label: 'Total intereses',    value: fmtCOP(resultado.totalIntereses),      accent: false },
    { label: 'Intereses ahorrados',value: fmtCOP(resultado.interesesAhorrados),  accent: resultado.interesesAhorrados > 0 },
    { label: 'Meses ahorrados',    value: fmtMeses(resultado.mesesAhorrados),    accent: resultado.mesesAhorrados > 0 },
    { label: 'Plazo original',     value: fmtMeses(params.plazoMeses),           accent: false },
    { label: 'Plazo real',         value: fmtMeses(resultado.tabla.length),      accent: false },
    { label: 'Tasa mensual',       value: fmtPct(params.tasaMensual),            accent: false },
    { label: 'Total abonos extra', value: fmtCOP(totalAbonosExtra),              accent: false },
  ]

  return (
    <div className={styles.grid}>
      {kpis.map(({ label, value, accent }) => (
        <div key={label} className={styles.card}>
          <div className={styles.label}>{label}</div>
          <div className={`${styles.value}${accent ? ` ${styles.accent}` : ''}`}>{value}</div>
        </div>
      ))}
    </div>
  )
}
