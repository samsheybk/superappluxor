import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { Modal } from '../../components/Modal'
import { LoadingScreen } from '../../components/LoadingScreen'

interface EvalResumen {
  id: string
  fecha_inicio: string
  inspector: string
  total_peso: number
  total_penalizacion: number
  puntaje: number
  areas: number
}

export function ListaEvaluaciones() {
  const location = useLocation()
  const [evaluaciones, setEvaluaciones] = useState<EvalResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [eliminarId, setEliminarId] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState((location.state as { mensaje?: string })?.mensaje ?? '')

  function cargarDatos() {
    setLoading(true)
    Promise.all([
      supabase.from('almacen_areas').select('id, peso'),
      supabase.from('almacen_evaluaciones').select('*').order('created_at', { ascending: false }),
      supabase.from('almacen_evaluacion_comentarios').select('evaluacion_id, area_id, criticidad_id'),
      supabase.from('almacen_concepto_criticidades').select('id, penalizacion'),
    ]).then(async ([aRes, evRes, ecRes, ccRes]) => {
      const pesoMap: Record<string, number> = {}
      ;(aRes.data ?? []).forEach((a: { id: string; peso: number }) => { pesoMap[a.id] = a.peso })
      const totalPeso = Object.values(pesoMap).reduce((s, p) => s + p, 0)

      const critPen: Record<string, number> = {}
      ;(ccRes.data ?? []).forEach((c: { id: string; penalizacion: number }) => { critPen[c.id] = c.penalizacion })

      const penMap: Record<string, { areaIds: Set<string>; totalPen: number }> = {}
      ;(ecRes.data ?? []).forEach((r: { evaluacion_id: string; area_id: string; criticidad_id: string }) => {
        if (!penMap[r.evaluacion_id]) penMap[r.evaluacion_id] = { areaIds: new Set(), totalPen: 0 }
        penMap[r.evaluacion_id].areaIds.add(r.area_id)
        penMap[r.evaluacion_id].totalPen += (critPen[r.criticidad_id] || 0)
      })

      const evaluadorIds = [...new Set((evRes.data ?? []).map((e: { creado_por: string }) => e.creado_por))]
      const nomMap: Record<string, string> = {}
      if (evaluadorIds.length > 0) {
        const { data: perfiles } = await supabase.from('perfiles').select('id, nombre').in('id', evaluadorIds)
        ;(perfiles ?? []).forEach((p: { id: string; nombre: string }) => { nomMap[p.id] = p.nombre })
      }

      const lista = (evRes.data ?? []).map((ev: any) => {
        const p = penMap[ev.id]
        return {
          id: ev.id,
          fecha_inicio: ev.fecha_inicio,
          inspector: (nomMap[ev.creado_por] || ev.inspector || 'Desconocido'),
          total_peso: totalPeso,
          total_penalizacion: p?.totalPen ?? 0,
          puntaje: Math.max(0, totalPeso - (p?.totalPen ?? 0)),
          areas: p?.areaIds.size ?? 0,
        }
      })

      setEvaluaciones(lista)
      setLoading(false)
    })
  }

  useEffect(() => { cargarDatos() }, [])

  const evAEliminar = evaluaciones.find((e) => e.id === eliminarId)

  async function confirmarEliminar() {
    if (!eliminarId) return
    setEliminando(eliminarId)
    setEliminarId(null)
    await supabase.from('almacen_evaluacion_comentarios').delete().eq('evaluacion_id', eliminarId)
    await supabase.from('almacen_evaluaciones').delete().eq('id', eliminarId)
    setEliminando(null)
    cargarDatos()
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="mb-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Almacen y Distribucion</h1>
            <p className="text-slate-500">Evaluaciones de inspeccion semanal</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/departamento/almacen-y-distribucion/conceptos"
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Gestionar conceptos
            </Link>
            <Link
              to="/departamento/almacen-y-distribucion/evaluar"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              + Nueva evaluacion
            </Link>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          {mensaje}
          <button onClick={() => setMensaje('')} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      {evaluaciones.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-slate-400">No hay evaluaciones registradas para el almacen.</p>
          <Link to="/departamento/almacen-y-distribucion/evaluar" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Crear la primera evaluacion
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {evaluaciones.map((ev) => (
          <div key={ev.id} className="rounded-xl bg-white shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center p-5">
              <Link to={`/departamento/almacen-y-distribucion/evaluacion/${ev.id}`} className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-800">
                      {new Date(ev.fecha_inicio).toLocaleDateString('es-VE', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-slate-500">Inspector: {ev.inspector}</p>
                    <p className="text-xs text-slate-500">{ev.areas} areas evaluadas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-800">{ev.puntaje}</p>
                    <p className="text-xs text-slate-400">
                      de {ev.total_peso} pts
                      {ev.total_penalizacion > 0 && (
                        <span className="ml-1 text-red-500">(-{ev.total_penalizacion})</span>
                      )}
                    </p>
                  </div>
                </div>
              </Link>
              <button onClick={() => setEliminarId(ev.id)}
                disabled={eliminando === ev.id}
                className="ml-4 flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              >
                {eliminando === ev.id ? (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal abierto={!!eliminarId} titulo="Eliminar evaluacion" onCerrar={() => setEliminarId(null)}>
        {evAEliminar && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <p className="mb-2 font-medium">Esta accion es IRREVERSIBLE.</p>
              <p>Se borraran todos los comentarios y el PDF asociado a la evaluacion del <strong>{new Date(evAEliminar.fecha_inicio).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEliminarId(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={confirmarEliminar} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
