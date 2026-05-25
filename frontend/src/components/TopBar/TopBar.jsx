import { useContext } from 'react'
import { SimContext } from '../../App.jsx'
import { exportPDF } from '../../utils/exportPDF.js'
import { exportExcel } from '../../utils/exportExcel.js'
import styles from './TopBar.module.css'

const MODES = [
  { id: 'simulate', label: 'Simular' },
  { id: 'compare', label: 'Comparar' },
]

/**
 * TopBar — app header with mode toggle and export actions.
 * @param {{ mode: string, onModeChange: (mode: string) => void }} props
 */
export default function TopBar({ mode, onModeChange }) {
  const { state } = useContext(SimContext)

  const activaSim =
    state.activa !== null
      ? state.simulaciones.find(s => s.id === state.activa) ?? null
      : null

  const disabled = activaSim === null

  function handleExportPDF() {
    if (activaSim) exportPDF(activaSim)
  }

  function handleExportExcel() {
    if (activaSim) exportExcel(activaSim)
  }

  return (
    <header className={styles.topbar}>
      <span className={styles.title}>CréditoIA</span>
      <div className={styles.exportBtns}>
        <button
          className={styles.exportBtn}
          onClick={handleExportPDF}
          disabled={disabled}
          title={disabled ? 'Selecciona una simulación primero' : 'Exportar PDF'}
        >
          📄 PDF
        </button>
        <button
          className={styles.exportBtn}
          onClick={handleExportExcel}
          disabled={disabled}
          title={disabled ? 'Selecciona una simulación primero' : 'Exportar Excel'}
        >
          📊 Excel
        </button>
      </div>
      <nav className={styles.modeToggle}>
        {MODES.map(m => (
          <button
            key={m.id}
            className={`${styles.modeBtn}${mode === m.id ? ' ' + styles.active : ''}`}
            onClick={() => onModeChange(m.id)}
          >
            {m.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
