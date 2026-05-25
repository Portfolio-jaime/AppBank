import { useContext } from 'react'
import { SimContext } from '../../App.jsx'
import AIChat from '../AIChat/AIChat.jsx'
import styles from './AIInsightPanel.module.css'

export default function AIInsightPanel() {
  const { state } = useContext(SimContext)

  return (
    <div className={styles.panel}>
      <div className={styles.header}>Asistente IA</div>
      {state.activa === null ? (
        <div className={styles.empty}>
          Crea una simulación para activar el asistente
        </div>
      ) : (
        <AIChat />
      )}
    </div>
  )
}
