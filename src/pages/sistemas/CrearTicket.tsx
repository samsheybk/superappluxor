import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

export function CrearTicket() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !titulo.trim()) { setError('El titulo es obligatorio.'); return }
    setGuardando(true)
    setError(null)

    const { error: err } = await supabase.from('sistemas_tickets').insert({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      ubicacion: ubicacion.trim(),
      creado_por: user.id,
    })
    if (err) { setError(err.message); setGuardando(false); return }

    navigate('/departamento/sistemas', { state: { mensaje: 'Ticket creado exitosamente.' } })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Operaciones</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Sistemas</span>
      </div>


      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Titulo *</label>
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Ej: PC no enciende, Fallo en la red, etc."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Descripcion</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Describe el problema con detalle..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Ubicacion</label>
          <input type="text" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Ej: Supermercado Centro, Oficina Administracion, etc."
          />
        </div>
        <div className="flex justify-end gap-3">
          <Link to="/departamento/sistemas"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Link>
          <button type="submit" disabled={guardando}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Crear ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}
