import { useContext } from 'react'
import { SimContext } from '../../App.jsx'
import KPIGrid from '../KPIGrid/KPIGrid.jsx'
import CuotaDesglose from '../CuotaDesglose/CuotaDesglose.jsx'
import styles from './SimuladorPanel.module.css'

/**
 * SimuladorPanel — orchestrates the results view for a simulation.
 * Uses `simulacionId` prop if provided, otherwise falls back to state.activa.
 * @param {{ simulacionId?: string }} props
 */
export default function SimuladorPanel({ simulacionId }) {
  const { state, dispatch } = useContext(SimContext)

  const id = simulacionId ?? state.activa
  const sim = state.simulaciones.find(s => s.id === id)

  if (!sim) {
    return (
      <p className={styles.empty}>Selecciona o crea una simulación</p>
    )
  }

  function handleNueva() {
    dispatch({ type: 'SET_ACTIVA', payload: null })
  }

  return (
    <div className={styles.panel}>
      <button className={styles.back} onClick={handleNueva}>
        ← Nueva simulación
      </button>
      <KPIGrid resultado={sim.resultado} params={sim.params} />
      <CuotaDesglose resultado={sim.resultado} />
    </div>
  )
}
