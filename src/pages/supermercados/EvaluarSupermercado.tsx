import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import type { Supermercado, Area, SupermercadoArea, Concepto, ConceptoCriticidad } from '../../types'
import { IconAgregar, IconEliminar } from '../../components/Icons'
import { SignaturePad } from '../../components/SignaturePad'
import { LoadingScreen } from '../../components/LoadingScreen'
import { generarPDF } from '../../utils/generarPDF'

function generarUUID() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

interface ConceptoConCrits extends Concepto {
  criticidades: ConceptoCriticidad[]
}

interface ComentarioState {
  _tempId: string
  conceptoId: string
  criticidadId: string
  texto: string
  fotos: string[]
}

interface AreaEvalState {
  areaId: string
  nombre: string
  peso: number
  comentarios: ComentarioState[]
}

export function EvaluarSupermercado() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [supermercado, setSupermercado] = useState<Supermercado | null>(null)
  const [areas, setAreas] = useState<AreaEvalState[]>([])
  const [conceptos, setConceptos] = useState<ConceptoConCrits[]>([])
  const [conceptoAreaMap, setConceptoAreaMap] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fechaInicioRef = useRef(new Date().toISOString())
  const [firma, setFirma] = useState<string | null>(null)
  const [mensajeProgreso, setMensajeProgreso] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('supermercados').select('*').eq('id', id).single(),
      supabase.from('supermercado_areas').select('*, area:area_id(*)').eq('supermercado_id', id).order('area_id'),
      supabase.from('conceptos').select('*').order('nombre'),
      supabase.from('concepto_areas').select('*'),
    ]).then(async ([sRes, saRes, cRes, caRes]) => {
      const lista = (saRes.data as (SupermercadoArea & { area: Area })[]) ?? []
      setSupermercado(sRes.data)
      setAreas(
        lista.map((sa) => ({
          areaId: sa.area_id,
          nombre: sa.area?.nombre ?? '?',
          peso: sa.peso,
          comentarios: [],
        }))
      )

      const caMap: Record<string, string[]> = {}
      ;(caRes.data ?? []).forEach((r: { concepto_id: string; area_id: string }) => {
        if (!caMap[r.area_id]) caMap[r.area_id] = []
        caMap[r.area_id].push(r.concepto_id)
      })
      setConceptoAreaMap(caMap)

      if (cRes.data) {
        const conceptosList = cRes.data as Concepto[]
        const completos = await Promise.all(
          conceptosList.map(async (c) => {
            const { data: crits } = await supabase
              .from('concepto_criticidades')
              .select('*')
              .eq('concepto_id', c.id)
              .order('penalizacion')
            return { ...c, criticidades: (crits as ConceptoCriticidad[]) ?? [] }
          })
        )
        setConceptos(completos)
      }

      setLoading(false)
    })
  }, [id])

  function conceptosParaArea(areaId: string): ConceptoConCrits[] {
    const idsPermitidos = conceptoAreaMap[areaId]
    if (!idsPermitidos) return []
    return conceptos.filter((c) => idsPermitidos.includes(c.id))
  }

  function agregarComentario(areaId: string) {
    setAreas((prev) =>
      prev.map((a) =>
        a.areaId === areaId
          ? { ...a, comentarios: [...a.comentarios, { _tempId: generarUUID(), conceptoId: '', criticidadId: '', texto: '', fotos: [] }] }
          : a
      )
    )
  }

  function actualizarComentario(areaId: string, tempId: string, campo: keyof ComentarioState, valor: string) {
    setAreas((prev) =>
      prev.map((a) =>
        a.areaId === areaId
          ? {
              ...a,
              comentarios: a.comentarios.map((cm) =>
                cm._tempId === tempId ? { ...cm, [campo]: valor } : cm
              ),
            }
          : a
      )
    )
  }

  function eliminarComentario(areaId: string, tempId: string) {
    setAreas((prev) =>
      prev.map((a) =>
        a.areaId === areaId
          ? { ...a, comentarios: a.comentarios.filter((cm) => cm._tempId !== tempId) }
          : a
      )
    )
  }

  function penalizacionTotal(areaId: string): number {
    const area = areas.find((a) => a.areaId === areaId)
    if (!area) return 0
    let total = 0
    for (const cm of area.comentarios) {
      if (!cm.criticidadId) continue
      for (const c of conceptos) {
        const crit = c.criticidades.find((cr) => cr.id === cm.criticidadId)
        if (crit) { total += crit.penalizacion; break }
      }
    }
    return total
  }

  function puntajeArea(area: AreaEvalState): number {
    return Math.max(0, area.peso - penalizacionTotal(area.areaId))
  }

  function puntajeTotal(): { earned: number; max: number } {
    const max = areas.reduce((s, a) => s + a.peso, 0)
    const totalPen = areas.reduce((s, a) => s + penalizacionTotal(a.areaId), 0)
    const earned = Math.max(0, max - totalPen)
    return { earned, max }
  }

  function manejarFotosComentario(areaId: string, tempId: string, archivos: FileList | null) {
    if (!archivos?.length) return
    Array.from(archivos).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setAreas((prev) =>
          prev.map((a) =>
            a.areaId === areaId
              ? {
                  ...a,
                  comentarios: a.comentarios.map((cm) =>
                    cm._tempId === tempId ? { ...cm, fotos: [...cm.fotos, dataUrl] } : cm
                  ),
                }
              : a
          )
        )
      }
      reader.readAsDataURL(file)
    })
  }

  function eliminarFotoComentario(areaId: string, tempId: string, index: number) {
    setAreas((prev) =>
      prev.map((a) =>
        a.areaId === areaId
          ? {
              ...a,
              comentarios: a.comentarios.map((cm) =>
                cm._tempId === tempId
                  ? { ...cm, fotos: cm.fotos.filter((_, i) => i !== index) }
                  : cm
              ),
            }
          : a
      )
    )
  }

  async function guardarEvaluacion() {
    if (!user || !id || !supermercado) return

    if (!firma) {
      setError('El gerente del supermercado debe firmar la evaluacion.')
      return
    }

    setGuardando(true)
    setError(null)

    const evaluacionId = generarUUID()
    const fechaISO = fechaInicioRef.current
    const fechaCierreISO = new Date().toISOString()

    const registros = areas.flatMap((a) =>
      a.comentarios.map((cm) => ({
        evaluacion_id: evaluacionId,
        supermercado_id: id,
        area_id: a.areaId,
        concepto_id: cm.conceptoId,
        criticidad_id: cm.criticidadId,
        comentario: cm.texto.trim(),
        fecha_inicio: fechaISO,
        creado_por: user.id,
      }))
    )

    if (registros.length === 0) {
      setError('Agrega al menos un comentario antes de guardar.')
      setGuardando(false)
      return
    }

    const registrosInvalidos = registros.filter((r) => !r.concepto_id || !r.criticidad_id)
    if (registrosInvalidos.length > 0) {
      setError('Todos los comentarios deben tener un concepto y nivel de criticidad seleccionados.')
      setGuardando(false)
      return
    }

    setMensajeProgreso('Guardando comentarios...')
    const { error: err } = await supabase.from('evaluacion_comentarios').insert(registros)
    if (err) {
      setError(err.message)
      setGuardando(false)
      setMensajeProgreso(null)
      return
    }

    setMensajeProgreso('Guardando informacion de la evaluacion...')
    const { error: headerErr } = await supabase.from('evaluacion_headers').insert({
      id: evaluacionId,
      supermercado_id: id,
      fecha_inicio: fechaISO,
      fecha_cierre: fechaCierreISO,
      firma,
      creado_por: user.id,
    })
    if (headerErr) {
      setError(headerErr.message)
      setGuardando(false)
      setMensajeProgreso(null)
      return
    }

    setMensajeProgreso('Generando PDF...')
    await new Promise((r) => setTimeout(r, 100))

    const datosPDF = {
      supermercadoNombre: supermercado.nombre,
      fechaInicio: new Date(fechaISO).toLocaleString('es-VE'),
      fechaCierre: new Date(fechaCierreISO).toLocaleString('es-VE'),
      evaluadorNombre: user.email ?? 'Evaluador',
      firma,
      areas: areas.map((a) => ({
        nombre: a.nombre,
        peso: a.peso,
        comentarios: a.comentarios.map((cm) => {
          const c = conceptos.find((co) => co.id === cm.conceptoId)
          const cr = c?.criticidades.find((cr) => cr.id === cm.criticidadId)
          return {
            concepto: c?.nombre ?? '?',
            criticidad: cr?.nivel ?? '',
            penalizacion: cr?.penalizacion ?? 0,
            texto: cm.texto,
            fotos: cm.fotos,
          }
        }),
      })),
    }

    let pdfDataUrl: string
    try {
      pdfDataUrl = await generarPDF(datosPDF)
    } catch (pdfErr) {
      setError('Error al generar el PDF: ' + (pdfErr instanceof Error ? pdfErr.message : 'desconocido'))
      setGuardando(false)
      setMensajeProgreso(null)
      return
    }

    await supabase.from('evaluacion_headers').update({ pdf_base64: pdfDataUrl }).eq('id', evaluacionId)

    setMensajeProgreso(null)
    navigate(`/operaciones/supermercados/${id}/evaluacion/${evaluacionId}`)
  }

  if (loading) return <LoadingScreen />
  if (!supermercado) return <div className="py-10 text-center text-slate-500">Supermercado no encontrado</div>

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link to="/operaciones/supermercados" className="mb-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Todos los supermercados
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{supermercado.nombre}</h1>
            <p className="text-slate-500">Nueva evaluacion</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Puntaje total</p>
            <p className="text-3xl font-bold text-blue-600">{puntajeTotal().earned}</p>
            <p className="text-xs text-slate-400">de {puntajeTotal().max} pts</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {mensajeProgreso && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{mensajeProgreso}</div>
      )}

      <div className="space-y-4">
        {areas.map((area) => {
          const pen = penalizacionTotal(area.areaId)
          const score = puntajeArea(area)
          return (
            <div key={area.areaId} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {area.nombre[0]}
                </span>
                <h2 className="text-lg font-semibold text-slate-800">{area.nombre}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Base: {area.peso} pts</span>
                {pen > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">-{pen} pts</span>
                )}
                <span className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                  score < area.peso * 0.7
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {score < area.peso * 0.7 && (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                  {score}/{area.peso}
                </span>
              </div>

              <div className="space-y-2">
                {area.comentarios.map((cm) => {
                  const crits = conceptos.find((c) => c.id === cm.conceptoId)?.criticidades ?? []
                  const critSel = crits.find((cr) => cr.id === cm.criticidadId)
                  return (
                    <div key={cm._tempId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-start gap-2">
                        <select
                          value={cm.conceptoId}
                          onChange={(e) => { actualizarComentario(area.areaId, cm._tempId, 'conceptoId', e.target.value); actualizarComentario(area.areaId, cm._tempId, 'criticidadId', '') }}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Concepto</option>
                          {conceptosParaArea(area.areaId).map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                        <select
                          value={cm.criticidadId}
                          onChange={(e) => actualizarComentario(area.areaId, cm._tempId, 'criticidadId', e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                          disabled={!cm.conceptoId}
                        >
                          <option value="">Criticidad</option>
                          {crits.map((cr) => (
                            <option key={cr.id} value={cr.id}>{cr.nivel} (-{cr.penalizacion})</option>
                          ))}
                        </select>
                        <input
                          value={cm.texto}
                          onChange={(e) => actualizarComentario(area.areaId, cm._tempId, 'texto', e.target.value)}
                          placeholder="Comentario..."
                          className="min-w-[120px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        {critSel && (
                          <span className="mt-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                            -{critSel.penalizacion} pts
                          </span>
                        )}
                        <button onClick={() => eliminarComentario(area.areaId, cm._tempId)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600" title="Eliminar comentario">
                          <IconEliminar className="h-4 w-4" />
                        </button>
                      </div>
                      {cm.fotos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {cm.fotos.map((foto, i) => (
                            <div key={i} className="group relative">
                              <img src={foto} alt={`Foto ${i + 1}`} className="h-14 w-14 rounded border border-slate-200 object-cover" />
                              <button
                                type="button"
                                onClick={() => eliminarFotoComentario(area.areaId, cm._tempId, i)}
                                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Agregar foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => manejarFotosComentario(area.areaId, cm._tempId, e.target.files)}
                        />
                      </label>
                    </div>
                  )
                })}
                <button
                  onClick={() => agregarComentario(area.areaId)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                >
                  <IconAgregar className="h-4 w-4" />
                  Agregar comentario
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {areas.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-slate-400">Este supermercado no tiene departamentos asignados.</p>
        </div>
      )}

      <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Firma del gerente <span className="text-red-500">*</span>
          </label>
          <SignaturePad value={firma} onChange={setFirma} disabled={guardando} />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Link
          to="/operaciones/supermercados"
          className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <button
          onClick={guardarEvaluacion}
          disabled={guardando || areas.length === 0}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar evaluacion'}
        </button>
      </div>
    </div>
  )
}
