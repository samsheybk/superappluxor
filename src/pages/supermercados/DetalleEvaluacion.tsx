import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import type { Area } from '../../types'
import { Modal } from '../../components/Modal'
import { LoadingScreen } from '../../components/LoadingScreen'
import QRCode from 'qrcode'

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
  const [firma, setFirma] = useState<string | null>(null)
  const [pdfBase64, setPdfBase64] = useState<string | null>(null)
  const [areas, setAreas] = useState<AreaAgrupada[]>([])
  const [loading, setLoading] = useState(true)
  const [eliminando, setEliminando] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

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
    ]).then(async ([sRes, evRes, saRes, ecRes, aRes, coRes, ccRes]) => {
      if (sRes.data) setSupermercadoNombre(sRes.data.nombre)

      if (evRes.data) {
        setFirma(evRes.data.firma ?? null)
        setPdfBase64(evRes.data.pdf_base64 ?? null)
      }

      const areaNombre: Record<string, string> = {}
      ;(aRes.data ?? []).forEach((a: Area) => { areaNombre[a.id] = a.nombre })

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

      const comentariosPorAreaId: Record<string, ComentarioConDetalle[]> = {}
      const areaIdMap: Record<string, string> = {}
      ;(aRes.data ?? []).forEach((a: Area) => { areaIdMap[a.id] = a.nombre })
      comentarios.forEach((cm: ComentarioConDetalle) => {
        const aid = Object.entries(areaIdMap).find(([, n]) => n === cm.area_nombre)?.[0]
        if (aid) {
          if (!comentariosPorAreaId[aid]) comentariosPorAreaId[aid] = []
          comentariosPorAreaId[aid].push(cm)
        }
      })

      const lista = (saRes.data ?? []).map((sa: { area_id: string; peso: number }) => {
        const cmts = comentariosPorAreaId[sa.area_id] ?? []
        return {
          nombre: areaNombre[sa.area_id] ?? '?',
          peso: sa.peso,
          comentarios: cmts,
          total_pen: cmts.reduce((s: number, c: ComentarioConDetalle) => s + c.penalizacion, 0),
        }
      })

      setAreas(lista)
      setLoading(false)

      try {
        const url = window.location.origin + window.location.pathname
        if (qrCanvasRef.current) {
          await QRCode.toCanvas(qrCanvasRef.current, url, { width: 120, margin: 1 })
        }
      } catch { /* QR no disponible */ }
    })
  }, [id, evaluacionId])

  if (loading) return <LoadingScreen />

  const totalPeso = areas.reduce((s, a) => s + a.peso, 0)
  const totalPen = areas.reduce((s, a) => s + a.total_pen, 0)
  const puntajeFinal = Math.max(0, totalPeso - totalPen)

  async function confirmarEliminar() {
    if (!id || !evaluacionId) return
    setEliminando(true)
    setMostrarConfirmacion(false)
    const { error: err1 } = await supabase.from('evaluacion_comentarios').delete().eq('evaluacion_id', evaluacionId)
    if (err1) { console.error('Error borrando comentarios:', err1); setEliminando(false); return }
    const { error: err2 } = await supabase.from('evaluacion_headers').delete().eq('id', evaluacionId)
    if (err2) { console.error('Error borrando header:', err2); setEliminando(false); return }
    navigate(`/operaciones/supermercados/${id}`)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Operaciones</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Supermercados</span>
      </div>
      <div className="flex items-center justify-end gap-3">
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
            onClick={() => setMostrarConfirmacion(true)}
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

      {firma && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-sm font-medium text-slate-700">Firma del gerente</p>
              <img src={firma} alt="Firma del gerente" className="h-16 rounded border border-slate-200 bg-slate-50 object-contain" />
            </div>
            <div className="shrink-0 text-center">
              <p className="mb-1 text-xs font-medium text-slate-500">Escanear para descargar</p>
              <canvas ref={qrCanvasRef} className="inline-block rounded border border-slate-100" />
            </div>
          </div>
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
              <span className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                Math.max(0, area.peso - area.total_pen) < area.peso * 0.7
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {Math.max(0, area.peso - area.total_pen) < area.peso * 0.7 && (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
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

      <Modal abierto={mostrarConfirmacion} titulo="Eliminar evaluacion" onCerrar={() => setMostrarConfirmacion(false)}>
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            <p className="mb-2 font-medium"> Esta accion es IRREVERSIBLE.</p>
            <p>Se borraran todos los comentarios, fotos y el PDF asociado a esta evaluacion.</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setMostrarConfirmacion(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={confirmarEliminar} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
