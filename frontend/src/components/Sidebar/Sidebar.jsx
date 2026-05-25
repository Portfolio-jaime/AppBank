import { useContext } from 'react'
import { SimContext } from '../../App.jsx'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const { state, dispatch } = useContext(SimContext)
  const { simulaciones, activa } = state

  function handleSelect(id) {
    dispatch({ type: 'SET_ACTIVA', payload: id })
  }

  function handleNew() {
    dispatch({
      type: 'ADD_SIMULACION',
      payload: {
        id: crypto.randomUUID(),
        params: {},
        resultado: null,
        createdAt: Date.now(),
      },
    })
  }

  return (
    <aside className={styles.sidebar}>
      {simulaciones.length === 0 && (
        <p className={styles.emptyMsg}>Sin simulaciones</p>
      )}
      {simulaciones.map((sim, idx) => (
        <div
          key={sim.id}
          className={`${styles.item}${sim.id === activa ? ' ' + styles.active : ''}`}
          onClick={() => handleSelect(sim.id)}
        >
          Simulación {simulaciones.length - idx}
        </div>
      ))}
      <button className={styles.newBtn} onClick={handleNew}>
        + Nueva simulación
      </button>
    </aside>
  )
}
