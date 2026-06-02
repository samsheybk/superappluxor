import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import type { Area } from '../../types'

interface ComentarioConDetalle {
  id: string
  area_nombre: string
  concepto_nombre: string
  criticidad_nivel: string
  penalizacion: number
  comentario: string
}

interface AreaAgrupada {
  nombre: string
  peso: number
  comentarios: ComentarioConDetalle[]
  total_pen: number
}

export function DetalleEvaluacion() {
  const { id, evaluacionId } = useParams<{ id: string; evaluacionId: string }>()
  const [supermercadoNombre, setSupermercadoNombre] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [areas, setAreas] = useState<AreaAgrupada[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !evaluacionId) return

    Promise.all([
      supabase.from('supermercados').select('nombre').eq('id', id).single(),
      supabase.from('supermercado_areas').select('area_id, peso').eq('supermercado_id', id),
      supabase.from('evaluacion_comentarios')
        .select('id, area_id, concepto_id, criticidad_id, comentario, fecha_inicio')
        .eq('evaluacion_id', evaluacionId)
        .eq('supermercado_id', id),
      supabase.from('areas').select('id, nombre'),
      supabase.from('conceptos').select('id, nombre'),
      supabase.from('concepto_criticidades').select('id, nivel, penalizacion'),
    ]).then(([sRes, saRes, ecRes, aRes, coRes, ccRes]) => {
      if (sRes.data) setSupermercadoNombre(sRes.data.nombre)

      const areaNombre: Record<string, string> = {}
      ;(aRes.data ?? []).forEach((a: Area) => { areaNombre[a.id] = a.nombre })

      const areaPeso: Record<string, number> = {}
      ;(saRes.data ?? []).forEach((a: { area_id: string; peso: number }) => { areaPeso[a.area_id] = a.peso })

      const conceptoNombre: Record<string, string> = {}
      ;(coRes.data ?? []).forEach((c: { id: string; nombre: string }) => { conceptoNombre[c.id] = c.nombre })

      const critNivel: Record<string, { nivel: string; penalizacion: number }> = {}
      ;(ccRes.data ?? []).forEach((c: { id: string; nivel: string; penalizacion: number }) => { critNivel[c.id] = c })

      const comentarios = (ecRes.data ?? []).map((r: { id: string; area_id: string; concepto_id: string; criticidad_id: string; comentario: string; fecha_inicio: string }) => ({
        id: r.id,
        area_nombre: areaNombre[r.area_id] ?? '?',
        concepto_nombre: conceptoNombre[r.concepto_id] ?? '?',
        criticidad_nivel: critNivel[r.criticidad_id]?.nivel ?? '?',
        penalizacion: critNivel[r.criticidad_id]?.penalizacion ?? 0,
        comentario: r.comentario,
      }))

      if (!ecRes.data?.length) {
        setAreas([])
        setFechaInicio('')
        setLoading(false)
        return
      }
      setFechaInicio(ecRes.data[0].fecha_inicio)

      const agrupadas: Record<string, ComentarioConDetalle[]> = {}
      comentarios.forEach((cm: ComentarioConDetalle) => {
        if (!agrupadas[cm.area_nombre]) agrupadas[cm.area_nombre] = []
        agrupadas[cm.area_nombre].push(cm)
      })

      const lista = Object.entries(agrupadas).map(([nombre, comentarios]) => {
        const areaId = (ecRes.data ?? []).find((r: { area_id: string }) => areaNombre[r.area_id] === nombre)?.area_id
        return {
          nombre,
          peso: areaPeso[areaId ?? ''] ?? 0,
          comentarios,
          total_pen: comentarios.reduce((s, c) => s + c.penalizacion, 0),
        }
      })

      setAreas(lista)
      setLoading(false)
    })
  }, [id, evaluacionId])

  if (loading) return <div className="py-10 text-center text-slate-500">Cargando...</div>

  const totalPeso = areas.reduce((s, a) => s + a.peso, 0)
  const totalPen = areas.reduce((s, a) => s + a.total_pen, 0)
  const puntajeFinal = Math.max(0, totalPeso - totalPen)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link to={`/operaciones/supermercados/${id}`} className="mb-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Historial de evaluaciones
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{supermercadoNombre}</h1>
            <p className="text-slate-500">
              {fechaInicio ? new Date(fechaInicio).toLocaleDateString('es-VE', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
              }) : 'Sin fecha'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Puntaje final</p>
            <p className="text-3xl font-bold text-blue-600">{puntajeFinal}</p>
            <p className="text-xs text-slate-400">de {totalPeso} pts {totalPen > 0 && <span className="text-red-500">(-{totalPen})</span>}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {areas.map((area) => (
          <div key={area.nombre} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                {area.nombre[0]}
              </span>
              <h2 className="text-lg font-semibold text-slate-800">{area.nombre}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Base: {area.peso} pts</span>
              {area.total_pen > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">-{area.total_pen} pts</span>
              )}
              <span className="ml-auto rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                {Math.max(0, area.peso - area.total_pen)}/{area.peso}
              </span>
            </div>

            <div className="space-y-2">
              {area.comentarios.map((cm) => (
                <div key={cm.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{cm.concepto_nombre}</span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      cm.criticidad_nivel === 'ALTO' ? 'bg-red-100 text-red-700' :
                      cm.criticidad_nivel === 'MEDIO' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {cm.criticidad_nivel} (-{cm.penalizacion})
                    </span>
                    {cm.comentario && (
                      <span className="text-slate-600">&mdash; {cm.comentario}</span>
                    )}
                  </div>
                </div>
              ))}
              {area.comentarios.length === 0 && (
                <p className="text-sm text-slate-400">Sin comentarios</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {areas.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-slate-400">Esta evaluacion no tiene datos.</p>
        </div>
      )}
    </div>
  )
}
