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
  id: string; planta_id: string; encendido_en: string; apagado_en: string | null
  horometro_inicial: number; horometro_final: number | null
  combustible_inicial: number; combustible_final: number | null; created_at: string
}

interface PlantaCarga {
  id: string; planta_id: string; cantidad: number; created_at: string
}

interface PlantaMantenimiento {
  id: string; planta_id: string; realizado_por: string
  tipo: string; descripcion: string; costo: number; observaciones: string; created_at: string
}

const TIPOS_MANTENIMIENTO = ['Cambio de aceite', 'Cambio de filtros', 'Revision general', 'Otro'] as const
type Accion = 'encender' | 'cargar' | 'mantenimiento' | 'reportar' | null

function calcularHoras(inicial: number | null, final: number | null) {
  if (inicial == null || final == null) return 0
  return Math.round(Math.max(0, final - inicial) / 60 * 100) / 100
}

function IconPower() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}

function IconFuel() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  )
}

function IconWrench() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconHistory() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export function VerificarPlanta() {
  const { id } = useParams<{ id: string }>()
  const { user, perfil } = useAuth()
  const [planta, setPlanta] = useState<Planta | null>(null)
  const [supermercado, setSupermercado] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accion, setAccion] = useState<Accion>(null)

  const [registros, setRegistros] = useState<PlantaRegistro[]>([])
  const [cargas, setCargas] = useState<PlantaCarga[]>([])
  const [mantenimientos, setMantenimientos] = useState<PlantaMantenimiento[]>([])

  const [combustibleInicial, setCombustibleInicial] = useState(0)
  const [combustibleFinal, setCombustibleFinal] = useState(0)
  const [horometroInicial, setHorometroInicial] = useState(0)
  const [horometroFinal, setHorometroFinal] = useState(0)
  const [encendiendo, setEncendiendo] = useState(false)
  const [apagando, setApagando] = useState(false)
  const [cantidadCarga, setCantidadCarga] = useState(0)
  const [cargandoCombustible, setCargandoCombustible] = useState(false)
  const [formMantenimiento, setFormMantenimiento] = useState({ tipo: 'Cambio de aceite', descripcion: '', costo: 0, observaciones: '' })
  const [guardandoMantenimiento, setGuardandoMantenimiento] = useState(false)
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [reporteDetalle, setReporteDetalle] = useState('')
  type FiltroHistorial = 'todo' | 'sesiones' | 'mantenimientos' | 'cargas'
  const [filtroHistorial, setFiltroHistorial] = useState<FiltroHistorial>('todo')

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
      } catch (e: any) { setError(e.message) }
      finally { setLoading(false) }
    })()
  }, [id])

  const registroActivo = registros.find((r) => !r.apagado_en)
  const horasTotales = registros.reduce((sum, r) => sum + calcularHoras(r.horometro_inicial, r.horometro_final), 0)
  const ultCambioAceite = (() => { for (const m of mantenimientos) if (m.tipo === 'Cambio de aceite') return m; return null })()
  const horasDesdeUltCambio = ultCambioAceite
    ? registros.filter((r) => r.apagado_en && new Date(r.apagado_en) > new Date(ultCambioAceite.created_at)).reduce((sum, r) => sum + calcularHoras(r.horometro_inicial, r.horometro_final), 0)
    : horasTotales
  const alertaAceite = planta ? horasDesdeUltCambio >= planta.horas_para_cambio_aceite : false

  const registrosAsc = [...registros].reverse()
  const saldoInicial = registrosAsc.length > 0 ? registrosAsc[0].combustible_inicial : 0
  const totalCargasGas = cargas.reduce((sum, c) => sum + c.cantidad, 0)
  const totalConsumido = registros.filter((r) => r.apagado_en != null && r.combustible_final != null)
    .reduce((sum, r) => sum + Math.max(0, r.combustible_inicial - r.combustible_final!), 0)
  const saldoActual = saldoInicial + totalCargasGas - totalConsumido

  async function encender() {
    if (!id || !user) return; setEncendiendo(true)
    try {
      await supabase.from('planta_registros').insert({ planta_id: id, encendido_en: new Date().toISOString(), horometro_inicial: horometroInicial, combustible_inicial: combustibleInicial })
      setHorometroInicial(0); setCombustibleInicial(0); setAccion(null)
      const { data } = await supabase.from('planta_registros').select('*').eq('planta_id', id).order('encendido_en', { ascending: false })
      if (data) setRegistros(data)
    } catch (e: any) { setError(e.message) } finally { setEncendiendo(false) }
  }

  async function apagar() {
    if (!registroActivo || !user) return; setApagando(true)
    try {
      await supabase.from('planta_registros').update({ apagado_en: new Date().toISOString(), horometro_final: horometroFinal, combustible_final: combustibleFinal }).eq('id', registroActivo.id)
      setHorometroFinal(0); setCombustibleFinal(0); setAccion(null)
      const { data } = await supabase.from('planta_registros').select('*').eq('planta_id', id).order('encendido_en', { ascending: false })
      if (data) setRegistros(data)
    } catch (e: any) { setError(e.message) } finally { setApagando(false) }
  }

  async function guardarCargaCombustible() {
    if (!id || cantidadCarga <= 0) return; setCargandoCombustible(true)
    try {
      await supabase.from('planta_cargas_combustible').insert({ planta_id: id, cantidad: cantidadCarga })
      setCantidadCarga(0); setAccion(null)
      const { data } = await supabase.from('planta_cargas_combustible').select('*').eq('planta_id', id).order('created_at', { ascending: false })
      if (data) setCargas(data)
    } catch (e: any) { setError(e.message) } finally { setCargandoCombustible(false) }
  }

  async function guardarMantenimiento() {
    if (!id || !user) return; setGuardandoMantenimiento(true)
    try {
      await supabase.from('planta_mantenimientos').insert({ planta_id: id, realizado_por: user.id, ...formMantenimiento })
      setFormMantenimiento({ tipo: 'Cambio de aceite', descripcion: '', costo: 0, observaciones: '' })
      setAccion(null)
      const { data } = await supabase.from('planta_mantenimientos').select('*').eq('planta_id', id).order('created_at', { ascending: false })
      if (data) setMantenimientos(data)
    } catch (e: any) { setError(e.message) } finally { setGuardandoMantenimiento(false) }
  }

  const WA_NUMBER = '584128445726'

  function enviarReporteWhatsApp() {
    if (!reporteDetalle.trim() || !planta) return
    const ahora = new Date().toLocaleString('es-VE', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
    const usuario = perfil?.username ?? user?.email ?? '—'
    const texto = [
      '⚠️ *REPORTE DE FALLA*',
      '',
      `🏪 *Supermercado:* ${supermercado}`,
      `⚡ *Planta:* ${planta.marca} ${planta.modelo}`,
      `👤 *Usuario:* ${usuario}`,
      `🕐 *Hora:* ${ahora}`,
      '',
      `📝 *Detalle:*`,
      reporteDetalle.trim(),
      '',
      '📸 *Fotos:* (adjuntar manualmente)',
    ].join('\n')

    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(texto)}`, '_blank')
    setReporteDetalle('')
    setAccion(null)
  }

  if (loading) return <LoadingScreen />
  if (error || !planta) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-red-600">{error ?? 'Planta no encontrada'}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Volver al inicio</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Fixed top bar */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/">
            <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 truncate">
            <span className="text-sm font-semibold text-slate-800">{supermercado}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="text-sm text-slate-500">{planta.marca} {planta.modelo}</span>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            registroActivo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
          }`}>
            <span className={`h-2 w-2 rounded-full ${registroActivo ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
            {registroActivo ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4 pb-8">
        {/* Verification badge */}
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-sm">
          <svg className="h-5 w-5 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-slate-500">Planta verificada:</span>
          <span className="text-xs font-medium text-slate-700">{planta.capacidad_electrica} · {planta.capacidad_combustible}</span>
          {alertaAceite && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Aceite
            </span>
          )}
          <span className="ml-auto text-xs text-slate-400">{horasTotales.toFixed(1)}h</span>
        </div>

        {/* Fuel balance */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-slate-500">Gasoil inicial</p>
            <p className="text-lg font-bold text-slate-700">{saldoInicial.toFixed(1)} <span className="text-xs font-normal">L</span></p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-slate-500">+ Gasoil</p>
            <p className="text-lg font-bold text-amber-600">+{totalCargasGas.toFixed(1)} <span className="text-xs font-normal">L</span></p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-slate-500">Consumido</p>
            <p className="text-lg font-bold text-red-600">-{totalConsumido.toFixed(1)} <span className="text-xs font-normal">L</span></p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-xs text-slate-500">Gasoil actual</p>
            <p className={`text-lg font-bold ${saldoActual < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {saldoActual.toFixed(1)} <span className="text-xs font-normal">L</span>
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-4 gap-3">
          <button onClick={() => setAccion(accion === 'encender' ? null : 'encender')}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-4 text-sm font-medium transition-all ${
              accion === 'encender' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
            }`}
          >
            <IconPower />
            {registroActivo ? 'Apagar' : 'Encender'}
          </button>
          <button onClick={() => setAccion(accion === 'cargar' ? null : 'cargar')}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-4 text-sm font-medium transition-all ${
              accion === 'cargar' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
            }`}
          >
            <IconFuel />
            Cargar comb.
          </button>
          <button onClick={() => setAccion(accion === 'mantenimiento' ? null : 'mantenimiento')}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-4 text-sm font-medium transition-all ${
              accion === 'mantenimiento' ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
            }`}
          >
            <IconWrench />
            Mantenimiento
          </button>
          <button onClick={() => setAccion(accion === 'reportar' ? null : 'reportar')}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-4 text-sm font-medium transition-all ${
              accion === 'reportar' ? 'bg-red-100 text-red-700 ring-2 ring-red-500' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
            }`}
          >
            <IconAlert />
            Reportar
          </button>
        </div>

        {/* Encender / Apagar form */}
        {accion === 'encender' && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            {!registroActivo ? (
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Horómetro actual (h)</label>
                  <input type="number" min={0} step={0.1} value={horometroInicial}
                    onChange={(e) => setHorometroInicial(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Combustible inicial (L)</label>
                  <input type="number" min={0} step={0.1} value={combustibleInicial}
                    onChange={(e) => setCombustibleInicial(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  />
                </div>
                <button onClick={encender} disabled={encendiendo}
                  className="h-[38px] rounded-lg bg-green-600 px-6 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {encendiendo ? '...' : 'Encender'}
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Horómetro actual (h)</label>
                  <input type="number" min={0} step={0.1} value={horometroFinal}
                    onChange={(e) => setHorometroFinal(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Combustible final (L)</label>
                  <input type="number" min={0} step={0.1} value={combustibleFinal}
                    onChange={(e) => setCombustibleFinal(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  />
                </div>
                <button onClick={apagar} disabled={apagando}
                  className="h-[38px] rounded-lg bg-red-600 px-6 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {apagando ? '...' : 'Apagar'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cargar combustible form */}
        {accion === 'cargar' && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">Cantidad (L)</label>
                <input type="number" min={0.1} step={0.1} value={cantidadCarga || ''}
                  onChange={(e) => setCantidadCarga(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  autoFocus
                />
              </div>
              <button onClick={guardarCargaCombustible} disabled={cargandoCombustible || cantidadCarga <= 0}
                className="h-[38px] rounded-lg bg-amber-600 px-6 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {cargandoCombustible ? '...' : 'Registrar'}
              </button>
            </div>
            {cargas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {cargas.slice(0, 5).map((c) => (
                  <span key={c.id} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                    +{c.cantidad}L {new Date(c.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mantenimiento form */}
        {accion === 'mantenimiento' && (
          <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Tipo</label>
                <select value={formMantenimiento.tipo}
                  onChange={(e) => setFormMantenimiento({ ...formMantenimiento, tipo: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                >
                  {TIPOS_MANTENIMIENTO.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Costo ($)</label>
                <input type="number" min={0} step={0.01} value={formMantenimiento.costo}
                  onChange={(e) => setFormMantenimiento({ ...formMantenimiento, costo: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Descripcion</label>
              <textarea value={formMantenimiento.descripcion}
                onChange={(e) => setFormMantenimiento({ ...formMantenimiento, descripcion: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                rows={2} placeholder="Describa el trabajo..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Observaciones</label>
              <textarea value={formMantenimiento.observaciones}
                onChange={(e) => setFormMantenimiento({ ...formMantenimiento, observaciones: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                rows={1}
              />
            </div>
            <div className="flex justify-end">
              <button onClick={guardarMantenimiento} disabled={guardandoMantenimiento}
                className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {guardandoMantenimiento ? 'Guardando...' : 'Registrar mantenimiento'}
              </button>
            </div>
          </div>
        )}

        {/* Reportar falla form */}
        {accion === 'reportar' && (
          <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Detalle de la falla</label>
              <textarea value={reporteDetalle}
                onChange={(e) => setReporteDetalle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                rows={4} placeholder="Describa la falla..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAccion(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button onClick={enviarReporteWhatsApp} disabled={!reporteDetalle.trim()}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Enviar por WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* History toggle */}
        {(registros.length > 0 || mantenimientos.length > 0 || cargas.length > 0) && (
          <div className="rounded-xl bg-white shadow-sm">
            <button onClick={() => { setHistorialAbierto(!historialAbierto); setFiltroHistorial('todo') }}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl"
            >
              <IconHistory />
              Historial
              <span className="ml-auto text-xs text-slate-400">{registros.length} encendidos · {mantenimientos.length} mantenimientos · {cargas.length} gasoil</span>
              <svg className={`h-4 w-4 transition-transform ${historialAbierto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {historialAbierto && (
              <div className="border-t border-slate-100">
                {/* Filtros */}
                <div className="flex gap-1 border-b border-slate-100 px-4 pt-2 pb-2">
                  {(['todo', 'sesiones', 'mantenimientos', 'cargas'] as FiltroHistorial[]).map((f) => (
                    <button key={f} onClick={() => setFiltroHistorial(f)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                        filtroHistorial === f
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {({ todo: 'Todo', sesiones: 'Encendidos', mantenimientos: 'Mantenimientos', cargas: 'Gasoil' } as Record<FiltroHistorial, string>)[f]}
                    </button>
                  ))}
                </div>
                <div className="px-4 py-3 space-y-4 max-h-80 overflow-y-auto">
                  {filtroHistorial !== 'mantenimientos' && filtroHistorial !== 'cargas' && registros.map((r) => {
                    const horas = calcularHoras(r.horometro_inicial, r.horometro_final)
                    return (
                      <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                        {r.apagado_en && <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600">Encendido</span>}
                        {!r.apagado_en && <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-600">En curso</span>}
                        <span className="text-slate-500">{new Date(r.encendido_en).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-slate-300">→</span>
                        <span className="text-slate-500">{r.apagado_en ? new Date(r.apagado_en).toLocaleDateString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
                        {r.apagado_en && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-600">{horas.toFixed(1)}h</span>}
                        {r.apagado_en
                          ? <span className="text-slate-400">H: {r.horometro_inicial}→{r.horometro_final} · {r.combustible_inicial}→{r.combustible_final}L{r.combustible_final != null ? ` (${(r.combustible_inicial - r.combustible_final).toFixed(1)}L)` : ''}</span>
                          : <span className="text-slate-400">H: {r.horometro_inicial}h · Inicial: {r.combustible_inicial}L</span>
                        }
                      </div>
                    )
                  })}
                  {filtroHistorial !== 'sesiones' && filtroHistorial !== 'cargas' && mantenimientos.map((m) => (
                    <div key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      <span className="shrink-0 rounded-full bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-600">{m.tipo}</span>
                      <span className="text-slate-500">{new Date(m.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}</span>
                      <span className="text-slate-500">${m.costo.toFixed(2)}</span>
                      {m.descripcion && <span className="text-slate-400 truncate max-w-[200px]">{m.descripcion}</span>}
                    </div>
                  ))}
                  {filtroHistorial !== 'sesiones' && filtroHistorial !== 'mantenimientos' && cargas.map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600">Gasoil</span>
                      <span className="text-slate-500">{new Date(c.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-slate-600 font-medium">+{c.cantidad}L</span>
                    </div>
                  ))}
                  {(() => {
                    const total = 
                      (filtroHistorial !== 'mantenimientos' && filtroHistorial !== 'cargas' ? registros.length : 0) +
                      (filtroHistorial !== 'sesiones' && filtroHistorial !== 'cargas' ? mantenimientos.length : 0) +
                      (filtroHistorial !== 'sesiones' && filtroHistorial !== 'mantenimientos' ? cargas.length : 0)
                    return total === 0 ? <p className="text-center text-xs text-slate-400 py-4">Sin resultados</p> : null
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
