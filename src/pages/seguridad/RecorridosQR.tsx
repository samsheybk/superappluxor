import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { Html5Qrcode } from 'html5-qrcode'
import QRCode from 'qrcode'

interface Area {
  id: string
  nombre: string
  token: string
  created_at: string
}

interface Registro {
  id: string
  area_token: string
  registro_time: string
  novedad: string | null
  creado_por: string
  created_at: string
}

type ScanState = 'scanning' | 'valid' | 'invalid'

export function RecorridosQR() {
  const { user, perfil } = useAuth()
  const esAdmin = perfil?.rol === 'admin'

  const [tab, setTab] = useState<'recorrido' | 'areas'>('recorrido')

  const [areas, setAreas] = useState<Area[]>([])
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')

  const [nuevaArea, setNuevaArea] = useState('')
  const [novedad, setNovedad] = useState('')
  const [showNovedad, setShowNovedad] = useState(false)
  const [showNovedadBtn, setShowNovedadBtn] = useState(false)
  const [ultimoRegistroId, setUltimoRegistroId] = useState<string | null>(null)
  const [areaValida, setAreaValida] = useState<string | null>(null)

  const [scanState, setScanState] = useState<ScanState>('scanning')
  const [qrCanvas, setQrCanvas] = useState<{ nombre: string; token: string } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const readerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cargarAreas()
    cargarRegistros()
    return () => { detenerCamara() }
  }, [])

  useEffect(() => {
    if (tab === 'recorrido') {
      setScanState('scanning')
      setTimeout(() => iniciarCamara(), 300)
    } else {
      detenerCamara()
    }
  }, [tab])

  async function iniciarCamara() {
    detenerCamara()
    if (!readerRef.current) return
    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScan,
        () => {}
      )
    } catch {
      setError('No se pudo acceder a la camara')
    }
  }

  function detenerCamara() {
    if (scannerRef.current) {
      try { scannerRef.current.stop() } catch {}
      try { scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
  }

  function handleScan(decodedText: string) {
    const token = decodedText.trim().toUpperCase()
    const area = areas.find(a => a.token === token)
    if (area) {
      detenerCamara()
      setAreaValida(area.nombre)
      setScanState('valid')
      registrarEscaner(token)
    } else {
      setScanState('invalid')
      setTimeout(() => setScanState('scanning'), 1500)
    }
  }

  async function registrarEscaner(token: string) {
    if (!user) return
    const { data } = await supabase.from('recorridos_qr_registros').insert({
      area_token: token,
      creado_por: user.id,
    }).select().single()

    if (data) {
      setUltimoRegistroId(data.id)
      setShowNovedadBtn(true)
    }
    await cargarRegistros()
  }

  function escanearOtro() {
    setScanState('scanning')
    setAreaValida(null)
    setShowNovedadBtn(false)
    setUltimoRegistroId(null)
    setNovedad('')
    setShowNovedad(false)
    setTimeout(() => iniciarCamara(), 300)
  }

  function abrirNovedad() {
    setShowNovedad(true)
  }

  async function guardarNovedad() {
    if (!novedad.trim() || !ultimoRegistroId) return
    await supabase.from('recorridos_qr_registros').update({ novedad: novedad.trim() }).eq('id', ultimoRegistroId)
    setMensaje('Novedad reportada')
    setShowNovedad(false)
    setNovedad('')
    escanearOtro()
  }

  async function cargarAreas() {
    const { data } = await supabase.from('recorridos_qr_areas').select('*').order('nombre')
    if (data) setAreas(data)
  }

  async function cargarRegistros() {
    setLoading(true)
    const { data } = await supabase.from('recorridos_qr_registros').select('*').order('registro_time', { ascending: false })
    if (data) setRegistros(data)
    setLoading(false)
  }

  function generarToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  async function agregarArea() {
    const nombre = nuevaArea.trim()
    if (!nombre) return
    const token = generarToken()
    const { error: err } = await supabase.from('recorridos_qr_areas').insert({ nombre, token })
    if (err) { setError(err.message); return }
    setNuevaArea('')
    setQrCanvas({ nombre, token })
    setTimeout(() => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, token, { width: 200, margin: 2 })
      }
    }, 100)
    await cargarAreas()
  }

  async function eliminarArea(id: string) {
    await supabase.from('recorridos_qr_areas').delete().eq('id', id)
    setAreas(prev => prev.filter(a => a.id !== id))
  }

  function getAreaName(token: string): string {
    return areas.find(a => a.token === token)?.nombre ?? token
  }

  useEffect(() => {
    if (mensaje) { const t = setTimeout(() => setMensaje(''), 3000); return () => clearTimeout(t) }
  }, [mensaje])

  return (
    <div>
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Seguridad</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Recorridos QR</span>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {mensaje && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{mensaje}</div>}

      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('recorrido')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'recorrido' ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
        >
          Recorrido
        </button>
        <button onClick={() => setTab('areas')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'areas' ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
        >
          Areas
        </button>
      </div>

      {tab === 'recorrido' && (
        <div className="space-y-4">
          <div className="relative mx-auto max-w-md overflow-hidden rounded-xl bg-black">
            {scanState === 'scanning' && (
              <div id="qr-reader" ref={readerRef} className="[&_video]:rounded-xl [&_video]:!object-cover" />
            )}

            {scanState === 'invalid' && (
              <div className="relative flex h-64 items-center justify-center">
                <div id="qr-reader" className="opacity-40 [&_video]:rounded-xl [&_video]:!object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-center">
                    <svg className="mx-auto mb-2 h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <p className="text-lg font-bold text-white">Codigo no valido</p>
                  </div>
                </div>
              </div>
            )}

            {scanState === 'valid' && (
              <div className="flex h-64 items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600">
                <div className="text-center text-white">
                  <svg className="mx-auto mb-3 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mb-1 text-xl font-bold">Registrado</p>
                  <p className="text-sm text-green-100">{areaValida}</p>
                </div>
              </div>
            )}
          </div>

          {scanState === 'valid' && (
            <div className="flex gap-2">
              {showNovedadBtn && !showNovedad && (
                <button onClick={abrirNovedad}
                  className="flex-1 rounded-lg bg-amber-600 px-4 py-3 text-sm font-medium text-white hover:bg-amber-700"
                >
                  Reportar incidencia
                </button>
              )}
              <button onClick={escanearOtro}
                className={`rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 ${showNovedadBtn && !showNovedad ? 'flex-1' : 'w-full'}`}
              >
                Escanear otro codigo
              </button>
            </div>
          )}

          {showNovedad && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="mb-2 text-sm font-bold text-amber-700">Reportar incidencia</h4>
              <textarea value={novedad} onChange={(e) => setNovedad(e.target.value)}
                rows={2} placeholder="Describe la incidencia..."
                className="mb-2 w-full rounded-lg border border-amber-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button onClick={guardarNovedad} disabled={!novedad.trim()}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Guardar
                </button>
                <button onClick={() => { setShowNovedad(false); escanearOtro() }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="relative overflow-x-auto rounded-xl bg-white shadow-sm">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <span className="text-sm text-slate-500">Cargando...</span>
                </div>
              </div>
            )}
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="p-3 font-medium">Area</th>
                  <th className="p-3 font-medium">Hora</th>
                  <th className="p-3 font-medium">Incidencia</th>
                </tr>
              </thead>
              <tbody>
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400">Sin registros</td>
                  </tr>
                ) : registros.slice(0, 50).map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="p-3 font-medium text-slate-800">{getAreaName(r.area_token)}</td>
                    <td className="p-3 text-slate-500">
                      {new Date(r.registro_time).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 text-slate-600">
                      {r.novedad ? (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {r.novedad}
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'areas' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-600">Agregar area</h3>
            <div className="flex gap-2">
              <input value={nuevaArea} onChange={(e) => setNuevaArea(e.target.value)}
                placeholder="Nombre del area"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button onClick={agregarArea} disabled={!nuevaArea.trim()}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                + Agregar
              </button>
            </div>
            {qrCanvas && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="mb-2 text-sm font-medium text-slate-600">{qrCanvas.nombre}</p>
                <canvas ref={canvasRef} className="mx-auto rounded" />
                <p className="mt-2 text-xs text-slate-400">QR generado para impresion</p>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="p-3 font-medium">Area</th>
                  <th className="p-3 font-medium">QR</th>
                  {esAdmin && <th className="p-3 font-medium">Accion</th>}
                </tr>
              </thead>
              <tbody>
                {areas.length === 0 ? (
                  <tr>
                    <td colSpan={esAdmin ? 3 : 2} className="p-8 text-center text-slate-400">Sin areas registradas</td>
                  </tr>
                ) : areas.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="p-3 font-medium text-slate-800">{a.nombre}</td>
                    <td className="p-3">
                      <QRCodeImg token={a.token} />
                    </td>
                    {esAdmin && (
                      <td className="p-3">
                        <button onClick={() => eliminarArea(a.id)} className="text-xs text-red-600 hover:underline">Eliminar</button>
                      </td>
                    )}
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

function QRCodeImg({ token }: { token: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    QRCode.toDataURL(token, { width: 80, margin: 1 }).then(setUrl)
  }, [token])
  if (!url) return <span className="text-xs text-slate-400">Generando...</span>
  return <img src={url} alt="QR" className="h-10 w-10 rounded" />
}
