export const creditTools = [
  {
    name: 'ajustar_tasa',
    description: 'Ajusta la tasa mensual de la simulación activa',
    input_schema: {
      type: 'object',
      properties: {
        tasaMensual: { type: 'number', description: 'Nueva tasa mensual en porcentaje (e.g. 1.2)' }
      },
      required: ['tasaMensual']
    }
  },
  {
    name: 'ajustar_plazo',
    description: 'Ajusta el plazo en meses de la simulación activa',
    input_schema: {
      type: 'object',
      properties: {
        plazoMeses: { type: 'number', description: 'Nuevo plazo en meses (12-84)' }
      },
      required: ['plazoMeses']
    }
  },
  {
    name: 'agregar_abono',
    description: 'Agrega un abono extraordinario a la simulación activa',
    input_schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['unico', 'semestral'] },
        monto: { type: 'number' },
        mes: { type: 'number', description: 'Mes 1-12 (solo para tipo unico)' },
        anio: { type: 'number', description: 'Año (solo para tipo unico)' }
      },
      required: ['tipo', 'monto']
    }
  }
]
