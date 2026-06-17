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

      {/* Formulario manual */}
      {showForm && (
        <div style={{ background: '#f8fafc', padding: 24, marginBottom: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#001A4A', marginBottom: 16 }}>Registrar candidato manualmente</h3>
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

function PlantillaAprobada() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#001A4A' }}>Plantilla Aprobada</h2>
        <button style={{ background: '#001A4A', color: '#fff', border: 'none', padding: '8px 20px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Aprobar plantilla</button>
      </div>
      <div style={{ background: '#f8fafc', padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay plantillas aprobadas registradas.</p>
      </div>
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
