import { FaGear, FaTrophy, FaHeart } from 'react-icons/fa6'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'

const NAVY = '#001A4A'
const YELLOW = '#FFD700'
const GREEN = '#00A651'
const CORAL = '#FF5252'
const LIGHT_GRAY = '#F0F0F0'

const TIENDAS = [
  { nombre: 'Luxor IPSFA', dir: 'Av. Principal, Urb. Las Mercedes', hora: '8:00 AM - 9:00 PM' },
  { nombre: 'Luxor Centro', dir: 'Calle 5, Zona Central', hora: '7:00 AM - 10:00 PM' },
  { nombre: 'EuroMax Este', dir: 'Av. Oriental, CC Plaza', hora: '8:00 AM - 9:00 PM' },
  { nombre: 'EuroMax Oeste', dir: 'Av. Occidental, Sector 3', hora: '8:00 AM - 8:00 PM' },
  { nombre: 'Luxor Express', dir: 'Av. Principal, Local 12', hora: '7:00 AM - 11:00 PM' },
]

const MARCAS = ['Solera', 'Mary', 'Excelcior', 'Pampero', 'Tio Rico', 'Agua del Norte', 'Polar', 'Empresas Polar']
const BRAND_COLORS = ['#c41430','#2563eb','#0d5e2e','#f59e0b','#db2777','#7c3aed','#0891b2','#16a34a','#e63950','#1a3a6b','#b8860b','#475569','#be123c','#0369a1','#854d0e','#4f46e5']

export function Landing() {
  const [bgIdx, setBgIdx] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prodScrollRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalItem, setModalItem] = useState<{ titulo: string; texto: string; color: string; Icon: React.ComponentType<{ size?: number; color?: string }> } | null>(null)
  const [rates, setRates] = useState<{ usd: number; eur: number } | null>(null)
  const [showValidator, setShowValidator] = useState(false)
  const [valCedula, setValCedula] = useState('')
  const [valResult, setValResult] = useState<{ nombres: string; apellidos: string; cedula: string; posibles_cargos: string; ubicacion: string; estado: string } | null>(null)
  const [valLoading, setValLoading] = useState(false)
  const [valError, setValError] = useState('')
  const [footerOpen, setFooterOpen] = useState<string[]>([])
  useEffect(() => {
    fetch('https://ve.dolarapi.com/v1/dolares/oficial')
      .then(r => r.json())
      .then(d => setRates(prev => ({ usd: d.promedio, eur: prev?.eur ?? 0 })))
      .catch(() => {})
    fetch('https://ve.dolarapi.com/v1/divisas/eur')
      .then(r => r.json())
      .then(d => setRates(prev => ({ usd: prev?.usd ?? 0, eur: d.promedio })))
      .catch(() => {})
  }, [])
  async function validarTrabajador() {
    const q = valCedula.trim()
    if (!q) return
    setValLoading(true); setValError(''); setValResult(null)
    const { data } = await supabase
      .from('rrhh_candidatos')
      .select('nombres, apellidos, cedula, posibles_cargos, ubicacion, estado')
      .eq('cedula', q)
      .maybeSingle()
    if (!data) {
      setValError('No se encontro ningun trabajador con esa cedula.')
    } else {
      setValResult(data)
    }
    setValLoading(false)
  }
  const renderBrand = (m: string, i: number) => (
    <div key={i} style={{
      width: 76, height: 76, borderRadius: '50%',
      background: BRAND_COLORS[i % BRAND_COLORS.length],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden',
      transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
    >
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.2, padding: 3 }}>{m}</span>
    </div>
  )
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const HERO_SLIDES = [
    '#c41430',
    '#001A4A',
    '#0d5e2e',
    '#f59e0b',
    '#7c3aed',
  ]
  useEffect(() => {
    const t = setInterval(() => setBgIdx(i => (i + 1) % HERO_SLIDES.length), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ fontFamily: "'Poppins', 'Segoe UI', system-ui, sans-serif", color: '#1e293b', background: '#FFFFFF', lineHeight: 1.6, minHeight: '100vh' }}>

      {/* ======= TASA BCV — solo desktop ======= */}
      <div className="hidden md:block" style={{ background: '#c41430', color: '#fff', fontSize: '0.78rem', padding: '6px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 24 }}>
          {rates ? (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <strong>BCV USD:</strong> Bs.{rates.usd.toFixed(2)}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <strong>BCV EUR:</strong> Bs.{rates.eur.toFixed(2)}
              </span>
            </>
          ) : (
            <span style={{ fontWeight: 500 }}>Cargando tasas BCV...</span>
          )}
        </div>
      </div>

      {/* ======= HEADER ======= */}
      <header style={{
        background: scrolled ? 'rgba(255,255,255,0.65)' : '#fff',
        backdropFilter: scrolled ? 'blur(24px) saturate(200%)' : 'none',
        color: '#1e293b',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
        transition: 'background 0.3s, backdrop-filter 0.3s, box-shadow 0.3s, border-color 0.3s',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72, gap: 16 }}>
          {/* Logo */}
          <a href="#inicio" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.3s', position: 'relative' }}
            onMouseEnter={e => { const i = e.currentTarget.querySelector('img'); const s = e.currentTarget.querySelector('svg'); if(i) i.style.opacity = '0'; if(s) s.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.08)' }}
            onMouseLeave={e => { const i = e.currentTarget.querySelector('img'); const s = e.currentTarget.querySelector('svg'); if(i) i.style.opacity = '1'; if(s) s.style.opacity = '0'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            <img src="/logo.webp" alt="Luxor" style={{ height: 48, width: 'auto', display: 'block', transition: 'opacity 0.3s' }} />
            <svg width={28} height={28} fill="none" stroke={NAVY} viewBox="0 0 24 24" style={{ position: 'absolute', left: 10, top: '50%', marginTop: -14, opacity: 0, transition: 'opacity 0.3s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </a>

          {/* Nav — oculto en mobile, visible en desktop */}
          <nav className="hidden md:flex" style={{ gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
            {['Ubicaciones', 'Ofertas', 'Carreras', 'Sobre Nosotros'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 500, transition: 'color 0.2s', letterSpacing: 0.3, whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.color = NAVY}
                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
              >{item}</a>
            ))}
          </nav>

          {/* Search */}
          <div style={{ display: 'none', flex: 1, maxWidth: 260, position: 'relative' }} className="lg:block">
            <input placeholder="Buscar productos..."
              style={{ width: '100%', padding: '8px 14px 8px 36px', borderRadius: 20, border: 'none', fontSize: '0.8rem', background: '#f1f5f9', color: '#1e293b', outline: 'none' }}
            />
            <svg style={{ position: 'absolute', left: 10, top: 8, width: 18, height: 18, color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Hamburger — solo mobile */}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: '#1e293b', cursor: 'pointer', alignItems: 'center' }} className="md:hidden flex">
            <svg width={24} height={24} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
          </button>
        </div>

        {/* Mobile menu — overlay */}
        {menuOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', zIndex: 60 }}>
            {['Ubicaciones', 'Ofertas', 'Carreras', 'Sobre Nosotros'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500, padding: '8px 0' }}
                onClick={() => setMenuOpen(false)}
              >{item}</a>
            ))}
          </div>
        )}
      </header>

      {/* ======= HERO ======= */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <section id="inicio" style={{ position: 'relative', minHeight: '38.5vh', padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {HERO_SLIDES.map((color, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            background: color,
            opacity: i === bgIdx ? 1 : 0,
            transition: 'opacity 1.2s ease-in-out',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
          }}>
            <span style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 700, letterSpacing: 2, textAlign: 'center' }}>Tu publicidad va aqui</span>
          </div>
        ))}
      </section>

      {/* ======= VARIEDAD ======= */}
      <section style={{ padding: 0, background: '#fff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: NAVY, textAlign: 'left', marginBottom: 20 }}>Todo lo que buscas en un solo lugar</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 14, alignItems: 'flex-start' }}>
            {[
              { text: 'CARNICERIA', color: '#c41430' },
              { text: 'CHARCUTERIA', color: '#e63950' },
              { text: 'VIVERES', color: '#0d5e2e' },
              { text: 'MASCOTAS', color: '#f59e0b' },
              { text: 'HIGIENE', color: '#0891b2' },
              { text: 'COSMETICOS', color: '#db2777' },
              { text: 'LICORES', color: '#7c3aed' },
              { text: 'BAZAR', color: '#2563eb' },
              { text: 'DEPORTE', color: '#16a34a' },
              { text: 'FERRETERIA', color: '#b8860b' },
              { text: 'AUTOMOTRIZ', color: '#475569' },
              { text: 'HOGAR', color: '#be123c' },
              { text: 'PESCADERIA', color: '#0369a1' },
              { text: 'CAMPING', color: '#854d0e' },
              { text: 'PASTELERIA', color: '#4f46e5' },
              { text: 'PANADERIA', color: '#a16207' },
            ].map(cat => (
              <div key={cat.text} style={{
                background: cat.color, padding: '12px 28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)', width: 'auto',
                transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
              >
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', textAlign: 'center', letterSpacing: 1.5, whiteSpace: 'nowrap' }}>{cat.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= SUPER OFERTAS ======= */}
      <section style={{ padding: '40px 0', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: NAVY, textAlign: 'left' }}>Super Ofertas</h2>
              <p style={{ textAlign: 'left', color: '#64748b', fontSize: '0.9rem', maxWidth: 500 }}>Productos con descuentos increibles — stock limitado</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => {
                const el = prodScrollRef.current
                if (!el) return
                el.scrollBy({ left: -220, behavior: 'smooth' })
              }}
                style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'box-shadow 0.2s', color: NAVY }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
              >
                <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
              </button>
              <button onClick={() => {
                const el = prodScrollRef.current
                if (!el) return
                el.scrollBy({ left: 220, behavior: 'smooth' })
              }}
                style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'box-shadow 0.2s', color: NAVY }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
              >
                <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
          <div ref={prodScrollRef} style={{
            display: 'flex', gap: 20, overflowX: 'auto', scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch', paddingBottom: 8,
          }}
            className="hide-scrollbar"
          >
            {[
              { name: 'Arroz Premium 1kg', img: '🍚', price: 4.50, discount: 3.25, badge: '27% OFF' },
              { name: 'Aceite de Oliva 500ml', img: '🫒', price: 8.00, discount: 5.99, badge: '25% OFF' },
              { name: 'Leche Entera 1L', img: '🥛', price: 2.80, discount: 1.99, badge: '29% OFF' },
              { name: 'Harina de Maiz 1kg', img: '🌽', price: 1.90, discount: 1.35, badge: '29% OFF' },
              { name: 'Atun en Lata 170g', img: '🐟', price: 2.50, discount: 1.75, badge: '30% OFF' },
              { name: 'Pasta Larga 500g', img: '🍝', price: 1.60, discount: 1.10, badge: '31% OFF' },
              { name: 'Cafe Molido 250g', img: '☕', price: 5.00, discount: 3.85, badge: '23% OFF' },
              { name: 'Jabon de Manos 500ml', img: '🧴', price: 3.20, discount: 2.45, badge: '23% OFF' },
              { name: 'Papel Higienico 4rollos', img: '🧻', price: 2.50, discount: 1.85, badge: '26% OFF' },
              { name: 'Galletas Surtidas 200g', img: '🍪', price: 1.80, discount: 1.25, badge: '31% OFF' },
            ].map((p, i) => (
              <div key={i} style={{
                minWidth: 180, maxWidth: 180, background: '#fff', border: '1px solid #e2e8f0',
                flexShrink: 0, transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ background: '#f1f5f9', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 6, left: 6, background: CORAL, color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', letterSpacing: 0.5 }}>{p.badge}</span>
                  {p.img}
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.2 }}>{p.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: CORAL }}>${p.discount.toFixed(2)}</span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', textDecoration: 'line-through' }}>${p.price.toFixed(2)}</span>
                  </div>
                  <button style={{
                    marginTop: 'auto', background: NAVY, color: '#fff', border: 'none',
                    padding: '6px 0', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                    transition: 'background 0.2s', width: '100%', letterSpacing: 0.5,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = GREEN}
                    onMouseLeave={e => e.currentTarget.style.background = NAVY}
                  >VER EN LA APP</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= UBICACIONES ======= */}
      <section id="ubicaciones" style={{ padding: '40px 0', background: '#fff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: NAVY, textAlign: 'left', marginBottom: 8 }}>Nuestras Ubicaciones</h2>
          <p style={{ textAlign: 'left', color: '#64748b', fontSize: '0.9rem', marginBottom: 40, maxWidth: 600 }}>Encuentra la tienda mas cercana y descubre nuestros horarios y servicios</p>

          {/* Store cards — horizontal scroll */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => {
              const el = scrollRef.current
              if (!el) return
              if (el.scrollLeft <= 100) { el.scrollLeft = el.scrollWidth - el.clientWidth; return }
              el.scrollBy({ left: -340, behavior: 'smooth' })
            }}
              style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'box-shadow 0.2s', color: NAVY }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
            >
              <svg width={18} height={18} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div ref={scrollRef} style={{
              display: 'flex', gap: 24, overflowX: 'auto', scrollSnapType: 'x mandatory',
              paddingBottom: 12, scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', flex: 1,
            }}
              className="hide-scrollbar"
            >
            {TIENDAS.map((t, i) => {
              const gradients = [
                'linear-gradient(135deg, #001A4A, #1a3a6b)',
                'linear-gradient(135deg, #c41430, #e63950)',
                'linear-gradient(135deg, #0d5e2e, #1a8a4a)',
                'linear-gradient(135deg, #28315f, #4a5580)',
                'linear-gradient(135deg, #b8860b, #daa520)',
              ]
              return (
                <div key={t.nombre} style={{
                  overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'default',
                  display: 'flex', flexDirection: 'column',
                  scrollSnapAlign: 'start', flexShrink: 0, minWidth: 300,
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)' }}
                >
                  <div style={{
                    height: 160, background: gradients[i % gradients.length],
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.06) 0%, transparent 60%)' }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', textAlign: 'center', position: 'relative', zIndex: 1, letterSpacing: 0.5 }}>{t.nombre}</div>
                  </div>
                  <div style={{ padding: '16px 20px', background: '#fff', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      {t.dir}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: GREEN, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      {t.hora}
                    </div>
                  </div>
                  <div style={{ padding: '0 20px 16px', background: '#fff', display: 'flex', gap: 8 }}>
                    <button style={{ flex: 1, background: CORAL, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 0', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >Pedir Delivery</button>
                    <button style={{ flex: 1, background: '#fff', color: NAVY, border: `1px solid ${NAVY}20`, borderRadius: 10, padding: '8px 0', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Como llegar</button>
                  </div>
                </div>
              )
            })}
          </div>
            <button onClick={() => {
              const el = scrollRef.current
              if (!el) return
              if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 100) el.scrollLeft = 0
              else el.scrollBy({ left: 340, behavior: 'smooth' })
            }}
              style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'box-shadow 0.2s', color: NAVY }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
            >
              <svg width={18} height={18} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </section>

      {/* ======= MARCAS ALIADAS ======= */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track:hover > div { animation-play-state: paused; }
      `}</style>
      <section style={{ background: LIGHT_GRAY, overflow: 'hidden', padding: '8px 0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', fontWeight: 700, color: NAVY, textAlign: 'left', marginBottom: 12, padding: '0 24px' }}>Nuestras Marcas Aliadas</h2>
          <div className="marquee-track" style={{ overflow: 'hidden', width: '100%', padding: '8px 0' }}>
            <div style={{ display: 'flex', width: 'max-content', animation: 'marquee 30s linear infinite' }}>
              <div style={{ display: 'flex', gap: 20 }}>
                {MARCAS.map((m, i) => renderBrand(m, i))}
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {MARCAS.map((m, i) => renderBrand(m, i + MARCAS.length))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= CONOCENOS ======= */}
      <section id="sobre-nosotros" style={{ padding: '64px 0', background: '#fff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: NAVY, textAlign: 'left', marginBottom: 8 }}>Conocenos</h2>
          <p style={{ textAlign: 'left', color: '#64748b', fontSize: '0.9rem', marginBottom: 40, maxWidth: 600 }}>Descubre nuestra historia, mision y el equipo que hace posible Supermercados Luxor</p>

          {/* Image grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 40 }} className="grid-cols-2">
            <div style={{ overflow: 'hidden', height: 280, background: `linear-gradient(135deg, ${NAVY}, #002d6e)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,26,74,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>+15 anos</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>sirviendo a nuestras comunidades</div>
                </div>
              </div>
            </div>
            <div style={{ overflow: 'hidden', height: 280, background: `linear-gradient(135deg, ${GREEN}, ${NAVY})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: '#fff' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>5 sucursales</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>siempre cerca de ti</div>
              </div>
            </div>
          </div>

          {/* Mission / Vision / Values */}
          <div style={{ display: 'grid', gap: 20 }} className="grid-cols-1 md:grid-cols-3">
            {[
              { titulo: 'Mision', texto: 'Ofrecer productos de calidad superior con un servicio cercano, contribuyendo al bienestar de nuestras comunidades y al desarrollo de nuestro equipo.', color: NAVY, Icon: FaGear },
              { titulo: 'Vision', texto: 'Ser la cadena de supermercados lider en Venezuela, reconocida por nuestra innovacion, calidad y compromiso social.', color: GREEN, Icon: FaTrophy },
              { titulo: 'Valores', texto: 'Compromiso, Calidad, Trabajo en equipo, Innovacion, Responsabilidad social y Respeto por nuestros clientes y colaboradores.', color: CORAL, Icon: FaHeart },
            ].map(item => (
              <div key={item.titulo} style={{ background: LIGHT_GRAY, padding: 28, transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'pointer', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                onClick={() => setModalItem(item)}
              >
                <div style={{ background: item.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', width: 38, height: 38, marginRight: 12, float: 'left' }}>
                  <item.Icon size={20} color="#fff" />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: NAVY, marginBottom: 4 }}>{item.titulo}</h3>
                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.7 }}>{item.texto}</p>
              </div>
            ))}
          </div>

          {/* Modal — solo mobile */}
          <div className="md:hidden">
            {modalItem && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                onClick={() => setModalItem(null)}
              >
                <div style={{ background: '#fff', padding: 32, maxWidth: 400, width: '100%', position: 'relative' }}
                  onClick={e => e.stopPropagation()}
                >
                  <button onClick={() => setModalItem(null)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1 }}>
                    <svg width={20} height={20} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                  <div style={{ background: modalItem.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', width: 38, height: 38, marginBottom: 14 }}>
                    <modalItem.Icon size={20} color="#fff" />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: NAVY, marginBottom: 10 }}>{modalItem.titulo}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.7 }}>{modalItem.texto}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ======= CARRERAS ======= */}
      <section id="carreras" style={{
        position: 'relative', background: NAVY, minHeight: '12vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 30% 50%, rgba(255,215,0,0.06) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(255,82,82,0.05) 0%, transparent 50%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '20px 24px', width: '100%' }}
          className="md:flex md:items-center md:justify-between"
        >
          <div className="md:text-left" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 800, color: '#fff', marginBottom: 16, lineHeight: 1.2 }}>
              Estamos buscando<span style={{ color: YELLOW }}> tu talento</span>
            </h2>
            <p style={{ fontSize: '1rem', color: '#CBD5E1', marginBottom: 28, maxWidth: 500, lineHeight: 1.6, margin: '0 auto 28px' }} className="md:mx-0">
              Postulate aca y forma parte de una empresa en crecimiento donde tu trabajo realmente importa.
            </p>
          </div>
          <a href="/sitio/postular"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: CORAL, color: '#fff', padding: '14px 40px', fontSize: '0.95rem', fontWeight: 700, textDecoration: 'none', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 8px 28px rgba(255,82,82,0.4)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(255,82,82,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(255,82,82,0.4)' }}
          >
            Quiero postularme
            <svg width={18} height={18} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14m-4-4l4 4-4 4" /></svg>
          </a>
        </div>
      </section>

      {/* ======= FOOTER ======= */}
      <footer style={{ background: NAVY, color: '#94a3b8', padding: '48px 0 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          {/* Mobile accordion layout */}
          <div className="flex flex-col md:hidden" style={{ gap: 8, marginBottom: 40 }}>
            {/* Brand */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <img src="/lofo-footer.webp" alt="Luxor" style={{ height: 40, width: 'auto', display: 'block' }} />
              </div>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.7, marginBottom: 16 }}>Calidad y confianza para toda la comunidad. Con 5 sucursales y creciendo.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { id: 'facebook', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                  { id: 'instagram', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
                  { id: 'twitter', path: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' },
                  { id: 'whatsapp', path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' },
                ].map(s => (
                  <div key={s.id} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s, transform 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = GREEN; e.currentTarget.style.transform = 'scale(1.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    <svg width={16} height={16} fill="#CBD5E1" viewBox="0 0 24 24" style={{ transition: 'fill 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.fill = '#fff'}
                      onMouseLeave={e => e.currentTarget.style.fill = '#CBD5E1'}
                    ><path d={s.path} /></svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile accordion links */}
            {[
              { titulo: 'Compania', links: ['Sobre nosotros', 'Trabaja con nosotros', 'Prensa', 'Blog'] },
              { titulo: 'Ayuda', links: ['Preguntas frecuentes', 'Politica de devolucion', 'Contacto', 'Validar trabajador'] },
              { titulo: 'Legal', links: ['Terminos y condiciones', 'Privacidad', 'Cookies', 'Libro de reclamaciones'] },
            ].map(col => {
              const isOpen = footerOpen.includes(col.titulo)
              return (
              <div key={col.titulo} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => setFooterOpen(prev => prev.includes(col.titulo) ? prev.filter(t => t !== col.titulo) : [...prev, col.titulo])}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '12px 0', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  {col.titulo}
                  <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  ><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                </button>
                {isOpen && (
                  <div style={{ paddingBottom: 12 }}>
                    {col.links.map(l => (
                      <a key={l} href={l === 'Validar trabajador' ? undefined : '#'}
                        onClick={l === 'Validar trabajador' ? (e) => { e.preventDefault(); setShowValidator(true); setValCedula(''); setValResult(null); setValError('') } : undefined}
                        style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.color = YELLOW}
                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                      >{l}</a>
                    ))}
                  </div>
                )}
              </div>
              )
            })}
          </div>

          {/* Desktop grid layout */}
          <div className="hidden md:grid" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <img src="/lofo-footer.webp" alt="Luxor" style={{ height: 40, width: 'auto', display: 'block' }} />
              </div>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.7, marginBottom: 16 }}>Calidad y confianza para toda la comunidad. Con 5 sucursales y creciendo.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { id: 'facebook', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                  { id: 'instagram', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
                  { id: 'twitter', path: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' },
                  { id: 'whatsapp', path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' },
                ].map(s => (
                  <div key={s.id} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s, transform 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = GREEN; e.currentTarget.style.transform = 'scale(1.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)' }}
                  >
                    <svg width={16} height={16} fill="#CBD5E1" viewBox="0 0 24 24" style={{ transition: 'fill 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.fill = '#fff'}
                      onMouseLeave={e => e.currentTarget.style.fill = '#CBD5E1'}
                    ><path d={s.path} /></svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop static columns */}
            {[
              { titulo: 'Compania', links: ['Sobre nosotros', 'Trabaja con nosotros', 'Prensa', 'Blog'] },
              { titulo: 'Ayuda', links: ['Preguntas frecuentes', 'Politica de devolucion', 'Contacto', 'Validar trabajador'] },
              { titulo: 'Legal', links: ['Terminos y condiciones', 'Privacidad', 'Cookies', 'Libro de reclamaciones'] },
            ].map(col => (
              <div key={col.titulo}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: 16 }}>{col.titulo}</h4>
                {col.links.map(l => (
                  <a key={l} href={l === 'Validar trabajador' ? undefined : '#'}
                    onClick={l === 'Validar trabajador' ? (e) => { e.preventDefault(); setShowValidator(true); setValCedula(''); setValResult(null); setValError('') } : undefined}
                    style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.color = YELLOW}
                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                  >{l}</a>
                ))}
              </div>
            ))}
          </div>

          {/* Contact bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> contacto@luxor.com</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg> +58 412-123-4567</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Av. Principal, Caracas</span>
            </div>
            <div>&copy; 2026 <strong style={{ color: '#e2e8f0' }}>Supermercados Luxor</strong>. Todos los derechos reservados.</div>
          </div>
        </div>
      </footer>

      {/* Validar trabajador modal */}
      {showValidator && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowValidator(false)}
        >
          <div style={{ background: '#fff', padding: 32, maxWidth: 440, width: '100%', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setShowValidator(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1 }}>
              <svg width={20} height={20} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: NAVY, marginBottom: 16 }}>Validar trabajador</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 16 }}>Ingrese la cedula del trabajador para verificar su estatus en la empresa.</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input value={valCedula} onChange={e => setValCedula(e.target.value.toUpperCase())}
                placeholder="V-12345678"
                onKeyDown={e => e.key === 'Enter' && validarTrabajador()}
                style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
              <button onClick={validarTrabajador} disabled={valLoading}
                style={{ background: NAVY, color: '#fff', border: 'none', padding: '10px 20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >{valLoading ? 'Buscando...' : 'Buscar'}</button>
            </div>

            {valError && (
              <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#dc2626', fontSize: '0.82rem', marginBottom: 12 }}>{valError}</div>
            )}

            {valResult && (
              <div style={{ border: '1px solid #e2e8f0' }}>
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: valResult.estado === 'ACTIVO' ? '#16a34a' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: '0 auto 12px',
                  }}>{((valResult.nombres || '')[0] + (valResult.apellidos || '')[0]).toUpperCase()}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: NAVY }}>{valResult.nombres} {valResult.apellidos}</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>{valResult.cedula}</div>
                  <div style={{
                    display: 'inline-block', marginTop: 10, padding: '4px 14px', fontSize: '0.75rem', fontWeight: 700,
                    background: valResult.estado === 'ACTIVO' ? '#f0fdf4' : '#fef2f2',
                    color: valResult.estado === 'ACTIVO' ? '#16a34a' : '#dc2626',
                  }}>{valResult.estado === 'ACTIVO' ? 'TRABAJADOR ACTIVO' : 'INACTIVO'}</div>
                </div>
                {(valResult.posibles_cargos || valResult.ubicacion) && (
                  <div style={{ borderTop: '1px solid #e2e8f0', padding: 16, display: 'grid', gap: 10 }}>
                    {valResult.posibles_cargos && (
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>CARGO</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{valResult.posibles_cargos}</span>
                      </div>
                    )}
                    {valResult.ubicacion && (
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>UBICACION</span>
                        <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>{valResult.ubicacion}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
