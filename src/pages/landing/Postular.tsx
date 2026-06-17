import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

const NAVY = '#001A4A'
const CORAL = '#FF5252'
const GREEN = '#00A651'

const PUESTOS = [
  { value: 'cajero', label: 'Cajero' },
  { value: 'reponedor', label: 'Reponedor' },
  { value: 'atencion-al-cliente', label: 'Atencion al cliente' },
  { value: 'supervisor', label: 'Supervisor de piso' },
  { value: 'jefe-sucursal', label: 'Jefe de sucursal' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'logistica', label: 'Logistica / Deposito' },
  { value: 'sistemas', label: 'Sistemas / TI' },
  { value: 'recursos-humanos', label: 'Recursos Humanos' },
  { value: 'contencion', label: 'Contencion / Seguridad' },
  { value: 'carniceria', label: 'Carniceria' },
  { value: 'panaderia', label: 'Panaderia' },
  { value: 'otro', label: 'Otro' },
]

const DISPONIBILIDAD = ['Tiempo completo', 'Medio tiempo', 'Fines de semana', 'Solo nocturno', 'Indistinto']

export function Postular() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre: '', email: '', telefono: '', direccion: '', puesto: '',
    experiencia: '', estudios: '', habilidades: '', disponibilidad: '', referencias: '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const val = (name: string, value: string) => {
    if (!value.trim() && !['experiencia', 'estudios', 'habilidades', 'referencias'].includes(name))
      return 'Campo requerido'
    if (name === 'email' && value && !/\S+@\S+\.\S+/.test(value)) return 'Email invalido'
    if (name === 'telefono' && value && !/^[\d\s\-\+\(\)]{7,15}$/.test(value)) return 'Telefono invalido'
    return ''
  }

  const handleChange = (name: string, value: string) => {
    setForm(f => ({ ...f, [name]: value }))
    setErrores(e => ({ ...e, [name]: val(name, value) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    for (const k of ['nombre', 'email', 'telefono', 'direccion', 'puesto'] as const)
      errs[k] = val(k, form[k])
    setErrores(errs)
    if (Object.values(errs).some(Boolean)) return
    setEnviando(true)
    const { error } = await supabase.from('rrhh_candidatos').insert({
      nombres: form.nombre,
      correo: form.email,
      telefono: form.telefono,
      direccion: form.direccion,
      posibles_cargos: form.puesto,
      experiencia: form.experiencia,
      estudios: form.estudios,
      habilidades: form.habilidades,
      disponibilidad: form.disponibilidad,
      referencias: form.referencias,
      origen: 'web',
      estado: 'NUEVO',
    })
    setEnviando(false)
    if (error) { setErrores({ general: 'Error al enviar la postulacion. Intenta de nuevo.' }); return }
    setEnviado(true)
  }

  return (
    <div style={{ fontFamily: "'Poppins', 'Segoe UI', system-ui, sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/sitio" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo.webp" alt="Luxor" style={{ height: 40, width: 'auto', display: 'block' }} />
        </a>
        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>/</span>
        <span style={{ color: NAVY, fontWeight: 600, fontSize: '0.9rem' }}>Postulate</span>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        {!enviado ? (
          <>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: NAVY, marginBottom: 6 }}>Postulate</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 32, maxWidth: 500 }}>
              Completá el formulario y formá parte del equipo de Supermercados Luxor
            </p>

            <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {[
                  { key: 'nombre', label: 'Nombre completo', type: 'text' },
                  { key: 'email', label: 'Correo electronico', type: 'email' },
                  { key: 'telefono', label: 'Telefono', type: 'tel' },
                  { key: 'direccion', label: 'Direccion', type: 'text' },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: f.key === 'direccion' ? '1 / -1' : undefined }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: NAVY, marginBottom: 4 }}>
                      {f.label} <span style={{ color: CORAL }}>*</span>
                    </label>
                    <input type={f.type} value={form[f.key as keyof typeof form]} onChange={e => handleChange(f.key, e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', border: `1px solid ${errores[f.key] ? CORAL : '#e2e8f0'}`, fontSize: '0.85rem', color: NAVY, outline: 'none', boxSizing: 'border-box' }}
                    />
                    {errores[f.key] && <span style={{ fontSize: '0.7rem', color: CORAL, display: 'block', marginTop: 2 }}>{errores[f.key]}</span>}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: NAVY, marginBottom: 4 }}>
                  Puesto solicitado <span style={{ color: CORAL }}>*</span>
                </label>
                <select value={form.puesto} onChange={e => handleChange('puesto', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: `1px solid ${errores.puesto ? CORAL : '#e2e8f0'}`, fontSize: '0.85rem', color: NAVY, background: '#fff', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="">Seleccione</option>
                  {PUESTOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                {errores.puesto && <span style={{ fontSize: '0.7rem', color: CORAL, display: 'block', marginTop: 2 }}>{errores.puesto}</span>}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: NAVY, marginBottom: 4 }}>Experiencia laboral</label>
                <textarea value={form.experiencia} onChange={e => handleChange('experiencia', e.target.value)} placeholder="Describí tu experiencia laboral previa..."
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: NAVY, resize: 'vertical', minHeight: 100, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: NAVY, marginBottom: 4 }}>Estudios / Formacion</label>
                <textarea value={form.estudios} onChange={e => handleChange('estudios', e.target.value)} placeholder="Indicá tu nivel de estudios, instituciones y titulos obtenidos..."
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: NAVY, resize: 'vertical', minHeight: 80, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: NAVY, marginBottom: 4 }}>Habilidades</label>
                <textarea value={form.habilidades} onChange={e => handleChange('habilidades', e.target.value)} placeholder="Contanos sobre tus habilidades y fortalezas..."
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: NAVY, resize: 'vertical', minHeight: 80, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: NAVY, marginBottom: 4 }}>Disponibilidad horaria</label>
                <select value={form.disponibilidad} onChange={e => handleChange('disponibilidad', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: NAVY, background: '#fff', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="">Seleccione</option>
                  {DISPONIBILIDAD.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: NAVY, marginBottom: 4 }}>Referencias</label>
                <textarea value={form.referencias} onChange={e => handleChange('referencias', e.target.value)} placeholder="Nombre y contacto de personas que puedan referenciarte..."
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: NAVY, resize: 'vertical', minHeight: 80, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: NAVY, marginBottom: 4 }}>Adjuntar CV (opcional)</label>
                <div style={{ border: '2px dashed #e2e8f0', padding: 24, textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.background = `${NAVY}05` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width={32} height={32} fill="none" stroke="#94a3b8" viewBox="0 0 24 24" style={{ margin: '0 auto 8px', display: 'block' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Arrastra tu CV aqui o <span style={{ color: NAVY, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>selecciona un archivo</span></div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>PDF, DOC, DOCX, JPG, PNG</div>
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" style={{ display: 'none' }} />
                </div>
              </div>

              {errores.general && <div style={{ padding: '10px 16px', marginBottom: 16, background: '#fef2f2', color: '#dc2626', fontSize: '0.85rem' }}>{errores.general}</div>}

              <button type="submit" disabled={enviando}
                style={{ width: '100%', padding: '14px 24px', background: enviando ? '#94a3b8' : CORAL, color: '#fff', border: 'none', fontSize: '0.95rem', fontWeight: 700, cursor: enviando ? 'not-allowed' : 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: enviando ? 'none' : `0 6px 20px ${CORAL}50` }}
                onMouseEnter={e => { if (!enviando) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = `0 8px 28px ${CORAL}60` } }}
                onMouseLeave={e => { if (!enviando) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 6px 20px ${CORAL}50` } }}
              >
                {enviando ? 'Enviando postulacion...' : 'Enviar postulacion'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 72, height: 72, background: `${GREEN}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width={32} height={32} fill="none" stroke={GREEN} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: NAVY, marginBottom: 8 }}>Postulacion recibida</h2>
            <p style={{ fontSize: '0.9rem', color: '#475569', maxWidth: 420, margin: '0 auto 24px' }}>
              Gracias por interesarte en formar parte de Supermercados Luxor. Te contactaremos a la brevedad si tu perfil se ajusta a nuestras necesidades.
            </p>
            <button onClick={() => navigate('/sitio')}
              style={{ background: NAVY, color: '#fff', border: 'none', padding: '12px 32px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >Volver al inicio</button>
          </div>
        )}
      </div>
    </div>
  )
}
