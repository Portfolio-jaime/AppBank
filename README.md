# CréditoIA

Simulador de crédito vehicular para Colombia con asistente IA integrado. Calcula amortización francesa, compara escenarios, exporta reportes y permite ajustar parámetros mediante chat conversacional.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 5 + CSS Modules |
| Backend | Node.js + Express |
| IA | Groq — `llama-3.3-70b-versatile` (SSE streaming + tool calling) |
| Gráficas | Chart.js |
| Exportación | jsPDF + jspdf-autotable, SheetJS |
| Tests | Vitest + @testing-library/react |

## Estructura

```
App-bank/
├── frontend/
│   └── src/
│       ├── engine/         # Motor de amortización francesa
│       ├── data/           # 13 bancos CO + ajustes por score/tipo
│       ├── hooks/          # useSimulaciones, useAIChat
│       ├── utils/          # Formateo (COP, %, mes/año) + exportPDF/Excel
│       └── components/
│           ├── VehicularForm/     # Formulario con tasa reactiva
│           ├── SimuladorPanel/    # Resultados: KPIs + gráfica + tabla
│           ├── CompareView/       # Comparación lado a lado
│           ├── AIInsightPanel/    # Chat con IA
│           └── TopBar / Sidebar/
└── backend/
    └── routes/
        ├── chat.js         # SSE streaming con Groq
        └── creditTools.js  # Tools: ajustar_tasa, ajustar_plazo, agregar_abono
```

## Requisitos

- Node.js 18+
- Cuenta en [Groq](https://console.groq.com) (gratuita) para obtener `GROQ_API_KEY`

## Instalación

```bash
git clone git@github.com:Portfolio-jaime/AppBank.git
cd AppBank
npm install
```

Crea un archivo `.env` en la raíz:

```env
GROQ_API_KEY=gsk_...
```

## Desarrollo

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Tests

```bash
npm --workspace frontend run test
```

60 tests — motor de amortización, datos de bancos, formateo, hook de simulaciones.

## Funcionalidades

**Simulador vehicular**
- 13 bancos colombianos con tasas base reales
- Ajuste automático de tasa por puntaje Datacrédito (0–1000) y tipo de vehículo (eléctrico / híbrido / combustión)
- Abonos extraordinarios: único (mes/año específico) o semestral (junio y diciembre)
- 10 KPIs: cuota, capital, intereses, ahorro vs. sin abonos, plazo real vs. original

**Visualización**
- Gráfica de barras apiladas por año (Chart.js): capital / intereses / abonos extra
- Tabla de amortización colapsable por año

**Comparación**
- Selecciona 2 simulaciones del historial para verlas en paralelo
- Barra de resumen con detección automática de la mejor opción

**Exportación**
- PDF con tabla de amortización completa y KPIs (jsPDF)
- Excel con hoja de amortización + hoja de resumen (SheetJS)

**Asistente IA**
- Chat en español con contexto de la simulación activa
- El modelo puede ajustar tasa, plazo o agregar abonos directamente mediante tool calling
- Streaming en tiempo real vía SSE
