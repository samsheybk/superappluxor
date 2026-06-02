import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import type { Concepto, ConceptoCriticidad, Area } from '../../types'

interface ConceptoCompleto extends Concepto {
  criticidades: ConceptoCriticidad[]
  areaIds: string[]
}

export function GestionConceptos() {
  const [conceptos, setConceptos] = useState<ConceptoCompleto[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => { cargarTodo(true) }, [])

  async function cargarTodo(showLoading = false) {
    if (showLoading) setLoading(true)
    const [cRes, aRes] = await Promise.all([
      supabase.from('conceptos').select('*').order('nombre'),
      supabase.from('areas').select('*').order('nombre'),
    ])
    if (aRes.data) setAreas(aRes.data as Area[])
    if (cRes.data) {
      const conceptosList = cRes.data as Concepto[]
      const completos = await Promise.all(
        conceptosList.map(async (c) => {
          const [crRes, caRes] = await Promise.all([
            supabase.from('concepto_criticidades').select('*').eq('concepto_id', c.id).order('nivel'),
            supabase.from('concepto_areas').select('area_id').eq('concepto_id', c.id),
          ])
          return {
            ...c,
            criticidades: (crRes.data as ConceptoCriticidad[]) ?? [],
            areaIds: (caRes.data ?? []).map((r: { area_id: string }) => r.area_id),
          }
        })
      )
      setConceptos(completos)
    }
    if (showLoading) setLoading(false)
  }

  async function crearConcepto() {
    if (!nuevoNombre.trim()) return
    const { data, error } = await supabase.from('conceptos').insert({ nombre: nuevoNombre.trim() }).select().single()
    if (error) { setMensaje(`Error: ${error.message}`); return }
    const niveles = [
      { nivel: 'ALTO', penalizacion: 10 },
      { nivel: 'MEDIO', penalizacion: 5 },
      { nivel: 'BAJO', penalizacion: 2 },
    ]
    const { error: errCrit } = await supabase.from('concepto_criticidades').insert(
      niveles.map((n) => ({ concepto_id: data.id, ...n }))
    )
    if (errCrit) { setMensaje(`Error al crear criticidades: ${errCrit.message}`); return }
    setMensaje(`Concepto "${nuevoNombre}" creado con niveles ALTO/MEDIO/BAJO`)
    setNuevoNombre('')
    cargarTodo()
  }

  async function eliminarConcepto(id: string) {
    await supabase.from('conceptos').delete().eq('id', id)
    cargarTodo()
  }

  async function actualizarPenalizacion(id: string, penalizacion: number) {
    const { error } = await supabase.from('concepto_criticidades').update({ penalizacion }).eq('id', id)
    if (error) setMensaje(`Error al guardar penalizacion: ${error.message}`)
    cargarTodo()
  }

  async function toggleAreaConcepto(conceptoId: string, areaId: string) {
    const c = conceptos.find((x) => x.id === conceptoId)
    if (!c) return
    const existe = c.areaIds.includes(areaId)
    if (existe) {
      await supabase.from('concepto_areas').delete().eq('concepto_id', conceptoId).eq('area_id', areaId)
    } else {
      await supabase.from('concepto_areas').insert({ concepto_id: conceptoId, area_id: areaId })
    }
    cargarTodo()
  }

  if (loading) return <div className="py-10 text-center text-slate-500">Cargando...</div>

  return (
    <div className="space-y-6">
      <div>
        <Link to="/operaciones/supermercados" className="mb-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Supermercados
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Gestion de conceptos</h1>
        <p className="text-slate-500">Conceptos para comentarios en evaluaciones</p>
      </div>

      {mensaje && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          {mensaje}
          <button onClick={() => setMensaje('')} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Nombre del concepto"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button onClick={crearConcepto} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Agregar concepto
        </button>
      </div>

      <div className="space-y-3">
        {conceptos.map((c) => (
          <div key={c.id} className="rounded-xl bg-white shadow-sm">
            <div className="flex items-center gap-3 px-5 py-4">
              <button
                onClick={() => setExpandido(expandido === c.id ? null : c.id)}
                className="flex items-center gap-2 text-left font-semibold text-slate-800"
              >
                <svg className={`h-4 w-4 text-slate-400 transition-transform ${expandido === c.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {c.nombre}
              </button>
              <span className="text-xs text-slate-400">{c.criticidades.length} criticidades | {c.areaIds.length} areas</span>
              <button onClick={() => eliminarConcepto(c.id)} className="ml-auto text-xs text-red-400 hover:text-red-600">Eliminar</button>
            </div>

            {expandido === c.id && (
              <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-600">Niveles de criticidad</p>
                  <div className="space-y-1.5">
                    {['ALTO', 'MEDIO', 'BAJO'].map((nivel) => {
                      const crit = c.criticidades.find((cr) => cr.nivel === nivel)
                      return (
                        <div key={nivel} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <span className={`w-16 font-semibold ${nivel === 'ALTO' ? 'text-red-600' : nivel === 'MEDIO' ? 'text-amber-600' : 'text-green-600'}`}>
                            {nivel}
                          </span>
                          <span className="text-xs text-slate-400">Penalizacion:</span>
                          <input
                            type="text" inputMode="numeric"
                            defaultValue={crit?.penalizacion ?? 10}
                            onBlur={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '')
                              const num = val === '' ? 1 : Math.min(100, Number(val))
                              e.target.value = String(num)
                              if (crit && num !== crit.penalizacion) actualizarPenalizacion(crit.id, num)
                            }}
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm text-center focus:border-blue-500 focus:outline-none"
                          />
                          <span className="text-xs text-red-500">pts negativos</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-600">Departamentos donde aplica</p>
                  <div className="flex flex-wrap gap-2">
                    {areas.map((a) => {
                      const activa = c.areaIds.includes(a.id)
                      return (
                        <button
                          key={a.id}
                          onClick={() => toggleAreaConcepto(c.id, a.id)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            activa
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {a.nombre}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {conceptos.length === 0 && (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-slate-400">No hay conceptos. Crea el primero arriba.</p>
          </div>
        )}
      </div>
    </div>
  )
}
