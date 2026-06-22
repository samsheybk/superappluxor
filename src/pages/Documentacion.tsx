import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { DEPARTAMENTOS_POR_DIRECCION, type Direcciones } from '../types'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

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
  responsables_indirectos: string[]
  frecuencia_medicion: string
  departamento: string[]
  repercusion_laboral: string
  pdf_aprobado?: string | null
  fecha_aprobacion?: string | null
  created_at: string
  updated_at: string
  autocalculado?: boolean
}

const emptyForm = {
  titulo: '', tipo: '', introduccion: '', objetivo_principal: '',
  objetivos_secundarios: [] as string[], metodo_evaluacion: '',
  valoracion_resultados: '', impacto_negocio: '',
  responsables_directos: [] as string[], responsables_indirectos: [] as string[],
  frecuencia_medicion: '', departamento: [] as string[], repercusion_laboral: '',
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
  const [guardando, setGuardando] = useState(false)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [cargos, setCargos] = useState<{ descripcion: string; departamento: string }[]>([])

  useEffect(() => {
    supabase.from('documentacion_indicadores').select('*').order('created_at').then(({ data }) => {
      if (data) setDocs(data as unknown as DocIndicador[])
      setLoading(false)
      if (data && data.length > 0) {
        const depts = (data[0] as any).departamento
        setDeptoSeleccionado(Array.isArray(depts) ? depts[0] : depts)
      }
    })
    supabase.from('rrhh_plantillas_aprobadas').select('descripcion, departamento').then(({ data }) => {
      if (data) setCargos(data as { descripcion: string; departamento: string }[])
    })
  }, [])

  function normalizarArr(val: any): string[] {
    if (Array.isArray(val)) return val
    if (typeof val === 'string') try { return JSON.parse(val) } catch { return [val] }
    return []
  }

  const deptosConDocs = useMemo(() => {
    const names = new Set(docs.flatMap((d) => normalizarArr(d.departamento)))
    const todos: { dir: Direcciones; deptos: { nombre: string; count: number }[] }[] = []
    for (const dir of DIRECCIONES) {
      const d = DEPARTAMENTOS_POR_DIRECCION[dir]
        .filter((nom) => names.has(nom))
        .map((nom) => ({ nombre: nom, count: docs.filter((doc) => normalizarArr(doc.departamento).includes(nom)).length }))
      if (d.length > 0) todos.push({ dir, deptos: d })
    }
    return todos
  }, [docs])

  const docsDelDepto = docs.filter((d) => normalizarArr(d.departamento).includes(deptoSeleccionado))

  const cargosFiltrados = useMemo(() => {
    if (form.departamento.length === 0 || cargos.length === 0) return []
    const depts = form.departamento.map(d => d.toUpperCase())
    const descs = cargos.filter(c => depts.includes(c.departamento.toUpperCase())).map(c => c.descripcion)
    return [...new Set(descs)].sort()
  }, [cargos, form.departamento])

  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ ...emptyForm, departamento: deptoSeleccionado ? [deptoSeleccionado] : [] })
    setNuevoObjSec('')
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
      responsables_indirectos: normalizarArr(doc.responsables_indirectos),
      frecuencia_medicion: doc.frecuencia_medicion,
      departamento: normalizarArr(doc.departamento),
      repercusion_laboral: doc.repercusion_laboral,
    })
    setNuevoObjSec('')
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
      const { data } = await supabase.from('documentacion_indicadores').select('*').order('created_at')
      if (data) setDocs(data as unknown as DocIndicador[])
      setModalAbierto(false)
    } catch (e: any) { console.error(e) } finally { setGuardando(false) }
  }

  async function eliminar(id: string) {
    if (!confirm('Eliminar esta documentacion?')) return
    await supabase.from('documentacion_indicadores').delete().eq('id', id)
    const { data } = await supabase.from('documentacion_indicadores').select('*').order('created_at')
    if (data) setDocs(data as unknown as DocIndicador[])
    setExpandidos((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  function agregarObjSec() {
    if (!nuevoObjSec.trim()) return
    setForm((f) => ({ ...f, objetivos_secundarios: [...f.objetivos_secundarios, nuevoObjSec.trim()] }))
    setNuevoObjSec('')
  }

  function toggleCargo(field: 'responsables_directos' | 'responsables_indirectos', cargo: string) {
    setForm((f) => {
      const arr = f[field]
      return { ...f, [field]: arr.includes(cargo) ? arr.filter(c => c !== cargo) : [...arr, cargo] }
    })
  }

  const pdfInputRef = useRef<HTMLInputElement>(null)

  function generarPDF(doc: DocIndicador) {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageW = 210
    const margin = 20
    const bodyW = pageW - margin * 2
    let y = margin

    function addSection(title: string, content: string | string[]) {
      if (y > 260) { pdf.addPage(); y = margin }
      pdf.setFontSize(10); pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 26, 74)
      pdf.text(title.toUpperCase(), margin, y)
      y += 5
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
      pdf.setTextColor(71, 85, 105)
      if (Array.isArray(content)) {
        content.forEach((line) => {
          if (y > 270) { pdf.addPage(); y = margin }
          pdf.text(`- ${line}`, margin + 3, y); y += 5
        })
      } else {
        const lines = pdf.splitTextToSize(content, bodyW)
        lines.forEach((line: string) => {
          if (y > 270) { pdf.addPage(); y = margin }
          pdf.text(line, margin, y); y += 5
        })
      }
      y += 3
    }

    pdf.setFontSize(16); pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 26, 74)
    pdf.text('SUPERMERCADOS LUXOR C.A.', pageW / 2, y, { align: 'center' })
    y += 8
    pdf.setFontSize(11); pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 116, 139)
    pdf.text('DOCUMENTACION DE INDICADORES DE GESTION', pageW / 2, y, { align: 'center' })
    y += 10

    pdf.setDrawColor(0, 26, 74); pdf.setLineWidth(0.5)
    pdf.line(margin, y, pageW - margin, y)
    y += 8

    addSection('Tipo', doc.tipo)
    addSection('Titulo', doc.titulo)
    addSection('Introduccion', doc.introduccion)
    addSection('Objetivo Principal', doc.objetivo_principal)
    addSection('Objetivos Secundarios', normalizarArr(doc.objetivos_secundarios))
    addSection('Metodo de Evaluacion', doc.metodo_evaluacion)
    addSection('Valoracion de los Resultados', doc.valoracion_resultados)
    addSection('Impacto en el Negocio', doc.impacto_negocio)
    addSection('Responsables Directos', normalizarArr(doc.responsables_directos))
    addSection('Responsables Indirectos', normalizarArr(doc.responsables_indirectos))
    addSection('Frecuencia de Medicion', doc.frecuencia_medicion)
    addSection('Departamento', normalizarArr(doc.departamento).join(', '))
    addSection('Repercusion Laboral', doc.repercusion_laboral)

    if (y > 220) { pdf.addPage(); y = margin }

    pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.3)
    pdf.line(margin, y, pageW - margin, y)
    y += 10

    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0, 26, 74)
    pdf.text('FIRMAS DE APROBACION', pageW / 2, y, { align: 'center' })
    y += 12

    const firmas = [
      'PRESIDENCIA',
      'GERENCIA DE TALENTO HUMANO',
      'RESPONSABLE DE EVALUACIONES',
    ]
    firmas.forEach((firma) => {
      if (y > 260) { pdf.addPage(); y = margin + 20 }
      pdf.setDrawColor(100, 116, 139); pdf.setLineWidth(0.5)
      pdf.line(margin + 30, y, pageW - margin - 30, y)
      y += 4
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 116, 139)
      pdf.text(firma, pageW / 2, y, { align: 'center' })
      y += 12
    })

    pdf.setFontSize(7); pdf.setTextColor(148, 163, 184)
    pdf.text(`Documento ID: ${doc.id.slice(0, 8)} | Generado: ${new Date().toLocaleDateString('es-VE')}`, pageW / 2, 290, { align: 'center' })

    pdf.save(`${doc.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
  }

  async function subirPDFAprobado(docId: string, file: File) {
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      const { error } = await supabase.from('documentacion_indicadores').update({
        pdf_aprobado: base64,
        fecha_aprobacion: new Date().toISOString(),
      }).eq('id', docId)
      if (!error) {
        setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, pdf_aprobado: base64, fecha_aprobacion: new Date().toISOString() } : d))
      }
    }
    reader.readAsDataURL(file)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-sm text-slate-500">Cargando documentacion...</div>
    </div>
  )

  return (
    <div className="lg:py-8 lg:pr-8 space-y-6">
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Documentacion</span>
      </div>
      <div className="flex items-center justify-end gap-2">
        {esAdmin && (
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
                  <div className="mb-4 flex flex-wrap gap-2">
                    {esAdmin && (
                      <>
                        <button onClick={() => abrirEditar(doc)}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >Editar</button>
                        <button onClick={() => eliminar(doc.id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >Eliminar</button>
                      </>
                    )}
                    <button onClick={() => generarPDF(doc)}
                      className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                    >Descargar PDF</button>
                    <button onClick={() => pdfInputRef.current?.click()}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                    >Adjuntar PDF firmado</button>
                    <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) subirPDFAprobado(doc.id, f); e.target.value = '' }}
                    />
                    {doc.pdf_aprobado && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        ✓ Aprobado {doc.fecha_aprobacion ? new Date(doc.fecha_aprobacion).toLocaleDateString('es-VE') : ''}
                      </span>
                    )}
                  </div>

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
                  <Section label="Responsables indirectos">
                    <div className="flex flex-wrap gap-2">
                      {normalizarArr(doc.responsables_indirectos).map((r: string, i: number) => (
                        <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{r}</span>
                      ))}
                    </div>
                  </Section>
                  <Section label="Frecuencia de medicion">
                    <p className="text-sm text-slate-600">{doc.frecuencia_medicion}</p>
                  </Section>
                  <Section label="Departamento">
                    <div className="flex flex-wrap gap-1.5">
                      {normalizarArr(doc.departamento).map((d, i) => (
                        <span key={i} className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-600">{d}</span>
                      ))}
                    </div>
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
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {form.departamento.length === 0 ? (
                    <p className="text-xs text-slate-400 p-1">Selecciona uno o mas departamentos primero para ver los cargos disponibles.</p>
                  ) : cargosFiltrados.length === 0 ? (
                    <p className="text-xs text-slate-400 p-1">No hay cargos registrados para el/los departamento(s) seleccionado(s). Cree cargos en Reclutamiento → Plantilla Aprobada primero.</p>
                  ) : cargosFiltrados.map((c) => (
                    <button key={c} onClick={() => toggleCargo('responsables_directos', c)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        form.responsables_directos.includes(c)
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >{c}</button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Responsables indirectos</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.responsables_indirectos.map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-600">
                      {r}
                      <button onClick={() => setForm({ ...form, responsables_indirectos: form.responsables_indirectos.filter((_, j) => j !== i) })}
                        className="text-amber-400 hover:text-amber-600">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {form.departamento.length === 0 ? (
                    <p className="text-xs text-slate-400 p-1">Selecciona uno o mas departamentos primero para ver los cargos disponibles.</p>
                  ) : (() => {
                    const cargosIndirectos = cargosFiltrados.filter(c => !form.responsables_directos.includes(c))
                    return cargosIndirectos.length === 0 ? (
                      <p className="text-xs text-slate-400 p-1">Todos los cargos disponibles ya estan como responsables directos.</p>
                    ) : cargosIndirectos.map((c) => (
                      <button key={c} onClick={() => toggleCargo('responsables_indirectos', c)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          form.responsables_indirectos.includes(c)
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >{c}</button>
                    ))
                  })()}
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
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Departamentos <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-1.5 mb-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {DIRECCIONES.flatMap((dir) => DEPARTAMENTOS_POR_DIRECCION[dir]).map((d) => (
                    <button key={d} onClick={() => setForm((f) => ({
                      ...f, departamento: f.departamento.includes(d) ? f.departamento.filter((x: string) => x !== d) : [...f.departamento, d]
                    }))}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        form.departamento.includes(d)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >{d}</button>
                  ))}
                </div>
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
              <button onClick={guardar} disabled={guardando || !form.titulo || !form.tipo || !form.introduccion || !form.objetivo_principal || form.objetivos_secundarios.length === 0 || !form.metodo_evaluacion || !form.valoracion_resultados || !form.impacto_negocio || form.responsables_directos.length === 0 || !form.frecuencia_medicion || form.departamento.length === 0 || !form.repercusion_laboral}
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
