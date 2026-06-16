import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { SUPERMERCADOS } from '../../types'

const CATEGORIAS_PERMISO = [
  'Sanitario', 'Ambiental', 'Municipal', 'Bomberos',
  'Proteccion Civil', 'Salud', 'Funcionamiento', 'Otro',
]

const ENTIDADES = [...SUPERMERCADOS, 'Oficina Central']

interface Permiso {
  id: string
  entidad: string
  categoria: string
  descripcion: string
  vigencia: string
  archivo_base64: string | null
  created_at: string
}

export function Impuestos() {
  const { user, perfil } = useAuth()
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [formPerm, setFormPerm] = useState({ entidad: '', categoria: '', descripcion: '', vigencia: '' })
  const [filePerm, setFilePerm] = useState<File | null>(null)

  const esAdmin = perfil?.rol === 'admin'

  useEffect(() => {
    cargarPermisos()
  }, [])

  async function cargarPermisos() {
    const { data } = await supabase.from('contabilidad_permisos').select('*').order('created_at', { ascending: false })
    if (data) setPermisos(data)
  }

  function estadoPerm(p: Permiso): 'Vigente' | 'Vencido' {
    return new Date(p.vigencia) >= new Date(new Date().toDateString()) ? 'Vigente' : 'Vencido'
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

  return (
    <div>
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Finanzas</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Impuestos</span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {mensaje && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{mensaje}</div>
      )}

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
    </div>
  )
}
