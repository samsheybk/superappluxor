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

  useEffect(() => {
    if (!id) return
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
  }, [id])

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
          <Link
            key={ev.evaluacion_id}
            to={`/operaciones/supermercados/${id}/evaluacion/${ev.evaluacion_id}`}
            className="block rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-md"
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
        ))}
      </div>
    </div>
  )
}
