import { useState } from 'react'

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
  { value: 'otro', label: 'Otro' },
]

export function Landing() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [puesto, setPuesto] = useState('')
  const [experiencia, setExperiencia] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    // Simulacion de envio (a futuro se conectara con el modulo de RRHH)
    await new Promise(r => setTimeout(r, 1200))
    setEnviando(false)
    setEnviado(true)
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#1e293b', background: '#f8fafc', lineHeight: 1.6, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', color: '#fff', padding: '20px 0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: 1 }}>SUPERMERCADOS LUXOR</span>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Calidad y confianza</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: '#fff', padding: '60px 0', textAlign: 'center' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 12 }}>Forma parte de nuestro equipo</h1>
          <p style={{ fontSize: '1rem', color: '#cbd5e1', maxWidth: 600, margin: '0 auto' }}>
            En Supermercados Luxor buscamos talento comprometido con la excelencia y el servicio. Sumate a una empresa en crecimiento.
          </p>
        </div>
      </div>

      {/* About */}
      <div style={{ padding: '48px 0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 24, textAlign: 'center', color: '#1e293b' }}>Sobre Supermercados Luxor</h2>
          <p style={{ textAlign: 'center', color: '#475569', maxWidth: 700, margin: '0 auto 12px', fontSize: '0.95rem' }}>
            Somos una cadena de supermercados comprometida con ofrecer productos de calidad y un servicio
            cercano a nuestras comunidades. Con presencia en multiples ubicaciones, trabajamos cada dia
            para superar las expectativas de nuestros clientes.
          </p>
          <p style={{ textAlign: 'center', color: '#475569', maxWidth: 700, margin: '0 auto 12px', fontSize: '0.95rem' }}>
            Creemos en el talento local y en la mejora continua. Por eso estamos siempre en busqueda de
            personas que compartan nuestra vision y quieran crecer junto a nosotros.
          </p>
        </div>
      </div>

      {/* Valores */}
      <div style={{ padding: '0 0 48px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 24, textAlign: 'center', color: '#1e293b' }}>Nuestros valores</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { titulo: 'Compromiso', desc: 'Responsabilidad y dedicacion en cada tarea' },
              { titulo: 'Calidad', desc: 'Excelencia en productos y servicio al cliente' },
              { titulo: 'Trabajo en equipo', desc: 'Colaboracion para alcanzar metas comunes' },
              { titulo: 'Innovacion', desc: 'Mejora continua para evolucionar juntos' },
            ].map(v => (
              <div key={v.titulo} style={{ background: '#fff', borderRadius: 10, padding: '24px 16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 6, color: '#1e293b' }}>{v.titulo}</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div style={{ padding: '0 0 48px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 24, textAlign: 'center', color: '#1e293b' }}>Formulario de postulacion</h2>

          {!enviado ? (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: 40, marginBottom: 16 }} id="formWrapper">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Nombre completo *</label>
                    <input value={nombre} onChange={e => setNombre(e.target.value)} required
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', color: '#1e293b', background: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Correo electronico *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', color: '#1e293b', background: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Telefono *</label>
                    <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} required
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', color: '#1e293b', background: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Puesto solicitado *</label>
                    <select value={puesto} onChange={e => setPuesto(e.target.value)} required
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', color: '#1e293b', background: '#fff' }}
                    >
                      <option value="">Seleccione un puesto</option>
                      {PUESTOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Experiencia previa / Mensaje</label>
                  <textarea value={experiencia} onChange={e => setExperiencia(e.target.value)} placeholder="Contanos sobre tu experiencia laboral, estudios y por que te gustaria trabajar con nosotros..."
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', color: '#1e293b', background: '#fff', resize: 'vertical', minHeight: 100, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Adjuntar CV (opcional)</label>
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.png"
                    style={{ width: '100%', padding: 8, border: '1px dashed #cbd5e1', borderRadius: 8, fontSize: '0.9rem', background: '#f8fafc', cursor: 'pointer', boxSizing: 'border-box' }}
                  />
                </div>
                <button type="submit" disabled={enviando}
                  style={{ width: '100%', padding: '12px 24px', background: enviando ? '#94a3b8' : '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.95rem', fontWeight: 600, cursor: enviando ? 'not-allowed' : 'pointer' }}
                >
                  {enviando ? 'Enviando...' : 'Enviar postulacion'}
                </button>
                <p style={{ textAlign: 'center', marginTop: 12, fontSize: '0.8rem', color: '#94a3b8' }}>
                  Tus datos seran tratados con confidencialidad conforme a nuestra politica de privacidad.
                </p>
              </form>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 32, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, color: '#166534' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>Postulacion recibida</h3>
              <p style={{ fontSize: '0.9rem', color: '#15803d' }}>
                Gracias por interesarte en formar parte de Supermercados Luxor. Te contactaremos a la brevedad si tu perfil se ajusta a nuestras necesidades.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#1e293b', color: '#94a3b8', textAlign: 'center', padding: '24px 0', fontSize: '0.82rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>
          <p>&copy; 2026 <strong style={{ color: '#e2e8f0' }}>Supermercados Luxor</strong>. Todos los derechos reservados.</p>
          <p style={{ marginTop: 4 }}>Formulario de postulacion laboral &mdash; Recursos Humanos</p>
        </div>
      </div>
    </div>
  )
}
