import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { DEPARTAMENTOS_POR_DIRECCION, SUPERMERCADOS } from '../../types'

const DEPARTAMENTOS = Object.values(DEPARTAMENTOS_POR_DIRECCION).flat()

const CATEGORIAS_PERMISO = [
  'Sanitario', 'Ambiental', 'Municipal', 'Bomberos',
  'Proteccion Civil', 'Salud', 'Funcionamiento', 'Otro',
]

const ENTIDADES = [...SUPERMERCADOS, 'Oficina Central']

interface Presupuesto {
  id: string
  departamento: string
  mes: number
  anio: number
  presupuesto: number
  gasto: number
  observaciones: string
  created_at: string
}

interface Permiso {
  id: string
  entidad: string
  categoria: string
  descripcion: string
  vigencia: string
  archivo_base64: string | null
  created_at: string
}

type Tab = 'presupuesto' | 'permisos'

export function Contabilidad() {
  const { user, perfil } = useAuth()
  const [tab, setTab] = useState<Tab>('presupuesto')

  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())

  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [formPres, setFormPres] = useState({ departamento: '', presupuesto: '', gasto: '', observaciones: '' })
  const [formPerm, setFormPerm] = useState({ entidad: '', categoria: '', descripcion: '', vigencia: '' })
  const [filePerm, setFilePerm] = useState<File | null>(null)

  const esAdmin = perfil?.rol === 'admin'

  useEffect(() => {
    cargarPresupuestos()
    cargarPermisos()
  }, [])

  async function cargarPresupuestos() {
    const { data } = await supabase.from('contabilidad_presupuestos').select('*').order('created_at', { ascending: false })
    if (data) setPresupuestos(data)
  }

  async function cargarPermisos() {
    const { data } = await supabase.from('contabilidad_permisos').select('*').order('created_at', { ascending: false })
    if (data) setPermisos(data)
  }

  function presFiltrados() {
    return presupuestos.filter((p) => p.mes === mes && p.anio === anio)
  }

  function estadoPres(p: Presupuesto): 'OK' | 'Excedido' {
    return p.gasto <= p.presupuesto ? 'OK' : 'Excedido'
  }

  function estadoPerm(p: Permiso): 'Vigente' | 'Vencido' {
    return new Date(p.vigencia) >= new Date(new Date().toDateString()) ? 'Vigente' : 'Vencido'
  }

  async function guardarPresupuesto(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setGuardando(true)
    try {
      const { error: err } = await supabase.from('contabilidad_presupuestos').insert({
        departamento: formPres.departamento,
        mes, anio,
        presupuesto: parseFloat(formPres.presupuesto) || 0,
        gasto: parseFloat(formPres.gasto) || 0,
        observaciones: formPres.observaciones,
        creado_por: user.id,
      })
      if (err) throw err
      setFormPres({ departamento: '', presupuesto: '', gasto: '', observaciones: '' })
      setMensaje('Presupuesto registrado')
      cargarPresupuestos()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarPresupuesto(id: string) {
    await supabase.from('contabilidad_presupuestos').delete().eq('id', id)
    setPresupuestos(presupuestos.filter((p) => p.id !== id))
  }

  async function guardarPermiso(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setGuardando(true)
    try {
      let b64: string | null = null
      if (filePerm) {
        b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(filePerm)
        })
      }
      const { error: err } = await supabase.from('contabilidad_permisos').insert({
        entidad: formPerm.entidad,
        categoria: formPerm.categoria,
        descripcion: formPerm.descripcion,
        vigencia: formPerm.vigencia,
        archivo_base64: b64,
        creado_por: user.id,
      })
      if (err) throw err
      setFormPerm({ entidad: '', categoria: '', descripcion: '', vigencia: '' })
      setFilePerm(null)
      setMensaje('Permiso registrado')
      cargarPermisos()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarPermiso(id: string) {
    await supabase.from('contabilidad_permisos').delete().eq('id', id)
    setPermisos(permisos.filter((p) => p.id !== id))
  }

  function abrirPDF(b64: string) {
    const parts = b64.split(',')
    const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'application/pdf'
    const raw = atob(parts[1])
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    window.open(URL.createObjectURL(blob), '_blank')
  }

  useEffect(() => {
    if (mensaje) { const t = setTimeout(() => setMensaje(''), 3000); return () => clearTimeout(t) }
  }, [mensaje])

  const filtrados = presFiltrados()

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="mb-2 inline-block text-sm text-blue-600 hover:underline">← Volver al panel</Link>
        <h1 className="text-2xl font-bold text-slate-800">Contabilidad</h1>
        <p className="text-slate-500">Finanzas</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {mensaje && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{mensaje}</div>
      )}

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {([{ key: 'presupuesto' as Tab, label: 'Presupuesto mensual' }, { key: 'permisos' as Tab, label: 'Registro de permisos' }]).map((t) => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'presupuesto' && (
        <div className="space-y-6">
          <div className="flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Mes</label>
              <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Año</label>
              <input type="number" value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value) || hoy.getFullYear())}
                className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <form onSubmit={guardarPresupuesto} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-600">Registrar presupuesto mensual</h3>
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Departamento</label>
                <select required value={formPres.departamento}
                  onChange={(e) => setFormPres({ ...formPres, departamento: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleccione --</option>
                  {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Presupuesto $</label>
                <input type="number" required min={0} step={0.01} value={formPres.presupuesto}
                  onChange={(e) => setFormPres({ ...formPres, presupuesto: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Gasto $</label>
                <input type="number" required min={0} step={0.01} value={formPres.gasto}
                  onChange={(e) => setFormPres({ ...formPres, gasto: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Observaciones</label>
                <input type="text" value={formPres.observaciones}
                  onChange={(e) => setFormPres({ ...formPres, observaciones: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <button type="submit" disabled={guardando}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Registrar'}
            </button>
          </form>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="p-3 font-medium">Departamento</th>
                  <th className="p-3 font-medium">Presupuesto</th>
                  <th className="p-3 font-medium">Gasto</th>
                  <th className="p-3 font-medium">Diferencia</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium">Observaciones</th>
                  {esAdmin && <th className="p-3 font-medium">Accion</th>}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={esAdmin ? 7 : 6} className="p-8 text-center text-slate-400">
                      No hay registros para {String(mes).padStart(2, '0')}/{anio}
                    </td>
                  </tr>
                ) : filtrados.map((p) => {
                  const est = estadoPres(p)
                  const dif = p.presupuesto - p.gasto
                  return (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="p-3 font-medium text-slate-800">{p.departamento}</td>
                      <td className="p-3 text-slate-600">${p.presupuesto.toFixed(2)}</td>
                      <td className="p-3 text-slate-600">${p.gasto.toFixed(2)}</td>
                      <td className={`p-3 font-medium ${dif >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${dif.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          est === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {est}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate p-3 text-slate-500">{p.observaciones || '-'}</td>
                      {esAdmin && (
                        <td className="p-3">
                          <button onClick={() => eliminarPresupuesto(p.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'permisos' && (
        <div className="space-y-6">
          <form onSubmit={guardarPermiso} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-600">Registrar permiso</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Entidad</label>
                <select required value={formPerm.entidad}
                  onChange={(e) => setFormPerm({ ...formPerm, entidad: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleccione --</option>
                  {ENTIDADES.map((e) => <option key={e} value={e}>{e}</option>)}
                  <option value="__otro__">Otra...</option>
                </select>
                {formPerm.entidad === '__otro__' && (
                  <input type="text" required placeholder="Nombre de la entidad"
                    value={formPerm.entidad === '__otro__' ? '' : formPerm.entidad}
                    onChange={(e) => setFormPerm({ ...formPerm, entidad: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Categoria</label>
                <select required value={formPerm.categoria}
                  onChange={(e) => setFormPerm({ ...formPerm, categoria: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleccione --</option>
                  {CATEGORIAS_PERMISO.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">Descripcion</label>
              <textarea required value={formPerm.descripcion}
                onChange={(e) => setFormPerm({ ...formPerm, descripcion: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                rows={2}
              />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Vigencia</label>
                <input type="date" required value={formPerm.vigencia}
                  onChange={(e) => setFormPerm({ ...formPerm, vigencia: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Adjuntar PDF</label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-blue-400">
                  {filePerm ? filePerm.name : 'Seleccionar archivo'}
                  <input type="file" accept=".pdf" className="hidden"
                    onChange={(e) => setFilePerm(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>
            <button type="submit" disabled={guardando}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Registrar permiso'}
            </button>
          </form>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="p-3 font-medium">Categoria</th>
                  <th className="p-3 font-medium">Descripcion</th>
                  <th className="p-3 font-medium">Entidad</th>
                  <th className="p-3 font-medium">Vigencia</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium">PDF</th>
                  {esAdmin && <th className="p-3 font-medium">Accion</th>}
                </tr>
              </thead>
              <tbody>
                {permisos.length === 0 ? (
                  <tr>
                    <td colSpan={esAdmin ? 7 : 6} className="p-8 text-center text-slate-400">
                      No hay permisos registrados
                    </td>
                  </tr>
                ) : permisos.map((p) => {
                  const est = estadoPerm(p)
                  return (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="p-3 text-slate-800">{p.categoria}</td>
                      <td className="max-w-[200px] truncate p-3 text-slate-600">{p.descripcion}</td>
                      <td className="p-3 text-slate-600">{p.entidad}</td>
                      <td className="p-3 text-slate-600">{p.vigencia}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          est === 'Vigente' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {est}
                        </span>
                      </td>
                      <td className="p-3">
                        {p.archivo_base64 ? (
                          <button onClick={() => abrirPDF(p.archivo_base64!)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Ver
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      {esAdmin && (
                        <td className="p-3">
                          <button onClick={() => eliminarPermiso(p.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
