import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import type { Supermercado } from '../../types'
import { Modal } from '../../components/Modal'
import { LoadingScreen } from '../../components/LoadingScreen'

interface EvalResumen {
  evaluacion_id: string
  fecha_inicio: string
  evaluador: string
  total_peso: number
  total_penalizacion: number
  puntaje: number
  areas: number
}

export function HistorialEvaluaciones() {
  const { id } = useParams<{ id: string }>()
  const [supermercado, setSupermercado] = useState<Supermercado | null>(null)
  const [evaluaciones, setEvaluaciones] = useState<EvalResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [eliminarId, setEliminarId] = useState<string | null>(null)

  function cargarDatos(sinLoading = false) {
    if (!id) return
    if (!sinLoading) setLoading(true)
    Promise.all([
      supabase.from('supermercados').select('*').eq('id', id).single(),
      supabase.from('supermercado_areas').select('area_id, peso').eq('supermercado_id', id),
      supabase.from('evaluacion_comentarios').select('evaluacion_id, fecha_inicio, creado_por, area_id, criticidad_id').eq('supermercado_id', id).order('fecha_inicio', { ascending: false }),
      supabase.from('concepto_criticidades').select('id, penalizacion'),
    ]).then(async ([sRes, saRes, ecRes, ccRes]) => {
      if (sRes.data) setSupermercado(sRes.data)

      const areaPeso: Record<string, number> = {}
      ;(saRes.data ?? []).forEach((a: { area_id: string; peso: number }) => { areaPeso[a.area_id] = a.peso })

      const critPen: Record<string, number> = {}
      ;(ccRes.data ?? []).forEach((c: { id: string; penalizacion: number }) => { critPen[c.id] = c.penalizacion })

      const evalMap: Record<string, { fecha_inicio: string; creado_por: string; areaIds: Set<string>; criticidadIds: string[] }> = {}
      ;(ecRes.data ?? []).forEach((r: { evaluacion_id: string; fecha_inicio: string; creado_por: string; area_id: string; criticidad_id: string }) => {
        if (!evalMap[r.evaluacion_id]) {
          evalMap[r.evaluacion_id] = { fecha_inicio: r.fecha_inicio, creado_por: r.creado_por, areaIds: new Set(), criticidadIds: [] }
        }
        evalMap[r.evaluacion_id].areaIds.add(r.area_id)
        evalMap[r.evaluacion_id].criticidadIds.push(r.criticidad_id)
      })

      const evaluadorIds = [...new Set(Object.values(evalMap).map((e) => e.creado_por))]
      const nomMap: Record<string, string> = {}
      if (evaluadorIds.length > 0) {
        const { data: perfiles } = await supabase.from('perfiles').select('id, nombre').in('id', evaluadorIds)
        ;(perfiles ?? []).forEach((p: { id: string; nombre: string }) => { nomMap[p.id] = p.nombre })
      }

      const lista = Object.entries(evalMap).map(([evaluacion_id, ev]) => {
        const totalPeso = Object.values(areaPeso).reduce((s, p) => s + p, 0)
        const totalPen = ev.criticidadIds.reduce((s, cid) => s + (critPen[cid] || 0), 0)
        return {
          evaluacion_id,
          fecha_inicio: ev.fecha_inicio,
          evaluador: nomMap[ev.creado_por] ?? 'Desconocido',
          total_peso: totalPeso,
          total_penalizacion: totalPen,
          puntaje: Math.max(0, totalPeso - totalPen),
          areas: ev.areaIds.size,
        }
      })

      setEvaluaciones(lista)
      setLoading(false)
    })
  }

  useEffect(() => { cargarDatos() }, [id])

  const evAEliminar = evaluaciones.find((e) => e.evaluacion_id === eliminarId)

  async function confirmarEliminar() {
    if (!eliminarId) return
    setEliminando(eliminarId)
    setEliminarId(null)
    const { error: err1 } = await supabase.from('evaluacion_comentarios').delete().eq('evaluacion_id', eliminarId)
    if (err1) { console.error('Error borrando comentarios:', err1); setEliminando(null); return }
    const { error: err2 } = await supabase.from('evaluacion_headers').delete().eq('id', eliminarId)
    if (err2) { console.error('Error borrando header:', err2); setEliminando(null); return }
    setEliminando(null)
    cargarDatos(true)
  }

  if (loading) return <LoadingScreen />
  if (!supermercado) return <div className="py-10 text-center text-slate-500">Supermercado no encontrado</div>

  return (
    <div className="space-y-6">
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Operaciones</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Supermercados</span>
      </div>
      <div className="flex items-center justify-end gap-2">
          <Link
            to={`/operaciones/supermercados/${id}/evaluar`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva evaluacion
          </Link>
      </div>

      {evaluaciones.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-slate-400">No hay evaluaciones registradas para este supermercado.</p>
          <Link to={`/operaciones/supermercados/${id}/evaluar`} className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Crear la primera evaluacion
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {evaluaciones.map((ev) => (
          <div key={ev.evaluacion_id} className="rounded-xl bg-white shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center p-5">
              <Link
                to={`/operaciones/supermercados/${id}/evaluacion/${ev.evaluacion_id}`}
                className="min-w-0 flex-1"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-800">
                      {new Date(ev.fecha_inicio).toLocaleDateString('es-VE', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-slate-500">Evaluador: {ev.evaluador}</p>
                    <p className="text-xs text-slate-500">{ev.areas} departamentos evaluados</p>
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
              <button
                onClick={() => setEliminarId(ev.evaluacion_id)}
                disabled={eliminando === ev.evaluacion_id}
                className="ml-4 flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              >
                {eliminando === ev.evaluacion_id ? (
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
              <p className="mb-2 font-medium"> Esta accion es IRREVERSIBLE.</p>
              <p>Se borraran todos los comentarios, fotos y el PDF asociado a la evaluacion del <strong>{new Date(evAEliminar.fecha_inicio).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEliminarId(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={confirmarEliminar} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
