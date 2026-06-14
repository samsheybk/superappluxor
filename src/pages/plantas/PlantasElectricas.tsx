import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { IconAgregar, IconEditar, IconEliminar } from '../../components/Icons'
import { LoadingScreen } from '../../components/LoadingScreen'
import QRCode from 'qrcode'

type Tab = 'plantas' | 'mantenimiento' | 'operacion'

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
  created_at: string
}

interface Supermercado {
  id: string
  nombre: string
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

interface PlantaRegistro {
  id: string
  planta_id: string
  encendido_en: string
  apagado_en: string | null
  horometro_inicial: number
  horometro_final: number | null
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

const TIPOS_MANTENIMIENTO = ['Cambio de aceite', 'Cambio de filtros', 'Revision general', 'Otro'] as const

function PlantaModal({ planta, supermercados, onClose, onSave }: {
  planta: Partial<Planta> | null
  supermercados: Supermercado[]
  onClose: () => void
  onSave: (p: Partial<Planta>) => Promise<void>
}) {
  const [form, setForm] = useState({
    supermercado_id: planta?.supermercado_id ?? '',
    marca: planta?.marca ?? '',
    modelo: planta?.modelo ?? '',
    capacidad_electrica: planta?.capacidad_electrica ?? '',
    capacidad_combustible: planta?.capacidad_combustible ?? '',
    combustible_por_hora: planta?.combustible_por_hora ?? 0,
    horas_para_cambio_aceite: planta?.horas_para_cambio_aceite ?? 250,
  })
  const [guardando, setGuardando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      await onSave({ ...form, id: planta?.id })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">
          {planta?.id ? 'Editar planta' : 'Agregar planta'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Supermercado</label>
            <select required value={form.supermercado_id}
              onChange={(e) => setForm({ ...form, supermercado_id: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            >
              <option value="">-- Seleccione --</option>
              {supermercados.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Marca</label>
              <input type="text" required value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Modelo</label>
              <input type="text" required value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Capacidad eléctrica</label>
            <input type="text" required value={form.capacidad_electrica}
              onChange={(e) => setForm({ ...form, capacidad_electrica: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              placeholder="Ej: 150 kVA"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Capacidad de combustible</label>
            <input type="text" required value={form.capacidad_combustible}
              onChange={(e) => setForm({ ...form, capacidad_combustible: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              placeholder="Ej: 100 L"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Consumo (L/hora)</label>
              <input type="number" min={0} step={0.1} value={form.combustible_por_hora}
                onChange={(e) => setForm({ ...form, combustible_por_hora: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Cambio aceite (horas)</label>
              <input type="number" min={1} step={1} value={form.horas_para_cambio_aceite}
                onChange={(e) => setForm({ ...form, horas_para_cambio_aceite: parseFloat(e.target.value) || 250 })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                placeholder="250"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : planta?.id ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PlantQRModal({ planta, supNombre, onClose }: {
  planta: Planta
  supNombre: string
  onClose: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const url = `${window.location.origin}/plantas/${planta.id}`
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 250, margin: 2 }, (err) => {
        if (err) console.error(err)
      })
    }
  }, [url])

  async function copiarUrl() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">QR de planta</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <canvas ref={canvasRef} />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-800">{supNombre}</p>
            <p className="text-sm text-slate-500">{planta.marca} {planta.modelo}</p>
            <div className="mt-2 flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
              <span className="flex-1 break-all text-xs text-slate-500">{url}</span>
              <button onClick={copiarUrl}
                className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
              >
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <button onClick={onClose}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function calcularHoras(inicial: number | null, final: number | null) {
  if (inicial == null || final == null) return 0
  return Math.max(0, final - inicial) / 60
}

export function PlantasElectricas() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('plantas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [plantas, setPlantas] = useState<Planta[]>([])
  const [supermercados, setSupermercados] = useState<Supermercado[]>([])
  const [plantaModal, setPlantaModal] = useState<Partial<Planta> | null>(null)

  const [plantaSeleccionada, setPlantaSeleccionada] = useState<string>('')
  const [mantenimientos, setMantenimientos] = useState<PlantaMantenimiento[]>([])
  const [formMantenimiento, setFormMantenimiento] = useState({
    tipo: 'Cambio de aceite', descripcion: '', costo: 0, observaciones: '',
  })
  const [guardandoMantenimiento, setGuardandoMantenimiento] = useState(false)

  const [registros, setRegistros] = useState<PlantaRegistro[]>([])
  const [cargas, setCargas] = useState<PlantaCarga[]>([])
  const [encendiendo, setEncendiendo] = useState(false)
  const [apagando, setApagando] = useState(false)
  const [horometroInicial, setHorometroInicial] = useState(0)
  const [horometroFinal, setHorometroFinal] = useState(0)
  const [combustibleInicial, setCombustibleInicial] = useState(0)
  const [combustibleFinal, setCombustibleFinal] = useState(0)
  const [cargandoCombustible, setCargandoCombustible] = useState(false)
  const [cantidadCarga, setCantidadCarga] = useState(0)
  const [qrPlanta, setQrPlanta] = useState<Planta | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [supRes, plaRes] = await Promise.all([
          supabase.from('supermercados').select('id, nombre').order('nombre'),
          supabase.from('plantas_electricas').select('*').order('marca'),
        ])
        if (supRes.error) throw supRes.error
        if (plaRes.error) throw plaRes.error
        setSupermercados(supRes.data ?? [])
        setPlantas(plaRes.data ?? [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!plantaSeleccionada) {
      setMantenimientos([])
      setRegistros([])
      setCargas([])
      return
    }
    setHorometroInicial(0)
    setHorometroFinal(0)
    setCombustibleInicial(0)
    setCombustibleFinal(0)
    ;(async () => {
      const [manRes, regRes, carRes] = await Promise.all([
        supabase.from('planta_mantenimientos').select('*')
          .eq('planta_id', plantaSeleccionada)
          .order('created_at', { ascending: false }),
        supabase.from('planta_registros').select('*')
          .eq('planta_id', plantaSeleccionada)
          .order('encendido_en', { ascending: false }),
        supabase.from('planta_cargas_combustible').select('*')
          .eq('planta_id', plantaSeleccionada)
          .order('created_at', { ascending: false }),
      ])
      if (manRes.data) setMantenimientos(manRes.data)
      if (regRes.data) setRegistros(regRes.data)
      if (carRes.data) setCargas(carRes.data)
    })()
  }, [plantaSeleccionada])

  const supMap: Record<string, string> = {}
  for (const s of supermercados) supMap[s.id] = s.nombre

  const registroActivo = registros.find((r) => !r.apagado_en)
  const plantaSel = plantas.find((p) => p.id === plantaSeleccionada)

  const horasTotales = registros.reduce((sum, r) => sum + calcularHoras(r.horometro_inicial, r.horometro_final), 0)

  const ultCambioAceite = (() => {
    for (const m of mantenimientos) if (m.tipo === 'Cambio de aceite') return m
    return null
  })()
  const horasDesdeUltCambio = ultCambioAceite
    ? registros
        .filter((r) => r.apagado_en && new Date(r.apagado_en) > new Date(ultCambioAceite.created_at))
        .reduce((sum, r) => sum + calcularHoras(r.horometro_inicial, r.horometro_final), 0)
    : horasTotales
  const alertaAceite = plantaSel ? horasDesdeUltCambio >= plantaSel.horas_para_cambio_aceite : false

  async function guardarPlanta(p: Partial<Planta>) {
    const payload: Record<string, any> = {
      supermercado_id: p.supermercado_id, marca: p.marca, modelo: p.modelo,
      capacidad_electrica: p.capacidad_electrica, capacidad_combustible: p.capacidad_combustible,
      combustible_por_hora: p.combustible_por_hora, horas_para_cambio_aceite: p.horas_para_cambio_aceite,
    }
    if (p.id) {
      const { error } = await supabase.from('plantas_electricas').update(payload).eq('id', p.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('plantas_electricas').insert(payload)
      if (error) throw error
    }
    const { data } = await supabase.from('plantas_electricas').select('*').order('marca')
    setPlantas(data ?? [])
    setPlantaModal(null)
  }

  async function desactivarPlanta(id: string) {
    await supabase.from('plantas_electricas').update({ activo: false }).eq('id', id)
    setPlantas(plantas.map((p) => p.id === id ? { ...p, activo: false } : p))
  }

  async function encender() {
    if (!plantaSeleccionada || !user) return
    setEncendiendo(true)
    try {
      const { error } = await supabase.from('planta_registros').insert({
        planta_id: plantaSeleccionada,
        encendido_en: new Date().toISOString(),
        horometro_inicial: horometroInicial,
        combustible_inicial: combustibleInicial,
      })
      if (error) throw error
      setHorometroInicial(0)
      setCombustibleInicial(0)
      const { data } = await supabase.from('planta_registros').select('*')
        .eq('planta_id', plantaSeleccionada)
        .order('encendido_en', { ascending: false })
      if (data) setRegistros(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setEncendiendo(false)
    }
  }

  async function apagar() {
    if (!registroActivo || !user) return
    setApagando(true)
    try {
      const { error } = await supabase.from('planta_registros').update({
        apagado_en: new Date().toISOString(),
        horometro_final: horometroFinal,
        combustible_final: combustibleFinal,
      }).eq('id', registroActivo.id)
      if (error) throw error
      setHorometroFinal(0)
      setCombustibleFinal(0)
      const { data } = await supabase.from('planta_registros').select('*')
        .eq('planta_id', plantaSeleccionada)
        .order('encendido_en', { ascending: false })
      if (data) setRegistros(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setApagando(false)
    }
  }

  async function guardarCargaCombustible() {
    if (!plantaSeleccionada || cantidadCarga <= 0) return
    setCargandoCombustible(true)
    try {
      const { error } = await supabase.from('planta_cargas_combustible').insert({
        planta_id: plantaSeleccionada,
        cantidad: cantidadCarga,
      })
      if (error) throw error
      setCantidadCarga(0)
      const { data } = await supabase.from('planta_cargas_combustible').select('*')
        .eq('planta_id', plantaSeleccionada)
        .order('created_at', { ascending: false })
      if (data) setCargas(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCargandoCombustible(false)
    }
  }

  async function guardarMantenimiento() {
    if (!plantaSeleccionada || !user) return
    setGuardandoMantenimiento(true)
    try {
      const { error } = await supabase.from('planta_mantenimientos').insert({
        planta_id: plantaSeleccionada, realizado_por: user.id,
        ...formMantenimiento,
      })
      if (error) throw error
      setFormMantenimiento({ tipo: 'Cambio de aceite', descripcion: '', costo: 0, observaciones: '' })
      const { data } = await supabase.from('planta_mantenimientos').select('*')
        .eq('planta_id', plantaSeleccionada)
        .order('created_at', { ascending: false })
      setMantenimientos(data ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGuardandoMantenimiento(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="mb-2 inline-block text-sm text-blue-600 hover:underline">← Volver al panel</Link>
        <div className="flex items-center gap-3">
          <svg className="h-8 w-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Plantas electricas</h1>
            <p className="text-slate-500">Operaciones</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {([
          { key: 'plantas', label: 'Plantas' },
          { key: 'operacion', label: 'Operación' },
          { key: 'mantenimiento', label: 'Mantenimiento' },
        ] as const).map((t) => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: PLANTAS */}
      {tab === 'plantas' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">{plantas.length} planta(s) registrada(s)</p>
            <button onClick={() => setPlantaModal({})}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <IconAgregar className="h-4 w-4" />
              Agregar planta
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="p-3 font-medium">Supermercado</th>
                  <th className="p-3 font-medium">Marca</th>
                  <th className="p-3 font-medium">Modelo</th>
                  <th className="p-3 font-medium">Cap. Eléctrica</th>
                  <th className="p-3 font-medium">Cap. Combustible</th>
                  <th className="p-3 font-medium">Consumo (L/h)</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plantas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No hay plantas registradas
                    </td>
                  </tr>
                ) : plantas.map((p) => (
                  <tr key={p.id} className={`border-b border-slate-100 ${!p.activo ? 'opacity-50' : ''}`}>
                    <td className="p-3 text-slate-800">{supMap[p.supermercado_id] ?? '—'}</td>
                    <td className="p-3 text-slate-600">{p.marca}</td>
                    <td className="p-3 text-slate-600">{p.modelo}</td>
                    <td className="p-3 text-slate-600">{p.capacidad_electrica}</td>
                    <td className="p-3 text-slate-600">{p.capacidad_combustible}</td>
                    <td className="p-3 text-slate-600">{p.combustible_por_hora}</td>
                    <td className="p-3">
                      {p.activo
                        ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Activo</span>
                        : <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Inactivo</span>
                      }
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => setQrPlanta(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-purple-600"
                          title="Ver QR"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </button>
                        <button onClick={() => setPlantaModal(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                          title="Editar"
                        >
                          <IconEditar />
                        </button>
                        {p.activo && (
                          <button onClick={() => desactivarPlanta(p.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                            title="Deshabilitar"
                          >
                            <IconEliminar />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {plantaModal !== null && (
            <PlantaModal
              planta={plantaModal}
              supermercados={supermercados}
              onClose={() => setPlantaModal(null)}
              onSave={guardarPlanta}
            />
          )}
          {qrPlanta && (
            <PlantQRModal
              planta={qrPlanta}
              supNombre={supMap[qrPlanta.supermercado_id] ?? '—'}
              onClose={() => setQrPlanta(null)}
            />
          )}
        </div>
      )}

      {/* TAB: OPERACION */}
      {tab === 'operacion' && (
        <div className="space-y-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Seleccionar planta</label>
            <select value={plantaSeleccionada} onChange={(e) => setPlantaSeleccionada(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            >
              <option value="">-- Seleccione --</option>
              {plantas.filter((p) => p.activo).map((p) => (
                <option key={p.id} value={p.id}>
                  {supMap[p.supermercado_id]} — {p.marca} {p.modelo}
                </option>
              ))}
            </select>
          </div>

          {plantaSeleccionada && plantaSel && (
            <>
              {/* Estado actual */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Estado actual</h3>
                    <div className="mt-2 flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                        registroActivo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${registroActivo ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                        {registroActivo ? 'ENCENDIDA' : 'APAGADA'}
                      </span>
                      <span className="text-sm text-slate-500">
                        {horasTotales.toFixed(1)} horas totales
                      </span>
                      {alertaAceite && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Cambio de aceite ({horasDesdeUltCambio.toFixed(1)}h / {plantaSel.horas_para_cambio_aceite}h)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!registroActivo ? (
                      <div className="flex items-end gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Horómetro actual (h)</label>
                          <input type="number" min={0} step={0.1} value={horometroInicial}
                            onChange={(e) => setHorometroInicial(parseFloat(e.target.value) || 0)}
                            className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Combustible inicial (L)</label>
                          <input type="number" min={0} step={0.1} value={combustibleInicial}
                            onChange={(e) => setCombustibleInicial(parseFloat(e.target.value) || 0)}
                            className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
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
                          <label className="mb-1 block text-xs font-medium text-slate-600">Horómetro actual (h)</label>
                          <input type="number" min={0} step={0.1} value={horometroFinal}
                            onChange={(e) => setHorometroFinal(parseFloat(e.target.value) || 0)}
                            className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Combustible final (L)</label>
                          <input type="number" min={0} step={0.1} value={combustibleFinal}
                            onChange={(e) => setCombustibleFinal(parseFloat(e.target.value) || 0)}
                            className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
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
                <h3 className="mb-4 text-lg font-semibold text-slate-800">Cargar combustible</h3>
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
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-slate-600">Últimas cargas</p>
                    <div className="flex flex-wrap gap-2">
                      {cargas.slice(0, 5).map((c) => (
                        <span key={c.id} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                          +{c.cantidad}L · {new Date(c.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Historial de sesiones */}
              {registros.length > 0 && (
                <div className="rounded-xl bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-800">Historial de operación</h3>
                  <div className="space-y-2">
                    {registros.map((r) => {
                      const horas = calcularHoras(r.horometro_inicial, r.horometro_final)
                      const consumo = horas > 0 && r.combustible_inicial != null && r.combustible_final != null
                        ? (r.combustible_inicial - r.combustible_final)
                        : null
                      return (
                        <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-100 p-3 text-sm">
                          <span className="text-slate-500">
                            {new Date(r.encendido_en).toLocaleDateString('es-VE', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          <span className="text-slate-300">→</span>
                          <span className="text-slate-500">
                            {r.apagado_en
                              ? new Date(r.apagado_en).toLocaleDateString('es-VE', { hour: '2-digit', minute: '2-digit' })
                              : <span className="text-green-600 font-medium">En curso</span>
                            }
                          </span>
                          {r.apagado_en && (
                            <>
                              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {horas.toFixed(1)}h
                              </span>
                              <span className="text-slate-400">
                                H: {r.horometro_inicial} → {r.horometro_final}
                              </span>
                              <span className="text-slate-400">
                                Comb: {r.combustible_inicial}L → {r.combustible_final}L
                                {consumo !== null && ` (${consumo.toFixed(1)}L)`}
                              </span>
                            </>
                          )}
                          {!r.apagado_en && (
                            <span className="text-slate-400">
                              H: {r.horometro_inicial}h · Comb: {r.combustible_inicial}L
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {registros.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl bg-white py-12 shadow-sm">
                  <p className="text-sm text-slate-400">No hay registros de operación para esta planta</p>
                </div>
              )}
            </>
          )}

          {!plantaSeleccionada && (
            <div className="flex items-center justify-center rounded-xl bg-white py-12 shadow-sm">
              <p className="text-sm text-slate-400">Seleccione una planta para ver su operación</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: MANTENIMIENTO */}
      {tab === 'mantenimiento' && (
        <div className="space-y-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Seleccionar planta</label>
            <select value={plantaSeleccionada} onChange={(e) => setPlantaSeleccionada(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            >
              <option value="">-- Seleccione --</option>
              {plantas.filter((p) => p.activo).map((p) => (
                <option key={p.id} value={p.id}>
                  {supMap[p.supermercado_id]} — {p.marca} {p.modelo}
                </option>
              ))}
            </select>
          </div>

          {plantaSeleccionada && (
            <>
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-800">Registrar mantenimiento</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
                    <select value={formMantenimiento.tipo}
                      onChange={(e) => setFormMantenimiento({ ...formMantenimiento, tipo: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    >
                      {TIPOS_MANTENIMIENTO.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
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
                  <label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
                  <textarea value={formMantenimiento.descripcion}
                    onChange={(e) => setFormMantenimiento({ ...formMantenimiento, descripcion: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    rows={3}
                    placeholder="Describa el trabajo realizado..."
                  />
                </div>
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Observaciones</label>
                  <textarea value={formMantenimiento.observaciones}
                    onChange={(e) => setFormMantenimiento({ ...formMantenimiento, observaciones: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    rows={2}
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

              {mantenimientos.length > 0 && (
                <div className="rounded-xl bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-800">Historial de mantenimientos</h3>
                  <div className="space-y-3">
                    {mantenimientos.map((m) => (
                      <div key={m.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                              {m.tipo}
                            </span>
                            <span className="text-sm text-slate-500">
                              {new Date(m.created_at).toLocaleDateString('es-VE', {
                                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                            <span className="text-sm text-slate-600">${m.costo.toFixed(2)}</span>
                          </div>
                        </div>
                        {m.descripcion && (
                          <p className="mt-2 text-sm text-slate-600">{m.descripcion}</p>
                        )}
                        {m.observaciones && (
                          <p className="mt-1 text-xs text-slate-400">Obs: {m.observaciones}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mantenimientos.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl bg-white py-12 shadow-sm">
                  <p className="text-sm text-slate-400">No hay mantenimientos registrados para esta planta</p>
                </div>
              )}
            </>
          )}

          {!plantaSeleccionada && (
            <div className="flex items-center justify-center rounded-xl bg-white py-12 shadow-sm">
              <p className="text-sm text-slate-400">Seleccione una planta para ver sus mantenimientos</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
