import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [supermercadoNombre, setSupermercadoNombre] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaCierre, setFechaCierre] = useState('')
  const [firma, setFirma] = useState<string | null>(null)
  const [pdfBase64, setPdfBase64] = useState<string | null>(null)
  const [areas, setAreas] = useState<AreaAgrupada[]>([])
  const [loading, setLoading] = useState(true)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    if (!id || !evaluacionId) return

    Promise.all([
      supabase.from('supermercados').select('nombre').eq('id', id).single(),
      supabase.from('evaluacion_headers').select('fecha_inicio, fecha_cierre, firma, pdf_base64').eq('id', evaluacionId).single(),
      supabase.from('supermercado_areas').select('area_id, peso').eq('supermercado_id', id),
      supabase.from('evaluacion_comentarios')
        .select('id, area_id, concepto_id, criticidad_id, comentario, fecha_inicio')
        .eq('evaluacion_id', evaluacionId)
        .eq('supermercado_id', id),
      supabase.from('areas').select('id, nombre'),
      supabase.from('conceptos').select('id, nombre'),
      supabase.from('concepto_criticidades').select('id, nivel, penalizacion'),
    ]).then(([sRes, evRes, saRes, ecRes, aRes, coRes, ccRes]) => {
      if (sRes.data) setSupermercadoNombre(sRes.data.nombre)

      const fechaInicioHeader = evRes.data?.fecha_inicio ?? null
      if (evRes.data) {
        setFechaInicio(fechaInicioHeader ?? '')
        setFechaCierre(evRes.data.fecha_cierre ?? '')
        setFirma(evRes.data.firma ?? null)
        setPdfBase64(evRes.data.pdf_base64 ?? null)
      }

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
        setLoading(false)
        return
      }

      if (!fechaInicioHeader && ecRes.data[0].fecha_inicio) {
        setFechaInicio(ecRes.data[0].fecha_inicio)
      }

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

  function formatearFecha(fecha: string) {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleDateString('es-VE', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  async function eliminar() {
    if (!id || !evaluacionId) return
    if (!window.confirm(`Eliminar esta evaluacion? Esta accion no se puede deshacer.`)) return
    setEliminando(true)
    await supabase.from('evaluacion_comentarios').delete().eq('evaluacion_id', evaluacionId)
    await supabase.from('evaluacion_headers').delete().eq('id', evaluacionId)
    navigate(`/operaciones/supermercados/${id}`)
  }

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
            <p className="text-xs text-slate-500">Inicio: {formatearFecha(fechaInicio)}</p>
            {fechaCierre && <p className="text-xs text-slate-500">Cierre: {formatearFecha(fechaCierre)}</p>}
          </div>
          <div className="flex items-center gap-3">
            {pdfBase64 && (
              <a
                href={pdfBase64}
                download={`evaluacion-${supermercadoNombre.replace(/\s+/g, '-').toLowerCase()}.pdf`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar PDF
              </a>
            )}
            <button
              onClick={eliminar}
              disabled={eliminando}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </button>
            <div className="text-right">
              <p className="text-sm text-slate-500">Puntaje final</p>
              <p className="text-3xl font-bold text-blue-600">{puntajeFinal}</p>
              <p className="text-xs text-slate-400">de {totalPeso} pts {totalPen > 0 && <span className="text-red-500">(-{totalPen})</span>}</p>
            </div>
          </div>
        </div>
      </div>

      {firma && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <p className="mb-2 text-sm font-medium text-slate-700">Firma del gerente</p>
          <img src={firma} alt="Firma del gerente" className="h-16 rounded border border-slate-200 bg-slate-50 object-contain" />
        </div>
      )}

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
