import { useState, useEffect, useContext } from 'react'
import { SimContext } from '../../App.jsx'
import { BANCOS, getBancoById, getTasaSugerida } from '../../data/bancos.js'
import { calcularVehicular } from '../../engine/vehicular.js'
import styles from './VehicularForm.module.css'

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const PLAZOS = [12, 24, 36, 48, 60, 72, 84]

const now = new Date()
const MES_ACTUAL = now.getMonth() + 1 // 1-based
const ANIO_ACTUAL = now.getFullYear()

function buildAbono() {
  return { id: crypto.randomUUID(), tipo: 'unico', monto: 0, mes: MES_ACTUAL, anio: ANIO_ACTUAL }
}

export default function VehicularForm() {
  const { dispatch } = useContext(SimContext)

  const [precio, setPrecio] = useState(80000000)
  const [enganche, setEnganche] = useState(16000000)
  const [banco, setBanco] = useState(BANCOS[0].id)
  const [puntajeCredito, setPuntajeCredito] = useState(700)
  const [tipoVehiculo, setTipoVehiculo] = useState('combustion')
  const [tasaMensual, setTasaMensual] = useState(() => {
    const b = BANCOS[0]
    return b.tasaMensual !== null
      ? getTasaSugerida(b.tasaMensual, 700, 'combustion')
      : 1.0
  })
  const [plazoMeses, setPlazoMeses] = useState(60)
  const [mesInicio, setMesInicio] = useState(MES_ACTUAL)
  const [anioInicio, setAnioInicio] = useState(ANIO_ACTUAL)
  const [abonos, setAbonos] = useState([])

  // Reactive tasa: update whenever banco, puntajeCredito, or tipoVehiculo changes
  useEffect(() => {
    const bancoObj = getBancoById(banco)
    if (bancoObj && bancoObj.tasaMensual !== null) {
      setTasaMensual(getTasaSugerida(bancoObj.tasaMensual, puntajeCredito, tipoVehiculo))
    }
  }, [banco, puntajeCredito, tipoVehiculo])

  function addAbono() {
    setAbonos(prev => [...prev, buildAbono()])
  }

  function removeAbono(id) {
    setAbonos(prev => prev.filter(a => a.id !== id))
  }

  function updateAbono(id, field, value) {
    setAbonos(prev =>
      prev.map(a => (a.id === id ? { ...a, [field]: value } : a))
    )
  }

  function handleSubmit(e) {
    e.preventDefault()

    const params = {
      precio: Number(precio),
      enganche: Number(enganche),
      tasaMensual: Number(tasaMensual),
      plazoMeses: Number(plazoMeses),
      mesInicio: Number(mesInicio),
      anioInicio: Number(anioInicio),
      abonos: abonos.map(a => ({
        tipo: a.tipo,
        monto: Number(a.monto),
        ...(a.tipo === 'unico' ? { mes: Number(a.mes), anio: Number(a.anio) } : {}),
      })),
    }

    const resultado = calcularVehicular(params)

    dispatch({
      type: 'ADD_SIMULACION',
      payload: {
        id: crypto.randomUUID(),
        params: { ...params, banco, puntajeCredito, tipoVehiculo },
        resultado,
      },
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* Precio del vehículo */}
      <div className={styles.field}>
        <label className={styles.label}>Precio del vehículo</label>
        <input
          className={styles.input}
          type="number"
          min={1000000}
          value={precio}
          onChange={e => setPrecio(e.target.value)}
        />
      </div>

      {/* Cuota inicial */}
      <div className={styles.field}>
        <label className={styles.label}>Cuota inicial</label>
        <input
          className={styles.input}
          type="number"
          min={0}
          value={enganche}
          onChange={e => setEnganche(e.target.value)}
        />
      </div>

      {/* Banco */}
      <div className={styles.field}>
        <label className={styles.label}>Banco</label>
        <select
          className={styles.select}
          value={banco}
          onChange={e => setBanco(e.target.value)}
        >
          {BANCOS.map(b => (
            <option key={b.id} value={b.id}>{b.nombre}</option>
          ))}
        </select>
      </div>

      {/* Puntaje Datacrédito */}
      <div className={styles.field}>
        <label className={styles.label}>Puntaje Datacrédito</label>
        <input
          className={styles.input}
          type="number"
          min={0}
          max={1000}
          value={puntajeCredito}
          onChange={e => setPuntajeCredito(Number(e.target.value))}
        />
      </div>

      {/* Tipo de vehículo */}
      <div className={styles.field}>
        <label className={styles.label}>Tipo de vehículo</label>
        <select
          className={styles.select}
          value={tipoVehiculo}
          onChange={e => setTipoVehiculo(e.target.value)}
        >
          <option value="electrico">Eléctrico</option>
          <option value="hibrido">Híbrido</option>
          <option value="combustion">Combustión</option>
        </select>
      </div>

      {/* Tasa mensual */}
      <div className={styles.field}>
        <label className={styles.label}>Tasa mensual %</label>
        <input
          className={styles.input}
          type="number"
          step={0.01}
          value={tasaMensual}
          onChange={e => setTasaMensual(e.target.value)}
        />
      </div>

      {/* Plazo */}
      <div className={styles.field}>
        <label className={styles.label}>Plazo (meses)</label>
        <select
          className={styles.select}
          value={plazoMeses}
          onChange={e => setPlazoMeses(Number(e.target.value))}
        >
          {PLAZOS.map(p => (
            <option key={p} value={p}>{p} meses</option>
          ))}
        </select>
      </div>

      {/* Mes inicio */}
      <div className={styles.field}>
        <label className={styles.label}>Mes de inicio</label>
        <select
          className={styles.select}
          value={mesInicio}
          onChange={e => setMesInicio(Number(e.target.value))}
        >
          {MESES_NOMBRES.map((nombre, i) => (
            <option key={i + 1} value={i + 1}>{nombre}</option>
          ))}
        </select>
      </div>

      {/* Año inicio */}
      <div className={styles.field}>
        <label className={styles.label}>Año de inicio</label>
        <input
          className={styles.input}
          type="number"
          value={anioInicio}
          onChange={e => setAnioInicio(Number(e.target.value))}
        />
      </div>

      {/* Abonos extraordinarios */}
      <div className={styles.field}>
        <label className={styles.label}>Abonos extraordinarios</label>
        {abonos.map(abono => (
          <div key={abono.id} className={styles.abonoRow} style={{ marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {/* Tipo */}
            <div className={styles.field} style={{ flex: '1 1 100px' }}>
              <label className={styles.label}>Tipo</label>
              <select
                className={styles.select}
                value={abono.tipo}
                onChange={e => updateAbono(abono.id, 'tipo', e.target.value)}
              >
                <option value="unico">Único</option>
                <option value="semestral">Semestral</option>
              </select>
            </div>

            {/* Monto */}
            <div className={styles.field} style={{ flex: '1 1 120px' }}>
              <label className={styles.label}>Monto</label>
              <input
                className={styles.input}
                type="number"
                min={0}
                value={abono.monto}
                onChange={e => updateAbono(abono.id, 'monto', e.target.value)}
              />
            </div>

            {/* Mes / Año (solo para tipo único) */}
            {abono.tipo === 'unico' && (
              <>
                <div className={styles.field} style={{ flex: '1 1 100px' }}>
                  <label className={styles.label}>Mes</label>
                  <select
                    className={styles.select}
                    value={abono.mes}
                    onChange={e => updateAbono(abono.id, 'mes', Number(e.target.value))}
                  >
                    {MESES_NOMBRES.map((nombre, i) => (
                      <option key={i + 1} value={i + 1}>{nombre}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field} style={{ flex: '1 1 80px' }}>
                  <label className={styles.label}>Año</label>
                  <input
                    className={styles.input}
                    type="number"
                    value={abono.anio}
                    onChange={e => updateAbono(abono.id, 'anio', Number(e.target.value))}
                  />
                </div>
              </>
            )}

            {/* Delete */}
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => removeAbono(abono.id)}
              style={{ alignSelf: 'flex-end' }}
            >
              x
            </button>
          </div>
        ))}
        <button type="button" className={styles.btnSecondary} onClick={addAbono}>
          + Agregar abono
        </button>
      </div>

      <button type="submit" className={styles.btn}>Simular</button>
    </form>
  )
}
