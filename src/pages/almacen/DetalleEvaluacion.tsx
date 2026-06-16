import { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { LoadingScreen } from '../../components/LoadingScreen'

interface AreaAgrupada {
  nombre: string
  peso: number
  comentarios: {
    id: string
    concepto_nombre: string
    criticidad_nivel: string
    penalizacion: number
    comentario: string
    fotos: string[]
  }[]
  total_pen: number
}

export function DetalleEvaluacion() {
  const { evaluacionId } = useParams<{ evaluacionId: string }>()
  const location = useLocation()
  const [mensaje, _setMensaje] = useState((location.state as { mensaje?: string })?.mensaje ?? '')
  const [observaciones, setObservaciones] = useState('')
  const [firma, setFirma] = useState<string | null>(null)
  const [pdfBase64, setPdfBase64] = useState<string | null>(null)
  const [areas, setAreas] = useState<AreaAgrupada[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!evaluacionId) return
    Promise.all([
      supabase.from('almacen_evaluaciones').select('*').eq('id', evaluacionId).single(),
      supabase.from('almacen_areas').select('id, nombre, peso'),
      supabase.from('almacen_evaluacion_comentarios')
        .select('id, area_id, concepto_id, criticidad_id, comentario, fotos')
        .eq('evaluacion_id', evaluacionId),
      supabase.from('almacen_conceptos').select('id, nombre'),
      supabase.from('almacen_concepto_criticidades').select('id, nivel, penalizacion'),
    ]).then(([evRes, aRes, ecRes, coRes, ccRes]) => {
      if (evRes.data) {
        setObservaciones(evRes.data.observaciones ?? '')
        setFirma(evRes.data.firma ?? null)
        setPdfBase64(evRes.data.pdf_base64 ?? null)
      }

      const areaNombre: Record<string, string> = {}
      const areaPeso: Record<string, number> = {}
      ;(aRes.data ?? []).forEach((a: { id: string; nombre: string; peso: number }) => {
        areaNombre[a.id] = a.nombre
        areaPeso[a.id] = a.peso
      })

      const conceptoNombre: Record<string, string> = {}
      ;(coRes.data ?? []).forEach((c: { id: string; nombre: string }) => { conceptoNombre[c.id] = c.nombre })

      const critInfo: Record<string, { nivel: string; penalizacion: number }> = {}
      ;(ccRes.data ?? []).forEach((c: { id: string; nivel: string; penalizacion: number }) => { critInfo[c.id] = c })

      const comentarios = (ecRes.data ?? []).map((r: any) => ({
        area_id: r.area_id,
        concepto_nombre: conceptoNombre[r.concepto_id] ?? '?',
        criticidad_nivel: critInfo[r.criticidad_id]?.nivel ?? '?',
        penalizacion: critInfo[r.criticidad_id]?.penalizacion ?? 0,
        comentario: r.comentario,
        fotos: r.fotos ?? [],
      }))

      const comentariosPorArea: Record<string, AreaAgrupada['comentarios']> = {}
      comentarios.forEach((cm: any) => {
        if (!comentariosPorArea[cm.area_id]) comentariosPorArea[cm.area_id] = []
        comentariosPorArea[cm.area_id].push(cm)
      })

      const lista = Object.entries(areaNombre).map(([aid, nombre]) => ({
        nombre,
        peso: areaPeso[aid] ?? 0,
        comentarios: comentariosPorArea[aid] ?? [],
        total_pen: (comentariosPorArea[aid] ?? []).reduce((s: number, c: any) => s + c.penalizacion, 0),
      })).filter((a) => a.comentarios.length > 0 || a.peso > 0)

      setAreas(lista)
      setLoading(false)
    })
  }, [evaluacionId])

  if (loading) return <LoadingScreen />

  const totalPeso = areas.reduce((s, a) => s + a.peso, 0)
  const totalPen = areas.reduce((s, a) => s + a.total_pen, 0)
  const puntajeFinal = Math.max(0, totalPeso - totalPen)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Operaciones</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Almacen y distribucion</span>
      </div>
      <div className="mb-6">
        <div className="flex items-center justify-end gap-2">
          <div className="text-right">
            <p className="text-sm text-slate-500">Puntaje final</p>
            <p className={`text-3xl font-bold ${puntajeFinal < totalPeso * 0.7 ? 'text-red-600' : 'text-blue-600'}`}>{puntajeFinal}</p>
            <p className="text-xs text-slate-400">
              de {totalPeso} pts
              {totalPen > 0 && <span className="ml-1 text-red-500">(-{totalPen})</span>}
            </p>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{mensaje}</div>
      )}

      <div className="space-y-4">
        {areas.map((area) => (
          <div key={area.nombre} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{area.nombre[0]}</span>
              <h2 className="text-lg font-semibold text-slate-800">{area.nombre}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Base: {area.peso} pts</span>
              {area.total_pen > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">-{area.total_pen} pts</span>}
              <span className={`ml-auto rounded-full px-3 py-1 text-sm font-medium ${
                area.peso - area.total_pen < area.peso * 0.7 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {Math.max(0, area.peso - area.total_pen)}/{area.peso}
              </span>
            </div>

            {area.comentarios.length === 0 && (
              <p className="text-sm text-slate-400">Sin comentarios</p>
            )}

            <div className="space-y-2">
              {area.comentarios.map((cm, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">{cm.concepto_nombre}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      cm.criticidad_nivel === 'ALTO' ? 'bg-red-100 text-red-700' :
                      cm.criticidad_nivel === 'MEDIO' ? 'bg-amber-100 text-amber-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {cm.criticidad_nivel} (-{cm.penalizacion})
                    </span>
                    <span className="text-sm text-slate-600">{cm.comentario}</span>
                  </div>
                  {cm.fotos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {cm.fotos.map((foto, fi) => (
                        <img key={fi} src={foto} alt="" className="h-14 w-14 rounded border object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {observaciones && (
        <div className="mt-4 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Observaciones generales</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{observaciones}</p>
        </div>
      )}

      {firma && (
        <div className="mt-4 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Firma</h3>
          <img src={firma} alt="Firma" className="h-16 rounded border object-contain" />
        </div>
      )}

      {pdfBase64 && (
        <div className="mt-4 flex justify-end">
          <a href={pdfBase64} download={`evaluacion-almacen-${evaluacionId}.pdf`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar PDF
          </a>
        </div>
      )}
    </div>
  )
}
