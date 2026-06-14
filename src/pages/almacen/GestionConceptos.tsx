import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { LoadingScreen } from '../../components/LoadingScreen'

interface Concepto {
  id: string
  nombre: string
  criticidades: { id: string; nivel: string; penalizacion: number }[]
}

export function GestionConceptosAlmacen() {
  const [conceptos, setConceptos] = useState<Concepto[]>([])
  const [areas, setAreas] = useState<{ id: string; nombre: string }[]>([])
  const [conceptoAreaMap, setConceptoAreaMap] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState('')

  const [nuevoConcepto, setNuevoConcepto] = useState('')

  function cargarDatos() {
    setLoading(true)
    Promise.all([
      supabase.from('almacen_conceptos').select('*').order('nombre'),
      supabase.from('almacen_areas').select('*').order('nombre'),
      supabase.from('almacen_concepto_areas').select('*'),
    ]).then(async ([cRes, aRes, caRes]) => {
      if (aRes.data) setAreas(aRes.data)

      const caMap: Record<string, string[]> = {}
      ;(caRes.data ?? []).forEach((r: { concepto_id: string; area_id: string }) => {
        if (!caMap[r.concepto_id]) caMap[r.concepto_id] = []
        caMap[r.concepto_id].push(r.area_id)
      })
      setConceptoAreaMap(caMap)

      if (cRes.data) {
        const completos = await Promise.all(
          (cRes.data as { id: string; nombre: string }[]).map(async (c) => {
            const { data: crits } = await supabase
              .from('almacen_concepto_criticidades')
              .select('*')
              .eq('concepto_id', c.id)
              .order('penalizacion')
            return { ...c, criticidades: crits ?? [] }
          })
        )
        setConceptos(completos)
      }
      setLoading(false)
    })
  }

  useEffect(() => { cargarDatos() }, [])

  async function crearConcepto() {
    if (!nuevoConcepto.trim()) return
    const { error } = await supabase.from('almacen_conceptos').insert({ nombre: nuevoConcepto.trim() })
    if (error) { setMensaje(`Error: ${error.message}`) } else {
      // Create default criticidades for new concept
      const { data } = await supabase.from('almacen_conceptos').select('id').eq('nombre', nuevoConcepto.trim()).single()
      if (data) {
        await supabase.from('almacen_concepto_criticidades').insert([
          { concepto_id: data.id, nivel: 'ALTO', penalizacion: 10 },
          { concepto_id: data.id, nivel: 'MEDIO', penalizacion: 5 },
          { concepto_id: data.id, nivel: 'BAJO', penalizacion: 2 },
        ])
        // Link to all areas
        const { data: todas } = await supabase.from('almacen_areas').select('id')
        if (todas) {
          await supabase.from('almacen_concepto_areas').insert(
            todas.map((a) => ({ concepto_id: data.id, area_id: a.id }))
          )
        }
      }
      setMensaje(`Concepto "${nuevoConcepto}" creado`)
      setNuevoConcepto('')
      cargarDatos()
    }
  }

  async function eliminarConcepto(id: string) {
    if (!confirm('Eliminar este concepto? Se borraran sus criticidades y relaciones.')) return
    await supabase.from('almacen_conceptos').delete().eq('id', id)
    setMensaje('Concepto eliminado')
    cargarDatos()
  }

  async function toggleArea(conceptoId: string, areaId: string) {
    const asignadas = conceptoAreaMap[conceptoId] ?? []
    if (asignadas.includes(areaId)) {
      await supabase.from('almacen_concepto_areas').delete().eq('concepto_id', conceptoId).eq('area_id', areaId)
    } else {
      await supabase.from('almacen_concepto_areas').insert({ concepto_id: conceptoId, area_id: areaId })
    }
    cargarDatos()
  }

  async function actualizarCriticidad(criticidadId: string, campo: 'nivel' | 'penalizacion', valor: string | number) {
    await supabase.from('almacen_concepto_criticidades').update({ [campo]: valor }).eq('id', criticidadId)
    cargarDatos()
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link to="/departamento/almacen-y-distribucion" className="mb-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Evaluaciones del almacen
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Gestionar conceptos</h1>
        <p className="text-slate-500">Administra los criterios de evaluacion para Almacen y Distribucion</p>
      </div>

      <div className="mb-6 flex gap-2">
        <input value={nuevoConcepto} onChange={(e) => setNuevoConcepto(e.target.value)}
          placeholder="Nuevo concepto..."
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && crearConcepto()}
        />
        <button onClick={crearConcepto}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >Agregar</button>
      </div>

      {mensaje && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          {mensaje}
          <button onClick={() => setMensaje('')} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      <div className="space-y-3">
        {conceptos.map((c) => (
          <div key={c.id} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{c.nombre}</h3>
              <button onClick={() => eliminarConcepto(c.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
              >Eliminar</button>
            </div>

            <div className="mb-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Criticidades</p>
              <div className="flex flex-wrap gap-2">
                {c.criticidades.map((cr) => (
                  <div key={cr.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5">
                    <select value={cr.nivel}
                      onChange={(e) => actualizarCriticidad(cr.id, 'nivel', e.target.value)}
                      className="rounded border border-slate-200 px-1.5 py-0.5 text-xs focus:border-blue-500 focus:outline-none"
                    >
                      <option value="ALTO">ALTO</option>
                      <option value="MEDIO">MEDIO</option>
                      <option value="BAJO">BAJO</option>
                    </select>
                    <span className="text-xs text-slate-400">-</span>
                    <input type="number" value={cr.penalizacion}
                      onChange={(e) => actualizarCriticidad(cr.id, 'penalizacion', parseInt(e.target.value) || 0)}
                      className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-center focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-400">pts</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Aplica a</p>
              <div className="flex flex-wrap gap-1.5">
                {areas.map((a) => {
                  const activa = (conceptoAreaMap[c.id] ?? []).includes(a.id)
                  return (
                    <button key={a.id} onClick={() => toggleArea(c.id, a.id)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        activa ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >{a.nombre}</button>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {conceptos.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-slate-400">No hay conceptos creados. Crea el primero arriba.</p>
        </div>
      )}
    </div>
  )
}
