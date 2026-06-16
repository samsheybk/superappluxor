import { useState, useRef, useEffect, type MouseEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

const CHECKLIST_INTERIOR = [
  'ALFOMBRAS', 'RADIO', 'CORNETAS', 'TAPASOL', 'RETROBISOR',
  'CIGARRERA', 'CENICERO', 'MANILLAS', 'RELOJ DIGITAL', 'AIRE ACONDICIONADO',
  'AJUSTES DE ASIENTOS', 'TAPICERIA', 'BATERIA', 'TRANCA PALANCA',
  'TRIANGULO', 'CAUCHO DE REPUESTO', 'GATO MECANICO', 'EXTINTOR',
  'TAPA DE COMBUSTIBLE', 'LIMPIA PARABRISAS', 'ODOMETRO', 'MEDIDOR DE COMBUSTIBLE',
]

const CHECKLIST_LUCES = [
  'FARO IZQUIERDO', 'FARO DERECHO', 'LUZ DE CRUCE IZQ', 'LUZ DE CRUCE DER',
  'LUZ DE PARACHOQUE IZQ', 'LUZ DE PARACHOQUE DER', 'STOP IZQ', 'STOP DER',
  'LUZ DE RETROCESO', 'LUCES DE TECHO', 'LUCES DEL TABLERO',
  'LUZ INTERMITENTE', 'LUZ AUXILIAR IZQ', 'LUZ AUXILIAR DER',
]

const CHECKLIST_LAVADO = [
  'LIMPIEZA INTERIOR', 'LIMPIEZA EXTERIOR', 'LIMPIEZA MOTOR',
]

const CHECKLIST_MECANICO = [
  'BATERIA', 'REFRIGERANTE', 'MAGUERAS SIN FUGAS', 'ACEIOTE DE MOTOR',
  'ACEITE DE TRANSMISION', 'LIGA DE FRENOS', 'CORREA',
  'DISCOS O PASTILLAS', 'AMORTIGUADORES',
]

const CHECKLIST_GROUPS: { id: string; titulo: string; items: readonly string[]; columna: string }[] = [
  { id: 'interior', titulo: 'Interior y accesorios', items: CHECKLIST_INTERIOR, columna: 'checklist_interior' },
  { id: 'luces', titulo: 'Luces', items: CHECKLIST_LUCES, columna: 'checklist_luces' },
  { id: 'lavado', titulo: 'Lavado', items: CHECKLIST_LAVADO, columna: 'checklist_lavado' },
  { id: 'mecanico', titulo: 'Mecanico / Otros', items: CHECKLIST_MECANICO, columna: 'checklist_mecanico' },
]

function initChecklist(items: readonly string[]): Record<string, boolean> {
  const obj: Record<string, boolean> = {}
  for (const item of items) obj[item] = false
  return obj
}

interface Marca {
  x: number
  y: number
  comentario: string
  foto?: string
}

type Seccion = 'danos' | 'checklist'

interface VehiculoDocumento {
  id: string
  tipo: string
  archivo_base64: string | null
  fecha_vencimiento: string | null
}

const DOC_CAMPOS = [
  { key: 'doc_titulo_propiedad', label: 'Titulo de propiedad' },
  { key: 'doc_poliza_seguro', label: 'Poliza de seguro' },
  { key: 'doc_impuestos', label: 'Impuestos' },
  { key: 'doc_carta_autorizacion', label: 'Carta de autorizacion' },
  { key: 'doc_rotec', label: 'ROTC' },
]

function docStatus(doc: VehiculoDocumento): 'ok' | 'vencido' | 'sin_archivo' {
  if (!doc.archivo_base64) return 'sin_archivo'
  if (doc.fecha_vencimiento && new Date(doc.fecha_vencimiento) < new Date()) return 'vencido'
  return 'ok'
}

export function InspeccionVehiculo() {
  const { vehiculoId } = useParams<{ vehiculoId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const imgRef = useRef<HTMLDivElement>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  const [tipoVehiculo, setTipoVehiculo] = useState<'Particular' | 'Carga' | null>(null)
  const [documentos, setDocumentos] = useState<VehiculoDocumento[]>([])
  const [seccion, setSeccion] = useState<Seccion>('danos')
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    ...initChecklist(CHECKLIST_INTERIOR),
    ...initChecklist(CHECKLIST_LUCES),
    ...initChecklist(CHECKLIST_LAVADO),
    ...initChecklist(CHECKLIST_MECANICO),
  })

  useEffect(() => {
    if (!vehiculoId) return
    ;(async () => {
      const [vRes, dRes] = await Promise.all([
        supabase.from('vehiculos').select('tipo').eq('id', vehiculoId).single(),
        supabase.from('vehiculo_documentos').select('*').eq('vehiculo_id', vehiculoId),
      ])
      if (vRes.data) setTipoVehiculo(vRes.data.tipo)
      if (dRes.data) setDocumentos(dRes.data)
    })()
  }, [vehiculoId])

  const imgSrc = tipoVehiculo === 'Carga' ? '/camion.webp' : '/vehiculo.webp'

  function handleImgClick(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const nova: Marca = { x, y, comentario: '' }
    const idx = marcas.length
    setMarcas([...marcas, nova])
    setSelectedIdx(idx)
    setComentario('')
  }

  function handleGuardarComentario() {
    if (selectedIdx === null) return
    const copy = [...marcas]
    copy[selectedIdx] = { ...copy[selectedIdx], comentario }
    setMarcas(copy)
    setSelectedIdx(null)
    setComentario('')
  }

  function eliminarMarca(idx: number) {
    const copy = marcas.filter((_, i) => i !== idx)
    setMarcas(copy)
    if (selectedIdx === idx) { setSelectedIdx(null); setComentario('') }
  }

  function handleFoto(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const copy = [...marcas]
      copy[idx] = { ...copy[idx], foto: reader.result as string }
      setMarcas(copy)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function guardarInspeccion() {
    if (!user || !vehiculoId) return
    setGuardando(true)
    const { error } = await supabase.from('taller_inspecciones').insert({
      vehiculo_id: vehiculoId,
      evaluador_id: user.id,
      danos: marcas,
      observaciones: '',
      checklist_interior: CHECKLIST_INTERIOR.filter((k) => checklist[k]).sort(),
      checklist_luces: CHECKLIST_LUCES.filter((k) => checklist[k]).sort(),
      checklist_lavado: CHECKLIST_LAVADO.filter((k) => checklist[k]).sort(),
      checklist_mecanico: CHECKLIST_MECANICO.filter((k) => checklist[k]).sort(),
    }).select('id')

    setGuardando(false)
    if (error) { console.error(error); return }

    navigate(`/taller/vehiculo/${vehiculoId}`)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Operaciones</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Taller automotriz</span>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Evaluacion del vehiculo</h1>
        <Link to={`/taller/vehiculo/${vehiculoId}`} className="text-sm text-blue-600 hover:underline">Cancelar</Link>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
        {([{ key: 'danos', label: 'Daños' }, { key: 'checklist', label: 'Check List' }] as const).map((s) => (
          <button key={s.key} onClick={() => setSeccion(s.key)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              seccion === s.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {seccion === 'danos' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Toca la imagen para marcar un daño</p>
          <div className="relative" ref={imgRef}>
            <img src={imgSrc} alt="Vehiculo"
              className="w-full cursor-crosshair rounded-xl border border-slate-200 select-none"
              draggable={false} onClick={handleImgClick}
            />
            {marcas.map((m, i) => (
              <div key={i}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center"
                style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                onClick={(e) => { e.stopPropagation(); setSelectedIdx(i); setComentario(m.comentario) }}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow-lg">
                  {i + 1}
                </span>
                {m.comentario && (
                  <span className="mt-0.5 max-w-[120px] truncate rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-slate-700 shadow">
                    {m.comentario}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-500">
              {marcas.length === 0
                ? 'Aun no has marcado daños'
                : `${marcas.length} daño${marcas.length > 1 ? 's' : ''} marcado${marcas.length > 1 ? 's' : ''}`
              }
            </p>

            {marcas.map((m, i) => (
              <div key={i}
                className={`rounded-lg border p-3 text-sm transition-colors ${selectedIdx === i ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-red-600">Daño #{i + 1}</span>
                  <button onClick={() => eliminarMarca(i)} className="text-xs text-slate-400 hover:text-red-600">Eliminar</button>
                </div>
                <textarea value={selectedIdx === i ? comentario : m.comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Describe el daño..."
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  rows={2}
                  onFocus={() => { setSelectedIdx(i); setComentario(m.comentario) }}
                />
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => { setSelectedIdx(i); fotoInputRef.current?.click() }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {m.foto ? 'Cambiar foto' : 'Agregar foto'}
                  </button>
                  {m.foto && (
                    <div className="relative inline-block">
                      <img src={m.foto} alt="Daño" className="h-12 w-16 rounded border border-slate-200 object-cover" />
                      <button onClick={() => {
                        const copy = [...marcas]; copy[i] = { ...copy[i], foto: undefined }; setMarcas(copy)
                      }}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                {selectedIdx === i && (
                  <button onClick={handleGuardarComentario}
                    className="mt-2 w-full rounded-lg bg-blue-600 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Guardar comentario
                  </button>
                )}
              </div>
            ))}

            <input ref={fotoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { if (selectedIdx !== null) handleFoto(selectedIdx, e) }} />
          </div>
        </div>
      )}

      {seccion === 'checklist' && (
        <div className="space-y-3">
          {CHECKLIST_GROUPS.map((group) => (
            <details key={group.id} className="rounded-lg border border-slate-200 open:border-purple-300">
              <summary className="cursor-pointer rounded-lg bg-purple-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-purple-100">
                {group.titulo}
              </summary>
              <div className="space-y-1.5 p-4">
                {group.items.map((item) => (
                  <label key={item} className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!checklist[item]}
                      onChange={(e) => setChecklist({ ...checklist, [item]: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-slate-700">{item}</span>
                  </label>
                ))}
              </div>
            </details>
          ))}

          <details className="rounded-lg border border-slate-200 open:border-blue-300">
            <summary className="cursor-pointer rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-100">
              Documentos
            </summary>
            <div className="space-y-2 p-4">
              {DOC_CAMPOS.map((doc) => {
                const d = documentos.find((x) => x.tipo === doc.key)
                const st = d ? docStatus(d) : 'sin_archivo'
                const color = st === 'ok' ? 'bg-green-100 text-green-700' : st === 'vencido' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                const label = st === 'ok' ? 'Vigente' : st === 'vencido' ? 'Vencido' : 'Sin archivo'
                return (
                  <div key={doc.key} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{doc.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>
                  </div>
                )
              })}
            </div>
          </details>
        </div>
      )}

      <div className="mt-6">
        <button onClick={guardarInspeccion} disabled={guardando}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
        >
          {guardando ? 'Guardando...' : 'Guardar inspeccion'}
        </button>
      </div>
    </div>
  )
}
