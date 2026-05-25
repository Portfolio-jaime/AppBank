import * as XLSX from 'xlsx'
import { fmtCOP, fmtPct, fmtMonthYear, fmtMeses } from './format.js'

/**
 * exportExcel — generates an Excel workbook with two sheets:
 *   "Amortización" — full row-by-row table
 *   "Resumen"      — KPI summary
 *
 * @param {{ id: string, params: object, resultado: object }} simulacion
 */
export function exportExcel(simulacion) {
  const { params, resultado } = simulacion
  const {
    cuota,
    totalPagado,
    totalIntereses,
    interesesAhorrados,
    mesesAhorrados,
    tabla,
  } = resultado

  const capital = params.precio - params.enganche

  // ── Amortization sheet ──────────────────────────────────────────────────────
  const amortData = tabla.map(row => ({
    Periodo: row.periodo,
    MesAnio: fmtMonthYear({ mes: row.mes, anio: row.anio }),
    Cuota: row.cuota,
    Capital: row.capital,
    Interes: row.interes,
    AbonoExtra: row.abonoExtra,
    Saldo: row.saldo,
  }))

  const wsAmort = XLSX.utils.json_to_sheet(amortData, {
    header: ['Periodo', 'MesAnio', 'Cuota', 'Capital', 'Interes', 'AbonoExtra', 'Saldo'],
  })

  // Rename headers to be more readable
  wsAmort['A1'].v = 'Período'
  wsAmort['B1'].v = 'Mes/Año'
  wsAmort['C1'].v = 'Cuota (COP)'
  wsAmort['D1'].v = 'Capital (COP)'
  wsAmort['E1'].v = 'Interés (COP)'
  wsAmort['F1'].v = 'Abono Extra (COP)'
  wsAmort['G1'].v = 'Saldo (COP)'

  // Set column widths
  wsAmort['!cols'] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ]

  // ── Summary sheet ───────────────────────────────────────────────────────────
  const summaryData = [
    { Indicador: 'Cuota mensual', Valor: fmtCOP(cuota) },
    { Indicador: 'Capital financiado', Valor: fmtCOP(capital) },
    { Indicador: 'Total pagado', Valor: fmtCOP(totalPagado) },
    { Indicador: 'Total intereses', Valor: fmtCOP(totalIntereses) },
    { Indicador: 'Tasa mensual', Valor: fmtPct(params.tasaMensual) },
    { Indicador: 'Plazo original', Valor: fmtMeses(params.plazoMeses) },
    { Indicador: 'Plazo real', Valor: fmtMeses(tabla.length) },
    { Indicador: 'Intereses ahorrados', Valor: fmtCOP(interesesAhorrados) },
    { Indicador: 'Meses ahorrados', Valor: fmtMeses(mesesAhorrados) },
  ]

  const wsResumen = XLSX.utils.json_to_sheet(summaryData, {
    header: ['Indicador', 'Valor'],
  })

  wsResumen['!cols'] = [{ wch: 24 }, { wch: 24 }]

  // ── Workbook ────────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsAmort, 'Amortización')
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  XLSX.writeFile(wb, 'creditoia-simulacion.xlsx')
}
