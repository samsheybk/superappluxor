import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import type { Supermercado, Area, SupermercadoArea } from '../../types'
import { Modal } from '../../components/Modal'
import { LoadingScreen } from '../../components/LoadingScreen'

export function ConfigSupermercados() {
  const [supermercados, setSupermercados] = useState<(Supermercado & { gerente?: { nombre: string; email: string } | null })[]>([])
  const [areasDisponibles, setAreasDisponibles] = useState<Area[]>([])
  const [evaluadores, setEvaluadores] = useState<{ id: string; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [editandoNombre, setEditandoNombre] = useState<string | null>(null)
  const [nombreEdit, setNombreEdit] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [supermercadoModal, setSupermercadoModal] = useState<Supermercado | null>(null)
  const [areasEdit, setAreasEdit] = useState<SupermercadoArea[]>([])
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaAreaNombre, setNuevaAreaNombre] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [confirmarDeshabilitar, setConfirmarDeshabilitar] = useState<string | null>(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setLoading(true)
    const sRes = await supabase.from('supermercados').select('*').order('nombre')
    if (sRes.error) console.error('Error supermercados:', sRes.error)
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
    if (aRes.error) console.error('Error areas:', aRes.error)
    if (aRes.data) setAreasDisponibles(aRes.data as Area[])

    const pRes = await supabase.from('perfiles').select('id, nombre').neq('rol', 'admin').order('nombre')
    if (pRes.error) console.error('Error evaluadores:', pRes.error)
    if (pRes.data) setEvaluadores(pRes.data)

    setLoading(false)
  }

  async function abrirModal(s: Supermercado) {
    setSupermercadoModal(s)
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

  async function guardarSupermercado() {
    if (!nuevoNombre.trim()) return
    const { error } = await supabase.from('supermercados').insert({ nombre: nuevoNombre.trim().toUpperCase() })
    if (error) { setMensaje(`Error: ${error.message}`) } else {
      setMensaje(`Supermercado "${nuevoNombre}" creado`)
      setNuevoNombre('')
      cargarDatos()
    }
  }

  async function actualizarNombre(id: string) {
    if (!nombreEdit.trim()) return
    const { error } = await supabase.from('supermercados').update({ nombre: nombreEdit.trim().toUpperCase() }).eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`) } else {
      setMensaje(`Nombre actualizado a "${nombreEdit}"`)
      setEditandoNombre(null)
      cargarDatos()
    }
  }

  async function toggleActivo(id: string, activo: boolean) {
    const { error } = await supabase.from('supermercados').update({ activo }).eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`) } else {
      setMensaje(activo ? 'Supermercado habilitado' : 'Supermercado deshabilitado')
      setConfirmarDeshabilitar(null)
      cargarDatos()
    }
  }

  async function crearArea() {
    if (!nuevaAreaNombre.trim()) return
    const { error } = await supabase.from('areas').insert({ nombre: nuevaAreaNombre.trim() })
    if (error) { setMensaje(`Error: ${error.message}`) } else {
      setMensaje(`Área "${nuevaAreaNombre}" creada`)
      setNuevaAreaNombre('')
      cargarDatos()
    }
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

  async function asignarGerente(supermercadoId: string, gerenteId: string | null) {
    await supabase.from('supermercados').update({ gerente_id: gerenteId || null }).eq('id', supermercadoId)
    setMensaje(gerenteId ? 'Gerente asignado' : 'Gerente removido')
    cargarDatos()
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Operaciones</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Supermercados</span>
      </div>


      {mensaje && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          {mensaje}
          <button onClick={() => setMensaje('')} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Nuevo supermercado</h2>
          <div className="flex gap-2">
            <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre del supermercado" className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none" />
            <button onClick={guardarSupermercado} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Agregar</button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Nueva área de evaluación</h2>
          <div className="flex gap-2">
            <input value={nuevaAreaNombre} onChange={(e) => setNuevaAreaNombre(e.target.value)} placeholder="Ej: Carnicería" className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none" />
            <button onClick={crearArea} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Crear</button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Supermercados registrados ({supermercados.length})</h2>
        {supermercados.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="text-slate-400">No hay supermercados registrados. Crea uno arriba.</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {supermercados.map((s) => (
          <div key={s.id} className={`flex items-center justify-between gap-4 rounded-xl px-5 py-4 shadow-sm ${!s.activo ? 'bg-slate-100 opacity-60' : 'bg-white'}`}>
            <div className="flex-1 min-w-0">
              {editandoNombre === s.id ? (
                <div className="flex gap-2">
                  <input value={nombreEdit} onChange={(e) => setNombreEdit(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none" autoFocus />
                  <button onClick={() => actualizarNombre(s.id)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700">Guardar</button>
                  <button onClick={() => setEditandoNombre(null)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200">Cancelar</button>
                </div>
              ) : (
                <h3 className="font-semibold text-slate-800">
                  {s.nombre}
                  {!s.activo && <span className="ml-2 rounded bg-slate-300 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Deshabilitado</span>}
                </h3>
              )}
              <p className="text-xs text-slate-400">Gerente: {s.gerente?.nombre ?? 'Sin asignar'}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={s.gerente_id ?? ''}
                onChange={(e) => asignarGerente(s.id, e.target.value || null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Sin gerente</option>
                {evaluadores.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.nombre}</option>
                ))}
              </select>

              {s.activo ? (
                <>
                  <button onClick={() => abrirModal(s)} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                    Editar
                  </button>
                  {confirmarDeshabilitar === s.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleActivo(s.id, false)} className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs text-white hover:bg-orange-700">Deshabilitar</button>
                      <button onClick={() => setConfirmarDeshabilitar(null)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200">Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmarDeshabilitar(s.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Deshabilitar
                    </button>
                  )}
                </>
              ) : (
                <button onClick={() => toggleActivo(s.id, true)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Habilitar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal abierto={modalAbierto} titulo={`Configurar áreas — ${supermercadoModal?.nombre ?? ''}`} onCerrar={cerrarModal}>
        <p className="mb-4 text-sm text-slate-500">
          Selecciona las áreas que aplican a este supermercado y define cuántos puntos vale cada una.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {areasDisponibles.map((area) => {
            const sa = areasEdit.find((a) => a.area_id === area.id)
            return (
              <div key={area.id} className={`flex items-center gap-3 rounded-lg border p-3 ${sa ? 'border-blue-200 bg-blue-50' : 'border-slate-200'}`}>
                <input
                  type="checkbox"
                  checked={!!sa}
                  onChange={() => toggleArea(area.id)}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600"
                />
                <span className="flex-1 text-sm font-medium text-slate-700">{area.nombre}</span>
                {sa && (
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-slate-400">Pts:</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={sa.peso}
                      onChange={(e) => cambiarPeso(sa.id, Number(e.target.value))}
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-center focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )
          })}

          {areasDisponibles.length === 0 && (
            <p className="col-span-full text-sm text-slate-400">Crea áreas de evaluación desde el panel principal</p>
          )}
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <button onClick={cerrarModal} className="rounded-lg bg-slate-100 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
            Cerrar
          </button>
        </div>
      </Modal>
    </div>
  )
}
