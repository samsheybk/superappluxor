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

interface Botiquin {
  id: string
  ubicacion: string
  descripcion: string
  fecha_revision: string
  estado: string
  observaciones: string
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

// --- Botiquines ---

function BotiquinesTab() {
  const [items, setItems] = useState<Botiquin[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [ubicacion, setUbicacion] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaRevision, setFechaRevision] = useState(new Date().toISOString().split('T')[0])
  const [estado, setEstado] = useState('completo')
  const [observaciones, setObservaciones] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('rrhh_seguridad_botiquines').select('*').order('fecha_revision', { ascending: false })
    if (data) setItems(data as Botiquin[])
    setLoading(false)
  }

  function abrirModal(item?: Botiquin) {
    if (item) {
      setEditId(item.id); setUbicacion(item.ubicacion); setDescripcion(item.descripcion)
      setFechaRevision(item.fecha_revision); setEstado(item.estado); setObservaciones(item.observaciones)
    } else {
      setEditId(null); setUbicacion(''); setDescripcion(''); setFechaRevision(new Date().toISOString().split('T')[0]); setEstado('completo'); setObservaciones('')
    }
    setMensaje(''); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ubicacion) return
    const payload = { ubicacion, descripcion: descripcion.trim().toUpperCase(), fecha_revision: fechaRevision, estado, observaciones: observaciones.trim().toUpperCase() }
    if (editId) {
      const { error } = await supabase.from('rrhh_seguridad_botiquines').update(payload).eq('id', editId)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('rrhh_seguridad_botiquines').insert(payload)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    }
    setShowModal(false); cargar()
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('rrhh_seguridad_botiquines').delete().eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`); return }
    cargar()
  }

  const ESTADO_BOTIQUIN_COLORS: Record<string, string> = {
    completo: '#16a34a',
    incompleto: '#f59e0b',
    vencido: '#ef4444',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Seguimiento de Botiquines</h2>
        <button onClick={() => abrirModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >+ Nueva revision</button>
      </div>
      {mensaje && <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}><p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay revisiones registradas.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>UBICACION</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>DESCRIPCION</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>FECHA REVISION</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>ESTADO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>OBSERVACIONES</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{item.ubicacion}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.descripcion || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.fecha_revision}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700,
                      background: item.estado === 'completo' ? '#f0fdf4' : item.estado === 'vencido' ? '#fef2f2' : '#fefce8',
                      color: ESTADO_BOTIQUIN_COLORS[item.estado] || '#64748b',
                    }}>{item.estado.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.observaciones || '-'}</td>
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>{editId ? 'Editar revision' : 'Nueva revision'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>UBICACION *</label>
                <select value={ubicacion} onChange={e => setUbicacion(e.target.value)} required
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">Seleccionar ubicacion</option>
                  {UBICACIONES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DESCRIPCION</label>
                <input value={descripcion} onChange={e => setDescripcion(e.target.value.toUpperCase())}
                  placeholder="Contenido del botiquin"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>FECHA DE REVISION</label>
                <input type="date" value={fechaRevision} onChange={e => setFechaRevision(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>ESTADO</label>
                <select value={estado} onChange={e => setEstado(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="completo">COMPLETO</option>
                  <option value="incompleto">INCOMPLETO</option>
                  <option value="vencido">VENCIDO</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>OBSERVACIONES</label>
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value.toUpperCase())}
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
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