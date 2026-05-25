import styles from './TopBar.module.css'

const MODES = [
  { id: 'simulate', label: 'Simular' },
  { id: 'compare', label: 'Comparar' },
]

/**
 * TopBar — app header with mode toggle.
 * @param {{ mode: string, onModeChange: (mode: string) => void }} props
 */
export default function TopBar({ mode, onModeChange }) {
  return (
    <header className={styles.topbar}>
      <span className={styles.title}>CréditoIA</span>
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
