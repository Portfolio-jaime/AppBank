import { createContext } from 'react'
import useSimulaciones from './hooks/useSimulaciones.js'
import styles from './App.module.css'
import TopBar from './components/TopBar/TopBar.jsx'
import Sidebar from './components/Sidebar/Sidebar.jsx'
import VehicularForm from './components/VehicularForm/VehicularForm.jsx'

export const SimContext = createContext(null)

export default function App() {
  const { state, dispatch } = useSimulaciones()

  return (
    <SimContext.Provider value={{ state, dispatch }}>
      <div className={styles.layout}>
        <div className={styles.topbar}>
          <TopBar />
        </div>
        <Sidebar />
        <main className={styles.main}>
          <VehicularForm />
        </main>
        <div>
          {/* AIInsightPanel placeholder — populated in a later task */}
        </div>
      </div>
    </SimContext.Provider>
  )
}
