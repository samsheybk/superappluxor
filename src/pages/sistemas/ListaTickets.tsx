import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { LoadingScreen } from '../../components/LoadingScreen'

interface Ticket {
  id: string
  titulo: string
  descripcion: string
  ubicacion: string
  estado: string
  creado_por: string
  created_at: string
  updated_at: string
  creador_nombre?: string
  comentarios_count?: number
}

const COLOR_ESTADO: Record<string, string> = {
  Abierto: 'bg-yellow-100 text-yellow-800',
  'En Proceso': 'bg-blue-100 text-blue-800',
  Resuelto: 'bg-green-100 text-green-800',
  Cerrado: 'bg-slate-100 text-slate-500',
}

export function ListaTickets() {
  const location = useLocation()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const mensaje = (location.state as { mensaje?: string })?.mensaje ?? ''

  function cargarDatos() {
    setLoading(true)
    supabase.from('sistemas_tickets').select('*, sistemas_ticket_comentarios(count)').order('created_at', { ascending: false })
      .then(async (res) => {
        if (!res.data) { setLoading(false); return }
        const ids = [...new Set(res.data.map((t: any) => t.creado_por))]
        const nomMap: Record<string, string> = {}
        if (ids.length > 0) {
          const { data: perfiles } = await supabase.from('perfiles').select('id, nombre').in('id', ids)
          ;(perfiles ?? []).forEach((p: any) => { nomMap[p.id] = p.nombre })
        }
        setTickets(res.data.map((t: any) => ({
          id: t.id,
          titulo: t.titulo,
          descripcion: t.descripcion,
          ubicacion: t.ubicacion,
          estado: t.estado,
          creado_por: t.creado_por,
          created_at: t.created_at,
          updated_at: t.updated_at,
          creador_nombre: nomMap[t.creado_por] ?? 'Desconocido',
          comentarios_count: t.sistemas_ticket_comentarios?.[0]?.count ?? 0,
        })))
        setLoading(false)
      })
  }

  useEffect(() => { cargarDatos() }, [])

  const filtrados = tickets.filter((t) =>
    !filtro || t.estado === filtro || t.ubicacion.toLowerCase().includes(filtro.toLowerCase()) || t.titulo.toLowerCase().includes(filtro.toLowerCase())
  )

  if (loading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Mesa de Ayuda - Sistemas</h1>
            <p className="text-slate-500">Reporte y seguimiento de incidencias</p>
          </div>
          <Link to="/departamento/sistemas/crear"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Nuevo ticket
          </Link>
        </div>
      </div>

      {mensaje && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{mensaje}</div>
      )}

      <div className="flex gap-2">
        {['', 'Abierto', 'En Proceso', 'Resuelto', 'Cerrado'].map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filtro === f ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
          >
            {f || 'Todos'}
          </button>
        ))}
      </div>

      {filtrados.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-slate-400">No hay tickets registrados.</p>
          <Link to="/departamento/sistemas/crear" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Crear el primer ticket
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {filtrados.map((t) => (
          <Link key={t.id} to={`/departamento/sistemas/ticket/${t.id}`}
            className="block rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-slate-800">{t.titulo}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO[t.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                    {t.estado}
                  </span>
                </div>
                {t.descripcion && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{t.descripcion}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span>Ubicacion: {t.ubicacion || 'No especificada'}</span>
                  <span>Reportado por: {t.creador_nombre}</span>
                  <span>{new Date(t.created_at).toLocaleDateString('es-VE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{t.comentarios_count} comentarios</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
