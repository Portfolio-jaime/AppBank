# CréditoIA — Plataforma de Simulación Crediticia con IA
**Spec date:** 2026-05-23  
**Stack:** Vite + React 18 · Node.js + Express · Claude API (Anthropic) · Chart.js · jsPDF · SheetJS  
**Scope:** Plataforma completa de simulación financiera para el público colombiano con IA dual-mode

---

## 1. Objetivo

Plataforma web que permite simular, comparar y entender 4 tipos de crédito colombianos (vehicular, hipotecario, consumo, tarjeta de crédito) con un motor de cálculo financiero preciso mes a mes y un asistente IA (Claude) que guía, explica y recomienda. El usuario puede alternar entre modo simulación manual y modo chat IA en cualquier momento.

**Todos los resultados son estimaciones.** Las condiciones reales dependen del historial crediticio individual y la aprobación de cada banco.

---

## 2. Arquitectura general

```
┌─────────────────────────────────────────────────┐
│  FRONTEND (Vite + React)          :5173          │
│  - UI completa                                   │
│  - Motor de cálculo (puro JS)                    │
│  - localStorage para persistencia                │
│  - Llama al backend solo para IA                 │
└────────────────────┬────────────────────────────┘
                     │ fetch /api/chat
┌────────────────────▼────────────────────────────┐
│  BACKEND (Node.js + Express)      :3001          │
│  - POST /api/chat  → Claude API                  │
│  - API key en .env (nunca expuesto al cliente)   │
│  - Tool use: herramientas de cálculo             │
└────────────────────┬────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────┐
│  Claude API (claude-sonnet-4-6)                  │
│  - Streaming SSE                                 │
│  - Tool use para ejecutar simulaciones           │
│  - System prompt especializado en crédito CO     │
└─────────────────────────────────────────────────┘
```

### Estructura de archivos

```
App-bank/
├── package.json                  (workspaces: frontend + backend)
├── .env                          (ANTHROPIC_API_KEY)
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── data/
│       │   └── bancos.js         (13 bancos CO + tasas por defecto)
│       ├── engine/               (cálculo puro, sin efectos)
│       │   ├── vehicular.js
│       │   ├── hipotecario.js
│       │   ├── consumo.js
│       │   └── tarjeta.js
│       ├── components/
│       │   ├── TopBar/
│       │   ├── Sidebar/
│       │   │   ├── ModeToggle.jsx        (Parámetros ↔ Chat IA)
│       │   │   ├── forms/
│       │   │   │   ├── VehicularForm.jsx
│       │   │   │   ├── HipotecarioForm.jsx
│       │   │   │   ├── ConsumoForm.jsx
│       │   │   │   └── TarjetaForm.jsx
│       │   │   └── AIChat.jsx            (interfaz de chat)
│       │   ├── panels/
│       │   │   ├── SimuladorPanel.jsx    (reutilizable por tipo)
│       │   │   ├── KPIGrid.jsx
│       │   │   ├── CuotaDesglose.jsx
│       │   │   ├── AmortizationChart.jsx
│       │   │   └── AmortizationTable.jsx
│       │   ├── CompareView.jsx
│       │   ├── CompareSummaryBar.jsx
│       │   └── AIInsightPanel.jsx        (sugerencias IA en sidebar)
│       ├── hooks/
│       │   ├── useSimulaciones.js        (useReducer + localStorage)
│       │   └── useAIChat.js              (streaming SSE del backend)
│       └── utils/
│           ├── exportPDF.js
│           ├── exportExcel.js
│           └── format.js                 (fmt es-CO, fmtShort)
└── backend/
    ├── index.js                  (Express app)
    ├── routes/
    │   └── chat.js               (POST /api/chat)
    └── tools/
        └── creditTools.js        (definiciones de herramientas Claude)
```

---

## 3. Layout de la aplicación

```
┌────────────────────────────────────────────────────────────────┐
│ TopBar: [CréditoIA] [🚗 Vehicular] [🏠 Hipotecario]           │
│         [💳 Consumo] [💰 Tarjeta] | [⊞ Comparar] [PDF] [Excel]│
├──────────────┬─────────────────────────┬──────────────────────┤
│              │                         │                      │
│   Sidebar    │    Panel Principal       │   AI Insight Panel   │
│   280px      │    (Simple o Comparar)  │   260px              │
│              │                         │                      │
│  [Parámetros │  Modo Simple:           │  Sugerencias activas │
│   | Chat IA] │  → 1 SimuladorPanel     │  basadas en los      │
│              │                         │  resultados actuales │
│  Formulario  │  Modo Comparar:         │                      │
│  del tipo    │  → 2 SimuladorPaneles   │  Chat libre con      │
│  activo      │    lado a lado          │  Claude              │
│              │                         │                      │
│  [Calcular]  │  CompareSummaryBar      │  [Pregunta algo...]  │
└──────────────┴─────────────────────────┴──────────────────────┘
```

- **Sidebar**: toggle entre formulario de parámetros y chat IA embebido. En modo chat, el formulario se oculta.
- **AI Insight Panel** (derecha): siempre visible, muestra sugerencias proactivas de Claude sobre el escenario actual. No requiere que el usuario pregunte.
- **SimuladorPanel**: componente genérico que recibe `tipo` + `results` y renderiza KPIs, desglose, gráfica y tabla según el tipo de crédito.

---

## 4. Módulos de crédito

### 4.1 Crédito Vehicular — Fase 1

**Campos de entrada:**
- Nombre del cliente
- Vehículo: nombre + valor + tipo (`electrico | hibrido | combustion`)
- Reserva/enganche ya pagado (reduce capital)
- Matrícula estimada (informativo — no entra al capital)
- Banco (selector con 13 bancos CO + "Otro")
- Tasa mensual (%) — autofill por banco, editable
- Plazo (meses, 12–120)
- Puntaje Datacrédito (0–1000) — ajusta tasa sugerida
- Mes y año de inicio del crédito
- Seguros del banco:
  - Seguro de vida deudor (% del saldo vigente, ej. 0.04%)
  - Seguro todo riesgo (monto fijo mensual)
  - Cuota de administración (monto fijo mensual)
- Abonos extraordinarios (lista dinámica):
  - Tipo: `semestral` (meses recurrentes) o `unico` (mes/año específico)
  - Monto + etiqueta libre

**Fórmulas:**
```
capital          = vehiculo.valor - reserva
cuota_financiera = capital × [tasa × (1+tasa)^n] / [(1+tasa)^n - 1]
seguro_vida_mes  = saldo_vigente × (vidaTasa / 100)      // varía cada mes
cuota_total_mes  = cuota_financiera + seguro_vida + todoRiesgo + adminFee
```

**Ajuste de tasa por puntaje y tipo de vehículo:**
```
tasa_sugerida = tasa_base_banco + Δ_score + Δ_tipo

Δ_score:
  ≥ 850 → −0.15%
  750–849 → −0.05%
  650–749 → 0%
  500–649 → +0.20%
  < 500  → +0.40% (o "no aprobado")

Δ_tipo:
  electrico → −0.20%
  hibrido   → −0.10%
  combustion → 0%
```

**KPIs a mostrar:**
- Capital financiado
- Cuota financiera mensual
- Cuota total real (con seguros)
- Plazo efectivo (meses reales con abonos)
- Fecha de finalización
- Total intereses pagados
- Total abonos extraordinarios
- Intereses ahorrados vs sin abonos
- % capital pagado (barra de progreso)
- Matrícula (línea informativa separada)

### 4.2 Crédito Hipotecario — Fase 2

**Campos adicionales:**
- Modalidad: Pesos fijos | UVR
- Estrato / tipo: VIS (Vivienda de Interés Social) | No VIS
- Subsidio Mi Casa Ya (monto a descontar del capital)
- Seguro de sismo obligatorio (% del saldo)
- Valor del inmueble + cuota inicial

**Fórmulas UVR:** El capital se denomina en UVR. La cuota en pesos varía mensualmente según el valor UVR publicado por el Banco de la República. La simulación usa la UVR actual como base y proyecta con inflación estimada. El valor UVR actual y la inflación proyectada (default 4% anual) son campos editables en `HipotecarioForm`. Los interfaces `ParamsHipotecario`, `ParamsConsumo` y `ParamsTarjeta` se definirán en el spec de Fase 2/3 para mantener el alcance de este spec en Fase 1.

**Plazo:** hasta 360 meses (30 años).

### 4.3 Crédito de Consumo / Libre Inversión — Fase 2

**Campos:**
- Monto solicitado
- Plazo (12–84 meses)
- Tasa mensual (sin garantía, más alta que vehicular)
- Propósito (informativo: viaje, educación, remodelación, etc.)

**KPI adicional:** Costo Efectivo Total (CET) — suma de intereses + seguros + comisiones expresado como % del capital.

**Tasas de referencia:** cerca del techo de usura vigente Superfinanciera (~2.3–2.7% mensual a 2025).

### 4.4 Tarjeta de Crédito — Fase 3

**Escenario simulado:** el usuario tiene una deuda existente en tarjeta y quiere saber cuánto tiempo y dinero le cuesta pagarla.

**Campos:**
- Saldo actual de la deuda
- Tasa mensual (o cupo de tarjeta — la app lo infiere)
- Tasa de usura vigente (referencia automática, editable)
- Pago mensual: mínimo | monto fijo | personalizado por mes

**Comparación integrada:** la app muestra automáticamente 3 escenarios:
1. Pago mínimo → tiempo real y costo total
2. Pago fijo moderado (2× mínimo) → tiempo y ahorro
3. Pago máximo (capital + interés) → tiempo mínimo

---

## 5. Bancos colombianos precargados

| Banco | Tasa mensual base (%) | Categoría |
|-------|----------------------|-----------|
| Bancolombia | 1.05 | Grande |
| Banco de Bogotá | 1.02 | Grande |
| Davivienda | 1.08 | Grande |
| BBVA Colombia | 1.12 | Grande |
| Scotiabank Colpatria | 1.15 | Mediano |
| Banco de Occidente | 1.08 | Mediano |
| Banco Popular | 1.10 | Mediano |
| AV Villas | 1.18 | Mediano |
| Itaú Colombia | 1.12 | Otro |
| Banco Caja Social | 1.20 | Otro |
| GNB Sudameris | 1.14 | Otro |
| Banco Finandina | 1.28 | Especialista vehículos |
| Serfinansa | 1.35 | Especialista vehículos |
| Otro banco | — | Libre |

Todas las tasas son editables. El módulo hipotecario y consumo tienen sus propias tablas de tasas base por banco.

---

## 6. Sistema de IA (Claude API)

### Modo dual

El sidebar tiene un toggle: **Parámetros** ↔ **Chat IA**.

- **Modo Parámetros**: formulario estándar, el usuario configura y calcula manualmente.
- **Modo Chat IA**: el usuario describe su situación en lenguaje natural. Claude recoge los datos necesarios, llama herramientas de cálculo, y devuelve resultados y recomendaciones. Las recomendaciones incluyen un botón **"Aplicar esta configuración"** que carga los parámetros en el formulario.

El **AI Insight Panel** (columna derecha) es independiente del toggle — siempre muestra sugerencias proactivas sobre el escenario actual sin que el usuario tenga que preguntar.

### Backend: POST /api/chat

```js
// Request
{
  messages: Message[],        // historial de conversación
  contexto: {                 // estado actual de la simulación
    tipo: "vehicular" | "hipotecario" | "consumo" | "tarjeta",
    simulaciones: Simulacion[], // hasta 2 simulaciones activas
    results: Results[]
  }
}

// Response: SSE stream (text/event-stream)
// Cada chunk:
//   { type: "delta", text: string }
//   { type: "tool_use", name: string, input: object }
//   { type: "tool_result", name: string, output: object }
//   { type: "done" }
//   { type: "error", message: string }   ← el frontend muestra un toast y detiene el spinner
```

### System prompt (resumen)

```
Eres CréditoIA, asistente especializado en créditos colombianos.
Conoces las tasas de los principales bancos, la regulación Superfinanciera,
la Ley 1964/2019 de vehículos eléctricos, y el sistema de puntaje Datacrédito.

SIEMPRE aclara que los valores son estimaciones que dependen del historial
crediticio individual y la aprobación del banco.

Cuando el usuario dé datos suficientes, llama las herramientas de cálculo
en lugar de calcular manualmente. Presenta resultados de forma clara con
números formateados en pesos colombianos.

Cuando detectes que una configuración diferente mejoraría significativamente
el crédito (menos intereses, plazo más corto), propón la alternativa con
el botón de "Aplicar configuración".
```

### Herramientas de Claude (tool use)

```js
tools = [
  {
    name: "simular_vehicular",
    description: "Calcula amortización de crédito vehicular mes a mes",
    input_schema: {
      capital, tasaMensual, plazo, seguros,
      abonos, mesInicio, anioInicio
    }
  },
  {
    name: "simular_hipotecario",
    description: "Calcula crédito hipotecario en pesos o UVR",
    input_schema: { capital, tasaMensual, plazo, modalidad, uvr_actual }
  },
  {
    name: "simular_consumo",
    description: "Calcula crédito de libre inversión con CET",
    input_schema: { capital, tasaMensual, plazo }
  },
  {
    name: "simular_tarjeta",
    description: "Proyecta pago de deuda rotativa en tarjeta",
    input_schema: { saldo, tasaMensual, pagos }
  },
  {
    name: "comparar_escenarios",
    description: "Compara dos simulaciones y devuelve el ganador con diferencias",
    input_schema: { escenarioA: Results, escenarioB: Results }
  },
  {
    name: "aplicar_configuracion",
    description: "Retorna parámetros para que el frontend los cargue en el formulario",
    input_schema: { tipo, params: Simulacion }
  }
]

**Manejo de `aplicar_configuracion` en el frontend:**  
`useAIChat.js` inspecciona cada chunk de tipo `tool_use`. Si `name === "aplicar_configuracion"`, despacha la acción `APPLY_AI_CONFIG` al reducer global de simulaciones, que reemplaza los params del escenario activo y ejecuta el cálculo automáticamente. El usuario ve un banner con "Configuración aplicada por IA ✓ | Deshacer".
```

Las herramientas de cálculo son ejecutadas **en el backend** usando el mismo motor de `engine/*.js` (compartido como módulo). El resultado se inyecta al mensaje de herramienta y Claude redacta la respuesta final.

---

## 7. Modelo de datos

### Simulacion (genérica)

```ts
interface Simulacion {
  id: string;
  tipo: "vehicular" | "hipotecario" | "consumo" | "tarjeta";
  nombre: string;           // nombre del cliente
  params: ParamsVehicular | ParamsHipotecario | ParamsConsumo | ParamsTarjeta;
  creadoEn: number;         // timestamp
}
```

### ParamsVehicular

```ts
{
  vehiculo: { nombre: string; valor: number; tipo: "electrico"|"hibrido"|"combustion" };
  reserva: number;
  matricula: number;           // informativo
  puntajeCredito: number;      // 0–1000
  banco: string;
  tasaMensual: number;         // ajustada por banco + score + tipo vehículo
  plazo: number;
  mesInicio: { mes: number; anio: number };
  seguros: { vidaTasa: number; todoRiesgoMensual: number; adminMensual: number };
  abonos: Abono[];
}
```

### Abono

```ts
{
  id: string;
  tipo: "semestral" | "unico";
  meses?: number[];            // [5, 11] = junio y diciembre (0-based)
  mes?: number; anio?: number; // para tipo "unico"
  monto: number;
  label: string;
}
```

### Results (salida del motor de cálculo)

```ts
{
  cuotaFinanciera: number;
  cuotaTotalMensual: number;     // con todos los seguros
  plazoEfectivo: number;         // meses reales (con abonos)
  fechaFin: { mes: number; anio: number };
  totalIntereses: number;
  totalAbonos: number;
  totalSeguros: number;
  interesesAhorrados: number;    // vs sin abonos
  mesesAhorrados: number;
  schedule: CuotaDetalle[];      // una entrada por mes
}

interface CuotaDetalle {
  mes: number; anio: number; num: number;
  cuotaFinanciera: number; interes: number; capital: number;
  seguroVida: number; seguroTodoRiesgo: number; adminFee: number;
  cuotaTotal: number;
  abono: number; abonoLabel: string;
  saldo: number;
}
```

---

## 8. Exportaciones

### PDF (jsPDF + autoTable)
Por simulación, en orden:
1. Header: logo CréditoIA + nombre cliente + fecha + disclaimer
2. Parámetros: tipo crédito, vehículo/inmueble, banco, tasa, plazo, puntaje, matrícula
3. KPIs (tabla 2 columnas)
4. Desglose cuota total mensual
5. Tabla de amortización completa

En modo comparativo: página de resumen comparativo al inicio, luego secciones individuales por escenario.

### Excel (SheetJS)
Una hoja por simulación:

| Mes | Año | # | Cuota Financiera | Interés | Capital | Seg. Vida | Todo Riesgo | Admin | Cuota Total | Abono | Saldo |

---

## 9. Persistencia (localStorage)

Clave: `creditoia_v1`  
Estructura:
```js
{
  simulaciones: Simulacion[],   // máx. 2 activas, histórico completo
  tipoActivo: "vehicular",
  modoComparacion: boolean,
  chatHistory: Message[]        // máx. 50 mensajes; al superarlo, FIFO: se elimina el más antiguo
}
```

---

## 10. Fases de entrega

### Fase 1 — Vehicular + IA base (MVP)
- Proyecto Vite + Express configurado con workspaces
- Motor `engine/vehicular.js` + todos los KPIs
- Dashboard completo (Sidebar, SimuladorPanel, CompareView)
- 13 bancos CO, score, tipo vehículo, abonos
- AI Insight Panel + Chat IA (backend + Claude API + tool use vehicular)
- Export PDF + Excel
- localStorage

### Fase 2 — Hipotecario + Consumo
- `engine/hipotecario.js` (pesos y UVR)
- `engine/consumo.js` (con CET)
- Formularios correspondientes
- Claude tools: `simular_hipotecario`, `simular_consumo`
- Tasas hipotecarias y de consumo por banco

### Fase 3 — Tarjeta + IA completa
- `engine/tarjeta.js` (deuda rotativa, 3 escenarios)
- Comparación cross-producto (ej. ¿me conviene pagar la tarjeta o hacer abono al crédito vehicular?)
- Claude con contexto multi-crédito simultáneo

---

## 11. Restricciones y decisiones

- **Sin base de datos**: todo client-side excepto las llamadas a Claude API.
- **Máximo 2 simulaciones** en modo comparativo.
- **Matrícula**: siempre informativa, nunca entra al capital financiado.
- **Seguro de vida**: se recalcula cada mes sobre el saldo vigente (no es fijo).
- **Abonos extraordinarios**: reducen saldo al final del mes; el plazo se recalcula dinámicamente.
- **Tasa siempre editable** después de seleccionar banco.
- **Puntaje y tipo de vehículo** ajustan la tasa *sugerida*; el usuario puede sobreescribir.
- **Disclaimer obligatorio** en UI, PDF, Excel y en el system prompt de Claude: *"Valores estimados. Tasa y condiciones reales dependen de tu historial crediticio y la aprobación del banco."*
- **Streaming SSE**: el chat IA usa streaming para respuesta en tiempo real, no polling.
- **UVR Fase 2**: se usa el valor UVR actual como base fija; no hay integración con API del Banco de la República en MVP.
