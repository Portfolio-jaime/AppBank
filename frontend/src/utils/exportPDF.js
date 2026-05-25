import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fmtCOP, fmtPct, fmtMonthYear, fmtMeses } from './format.js'

/**
 * exportPDF — generates a landscape PDF with KPI summary and full amortization
 * table for the given simulation, then triggers a browser download.
 *
 * @param {{ id: string, params: object, resultado: object }} simulacion
 */
export function exportPDF(simulacion) {
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

  const doc = new jsPDF({ orientation: 'landscape' })

  // ── Header ──────────────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('CréditoIA – Simulación Vehicular', 14, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text(`Generado: ${today}`, 14, 22)
  doc.setTextColor(0)

  // ── Summary table ───────────────────────────────────────────────────────────
  const summaryRows = [
    ['Cuota mensual', fmtCOP(cuota)],
    ['Capital financiado', fmtCOP(capital)],
    ['Total pagado', fmtCOP(totalPagado)],
    ['Total intereses', fmtCOP(totalIntereses)],
    ['Tasa mensual', fmtPct(params.tasaMensual)],
    ['Plazo original', fmtMeses(params.plazoMeses)],
    ['Plazo real', fmtMeses(tabla.length)],
    ['Intereses ahorrados', fmtCOP(interesesAhorrados)],
    ['Meses ahorrados', fmtMeses(mesesAhorrados)],
  ]

  autoTable(doc, {
    startY: 28,
    head: [['Indicador', 'Valor']],
    body: summaryRows,
    theme: 'striped',
    headStyles: { fillColor: [41, 182, 246], textColor: 0, fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 60 },
    },
    margin: { left: 14 },
    tableWidth: 'wrap',
  })

  // ── Amortization table ──────────────────────────────────────────────────────
  const amortHead = [['Período', 'Mes/Año', 'Cuota', 'Capital', 'Interés', 'Abono Extra', 'Saldo']]

  const amortRows = tabla.map(row => [
    row.periodo,
    fmtMonthYear({ mes: row.mes, anio: row.anio }),
    fmtCOP(row.cuota),
    fmtCOP(row.capital),
    fmtCOP(row.interes),
    row.abonoExtra > 0 ? fmtCOP(row.abonoExtra) : '—',
    fmtCOP(row.saldo),
  ])

  const summaryEndY = doc.lastAutoTable.finalY + 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Tabla de Amortización', 14, summaryEndY)

  autoTable(doc, {
    startY: summaryEndY + 4,
    head: amortHead,
    body: amortRows,
    theme: 'striped',
    headStyles: { fillColor: [41, 182, 246], textColor: 0, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 18 },
      1: { cellWidth: 24 },
      2: { halign: 'right', cellWidth: 34 },
      3: { halign: 'right', cellWidth: 34 },
      4: { halign: 'right', cellWidth: 34 },
      5: { halign: 'right', cellWidth: 34 },
      6: { halign: 'right', cellWidth: 34 },
    },
    margin: { left: 14, right: 14 },
  })

  doc.save('creditoia-simulacion.pdf')
}
