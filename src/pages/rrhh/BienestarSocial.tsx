import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

const TABS = [
  'UNIFORMES Y EPP', 'EVENTOS Y ACTIVIDADES', 'AYUDAS', 'NUCLEO FAMILIAR',
] as const

type TabId = (typeof TABS)[number]

const ESTADO_EVENTO_COLORS: Record<string, string> = {
  planificado: '#f59e0b',
  realizado: '#16a34a',
  cancelado: '#ef4444',
}

interface Trabajador {
  id: string
  cedula: string
  nombres: string
  apellidos: string
}

interface Uniforme {
  id: string
  candidato_id: string
  tipo: string
  talla: string
  cantidad: number
  fecha_entrega: string
  observaciones: string
  created_at: string
}

interface Evento {
  id: string
  nombre: string
  descripcion: string
  fecha_evento: string
  presupuesto: number
  estado: string
  created_at: string
}

interface Ayuda {
  id: string
  candidato_id: string
  tipo_ayuda: string
  monto: number
  fecha: string
  motivo: string
  created_at: string
}

interface Familiar {
  id: string
  candidato_id: string
  familiar_nombre: string
  parentesco: string
  fecha_nacimiento: string
  telefono: string
  created_at: string
}

export function BienestarSocial() {
  const [tab, setTab] = useState<TabId>('UNIFORMES Y EPP')

  return (
    <div style={{ padding: '12px 32px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 8 }}>
          <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Panel</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: '#64748b' }}>Talento Humano</span>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: '#001A4A', fontWeight: 600 }}>Bienestar Social</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Registro de uniformes, eventos, ayudas y nucleo familiar de trabajadores</p>
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

      <div style={{ display: tab === 'UNIFORMES Y EPP' ? 'block' : 'none' }}><UniformesTab /></div>
      <div style={{ display: tab === 'EVENTOS Y ACTIVIDADES' ? 'block' : 'none' }}><EventosTab /></div>
      <div style={{ display: tab === 'AYUDAS' ? 'block' : 'none' }}><AyudasTab /></div>
      <div style={{ display: tab === 'NUCLEO FAMILIAR' ? 'block' : 'none' }}><NucleoFamiliarTab /></div>
    </div>
  )
}

// --- Uniformes ---

function UniformesTab() {
  const [items, setItems] = useState<Uniforme[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [candidatoId, setCandidatoId] = useState('')
  const [tipo, setTipo] = useState('')
  const [talla, setTalla] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [fechaEntrega, setFechaEntrega] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')
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
    const { data } = await supabase.from('rrhh_bienestar_uniformes').select('*').order('fecha_entrega', { ascending: false })
    if (data) setItems(data as Uniforme[])
    setLoading(false)
  }

  function abrirModal(item?: Uniforme) {
    if (item) {
      setEditId(item.id); setCandidatoId(item.candidato_id); setTipo(item.tipo)
      setTalla(item.talla); setCantidad(String(item.cantidad)); setFechaEntrega(item.fecha_entrega); setObservaciones(item.observaciones)
    } else {
      setEditId(null); setCandidatoId(''); setTipo(''); setTalla(''); setCantidad('1'); setFechaEntrega(new Date().toISOString().split('T')[0]); setObservaciones('')
    }
    setMensaje(''); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!candidatoId || !tipo.trim()) return
    const payload = { candidato_id: candidatoId, tipo: tipo.trim().toUpperCase(), talla: talla.trim().toUpperCase(), cantidad: parseInt(cantidad) || 1, fecha_entrega: fechaEntrega, observaciones: observaciones.trim().toUpperCase() }
    if (editId) {
      const { error } = await supabase.from('rrhh_bienestar_uniformes').update(payload).eq('id', editId)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('rrhh_bienestar_uniformes').insert(payload)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    }
    setShowModal(false); cargar()
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('rrhh_bienestar_uniformes').delete().eq('id', id)
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
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Entrega de Uniformes y EPP</h2>
        <button onClick={() => abrirModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >+ Nueva entrega</button>
      </div>
      {mensaje && <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}><p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay entregas registradas.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>TRABAJADOR</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>TIPO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>TALLA</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>CANT</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>FECHA ENTREGA</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{nombreTrabajador(item.candidato_id)}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.tipo}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.talla || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.cantidad}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.fecha_entrega}</td>
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>{editId ? 'Editar entrega' : 'Nueva entrega'}</h3>
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>TIPO *</label>
                <input value={tipo} onChange={e => setTipo(e.target.value.toUpperCase())} required
                  placeholder="Ej: CAMISA, PANTALON, BOTAS, CASCO"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>TALLA</label>
                <input value={talla} onChange={e => setTalla(e.target.value.toUpperCase())}
                  placeholder="Ej: M, L, XL, 42"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>CANTIDAD</label>
                <input type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>FECHA DE ENTREGA</label>
                <input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>OBSERVACIONES</label>
                <input value={observaciones} onChange={e => setObservaciones(e.target.value.toUpperCase())}
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

// --- Eventos ---

function EventosTab() {
  const [items, setItems] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaEvento, setFechaEvento] = useState(new Date().toISOString().split('T')[0])
  const [presupuesto, setPresupuesto] = useState('')
  const [estado, setEstado] = useState('planificado')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('rrhh_bienestar_eventos').select('*').order('fecha_evento', { ascending: false })
    if (data) setItems(data as Evento[])
    setLoading(false)
  }

  function abrirModal(item?: Evento) {
    if (item) {
      setEditId(item.id); setNombre(item.nombre); setDescripcion(item.descripcion)
      setFechaEvento(item.fecha_evento); setPresupuesto(String(item.presupuesto)); setEstado(item.estado)
    } else {
      setEditId(null); setNombre(''); setDescripcion(''); setFechaEvento(new Date().toISOString().split('T')[0]); setPresupuesto(''); setEstado('planificado')
    }
    setMensaje(''); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    const payload = { nombre: nombre.trim().toUpperCase(), descripcion: descripcion.trim().toUpperCase(), fecha_evento: fechaEvento, presupuesto: parseFloat(presupuesto) || 0, estado }
    if (editId) {
      const { error } = await supabase.from('rrhh_bienestar_eventos').update(payload).eq('id', editId)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('rrhh_bienestar_eventos').insert(payload)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    }
    setShowModal(false); cargar()
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('rrhh_bienestar_eventos').delete().eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`); return }
    cargar()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Planificacion de Eventos y Actividades</h2>
        <button onClick={() => abrirModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >+ Nuevo evento</button>
      </div>
      {mensaje && <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}><p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay eventos registrados.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>NOMBRE</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>DESCRIPCION</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>FECHA</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>PRESUPUESTO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>ESTADO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{item.nombre}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.descripcion || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.fecha_evento}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>${(item.presupuesto || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700,
                      background: item.estado === 'realizado' ? '#f0fdf4' : item.estado === 'cancelado' ? '#fef2f2' : '#fefce8',
                      color: ESTADO_EVENTO_COLORS[item.estado] || '#64748b',
                    }}>{item.estado.toUpperCase()}</span>
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>{editId ? 'Editar evento' : 'Nuevo evento'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>NOMBRE *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value.toUpperCase())} required
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DESCRIPCION</label>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value.toUpperCase())}
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>FECHA DEL EVENTO</label>
                <input type="date" value={fechaEvento} onChange={e => setFechaEvento(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>PRESUPUESTO ($)</label>
                <input type="number" step="0.01" value={presupuesto} onChange={e => setPresupuesto(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>ESTADO</label>
                <select value={estado} onChange={e => setEstado(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="planificado">PLANIFICADO</option>
                  <option value="realizado">REALIZADO</option>
                  <option value="cancelado">CANCELADO</option>
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

// --- Ayudas ---

function AyudasTab() {
  const [items, setItems] = useState<Ayuda[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [candidatoId, setCandidatoId] = useState('')
  const [tipoAyuda, setTipoAyuda] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [motivo, setMotivo] = useState('')
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
    const { data } = await supabase.from('rrhh_bienestar_ayudas').select('*').order('fecha', { ascending: false })
    if (data) setItems(data as Ayuda[])
    setLoading(false)
  }

  function abrirModal(item?: Ayuda) {
    if (item) {
      setEditId(item.id); setCandidatoId(item.candidato_id); setTipoAyuda(item.tipo_ayuda)
      setMonto(String(item.monto)); setFecha(item.fecha); setMotivo(item.motivo)
    } else {
      setEditId(null); setCandidatoId(''); setTipoAyuda(''); setMonto(''); setFecha(new Date().toISOString().split('T')[0]); setMotivo('')
    }
    setMensaje(''); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!candidatoId || !tipoAyuda.trim()) return
    const payload = { candidato_id: candidatoId, tipo_ayuda: tipoAyuda.trim().toUpperCase(), monto: parseFloat(monto) || 0, fecha, motivo: motivo.trim().toUpperCase() }
    if (editId) {
      const { error } = await supabase.from('rrhh_bienestar_ayudas').update(payload).eq('id', editId)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('rrhh_bienestar_ayudas').insert(payload)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    }
    setShowModal(false); cargar()
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('rrhh_bienestar_ayudas').delete().eq('id', id)
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
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Entrega de Ayudas</h2>
        <button onClick={() => abrirModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >+ Nueva ayuda</button>
      </div>
      {mensaje && <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}><p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay ayudas registradas.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>TRABAJADOR</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>TIPO AYUDA</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>MONTO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>FECHA</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>MOTIVO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{nombreTrabajador(item.candidato_id)}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.tipo_ayuda}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>${(item.monto || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.fecha}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.motivo || '-'}</td>
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>{editId ? 'Editar ayuda' : 'Nueva ayuda'}</h3>
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>TIPO DE AYUDA *</label>
                <input value={tipoAyuda} onChange={e => setTipoAyuda(e.target.value.toUpperCase())} required
                  placeholder="Ej: ECONOMICA, ALIMENTARIA, MEDICA"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>MONTO ($)</label>
                <input type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>FECHA</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>MOTIVO</label>
                <textarea value={motivo} onChange={e => setMotivo(e.target.value.toUpperCase())}
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

// --- Nucleo Familiar ---

function NucleoFamiliarTab() {
  const [items, setItems] = useState<Familiar[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [candidatoId, setCandidatoId] = useState('')
  const [familiarNombre, setFamiliarNombre] = useState('')
  const [parentesco, setParentesco] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [telefono, setTelefono] = useState('')
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
    const { data } = await supabase.from('rrhh_bienestar_nucleo_familiar').select('*').order('familiar_nombre', { ascending: true })
    if (data) setItems(data as Familiar[])
    setLoading(false)
  }

  function abrirModal(item?: Familiar) {
    if (item) {
      setEditId(item.id); setCandidatoId(item.candidato_id); setFamiliarNombre(item.familiar_nombre)
      setParentesco(item.parentesco); setFechaNacimiento(item.fecha_nacimiento || ''); setTelefono(item.telefono)
    } else {
      setEditId(null); setCandidatoId(''); setFamiliarNombre(''); setParentesco(''); setFechaNacimiento(''); setTelefono('')
    }
    setMensaje(''); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!candidatoId || !familiarNombre.trim() || !parentesco.trim()) return
    const payload = {
      candidato_id: candidatoId,
      familiar_nombre: familiarNombre.trim().toUpperCase(),
      parentesco: parentesco.trim().toUpperCase(),
      fecha_nacimiento: fechaNacimiento || null,
      telefono: telefono.trim().toUpperCase(),
    }
    if (editId) {
      const { error } = await supabase.from('rrhh_bienestar_nucleo_familiar').update(payload).eq('id', editId)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('rrhh_bienestar_nucleo_familiar').insert(payload)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    }
    setShowModal(false); cargar()
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('rrhh_bienestar_nucleo_familiar').delete().eq('id', id)
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
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Datos del Nucleo Familiar</h2>
        <button onClick={() => abrirModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >+ Nuevo familiar</button>
      </div>
      {mensaje && <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}><p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay familiares registrados.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>TRABAJADOR</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>FAMILIAR</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>PARENTESCO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>FECHA NAC.</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>TELEFONO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{nombreTrabajador(item.candidato_id)}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.familiar_nombre}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.parentesco}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.fecha_nacimiento || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{item.telefono || '-'}</td>
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>{editId ? 'Editar familiar' : 'Nuevo familiar'}</h3>
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>NOMBRE DEL FAMILIAR *</label>
                <input value={familiarNombre} onChange={e => setFamiliarNombre(e.target.value.toUpperCase())} required
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>PARENTESCO *</label>
                <input value={parentesco} onChange={e => setParentesco(e.target.value.toUpperCase())} required
                  placeholder="Ej: HIJO, CONYUGE, PADRE, MADRE"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>FECHA DE NACIMIENTO</label>
                <input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>TELEFONO</label>
                <input value={telefono} onChange={e => setTelefono(e.target.value.toUpperCase())}
                  placeholder="0412-1234567"
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