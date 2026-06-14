import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { DEPARTAMENTOS_POR_DIRECCION, type Direcciones } from '../types'

const DIRECCIONES: Direcciones[] = ['Operaciones', 'Talento Humano', 'Comercial', 'Finanzas']

interface DocIndicador {
  id: string
  titulo: string
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
  titulo: '', introduccion: '', objetivo_principal: '',
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

  useEffect(() => {
    supabase.from('documentacion_indicadores').select('*').order('departamento').then(({ data }) => {
      if (data) setDocs(data as unknown as DocIndicador[])
      setLoading(false)
      if (data && data.length > 0) setDeptoSeleccionado((data[0] as any).departamento)
    })
  }, [])

  const deptosConDocs = useMemo(() => {
    const names = new Set(docs.map((d) => d.departamento))
    const todos: { dir: Direcciones; deptos: string[] }[] = []
    for (const dir of DIRECCIONES) {
      const d = DEPARTAMENTOS_POR_DIRECCION[dir].filter((nom) => names.has(nom))
      if (d.length > 0) todos.push({ dir, deptos: d })
    }
    return todos
  }, [docs])

  const docActual = docs.find((d) => d.departamento === deptoSeleccionado)

  function abrirNuevo() {
    setEditando(null)
    setForm({ ...emptyForm, departamento: deptoSeleccionado })
    setNuevoObjSec(''); setNuevoResp('')
    setModalAbierto(true)
  }

  function abrirEditar() {
    if (!docActual) return
    setEditando(docActual.id)
    setForm({
      titulo: docActual.titulo,
      introduccion: docActual.introduccion,
      objetivo_principal: docActual.objetivo_principal,
      objetivos_secundarios: [...docActual.objetivos_secundarios],
      metodo_evaluacion: docActual.metodo_evaluacion,
      valoracion_resultados: docActual.valoracion_resultados,
      impacto_negocio: docActual.impacto_negocio,
      responsables_directos: [...docActual.responsables_directos],
      frecuencia_medicion: docActual.frecuencia_medicion,
      departamento: docActual.departamento,
      repercusion_laboral: docActual.repercusion_laboral,
    })
    setNuevoObjSec(''); setNuevoResp('')
    setModalAbierto(true)
  }

  async function guardar() {
    setGuardando(true)
    try {
      const payload = {
        ...form,
        objetivos_secundarios: JSON.stringify(form.objetivos_secundarios),
        responsables_directos: JSON.stringify(form.responsables_directos),
      }
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

  async function eliminar() {
    if (!docActual) return
    if (!confirm('Eliminar esta documentacion?')) return
    await supabase.from('documentacion_indicadores').delete().eq('id', docActual.id)
    const { data } = await supabase.from('documentacion_indicadores').select('*').order('departamento')
    if (data) setDocs(data as unknown as DocIndicador[])
    setDeptoSeleccionado('')
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
        {esAdmin && (
          <div className="flex gap-2">
            {docActual && (
              <>
                <button onClick={abrirEditar}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Editar
                </button>
                <button onClick={eliminar}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Eliminar
                </button>
              </>
            )}
            <button onClick={abrirNuevo}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              + Agregar
            </button>
          </div>
        )}
      </div>

      {/* Department selector */}
      {deptosConDocs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {deptosConDocs.map(({ dir, deptos }) => (
            <div key={dir} className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">{dir}:</span>
              {deptos.map((d) => (
                <button key={d} onClick={() => setDeptoSeleccionado(d)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    deptoSeleccionado === d
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
                  }`}
                >
                  {d}
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

      {docActual ? (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-800">{docActual.titulo}</h2>

          <Section label="Introduccion">
            <p className="text-sm text-slate-600 leading-relaxed">{docActual.introduccion}</p>
          </Section>

          <Section label="Objetivo principal">
            <p className="text-sm font-medium text-slate-700">{docActual.objetivo_principal}</p>
          </Section>

          <Section label="Objetivos secundarios">
            <ul className="list-disc pl-5 space-y-1">
              {docActual.objetivos_secundarios.map((obj: string, i: number) => (
                <li key={i} className="text-sm text-slate-600">{obj}</li>
              ))}
            </ul>
          </Section>

          <Section label="Metodo de evaluacion">
            <p className="text-sm text-slate-600 leading-relaxed">{docActual.metodo_evaluacion}</p>
          </Section>

          <Section label="Valoracion de los resultados">
            <p className="text-sm text-slate-600 leading-relaxed">{docActual.valoracion_resultados}</p>
          </Section>

          <Section label="Impacto en el negocio">
            <p className="text-sm text-slate-600 leading-relaxed">{docActual.impacto_negocio}</p>
          </Section>

          <Section label="Responsables directos">
            <div className="flex flex-wrap gap-2">
              {docActual.responsables_directos.map((r: string, i: number) => (
                <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{r}</span>
              ))}
            </div>
          </Section>

          <Section label="Frecuencia de medicion">
            <p className="text-sm text-slate-600">{docActual.frecuencia_medicion}</p>
          </Section>

          <Section label="Departamento">
            <p className="text-sm font-medium text-blue-600">{docActual.departamento}</p>
          </Section>

          <Section label="Repercusion a nivel de la relacion laboral">
            <p className="text-sm text-slate-600 leading-relaxed">{docActual.repercusion_laboral}</p>
          </Section>
        </div>
      ) : docs.length > 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">Selecciona un departamento para ver su documentacion</p>
        </div>
      ) : null}

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="mt-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">{editando ? 'Editar documentacion' : 'Nueva documentacion'}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Titulo</label>
                <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Introduccion</label>
                <textarea value={form.introduccion} onChange={(e) => setForm({ ...form, introduccion: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={3}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Objetivo principal</label>
                <textarea value={form.objetivo_principal} onChange={(e) => setForm({ ...form, objetivo_principal: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={2}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Objetivos secundarios</label>
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
                <label className="mb-1 block text-xs font-medium text-slate-600">Metodo de evaluacion</label>
                <textarea value={form.metodo_evaluacion} onChange={(e) => setForm({ ...form, metodo_evaluacion: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={3}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Valoracion de los resultados</label>
                <textarea value={form.valoracion_resultados} onChange={(e) => setForm({ ...form, valoracion_resultados: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={3}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Impacto en el negocio</label>
                <textarea value={form.impacto_negocio} onChange={(e) => setForm({ ...form, impacto_negocio: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" rows={3}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Responsables directos</label>
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
                <label className="mb-1 block text-xs font-medium text-slate-600">Frecuencia de medicion</label>
                <input value={form.frecuencia_medicion} onChange={(e) => setForm({ ...form, frecuencia_medicion: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Departamento</label>
                <input value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Repercusion a nivel de la relacion laboral</label>
                <textarea value={form.repercusion_laboral} onChange={(e) => setForm({ ...form, repercusion_laboral: e.target.value })}
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
              <button onClick={guardar} disabled={guardando || !form.titulo || !form.departamento}
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
