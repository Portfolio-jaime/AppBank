import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import styles from './AmortizationChart.module.css'

/**
 * Formats a number as abbreviated COP (M for millions, K for thousands).
 * @param {number} value
 * @returns {string}
 */
function fmtCOPAbbr(value) {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`
  }
  return `$${value}`
}

/**
 * Groups tabla rows by year and sums capital, interes, abonoExtra.
 * @param {Array} tabla
 * @returns {{ labels: string[], capital: number[], interes: number[], abonoExtra: number[] }}
 */
function groupByYear(tabla) {
  const map = new Map()

  for (const row of tabla) {
    const key = String(row.anio)
    if (!map.has(key)) {
      map.set(key, { capital: 0, interes: 0, abonoExtra: 0 })
    }
    const entry = map.get(key)
    entry.capital += row.capital ?? 0
    entry.interes += row.interes ?? 0
    entry.abonoExtra += row.abonoExtra ?? 0
  }

  const labels = [...map.keys()]
  const capital = labels.map(y => map.get(y).capital)
  const interes = labels.map(y => map.get(y).interes)
  const abonoExtra = labels.map(y => map.get(y).abonoExtra)

  return { labels, capital, interes, abonoExtra }
}

/**
 * AmortizationChart — stacked bar chart (Chart.js) showing capital, interest,
 * and extra payments grouped by year.
 * @param {{ tabla: Array }} props
 */
export default function AmortizationChart({ tabla }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!tabla || tabla.length === 0) return

    const { labels, capital, interes, abonoExtra } = groupByYear(tabla)

    const ctx = canvasRef.current.getContext('2d')

    if (chartRef.current) {
      chartRef.current.destroy()
    }

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Capital',
            data: capital,
            backgroundColor: '#e6a817',
            stack: 'stack',
          },
          {
            label: 'Interés',
            data: interes,
            backgroundColor: '#8b949e',
            stack: 'stack',
          },
          {
            label: 'Abono Extra',
            data: abonoExtra,
            backgroundColor: '#3fb950',
            stack: 'stack',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#e6edf3',
              font: { size: 12 },
            },
          },
          tooltip: {
            callbacks: {
              label(context) {
                return ` ${context.dataset.label}: ${fmtCOPAbbr(context.parsed.y)}`
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: '#8b949e' },
            grid: { color: 'rgba(139,148,158,0.15)' },
          },
          y: {
            stacked: true,
            ticks: {
              color: '#8b949e',
              callback: (value) => fmtCOPAbbr(value),
            },
            grid: { color: 'rgba(139,148,158,0.15)' },
          },
        },
      },
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [tabla])

  return (
    <div className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
