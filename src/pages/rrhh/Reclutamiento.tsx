import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { SUPERMERCADOS } from '../../types'
import { FaPhone, FaLock, FaLockOpen } from 'react-icons/fa6'

const TABS = [
  { id: 'ats', label: 'ATS' },
  { id: 'plantilla-aprobada', label: 'Plantilla aprobada' },
  { id: 'plantillas-idoneas', label: 'Plantillas idoneas' },
] as const

type TabId = (typeof TABS)[number]['id']

const ESTADOS = ['NUEVO', 'PRELIMINAR', 'TECNICA', 'MEDICA', 'ELEGIBLE', 'NO ELEGIBLE', 'ACTIVO', 'EGRESO'] as const

const COLOR_ESTADO: Record<string, string> = {
  NUEVO: '#3b82f6',
  PRELIMINAR: '#f59e0b',
  TECNICA: '#8b5cf6',
  MEDICA: '#06b6d4',
  ELEGIBLE: '#16a34a',
  'NO ELEGIBLE': '#ef4444',
  ACTIVO: '#001A4A',
  EGRESO: '#64748b',
}

interface Candidato {
  id: string
  cedula: string
  nombres: string
  apellidos: string
  fecha_nacimiento: string
  direccion: string
  telefono: string
  correo: string
  profesion: string
  posibles_cargos: string
  ubicacion: string
  origen: 'manual' | 'web'
  cv_url: string | null
  experiencia: string
  estudios: string
  habilidades: string
  disponibilidad: string
  referencias: string
  estado: string
  created_at: string
}

const INITIAL_FORM = {
  cedula: '', nombres: '', apellidos: '', fecha_nacimiento: '', direccion: '',
  telefono: '', correo: '', profesion: '', posibles_cargos: '', ubicacion: '',
}

export function Reclutamiento() {
  const [tab, setTab] = useState<TabId>('ats')

  return (
    <div style={{ padding: '12px 32px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 8 }}>
          <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Panel</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: '#64748b' }}>Talento Humano</span>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: '#001A4A', fontWeight: 600 }}>Reclutamiento y seleccion</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Gestion de candidatos, plantillas aprobadas y perfiles idoneos</p>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '10px 24px', fontSize: '0.85rem', fontWeight: 600,
              color: tab === t.id ? '#001A4A' : '#94a3b8', background: 'none', border: 'none',
              borderBottom: tab === t.id ? '2px solid #001A4A' : '2px solid transparent',
              marginBottom: -2, cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s',
            }}
          >{t.label}</button>
        ))}
      </div>

      <div style={{ display: tab === 'ats' ? 'block' : 'none' }}><Ats /></div>
      <div style={{ display: tab === 'plantilla-aprobada' ? 'block' : 'none' }}><PlantillaAprobada tab={tab} /></div>
      <div style={{ display: tab === 'plantillas-idoneas' ? 'block' : 'none' }}><PlantillasIdoneas tab={tab} /></div>
    </div>
  )
}

function Ats() {
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [asignarId, setAsignarId] = useState<string | null>(null)
  const [asignarCargo, setAsignarCargo] = useState('')
  const [asignarUbic, setAsignarUbic] = useState('')
  const [contactoId, setContactoId] = useState<string | null>(null)

  useEffect(() => { cargarCandidatos() }, [])

  async function cargarCandidatos() {
    setLoading(true)
    const { data } = await supabase.from('rrhh_candidatos').select('*').order('created_at', { ascending: false })
    if (data) setCandidatos(data as Candidato[])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombres.trim()) return
    setMensaje('')
    const { error } = await supabase.from('rrhh_candidatos').insert({
      cedula: form.cedula, nombres: form.nombres, apellidos: form.apellidos,
      fecha_nacimiento: form.fecha_nacimiento || null, direccion: form.direccion,
      telefono: form.telefono, correo: form.correo, profesion: form.profesion,
      posibles_cargos: form.posibles_cargos, ubicacion: form.ubicacion || null, origen: 'manual',
    })
    if (error) { setMensaje(`Error: ${error.message}`); return }
    setForm(INITIAL_FORM)
    setShowForm(false)
    setMensaje('Candidato registrado exitosamente')
    cargarCandidatos()
  }

  async function cambiarEstado(id: string, nuevoEstado: string) {
    const candidato = candidatos.find(c => c.id === id)
    if (!candidato) return
    if (nuevoEstado === 'ACTIVO' && (!candidato.posibles_cargos?.trim() || !candidato.ubicacion?.trim())) {
      setAsignarId(id)
      setAsignarCargo(candidato.posibles_cargos || '')
      setAsignarUbic(candidato.ubicacion || '')
      return
    }
    const { error } = await supabase.from('rrhh_candidatos').update({ estado: nuevoEstado }).eq('id', id)
    if (error) { setMensaje(`Error al actualizar: ${error.message}`); return }
    cargarCandidatos()
  }

  async function asignarYActivar() {
    if (!asignarId || !asignarCargo.trim() || !asignarUbic.trim()) return
    const { error } = await supabase.from('rrhh_candidatos').update({
      posibles_cargos: asignarCargo.trim().toUpperCase(),
      ubicacion: asignarUbic.trim(),
      estado: 'ACTIVO',
    }).eq('id', asignarId)
    if (error) { setMensaje(`Error: ${error.message}`); setAsignarId(null); return }
    setAsignarId(null)
    cargarCandidatos()
  }

  const filtrados = filtroEstado ? candidatos.filter(c => c.estado === filtroEstado) : candidatos

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Applicant Tracking System</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowForm(true); setMensaje('') }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >+ Nuevo candidato</button>
        </div>
      </div>

      {mensaje && (
        <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>
      )}

      {/* Filtro por estado */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Filtrar:</span>
        <button onClick={() => setFiltroEstado(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${!filtroEstado ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >TODOS ({candidatos.length})</button>
        {ESTADOS.map(e => {
          const count = candidatos.filter(c => c.estado === e).length
          return (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filtroEstado === e ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              style={filtroEstado === e ? { background: COLOR_ESTADO[e] } : undefined}
            >{e} ({count})</button>
          )
        })}
      </div>

      {/* Modal nuevo candidato */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: '#fff', padding: 32, width: '90%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A' }}>Registrar candidato manualmente</h3>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>CEDULA</label>
                  <input value={form.cedula} onChange={e => setForm(f => ({ ...f, cedula: e.target.value.toUpperCase() }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>NOMBRES *</label>
                  <input value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value.toUpperCase() }))} required
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>APELLIDOS</label>
                  <input value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value.toUpperCase() }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>FECHA NACIMIENTO</label>
                  <input type="date" value={form.fecha_nacimiento} onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DIRECCION</label>
                  <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value.toUpperCase() }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>TELEFONO</label>
                  <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>CORREO</label>
                  <input type="email" value={form.correo} onChange={e => setForm(f => ({ ...f, correo: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>PROFESION</label>
                  <input value={form.profesion} onChange={e => setForm(f => ({ ...f, profesion: e.target.value.toUpperCase() }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>POSIBLES CARGOS</label>
                  <input value={form.posibles_cargos} onChange={e => setForm(f => ({ ...f, posibles_cargos: e.target.value.toUpperCase() }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>UBICACION</label>
                <select value={form.ubicacion} onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="">-- Seleccionar --</option>
                  {TODAS_UBICACIONES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Guardar candidato</button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Cargando candidatos...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{filtroEstado ? `No hay candidatos en estado "${filtroEstado}".` : 'No hay candidatos registrados.'}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>CEDULA</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>TALENTO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>CONTACTO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>UBICACION</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>ORIGEN</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>ESTADO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>FECHA</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{c.cedula || '-'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#001A4A' }}>{(c.nombres || '').split(' ')[0]} {(c.apellidos || '').split(' ')[0]}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => setContactoId(c.id)}
                      className="rounded-lg bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200 hover:text-blue-600"
                    ><FaPhone /></button>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{c.ubicacion || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', textTransform: 'uppercase',
                      background: c.origen === 'web' ? '#dbeafe' : '#f1f5f9',
                      color: c.origen === 'web' ? '#2563eb' : '#64748b',
                    }}>{c.origen === 'web' ? 'Web' : 'Manual'}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <select value={c.estado} onChange={e => cambiarEstado(c.id, e.target.value)}
                      style={{
                        padding: '4px 8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                        background: COLOR_ESTADO[c.estado], color: '#fff', border: 'none',
                        outline: 'none',
                      }}
                    >
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {new Date(c.created_at).toLocaleDateString('es-VE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal contacto */}
      {contactoId && (() => {
        const c = candidatos.find(x => x.id === contactoId)
        if (!c) return null
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => setContactoId(null)}>
            <div style={{
              background: '#fff', padding: 28, width: '90%', maxWidth: 400,
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', margin: 0 }}>Contacto</h3>
                <button onClick={() => setContactoId(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg leading-none">✕</button>
              </div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#001A4A', marginBottom: 12 }}>{c.nombres} {c.apellidos}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {c.telefono && (
                  <div><span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block' }}>TELEFONO</span>
                    <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{c.telefono}</span></div>
                )}
                {c.correo && (
                  <div><span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block' }}>CORREO</span>
                    <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{c.correo}</span></div>
                )}
                {c.direccion && (
                  <div><span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block' }}>DIRECCION</span>
                    <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{c.direccion}</span></div>
                )}
                {c.profesion && (
                  <div><span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block' }}>PROFESION</span>
                    <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{c.profesion}</span></div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal asignar cargo y ubicacion para activar */}
      {asignarId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setAsignarId(null)}>
          <div style={{
            background: '#fff', padding: 28, width: '90%', maxWidth: 480,
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A', marginBottom: 6 }}>Completar datos requeridos</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 16 }}>El candidato debe tener CARGO y UBICACION para cambiar a ACTIVO.</p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>CARGO *</label>
              <input value={asignarCargo} onChange={e => setAsignarCargo(e.target.value.toUpperCase())}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>UBICACION *</label>
              <select value={asignarUbic} onChange={e => setAsignarUbic(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
              >
                <option value="">-- Seleccionar --</option>
                {TODAS_UBICACIONES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={asignarYActivar}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >Guardar y activar</button>
              <button onClick={() => setAsignarId(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface PlantillaItem {
  id: string
  descripcion: string
  departamento: string
  congelado: boolean
  ubicaciones: Ubicacion[]
  created_at: string
}

interface Ubicacion {
  id: string
  ubicacion: string
  vacantes: number
  activos: number
}

function PlantillaAprobada({ tab }: { tab: string }) {
  const [plantillas, setPlantillas] = useState<PlantillaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [ubicaciones, setUbicaciones] = useState<{ ubicacion: string; vacantes: number }[]>([])
  const [showCumplimiento, setShowCumplimiento] = useState(false)

  useEffect(() => { if (tab === 'plantilla-aprobada') cargarPlantillas() }, [tab])

  async function cargarPlantillas() {
    setLoading(true)
    const { data: pts } = await supabase.from('rrhh_plantillas_aprobadas').select('*').order('created_at', { ascending: false })
    if (!pts) { setLoading(false); return }
    const { data: ubs } = await supabase.from('rrhh_plantillas_ubicaciones').select('*')
    const ubMap: Record<string, Ubicacion[]> = {}
    if (ubs) {
      for (const u of ubs) {
        if (!ubMap[u.plantilla_id]) ubMap[u.plantilla_id] = []
        ubMap[u.plantilla_id].push(u)
      }
    }
    const { data: activos } = await supabase.from('rrhh_candidatos')
      .select('posibles_cargos, ubicacion').eq('estado', 'ACTIVO')
    const activosCount: Record<string, number> = {}
    if (activos) {
      for (const a of activos) {
        if (a.posibles_cargos && a.ubicacion) {
          const key = `${a.posibles_cargos.trim()}|${a.ubicacion.trim()}`
          activosCount[key] = (activosCount[key] || 0) + 1
        }
      }
    }
    const plantillasConActivos = pts.map(p => {
      const ubsList = (ubMap[p.id] || []).map(u => ({
        ...u,
        activos: activosCount[`${p.descripcion}|${u.ubicacion}`] || 0,
      }))
      return { ...p, ubicaciones: ubsList }
    }) as PlantillaItem[]
    setPlantillas(plantillasConActivos)
    setLoading(false)
  }

  const disponibles = TODAS_UBICACIONES.filter(u => !ubicaciones.some(x => x.ubicacion === u))

  function agregarUbicacion() {
    if (disponibles.length === 0) return
    setUbicaciones(u => [...u, { ubicacion: disponibles[0], vacantes: 1 }])
  }

  function quitarUbicacion(i: number) {
    setUbicaciones(u => u.filter((_, idx) => idx !== i))
  }

  function cambiarUbicacion(i: number, valor: string) {
    setUbicaciones(u => u.map((item, idx) => idx === i ? { ...item, ubicacion: valor } : item))
  }

  function cambiarVacantes(i: number, valor: number) {
    setUbicaciones(u => u.map((item, idx) => idx === i ? { ...item, vacantes: valor } : item))
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!descripcion.trim() || !departamento.trim()) return
    setMensaje('')
    const { data: pt, error: errPt } = await supabase.from('rrhh_plantillas_aprobadas').insert({
      descripcion, departamento,
    }).select().single()
    if (errPt) { setMensaje(`Error: ${errPt.message}`); return }
    const ubicacionesValidas = ubicaciones.filter(u => u.ubicacion.trim())
    if (ubicacionesValidas.length > 0) {
      const { error: errUb } = await supabase.from('rrhh_plantillas_ubicaciones').insert(
        ubicacionesValidas.map(u => ({ plantilla_id: pt.id, ubicacion: u.ubicacion, vacantes: u.vacantes }))
      )
      if (errUb) { setMensaje(`Error: ${errUb.message}`); return }
    }
    setDescripcion(''); setDepartamento(''); setUbicaciones([])
    setShowModal(false)
    setMensaje('Plantilla aprobada creada exitosamente')
    cargarPlantillas()
  }

  async function eliminarUbicacion(id: string) {
    const { error } = await supabase.from('rrhh_plantillas_ubicaciones').delete().eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`); return }
    cargarPlantillas()
  }

  async function toggleCongelar(id: string, congelado: boolean) {
    setPlantillas(prev => prev.map(p => p.id === id ? { ...p, congelado } : p))
    const { error } = await supabase.from('rrhh_plantillas_aprobadas').update({ congelado }).eq('id', id)
    if (error) setMensaje(`Error: ${error.message}`)
  }

  function cumplimientoData() {
    const acc: Record<string, { vacantes: number; activos: number }> = {}
    for (const p of plantillas) {
      for (const u of p.ubicaciones) {
        if (!acc[u.ubicacion]) acc[u.ubicacion] = { vacantes: 0, activos: 0 }
        acc[u.ubicacion].vacantes += u.vacantes
        acc[u.ubicacion].activos += u.activos
      }
    }
    return TODAS_UBICACIONES.map(loc => {
      const d = acc[loc] || { vacantes: 0, activos: 0 }
      return {
        ubicacion: loc,
        vacantes: d.vacantes,
        activos: d.activos,
        porcentaje: d.vacantes > 0 ? Math.round((d.activos / d.vacantes) * 100) : 0,
      }
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Plantilla Aprobada</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowCumplimiento(true) }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >Ver cumplimiento</button>
          <button onClick={() => { setShowModal(true); setMensaje('') }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >Nuevo cargo</button>
        </div>
      </div>

      {mensaje && (
        <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Cargando plantillas...</div>
      ) : plantillas.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay plantillas aprobadas registradas.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>CARGO</th>
                <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>UBICACION</th>
                <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>VACANTES</th>
                <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>ACTIVOS</th>
                <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.78rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {plantillas.flatMap(p =>
                p.ubicaciones.length > 0 ? p.ubicaciones.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: p.congelado ? 0.5 : 1 }}>
                    {i === 0 ? (
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: '#001A4A', fontSize: '0.78rem' }} rowSpan={p.ubicaciones.length}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => toggleCongelar(p.id, !p.congelado)}
                            className={`rounded-lg p-1.5 ${p.congelado ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-500 hover:bg-red-50'}`}
                          >{p.congelado ? <FaLockOpen /> : <FaLock />}</button>
                          <span style={{ textDecoration: p.congelado ? 'line-through' : 'none' }}>{p.descripcion}</span>
                        </div>
                      </td>
                    ) : null}
                    <td style={{ padding: '6px 10px', color: '#1e293b', fontSize: '0.78rem' }}>{u.ubicacion}</td>
                    <td style={{ padding: '6px 10px', color: '#1e293b', fontSize: '0.78rem' }}>{u.vacantes}</td>
                    <td style={{ padding: '6px 10px', color: p.congelado ? '#94a3b8' : '#16a34a', fontWeight: 700, fontSize: '0.78rem' }}>{u.activos}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <button onClick={() => eliminarUbicacion(u.id)}
                        className="rounded-lg p-1 text-red-400 hover:bg-red-50 hover:text-red-600 text-xs leading-none">✕</button>
                    </td>
                  </tr>
                )) : (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: p.congelado ? 0.5 : 1 }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600, color: '#001A4A', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => toggleCongelar(p.id, !p.congelado)}
                            className={`rounded-lg p-1.5 ${p.congelado ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-500 hover:bg-red-50'}`}
                          >{p.congelado ? <FaLockOpen /> : <FaLock />}</button>
                        <span style={{ textDecoration: p.congelado ? 'line-through' : 'none' }}>{p.descripcion}</span>
                      </div>
                    </td>
                    <td colSpan={4} style={{ padding: '6px 10px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.78rem' }}>Sin ubicaciones asignadas</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear plantilla */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#fff', padding: 32, width: '90%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A' }}>Nuevo cargo</h3>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleCrear}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DESCRIPCION DEL CARGO *</label>
                  <input value={descripcion} onChange={e => setDescripcion(e.target.value.toUpperCase())} required
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DEPARTAMENTO *</label>
                  <input value={departamento} onChange={e => setDepartamento(e.target.value.toUpperCase())} required
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>UBICACIONES Y VACANTES</label>
                  <button type="button" onClick={agregarUbicacion} disabled={disponibles.length === 0}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${disponibles.length === 0 ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer'}`}
                  >+ Agregar ubicacion</button>
                </div>
                {ubicaciones.map((u, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select value={u.ubicacion} onChange={e => cambiarUbicacion(i, e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff' }}
                    >
                      {TODAS_UBICACIONES.map(opt => {
                        const tomada = opt !== u.ubicacion && ubicaciones.some(x => x.ubicacion === opt)
                        return <option key={opt} value={opt} disabled={tomada}>{opt}</option>
                      })}
                    </select>
                    <input type="number" min={1} value={u.vacantes} onChange={e => cambiarVacantes(i, parseInt(e.target.value) || 1)}
                      style={{ width: 80, padding: '6px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => quitarUbicacion(i)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 text-sm leading-none">✕</button>                  </div>
                ))}
                {ubicaciones.length === 0 && (
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Agregue al menos una ubicacion con su cantidad de vacantes.</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Guardar plantilla</button>
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCumplimiento && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowCumplimiento(false)}>
          <div style={{
            background: '#fff', padding: 32, width: '90%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A' }}>Cumplimiento por ubicacion</h3>
              <button onClick={() => setShowCumplimiento(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>UBICACION</th>
                  <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>VACANTES</th>
                  <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>ACTIVOS</th>
                  <th style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>CUMPLIMIENTO</th>
                </tr>
              </thead>
              <tbody>
                {cumplimientoData().map(row => (
                  <tr key={row.ubicacion} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 600 }}>{row.ubicacion}</td>
                    <td style={{ padding: '8px 10px', color: '#1e293b', textAlign: 'center' }}>{row.vacantes}</td>
                    <td style={{ padding: '8px 10px', color: '#1e293b', textAlign: 'center' }}>{row.activos}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 700,
                        background: row.porcentaje >= 100 ? '#f0fdf4' : row.porcentaje >= 50 ? '#fefce8' : '#fef2f2',
                        color: row.porcentaje >= 100 ? '#16a34a' : row.porcentaje >= 50 ? '#ca8a04' : '#dc2626',
                      }}>{row.porcentaje}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const TODAS_UBICACIONES = [...SUPERMERCADOS, 'OFICINA CENTRAL']

function PlantillasIdoneas({ tab }: { tab: string }) {
  const [plantillas, setPlantillas] = useState<PlantillaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [ubicaciones, setUbicaciones] = useState<{ ubicacion: string; vacantes: number }[]>([])

  useEffect(() => { if (tab === 'plantillas-idoneas') cargarPlantillas() }, [tab])

  async function cargarPlantillas() {
    setLoading(true)
    const { data: pts } = await supabase.from('rrhh_plantillas_idoneas').select('*').order('created_at', { ascending: false })
    if (!pts) { setLoading(false); return }
    const { data: ubs } = await supabase.from('rrhh_plantillas_idoneas_ubicaciones').select('*')
    const ubMap: Record<string, Ubicacion[]> = {}
    if (ubs) {
      for (const u of ubs) {
        if (!ubMap[u.plantilla_id]) ubMap[u.plantilla_id] = []
        ubMap[u.plantilla_id].push(u)
      }
    }
    setPlantillas(pts.map(p => ({ ...p, ubicaciones: ubMap[p.id] || [] })) as PlantillaItem[])
    setLoading(false)
  }

  const disponibles = TODAS_UBICACIONES.filter(u => !ubicaciones.some(x => x.ubicacion === u))

  function agregarUbicacion() {
    if (disponibles.length === 0) return
    setUbicaciones(u => [...u, { ubicacion: disponibles[0], vacantes: 1 }])
  }

  function quitarUbicacion(i: number) {
    setUbicaciones(u => u.filter((_, idx) => idx !== i))
  }

  function cambiarUbicacion(i: number, valor: string) {
    setUbicaciones(u => u.map((item, idx) => idx === i ? { ...item, ubicacion: valor } : item))
  }

  function cambiarVacantes(i: number, valor: number) {
    setUbicaciones(u => u.map((item, idx) => idx === i ? { ...item, vacantes: valor } : item))
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!descripcion.trim() || !departamento.trim()) return
    setMensaje('')
    const { data: pt, error: errPt } = await supabase.from('rrhh_plantillas_idoneas').insert({
      descripcion, departamento,
    }).select().single()
    if (errPt) { setMensaje(`Error: ${errPt.message}`); return }
    const ubicacionesValidas = ubicaciones.filter(u => u.ubicacion.trim())
    if (ubicacionesValidas.length > 0) {
      const { error: errUb } = await supabase.from('rrhh_plantillas_idoneas_ubicaciones').insert(
        ubicacionesValidas.map(u => ({ plantilla_id: pt.id, ubicacion: u.ubicacion, vacantes: u.vacantes }))
      )
      if (errUb) { setMensaje(`Error: ${errUb.message}`); return }
    }
    setDescripcion(''); setDepartamento(''); setUbicaciones([])
    setShowModal(false)
    setMensaje('Plantilla idonea creada exitosamente')
    cargarPlantillas()
  }

  async function eliminarPlantilla(id: string) {
    const { error } = await supabase.from('rrhh_plantillas_idoneas').delete().eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`); return }
    cargarPlantillas()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Plantillas Idoneas</h2>
        <button onClick={() => { setShowModal(true); setMensaje('') }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >Crear plantilla</button>
      </div>

      {mensaje && (
        <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Cargando plantillas...</div>
      ) : plantillas.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay plantillas idoneas definidas.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {plantillas.map(p => (
            <div key={p.id} style={{ border: '1px solid #e2e8f0', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#001A4A', margin: 0 }}>{p.descripcion}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>{p.departamento}</p>
                </div>
                <button onClick={() => eliminarPlantilla(p.id)}
                  className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                >Eliminar</button>
              </div>
              {p.ubicaciones.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '6px 10px', color: '#64748b', fontWeight: 600 }}>Ubicacion</th>
                      <th style={{ padding: '6px 10px', color: '#64748b', fontWeight: 600 }}>Vacantes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.ubicaciones.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 10px', color: '#1e293b' }}>{u.ubicacion}</td>
                        <td style={{ padding: '6px 10px', color: '#1e293b' }}>{u.vacantes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear plantilla */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#fff', padding: 32, width: '90%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A' }}>Crear plantilla idonea</h3>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleCrear}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DESCRIPCION DEL CARGO *</label>
                  <input value={descripcion} onChange={e => setDescripcion(e.target.value.toUpperCase())} required
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DEPARTAMENTO *</label>
                  <input value={departamento} onChange={e => setDepartamento(e.target.value.toUpperCase())} required
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>UBICACIONES Y VACANTES</label>
                  <button type="button" onClick={agregarUbicacion} disabled={disponibles.length === 0}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${disponibles.length === 0 ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer'}`}
                  >+ Agregar ubicacion</button>
                </div>
                {ubicaciones.map((u, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select value={u.ubicacion} onChange={e => cambiarUbicacion(i, e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff' }}
                    >
                      {TODAS_UBICACIONES.map(opt => {
                        const tomada = opt !== u.ubicacion && ubicaciones.some(x => x.ubicacion === opt)
                        return <option key={opt} value={opt} disabled={tomada}>{opt}</option>
                      })}
                    </select>
                    <input type="number" min={1} value={u.vacantes} onChange={e => cambiarVacantes(i, parseInt(e.target.value) || 1)}
                      style={{ width: 80, padding: '6px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => quitarUbicacion(i)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 text-sm leading-none">✕</button>                  </div>
                ))}
                {ubicaciones.length === 0 && (
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Agregue al menos una ubicacion con su cantidad de vacantes.</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Guardar plantilla</button>
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
