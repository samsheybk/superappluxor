import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { SUPERMERCADOS } from '../../types'

const TABS = ['PERMISOS', 'EQUIPOS', 'DELEGADOS', 'BOTIQUINES'] as const

type TabId = (typeof TABS)[number]

const UBICACIONES = [...SUPERMERCADOS, 'OFICINA CENTRAL']

const ESTADO_PERMISO_COLORS: Record<string, string> = {
  vigente: '#16a34a',
  vencido: '#ef4444',
  tramite: '#f59e0b',
}

interface Trabajador {
  id: string
  cedula: string
  nombres: string
  apellidos: string
}

interface Permiso {
  id: string
  tipo: string
  ubicacion: string
  fecha_emision: string
  fecha_vencimiento: string
  estado: string
  created_at: string
}

interface Equipo {
  id: string
  tipo: string
  descripcion: string
  ubicacion: string
  fecha_vencimiento: string | null
  created_at: string
}

interface Delegado {
  id: string
  candidato_id: string
  fecha_designacion: string
  activo: boolean
  created_at: string
}

interface BotiquinProducto {
  id: string
  ubicacion: string
  nombre: string
  descripcion: string
  stock_actual: number
  created_at: string
}

interface BotiquinMovimiento {
  id: string
  producto_id: string
  tipo: string
  cantidad: number
  justificacion: string
  created_at: string
}

export function SeguridadLaboral() {
  const [tab, setTab] = useState<TabId>('PERMISOS')

  return (
    <div style={{ padding: '12px 32px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 8 }}>
          <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Panel</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: '#64748b' }}>Talento Humano</span>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: '#001A4A', fontWeight: 600 }}>Seguridad Laboral</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Gestion de permisos, equipos, delegados de prevencion y botiquines</p>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '10px 16px', fontSize: '0.78rem', fontWeight: 600,
              color: tab === t ? '#001A4A' : '#94a3b8', background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid #001A4A' : '2px solid transparent',
              marginBottom: -2, cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s',
            }}
          >{t}</button>
        ))}
      </div>

      <div style={{ display: tab === 'PERMISOS' ? 'block' : 'none' }}><PermisosTab /></div>
      <div style={{ display: tab === 'EQUIPOS' ? 'block' : 'none' }}><EquiposTab /></div>
      <div style={{ display: tab === 'DELEGADOS' ? 'block' : 'none' }}><DelegadosTab /></div>
      <div style={{ display: tab === 'BOTIQUINES' ? 'block' : 'none' }}><BotiquinesTab /></div>
    </div>
  )
}

// --- Permisos ---

function PermisosTab() {
  const [items, setItems] = useState<Permiso[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [tipo, setTipo] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0])
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [estado, setEstado] = useState('vigente')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('rrhh_seguridad_permisos').select('*').order('fecha_vencimiento', { ascending: false })
    if (data) setItems(data as Permiso[])
    setLoading(false)
  }

  function abrirModal(item?: Permiso) {
    if (item) {
      setEditId(item.id); setTipo(item.tipo); setUbicacion(item.ubicacion)
      setFechaEmision(item.fecha_emision); setFechaVencimiento(item.fecha_vencimiento); setEstado(item.estado)
    } else {
      setEditId(null); setTipo(''); setUbicacion(''); setFechaEmision(new Date().toISOString().split('T')[0]); setFechaVencimiento(''); setEstado('vigente')
    }
    setMensaje(''); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tipo.trim() || !ubicacion || !fechaVencimiento) return
    const payload = { tipo: tipo.trim().toUpperCase(), ubicacion, fecha_emision: fechaEmision, fecha_vencimiento: fechaVencimiento, estado }
    if (editId) {
      const { error } = await supabase.from('rrhh_seguridad_permisos').update(payload).eq('id', editId)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('rrhh_seguridad_permisos').insert(payload)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    }
    setShowModal(false); cargar()
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('rrhh_seguridad_permisos').delete().eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`); return }
    cargar()
  }

  function estaVencido(item: Permiso) {
    return item.estado === 'vigente' && new Date(item.fecha_vencimiento) < new Date()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Vencimiento de Permisos</h2>
        <button onClick={() => abrirModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >+ Nuevo permiso</button>
      </div>
      {mensaje && <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}><p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay permisos registrados.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>TIPO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>UBICACION</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>EMISION</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>VENCIMIENTO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>ESTADO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{
                  borderBottom: '1px solid #f1f5f9',
                  background: estaVencido(item) ? '#fef2f2' : 'transparent',
                }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{item.tipo}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.ubicacion}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.fecha_emision}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.fecha_vencimiento}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700,
                      background: item.estado === 'vigente' ? '#f0fdf4' : item.estado === 'vencido' ? '#fef2f2' : '#fefce8',
                      color: ESTADO_PERMISO_COLORS[item.estado] || '#64748b',
                    }}>{item.estado.toUpperCase()}</span>
                    {estaVencido(item) && <span style={{ marginLeft: 4, fontSize: '0.65rem', color: '#ef4444', fontWeight: 700 }}>VENCIDO</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => abrirModal(item)} className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Editar</button>
                      <button onClick={() => eliminar(item.id)} className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', padding: 28, width: '90%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>{editId ? 'Editar permiso' : 'Nuevo permiso'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>TIPO *</label>
                <input value={tipo} onChange={e => setTipo(e.target.value.toUpperCase())} required
                  placeholder="Ej: BOMBEROS, SANITARIO, MUNICIPAL"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>UBICACION *</label>
                <select value={ubicacion} onChange={e => setUbicacion(e.target.value)} required
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">Seleccionar ubicacion</option>
                  {UBICACIONES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>FECHA DE EMISION</label>
                <input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>FECHA DE VENCIMIENTO *</label>
                <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} required
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>ESTADO</label>
                <select value={estado} onChange={e => setEstado(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="vigente">VIGENTE</option>
                  <option value="vencido">VENCIDO</option>
                  <option value="tramite">TRAMITE</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{editId ? 'Guardar' : 'Crear'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Equipos ---

function EquiposTab() {
  const [items, setItems] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [tipo, setTipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('rrhh_seguridad_equipos').select('*').order('tipo', { ascending: true })
    if (data) setItems(data as Equipo[])
    setLoading(false)
  }

  function abrirModal(item?: Equipo) {
    if (item) {
      setEditId(item.id); setTipo(item.tipo); setDescripcion(item.descripcion); setUbicacion(item.ubicacion)
      setFechaVencimiento(item.fecha_vencimiento || '')
    } else {
      setEditId(null); setTipo(''); setDescripcion(''); setUbicacion(''); setFechaVencimiento('')
    }
    setMensaje(''); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tipo.trim() || !ubicacion) return
    const payload: Record<string, unknown> = { tipo: tipo.trim().toUpperCase(), descripcion: descripcion.trim().toUpperCase(), ubicacion }
    if (fechaVencimiento) payload.fecha_vencimiento = fechaVencimiento
    else payload.fecha_vencimiento = null
    if (editId) {
      const { error } = await supabase.from('rrhh_seguridad_equipos').update(payload).eq('id', editId)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('rrhh_seguridad_equipos').insert(payload)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    }
    setShowModal(false); cargar()
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('rrhh_seguridad_equipos').delete().eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`); return }
    cargar()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Inventario de Equipos</h2>
        <button onClick={() => abrirModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >+ Nuevo equipo</button>
      </div>
      {mensaje && <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}><p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay equipos registrados.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>TIPO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>DESCRIPCION</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>UBICACION</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>VENCIMIENTO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{item.tipo}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.descripcion || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.ubicacion}</td>
                  <td style={{ padding: '10px 12px', color: item.fecha_vencimiento && new Date(item.fecha_vencimiento) < new Date() ? '#ef4444' : '#1e293b' }}>
                    {item.fecha_vencimiento || '-'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => abrirModal(item)} className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Editar</button>
                      <button onClick={() => eliminar(item.id)} className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', padding: 28, width: '90%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>{editId ? 'Editar equipo' : 'Nuevo equipo'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>TIPO *</label>
                <input value={tipo} onChange={e => setTipo(e.target.value.toUpperCase())} required
                  placeholder="Ej: EXTINTOR, CAMILLA, DESFIBRILADOR"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DESCRIPCION</label>
                <input value={descripcion} onChange={e => setDescripcion(e.target.value.toUpperCase())}
                  placeholder="Marca, modelo, numero de serie"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>UBICACION *</label>
                <select value={ubicacion} onChange={e => setUbicacion(e.target.value)} required
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">Seleccionar ubicacion</option>
                  {UBICACIONES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>FECHA DE VENCIMIENTO</label>
                <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{editId ? 'Guardar' : 'Crear'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Delegados ---

function DelegadosTab() {
  const [items, setItems] = useState<Delegado[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [candidatoId, setCandidatoId] = useState('')
  const [fechaDesignacion, setFechaDesignacion] = useState(new Date().toISOString().split('T')[0])
  const [activo, setActivo] = useState(true)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarTrabajadores()
    cargar()
  }, [])

  async function cargarTrabajadores() {
    const { data } = await supabase.from('rrhh_candidatos').select('id, cedula, nombres, apellidos').eq('estado', 'ACTIVO').order('nombres', { ascending: true })
    if (data) setTrabajadores(data as Trabajador[])
  }

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('rrhh_seguridad_delegados').select('*').order('fecha_designacion', { ascending: false })
    if (data) setItems(data as Delegado[])
    setLoading(false)
  }

  function abrirModal(item?: Delegado) {
    if (item) {
      setEditId(item.id); setCandidatoId(item.candidato_id); setFechaDesignacion(item.fecha_designacion); setActivo(item.activo)
    } else {
      setEditId(null); setCandidatoId(''); setFechaDesignacion(new Date().toISOString().split('T')[0]); setActivo(true)
    }
    setMensaje(''); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!candidatoId) return
    const payload = { candidato_id: candidatoId, fecha_designacion: fechaDesignacion, activo }
    if (editId) {
      const { error } = await supabase.from('rrhh_seguridad_delegados').update(payload).eq('id', editId)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('rrhh_seguridad_delegados').insert(payload)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    }
    setShowModal(false); cargar()
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('rrhh_seguridad_delegados').delete().eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`); return }
    cargar()
  }

  function nombreTrabajador(id: string) {
    const t = trabajadores.find(w => w.id === id)
    return t ? `${t.nombres} ${t.apellidos}`.trim() : id.slice(0, 8)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Delegados de Prevencion</h2>
        <button onClick={() => abrirModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >+ Nuevo delegado</button>
      </div>
      {mensaje && <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}><p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay delegados registrados.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>TRABAJADOR</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>FECHA DESIGNACION</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>ESTADO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{nombreTrabajador(item.candidato_id)}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.fecha_designacion}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700,
                      background: item.activo ? '#f0fdf4' : '#fef2f2',
                      color: item.activo ? '#16a34a' : '#ef4444',
                    }}>{item.activo ? 'ACTIVO' : 'INACTIVO'}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => abrirModal(item)} className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Editar</button>
                      <button onClick={() => eliminar(item.id)} className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', padding: 28, width: '90%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>{editId ? 'Editar delegado' : 'Nuevo delegado'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>TRABAJADOR *</label>
                <select value={candidatoId} onChange={e => setCandidatoId(e.target.value)} required
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">Seleccionar trabajador</option>
                  {trabajadores.map(t => (
                    <option key={t.id} value={t.id}>{t.nombres} {t.apellidos} — {t.cedula}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>FECHA DE DESIGNACION</label>
                <input type="date" value={fechaDesignacion} onChange={e => setFechaDesignacion(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>ESTADO</label>
                <select value={activo ? 'activo' : 'inactivo'} onChange={e => setActivo(e.target.value === 'activo')}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="activo">ACTIVO</option>
                  <option value="inactivo">INACTIVO</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{editId ? 'Guardar' : 'Crear'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Botiquines (inventario con entradas/salidas) ---

function BotiquinesTab() {
  const [productos, setProductos] = useState<BotiquinProducto[]>([])
  const [movimientos, setMovimientos] = useState<BotiquinMovimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [showProductoModal, setShowProductoModal] = useState(false)
  const [editProductoId, setEditProductoId] = useState<string | null>(null)
  const [prodUbicacion, setProdUbicacion] = useState('')
  const [prodNombre, setProdNombre] = useState('')
  const [prodDescripcion, setProdDescripcion] = useState('')
  const [prodStockInicial, setProdStockInicial] = useState('0')
  const [showMovimientoModal, setShowMovimientoModal] = useState(false)
  const [movProductoId, setMovProductoId] = useState('')
  const [movTipo, setMovTipo] = useState<'entrada' | 'salida'>('entrada')
  const [movCantidad, setMovCantidad] = useState('1')
  const [movJustificacion, setMovJustificacion] = useState('')
  const [showHistorial, setShowHistorial] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data: prods } = await supabase.from('rrhh_seguridad_botiquin_productos').select('*').order('nombre', { ascending: true })
    if (prods) setProductos(prods as BotiquinProducto[])
    const { data: movs } = await supabase.from('rrhh_seguridad_botiquin_movimientos').select('*').order('created_at', { ascending: false })
    if (movs) setMovimientos(movs as BotiquinMovimiento[])
    setLoading(false)
  }

  function abrirProductoModal(item?: BotiquinProducto) {
    if (item) {
      setEditProductoId(item.id); setProdUbicacion(item.ubicacion); setProdNombre(item.nombre)
      setProdDescripcion(item.descripcion); setProdStockInicial(String(item.stock_actual))
    } else {
      setEditProductoId(null); setProdUbicacion(''); setProdNombre(''); setProdDescripcion(''); setProdStockInicial('0')
    }
    setMensaje(''); setShowProductoModal(true)
  }

  async function handleProductoSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prodUbicacion || !prodNombre.trim()) return
    if (editProductoId) {
      const { error } = await supabase.from('rrhh_seguridad_botiquin_productos').update({
        ubicacion: prodUbicacion, nombre: prodNombre.trim().toUpperCase(), descripcion: prodDescripcion.trim().toUpperCase(),
      }).eq('id', editProductoId)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('rrhh_seguridad_botiquin_productos').insert({
        ubicacion: prodUbicacion, nombre: prodNombre.trim().toUpperCase(), descripcion: prodDescripcion.trim().toUpperCase(),
        stock_actual: parseInt(prodStockInicial) || 0,
      })
      if (error) { setMensaje(`Error: ${error.message}`); return }
    }
    setShowProductoModal(false); cargar()
  }

  async function eliminarProducto(id: string) {
    const { error } = await supabase.from('rrhh_seguridad_botiquin_productos').delete().eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`); return }
    cargar()
  }

  function abrirMovimientoModal(productoId: string, tipo: 'entrada' | 'salida') {
    setMovProductoId(productoId); setMovTipo(tipo); setMovCantidad('1'); setMovJustificacion('')
    setMensaje(''); setShowMovimientoModal(true)
  }

  async function handleMovimientoSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cantidad = parseInt(movCantidad)
    if (!cantidad || cantidad <= 0) { setMensaje('La cantidad debe ser mayor a 0'); return }
    if (movTipo === 'salida' && !movJustificacion.trim()) { setMensaje('Debe ingresar una justificacion para la salida'); return }

    const producto = productos.find(p => p.id === movProductoId)
    if (!producto) return
    if (movTipo === 'salida' && cantidad > producto.stock_actual) { setMensaje('Stock insuficiente'); return }

    const nuevoStock = movTipo === 'entrada' ? producto.stock_actual + cantidad : producto.stock_actual - cantidad

    const { error: movErr } = await supabase.from('rrhh_seguridad_botiquin_movimientos').insert({
      producto_id: movProductoId, tipo: movTipo, cantidad, justificacion: movJustificacion.trim().toUpperCase(),
    })
    if (movErr) { setMensaje(`Error: ${movErr.message}`); return }

    const { error: updErr } = await supabase.from('rrhh_seguridad_botiquin_productos').update({ stock_actual: nuevoStock }).eq('id', movProductoId)
    if (updErr) { setMensaje(`Error: ${updErr.message}`); return }

    setShowMovimientoModal(false); cargar()
  }

  function movimientosDelProducto(productoId: string) {
    return movimientos.filter(m => m.producto_id === productoId)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Inventario de Botiquines</h2>
        <button onClick={() => abrirProductoModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >+ Nuevo producto</button>
      </div>
      {mensaje && <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : productos.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}><p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay productos registrados.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>PRODUCTO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>UBICACION</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>DESCRIPCION</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>STOCK</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}></th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{p.nombre}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{p.ubicacion}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{p.descripcion || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontWeight: 700, fontSize: '0.9rem',
                      color: p.stock_actual <= 0 ? '#ef4444' : p.stock_actual <= 5 ? '#f59e0b' : '#16a34a',
                    }}>{p.stock_actual}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button onClick={() => abrirMovimientoModal(p.id, 'entrada')}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700">+ Entrada</button>
                      <button onClick={() => abrirMovimientoModal(p.id, 'salida')}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700">- Salida</button>
                      <button onClick={() => setShowHistorial(showHistorial === p.id ? null : p.id)}
                        className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Historial</button>
                      <button onClick={() => abrirProductoModal(p)} className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Editar</button>
                      <button onClick={() => eliminarProducto(p.id)} className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50">Eliminar</button>
                    </div>
                    {showHistorial === p.id && (
                      <div style={{ marginTop: 8, background: '#f8fafc', padding: 8, fontSize: '0.75rem' }}>
                        <p style={{ fontWeight: 600, marginBottom: 4, color: '#475569' }}>MOVIMIENTOS</p>
                        {movimientosDelProducto(p.id).length === 0 ? (
                          <p style={{ color: '#94a3b8' }}>Sin movimientos</p>
                        ) : (
                          movimientosDelProducto(p.id).map(m => (
                            <div key={m.id} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}>
                              <span style={{ fontWeight: 600, color: m.tipo === 'entrada' ? '#16a34a' : '#ef4444', minWidth: 50 }}>
                                {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad}
                              </span>
                              <span style={{ color: '#64748b', flex: 1 }}>{m.justificacion || '-'}</span>
                              <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>{new Date(m.created_at).toLocaleDateString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal producto */}
      {showProductoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowProductoModal(false)}>
          <div style={{ background: '#fff', padding: 28, width: '90%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>{editProductoId ? 'Editar producto' : 'Nuevo producto'}</h3>
            <form onSubmit={handleProductoSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>UBICACION *</label>
                <select value={prodUbicacion} onChange={e => setProdUbicacion(e.target.value)} required
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">Seleccionar ubicacion</option>
                  {UBICACIONES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>NOMBRE *</label>
                <input value={prodNombre} onChange={e => setProdNombre(e.target.value.toUpperCase())} required
                  placeholder="Ej: ALCOHOL, GASA, VENDA, CURITA"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DESCRIPCION</label>
                <input value={prodDescripcion} onChange={e => setProdDescripcion(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {!editProductoId && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>STOCK INICIAL</label>
                  <input type="number" min="0" value={prodStockInicial} onChange={e => setProdStockInicial(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{editProductoId ? 'Guardar' : 'Crear'}</button>
                <button type="button" onClick={() => setShowProductoModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal movimiento */}
      {showMovimientoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowMovimientoModal(false)}>
          <div style={{ background: '#fff', padding: 28, width: '90%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>
              {movTipo === 'entrada' ? 'Registrar entrada' : 'Registrar salida'}
            </h3>
            <form onSubmit={handleMovimientoSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>PRODUCTO</label>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{productos.find(p => p.id === movProductoId)?.nombre}</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>TIPO</label>
                <select value={movTipo} onChange={e => setMovTipo(e.target.value as 'entrada' | 'salida')}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="entrada">ENTRADA</option>
                  <option value="salida">SALIDA</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>CANTIDAD *</label>
                <input type="number" min="1" value={movCantidad} onChange={e => setMovCantidad(e.target.value)} required
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  JUSTIFICACION {movTipo === 'salida' ? '*' : ''}
                </label>
                <textarea value={movJustificacion} onChange={e => setMovJustificacion(e.target.value.toUpperCase())}
                  rows={3}
                  placeholder={movTipo === 'salida' ? 'Ej: ENTREGADO A ENFERMERIA, VENCIDO, EN USO' : 'Opcional'}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Registrar</button>
                <button type="button" onClick={() => setShowMovimientoModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}