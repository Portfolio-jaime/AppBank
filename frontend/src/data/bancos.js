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
