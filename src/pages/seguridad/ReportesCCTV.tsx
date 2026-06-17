import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { SUPERMERCADOS } from '../../types'

const CRITICIDADES = ['Baja', 'Media', 'Alta', 'Critica']

interface Reporte {
  id: string
  ubicacion: string
  zona: string
  comentario: string
  criticidad: string
  fotos: string[]
  creado_por: string
  created_at: string
}

export function ReportesCCTV() {
  const { user, perfil } = useAuth()
  const esAdmin = perfil?.rol === 'admin'

  const [reportes, setReportes] = useState<Reporte[]>([])
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [form, setForm] = useState({
    ubicacion: '',
    zona: '',
    comentario: '',
    criticidad: 'Baja',
  })
  const [fotos, setFotos] = useState<string[]>([])

  useEffect(() => { cargarReportes() }, [])

  async function cargarReportes() {
    setLoading(true)
    const { data } = await supabase.from('cctv_reportes').select('*').order('created_at', { ascending: false })
    if (data) setReportes(data)
    setLoading(false)
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setFotos(prev => [...prev, base64])
    }
    reader.readAsDataURL(file)
  }

  function quitarFoto(idx: number) {
    setFotos(prev => prev.filter((_, i) => i !== idx))
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setGuardando(true)
    try {
      const { error: err } = await supabase.from('cctv_reportes').insert({
        ubicacion: form.ubicacion,
        zona: form.zona,
        comentario: form.comentario,
        criticidad: form.criticidad,
        fotos,
        creado_por: user.id,
      })
      if (err) throw err
      setForm({ ubicacion: '', zona: '', comentario: '', criticidad: 'Baja' })
    setFotos([])
    setMensaje('Reporte registrado')
      cargarReportes()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: string) {
    await supabase.from('cctv_reportes').delete().eq('id', id)
    setReportes(prev => prev.filter(r => r.id !== id))
  }

  function abrirFoto(base64: string) {
    const win = window.open()
    if (win) win.document.write(`<img src="${base64}" style="max-width:100%;max-height:100vh" />`)
  }

  useEffect(() => {
    if (mensaje) { const t = setTimeout(() => setMensaje(''), 3000); return () => clearTimeout(t) }
  }, [mensaje])

  const colorCriticidad = (c: string) => {
    switch (c) {
      case 'Critica': return 'bg-red-100 text-red-700'
      case 'Alta': return 'bg-orange-100 text-orange-700'
      case 'Media': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-green-100 text-green-700'
    }
  }

  return (
    <div>
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Seguridad</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Reportes de CCTV</span>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {mensaje && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{mensaje}</div>}

      <div className="space-y-6">
        <form onSubmit={guardar} className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-600">Nuevo reporte CCOM</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ubicacion</label>
              <select required value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Seleccione --</option>
                {[...SUPERMERCADOS, 'OFICINA CENTRAL'].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Zona</label>
              <input required value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })}
                placeholder="Ej: Pasillo A, Entrada principal, Patio de carga..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Comentario</label>
              <textarea required value={form.comentario} onChange={(e) => setForm({ ...form, comentario: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Criticidad</label>
              <select value={form.criticidad} onChange={(e) => setForm({ ...form, criticidad: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {CRITICIDADES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Capturas de pantalla</label>
              <input type="file" accept="image/*" onChange={handleFoto}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:text-blue-700"
              />
              {fotos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {fotos.map((f, i) => (
                    <div key={i} className="group relative">
                      <img src={f} alt={`Captura ${i + 1}`} className="h-16 w-16 cursor-pointer rounded-lg object-cover"
                        onClick={() => abrirFoto(f)}
                      />
                      <button type="button" onClick={() => quitarFoto(i)}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 group-hover:opacity-100"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button type="submit" disabled={guardando}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Registrar reporte'}
          </button>
        </form>

        <div className="relative overflow-x-auto rounded-xl bg-white shadow-sm">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="text-sm text-slate-500">Cargando...</span>
              </div>
            </div>
          )}
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="p-3 font-medium">Ubicacion</th>
                <th className="p-3 font-medium">Zona</th>
                <th className="p-3 font-medium">Comentario</th>
                <th className="p-3 font-medium">Criticidad</th>
                <th className="p-3 font-medium">Fotos</th>
                <th className="p-3 font-medium">Fecha</th>
                {esAdmin && <th className="p-3 font-medium">Accion</th>}
              </tr>
            </thead>
            <tbody>
              {reportes.length === 0 ? (
                <tr>
                  <td colSpan={esAdmin ? 7 : 6} className="p-8 text-center text-slate-400">Sin reportes</td>
                </tr>
              ) : reportes.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="p-3 font-medium text-slate-800">{r.ubicacion}</td>
                  <td className="p-3 text-slate-600">{r.zona}</td>
                  <td className="max-w-xs p-3 text-slate-600">
                    <p className="line-clamp-2">{r.comentario}</p>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorCriticidad(r.criticidad)}`}>
                      {r.criticidad}
                    </span>
                  </td>
                  <td className="p-3">
                    {r.fotos && r.fotos.length > 0 ? (
                      <div className="flex gap-1">
                        {r.fotos.map((f, i) => (
                          <img key={i} src={f} alt={`Foto ${i + 1}`}
                            className="h-8 w-8 cursor-pointer rounded object-cover hover:opacity-80"
                            onClick={() => abrirFoto(f)}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">--</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-slate-500">
                    {new Date(r.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  {esAdmin && (
                    <td className="p-3">
                      <button onClick={() => eliminar(r.id)} className="text-xs text-red-600 hover:underline">Eliminar</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
