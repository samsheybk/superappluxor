import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import type { Supermercado, Area, SupermercadoArea } from '../../types'
import { Modal } from '../../components/Modal'
import { IconSupermercado, IconEditar, IconEliminar, IconAgregar, IconEvaluar, IconConcepto } from '../../components/Icons'

export function ListaSupermercados() {
  const location = useLocation()
  const [supermercados, setSupermercados] = useState<(Supermercado & { gerente?: { nombre: string; email: string } | null })[]>([])
  const [areasDisponibles, setAreasDisponibles] = useState<Area[]>([])
  const [evaluadores, setEvaluadores] = useState<{ id: string; nombre: string; email: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState((location.state as { mensaje?: string })?.mensaje ?? '')
  const [confirmarEliminar, setConfirmarEliminar] = useState<string | null>(null)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [supermercadoModal, setSupermercadoModal] = useState<Supermercado | null>(null)
  const [areasEdit, setAreasEdit] = useState<SupermercadoArea[]>([])
  const [gerenteModal, setGerenteModal] = useState('')

  const [showFormSuper, setShowFormSuper] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')

  const [showFormArea, setShowFormArea] = useState(false)
  const [nuevaAreaNombre, setNuevaAreaNombre] = useState('')

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setLoading(true)
    const sRes = await supabase.from('supermercados').select('*').order('nombre')
    if (sRes.data) {
      const conGerente = await Promise.all(
        sRes.data.map(async (s: Supermercado) => {
          if (!s.gerente_id) return { ...s, gerente: null }
          const { data: g } = await supabase.from('perfiles').select('nombre, email').eq('id', s.gerente_id).single()
          return { ...s, gerente: g ?? null }
        })
      )
      setSupermercados(conGerente)
    }
    const aRes = await supabase.from('areas').select('*').order('nombre')
    if (aRes.data) setAreasDisponibles(aRes.data as Area[])
    const pRes = await supabase.from('perfiles').select('id, nombre, email').neq('rol', 'admin').order('nombre')
    if (pRes.data) setEvaluadores(pRes.data)
    setLoading(false)
  }

  async function abrirModal(s: Supermercado) {
    setSupermercadoModal(s)
    setGerenteModal(s.gerente_id ?? '')
    setModalAbierto(true)
    const { data } = await supabase
      .from('supermercado_areas')
      .select('*, area:area_id(*)')
      .eq('supermercado_id', s.id)
    setAreasEdit((data as SupermercadoArea[]) ?? [])
  }

  function cerrarModal() {
    setModalAbierto(false)
    setSupermercadoModal(null)
  }

  async function guardarModal() {
    if (!supermercadoModal) return
    await asignarGerente(supermercadoModal.id, gerenteModal || null)
    cerrarModal()
  }

  async function guardarSupermercado() {
    if (!nuevoNombre.trim()) return
    const { error } = await supabase.from('supermercados').insert({ nombre: nuevoNombre.trim().toUpperCase() })
    if (error) { setMensaje(`Error: ${error.message}`) } else {
      setMensaje(`Supermercado "${nuevoNombre}" creado`)
      setNuevoNombre('')
      setShowFormSuper(false)
      cargarDatos()
    }
  }

  async function crearArea() {
    if (!nuevaAreaNombre.trim()) return
    const { error } = await supabase.from('areas').insert({ nombre: nuevaAreaNombre.trim() })
    if (error) { setMensaje(`Error: ${error.message}`) } else {
      setMensaje(`Area "${nuevaAreaNombre}" creada`)
      setNuevaAreaNombre('')
      setShowFormArea(false)
      cargarDatos()
    }
  }

  async function eliminarSupermercado(id: string) {
    const { error } = await supabase.from('supermercados').delete().eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`) } else {
      setMensaje('Supermercado eliminado')
      setConfirmarEliminar(null)
      cargarDatos()
    }
  }

  async function asignarGerente(supermercadoId: string, gerenteId: string | null) {
    await supabase.from('supermercados').update({ gerente_id: gerenteId || null }).eq('id', supermercadoId)
    cargarDatos()
  }

  async function toggleArea(areaId: string) {
    if (!supermercadoModal) return
    const existe = areasEdit.find((a) => a.area_id === areaId)
    if (existe) {
      await supabase.from('supermercado_areas').delete().eq('id', existe.id)
    } else {
      await supabase.from('supermercado_areas').insert({ supermercado_id: supermercadoModal.id, area_id: areaId, peso: 10 })
    }
    const { data } = await supabase
      .from('supermercado_areas')
      .select('*, area:area_id(*)')
      .eq('supermercado_id', supermercadoModal.id)
    setAreasEdit((data as SupermercadoArea[]) ?? [])
  }

  async function cambiarPeso(saId: string, peso: number) {
    await supabase.from('supermercado_areas').update({ peso }).eq('id', saId)
    setAreasEdit((prev) => prev.map((a) => (a.id === saId ? { ...a, peso } : a)))
  }

  if (loading) return <div className="py-10 text-center text-slate-500">Cargando...</div>

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="mb-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Supermercados</h1>
      </div>

      {mensaje && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          {mensaje}
          <button onClick={() => setMensaje('')} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button onClick={() => setShowFormSuper(!showFormSuper)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
          <IconAgregar />
          Agregar supermercado
        </button>
        <button onClick={() => setShowFormArea(!showFormArea)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
          <IconAgregar />
          Agregar departamento
        </button>
        <Link to="/operaciones/supermercados/conceptos" className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700">
          <IconConcepto />
          Gestionar conceptos
        </Link>
      </div>

      {showFormSuper && (
        <div className="flex gap-2 rounded-xl bg-white p-4 shadow-sm">
          <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre del supermercado" className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none" />
          <button onClick={guardarSupermercado} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Guardar</button>
          <button onClick={() => setShowFormSuper(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200">Cancelar</button>
        </div>
      )}

      {showFormArea && (
        <div className="flex gap-2 rounded-xl bg-white p-4 shadow-sm">
          <input value={nuevaAreaNombre} onChange={(e) => setNuevaAreaNombre(e.target.value)} placeholder="Ej: Carniceria" className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none" />
          <button onClick={crearArea} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Guardar</button>
          <button onClick={() => setShowFormArea(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200">Cancelar</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {supermercados.map((s) => (
          <div key={s.id} className="group relative rounded-xl bg-white shadow-sm transition-all hover:shadow-md">
            <Link to={`/operaciones/supermercados/${s.id}`} className="block p-5">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <IconSupermercado className="h-6 w-6" />
              </div>
              <h2 className="font-semibold text-slate-800">{s.nombre}</h2>
              <p className="mt-1 text-xs text-slate-400">Gerente: {s.gerente?.nombre ?? 'Sin asignar'}</p>
            </Link>

            <div className="border-t border-slate-100 px-5 py-3">
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/operaciones/supermercados/${s.id}/evaluar`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <IconEvaluar />
                  Evaluar
                </Link>
                <button onClick={() => abrirModal(s)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                  <IconEditar />
                  Editar
                </button>
                {confirmarEliminar === s.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => eliminarSupermercado(s.id)} className="rounded bg-red-600 px-2 py-1 text-xs text-white">Si</button>
                    <button onClick={() => setConfirmarEliminar(null)} className="rounded bg-slate-100 px-2 py-1 text-xs">No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmarEliminar(s.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600" title="Eliminar">
                    <IconEliminar />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {supermercados.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-slate-400">No hay supermercados registrados. Haz clic en "Agregar supermercado" para comenzar.</p>
        </div>
      )}

      <Modal abierto={modalAbierto} titulo={`Configurar — ${supermercadoModal?.nombre ?? ''}`} onCerrar={cerrarModal}>
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-slate-700">Gerente responsable</label>
          <select
            value={gerenteModal}
            onChange={(e) => setGerenteModal(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Sin gerente</option>
            {evaluadores.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.nombre}</option>
            ))}
          </select>
        </div>

        <div className="mb-2">
          <p className="mb-3 text-sm text-slate-500">
            Selecciona las areas que aplican a este supermercado y define cuantos puntos vale cada una.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {areasDisponibles.map((area) => {
              const sa = areasEdit.find((a) => a.area_id === area.id)
              return (
                <div key={area.id} className={`flex items-center gap-3 rounded-lg border p-3 ${sa ? 'border-blue-200 bg-blue-50' : 'border-slate-200'}`}>
                  <input type="checkbox" checked={!!sa} onChange={() => toggleArea(area.id)} className="h-5 w-5 rounded border-slate-300 text-blue-600" />
                  <span className="flex-1 text-sm font-medium text-slate-700">{area.nombre}</span>
                  {sa && (
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-slate-400">Pts:</label>
                      <input type="number" min="1" max="100" value={sa.peso} onChange={(e) => cambiarPeso(sa.id, Number(e.target.value))} className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-center focus:border-blue-500 focus:outline-none" />
                    </div>
                  )}
                </div>
              )
            })}
            {areasDisponibles.length === 0 && (
              <p className="col-span-full text-sm text-slate-400">Crea departamentos con el boton "Agregar departamento"</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button onClick={cerrarModal} className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button onClick={guardarModal} className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700">Guardar</button>
        </div>
      </Modal>
    </div>
  )
}
