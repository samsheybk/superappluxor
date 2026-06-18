import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

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
  created_at: string
}

interface Antecedente {
  id: string
  candidato_id: string
  tipo: string
  descripcion: string
  fecha: string
  created_at: string
}

const TIPOS_BASE: string[] = []

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2']

function getInitials(nombres: string, apellidos: string) {
  return ((nombres || '')[0] + (apellidos || '')[0]).toUpperCase() || '?'
}

function getAvatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function RelacionesLaborales() {
  const [trabajadores, setTrabajadores] = useState<Candidato[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [antecedentes, setAntecedentes] = useState<Antecedente[]>([])
  const [showModal, setShowModal] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [tipos, setTipos] = useState(TIPOS_BASE)
  const [formTipo, setFormTipo] = useState(TIPOS_BASE[0])
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split('T')[0])
  const [showNuevoTipo, setShowNuevoTipo] = useState(false)
  const [nuevoTipo, setNuevoTipo] = useState('')

  useEffect(() => {
    cargarTrabajadores()
    cargarTipos()
  }, [])

  async function cargarTipos() {
    const { data } = await supabase.from('rrhh_antecedentes_tipos').select('nombre').order('nombre', { ascending: true })
    if (data && data.length > 0) setTipos(data.map(t => t.nombre))
  }

  async function cargarTrabajadores() {
    const { data } = await supabase
      .from('rrhh_candidatos')
      .select('*')
      .eq('estado', 'ACTIVO')
      .order('nombres', { ascending: true })
    if (data) setTrabajadores(data as Candidato[])
    setLoading(false)
  }

  useEffect(() => {
    if (selectedId) cargarAntecedentes(selectedId)
    else setAntecedentes([])
  }, [selectedId])

  async function cargarAntecedentes(candidatoId: string) {
    const { data } = await supabase
      .from('rrhh_antecedentes_laborales')
      .select('*')
      .eq('candidato_id', candidatoId)
      .order('fecha', { ascending: false })
    if (data) setAntecedentes(data)
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!formDescripcion.trim()) return
    const { error } = await supabase.from('rrhh_antecedentes_laborales').insert({
      candidato_id: selectedId,
      tipo: formTipo,
      descripcion: formDescripcion,
      fecha: formFecha,
    })
    if (error) { setMensaje(`Error: ${error.message}`); return }
    setFormTipo(tipos[0]); setFormDescripcion(''); setFormFecha(new Date().toISOString().split('T')[0])
    setShowModal(false); setMensaje('')
    cargarAntecedentes(selectedId!)
  }

  async function eliminarAntecedente(id: string) {
    const { error } = await supabase.from('rrhh_antecedentes_laborales').delete().eq('id', id)
    if (error) { setMensaje(`Error: ${error.message}`); return }
    cargarAntecedentes(selectedId!)
  }

  const filtrados = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return trabajadores
    return trabajadores.filter(t =>
      (t.nombres || '').toLowerCase().includes(q) ||
      (t.apellidos || '').toLowerCase().includes(q) ||
      (t.cedula || '').toLowerCase().includes(q) ||
      (t.posibles_cargos || '').toLowerCase().includes(q) ||
      (t.ubicacion || '').toLowerCase().includes(q)
    )
  }, [search, trabajadores])

  const selected = trabajadores.find(t => t.id === selectedId)

  return (
    <div style={{ padding: '12px 32px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 8 }}>
          <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Panel</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: '#64748b' }}>Talento Humano</span>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: '#001A4A', fontWeight: 600 }}>Relaciones Laborales</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Gestion de trabajadores activos, antecedentes laborales y carnets virtuales</p>
      </div>

      {mensaje && (
        <div style={{ padding: '10px 16px', marginBottom: 16, background: mensaje.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: mensaje.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>{mensaje}</div>
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Left panel: search + workers list */}
        <div style={{ flex: '0 0 360px', border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#001A4A', marginBottom: 8 }}>TRABAJADORES ACTIVOS</h3>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, cedula, cargo, ubicacion..."
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>{search ? 'Sin resultados.' : 'No hay trabajadores activos.'}</div>
          ) : (
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {filtrados.map(t => (
                <div key={t.id} onClick={() => setSelectedId(t.id)}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                    background: selectedId === t.id ? '#eff6ff' : 'transparent',
                    borderLeft: selectedId === t.id ? '3px solid #2563eb' : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: getAvatarColor(t.id),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.78rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>{getInitials(t.nombres, t.apellidos)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#001A4A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.nombres} {t.apellidos}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.cedula || 'Sin cedula'} — {t.posibles_cargos || 'Sin cargo'} — {t.ubicacion || 'Sin ubicacion'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: worker detail + antecedentes */}
        <div style={{ flex: 1 }}>
          {!selected ? (
            <div style={{ border: '1px solid #e2e8f0', padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              Seleccione un trabajador para ver sus datos y antecedentes laborales.
            </div>
          ) : (
            <>
              {/* Worker detail card */}
              <div style={{ border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#001A4A', margin: 0 }}>DATOS DEL TRABAJADOR</h3>
                </div>
                <div style={{ padding: 24, display: 'flex', gap: 32 }}>
                  {/* Avatar */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 120, height: 120, borderRadius: '50%', background: getAvatarColor(selected.id),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '2.5rem', fontWeight: 700, color: '#fff',
                    }}>{getInitials(selected.nombres, selected.apellidos)}</div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>FOTO</span>
                  </div>
                  {/* Info columns */}
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px', alignContent: 'start' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>NOMBRES Y APELLIDOS</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#001A4A' }}>{selected.nombres} {selected.apellidos}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>CEDULA</span>
                      <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{selected.cedula || '-'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>FECHA DE NACIMIENTO</span>
                      <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{selected.fecha_nacimiento ? new Date(selected.fecha_nacimiento).toLocaleDateString('es-VE') : '-'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>PROFESION</span>
                      <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{selected.profesion || '-'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>TELEFONO</span>
                      <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{selected.telefono || '-'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>CORREO</span>
                      <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{selected.correo || '-'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>CARGO</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#001A4A' }}>{selected.posibles_cargos || '-'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>UBICACION</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#001A4A' }}>{selected.ubicacion || '-'}</span>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>DIRECCION</span>
                      <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{selected.direccion || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Antecedentes laborales */}
              <div style={{ border: '1px solid #e2e8f0' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#001A4A', margin: 0 }}>ANTECEDENTES LABORALES</h3>
                  <button onClick={() => setShowModal(true)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >+ Nuevo antecedente</button>
                </div>
                {antecedentes.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    Sin antecedentes registrados para este trabajador.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>FECHA</th>
                          <th style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>TIPO</th>
                          <th style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>DESCRIPCION</th>
                          <th style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {antecedentes.map(a => (
                          <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', color: '#1e293b', whiteSpace: 'nowrap' }}>{new Date(a.fecha).toLocaleDateString('es-VE')}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                display: 'inline-block', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700,
                                background: a.tipo === 'RECONOCIMIENTO' ? '#f0fdf4' : a.tipo === 'LLAMADO DE ATENCION' ? '#fefce8' : '#fef2f2',
                                color: a.tipo === 'RECONOCIMIENTO' ? '#16a34a' : a.tipo === 'LLAMADO DE ATENCION' ? '#ca8a04' : '#dc2626',
                              }}>{a.tipo}</span>
                            </td>
                            <td style={{ padding: '8px 12px', color: '#1e293b' }}>{a.descripcion}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <button onClick={() => eliminarAntecedente(a.id)}
                                className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 text-sm leading-none"
                              >✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal nuevo antecedente */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#fff', padding: 32, width: '90%', maxWidth: 500,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#001A4A' }}>Nuevo antecedente laboral</h3>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>
            <form onSubmit={handleCrear}>
              <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>TIPO *</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select value={formTipo} onChange={e => setFormTipo(e.target.value)}
                      style={{ flex: 1, padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                    >
                      {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowNuevoTipo(true)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >+ Nuevo tipo</button>
                  </div>
                  {showNuevoTipo && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input value={nuevoTipo} onChange={e => setNuevoTipo(e.target.value.toUpperCase())} placeholder="Nuevo tipo..."
                        style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                      <button type="button" onClick={async () => {
                        const t = nuevoTipo.trim()
                        if (t && !tipos.includes(t)) {
                          await supabase.from('rrhh_antecedentes_tipos').insert({ nombre: t }).maybeSingle()
                          setTipos(prev => [...prev, t])
                          setFormTipo(t)
                        }
                        setNuevoTipo(''); setShowNuevoTipo(false)
                      }}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >Agregar</button>
                      <button type="button" onClick={() => { setNuevoTipo(''); setShowNuevoTipo(false) }}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >Cancelar</button>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>FECHA *</label>
                  <input type="date" value={formFecha} onChange={e => setFormFecha(e.target.value)} required
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DESCRIPCION *</label>
                  <textarea value={formDescripcion} onChange={e => setFormDescripcion(e.target.value.toUpperCase())} required rows={4}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Guardar antecedente</button>
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
