import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { LoadingScreen } from '../../components/LoadingScreen'

interface Planta {
  id: string
  supermercado_id: string
  marca: string
  modelo: string
  capacidad_electrica: string
  capacidad_combustible: string
  combustible_por_hora: number
  horas_para_cambio_aceite: number
  activo: boolean
}

interface PlantaRegistro {
  id: string
  planta_id: string
  encendido_en: string
  apagado_en: string | null
  combustible_inicial: number
  combustible_final: number | null
  created_at: string
}

interface PlantaCarga {
  id: string
  planta_id: string
  cantidad: number
  created_at: string
}

interface PlantaMantenimiento {
  id: string
  planta_id: string
  realizado_por: string
  tipo: string
  descripcion: string
  costo: number
  observaciones: string
  created_at: string
}

const TIPOS_MANTENIMIENTO = ['Cambio de aceite', 'Cambio de filtros', 'Revision general', 'Otro'] as const

function calcularHoras(encendido: string, apagado: string | null) {
  if (!apagado) return 0
  const diffMs = new Date(apagado).getTime() - new Date(encendido).getTime()
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
}

export function VerificarPlanta() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [planta, setPlanta] = useState<Planta | null>(null)
  const [supermercado, setSupermercado] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [registros, setRegistros] = useState<PlantaRegistro[]>([])
  const [cargas, setCargas] = useState<PlantaCarga[]>([])
  const [mantenimientos, setMantenimientos] = useState<PlantaMantenimiento[]>([])

  const [encendiendo, setEncendiendo] = useState(false)
  const [apagando, setApagando] = useState(false)
  const [combustibleInicial, setCombustibleInicial] = useState(0)
  const [combustibleFinal, setCombustibleFinal] = useState(0)
  const [cargandoCombustible, setCargandoCombustible] = useState(false)
  const [cantidadCarga, setCantidadCarga] = useState(0)
  const [formMantenimiento, setFormMantenimiento] = useState({
    tipo: 'Cambio de aceite', descripcion: '', costo: 0, observaciones: '',
  })
  const [guardandoMantenimiento, setGuardandoMantenimiento] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const { data: p, error: err } = await supabase.from('plantas_electricas').select('*').eq('id', id).single()
        if (err) throw err
        setPlanta(p)
        const { data: s } = await supabase.from('supermercados').select('nombre').eq('id', p.supermercado_id).single()
        setSupermercado(s?.nombre ?? '—')

        const [regRes, carRes, manRes] = await Promise.all([
          supabase.from('planta_registros').select('*').eq('planta_id', id).order('encendido_en', { ascending: false }),
          supabase.from('planta_cargas_combustible').select('*').eq('planta_id', id).order('created_at', { ascending: false }),
          supabase.from('planta_mantenimientos').select('*').eq('planta_id', id).order('created_at', { ascending: false }),
        ])
        if (regRes.data) setRegistros(regRes.data)
        if (carRes.data) setCargas(carRes.data)
        if (manRes.data) setMantenimientos(manRes.data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const registroActivo = registros.find((r) => !r.apagado_en)
  const horasTotales = registros.reduce((sum, r) => sum + calcularHoras(r.encendido_en, r.apagado_en), 0)

  const ultCambioAceite = (() => {
    for (const m of mantenimientos) if (m.tipo === 'Cambio de aceite') return m
    return null
  })()
  const horasDesdeUltCambio = ultCambioAceite
    ? registros
        .filter((r) => r.apagado_en && new Date(r.apagado_en) > new Date(ultCambioAceite.created_at))
        .reduce((sum, r) => sum + calcularHoras(r.encendido_en, r.apagado_en), 0)
    : horasTotales
  const alertaAceite = planta ? horasDesdeUltCambio >= planta.horas_para_cambio_aceite : false

  async function encender() {
    if (!id || !user) return
    setEncendiendo(true)
    try {
      await supabase.from('planta_registros').insert({
        planta_id: id, encendido_en: new Date().toISOString(), combustible_inicial: combustibleInicial,
      })
      setCombustibleInicial(0)
      const { data } = await supabase.from('planta_registros').select('*').eq('planta_id', id).order('encendido_en', { ascending: false })
      if (data) setRegistros(data)
    } catch (e: any) { setError(e.message) }
    finally { setEncendiendo(false) }
  }

  async function apagar() {
    if (!registroActivo || !user) return
    setApagando(true)
    try {
      await supabase.from('planta_registros').update({
        apagado_en: new Date().toISOString(), combustible_final: combustibleFinal,
      }).eq('id', registroActivo.id)
      setCombustibleFinal(0)
      const { data } = await supabase.from('planta_registros').select('*').eq('planta_id', id).order('encendido_en', { ascending: false })
      if (data) setRegistros(data)
    } catch (e: any) { setError(e.message) }
    finally { setApagando(false) }
  }

  async function guardarCargaCombustible() {
    if (!id || cantidadCarga <= 0) return
    setCargandoCombustible(true)
    try {
      await supabase.from('planta_cargas_combustible').insert({ planta_id: id, cantidad: cantidadCarga })
      setCantidadCarga(0)
      const { data } = await supabase.from('planta_cargas_combustible').select('*').eq('planta_id', id).order('created_at', { ascending: false })
      if (data) setCargas(data)
    } catch (e: any) { setError(e.message) }
    finally { setCargandoCombustible(false) }
  }

  async function guardarMantenimiento() {
    if (!id || !user) return
    setGuardandoMantenimiento(true)
    try {
      await supabase.from('planta_mantenimientos').insert({ planta_id: id, realizado_por: user.id, ...formMantenimiento })
      setFormMantenimiento({ tipo: 'Cambio de aceite', descripcion: '', costo: 0, observaciones: '' })
      const { data } = await supabase.from('planta_mantenimientos').select('*').eq('planta_id', id).order('created_at', { ascending: false })
      if (data) setMantenimientos(data)
    } catch (e: any) { setError(e.message) }
    finally { setGuardandoMantenimiento(false) }
  }

  if (loading) return <LoadingScreen />
  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-red-600">{error}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Volver al inicio</Link>
      </div>
    </div>
  )
  if (!planta) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-slate-500">Planta no encontrada</p>
        <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Volver al inicio</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Verification header */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <svg className="h-10 w-10 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Planta verificada</h1>
              <p className="text-sm text-slate-500">Confirme que los datos coinciden con la planta fisica</p>
            </div>
            <Link to="/" className="ml-auto shrink-0 text-sm text-blue-600 hover:underline">Inicio</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm">
            <div><span className="text-slate-500">Supermercado:</span> <span className="font-semibold text-slate-800">{supermercado}</span></div>
            <div><span className="text-slate-500">Marca:</span> <span className="font-semibold text-slate-800">{planta.marca}</span></div>
            <div><span className="text-slate-500">Modelo:</span> <span className="font-semibold text-slate-800">{planta.modelo}</span></div>
            <div><span className="text-slate-500">Cap. Electrica:</span> <span className="font-semibold text-slate-800">{planta.capacidad_electrica}</span></div>
            <div><span className="text-slate-500">Cap. Combustible:</span> <span className="font-semibold text-slate-800">{planta.capacidad_combustible}</span></div>
            <div><span className="text-slate-500">Consumo:</span> <span className="font-semibold text-slate-800">{planta.combustible_por_hora} L/h</span></div>
          </div>
        </div>

        {/* Current status */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Estado actual</h2>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                  registroActivo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${registroActivo ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                  {registroActivo ? 'ENCENDIDA' : 'APAGADA'}
                </span>
                <span className="text-sm text-slate-500">{horasTotales.toFixed(1)} horas totales</span>
                {alertaAceite && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Cambio aceite ({horasDesdeUltCambio.toFixed(1)}h / {planta.horas_para_cambio_aceite}h)
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!registroActivo ? (
                <div className="flex items-end gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Comb. inicial (L)</label>
                    <input type="number" min={0} step={0.1} value={combustibleInicial}
                      onChange={(e) => setCombustibleInicial(parseFloat(e.target.value) || 0)}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    />
                  </div>
                  <button onClick={encender} disabled={encendiendo}
                    className="h-[38px] rounded-lg bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {encendiendo ? '...' : 'Encender'}
                  </button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Comb. final (L)</label>
                    <input type="number" min={0} step={0.1} value={combustibleFinal}
                      onChange={(e) => setCombustibleFinal(parseFloat(e.target.value) || 0)}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    />
                  </div>
                  <button onClick={apagar} disabled={apagando}
                    className="h-[38px] rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {apagando ? '...' : 'Apagar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cargar combustible */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Cargar combustible</h2>
          <div className="flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Cantidad (L)</label>
              <input type="number" min={0.1} step={0.1} value={cantidadCarga || ''}
                onChange={(e) => setCantidadCarga(parseFloat(e.target.value) || 0)}
                className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
            <button onClick={guardarCargaCombustible} disabled={cargandoCombustible || cantidadCarga <= 0}
              className="h-[38px] rounded-lg bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {cargandoCombustible ? '...' : 'Registrar carga'}
            </button>
          </div>
          {cargas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {cargas.slice(0, 5).map((c) => (
                <span key={c.id} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                  +{c.cantidad}L · {new Date(c.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Mantenimiento */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Realizar mantenimiento</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
              <select value={formMantenimiento.tipo}
                onChange={(e) => setFormMantenimiento({ ...formMantenimiento, tipo: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              >
                {TIPOS_MANTENIMIENTO.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Costo ($)</label>
              <input type="number" min={0} step={0.01} value={formMantenimiento.costo}
                onChange={(e) => setFormMantenimiento({ ...formMantenimiento, costo: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Descripcion</label>
            <textarea value={formMantenimiento.descripcion}
              onChange={(e) => setFormMantenimiento({ ...formMantenimiento, descripcion: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              rows={2} placeholder="Describa el trabajo realizado..."
            />
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Observaciones</label>
            <textarea value={formMantenimiento.observaciones}
              onChange={(e) => setFormMantenimiento({ ...formMantenimiento, observaciones: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              rows={1}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={guardarMantenimiento} disabled={guardandoMantenimiento}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {guardandoMantenimiento ? 'Guardando...' : 'Registrar mantenimiento'}
            </button>
          </div>
        </div>

        {/* History accordion */}
        {(registros.length > 0 || mantenimientos.length > 0) && (
          <details className="rounded-xl bg-white shadow-sm open:shadow-md">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl">
              Ver historial completo
            </summary>
            <div className="border-t border-slate-100 p-6 space-y-6">
              {registros.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Sesiones de operacion</h3>
                  <div className="space-y-2">
                    {registros.map((r) => {
                      const horas = calcularHoras(r.encendido_en, r.apagado_en)
                      return (
                        <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-100 p-3 text-sm">
                          <span className="text-slate-500">
                            {new Date(r.encendido_en).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-slate-300">→</span>
                          <span className="text-slate-500">
                            {r.apagado_en ? new Date(r.apagado_en).toLocaleDateString('es-VE', { hour: '2-digit', minute: '2-digit' }) : <span className="text-green-600 font-medium">En curso</span>}
                          </span>
                          {r.apagado_en && <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{horas.toFixed(1)}h</span>}
                          <span className="text-slate-400">
                            {r.apagado_en
                              ? `Comb: ${r.combustible_inicial}L → ${r.combustible_final}L${r.combustible_final != null ? ` (${(r.combustible_inicial - r.combustible_final).toFixed(1)}L)` : ''}`
                              : `Comb. inicial: ${r.combustible_inicial}L`
                            }
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {mantenimientos.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Historial de mantenimientos</h3>
                  <div className="space-y-2">
                    {mantenimientos.map((m) => (
                      <div key={m.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">{m.tipo}</span>
                          <span className="text-slate-500">{new Date(m.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-slate-600">${m.costo.toFixed(2)}</span>
                        </div>
                        {m.descripcion && <p className="mt-1 text-slate-600">{m.descripcion}</p>}
                        {m.observaciones && <p className="mt-0.5 text-xs text-slate-400">Obs: {m.observaciones}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
