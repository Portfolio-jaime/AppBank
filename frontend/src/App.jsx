import { createContext, useState } from 'react'
import useSimulaciones from './hooks/useSimulaciones.js'
import styles from './App.module.css'
import TopBar from './components/TopBar/TopBar.jsx'
import Sidebar from './components/Sidebar/Sidebar.jsx'
import VehicularForm from './components/VehicularForm/VehicularForm.jsx'
import SimuladorPanel from './components/SimuladorPanel/SimuladorPanel.jsx'
import CompareView from './components/CompareView/CompareView.jsx'

export const SimContext = createContext(null)

export default function App() {
  const { state, dispatch } = useSimulaciones()
  const [mode, setMode] = useState('simulate')

  return (
    <SimContext.Provider value={{ state, dispatch }}>
      <div className={styles.layout}>
        <div className={styles.topbar}>
          <TopBar mode={mode} onModeChange={setMode} />
        </div>
        <Sidebar />
        <main className={styles.main}>
          {mode === 'compare' ? (
            <CompareView />
          ) : state.activa === null ? (
            <VehicularForm />
          ) : (
            <SimuladorPanel />
          )}
        </main>
        <div>
          {/* AIInsightPanel placeholder — populated in a later task */}
        </div>
      </div>
    </SimContext.Provider>
  )
}
