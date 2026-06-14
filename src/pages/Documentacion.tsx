import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { DEPARTAMENTOS_POR_DIRECCION, type Direcciones } from '../types'

const DIRECCIONES: Direcciones[] = ['Operaciones', 'Talento Humano', 'Comercial', 'Finanzas']

interface DocIndicador {
  id: string
  titulo: string
  tipo: string
  introduccion: string
  objetivo_principal: string
  objetivos_secundarios: string[]
  metodo_evaluacion: string
  valoracion_resultados: string
  impacto_negocio: string
  responsables_directos: string[]
  frecuencia_medicion: string
  departamento: string
  repercusion_laboral: string
  created_at: string
  updated_at: string
}

const emptyForm = {
  titulo: '', tipo: '', introduccion: '', objetivo_principal: '',
  objetivos_secundarios: [] as string[], metodo_evaluacion: '',
  valoracion_resultados: '', impacto_negocio: '',
  responsables_directos: [] as string[], frecuencia_medicion: '',
  departamento: '', repercusion_laboral: '',
}

export function Documentacion() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'admin'
  const [docs, setDocs] = useState<DocIndicador[]>([])
  const [loading, setLoading] = useState(true)
  const [deptoSeleccionado, setDeptoSeleccionado] = useState<string>('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [nuevoObjSec, setNuevoObjSec] = useState('')
  const [nuevoResp, setNuevoResp] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.from('documentacion_indicadores').select('*').order('departamento').then(({ data }) => {
      if (data) setDocs(data as unknown as DocIndicador[])
      setLoading(false)
      if (data && data.length > 0) setDeptoSeleccionado((data[0] as any).departamento)
    })
  }, [])

  function normalizarArr(val: any): string[] {
    if (Array.isArray(val)) return val
    if (typeof val === 'string') try { return JSON.parse(val) } catch { return [] }
    return []
  }

  const deptosConDocs = useMemo(() => {
    const names = new Set(docs.map((d) => d.departamento))
    const todos: { dir: Direcciones; deptos: { nombre: string; count: number }[] }[] = []
    for (const dir of DIRECCIONES) {
      const d = DEPARTAMENTOS_POR_DIRECCION[dir]
        .filter((nom) => names.has(nom))
        .map((nom) => ({ nombre: nom, count: docs.filter((doc) => doc.departamento === nom).length }))
      if (d.length > 0) todos.push({ dir, deptos: d })
    }
    return todos
  }, [docs])

  const docsDelDepto = docs.filter((d) => d.departamento === deptoSeleccionado)

  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ ...emptyForm, departamento: deptoSeleccionado })
    setNuevoObjSec(''); setNuevoResp('')
    setModalAbierto(true)
  }

  function abrirEditar(doc: DocIndicador) {
    setEditando(doc.id)
    setForm({
      titulo: doc.titulo,
      tipo: doc.tipo,
      introduccion: doc.introduccion,
      objetivo_principal: doc.objetivo_principal,
      objetivos_secundarios: normalizarArr(doc.objetivos_secundarios),
      metodo_evaluacion: doc.metodo_evaluacion,
      valoracion_resultados: doc.valoracion_resultados,
      impacto_negocio: doc.impacto_negocio,
      responsables_directos: normalizarArr(doc.responsables_directos),
      frecuencia_medicion: doc.frecuencia_medicion,
      departamento: doc.departamento,
      repercusion_laboral: doc.repercusion_laboral,
    })
    setNuevoObjSec(''); setNuevoResp('')
    setModalAbierto(true)
  }

  async function guardar() {
    setGuardando(true)
    try {
      const payload = { ...form }
      if (editando) {
        await supabase.from('documentacion_indicadores').update(payload).eq('id', editando)
      } else {
        await supabase.from('documentacion_indicadores').insert(payload)
      }
      const { data } = await supabase.from('documentacion_indicadores').select('*').order('departamento')
      if (data) setDocs(data as unknown as DocIndicador[])
      setModalAbierto(false)
    } catch (e: any) { console.error(e) } finally { setGuardando(false) }
  }

  async function eliminar(id: string) {
    if (!confirm('Eliminar esta documentacion?')) return
    await supabase.from('documentacion_indicadores').delete().eq('id', id)
    const { data } = await supabase.from('documentacion_indicadores').select('*').order('departamento')
    if (data) setDocs(data as unknown as DocIndicador[])
    setExpandidos((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  function agregarObjSec() {
    if (!nuevoObjSec.trim()) return
    setForm((f) => ({ ...f, objetivos_secundarios: [...f.objetivos_secundarios, nuevoObjSec.trim()] }))
    setNuevoObjSec('')
  }

  function agregarResp() {
    if (!nuevoResp.trim()) return
    setForm((f) => ({ ...f, responsables_directos: [...f.responsables_directos, nuevoResp.trim()] }))
    setNuevoResp('')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-sm text-slate-500">Cargando documentacion...</div>
    </div>
  )

  return (
    <div className="lg:py-8 lg:pr-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documentación de Indicadores</h1>
          <p className="mt-1 text-sm text-slate-500">Ficha técnica completa de cada indicador de gestión por departamento</p>
        </div>
        {esAdmin && deptoSeleccionado && (
          <button onClick={abrirNuevo}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            + Agregar
          </button>
        )}
      </div>

      {/* Department selector */}
      {deptosConDocs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {deptosConDocs.map(({ dir, deptos }) => (
            <div key={dir} className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">{dir}:</span>
              {deptos.map(({ nombre, count }) => (
                <button key={nombre} onClick={() => setDeptoSeleccionado(nombre)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    deptoSeleccionado === nombre
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
                  }`}
                >
                  {nombre} ({count})
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {docs.length === 0 && (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">No hay documentacion aun. {esAdmin ? 'Presiona "+ Agregar" para crear la primera.' : ''}</p>
        </div>
      )}

      {docsDelDepto.length === 0 && docs.length > 0 && (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">Selecciona un departamento para ver su documentacion</p>
        </div>
      )}

      {/* Document list */}
      <div className="space-y-3">
        {docsDelDepto.map((doc) => {
          const abierto = expandidos.has(doc.id)
          return (
            <div key={doc.id} className="rounded-xl bg-white shadow-sm overflow-hidden">
              <button onClick={() => toggleExpandido(doc.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${abierto ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="flex-1 text-sm font-medium text-slate-700">{doc.titulo}</span>
                <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${doc.tipo === 'KPI' ? 'bg-purple-100 text-purple-700' : doc.tipo === 'OKR' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>{doc.tipo}</span>
                <span className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </button>
              {abierto && (
                <div className="border-t border-slate-100 p-4">
                  {esAdmin && (
                    <div className="mb-4 flex gap-2">
                      <button onClick={() => abrirEditar(doc)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >Editar</button>
                      <button onClick={() => eliminar(doc.id)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >Eliminar</button>
                    </div>
                  )}

                  <Section label="Tipo">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${doc.tipo === 'KPI' ? 'bg-purple-100 text-purple-700' : doc.tipo === 'OKR' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>{doc.tipo}</span>
                  </Section>
                  <Section label="Introduccion">
                    <p className="text-sm text-slate-600 leading-relaxed">{doc.introduccion}</p>
                  </Section>
                  <Section label="Objetivo principal">
                    <p className="text-sm font-medium text-slate-700">{doc.objetivo_principal}</p>
                  </Section>
                  <Section label="Objetivos secundarios">
                    <ul className="list-disc pl-5 space-y-1">
                      {normalizarArr(doc.objetivos_secundarios).map((obj: string, i: number) => (
                        <li key={i} className="text-sm text-slate-600">{obj}</li>
                      ))}
                    </ul>
                  </Section>
                  <Section label="Metodo de evaluacion">
                    <p className="text-sm text-slate-600 leading-relaxed">{doc.metodo_evaluacion}</p>
                  </Section>
                  <Section label="Valoracion de los resultados">
                    <p className="text-sm text-slate-600 leading-relaxed">{doc.valoracion_resultados}</p>
                  </Section>
                  <Section label="Impacto en el negocio">
                    <p className="text-sm text-slate-600 leading-relaxed">{doc.impacto_negocio}</p>
                  </Section>
                  <Section label="Responsables directos">
                    <div className="flex flex-wrap gap-2">
                      {normalizarArr(doc.responsables_directos).map((r: string, i: number) => (
                        <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{r}</span>
                      ))}
                    </div>
                  </Section>
                  <Section label="Frecuencia de medicion">
                    <p className="text-sm text-slate-600">{doc.frecuencia_medicion}</p>
                  </Section>
                  <Section label="Departamento">
                    <p className="text-sm font-medium text-blue-600">{doc.departamento}</p>
                  </Section>
                  <Section label="Repercusion a nivel de la relacion laboral">
                    <p className="text-sm text-slate-600 leading-relaxed">{doc.repercusion_laboral}</p>
                  </Section>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="mt-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">{editando ? 'Editar documentacion' : 'Nueva documentacion'}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Tipo <span className="text-red-500">*</span></label>
                <select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  <option value="KPI">KPI</option>
                  <option value="OKR">OKR</option>
                  <option value="POLITICA">POLITICA</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Titulo <span className="text-red-500">*</span></label>
                <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Introduccion <span className="text-red-500">*</span></label>
                <textarea required value={form.introduccion} onChange={(e) => setForm({ ...form, introduccion: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={3}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Objetivo principal <span className="text-red-500">*</span></label>
                <textarea required value={form.objetivo_principal} onChange={(e) => setForm({ ...form, objetivo_principal: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={2}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Objetivos secundarios <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.objetivos_secundarios.map((obj, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-600">
                      {obj}
                      <button onClick={() => setForm({ ...form, objetivos_secundarios: form.objetivos_secundarios.filter((_, j) => j !== i) })}
                        className="text-blue-400 hover:text-blue-600">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={nuevoObjSec} onChange={(e) => setNuevoObjSec(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && agregarObjSec()}
                    placeholder="Agregar objetivo..."
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button onClick={agregarObjSec} className="rounded-lg bg-blue-600 px-3 text-sm text-white hover:bg-blue-700">+</button>
                </div>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Metodo de evaluacion <span className="text-red-500">*</span></label>
                <textarea required value={form.metodo_evaluacion} onChange={(e) => setForm({ ...form, metodo_evaluacion: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={3}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Valoracion de los resultados <span className="text-red-500">*</span></label>
                <textarea required value={form.valoracion_resultados} onChange={(e) => setForm({ ...form, valoracion_resultados: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={3}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Impacto en el negocio <span className="text-red-500">*</span></label>
                <textarea required value={form.impacto_negocio} onChange={(e) => setForm({ ...form, impacto_negocio: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={3}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Responsables directos <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.responsables_directos.map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs text-green-600">
                      {r}
                      <button onClick={() => setForm({ ...form, responsables_directos: form.responsables_directos.filter((_, j) => j !== i) })}
                        className="text-green-400 hover:text-green-600">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={nuevoResp} onChange={(e) => setNuevoResp(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && agregarResp()}
                    placeholder="Agregar responsable..."
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button onClick={agregarResp} className="rounded-lg bg-blue-600 px-3 text-sm text-white hover:bg-blue-700">+</button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Frecuencia de medicion <span className="text-red-500">*</span></label>
                <select required value={form.frecuencia_medicion} onChange={(e) => setForm({ ...form, frecuencia_medicion: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Semanal">Semanal</option>
                  <option value="Quincenal">Quincenal</option>
                  <option value="Mensual">Mensual</option>
                  <option value="Trimestral">Trimestral</option>
                  <option value="Semestral">Semestral</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Departamento <span className="text-red-500">*</span></label>
                <select required value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  <option value="TODOS">TODOS</option>
                  {DIRECCIONES.flatMap((dir) => DEPARTAMENTOS_POR_DIRECCION[dir]).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Repercusion a nivel de la relacion laboral <span className="text-red-500">*</span></label>
                <textarea required value={form.repercusion_laboral} onChange={(e) => setForm({ ...form, repercusion_laboral: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalAbierto(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando || !form.titulo || !form.tipo || !form.introduccion || !form.objetivo_principal || form.objetivos_secundarios.length === 0 || !form.metodo_evaluacion || !form.valoracion_resultados || !form.impacto_negocio || form.responsables_directos.length === 0 || !form.frecuencia_medicion || !form.departamento || !form.repercusion_laboral}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear documentacion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</h3>
      {children}
    </div>
  )
}
