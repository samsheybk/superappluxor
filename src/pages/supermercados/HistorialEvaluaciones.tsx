import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import type { Supermercado } from '../../types'

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

  function cargarDatos() {
    if (!id) return
    setLoading(true)
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
      const { data: perfiles } = await supabase.from('perfiles').select('id, nombre').in('id', evaluadorIds.length ? evaluadorIds : ['none'])
      const nomMap: Record<string, string> = {}
      ;(perfiles ?? []).forEach((p: { id: string; nombre: string }) => { nomMap[p.id] = p.nombre })

      const lista = Object.entries(evalMap).map(([evaluacion_id, ev]) => {
        const totalPeso = [...ev.areaIds].reduce((s, aid) => s + (areaPeso[aid] || 0), 0)
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

  async function eliminarEvaluacion(ev: EvalResumen) {
    if (!window.confirm(`Eliminar evaluacion del ${new Date(ev.fecha_inicio).toLocaleDateString('es-VE')}? Esta accion no se puede deshacer.`)) return
    setEliminando(ev.evaluacion_id)
    await supabase.from('evaluacion_comentarios').delete().eq('evaluacion_id', ev.evaluacion_id)
    await supabase.from('evaluacion_headers').delete().eq('id', ev.evaluacion_id)
    setEliminando(null)
    cargarDatos()
  }

  if (loading) return <div className="py-10 text-center text-slate-500">Cargando...</div>
  if (!supermercado) return <div className="py-10 text-center text-slate-500">Supermercado no encontrado</div>

  return (
    <div className="space-y-6">
      <div>
        <Link to="/operaciones/supermercados" className="mb-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Todos los supermercados
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{supermercado.nombre}</h1>
            <p className="text-slate-500">Historial de evaluaciones</p>
          </div>
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
          <div key={ev.evaluacion_id} className="group relative rounded-xl bg-white shadow-sm transition-all hover:shadow-md">
            <Link
              to={`/operaciones/supermercados/${id}/evaluacion/${ev.evaluacion_id}`}
              className="block p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
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
              onClick={() => eliminarEvaluacion(ev)}
              disabled={eliminando === ev.evaluacion_id}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
              title="Eliminar evaluacion"
            >
              {eliminando === ev.evaluacion_id ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
