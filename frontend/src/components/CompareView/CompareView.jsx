import { useContext } from 'react'
import { SimContext } from '../../App.jsx'
import CompareSummaryBar from './CompareSummaryBar.jsx'
import SimuladorPanel from '../SimuladorPanel/SimuladorPanel.jsx'
import styles from './CompareView.module.css'

/**
 * CompareView — side-by-side comparison of two simulations.
 * Reads state.comparar (array of 0 or 2 ids) from SimContext.
 */
export default function CompareView() {
  const { state } = useContext(SimContext)
  const { comparar, simulaciones } = state

  if (comparar.length !== 2) {
    return (
      <p className={styles.empty}>
        Selecciona 2 simulaciones para comparar
      </p>
    )
  }

  const simA = simulaciones.find(s => s.id === comparar[0])
  const simB = simulaciones.find(s => s.id === comparar[1])

  // Guard: one of the selected ids may no longer exist
  if (!simA || !simB || !simA.resultado || !simB.resultado) {
    return (
      <p className={styles.empty}>
        Selecciona 2 simulaciones con resultados para comparar
      </p>
    )
  }

  return (
    <div>
      <CompareSummaryBar simA={simA} simB={simB} />
      <div className={styles.columns}>
        <SimuladorPanel simulacionId={simA.id} />
        <SimuladorPanel simulacionId={simB.id} />
      </div>
    </div>
  )
}
