import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

const TABS = [
  'ACUERDOS COMERCIALES', 'DISENO', 'RRSS', 'PRECIOS', 'COSTOS', 'EVENTOS', 'MARCAS PROPIAS',
] as const

type TabId = (typeof TABS)[number]

const COLOR_ESTADO_ACUERDO: Record<string, string> = {
  pendiente: '#f59e0b',
  activo: '#16a34a',
  vencido: '#ef4444',
}

interface Acuerdo {
  id: string
  proveedor: string
  monto: number
  tiempo: string
  estado: string
  created_at: string
}

interface Incidencia {
  id: string
  plataforma: string
  error: string
  mes: string
  created_at: string
}

interface MetaRRSS {
  id: string
  mes: string
  seguidores_meta: number
  likes_meta: number
  interacciones_meta: number
  seguidores_logrado: number
  likes_logrado: number
  interacciones_logrado: number
}

interface MarcaPropia {
  id: string
  nombre_marca: string
  estado: string
  mes: string
  created_at: string
}

export function Mercadeo() {
  const [tab, setTab] = useState<TabId>('ACUERDOS COMERCIALES')

  return (
    <div style={{ padding: '12px 32px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 8 }}>
          <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Panel</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: '#64748b' }}>Comercial</span>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: '#001A4A', fontWeight: 600 }}>Mercadeo</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Gestion de acuerdos, diseno, redes sociales y marcas propias</p>
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

      <div style={{ display: tab === 'ACUERDOS COMERCIALES' ? 'block' : 'none' }}><AcuerdosComerciales /></div>
      <div style={{ display: tab === 'DISENO' ? 'block' : 'none' }}><Diseno /></div>
      <div style={{ display: tab === 'RRSS' ? 'block' : 'none' }}><RRSS /></div>
      <div style={{ display: tab === 'PRECIOS' ? 'block' : 'none' }}><Placeholder titulo="PRECIOS" /></div>
      <div style={{ display: tab === 'COSTOS' ? 'block' : 'none' }}><Placeholder titulo="COSTOS" /></div>
      <div style={{ display: tab === 'EVENTOS' ? 'block' : 'none' }}><Placeholder titulo="EVENTOS" /></div>
      <div style={{ display: tab === 'MARCAS PROPIAS' ? 'block' : 'none' }}><MarcasPropias /></div>
    </div>
  )
}

function Placeholder({ titulo }: { titulo: string }) {
  return (
    <div style={{ background: '#f8fafc', padding: 60, textAlign: 'center' }}>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{titulo} — Proximamente</p>
    </div>
  )
}

function AcuerdosComerciales() {
  const [acuerdos, setAcuerdos] = useState<Acuerdo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [proveedor, setProveedor] = useState('')
  const [monto, setMonto] = useState('')
  const [tiempo, setTiempo] = useState('')
  const [estado, setEstado] = useState('pendiente')
  const [mensaje, setMensaje] = useState('')
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('mercadeo_acuerdos').select('*').order('created_at', { ascending: false })
    if (data) setAcuerdos(data as Acuerdo[])
    setLoading(false)
  }

  function abrirModal(a?: Acuerdo) {
    if (a) {
      setEditId(a.id); setProveedor(a.proveedor); setMonto(String(a.monto)); setTiempo(a.tiempo); setEstado(a.estado)
    } else {
      setEditId(null); setProveedor(''); setMonto(''); setTiempo(''); setEstado('pendiente')
    }
    setMensaje(''); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!proveedor.trim()) return
    const payload = { proveedor: proveedor.trim().toUpperCase(), monto: parseFloat(monto) || 0, tiempo: tiempo.trim(), estado }
    if (editId) {
      const { error } = await supabase.from('mercadeo_acuerdos').update(payload).eq('id', editId)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('mercadeo_acuerdos').insert(payload)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    }
    setShowModal(false); cargar()
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('mercadeo_acuerdos').delete().eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`); return }
    cargar()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Acuerdos Comerciales</h2>
        <button onClick={() => abrirModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >+ Nuevo acuerdo</button>
      </div>
      {mensaje && <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : acuerdos.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}><p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay acuerdos registrados.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>PROVEEDOR</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>MONTO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>TIEMPO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>ESTADO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}></th>
              </tr>
            </thead>
            <tbody>
              {acuerdos.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{a.proveedor}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>${a.monto.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{a.tiempo || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700,
                      background: a.estado === 'activo' ? '#f0fdf4' : a.estado === 'vencido' ? '#fef2f2' : '#fefce8',
                      color: COLOR_ESTADO_ACUERDO[a.estado] || '#64748b',
                    }}>{a.estado.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => abrirModal(a)} className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Editar</button>
                      <button onClick={() => eliminar(a.id)} className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50">Eliminar</button>
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>{editId ? 'Editar acuerdo' : 'Nuevo acuerdo'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>PROVEEDOR *</label>
                <input value={proveedor} onChange={e => setProveedor(e.target.value.toUpperCase())} required
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>MONTO ($)</label>
                <input type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>TIEMPO</label>
                <input value={tiempo} onChange={e => setTiempo(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>ESTADO</label>
                <select value={estado} onChange={e => setEstado(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="pendiente">PENDIENTE</option>
                  <option value="activo">ACTIVO</option>
                  <option value="vencido">VENCIDO</option>
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

function Diseno() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [plataforma, setPlataforma] = useState('')
  const [error, setError] = useState('')
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('mercadeo_diseno_incidencias').select('*').order('created_at', { ascending: false })
    if (data) setIncidencias(data as Incidencia[])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!error.trim()) return
    const { error: err } = await supabase.from('mercadeo_diseno_incidencias').insert({
      plataforma: plataforma.trim().toUpperCase(),
      error: error.trim().toUpperCase(),
      mes,
    })
    if (err) { setMensaje(`Error: ${err.message}`); return }
    setPlataforma(''); setError(''); setShowModal(false); cargar()
  }

  async function eliminar(id: string) {
    await supabase.from('mercadeo_diseno_incidencias').delete().eq('id', id)
    cargar()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Incidencias de Diseno</h2>
        <button onClick={() => { setShowModal(true); setMensaje('') }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >+ Nueva incidencia</button>
      </div>
      {mensaje && <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : incidencias.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}><p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay incidencias registradas.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>PLATAFORMA</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>ERROR</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>MES</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>FECHA</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}></th>
              </tr>
            </thead>
            <tbody>
              {incidencias.map(inc => (
                <tr key={inc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{inc.plataforma || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{inc.error}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{inc.mes}</td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>{new Date(inc.created_at).toLocaleDateString('es-VE')}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => eliminar(inc.id)} className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50">Eliminar</button>
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>Registrar incidencia</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>PLATAFORMA / MEDIO</label>
                <input value={plataforma} onChange={e => setPlataforma(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="Ej: INSTAGRAM, WEB, CARTELERA..."
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>ERROR *</label>
                <textarea value={error} onChange={e => setError(e.target.value.toUpperCase())} required
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>MES</label>
                <input type="month" value={mes} onChange={e => setMes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Guardar</button>
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function RRSS() {
  const [metas, setMetas] = useState<MetaRRSS[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [seguidoresMeta, setSeguidoresMeta] = useState(0)
  const [likesMeta, setLikesMeta] = useState(0)
  const [interaccionesMeta, setInteraccionesMeta] = useState(0)
  const [seguidoresLog, setSeguidoresLog] = useState(0)
  const [likesLog, setLikesLog] = useState(0)
  const [interaccionesLog, setInteraccionesLog] = useState(0)
  const [editId, setEditId] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('mercadeo_rrss_metas').select('*').order('mes', { ascending: false })
    if (data) setMetas(data as MetaRRSS[])
    setLoading(false)
  }

  function abrirModal(m?: MetaRRSS) {
    if (m) {
      setEditId(m.id); setMes(m.mes); setSeguidoresMeta(m.seguidores_meta); setLikesMeta(m.likes_meta)
      setInteraccionesMeta(m.interacciones_meta); setSeguidoresLog(m.seguidores_logrado)
      setLikesLog(m.likes_logrado); setInteraccionesLog(m.interacciones_logrado)
    } else {
      setEditId(null); setMes(new Date().toISOString().slice(0, 7))
      setSeguidoresMeta(0); setLikesMeta(0); setInteraccionesMeta(0)
      setSeguidoresLog(0); setLikesLog(0); setInteraccionesLog(0)
    }
    setMensaje(''); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      mes, seguidores_meta: seguidoresMeta, likes_meta: likesMeta, interacciones_meta: interaccionesMeta,
      seguidores_logrado: seguidoresLog, likes_logrado: likesLog, interacciones_logrado: interaccionesLog,
    }
    if (editId) {
      const { error } = await supabase.from('mercadeo_rrss_metas').update(payload).eq('id', editId)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('mercadeo_rrss_metas').insert(payload)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    }
    setShowModal(false); cargar()
  }

  function pct(meta: number, logrado: number) {
    return meta > 0 ? Math.round((logrado / meta) * 100) : 0
  }

  function colorPct(v: number) {
    return v >= 100 ? '#16a34a' : v >= 50 ? '#ca8a04' : '#dc2626'
  }

  function bgPct(v: number) {
    return v >= 100 ? '#f0fdf4' : v >= 50 ? '#fefce8' : '#fef2f2'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Metas Redes Sociales</h2>
        <button onClick={() => abrirModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >{metas.length > 0 ? 'Editar mes' : '+ Nueva meta'}</button>
      </div>
      {mensaje && <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : metas.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}><p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay metas registradas.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>MES</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, textAlign: 'center' }} colSpan={2}>SEGUIDORES</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, textAlign: 'center' }} colSpan={2}>LIKES</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, textAlign: 'center' }} colSpan={2}>INTERACCIONES</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}></th>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th></th>
                <th style={{ padding: '4px 12px', color: '#94a3b8', fontWeight: 500, fontSize: '0.72rem' }}>META</th>
                <th style={{ padding: '4px 12px', color: '#94a3b8', fontWeight: 500, fontSize: '0.72rem' }}>REAL</th>
                <th style={{ padding: '4px 12px', color: '#94a3b8', fontWeight: 500, fontSize: '0.72rem' }}>META</th>
                <th style={{ padding: '4px 12px', color: '#94a3b8', fontWeight: 500, fontSize: '0.72rem' }}>REAL</th>
                <th style={{ padding: '4px 12px', color: '#94a3b8', fontWeight: 500, fontSize: '0.72rem' }}>META</th>
                <th style={{ padding: '4px 12px', color: '#94a3b8', fontWeight: 500, fontSize: '0.72rem' }}>REAL</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {metas.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#001A4A' }}>{m.mes}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b', textAlign: 'center' }}>{m.seguidores_meta.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: colorPct(pct(m.seguidores_meta, m.seguidores_logrado)) }}>{m.seguidores_logrado.toLocaleString()}</span>
                    <span style={{ marginLeft: 6, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700, background: bgPct(pct(m.seguidores_meta, m.seguidores_logrado)), color: colorPct(pct(m.seguidores_meta, m.seguidores_logrado)) }}>{pct(m.seguidores_meta, m.seguidores_logrado)}%</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#1e293b', textAlign: 'center' }}>{m.likes_meta.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: colorPct(pct(m.likes_meta, m.likes_logrado)) }}>{m.likes_logrado.toLocaleString()}</span>
                    <span style={{ marginLeft: 6, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700, background: bgPct(pct(m.likes_meta, m.likes_logrado)), color: colorPct(pct(m.likes_meta, m.likes_logrado)) }}>{pct(m.likes_meta, m.likes_logrado)}%</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#1e293b', textAlign: 'center' }}>{m.interacciones_meta.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: colorPct(pct(m.interacciones_meta, m.interacciones_logrado)) }}>{m.interacciones_logrado.toLocaleString()}</span>
                    <span style={{ marginLeft: 6, padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700, background: bgPct(pct(m.interacciones_meta, m.interacciones_logrado)), color: colorPct(pct(m.interacciones_meta, m.interacciones_logrado)) }}>{pct(m.interacciones_meta, m.interacciones_logrado)}%</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => abrirModal(m)} className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Editar</button>
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
          <div style={{ background: '#fff', padding: 28, width: '90%', maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>{editId ? 'Editar metas' : 'Nuevas metas'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>MES</label>
                <input type="month" value={mes} onChange={e => setMes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>SEGUIDORES META</label>
                  <input type="number" value={seguidoresMeta} onChange={e => setSeguidoresMeta(parseInt(e.target.value) || 0)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>SEGUIDORES REAL</label>
                  <input type="number" value={seguidoresLog} onChange={e => setSeguidoresLog(parseInt(e.target.value) || 0)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>LIKES META</label>
                  <input type="number" value={likesMeta} onChange={e => setLikesMeta(parseInt(e.target.value) || 0)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>LIKES REAL</label>
                  <input type="number" value={likesLog} onChange={e => setLikesLog(parseInt(e.target.value) || 0)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>INTERACCIONES META</label>
                  <input type="number" value={interaccionesMeta} onChange={e => setInteraccionesMeta(parseInt(e.target.value) || 0)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} /></div>
                <div><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>INTERACCIONES REAL</label>
                  <input type="number" value={interaccionesLog} onChange={e => setInteraccionesLog(parseInt(e.target.value) || 0)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} /></div>
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

function MarcasPropias() {
  const [marcas, setMarcas] = useState<MarcaPropia[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [nombreMarca, setNombreMarca] = useState('')
  const [estado, setEstado] = useState('ACTIVA')
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [mensaje, setMensaje] = useState('')
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('mercadeo_marcas_propias').select('*').order('created_at', { ascending: false })
    if (data) setMarcas(data as MarcaPropia[])
    setLoading(false)
  }

  function abrirModal(m?: MarcaPropia) {
    if (m) {
      setEditId(m.id); setNombreMarca(m.nombre_marca); setEstado(m.estado); setMes(m.mes)
    } else {
      setEditId(null); setNombreMarca(''); setEstado('ACTIVA'); setMes(new Date().toISOString().slice(0, 7))
    }
    setMensaje(''); setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombreMarca.trim()) return
    const payload = { nombre_marca: nombreMarca.trim().toUpperCase(), estado, mes }
    if (editId) {
      const { error } = await supabase.from('mercadeo_marcas_propias').update(payload).eq('id', editId)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('mercadeo_marcas_propias').insert(payload)
      if (error) { setMensaje(`Error: ${error.message}`); return }
    }
    setShowModal(false); cargar()
  }

  const mesesConMarcas = new Set(marcas.filter(m => m.estado === 'ACTIVA').map(m => m.mes))
  const currentMonth = new Date().toISOString().slice(0, 7)
  const tieneEsteMes = mesesConMarcas.has(currentMonth)
  const mesesAtrasados: string[] = []
  const [y, m] = currentMonth.split('-').map(Number)
  for (let i = 0; i < 6; i++) {
    const d = new Date(y, m - 1 - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!mesesConMarcas.has(key)) mesesAtrasados.push(key)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Marcas Propias</h2>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
            {tieneEsteMes ? (
              <span style={{ color: '#16a34a', fontWeight: 600 }}>Meta del mes cumplida — marca ACTIVA registrada</span>
            ) : (
              <span style={{ color: '#dc2626', fontWeight: 600 }}>Pendiente: registrar al menos 1 marca ACTIVA este mes</span>
            )}
            {mesesAtrasados.length > 0 && (
              <span style={{ display: 'block', marginTop: 2, color: '#ca8a04' }}>
                Meses sin registro: {mesesAtrasados.join(', ')}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => abrirModal()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >+ Registrar marca</button>
      </div>
      {mensaje && <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : marcas.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}><p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay marcas propias registradas.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>MARCA</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>ESTADO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>MES</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>FECHA</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}></th>
              </tr>
            </thead>
            <tbody>
              {marcas.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{m.nombre_marca}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700,
                      background: m.estado === 'ACTIVA' ? '#f0fdf4' : '#f1f5f9',
                      color: m.estado === 'ACTIVA' ? '#16a34a' : '#64748b',
                    }}>{m.estado}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{m.mes}</td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>{new Date(m.created_at).toLocaleDateString('es-VE')}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => abrirModal(m)} className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Editar</button>
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>{editId ? 'Editar marca' : 'Registrar marca propia'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>NOMBRE DE LA MARCA *</label>
                <input value={nombreMarca} onChange={e => setNombreMarca(e.target.value.toUpperCase())} required
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>ESTADO</label>
                <select value={estado} onChange={e => setEstado(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="ACTIVA">ACTIVA</option>
                  <option value="INACTIVA">INACTIVA</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>MES</label>
                <input type="month" value={mes} onChange={e => setMes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{editId ? 'Guardar' : 'Registrar'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
