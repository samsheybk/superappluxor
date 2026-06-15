import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Modal } from '../../components/Modal'

interface Comentario {
  id: string
  comentario: string
  creado_por: string
  created_at: string
  autor_nombre?: string
}

const ESTADOS = ['Abierto', 'En Proceso', 'Resuelto', 'Cerrado']
const COLOR_ESTADO: Record<string, string> = {
  Abierto: 'bg-red-100 text-red-700',
  'En Proceso': 'bg-yellow-100 text-yellow-800',
  Resuelto: 'bg-green-100 text-green-700',
  Cerrado: 'bg-blue-100 text-blue-700',
}

const DESCRIPCION_ESTADO: Record<string, string> = {
  Abierto: 'Ticket creado, pendiente de revision por el equipo de Sistemas',
  'En Proceso': 'El equipo de Sistemas esta trabajando en la solucion',
  Resuelto: 'El problema ha sido solucionado, pendiente de confirmacion',
  Cerrado: 'Ticket cerrado, ya no requiere ninguna accion adicional',
}

export function DetalleTicket() {
  const { ticketId } = useParams<{ ticketId: string }>()
  const { user, perfil } = useAuth()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<any>(null)
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  const esAdmin = perfil?.rol === 'admin'

  function cargarDatos() {
    if (!ticketId) return
    setLoading(true)
    Promise.all([
      supabase.from('sistemas_tickets').select('*').eq('id', ticketId).single(),
      supabase.from('sistemas_ticket_comentarios').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
    ]).then(async ([tRes, cRes]) => {
      if (!tRes.data) { setLoading(false); return }
      const ids = [...new Set([tRes.data.creado_por, ...(cRes.data ?? []).map((c: any) => c.creado_por)])]
      const nomMap: Record<string, string> = {}
      if (ids.length > 0) {
        const { data: perfiles } = await supabase.from('perfiles').select('id, nombre').in('id', ids)
        ;(perfiles ?? []).forEach((p: any) => { nomMap[p.id] = p.nombre })
      }
      setTicket({ ...tRes.data, creador_nombre: nomMap[tRes.data.creado_por] ?? 'Desconocido' })
      setNuevoEstado(tRes.data.estado)
      setComentarios((cRes.data ?? []).map((c: any) => ({
        ...c,
        autor_nombre: nomMap[c.creado_por] ?? 'Desconocido',
      })))
      setLoading(false)
    })
  }

  useEffect(() => { cargarDatos() }, [ticketId])

  async function agregarComentario() {
    if (!user || !ticketId || !nuevoComentario.trim()) return
    setGuardando(true)
    setError(null)

    const { error: err } = await supabase.from('sistemas_ticket_comentarios').insert({
      ticket_id: ticketId,
      comentario: nuevoComentario.trim(),
      creado_por: user.id,
    })
    if (err) { setError(err.message); setGuardando(false); return }

    if (nuevoEstado !== ticket.estado && esAdmin) {
      await supabase.from('sistemas_tickets').update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq('id', ticketId)
    }

    setNuevoComentario('')
    setGuardando(false)
    cargarDatos()
  }

  async function cambiarEstado(estado: string) {
    if (!ticketId || !esAdmin) return
    setGuardando(true)
    const { error: err } = await supabase.from('sistemas_tickets').update({ estado, updated_at: new Date().toISOString() }).eq('id', ticketId)
    if (err) { setError(err.message); setGuardando(false); return }
    setNuevoEstado(estado)
    setGuardando(false)
    cargarDatos()
  }

  async function eliminarTicket() {
    if (!ticketId) return
    setEliminando(true)
    await supabase.from('sistemas_ticket_comentarios').delete().eq('ticket_id', ticketId)
    await supabase.from('sistemas_tickets').delete().eq('id', ticketId)
    navigate('/departamento/sistemas', { state: { mensaje: 'Ticket eliminado.' } })
  }

  if (loading) return <LoadingScreen />
  if (!ticket) return (
    <div className="rounded-xl bg-white p-10 text-center shadow-sm">
      <p className="text-slate-400">Ticket no encontrado.</p>
      <Link to="/departamento/sistemas" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Volver</Link>
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/departamento/sistemas" className="mb-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Mesa de Ayuda
        </Link>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{ticket.titulo}</h1>
              <span className="group relative">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO[ticket.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ticket.estado}
                </span>
                <span className="absolute bottom-full left-1/2 z-10 mb-1 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-800 p-2 text-xs text-white shadow-lg group-hover:block">
                  {DESCRIPCION_ESTADO[ticket.estado] ?? ''}
                </span>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>Ubicacion: {ticket.ubicacion || 'No especificada'}</span>
              <span>Reportado por: {ticket.creador_nombre}</span>
              <span>Creado: {new Date(ticket.created_at).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              {ticket.updated_at !== ticket.created_at && (
                <span>Actualizado: {new Date(ticket.updated_at).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
          </div>
          {esAdmin && (
            <button onClick={() => setConfirmarEliminar(true)}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
          )}
        </div>

        {ticket.descripcion && (
          <div className="mt-4 rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.descripcion}</p>
          </div>
        )}

        {esAdmin && (
          <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
            <span className="text-xs font-medium text-slate-500">Cambiar estado:</span>
            <div className="flex gap-1">
              {ESTADOS.map((est) => (
                <span key={est} className="group relative">
                  <button onClick={() => cambiarEstado(est)} disabled={guardando || est === ticket.estado}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${est === (nuevoEstado || ticket.estado) ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} disabled:opacity-50`}
                  >
                    {est}
                  </button>
                  <span className="absolute bottom-full left-1/2 z-10 mb-1 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-800 p-2 text-xs text-white shadow-lg group-hover:block">
                    {DESCRIPCION_ESTADO[est]}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">
          Comentarios ({comentarios.length})
        </h2>

        <div className="space-y-4">
          {comentarios.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-100 p-4">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium text-slate-600">{c.autor_nombre}</span>
                <span>{new Date(c.created_at).toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.comentario}</p>
            </div>
          ))}
          {comentarios.length === 0 && (
            <p className="text-center text-sm text-slate-400">Sin comentarios aun.</p>
          )}
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <textarea value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)} rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Escribe un comentario..."
          />
          <div className="mt-2 flex justify-end">
            <button onClick={agregarComentario} disabled={guardando || !nuevoComentario.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {guardando ? 'Enviando...' : 'Enviar comentario'}
            </button>
          </div>
        </div>
      </div>

      <Modal abierto={confirmarEliminar} titulo="Eliminar ticket" onCerrar={() => setConfirmarEliminar(false)}>
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            <p className="mb-2 font-medium">Esta accion es irreversible.</p>
            <p>Se borrara el ticket y todos sus comentarios.</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmarEliminar(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button onClick={eliminarTicket} disabled={eliminando}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
