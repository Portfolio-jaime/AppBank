# SimuladorPro — Crédito Vehicular Colombia
**Spec date:** 2026-05-23  
**Stack:** Vite + React + Chart.js + jsPDF + SheetJS  
**Scope:** Reemplazo completo de `credito_vehiculo.html` como aplicación web estructurada

---

## 1. Objetivo

App de escritorio/web para simular créditos vehiculares en Colombia con múltiples bancos, desglose real de cuota mensual (seguros + admin), abonos extraordinarios configurables, vista comparativa lado a lado y exportación PDF/Excel.

---

## 2. Layout

**Dashboard de una sola página** con tres zonas fijas:

```
┌─────────────────────────────────────────────────────────┐
│  TopBar: logo | [Comparar] [Simple] | [PDF] [Excel] [+] │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│   Sidebar    │   MainPanel                              │
│  (parámetros)│   (modo Simple: 1 panel)                 │
│              │   (modo Comparar: 2 paneles lado a lado) │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

- Sidebar: ancho fijo ~280px, scroll interno
- MainPanel: flex-grow, scroll interno por panel

---

## 3. Modelo de datos

### Simulación

```ts
interface Simulacion {
  id: string;                  // uuid
  nombre: string;              // nombre del cliente
  vehiculo: {
    nombre: string;            // "Tesla Model Y"
    valor: number;             // 120990000
    tipo: "electrico" | "hibrido" | "combustion";  // afecta tasa sugerida
  };
  puntajeCredito: number;      // 0–1000 (Datacrédito/TransUnion), afecta tasa sugerida
  reserva: number;             // abono ya pagado antes del crédito (ej. 1000000)
  matricula: number;           // gasto informativo, NO se suma al capital (ej. 2635000)
  banco: string;               // "Bancolombia" | "Otro"
  tasaMensual: number;         // porcentaje, ej. 1.05
  seguros: {
    vidaTasa: number;          // % sobre saldo vigente mensual, ej. 0.04
    todoRiesgoMensual: number; // monto fijo mensual, ej. 320000
    adminMensual: number;      // monto fijo mensual, ej. 15000
  };
  plazo: number;               // meses, ej. 84
  mesInicio: { mes: number; anio: number }; // mes 1-based
  abonos: Abono[];
}

interface Abono {
  id: string;
  tipo: "semestral" | "unico";
  // semestral: se aplica en meses específicos cada año
  meses?: number[];            // ej. [5, 11] = junio y diciembre (0-based)
  // unico: se aplica en mes/año específico
  mes?: number;                // 0-based
  anio?: number;
  monto: number;
  label: string;               // "Semestral" | "Devolución IVA" | texto libre
}
```

### Fórmulas clave

```
capital          = vehiculo.valor - reserva
cuota_financiera = capital × [tasa × (1+tasa)^n] / [(1+tasa)^n - 1]
seguro_vida_mes  = saldo_vigente × (seguros.vidaTasa / 100)
cuota_total_mes  = cuota_financiera + seguro_vida_mes + todoRiesgoMensual + adminMensual
```

- La **matrícula** se muestra como línea informativa en el sidebar y en el PDF, pero **no entra al capital financiado**.
- Los **abonos extraordinarios** reducen el saldo principal inmediatamente después de la amortización mensual, acortando el plazo efectivo.

---

## 4. Bancos precargados

| Banco | Tasa mensual (%) | Nota |
|-------|-----------------|------|
| Bancolombia | 1.05 | |
| Banco de Bogotá | 1.02 | |
| Davivienda | 1.08 | |
| BBVA Colombia | 1.12 | |
| Scotiabank Colpatria | 1.15 | |
| Banco de Occidente | 1.08 | |
| Banco Popular | 1.10 | |
| AV Villas | 1.18 | |
| Itaú Colombia | 1.12 | |
| Banco Caja Social | 1.20 | |
| GNB Sudameris | 1.14 | |
| Banco Finandina | 1.28 | Especialista vehículos |
| Serfinansa | 1.35 | Especialista vehículos |
| Otro banco | — | Tasa libre, editable |

Todas las tasas son editables por el usuario después de seleccionar el banco.

---

## 5. Componentes React

```
App
├── TopBar
│   └── botones: [Comparar/Simple] [PDF] [Excel] [+ Nueva simulación]
├── Sidebar
│   ├── ClienteField         (nombre del cliente)
│   ├── VehiculoSection      (nombre vehículo, tipo: eléctrico/híbrido/combustión, valor, reserva, matrícula*)
│   ├── PerfilCrediticio     (slider puntaje 0–1000 + badge riesgo + aviso max.financiación)
│   ├── BancoSelector        (dropdown + tasa editable, ajustada por puntaje)
│   ├── PlazoField           (meses: 12–120)
│   ├── SegurosSection       (vidaTasa %, todoRiesgo $, admin $)
│   ├── MesInicioField       (selector mes/año)
│   └── AbonosManager        (lista dinámica + botón añadir)
│       └── AbonoRow × N     (tipo, monto, mes/año o meses recurrentes, label)
├── CompareView              (modo comparativo)
│   ├── CompareSummaryBar    (ganador, diferencia en intereses y meses)
│   └── SimuladorPanel × 2
└── SingleView               (modo simple)
    └── SimuladorPanel × 1

SimuladorPanel (recibe simulacion + results calculados)
├── PanelHeader              (nombre cliente, banco, tasa)
├── KPIGrid                  (capital, cuota financiera, cuota total real,
│                             fecha fin, total intereses, total abonos,
│                             intereses ahorrados vs sin abonos)
├── CuotaDesglose            (breakdown mensual: financiera + vida + todoriesgo + admin)
├── AmortizationChart        (Chart.js — barras apiladas anuales: interés/capital)
└── AmortizationTable        (agrupada por año, colapsable, filas abono resaltadas)
```

> `*` matrícula: campo informativo, se muestra en sidebar y PDF pero no modifica el capital.

---

## 6. Estado global

`useReducer` en `App` con un array de `Simulacion[]`. Máximo 2 simulaciones activas en modo comparativo (la segunda se activa con "+ Nueva simulación"). Cada `SimuladorPanel` recibe su simulación y llama a la función `calcular(sim)` que devuelve los resultados — sin estado interno, pura derivación.

Persistencia: `localStorage` — se serializa/deserializa el array de simulaciones en cada cambio. Clave: `simuladorpro_v1`.

---

## 7. Exportaciones

### PDF (jsPDF + autoTable)
Contenido por página:
1. Header: logo + nombre cliente + fecha generación
2. Parámetros: vehículo, capital, banco, tasa, plazo, matrícula (informativo), seguros
3. KPIs principales (tabla 2 columnas)
4. Desglose cuota total real
5. Tabla de amortización completa (todas las cuotas)
6. En modo comparativo: repite secciones 2–5 para cada escenario, con página de resumen comparativo al inicio

### Excel (SheetJS)
Una hoja por simulación con columnas:
`Mes | Año | Cuota Financiera | Interés | Capital | Seguro Vida | Todo Riesgo | Admin | Cuota Total | Abono | Saldo`

---

## 8. Estructura de archivos

```
App-bank/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx               (estado global, routing Simple/Comparar)
    ├── data/
    │   └── bancos.js         (lista de bancos con tasas por defecto)
    ├── engine/
    │   └── calcular.js       (función pura: Simulacion → Results)
    ├── components/
    │   ├── TopBar.jsx
    │   ├── Sidebar/
    │   │   ├── index.jsx
    │   │   ├── ClienteField.jsx
    │   │   ├── VehiculoSection.jsx
    │   │   ├── BancoSelector.jsx
    │   │   ├── SegurosSection.jsx
    │   │   └── AbonosManager.jsx
    │   ├── SimuladorPanel/
    │   │   ├── index.jsx
    │   │   ├── KPIGrid.jsx
    │   │   ├── CuotaDesglose.jsx
    │   │   ├── AmortizationChart.jsx
    │   │   └── AmortizationTable.jsx
    │   ├── CompareView.jsx
    │   └── CompareSummaryBar.jsx
    ├── hooks/
    │   └── useLocalStorage.js
    └── utils/
        ├── exportPDF.js
        ├── exportExcel.js
        └── format.js         (fmt, fmtShort — es-CO locale)
```

---

## 9. Librerías

| Paquete | Versión | Uso |
|---------|---------|-----|
| `react` + `react-dom` | 18.x | UI |
| `vite` | 5.x | bundler |
| `chart.js` + `react-chartjs-2` | 4.x | gráfica amortización |
| `jspdf` + `jspdf-autotable` | 2.x | exportación PDF |
| `xlsx` (SheetJS) | 0.18.x | exportación Excel |
| `uuid` | 9.x | IDs de simulación |

Sin CSS framework — estilos en CSS Modules o clases globales con variables CSS (misma paleta oscura del simulador actual).

---

## 10. Puntaje de crédito y estimaciones

### Advertencia de estimaciones

**Todos los valores son estimaciones.** Las tasas reales dependen del historial crediticio de cada persona, la política interna de cada banco, el modelo/año del vehículo y las condiciones del mercado. La app muestra esto prominentemente con un aviso en cada panel.

### Cómo afecta el puntaje (score Datacrédito / TransUnion, escala 0–1000)

| Rango | Perfil | Ajuste de tasa sugerido | Máx. financiación |
|-------|--------|------------------------|-------------------|
| 850–1000 | Excelente | −0.15% mensual vs. base | hasta 100% |
| 750–849  | Muy bueno | −0.05% mensual vs. base | hasta 80% |
| 650–749  | Bueno | tasa base del banco | hasta 70% |
| 500–649  | Regular | +0.20% mensual vs. base | hasta 50% |
| < 500    | Alto riesgo | usualmente no aprobado | — |

### Tipo de vehículo (Colombia — Ley 1964/2019)

Los bancos colombianos aplican tasas preferenciales a vehículos eléctricos e híbridos como incentivo a la movilidad sostenible:

| Tipo | Ajuste de tasa vs. combustión | Referencia |
|------|-------------------------------|------------|
| Eléctrico puro | −0.15 a −0.30% mensual | "Green loan" Bancolombia, Davivienda, BBVA |
| Híbrido | −0.08 a −0.15% mensual | Varía por banco |
| Combustión | sin ajuste | base |

El selector de tipo de vehículo está en `VehiculoSection` — al cambiar tipo, la tasa sugerida se recalcula combinando: `tasa_base_banco + ajuste_score + ajuste_tipo_vehiculo`. Siempre editable manualmente.

### En la app

- **Input de puntaje**: slider 0–1000 (o campo numérico) en el Sidebar, sección "Perfil crediticio".
- **Ajuste automático de tasa**: al seleccionar banco + ingresar puntaje, la tasa sugerida se calcula como `tasa_base_banco + ajuste_score`. Siempre editable manualmente.
- **Porcentaje máximo a financiar**: se muestra como referencia — si `capital / valor_vehiculo > max_financiacion`, aparece una advertencia amarilla ("Tu banco podría exigir un mayor enganche").
- **Disclaimer visible**: texto bajo cada panel y en el PDF: *"Los valores son estimaciones. La tasa y condiciones definitivas dependen de tu historial crediticio y la aprobación del banco."*

---

## 11. Restricciones y decisiones

- **Sin backend**: toda la lógica es client-side. No hay autenticación ni base de datos.
- **Máximo 2 simulaciones** en modo comparativo (UI de 2 paneles es el límite práctico de pantalla).
- **Matrícula**: campo informativo únicamente — no altera el cálculo financiero.
- **Seguro de vida**: se recalcula cada mes sobre el saldo vigente (baja con el tiempo), no es fijo.
- **Abonos extraordinarios**: reducen saldo principal al final del mes en que se aplican; el plazo efectivo se recalcula dinámicamente.
- **Tasa siempre editable**: aunque se seleccione un banco predefinido, la tasa es un input editable.
- **Tipo de vehículo**: eléctrico/híbrido/combustión ajusta la tasa sugerida. Los ajustes son orientativos (Ley 1964/2019 Colombia).
- **Puntaje crediticio**: afecta la tasa sugerida y el porcentaje máximo de financiación mostrado como referencia. El ajuste es orientativo — la tasa final la fija el banco.
- **Disclaimer obligatorio**: presente en UI, PDF y Excel. Todos los cálculos son estimaciones.
