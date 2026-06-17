import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

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
  telefono: '', correo: '', profesion: '', posibles_cargos: '',
}

export function Reclutamiento() {
  const [tab, setTab] = useState<TabId>('ats')

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>
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

      {tab === 'ats' && <Ats />}
      {tab === 'plantilla-aprobada' && <PlantillaAprobada />}
      {tab === 'plantillas-idoneas' && <PlantillasIdoneas />}
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
      posibles_cargos: form.posibles_cargos, origen: 'manual',
    })
    if (error) { setMensaje(`Error: ${error.message}`); return }
    setForm(INITIAL_FORM)
    setShowForm(false)
    setMensaje('Candidato registrado exitosamente')
    cargarCandidatos()
  }

  async function cambiarEstado(id: string, nuevoEstado: string) {
    const { error } = await supabase.from('rrhh_candidatos').update({ estado: nuevoEstado }).eq('id', id)
    if (error) { setMensaje(`Error al actualizar: ${error.message}`); return }
    cargarCandidatos()
  }

  const filtrados = filtroEstado ? candidatos.filter(c => c.estado === filtroEstado) : candidatos

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Applicant Tracking System</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowForm(true); setMensaje('') }}
            style={{ background: '#001A4A', color: '#fff', border: 'none', padding: '8px 20px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
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
          style={{
            padding: '4px 14px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            background: !filtroEstado ? '#001A4A' : '#f1f5f9', color: !filtroEstado ? '#fff' : '#64748b',
            border: 'none',
          }}
        >TODOS ({candidatos.length})</button>
        {ESTADOS.map(e => {
          const count = candidatos.filter(c => c.estado === e).length
          return (
            <button key={e} onClick={() => setFiltroEstado(e)}
              style={{
                padding: '4px 14px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                background: filtroEstado === e ? COLOR_ESTADO[e] : '#f1f5f9',
                color: filtroEstado === e ? '#fff' : '#64748b', border: 'none',
              }}
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
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8', padding: '0 4px' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>CEDULA</label>
                  <input value={form.cedula} onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>NOMBRES *</label>
                  <input value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} required
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>APELLIDOS</label>
                  <input value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>FECHA NACIMIENTO</label>
                  <input type="date" value={form.fecha_nacimiento} onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DIRECCION</label>
                  <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
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
                  <input value={form.profesion} onChange={e => setForm(f => ({ ...f, profesion: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>POSIBLES CARGOS</label>
                  <input value={form.posibles_cargos} onChange={e => setForm(f => ({ ...f, posibles_cargos: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={{ background: '#001A4A', color: '#fff', border: 'none', padding: '8px 24px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Guardar candidato</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '8px 24px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
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
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>NOMBRES</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>APELLIDOS</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>TELEFONO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>CORREO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>PROFESION</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>ORIGEN</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>ESTADO</th>
                <th style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>FECHA</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{c.cedula || '-'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#001A4A' }}>{c.nombres}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{c.apellidos || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{c.telefono || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{c.correo || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#1e293b' }}>{c.profesion || '-'}</td>
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
    </div>
  )
}

interface PlantillaItem {
  id: string
  descripcion: string
  departamento: string
  ubicaciones: Ubicacion[]
  created_at: string
}

interface Ubicacion {
  id: string
  ubicacion: string
  vacantes: number
}

function PlantillaAprobada() {
  const [plantillas, setPlantillas] = useState<PlantillaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [ubicaciones, setUbicaciones] = useState<{ ubicacion: string; vacantes: number }[]>([])

  useEffect(() => { cargarPlantillas() }, [])

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
    setPlantillas(pts.map(p => ({ ...p, ubicaciones: ubMap[p.id] || [] })) as PlantillaItem[])
    setLoading(false)
  }

  function agregarUbicacion() {
    setUbicaciones(u => [...u, { ubicacion: '', vacantes: 1 }])
  }

  function quitarUbicacion(i: number) {
    setUbicaciones(u => u.filter((_, idx) => idx !== i))
  }

  function actualizarUbicacion(i: number, campo: 'ubicacion' | 'vacantes', valor: string | number) {
    setUbicaciones(u => u.map((item, idx) => idx === i ? { ...item, [campo]: valor } : item))
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

  async function eliminarPlantilla(id: string) {
    const { error } = await supabase.from('rrhh_plantillas_aprobadas').delete().eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`); return }
    cargarPlantillas()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Plantilla Aprobada</h2>
        <button onClick={() => { setShowModal(true); setMensaje('') }}
          style={{ background: '#001A4A', color: '#fff', border: 'none', padding: '8px 20px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
        >Aprobar plantilla</button>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {plantillas.map(p => (
            <div key={p.id} style={{ border: '1px solid #e2e8f0', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#001A4A', margin: 0 }}>{p.descripcion}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>{p.departamento}</p>
                </div>
                <button onClick={() => eliminarPlantilla(p.id)}
                  style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '4px 12px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
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
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A' }}>Aprobar nueva plantilla</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8', padding: '0 4px' }}>✕</button>
            </div>
            <form onSubmit={handleCrear}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DESCRIPCION DEL CARGO *</label>
                  <input value={descripcion} onChange={e => setDescripcion(e.target.value)} required
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DEPARTAMENTO *</label>
                  <input value={departamento} onChange={e => setDepartamento(e.target.value)} required
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>UBICACIONES Y VACANTES</label>
                  <button type="button" onClick={agregarUbicacion}
                    style={{ background: '#f1f5f9', color: '#001A4A', border: 'none', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >+ Agregar ubicacion</button>
                </div>
                {ubicaciones.map((u, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input value={u.ubicacion} onChange={e => actualizarUbicacion(i, 'ubicacion', e.target.value)}
                      placeholder="Ej: Supermercado Centro, Oficina Central"
                      style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                    <input type="number" min={1} value={u.vacantes} onChange={e => actualizarUbicacion(i, 'vacantes', parseInt(e.target.value) || 1)}
                      style={{ width: 80, padding: '6px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => quitarUbicacion(i)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}>✕</button>
                  </div>
                ))}
                {ubicaciones.length === 0 && (
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Agregue al menos una ubicacion con su cantidad de vacantes.</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={{ background: '#001A4A', color: '#fff', border: 'none', padding: '8px 24px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Guardar plantilla</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '8px 24px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function PlantillasIdoneas() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Plantillas Idoneas</h2>
        <button style={{ background: '#001A4A', color: '#fff', border: 'none', padding: '8px 20px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Crear plantilla</button>
      </div>
      <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay plantillas idoneas definidas.</p>
      </div>
    </div>
  )
}
