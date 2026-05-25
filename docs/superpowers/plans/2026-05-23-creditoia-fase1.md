# CréditoIA — Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build CréditoIA Phase 1 — vehicular credit simulator with dual-mode AI (simulation ↔ chat), PDF/Excel export, and side-by-side comparison view.

**Architecture:** Monorepo (npm workspaces). Vite+React 18 frontend runs the full amortization engine in-browser and persists state via localStorage. Minimal Express backend holds the Anthropic API key and streams SSE from Claude. All financial calculations are pure JS functions with no side effects.

**Tech Stack:** Vite 5, React 18, Vitest + @testing-library/react + jsdom, Chart.js, jsPDF + jspdf-autotable, xlsx (SheetJS), Express 4, @anthropic-ai/sdk, cors, dotenv, concurrently.

---

## File Structure

Existing `credito_vehiculo.html` stays untouched as reference.

```
App-bank/
├── package.json                         root workspace + concurrently
├── .env                                 ANTHROPIC_API_KEY (gitignored)
├── .gitignore
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js                   proxy :3001 + vitest config
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                      top-level layout
│       ├── styles/
│       │   └── global.css              CSS variables, dark theme, resets
│       ├── data/
│       │   └── bancos.js               13 bancos CO + DELTA_SCORE + DELTA_TIPO
│       ├── engine/
│       │   └── vehicular.js            pure amortization + KPI computation
│       ├── components/
│       │   ├── TopBar/
│       │   │   ├── TopBar.jsx          credit tabs + Comparar + PDF/Excel
│       │   │   └── TopBar.module.css
│       │   ├── Sidebar/
│       │   │   ├── Sidebar.jsx
│       │   │   ├── Sidebar.module.css
│       │   │   ├── ModeToggle.jsx      Parámetros ↔ Chat IA toggle
│       │   │   └── forms/
│       │   │       └── VehicularForm.jsx
│       │   ├── panels/
│       │   │   ├── SimuladorPanel.jsx
│       │   │   ├── SimuladorPanel.module.css
│       │   │   ├── KPIGrid.jsx
│       │   │   ├── KPIGrid.module.css
│       │   │   ├── CuotaDesglose.jsx
│       │   │   ├── AmortizationChart.jsx
│       │   │   └── AmortizationTable.jsx
│       │   ├── CompareView.jsx
│       │   ├── CompareSummaryBar.jsx
│       │   └── AIInsightPanel.jsx
│       ├── hooks/
│       │   ├── useSimulaciones.js      useReducer + localStorage + APPLY_AI_CONFIG
│       │   └── useAIChat.js            SSE stream consumer
│       └── utils/
│           ├── exportPDF.js
│           ├── exportExcel.js
│           └── format.js              fmtCOP, fmtPct, fmtMonthYear, fmtMeses
└── backend/
    ├── package.json
    ├── index.js
    ├── routes/
    │   └── chat.js                     POST /api/chat → Claude SSE
    └── tools/
        └── creditTools.js              Claude tool definitions + engine runner
```

**Single responsibility rules:**
- `engine/vehicular.js` — math only, zero React/DOM imports
- `format.js` — locale formatting only
- `bancos.js` — static data only
- `useSimulaciones.js` — state + persistence only, no API calls
- `useAIChat.js` — SSE streaming only, no UI rendering
- `chat.js` — Claude proxy only, no business logic
- `creditTools.js` — tool definitions + runs engine for tool results

---

## Chunk 1: Project Setup + Data + Engine

### Task 1: Initialize monorepo

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "creditoia",
  "private": true,
  "workspaces": ["frontend", "backend"],
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "npm --workspace frontend run dev",
    "dev:backend": "npm --workspace backend run dev"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
.env
*.local
.DS_Store
```

- [ ] **Step 3: Create `.env` with placeholder**

```
ANTHROPIC_API_KEY=your_key_here
```

- [ ] **Step 4: Install root dependencies**

Run: `npm install`
Expected: `node_modules/concurrently` present, no errors.

- [ ] **Step 5: Commit**

```bash
git init
git add package.json .gitignore
git commit -m "feat: initialize monorepo root with npm workspaces"
```

---

### Task 2: Frontend Vite scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/test-setup.js`
- Create: `frontend/src/styles/global.css`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "creditoia-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "chart.js": "^4.4.4",
    "jspdf": "^2.5.2",
    "jspdf-autotable": "^3.8.3",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.1",
    "vitest": "^2.0.5",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Create `frontend/vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
```

- [ ] **Step 3: Create `frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CréditoIA</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `frontend/src/test-setup.js`**

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create `frontend/src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
```

- [ ] **Step 6: Create `frontend/src/App.jsx` (placeholder)**

```jsx
export default function App() {
  return <div className="app-root">CréditoIA — cargando...</div>
}
```

- [ ] **Step 7: Create `frontend/src/styles/global.css`**

```css
:root {
  --bg: #0d1117;
  --surface: #161b22;
  --surface-2: #1c2330;
  --border: #30363d;
  --text: #e6edf3;
  --muted: #7d8590;
  --accent: #e6a817;
  --accent-muted: rgba(230, 168, 23, 0.15);
  --green: #2ea043;
  --green-muted: rgba(46, 160, 67, 0.12);
  --blue: #58a6ff;
  --red: #f85149;
  --radius: 8px;
  --radius-sm: 5px;
  --sidebar-w: 280px;
  --insight-w: 260px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
  min-height: 100vh;
}

#root { display: flex; flex-direction: column; min-height: 100vh; }
button { cursor: pointer; font-family: inherit; }

input, select {
  font-family: inherit;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 6px 10px;
  font-size: 13px;
  width: 100%;
}

input:focus, select:focus { outline: none; border-color: var(--accent); }

.label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.disclaimer {
  font-size: 11px;
  color: var(--muted);
  background: rgba(88, 166, 255, 0.06);
  border: 1px solid rgba(88, 166, 255, 0.15);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
}
```

- [ ] **Step 8: Install frontend dependencies**

Run: `npm --workspace frontend install`
Expected: no errors.

- [ ] **Step 9: Verify frontend starts**

Run: `npm run dev:frontend`
Expected: `Local: http://localhost:5173/` — browser shows "CréditoIA — cargando..."

- [ ] **Step 10: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Vite+React 18 frontend with Vitest and dark theme"
```

---

### Task 3: Backend scaffold

**Files:**
- Create: `backend/package.json`
- Create: `backend/index.js`
- Create: `backend/routes/chat.js` (placeholder)
- Create: `backend/tools/creditTools.js` (placeholder)

- [ ] **Step 1: Create `backend/package.json`**

```json
{
  "name": "creditoia-backend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch index.js",
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "@anthropic-ai/sdk": "^0.32.1"
  }
}
```

Note: `node --watch` is Node.js 18+ built-in — no nodemon needed.

- [ ] **Step 2: Create `backend/index.js`**

```js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import chatRouter from './routes/chat.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())
app.use('/api/chat', chatRouter)
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`CréditoIA backend :${PORT}`))
```

- [ ] **Step 3: Create `backend/routes/chat.js` (placeholder)**

```js
import { Router } from 'express'
const router = Router()
router.post('/', (_req, res) => res.json({ message: 'placeholder' }))
export default router
```

- [ ] **Step 4: Create `backend/tools/creditTools.js` (placeholder)**

```js
export const tools = []
```

- [ ] **Step 5: Install and verify**

Run: `npm --workspace backend install`
Run: `npm run dev:backend`
Expected: `CréditoIA backend :3001`
Test: `curl http://localhost:3001/health` → `{"status":"ok"}`

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: scaffold Express backend with placeholder chat route"
```

---

### Task 4: Bank data

**Files:**
- Create: `frontend/src/data/bancos.js`
- Create: `frontend/src/__tests__/data/bancos.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// frontend/src/__tests__/data/bancos.test.js
import { describe, it, expect } from 'vitest'
import { BANCOS, getBancoById, getTasaSugerida } from '../../data/bancos.js'

describe('BANCOS', () => {
  it('has 14 entries (13 banks + otro)', () => {
    expect(BANCOS).toHaveLength(14)
  })
  it('all banks except otro have numeric tasaMensual', () => {
    BANCOS.filter(b => b.id !== 'otro').forEach(b => {
      expect(typeof b.tasaMensual).toBe('number')
      expect(b.tasaMensual).toBeGreaterThan(0)
    })
  })
  it('otro bank has null tasaMensual', () => {
    expect(BANCOS.find(b => b.id === 'otro').tasaMensual).toBeNull()
  })
})

describe('getBancoById', () => {
  it('returns Bancolombia with tasa 1.05', () => {
    const b = getBancoById('bancolombia')
    expect(b.nombre).toBe('Bancolombia')
    expect(b.tasaMensual).toBe(1.05)
  })
  it('returns undefined for unknown id', () => {
    expect(getBancoById('xyz')).toBeUndefined()
  })
})

describe('getTasaSugerida', () => {
  it('score ≥850 applies -0.15', () => {
    expect(getTasaSugerida(1.05, 870, 'combustion')).toBeCloseTo(0.90, 5)
  })
  it('electrico applies -0.20', () => {
    // score 700 → delta 0; electrico → -0.20; result = 1.05 - 0.20 = 0.85
    expect(getTasaSugerida(1.05, 700, 'electrico')).toBeCloseTo(0.85, 5)
  })
  it('score 800 + hibrido: -0.05 + -0.10 = -0.15', () => {
    expect(getTasaSugerida(1.05, 800, 'hibrido')).toBeCloseTo(0.90, 5)
  })
  it('floor at 0.01', () => {
    expect(getTasaSugerida(0.10, 900, 'electrico')).toBeGreaterThanOrEqual(0.01)
  })
})
```

- [ ] **Step 2: Run — verify FAIL**

Run: `npm --workspace frontend run test`
Expected: FAIL — "Cannot find module '../../data/bancos.js'"

- [ ] **Step 3: Create `frontend/src/data/bancos.js`**

```js
export const BANCOS = [
  { id: "bancolombia",  nombre: "Bancolombia",          tasaMensual: 1.05, categoria: "Grande" },
  { id: "bogota",       nombre: "Banco de Bogotá",       tasaMensual: 1.02, categoria: "Grande" },
  { id: "davivienda",   nombre: "Davivienda",            tasaMensual: 1.08, categoria: "Grande" },
  { id: "bbva",         nombre: "BBVA Colombia",         tasaMensual: 1.12, categoria: "Grande" },
  { id: "scotiabank",   nombre: "Scotiabank Colpatria",  tasaMensual: 1.15, categoria: "Mediano" },
  { id: "occidente",    nombre: "Banco de Occidente",    tasaMensual: 1.08, categoria: "Mediano" },
  { id: "popular",      nombre: "Banco Popular",         tasaMensual: 1.10, categoria: "Mediano" },
  { id: "avvillas",     nombre: "AV Villas",             tasaMensual: 1.18, categoria: "Mediano" },
  { id: "itau",         nombre: "Itaú Colombia",         tasaMensual: 1.12, categoria: "Otro" },
  { id: "cajasocial",   nombre: "Banco Caja Social",     tasaMensual: 1.20, categoria: "Otro" },
  { id: "gnb",          nombre: "GNB Sudameris",         tasaMensual: 1.14, categoria: "Otro" },
  { id: "finandina",    nombre: "Banco Finandina",       tasaMensual: 1.28, categoria: "Especialista vehículos" },
  { id: "serfinansa",   nombre: "Serfinansa",            tasaMensual: 1.35, categoria: "Especialista vehículos" },
  { id: "otro",         nombre: "Otro banco",            tasaMensual: null, categoria: "Libre" },
]

export const DELTA_SCORE = [
  { min: 850, max: 1000, delta: -0.15 },
  { min: 750, max:  849, delta: -0.05 },
  { min: 650, max:  749, delta:  0    },
  { min: 500, max:  649, delta:  0.20 },
  { min:   0, max:  499, delta:  0.40 },
]

export const DELTA_TIPO = { electrico: -0.20, hibrido: -0.10, combustion: 0 }

export function getBancoById(id) {
  return BANCOS.find(b => b.id === id)
}

export function getTasaSugerida(tasaBase, puntaje, tipoVehiculo) {
  const band = DELTA_SCORE.find(b => puntaje >= b.min && puntaje <= b.max)
  const deltaScore = band ? band.delta : 0.40
  const deltaTipo = DELTA_TIPO[tipoVehiculo] ?? 0
  return Math.max(0.01, tasaBase + deltaScore + deltaTipo)
}
```

- [ ] **Step 4: Run — verify PASS**

Run: `npm --workspace frontend run test`
Expected: 8 tests passing.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/data/ frontend/src/__tests__/data/
git commit -m "feat: add 13 bancos CO data with credit score and vehicle type rate adjustments"
```

---

### Task 5: format.js utilities

**Files:**
- Create: `frontend/src/utils/format.js`
- Create: `frontend/src/__tests__/utils/format.test.js`

- [ ] **Step 1: Write failing tests**

```js
// frontend/src/__tests__/utils/format.test.js
import { describe, it, expect } from 'vitest'
import { fmtCOP, fmtPct, fmtMonthYear, fmtMeses } from '../../utils/format.js'

describe('fmtCOP', () => {
  it('formats 1_234_567 with thousands dot separator', () => {
    expect(fmtCOP(1_234_567)).toContain('1.234.567')
  })
  it('includes peso sign', () => {
    expect(fmtCOP(100_000)).toMatch(/\$/)
  })
})

describe('fmtPct', () => {
  it('formats 1.05 as "1,05%"', () => {
    expect(fmtPct(1.05)).toBe('1,05%')
  })
  it('formats 0.20 as "0,20%"', () => {
    expect(fmtPct(0.20)).toBe('0,20%')
  })
})

describe('fmtMonthYear', () => {
  it('formats January 2025', () => {
    expect(fmtMonthYear({ mes: 0, anio: 2025 })).toBe('ene. 2025')
  })
  it('formats December 2029', () => {
    expect(fmtMonthYear({ mes: 11, anio: 2029 })).toBe('dic. 2029')
  })
  it('formats June 2026', () => {
    expect(fmtMonthYear({ mes: 5, anio: 2026 })).toBe('jun. 2026')
  })
})

describe('fmtMeses', () => {
  it('1 → "1 mes"', () => { expect(fmtMeses(1)).toBe('1 mes') })
  it('6 → "6 meses"', () => { expect(fmtMeses(6)).toBe('6 meses') })
  it('12 → "1 año"', () => { expect(fmtMeses(12)).toBe('1 año') })
  it('24 → "2 años"', () => { expect(fmtMeses(24)).toBe('2 años') })
  it('14 → "1 año y 2 meses"', () => { expect(fmtMeses(14)).toBe('1 año y 2 meses') })
})
```

- [ ] **Step 2: Run — verify FAIL**

Run: `npm --workspace frontend run test`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/utils/format.js`**

```js
const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]

export function fmtCOP(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

export function fmtPct(valor) {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor) + "%"
}

export function fmtMonthYear({ mes, anio }) {
  return `${MESES[mes]}. ${anio}`
}

export function fmtMeses(n) {
  if (n === 1) return "1 mes"
  if (n < 12) return `${n} meses`
  const y = Math.floor(n / 12)
  const m = n % 12
  const ys = y === 1 ? "1 año" : `${y} años`
  if (m === 0) return ys
  return `${ys} y ${m} ${m === 1 ? "mes" : "meses"}`
}
```

- [ ] **Step 4: Run — verify PASS**

Run: `npm --workspace frontend run test`
Expected: all format tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/ frontend/src/__tests__/utils/
git commit -m "feat: add es-CO format utilities (COP, %, month/year, months)"
```

---

### Task 6: Vehicular amortization engine

**Files:**
- Create: `frontend/src/engine/vehicular.js`
- Create: `frontend/src/__tests__/engine/vehicular.test.js`

- [ ] **Step 1: Write failing tests**

```js
// frontend/src/__tests__/engine/vehicular.test.js
import { describe, it, expect } from 'vitest'
import { calcularVehicular } from '../../engine/vehicular.js'

const BASE = {
  vehiculo: { nombre: "Tesla Model Y", valor: 120_990_000, tipo: "electrico" },
  reserva: 1_000_000,
  matricula: 2_635_000,
  puntajeCredito: 780,
  banco: "bogota",
  tasaMensual: 1.02,
  plazo: 60,
  mesInicio: { mes: 0, anio: 2025 },
  seguros: { vidaTasa: 0.04, todoRiesgoMensual: 150_000, adminMensual: 0 },
  abonos: [],
}

describe('sin abonos', () => {
  it('schedule has exactly 60 entries', () => {
    expect(calcularVehicular(BASE).schedule).toHaveLength(60)
  })
  it('last entry saldo ≤ 0.5', () => {
    const r = calcularVehicular(BASE)
    expect(r.schedule.at(-1).saldo).toBeLessThanOrEqual(0.5)
  })
  it('cuotaFinanciera matches French formula for capital=119_990_000', () => {
    const r = calcularVehicular(BASE)
    const tasa = 1.02 / 100
    const n = 60
    const cap = 119_990_000
    const expected = cap * (tasa * Math.pow(1 + tasa, n)) / (Math.pow(1 + tasa, n) - 1)
    expect(r.cuotaFinanciera).toBeCloseTo(expected, 0)
  })
  it('fechaFin is December 2029 (60 months from Jan 2025)', () => {
    expect(calcularVehicular(BASE).fechaFin).toEqual({ mes: 11, anio: 2029 })
  })
  it('plazoEfectivo = 60 with no payments', () => {
    expect(calcularVehicular(BASE).plazoEfectivo).toBe(60)
  })
  it('totalIntereses is positive and < capital', () => {
    const r = calcularVehicular(BASE)
    expect(r.totalIntereses).toBeGreaterThan(0)
    expect(r.totalIntereses).toBeLessThan(119_990_000)
  })
  it('totalAbonos = 0 and interesesAhorrados = 0', () => {
    const r = calcularVehicular(BASE)
    expect(r.totalAbonos).toBe(0)
    expect(r.interesesAhorrados).toBe(0)
  })
  it('saldo decreases every month', () => {
    const { schedule } = calcularVehicular(BASE)
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].saldo).toBeLessThan(schedule[i - 1].saldo)
    }
  })
  it('seguroVida in month 1 = capital * vidaTasa/100', () => {
    const r = calcularVehicular(BASE)
    expect(r.schedule[0].seguroVida).toBeCloseTo(119_990_000 * 0.04 / 100, 0)
  })
})

describe('con abono único', () => {
  const params = {
    ...BASE,
    abonos: [{ id: "a1", tipo: "unico", mes: 5, anio: 2025, monto: 10_000_000, label: "Bono" }],
  }
  it('plazoEfectivo < 60', () => {
    expect(calcularVehicular(params).plazoEfectivo).toBeLessThan(60)
  })
  it('totalAbonos = 10_000_000', () => {
    expect(calcularVehicular(params).totalAbonos).toBe(10_000_000)
  })
  it('interesesAhorrados and mesesAhorrados > 0', () => {
    const r = calcularVehicular(params)
    expect(r.interesesAhorrados).toBeGreaterThan(0)
    expect(r.mesesAhorrados).toBeGreaterThan(0)
  })
})

describe('con abono semestral', () => {
  const params = {
    ...BASE,
    plazo: 48,
    abonos: [{ id: "a2", tipo: "semestral", meses: [5, 11], monto: 2_000_000, label: "Semestral" }],
  }
  it('June entries have abono = 2_000_000', () => {
    calcularVehicular(params).schedule
      .filter(e => e.mes === 5)
      .forEach(e => expect(e.abono).toBe(2_000_000))
  })
  it('plazoEfectivo < 48', () => {
    expect(calcularVehicular(params).plazoEfectivo).toBeLessThan(48)
  })
})
```

- [ ] **Step 2: Run — verify FAIL**

Run: `npm --workspace frontend run test`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `frontend/src/engine/vehicular.js`**

```js
function nextMonth(mes, anio) {
  return mes === 11 ? { mes: 0, anio: anio + 1 } : { mes: mes + 1, anio }
}

function esAbonoEsteMes(abono, mes, anio) {
  if (abono.tipo === "semestral") return abono.meses.includes(mes)
  if (abono.tipo === "unico") return abono.mes === mes && abono.anio === anio
  return false
}

function calcularBaseline(capital, tasa, cuotaFinanciera) {
  let saldo = capital
  let totalIntereses = 0
  let n = 0
  while (saldo > 0.5 && n < 360) {
    const interes = saldo * tasa
    saldo -= Math.min(cuotaFinanciera - interes, saldo)
    totalIntereses += interes
    n++
  }
  return { totalIntereses, plazo: n }
}

export function calcularVehicular(params) {
  const { vehiculo, reserva, tasaMensual, plazo, mesInicio, seguros, abonos } = params
  const capital = vehiculo.valor - reserva
  const tasa = tasaMensual / 100

  const cuotaFinanciera =
    capital * (tasa * Math.pow(1 + tasa, plazo)) / (Math.pow(1 + tasa, plazo) - 1)

  let saldo = capital
  let mes = mesInicio.mes
  let anio = mesInicio.anio
  let numCuota = 1
  const schedule = []
  let totalIntereses = 0
  let totalAbonos = 0
  let totalSeguros = 0

  while (saldo > 0.5 && numCuota <= 360) {
    const interes = saldo * tasa
    const capitalPagado = Math.min(cuotaFinanciera - interes, saldo)
    const seguroVida = saldo * (seguros.vidaTasa / 100)
    const cuotaTotal =
      cuotaFinanciera + seguroVida + seguros.todoRiesgoMensual + seguros.adminMensual

    totalIntereses += interes
    totalSeguros += seguroVida + seguros.todoRiesgoMensual + seguros.adminMensual
    saldo = Math.max(0, saldo - capitalPagado)

    let abonoTotal = 0
    let abonoLabel = ""
    for (const ab of abonos) {
      if (esAbonoEsteMes(ab, mes, anio)) {
        abonoTotal += ab.monto
        abonoLabel = abonoLabel ? `${abonoLabel}, ${ab.label}` : ab.label
      }
    }
    if (abonoTotal > 0) {
      saldo = Math.max(0, saldo - abonoTotal)
      totalAbonos += abonoTotal
    }

    schedule.push({
      mes, anio, num: numCuota,
      cuotaFinanciera, interes, capital: capitalPagado,
      seguroVida, seguroTodoRiesgo: seguros.todoRiesgoMensual, adminFee: seguros.adminMensual,
      cuotaTotal, abono: abonoTotal, abonoLabel, saldo,
    })

    if (saldo <= 0.5) break
    numCuota++
    ;({ mes, anio } = nextMonth(mes, anio))
  }

  const last = schedule.at(-1)
  const baseline = calcularBaseline(capital, tasa, cuotaFinanciera)

  return {
    cuotaFinanciera,
    cuotaTotalMensual: schedule[0]?.cuotaTotal ?? 0,
    plazoEfectivo: schedule.length,
    fechaFin: { mes: last.mes, anio: last.anio },
    totalIntereses,
    totalAbonos,
    totalSeguros,
    interesesAhorrados: Math.max(0, baseline.totalIntereses - totalIntereses),
    mesesAhorrados: Math.max(0, baseline.plazo - schedule.length),
    schedule,
  }
}
```

- [ ] **Step 4: Run — verify all PASS**

Run: `npm --workspace frontend run test`
Expected: all tests green (≥14 passing).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/engine/ frontend/src/__tests__/engine/
git commit -m "feat: vehicular amortization engine with extraordinary payments and KPIs"
```

---

*End of Chunk 1*

---

## Chunk 2: State + UI Foundation

### Task 7: useSimulaciones hook

**Files:**
- Create: `frontend/src/hooks/useSimulaciones.js`
- Create: `frontend/src/__tests__/hooks/useSimulaciones.test.js`

State shape:
```js
{
  tipoActivo: "vehicular",          // "vehicular"|"hipotecario"|"consumo"|"tarjeta"
  modoComparacion: false,
  simulaciones: [Simulacion, null], // slot 0 = principal, slot 1 = comparación
  results: [Results|null, Results|null],
  chatHistory: [],                  // max 50, FIFO
}
```

Actions: `SET_TIPO`, `SET_PARAMS` (slot, params), `SET_RESULTS` (slot, results), `TOGGLE_COMPARACION`, `APPLY_AI_CONFIG` (slot, params), `ADD_CHAT_MSG`, `RESET`.

- [ ] **Step 1: Write failing tests**

```js
// frontend/src/__tests__/hooks/useSimulaciones.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSimulaciones } from '../../hooks/useSimulaciones.js'

beforeEach(() => localStorage.clear())

const SAMPLE_PARAMS = {
  vehiculo: { nombre: "X", valor: 100_000_000, tipo: "combustion" },
  reserva: 0, matricula: 0, puntajeCredito: 700,
  banco: "bancolombia", tasaMensual: 1.05, plazo: 48,
  mesInicio: { mes: 0, anio: 2025 },
  seguros: { vidaTasa: 0.04, todoRiesgoMensual: 0, adminMensual: 0 },
  abonos: [],
}

describe('useSimulaciones', () => {
  it('initializes with vehicular as active type', () => {
    const { result } = renderHook(() => useSimulaciones())
    expect(result.current.state.tipoActivo).toBe('vehicular')
  })

  it('SET_TIPO changes tipoActivo', () => {
    const { result } = renderHook(() => useSimulaciones())
    act(() => result.current.dispatch({ type: 'SET_TIPO', payload: 'consumo' }))
    expect(result.current.state.tipoActivo).toBe('consumo')
  })

  it('SET_PARAMS stores params in slot 0', () => {
    const { result } = renderHook(() => useSimulaciones())
    act(() => result.current.dispatch({ type: 'SET_PARAMS', slot: 0, payload: SAMPLE_PARAMS }))
    expect(result.current.state.simulaciones[0].params).toEqual(SAMPLE_PARAMS)
  })

  it('TOGGLE_COMPARACION flips modoComparacion', () => {
    const { result } = renderHook(() => useSimulaciones())
    act(() => result.current.dispatch({ type: 'TOGGLE_COMPARACION' }))
    expect(result.current.state.modoComparacion).toBe(true)
  })

  it('ADD_CHAT_MSG caps history at 50 (FIFO)', () => {
    const { result } = renderHook(() => useSimulaciones())
    act(() => {
      for (let i = 0; i < 55; i++) {
        result.current.dispatch({ type: 'ADD_CHAT_MSG', payload: { role: 'user', content: `msg ${i}` } })
      }
    })
    expect(result.current.state.chatHistory).toHaveLength(50)
    expect(result.current.state.chatHistory[0].content).toBe('msg 5')
  })

  it('persists to localStorage on state change', () => {
    const { result } = renderHook(() => useSimulaciones())
    act(() => result.current.dispatch({ type: 'SET_TIPO', payload: 'hipotecario' }))
    const stored = JSON.parse(localStorage.getItem('creditoia_v1'))
    expect(stored.tipoActivo).toBe('hipotecario')
  })

  it('rehydrates from localStorage on mount', () => {
    localStorage.setItem('creditoia_v1', JSON.stringify({ tipoActivo: 'tarjeta', modoComparacion: false, simulaciones: [null, null], results: [null, null], chatHistory: [] }))
    const { result } = renderHook(() => useSimulaciones())
    expect(result.current.state.tipoActivo).toBe('tarjeta')
  })
})
```

- [ ] **Step 2: Run — verify FAIL**

Run: `npm --workspace frontend run test`

- [ ] **Step 3: Create `frontend/src/hooks/useSimulaciones.js`**

```js
import { useReducer, useEffect } from 'react'

const INITIAL = {
  tipoActivo: "vehicular",
  modoComparacion: false,
  simulaciones: [null, null],
  results: [null, null],
  chatHistory: [],
}

function makeSim(tipo, params) {
  return { id: crypto.randomUUID(), tipo, nombre: params.nombre ?? "", params, creadoEn: Date.now() }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TIPO':
      return { ...state, tipoActivo: action.payload }
    case 'SET_PARAMS': {
      const sims = [...state.simulaciones]
      sims[action.slot] = makeSim(state.tipoActivo, action.payload)
      return { ...state, simulaciones: sims }
    }
    case 'SET_RESULTS': {
      const results = [...state.results]
      results[action.slot] = action.payload
      return { ...state, results }
    }
    case 'TOGGLE_COMPARACION':
      return { ...state, modoComparacion: !state.modoComparacion }
    case 'APPLY_AI_CONFIG': {
      const sims = [...state.simulaciones]
      sims[action.slot] = makeSim(state.tipoActivo, action.payload)
      return { ...state, simulaciones: sims }
    }
    case 'ADD_CHAT_MSG': {
      const history = [...state.chatHistory, action.payload]
      return { ...state, chatHistory: history.length > 50 ? history.slice(-50) : history }
    }
    case 'RESET': {
      const sims = [...state.simulaciones]
      const results = [...state.results]
      sims[action.slot] = null
      results[action.slot] = null
      return { ...state, simulaciones: sims, results }
    }
    default: return state
  }
}

function load() {
  try {
    const raw = localStorage.getItem('creditoia_v1')
    return raw ? { ...INITIAL, ...JSON.parse(raw) } : INITIAL
  } catch { return INITIAL }
}

export function useSimulaciones() {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    localStorage.setItem('creditoia_v1', JSON.stringify(state))
  }, [state])

  return { state, dispatch }
}
```

- [ ] **Step 4: Run — verify PASS**

Run: `npm --workspace frontend run test`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useSimulaciones.js frontend/src/__tests__/hooks/
git commit -m "feat: useSimulaciones reducer with localStorage persistence and 50-msg FIFO chat"
```

---

### Task 8: App shell layout

**Files:**
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/components/TopBar/TopBar.jsx`
- Create: `frontend/src/components/TopBar/TopBar.module.css`
- Create: `frontend/src/components/Sidebar/Sidebar.jsx`
- Create: `frontend/src/components/Sidebar/Sidebar.module.css`

- [ ] **Step 1: Replace App.jsx with full layout shell**

```jsx
// frontend/src/App.jsx
import { createContext, useContext } from 'react'
import { useSimulaciones } from './hooks/useSimulaciones.js'
import TopBar from './components/TopBar/TopBar.jsx'
import Sidebar from './components/Sidebar/Sidebar.jsx'
import SimuladorPanel from './components/panels/SimuladorPanel.jsx'
import CompareView from './components/CompareView.jsx'
import AIInsightPanel from './components/AIInsightPanel.jsx'
import styles from './App.module.css'

export const AppCtx = createContext(null)

export default function App() {
  const { state, dispatch } = useSimulaciones()
  return (
    <AppCtx.Provider value={{ state, dispatch }}>
      <TopBar />
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.main}>
          {state.modoComparacion
            ? <CompareView />
            : <SimuladorPanel slot={0} />}
        </main>
        <AIInsightPanel />
      </div>
    </AppCtx.Provider>
  )
}
```

- [ ] **Step 2: Create `frontend/src/App.module.css`**

```css
.body {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 48px);
}
.main {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  gap: 14px;
}
```

- [ ] **Step 3: Create `TopBar.jsx`**

Props: reads `state.tipoActivo` and `state.modoComparacion` from context. Buttons: 4 credit type tabs (Vehicular active in Phase 1, others disabled), Comparar toggle, PDF button, Excel button.

```jsx
// frontend/src/components/TopBar/TopBar.jsx
import { useContext } from 'react'
import { AppCtx } from '../../App.jsx'
import styles from './TopBar.module.css'

const TIPOS = [
  { id: "vehicular", label: "🚗 Vehicular", enabled: true },
  { id: "hipotecario", label: "🏠 Hipotecario", enabled: false },
  { id: "consumo", label: "💳 Consumo", enabled: false },
  { id: "tarjeta", label: "💰 Tarjeta", enabled: false },
]

export default function TopBar() {
  const { state, dispatch } = useContext(AppCtx)
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>CréditoIA</div>
      <nav className={styles.tabs}>
        {TIPOS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${state.tipoActivo === t.id ? styles.active : ''}`}
            disabled={!t.enabled}
            onClick={() => dispatch({ type: 'SET_TIPO', payload: t.id })}
          >{t.label}</button>
        ))}
      </nav>
      <div className={styles.actions}>
        <button
          className={`${styles.btn} ${state.modoComparacion ? styles.btnActive : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_COMPARACION' })}
        >⊞ Comparar</button>
        <button className={styles.btn} id="btn-pdf">⬇ PDF</button>
        <button className={styles.btn} id="btn-excel">⬇ Excel</button>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Create `TopBar.module.css`**

```css
.bar {
  height: 48px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  flex-shrink: 0;
}
.brand {
  background: var(--accent);
  color: #000;
  font-weight: 700;
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 5px;
  white-space: nowrap;
}
.tabs { display: flex; gap: 4px; flex: 1; }
.tab {
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--muted);
  padding: 4px 10px;
  font-size: 12px;
  transition: color 0.15s;
}
.tab:hover:not(:disabled) { color: var(--text); border-color: var(--border); }
.tab.active { color: var(--accent); border-color: var(--accent-muted); background: var(--accent-muted); }
.tab:disabled { opacity: 0.4; cursor: not-allowed; }
.actions { display: flex; gap: 6px; }
.btn {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--muted);
  padding: 4px 10px;
  font-size: 12px;
}
.btn:hover { color: var(--text); }
.btnActive { border-color: var(--green); color: var(--green); }
```

- [ ] **Step 5: Create Sidebar shell**

```jsx
// frontend/src/components/Sidebar/Sidebar.jsx
import { useState, useContext } from 'react'
import { AppCtx } from '../../App.jsx'
import ModeToggle from './ModeToggle.jsx'
import VehicularForm from './forms/VehicularForm.jsx'
import AIChat from '../AIInsightPanel.jsx' // placeholder until Task 23
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const [mode, setMode] = useState('params') // 'params' | 'chat'
  const { state } = useContext(AppCtx)
  return (
    <aside className={styles.sidebar}>
      <ModeToggle mode={mode} onChange={setMode} />
      {mode === 'params'
        ? state.tipoActivo === 'vehicular' && <VehicularForm slot={0} />
        : <div className={styles.chatPlaceholder}>Chat IA — Tarea 23</div>
      }
    </aside>
  )
}
```

- [ ] **Step 6: Create `Sidebar.module.css`**

```css
.sidebar {
  width: var(--sidebar-w);
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
}
.chatPlaceholder {
  padding: 16px;
  color: var(--muted);
  font-size: 12px;
}
```

- [ ] **Step 7: Create ModeToggle.jsx**

```jsx
// frontend/src/components/Sidebar/ModeToggle.jsx
import styles from './ModeToggle.module.css'

export default function ModeToggle({ mode, onChange }) {
  return (
    <div className={styles.toggle}>
      <button className={mode === 'params' ? styles.active : ''} onClick={() => onChange('params')}>
        ⚙ Parámetros
      </button>
      <button className={mode === 'chat' ? styles.active : ''} onClick={() => onChange('chat')}>
        🤖 Chat IA
      </button>
    </div>
  )
}
```

```css
/* ModeToggle.module.css */
.toggle {
  display: flex;
  background: var(--bg);
  margin: 10px;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}
.toggle button {
  flex: 1;
  background: none;
  border: none;
  color: var(--muted);
  padding: 5px 0;
  font-size: 11px;
  border-radius: 5px;
}
.toggle button.active {
  background: var(--accent);
  color: #000;
  font-weight: 600;
}
```

- [ ] **Step 8: Verify app renders without errors**

Run: `npm run dev:frontend`
Open http://localhost:5173 — should see TopBar with CréditoIA badge and 4 tabs.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/App.jsx frontend/src/App.module.css frontend/src/components/TopBar/ frontend/src/components/Sidebar/
git commit -m "feat: App shell with TopBar, Sidebar, and mode toggle"
```

---

### Task 9: VehicularForm

**Files:**
- Create: `frontend/src/components/Sidebar/forms/VehicularForm.jsx`
- Create: `frontend/src/components/Sidebar/forms/VehicularForm.module.css`

The form manages local state for all fields, computes `tasaSugerida` reactively, dispatches `SET_PARAMS` + `SET_RESULTS` on "Calcular".

- [ ] **Step 1: Create `VehicularForm.jsx`**

```jsx
// frontend/src/components/Sidebar/forms/VehicularForm.jsx
import { useState, useContext, useId } from 'react'
import { AppCtx } from '../../../App.jsx'
import { BANCOS, getTasaSugerida } from '../../../data/bancos.js'
import { calcularVehicular } from '../../../engine/vehicular.js'
import styles from './VehicularForm.module.css'

const MESES_NOMBRES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
const CURRENT_YEAR = new Date().getFullYear()

const DEFAULT = {
  nombre: "",
  vehiculo: { nombre: "", valor: 120_990_000, tipo: "electrico" },
  reserva: 1_000_000,
  matricula: 2_635_000,
  puntajeCredito: 780,
  banco: "bogota",
  tasaMensual: "",
  plazo: 60,
  mesInicio: { mes: 0, anio: CURRENT_YEAR },
  seguros: { vidaTasa: 0.04, todoRiesgoMensual: 150_000, adminMensual: 0 },
  abonos: [],
}

export default function VehicularForm({ slot }) {
  const { dispatch } = useContext(AppCtx)
  const [f, setF] = useState(DEFAULT)
  const uid = useId()

  const banco = BANCOS.find(b => b.id === f.banco)
  const tasaSugerida = banco?.tasaMensual
    ? getTasaSugerida(banco.tasaMensual, f.puntajeCredito, f.vehiculo.tipo)
    : null
  const tasaFinal = f.tasaMensual !== "" ? parseFloat(f.tasaMensual) : tasaSugerida ?? 1.05

  function set(path, val) {
    setF(prev => {
      const next = { ...prev }
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] }
        obj = obj[keys[i]]
      }
      obj[keys.at(-1)] = val
      return next
    })
  }

  function addAbono() {
    setF(prev => ({
      ...prev,
      abonos: [...prev.abonos, {
        id: crypto.randomUUID(), tipo: "unico",
        mes: 5, anio: CURRENT_YEAR, monto: 1_000_000, label: "Abono"
      }]
    }))
  }

  function removeAbono(id) {
    setF(prev => ({ ...prev, abonos: prev.abonos.filter(a => a.id !== id) }))
  }

  function calcular() {
    const params = { ...f, tasaMensual: tasaFinal }
    const results = calcularVehicular(params)
    dispatch({ type: 'SET_PARAMS', slot, payload: params })
    dispatch({ type: 'SET_RESULTS', slot, payload: results })
  }

  return (
    <form className={styles.form} onSubmit={e => { e.preventDefault(); calcular() }}>
      <p className="disclaimer">⚠ Valores estimados. Condiciones reales dependen del historial crediticio y aprobación del banco.</p>

      <section>
        <label className="label">Cliente</label>
        <input placeholder="Nombre del cliente" value={f.nombre} onChange={e => set('nombre', e.target.value)} />
      </section>

      <section>
        <label className="label">Vehículo</label>
        <input placeholder="Nombre / modelo" value={f.vehiculo.nombre} onChange={e => set('vehiculo.nombre', e.target.value)} />
        <input type="number" placeholder="Valor ($)" value={f.vehiculo.valor} onChange={e => set('vehiculo.valor', +e.target.value)} />
        <div className={styles.radioGroup}>
          {["electrico","hibrido","combustion"].map(t => (
            <label key={t}>
              <input type="radio" name={`${uid}-tipo`} value={t} checked={f.vehiculo.tipo === t} onChange={() => set('vehiculo.tipo', t)} />
              {t === "electrico" ? "Eléctrico" : t === "hibrido" ? "Híbrido" : "Combustión"}
            </label>
          ))}
        </div>
      </section>

      <section>
        <label className="label">Financiación</label>
        <input type="number" placeholder="Reserva/Enganche ($)" value={f.reserva} onChange={e => set('reserva', +e.target.value)} />
        <input type="number" placeholder="Matrícula estimada ($, informativo)" value={f.matricula} onChange={e => set('matricula', +e.target.value)} />
        <div className={styles.capitalDisplay}>
          Capital: ${(f.vehiculo.valor - f.reserva).toLocaleString("es-CO")}
        </div>
      </section>

      <section>
        <label className="label">Banco</label>
        <select value={f.banco} onChange={e => { set('banco', e.target.value); set('tasaMensual', '') }}>
          {BANCOS.map(b => <option key={b.id} value={b.id}>{b.nombre}{b.tasaMensual ? ` — ${b.tasaMensual}%` : ''}</option>)}
        </select>
      </section>

      <section>
        <label className="label">
          Tasa mensual (%)
          {tasaSugerida && <span className={styles.hint}> sugerida: {tasaSugerida.toFixed(2)}%</span>}
        </label>
        <input
          type="number" step="0.01" min="0.01"
          placeholder={tasaSugerida?.toFixed(2) ?? "1.05"}
          value={f.tasaMensual}
          onChange={e => set('tasaMensual', e.target.value)}
        />
      </section>

      <section>
        <label className="label">Plazo (meses)</label>
        <input type="number" min="12" max="120" value={f.plazo} onChange={e => set('plazo', +e.target.value)} />
      </section>

      <section>
        <label className="label">Puntaje Datacrédito (0–1000)</label>
        <input type="number" min="0" max="1000" value={f.puntajeCredito} onChange={e => set('puntajeCredito', +e.target.value)} />
      </section>

      <section>
        <label className="label">Inicio del crédito</label>
        <div className={styles.row}>
          <select value={f.mesInicio.mes} onChange={e => set('mesInicio.mes', +e.target.value)}>
            {MESES_NOMBRES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <input type="number" min="2024" max="2040" value={f.mesInicio.anio} onChange={e => set('mesInicio.anio', +e.target.value)} />
        </div>
      </section>

      <section>
        <label className="label">Seguros del banco</label>
        <input type="number" step="0.001" placeholder="Seg. vida deudor (% saldo)" value={f.seguros.vidaTasa} onChange={e => set('seguros.vidaTasa', +e.target.value)} />
        <input type="number" placeholder="Todo riesgo mensual ($)" value={f.seguros.todoRiesgoMensual} onChange={e => set('seguros.todoRiesgoMensual', +e.target.value)} />
        <input type="number" placeholder="Cuota administración ($)" value={f.seguros.adminMensual} onChange={e => set('seguros.adminMensual', +e.target.value)} />
      </section>

      <section>
        <div className={styles.sectionHeader}>
          <label className="label">Abonos extraordinarios</label>
          <button type="button" className={styles.addBtn} onClick={addAbono}>+ Añadir</button>
        </div>
        {f.abonos.map(ab => (
          <div key={ab.id} className={styles.abono}>
            <input placeholder="Etiqueta" value={ab.label} onChange={e => setF(p => ({ ...p, abonos: p.abonos.map(a => a.id === ab.id ? { ...a, label: e.target.value } : a) }))} />
            <input type="number" placeholder="Monto ($)" value={ab.monto} onChange={e => setF(p => ({ ...p, abonos: p.abonos.map(a => a.id === ab.id ? { ...a, monto: +e.target.value } : a) }))} />
            <select value={ab.tipo} onChange={e => setF(p => ({ ...p, abonos: p.abonos.map(a => a.id === ab.id ? { ...a, tipo: e.target.value } : a) }))}>
              <option value="unico">Único</option>
              <option value="semestral">Semestral (jun/dic)</option>
            </select>
            {ab.tipo === "unico" && (
              <div className={styles.row}>
                <select value={ab.mes} onChange={e => setF(p => ({ ...p, abonos: p.abonos.map(a => a.id === ab.id ? { ...a, mes: +e.target.value } : a) }))}>
                  {MESES_NOMBRES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <input type="number" value={ab.anio} onChange={e => setF(p => ({ ...p, abonos: p.abonos.map(a => a.id === ab.id ? { ...a, anio: +e.target.value } : a) }))} />
              </div>
            )}
            <button type="button" className={styles.removeBtn} onClick={() => removeAbono(ab.id)}>×</button>
          </div>
        ))}
      </section>

      <button type="submit" className={styles.calcBtn}>Calcular</button>
    </form>
  )
}
```

- [ ] **Step 2: Create `VehicularForm.module.css`**

```css
.form { display: flex; flex-direction: column; gap: 14px; padding: 12px; }
.form section { display: flex; flex-direction: column; gap: 6px; }
.radioGroup { display: flex; gap: 10px; font-size: 12px; }
.radioGroup label { display: flex; align-items: center; gap: 4px; cursor: pointer; color: var(--muted); }
.row { display: flex; gap: 6px; }
.row input, .row select { flex: 1; }
.capitalDisplay { font-size: 11px; color: var(--accent); padding: 4px 0; }
.hint { font-weight: 400; color: var(--blue); text-transform: none; }
.sectionHeader { display: flex; justify-content: space-between; align-items: center; }
.addBtn { background: none; border: 1px dashed var(--border); border-radius: var(--radius-sm); color: var(--blue); padding: 2px 8px; font-size: 11px; }
.abono { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px; display: flex; flex-direction: column; gap: 4px; position: relative; }
.removeBtn { position: absolute; top: 6px; right: 6px; background: none; border: none; color: var(--red); font-size: 14px; line-height: 1; }
.calcBtn { background: var(--accent); color: #000; border: none; border-radius: var(--radius); padding: 10px; font-weight: 700; font-size: 14px; margin-top: 4px; }
.calcBtn:hover { opacity: 0.9; }
```

- [ ] **Step 3: Verify in browser**

Fill in form, click Calcular — no console errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Sidebar/forms/
git commit -m "feat: VehicularForm with all fields, abonos list, and reactive rate suggestion"
```

---

### Task 10: KPIGrid + CuotaDesglose + SimuladorPanel

**Files:**
- Create: `frontend/src/components/panels/KPIGrid.jsx` + `.module.css`
- Create: `frontend/src/components/panels/CuotaDesglose.jsx`
- Create: `frontend/src/components/panels/SimuladorPanel.jsx` + `.module.css`

- [ ] **Step 1: Create `KPIGrid.jsx`**

Receives `results: Results` and `params: ParamsVehicular`. Renders 10 KPI cards in a 2-column grid.

```jsx
// frontend/src/components/panels/KPIGrid.jsx
import { fmtCOP, fmtMeses, fmtMonthYear } from '../../utils/format.js'
import styles from './KPIGrid.module.css'

export default function KPIGrid({ results, params }) {
  if (!results) return null
  const kpis = [
    { label: "Capital financiado", value: fmtCOP(params.vehiculo.valor - params.reserva) },
    { label: "Cuota financiera", value: fmtCOP(results.cuotaFinanciera) },
    { label: "Cuota total (con seguros)", value: fmtCOP(results.cuotaTotalMensual), accent: true },
    { label: "Plazo efectivo", value: fmtMeses(results.plazoEfectivo) },
    { label: "Finalización", value: fmtMonthYear(results.fechaFin) },
    { label: "Total intereses", value: fmtCOP(results.totalIntereses) },
    { label: "Total abonos", value: fmtCOP(results.totalAbonos) },
    { label: "Intereses ahorrados", value: fmtCOP(results.interesesAhorrados), green: results.interesesAhorrados > 0 },
    { label: "Meses ahorrados", value: fmtMeses(results.mesesAhorrados), green: results.mesesAhorrados > 0 },
    { label: "Matrícula (informativo)", value: fmtCOP(params.matricula), muted: true },
  ]
  return (
    <div className={styles.grid}>
      {kpis.map(k => (
        <div key={k.label} className={styles.card}>
          <div className={styles.label}>{k.label}</div>
          <div className={`${styles.value} ${k.accent ? styles.accent : ''} ${k.green ? styles.green : ''} ${k.muted ? styles.muted : ''}`}>
            {k.value}
          </div>
        </div>
      ))}
    </div>
  )
}
```

```css
/* KPIGrid.module.css */
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.card { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; }
.label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
.value { font-size: 15px; font-weight: 600; color: var(--text); }
.accent { color: var(--accent); }
.green { color: var(--green); }
.muted { color: var(--muted); font-size: 13px; }
```

- [ ] **Step 2: Create `CuotaDesglose.jsx`**

Shows breakdown of first-month payment: financiera + seguro vida + todo riesgo + admin.

```jsx
// frontend/src/components/panels/CuotaDesglose.jsx
import { fmtCOP } from '../../utils/format.js'
import styles from './CuotaDesglose.module.css'

export default function CuotaDesglose({ results }) {
  if (!results?.schedule?.[0]) return null
  const m = results.schedule[0]
  const items = [
    { label: "Cuota financiera", value: m.cuotaFinanciera, color: "var(--blue)" },
    { label: "Seguro de vida deudor", value: m.seguroVida, color: "var(--accent)" },
    { label: "Seguro todo riesgo", value: m.seguroTodoRiesgo, color: "var(--green)" },
    { label: "Cuota administración", value: m.adminFee, color: "var(--muted)" },
  ]
  return (
    <div className={styles.wrap}>
      <div className="label" style={{ marginBottom: 8 }}>Desglose cuota (mes 1)</div>
      {items.map(it => (
        <div key={it.label} className={styles.row}>
          <span className={styles.dot} style={{ background: it.color }} />
          <span className={styles.lbl}>{it.label}</span>
          <span className={styles.val}>{fmtCOP(it.value)}</span>
        </div>
      ))}
      <div className={styles.total}>
        <span>Total mensual</span>
        <span>{fmtCOP(m.cuotaTotal)}</span>
      </div>
    </div>
  )
}
```

```css
/* CuotaDesglose.module.css */
.wrap { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; }
.row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--border); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.lbl { flex: 1; font-size: 12px; color: var(--muted); }
.val { font-size: 13px; font-weight: 600; }
.total { display: flex; justify-content: space-between; padding-top: 8px; font-weight: 700; font-size: 14px; color: var(--accent); }
```

- [ ] **Step 3: Create `SimuladorPanel.jsx`**

Orchestrates: reads `state.results[slot]` and `state.simulaciones[slot]` from context.

```jsx
// frontend/src/components/panels/SimuladorPanel.jsx
import { useContext, lazy, Suspense } from 'react'
import { AppCtx } from '../../App.jsx'
import KPIGrid from './KPIGrid.jsx'
import CuotaDesglose from './CuotaDesglose.jsx'
import AmortizationChart from './AmortizationChart.jsx'
import AmortizationTable from './AmortizationTable.jsx'
import styles from './SimuladorPanel.module.css'

export default function SimuladorPanel({ slot }) {
  const { state } = useContext(AppCtx)
  const results = state.results[slot]
  const sim = state.simulaciones[slot]

  if (!results) {
    return <div className={styles.empty}>Configura los parámetros y presiona <strong>Calcular</strong></div>
  }

  return (
    <div className={styles.panel}>
      {sim?.nombre && <h2 className={styles.clientName}>{sim.nombre}</h2>}
      <KPIGrid results={results} params={sim.params} />
      <CuotaDesglose results={results} />
      <AmortizationChart schedule={results.schedule} />
      <AmortizationTable schedule={results.schedule} />
    </div>
  )
}
```

```css
/* SimuladorPanel.module.css */
.panel { display: flex; flex-direction: column; gap: 16px; width: 100%; }
.clientName { font-size: 16px; font-weight: 600; color: var(--text); }
.empty { color: var(--muted); font-size: 13px; padding: 40px; text-align: center; }
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/panels/
git commit -m "feat: KPIGrid, CuotaDesglose, and SimuladorPanel orchestrator"
```

---

### Task 11: AmortizationChart + AmortizationTable

**Files:**
- Create: `frontend/src/components/panels/AmortizationChart.jsx`
- Create: `frontend/src/components/panels/AmortizationTable.jsx`

- [ ] **Step 1: Create `AmortizationChart.jsx`**

Stacked bar chart (Chart.js): capital vs interest per month, grouped by year.

```jsx
// frontend/src/components/panels/AmortizationChart.jsx
import { useEffect, useRef } from 'react'
import { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { fmtCOP } from '../../utils/format.js'

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend)

export default function AmortizationChart({ schedule }) {
  const ref = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!schedule?.length) return
    if (chartRef.current) chartRef.current.destroy()

    // Aggregate by year
    const byYear = {}
    for (const e of schedule) {
      if (!byYear[e.anio]) byYear[e.anio] = { capital: 0, interes: 0 }
      byYear[e.anio].capital += e.capital
      byYear[e.anio].interes += e.interes
    }
    const labels = Object.keys(byYear)
    const capitals = labels.map(y => byYear[y].capital)
    const intereses = labels.map(y => byYear[y].interes)

    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Capital', data: capitals, backgroundColor: '#58a6ff99', stack: 'a' },
          { label: 'Interés', data: intereses, backgroundColor: '#f8514999', stack: 'a' },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#7d8590', font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtCOP(ctx.raw)}` } },
        },
        scales: {
          x: { stacked: true, ticks: { color: '#7d8590' }, grid: { color: '#30363d' } },
          y: { stacked: true, ticks: { color: '#7d8590', callback: v => `$${(v/1e6).toFixed(0)}M` }, grid: { color: '#30363d' } },
        },
      },
    })
    return () => chartRef.current?.destroy()
  }, [schedule])

  return <canvas ref={ref} style={{ maxHeight: 220 }} />
}
```

- [ ] **Step 2: Create `AmortizationTable.jsx`**

Year-grouped table with expand/collapse. Each year row shows totals; expanded shows monthly detail.

```jsx
// frontend/src/components/panels/AmortizationTable.jsx
import { useState } from 'react'
import { fmtCOP, fmtMonthYear } from '../../utils/format.js'
import styles from './AmortizationTable.module.css'

export default function AmortizationTable({ schedule }) {
  const [open, setOpen] = useState({})
  if (!schedule?.length) return null

  const byYear = []
  for (const e of schedule) {
    let yr = byYear.find(y => y.anio === e.anio)
    if (!yr) { yr = { anio: e.anio, rows: [] }; byYear.push(yr) }
    yr.rows.push(e)
  }

  return (
    <div className={styles.wrap}>
      <div className="label" style={{ marginBottom: 8 }}>Tabla de amortización</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Período</th><th>Cuota total</th><th>Capital</th><th>Interés</th><th>Seg. vida</th><th>Abono</th><th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {byYear.map(yr => (
              <>
                <tr key={yr.anio} className={styles.yearRow} onClick={() => setOpen(o => ({ ...o, [yr.anio]: !o[yr.anio] }))}>
                  <td colSpan={7}>
                    <span className={styles.chevron}>{open[yr.anio] ? '▼' : '▶'}</span>
                    {yr.anio} — {yr.rows.length} cuotas
                  </td>
                </tr>
                {open[yr.anio] && yr.rows.map(e => (
                  <tr key={e.num} className={styles.monthRow}>
                    <td>{fmtMonthYear(e)}</td>
                    <td>{fmtCOP(e.cuotaTotal)}</td>
                    <td>{fmtCOP(e.capital)}</td>
                    <td>{fmtCOP(e.interes)}</td>
                    <td>{fmtCOP(e.seguroVida)}</td>
                    <td>{e.abono > 0 ? fmtCOP(e.abono) : '—'}</td>
                    <td>{fmtCOP(e.saldo)}</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

```css
/* AmortizationTable.module.css */
.wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; }
.tableWrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 12px; }
.table th { color: var(--muted); padding: 6px 8px; text-align: right; border-bottom: 1px solid var(--border); white-space: nowrap; }
.table th:first-child { text-align: left; }
.table td { padding: 5px 8px; text-align: right; border-bottom: 1px solid #21262d; }
.table td:first-child { text-align: left; }
.yearRow { background: var(--surface-2); cursor: pointer; font-weight: 600; }
.yearRow:hover { background: #1c2330; }
.chevron { margin-right: 6px; font-size: 10px; color: var(--muted); }
.monthRow td { color: var(--muted); }
```

- [ ] **Step 3: Verify full simulation flow in browser**

Fill VehicularForm → Calcular → should see KPIGrid, CuotaDesglose, chart, and table.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/panels/AmortizationChart.jsx frontend/src/components/panels/AmortizationTable.jsx frontend/src/components/panels/AmortizationTable.module.css
git commit -m "feat: amortization chart (Chart.js stacked bar) and year-grouped table"
```

*End of Chunk 2*

---

## Chunk 3: Compare View + Export

### Task 12: CompareView + CompareSummaryBar

**Files:**
- Create: `frontend/src/components/CompareView.jsx`
- Create: `frontend/src/components/CompareView.module.css`
- Create: `frontend/src/components/CompareSummaryBar.jsx`
- Create: `frontend/src/components/CompareSummaryBar.module.css`

- [ ] **Step 1: Create `CompareView.jsx`**

When `modoComparacion` is true, renders two `SimuladorPanel` side by side. Slot 1 is a second simulation with its own form (VehicularForm with slot=1).

```jsx
// frontend/src/components/CompareView.jsx
import SimuladorPanel from './panels/SimuladorPanel.jsx'
import CompareSummaryBar from './CompareSummaryBar.jsx'
import styles from './CompareView.module.css'

export default function CompareView() {
  return (
    <div className={styles.wrap}>
      <div className={styles.panels}>
        <SimuladorPanel slot={0} />
        <SimuladorPanel slot={1} />
      </div>
      <CompareSummaryBar />
    </div>
  )
}
```

```css
/* CompareView.module.css */
.wrap { display: flex; flex-direction: column; gap: 12px; width: 100%; }
.panels { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
```

Note: In compare mode, the Sidebar shows two stacked forms (slot 0 and slot 1). Update `Sidebar.jsx` to render `<VehicularForm slot={0} />` and `<VehicularForm slot={1} />` when `modoComparacion` is true.

- [ ] **Step 2: Update `Sidebar.jsx` for compare mode**

```jsx
// In Sidebar.jsx, replace the params section:
{mode === 'params' && (
  <>
    {state.tipoActivo === 'vehicular' && <VehicularForm slot={0} />}
    {state.modoComparacion && state.tipoActivo === 'vehicular' && (
      <>
        <div className={styles.divider}>Escenario B</div>
        <VehicularForm slot={1} />
      </>
    )}
  </>
)}
```

Add to `Sidebar.module.css`:
```css
.divider { padding: 8px 12px; font-size: 11px; color: var(--blue); border-top: 1px solid var(--border); font-weight: 600; }
```

- [ ] **Step 3: Create `CompareSummaryBar.jsx`**

Reads both results, computes winner (lowest totalIntereses + plazoEfectivo), shows savings.

```jsx
// frontend/src/components/CompareSummaryBar.jsx
import { useContext } from 'react'
import { AppCtx } from '../App.jsx'
import { fmtCOP, fmtMeses } from '../utils/format.js'
import styles from './CompareSummaryBar.module.css'

export default function CompareSummaryBar() {
  const { state, dispatch } = useContext(AppCtx)
  const [r0, r1] = state.results
  if (!r0 || !r1) return null

  const winner = r0.totalIntereses <= r1.totalIntereses ? 0 : 1
  const loser = winner === 0 ? 1 : 0
  const ahorroIntereses = state.results[loser].totalIntereses - state.results[winner].totalIntereses
  const ahorroMeses = state.results[loser].plazoEfectivo - state.results[winner].plazoEfectivo
  const simWinner = state.simulaciones[winner]

  return (
    <div className={styles.bar}>
      <div className={styles.msg}>
        ✓ <strong>{simWinner?.params?.banco ?? `Escenario ${winner + 1}`}</strong> es el mejor escenario
        {ahorroIntereses > 0 && <> — {fmtCOP(ahorroIntereses)} menos en intereses</>}
        {ahorroMeses > 0 && <> · {fmtMeses(ahorroMeses)} antes</>}
      </div>
      <button
        className={styles.applyBtn}
        onClick={() => dispatch({ type: 'APPLY_AI_CONFIG', slot: 0, payload: state.simulaciones[winner].params })}
      >
        Aplicar configuración
      </button>
    </div>
  )
}
```

```css
/* CompareSummaryBar.module.css */
.bar {
  background: var(--green-muted);
  border: 1px solid rgba(46,160,67,0.3);
  border-radius: var(--radius);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.msg { font-size: 13px; color: var(--green); }
.applyBtn {
  background: var(--green-muted);
  border: 1px solid var(--green);
  border-radius: var(--radius-sm);
  color: var(--green);
  padding: 5px 14px;
  font-size: 12px;
  white-space: nowrap;
}
```

- [ ] **Step 4: Verify compare mode in browser**

Enable Comparar → fill both forms → Calcular both → CompareSummaryBar shows winner.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CompareView.jsx frontend/src/components/CompareView.module.css frontend/src/components/CompareSummaryBar.jsx frontend/src/components/CompareSummaryBar.module.css
git commit -m "feat: compare view with two side-by-side panels and winner summary bar"
```

---

### Task 13: Export PDF + Excel

**Files:**
- Create: `frontend/src/utils/exportPDF.js`
- Create: `frontend/src/utils/exportExcel.js`

- [ ] **Step 1: Create `exportPDF.js`**

```js
// frontend/src/utils/exportPDF.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fmtCOP, fmtMonthYear, fmtMeses, fmtPct } from './format.js'

const DISCLAIMER = "Valores estimados. Tasa y condiciones reales dependen del historial crediticio y la aprobación del banco."

function addHeader(doc, sim, y) {
  doc.setFontSize(16)
  doc.setTextColor(230, 168, 23)
  doc.text("CréditoIA", 14, y)
  doc.setFontSize(10)
  doc.setTextColor(125, 133, 144)
  doc.text(`Cliente: ${sim.nombre || "—"}`, 14, y + 7)
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO")}`, 14, y + 13)
  doc.setFontSize(8)
  doc.text(DISCLAIMER, 14, y + 19, { maxWidth: 180 })
  return y + 28
}

function addKPIs(doc, results, params, y) {
  autoTable(doc, {
    startY: y,
    head: [["Concepto", "Valor"]],
    body: [
      ["Capital financiado", fmtCOP(params.vehiculo.valor - params.reserva)],
      ["Banco", params.banco],
      ["Tasa mensual", fmtPct(params.tasaMensual)],
      ["Plazo", fmtMeses(params.plazo)],
      ["Cuota financiera", fmtCOP(results.cuotaFinanciera)],
      ["Cuota total (con seguros)", fmtCOP(results.cuotaTotalMensual)],
      ["Plazo efectivo", fmtMeses(results.plazoEfectivo)],
      ["Finalización", fmtMonthYear(results.fechaFin)],
      ["Total intereses", fmtCOP(results.totalIntereses)],
      ["Intereses ahorrados", fmtCOP(results.interesesAhorrados)],
      ["Matrícula (informativo)", fmtCOP(params.matricula)],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [22, 27, 34], textColor: [230, 168, 23] },
  })
  return doc.lastAutoTable.finalY + 6
}

function addSchedule(doc, schedule, y) {
  autoTable(doc, {
    startY: y,
    head: [["#", "Mes/Año", "Cuota Total", "Capital", "Interés", "Seg. Vida", "Abono", "Saldo"]],
    body: schedule.map(e => [
      e.num,
      fmtMonthYear(e),
      fmtCOP(e.cuotaTotal),
      fmtCOP(e.capital),
      fmtCOP(e.interes),
      fmtCOP(e.seguroVida),
      e.abono > 0 ? fmtCOP(e.abono) : "—",
      fmtCOP(e.saldo),
    ]),
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [28, 35, 48], textColor: [125, 133, 144] },
  })
}

export function exportPDF(simulaciones, results) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  simulaciones.forEach((sim, i) => {
    if (!sim || !results[i]) return
    if (i > 0) doc.addPage()
    let y = addHeader(doc, sim, 14)
    y = addKPIs(doc, results[i], sim.params, y)
    addSchedule(doc, results[i].schedule, y)
  })
  doc.save("creditoia-simulacion.pdf")
}
```

- [ ] **Step 2: Create `exportExcel.js`**

```js
// frontend/src/utils/exportExcel.js
import * as XLSX from 'xlsx'
import { fmtMonthYear } from './format.js'

export function exportExcel(simulaciones, results) {
  const wb = XLSX.utils.book_new()

  simulaciones.forEach((sim, i) => {
    if (!sim || !results[i]) return
    const sheetName = `Escenario ${i + 1}${sim.nombre ? ` - ${sim.nombre}`.slice(0, 25) : ''}`

    const rows = [
      ["CréditoIA — Simulación de crédito vehicular"],
      ["Cliente:", sim.nombre || "—"],
      ["Banco:", sim.params.banco],
      ["Tasa mensual (%):", sim.params.tasaMensual],
      ["Plazo:", sim.params.plazo],
      ["Capital:", sim.params.vehiculo.valor - sim.params.reserva],
      [],
      ["#", "Mes", "Año", "Cuota Financiera", "Interés", "Capital", "Seg. Vida", "Todo Riesgo", "Admin", "Cuota Total", "Abono", "Saldo"],
      ...results[i].schedule.map(e => [
        e.num, fmtMonthYear(e).split(". ")[0], e.anio,
        e.cuotaFinanciera, e.interes, e.capital,
        e.seguroVida, e.seguroTodoRiesgo, e.adminFee,
        e.cuotaTotal, e.abono || 0, e.saldo,
      ]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = Array(12).fill({ wch: 16 })
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  })

  XLSX.writeFile(wb, "creditoia-simulacion.xlsx")
}
```

- [ ] **Step 3: Wire exports to TopBar buttons**

In `App.jsx`, pass export handlers via context or direct callbacks. Simplest: add click handlers on `#btn-pdf` and `#btn-excel` in TopBar using context state.

Update `TopBar.jsx`:
```jsx
// replace the PDF/Excel buttons:
import { exportPDF } from '../../utils/exportPDF.js'
import { exportExcel } from '../../utils/exportExcel.js'

// inside component:
const { state } = useContext(AppCtx)
<button className={styles.btn} onClick={() => exportPDF(state.simulaciones, state.results)}>⬇ PDF</button>
<button className={styles.btn} onClick={() => exportExcel(state.simulaciones, state.results)}>⬇ Excel</button>
```

- [ ] **Step 4: Verify exports**

Simulate a credit → click PDF → file downloads with header, KPIs, and table. Click Excel → .xlsx with data rows.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/exportPDF.js frontend/src/utils/exportExcel.js
git commit -m "feat: PDF export (jsPDF+autoTable) and Excel export (SheetJS)"
```

*End of Chunk 3*

---

## Chunk 4: Backend + AI Integration

### Task 14: Claude chat route (SSE streaming)

**Files:**
- Modify: `backend/routes/chat.js`
- Modify: `backend/tools/creditTools.js`

- [ ] **Step 1: Implement `backend/tools/creditTools.js`**

Defines the 2 tools used in Phase 1 (`simular_vehicular` + `comparar_escenarios`) and executes them using the same engine logic.

```js
// backend/tools/creditTools.js
import { calcularVehicular } from '../engine/vehicular.js'

export const tools = [
  {
    name: "simular_vehicular",
    description: "Calcula amortización de crédito vehicular mes a mes y devuelve KPIs completos.",
    input_schema: {
      type: "object",
      properties: {
        capital:       { type: "number", description: "Valor vehículo menos reserva (COP)" },
        tasaMensual:   { type: "number", description: "Tasa mensual en % (ej: 1.05)" },
        plazo:         { type: "number", description: "Plazo en meses (12–120)" },
        vehiculoTipo:  { type: "string", enum: ["electrico","hibrido","combustion"] },
        seguros:       { type: "object", properties: { vidaTasa: { type: "number" }, todoRiesgoMensual: { type: "number" }, adminMensual: { type: "number" } }, required: ["vidaTasa","todoRiesgoMensual","adminMensual"] },
        abonos:        { type: "array", items: { type: "object" }, default: [] },
        mesInicio:     { type: "object", properties: { mes: { type: "number" }, anio: { type: "number" } }, required: ["mes","anio"] },
      },
      required: ["capital","tasaMensual","plazo","vehiculoTipo","seguros","mesInicio"],
    },
  },
  {
    name: "comparar_escenarios",
    description: "Compara dos simulaciones ya calculadas y determina cuál es mejor y por cuánto.",
    input_schema: {
      type: "object",
      properties: {
        escenarioA: { type: "object", description: "Resultado de simular_vehicular para escenario A" },
        escenarioB: { type: "object", description: "Resultado de simular_vehicular para escenario B" },
      },
      required: ["escenarioA","escenarioB"],
    },
  },
  {
    name: "aplicar_configuracion",
    description: "Retorna parámetros para que el frontend los cargue automáticamente en el formulario.",
    input_schema: {
      type: "object",
      properties: {
        tipo:   { type: "string", enum: ["vehicular"] },
        params: { type: "object", description: "ParamsVehicular completo" },
      },
      required: ["tipo","params"],
    },
  },
]

export function runTool(name, input) {
  if (name === "simular_vehicular") {
    const params = {
      vehiculo: { nombre: "", valor: input.capital, tipo: input.vehiculoTipo },
      reserva: 0,
      matricula: 0,
      puntajeCredito: 700,
      banco: "otro",
      tasaMensual: input.tasaMensual,
      plazo: input.plazo,
      mesInicio: input.mesInicio,
      seguros: input.seguros,
      abonos: input.abonos ?? [],
    }
    const r = calcularVehicular(params)
    return {
      cuotaFinanciera: Math.round(r.cuotaFinanciera),
      cuotaTotalMensual: Math.round(r.cuotaTotalMensual),
      plazoEfectivo: r.plazoEfectivo,
      fechaFin: r.fechaFin,
      totalIntereses: Math.round(r.totalIntereses),
      totalAbonos: Math.round(r.totalAbonos),
      interesesAhorrados: Math.round(r.interesesAhorrados),
      mesesAhorrados: r.mesesAhorrados,
    }
  }

  if (name === "comparar_escenarios") {
    const { escenarioA: a, escenarioB: b } = input
    const winner = a.totalIntereses <= b.totalIntereses ? "A" : "B"
    const best = winner === "A" ? a : b
    const worst = winner === "A" ? b : a
    return {
      ganador: winner,
      ahorroIntereses: Math.abs(worst.totalIntereses - best.totalIntereses),
      ahorroMeses: Math.abs(worst.plazoEfectivo - best.plazoEfectivo),
    }
  }

  if (name === "aplicar_configuracion") {
    return { aplicado: true, tipo: input.tipo }
  }

  throw new Error(`Tool desconocida: ${name}`)
}
```

Note: The backend needs access to `calcularVehicular`. Copy or symlink `frontend/src/engine/vehicular.js` to `backend/engine/vehicular.js`. Since both are ES modules with no DOM/React deps, sharing is safe.

- [ ] **Step 2: Copy engine to backend**

```bash
mkdir -p backend/engine
cp frontend/src/engine/vehicular.js backend/engine/vehicular.js
```

- [ ] **Step 3: Implement `backend/routes/chat.js`**

```js
// backend/routes/chat.js
import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { tools, runTool } from '../tools/creditTools.js'

const router = Router()
const client = new Anthropic()

const SYSTEM_PROMPT = `Eres CréditoIA, asistente especializado en créditos colombianos para el público general.
Conoces las tasas de los principales bancos, la regulación Superfinanciera, la Ley 1964/2019 de vehículos eléctricos,
y el sistema de puntaje Datacrédito (0–1000).

SIEMPRE aclara que los valores son estimaciones que dependen del historial crediticio individual y la aprobación del banco.

Cuando el usuario proporcione datos suficientes, usa las herramientas de cálculo en lugar de calcular manualmente.
Presenta resultados con números formateados en pesos colombianos.
Cuando una configuración diferente mejoraría significativamente el crédito, propón la alternativa y usa aplicar_configuracion.`

router.post('/', async (req, res) => {
  const { messages, contexto } = req.body

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  function send(obj) {
    res.write(`data: ${JSON.stringify(obj)}\n\n`)
  }

  try {
    const systemWithCtx = contexto
      ? `${SYSTEM_PROMPT}\n\nContexto actual del usuario:\n${JSON.stringify(contexto, null, 2)}`
      : SYSTEM_PROMPT

    let currentMessages = [...messages]

    // Agentic loop: Claude may call tools multiple times
    while (true) {
      const stream = await client.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemWithCtx,
        tools,
        messages: currentMessages,
      })

      let assistantText = ""
      const toolUses = []

      for await (const event of stream) {
        if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            assistantText += event.delta.text
            send({ type: "delta", text: event.delta.text })
          }
        }
        if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
          toolUses.push({ id: event.content_block.id, name: event.content_block.name, input: {} })
        }
        if (event.type === "content_block_delta" && event.delta.type === "input_json_delta") {
          const last = toolUses.at(-1)
          if (last) last._raw = (last._raw ?? "") + event.delta.partial_json
        }
      }

      // Parse tool inputs
      for (const tu of toolUses) {
        try { tu.input = JSON.parse(tu._raw ?? "{}") } catch { tu.input = {} }
        delete tu._raw
      }

      const finalMsg = await stream.finalMessage()
      const stopReason = finalMsg.stop_reason

      if (toolUses.length === 0 || stopReason === "end_turn") break

      // Execute tools and continue
      const toolResults = []
      for (const tu of toolUses) {
        send({ type: "tool_use", name: tu.name, input: tu.input })
        try {
          const output = runTool(tu.name, tu.input)
          send({ type: "tool_result", name: tu.name, output })
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(output) })
        } catch (err) {
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: `Error: ${err.message}`, is_error: true })
        }
      }

      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: finalMsg.content },
        { role: "user", content: toolResults },
      ]

      if (stopReason !== "tool_use") break
    }

    send({ type: "done" })
  } catch (err) {
    send({ type: "error", message: err.message })
  } finally {
    res.end()
  }
})

export default router
```

- [ ] **Step 4: Test the endpoint manually**

With backend running:
```bash
curl -N -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hola, ¿cuánto pagaría de cuota por un crédito de $100 millones a 60 meses al 1.05% mensual?"}]}'
```
Expected: SSE stream of `data:` lines ending with `{"type":"done"}`.

- [ ] **Step 5: Commit**

```bash
git add backend/routes/chat.js backend/tools/creditTools.js backend/engine/
git commit -m "feat: Claude SSE streaming chat with vehicular tool use and agentic loop"
```

---

### Task 15: useAIChat hook + AIChat + AIInsightPanel

**Files:**
- Create: `frontend/src/hooks/useAIChat.js`
- Create: `frontend/src/components/Sidebar/AIChat.jsx`
- Create: `frontend/src/components/Sidebar/AIChat.module.css`
- Create: `frontend/src/components/AIInsightPanel.jsx`
- Create: `frontend/src/components/AIInsightPanel.module.css`

- [ ] **Step 1: Create `useAIChat.js`**

```js
// frontend/src/hooks/useAIChat.js
import { useState, useCallback } from 'react'

export function useAIChat({ onAddMsg, onApplyConfig, onToolResult }) {
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState("")

  const sendMessage = useCallback(async (messages, contexto) => {
    setStreaming(true)
    setStreamText("")

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, contexto }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let fullText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const chunk = JSON.parse(line.slice(6))
            if (chunk.type === "delta") {
              fullText += chunk.text
              setStreamText(fullText)
            }
            if (chunk.type === "tool_use" && chunk.name === "aplicar_configuracion") {
              onApplyConfig?.(chunk.input)
            }
            if (chunk.type === "tool_result") {
              onToolResult?.(chunk)
            }
            if (chunk.type === "done") {
              onAddMsg?.({ role: "assistant", content: fullText })
              setStreamText("")
            }
            if (chunk.type === "error") {
              throw new Error(chunk.message)
            }
          } catch (e) { /* skip malformed chunks */ }
        }
      }
    } catch (err) {
      onAddMsg?.({ role: "assistant", content: `⚠ Error: ${err.message}` })
    } finally {
      setStreaming(false)
    }
  }, [onAddMsg, onApplyConfig, onToolResult])

  return { sendMessage, streaming, streamText }
}
```

- [ ] **Step 2: Create `AIChat.jsx`**

Chat UI shown in the sidebar when mode = 'chat'. Reads `chatHistory` from context, uses `useAIChat`.

```jsx
// frontend/src/components/Sidebar/AIChat.jsx
import { useContext, useState, useRef, useEffect } from 'react'
import { AppCtx } from '../../App.jsx'
import { useAIChat } from '../../hooks/useAIChat.js'
import styles from './AIChat.module.css'

export default function AIChat() {
  const { state, dispatch } = useContext(AppCtx)
  const [input, setInput] = useState("")
  const bottomRef = useRef(null)

  function addMsg(msg) { dispatch({ type: 'ADD_CHAT_MSG', payload: msg }) }
  function applyConfig(input) {
    dispatch({ type: 'APPLY_AI_CONFIG', slot: 0, payload: input.params })
    // Show undo banner — simple: store in local state
  }

  const { sendMessage, streaming, streamText } = useAIChat({
    onAddMsg: addMsg,
    onApplyConfig: applyConfig,
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [state.chatHistory, streamText])

  function submit(e) {
    e.preventDefault()
    if (!input.trim() || streaming) return
    const userMsg = { role: 'user', content: input.trim() }
    addMsg(userMsg)
    setInput("")
    const contexto = {
      tipo: state.tipoActivo,
      simulaciones: state.simulaciones,
      results: state.results,
    }
    sendMessage([...state.chatHistory, userMsg], contexto)
  }

  return (
    <div className={styles.chat}>
      <div className={styles.messages}>
        {state.chatHistory.map((m, i) => (
          <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.user : styles.assistant}`}>
            {m.content}
          </div>
        ))}
        {streaming && streamText && (
          <div className={`${styles.msg} ${styles.assistant} ${styles.streaming}`}>{streamText}</div>
        )}
        <div ref={bottomRef} />
      </div>
      <form className={styles.inputRow} onSubmit={submit}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Pregunta algo sobre tu crédito..."
          disabled={streaming}
        />
        <button type="submit" disabled={streaming || !input.trim()}>
          {streaming ? '…' : '↵'}
        </button>
      </form>
    </div>
  )
}
```

```css
/* AIChat.module.css */
.chat { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
.messages { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.msg { padding: 8px 10px; border-radius: var(--radius-sm); font-size: 12px; line-height: 1.5; max-width: 90%; }
.user { background: var(--accent-muted); border: 1px solid rgba(230,168,23,0.2); color: var(--text); align-self: flex-end; }
.assistant { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); align-self: flex-start; }
.streaming { border-style: dashed; }
.inputRow { display: flex; gap: 6px; padding: 10px; border-top: 1px solid var(--border); }
.inputRow input { flex: 1; }
.inputRow button { background: var(--accent); color: #000; border: none; border-radius: var(--radius-sm); padding: 0 10px; font-weight: 700; }
.inputRow button:disabled { opacity: 0.4; }
```

- [ ] **Step 3: Wire AIChat into Sidebar**

Replace the chat placeholder in `Sidebar.jsx`:
```jsx
import AIChat from '../AIChat.jsx'  // update path
// change:  <div className={styles.chatPlaceholder}>Chat IA — Tarea 23</div>
// to:      <AIChat />
// also import: import AIChat from './AIChat.jsx'
```

- [ ] **Step 4: Create `AIInsightPanel.jsx`**

Right column — always visible. On mount and after each results change, sends a single "insight" request to get proactive suggestions.

```jsx
// frontend/src/components/AIInsightPanel.jsx
import { useContext, useState, useEffect } from 'react'
import { AppCtx } from '../App.jsx'
import { useAIChat } from '../hooks/useAIChat.js'
import styles from './AIInsightPanel.module.css'

const INSIGHT_PROMPT = "Analiza el escenario actual y dame 2-3 sugerencias concretas para mejorar este crédito. Sé muy breve y directo."

export default function AIInsightPanel() {
  const { state } = useContext(AppCtx)
  const [insights, setInsights] = useState("")
  const [applyBanner, setApplyBanner] = useState(false)

  const { sendMessage, streaming } = useAIChat({
    onAddMsg: msg => { if (msg.role === 'assistant') setInsights(msg.content) },
    onApplyConfig: () => setApplyBanner(true),
  })

  const hasResults = state.results[0] !== null

  useEffect(() => {
    if (!hasResults) return
    const contexto = { tipo: state.tipoActivo, simulaciones: state.simulaciones, results: state.results }
    sendMessage([{ role: 'user', content: INSIGHT_PROMPT }], contexto)
  }, [state.results[0]])  // refresh when results change

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.badge}>🤖</span>
        <span>Asesor IA</span>
      </div>

      {applyBanner && (
        <div className={styles.banner}>
          Configuración aplicada por IA ✓
          <button onClick={() => setApplyBanner(false)}>Deshacer</button>
        </div>
      )}

      <div className={styles.content}>
        {!hasResults && <p className={styles.empty}>Calcula una simulación para ver sugerencias.</p>}
        {streaming && !insights && <p className={styles.loading}>Analizando...</p>}
        {insights && <p className={styles.insights}>{insights}</p>}
      </div>
    </aside>
  )
}
```

```css
/* AIInsightPanel.module.css */
.panel {
  width: var(--insight-w);
  background: var(--surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
}
.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}
.badge {
  background: var(--accent);
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.banner {
  background: var(--green-muted);
  border-bottom: 1px solid rgba(46,160,67,0.3);
  padding: 8px 14px;
  font-size: 11px;
  color: var(--green);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.banner button { background: none; border: none; color: var(--muted); font-size: 11px; cursor: pointer; }
.content { padding: 14px; flex: 1; }
.empty, .loading { font-size: 12px; color: var(--muted); }
.insights { font-size: 12px; color: var(--text); line-height: 1.6; white-space: pre-wrap; }
```

- [ ] **Step 5: End-to-end test**

1. Start both servers: `npm run dev`
2. Fill VehicularForm → Calcular
3. AI Insight Panel shows proactive suggestions from Claude
4. Switch Sidebar to Chat IA mode → send a question → streaming response appears
5. Ask Claude to apply a different bank config → `aplicar_configuracion` banner appears
6. Enable Comparar → fill both scenarios → CompareSummaryBar shows winner

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useAIChat.js frontend/src/components/Sidebar/AIChat.jsx frontend/src/components/Sidebar/AIChat.module.css frontend/src/components/AIInsightPanel.jsx frontend/src/components/AIInsightPanel.module.css
git commit -m "feat: AI chat (SSE streaming) and proactive insight panel via Claude API"
```

*End of Chunk 4*

---

## Done

Plan complete. All 4 chunks cover the full Phase 1 scope:

| Chunk | Tasks | Deliverable |
|-------|-------|-------------|
| 1 | 1–6 | Monorepo, engine (TDD), bank data, formatters |
| 2 | 7–11 | State (useReducer), forms, KPIs, charts, table |
| 3 | 12–13 | Compare view, PDF export, Excel export |
| 4 | 14–15 | Claude SSE backend, AI chat, insight panel |

After completing all tasks, run `npm --workspace frontend run test` — all tests must pass before calling Phase 1 done.
