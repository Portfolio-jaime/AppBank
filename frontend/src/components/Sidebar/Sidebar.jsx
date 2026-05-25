import { useContext } from 'react'
import { SimContext } from '../../App.jsx'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const { state, dispatch } = useContext(SimContext)
  const { simulaciones, activa, comparar } = state

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

  function handleComparar(e, id) {
    // Prevent the click from also selecting the simulation
    e.stopPropagation()

    const isChecked = comparar.includes(id)
    if (isChecked) {
      // Remove from comparar
      dispatch({ type: 'SET_COMPARAR', payload: comparar.filter(cid => cid !== id) })
    } else {
      // Add to comparar, max 2 — if already 2, replace the oldest (first in array)
      const next = comparar.length < 2 ? [...comparar, id] : [comparar[1], id]
      dispatch({ type: 'SET_COMPARAR', payload: next })
    }
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
          <span className={styles.itemLabel}>
            Simulación {simulaciones.length - idx}
          </span>
          {sim.resultado && (
            <input
              type="checkbox"
              className={styles.compareCheck}
              title="Comparar"
              checked={comparar.includes(sim.id)}
              onChange={e => handleComparar(e, sim.id)}
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>
      ))}
      <button className={styles.newBtn} onClick={handleNew}>
        + Nueva simulación
      </button>
    </aside>
  )
}
