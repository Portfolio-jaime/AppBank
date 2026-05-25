import { useState } from 'react'
import styles from './TopBar.module.css'

const MODES = [
  { id: 'vehicular', label: 'Vehicular' },
]

export default function TopBar() {
  const [mode, setMode] = useState('vehicular')

  return (
    <header className={styles.topbar}>
      <span className={styles.title}>CréditoIA</span>
      <nav className={styles.modeToggle}>
        {MODES.map(m => (
          <button
            key={m.id}
            className={`${styles.modeBtn}${mode === m.id ? ' ' + styles.active : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
