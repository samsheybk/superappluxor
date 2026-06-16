import { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { IconAgregar, IconEditar, IconEliminar } from '../../components/Icons'
import { SignaturePad } from '../../components/SignaturePad'
import QRCode from 'qrcode'
import { LoadingScreen } from '../../components/LoadingScreen'
import { generarPDFTaller } from '../../utils/generarPDFTaller'
import { generarPDFResumenTaller } from '../../utils/generarPDFResumenTaller'

type Tab = 'vehiculos' | 'inspeccion' | 'mantenimiento'

interface Vehiculo {
  id: string
  placa: string
  marca: string
  modelo: string
  anio: number
  color: string
  tipo: 'Particular' | 'Carga'
  activo: boolean
}

interface TallerInspeccion {
  id: string
  vehiculo_id: string
  evaluador_id: string
  fecha_inicio: string
  fecha_cierre: string | null
  [campo: string]: any
  observaciones: string
  firma: string | null
  pdf_base64?: string | null
  created_at: string
}

interface TallerMantenimiento {
  id: string
  vehiculo_id: string
  mecanico_id: string
  tipo: string
  descripcion: string
  costo: number
  observaciones: string
  created_at: string
}

const TIPOS_MANTENIMIENTO = ['Cambio de aceite', 'Reparacion', 'Revision general', 'Otro'] as const

const DOCS_PARTICULAR = [
  { key: 'doc_titulo_propiedad', label: 'Título de Propiedad / Carnet de Circulación' },
  { key: 'doc_poliza_seguro', label: 'Póliza de Seguro R.C.V. vigente' },
  { key: 'doc_impuestos', label: 'Impuestos vehiculares al día' },
  { key: 'doc_carta_autorizacion', label: 'Carta de Autorización de la Empresa' },
] as const

const DOCS_CARGA = [
  ...DOCS_PARTICULAR,
  { key: 'doc_rotec', label: 'ROTC / Permiso de transporte de carga' },
] as const

const DOC_LABELS: Record<string, string> = {}
for (const d of DOCS_CARGA) DOC_LABELS[d.key] = d.label

const DOCS_POR_TIPO: Record<string, readonly { key: string; label: string }[]> = {
  Particular: DOCS_PARTICULAR,
  Carga: DOCS_CARGA,
}

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

function VehiculoModal({ vehiculo, onClose, onSave }: {
  vehiculo: Partial<Vehiculo> | null
  onClose: () => void
  onSave: (v: Partial<Vehiculo>) => Promise<string | undefined>
}) {
  const [form, setForm] = useState({
    placa: vehiculo?.placa ?? '',
    marca: vehiculo?.marca ?? '',
    modelo: vehiculo?.modelo ?? '',
    anio: vehiculo?.anio ?? new Date().getFullYear(),
    color: vehiculo?.color ?? '',
    tipo: vehiculo?.tipo ?? 'Particular',
  })
  const [docs, setDocs] = useState<Record<string, File | null>>({})
  const [fechasVenc, setFechasVenc] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const docsRequeridos = form.tipo === 'Carga' ? DOCS_CARGA : DOCS_PARTICULAR
  const esNuevo = !vehiculo?.id

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (esNuevo) {
      for (const doc of docsRequeridos) {
        if (!docs[doc.key]) {
          setError(`Debe cargar: ${doc.label}`)
          return
        }
        if (doc.key !== 'doc_titulo_propiedad' && !fechasVenc[doc.key]) {
          setError(`Debe indicar la fecha de vencimiento de: ${doc.label}`)
          return
        }
      }
    }

    setGuardando(true)
    try {
      const vehicleId = await onSave({ ...form, id: vehiculo?.id })
      if (!vehicleId) return

      if (esNuevo) {
        for (const doc of docsRequeridos) {
          const file = docs[doc.key]
          if (!file) continue
          const b64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
          const { error: err } = await supabase.from('vehiculo_documentos').insert({
            vehiculo_id: vehicleId,
            tipo: doc.key,
            archivo_base64: b64,
            fecha_vencimiento: fechasVenc[doc.key] ?? null,
          })
          if (err) throw err
        }
      }

      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 className="mb-4 text-lg font-semibold text-slate-800">
          {vehiculo?.id ? 'Editar vehículo' : 'Agregar vehículo'}
        </h3>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Placa *</label>
            <input type="text" required value={form.placa}
              onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              placeholder="ABC-123"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Marca *</label>
              <input type="text" required value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Modelo *</label>
              <input type="text" required value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Año *</label>
              <input type="number" required value={form.anio}
                onChange={(e) => setForm({ ...form, anio: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                min={1990} max={new Date().getFullYear() + 1}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Color *</label>
              <input type="text" required value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo *</label>
            <select value={form.tipo}
              onChange={(e) => { setForm({ ...form, tipo: e.target.value as 'Particular' | 'Carga' }); setDocs({}) }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            >
              <option value="Particular">Particular (Uso Administrativo / Gerencial)</option>
              <option value="Carga">Carga (Operativo / Distribución)</option>
            </select>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-bold text-slate-600">
              {esNuevo ? 'Documentos obligatorios' : 'Documentos'}
            </h4>
            <div className="space-y-3">
              {docsRequeridos.map((doc) => (
                <div key={doc.key}>
                  <label className="mb-1 block text-sm text-slate-700">
                    {doc.label} {esNuevo && <span className="text-red-500">*</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-blue-400">
                      {docs[doc.key] ? docs[doc.key]!.name : 'Seleccionar archivo'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null
                          setDocs({ ...docs, [doc.key]: file })
                        }}
                      />
                    </label>
                    {docs[doc.key] && (
                      <button type="button" onClick={() => {
                        const copy = { ...docs }; delete copy[doc.key]; setDocs(copy)
                      }}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  {doc.key !== 'doc_titulo_propiedad' && (
                    <input type="date" required={esNuevo}
                      value={fechasVenc[doc.key] ?? ''}
                      onChange={(e) => setFechasVenc({ ...fechasVenc, [doc.key]: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {guardando
                ? 'Guardando...'
                : esNuevo
                  ? 'Agregar vehículo'
                  : 'Guardar cambios'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type FormDocs = Record<string, boolean>
const INIT_INSPECCION: Record<string, string> = { observaciones: '' }

const DOC_INIT: FormDocs = {}
for (const d of DOCS_CARGA) DOC_INIT[d.key] = false

type FormChecklist = Record<string, boolean>

const CHECKLIST_GROUPS: { id: string; titulo: string; items: readonly string[]; columna: string }[] = [
  { id: 'interior', titulo: 'Interior y accesorios', items: CHECKLIST_INTERIOR, columna: 'checklist_interior' },
  { id: 'luces', titulo: 'Luces', items: CHECKLIST_LUCES, columna: 'checklist_luces' },
  { id: 'lavado', titulo: 'Lavado', items: CHECKLIST_LAVADO, columna: 'checklist_lavado' },
  { id: 'mecanico', titulo: 'Mecanico / Otros', items: CHECKLIST_MECANICO, columna: 'checklist_mecanico' },
]

function makeChecklistInit(items: readonly string[]): Record<string, boolean> {
  const obj: Record<string, boolean> = {}
  for (const item of items) obj[item] = false
  return obj
}

const INIT_CHECKLIST_INTERIOR = makeChecklistInit(CHECKLIST_INTERIOR)
const INIT_CHECKLIST_LUCES = makeChecklistInit(CHECKLIST_LUCES)
const INIT_CHECKLIST_LAVADO = makeChecklistInit(CHECKLIST_LAVADO)
const INIT_CHECKLIST_MECANICO = makeChecklistInit(CHECKLIST_MECANICO)

export function TallerAutomotriz() {
  const { user, perfil } = useAuth()
  const location = useLocation()
  const stateInicial = (location.state as { tab?: Tab; vehiculoId?: string }) ?? {}
  const [tab, setTab] = useState<Tab>(stateInicial.tab ?? 'vehiculos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [vehiculoModal, setVehiculoModal] = useState<Partial<Vehiculo> | null>(null)

  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<string>(stateInicial.vehiculoId ?? '')
  const [vehiculoTipo, setVehiculoTipo] = useState<'Particular' | 'Carga'>('Particular')
  const [inspecciones, setInspecciones] = useState<TallerInspeccion[]>([])
  const [formInspeccion, setFormInspeccion] = useState<Record<string, string>>({ ...INIT_INSPECCION })
  const [formDocs, setFormDocs] = useState<FormDocs>({ ...DOC_INIT })
  const [formChecklist, setFormChecklist] = useState<FormChecklist>({ ...INIT_CHECKLIST_INTERIOR, ...INIT_CHECKLIST_LUCES, ...INIT_CHECKLIST_LAVADO, ...INIT_CHECKLIST_MECANICO })
  const [firma, setFirma] = useState<string | null>(null)
  const [guardandoInspeccion, setGuardandoInspeccion] = useState(false)

  const [mantenimientos, setMantenimientos] = useState<TallerMantenimiento[]>([])
  const [formMantenimiento, setFormMantenimiento] = useState({
    tipo: 'Cambio de aceite', descripcion: '', costo: 0, observaciones: '',
  })
  const [guardandoMantenimiento, setGuardandoMantenimiento] = useState(false)

  const [guardandoPDF, setGuardandoPDF] = useState(false)
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false)
  const [inspeccionExpandida, setInspeccionExpandida] = useState<string | null>(null)
  const [qrVehiculo, setQrVehiculo] = useState<Vehiculo | null>(null)

  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [generandoResumen, setGenerandoResumen] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [vehRes, insRes] = await Promise.all([
          supabase.from('vehiculos').select('*').order('placa'),
          supabase.from('taller_inspecciones').select('id, vehiculo_id, evaluador_id, fecha_inicio, fecha_cierre, observaciones, firma, danos, checklist_interior, checklist_luces, checklist_lavado, checklist_mecanico, created_at').order('created_at', { ascending: false }),
        ])
        if (vehRes.error) throw vehRes.error
        if (insRes.error) throw insRes.error
        setVehiculos(vehRes.data ?? [])
        setInspecciones(insRes.data ?? [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!vehiculoSeleccionado) {
      setMantenimientos([])
      return
    }
    setVehiculoTipo(vehiculos.find((x) => x.id === vehiculoSeleccionado)?.tipo ?? 'Particular')
    ;(async () => {
      const { data } = await supabase.from('taller_mantenimientos').select('*')
        .eq('vehiculo_id', vehiculoSeleccionado)
        .order('created_at', { ascending: false })
      if (data) setMantenimientos(data)
    })()
  }, [vehiculoSeleccionado, vehiculos])

  const insFiltradas = inspecciones.filter((i) => {
    if (vehiculoSeleccionado && i.vehiculo_id !== vehiculoSeleccionado) return false
    if (fechaDesde && i.created_at < `${fechaDesde}T00:00:00`) return false
    if (fechaHasta && i.created_at > `${fechaHasta}T23:59:59`) return false
    return true
  })

  async function guardarVehiculo(v: Partial<Vehiculo>): Promise<string | undefined> {
    const payload: Record<string, any> = {
      placa: v.placa, marca: v.marca, modelo: v.modelo,
      anio: v.anio, color: v.color, tipo: v.tipo,
    }
    let id = v.id
    if (v.id) {
      const { error } = await supabase.from('vehiculos').update(payload).eq('id', v.id)
      if (error) throw error
    } else {
      const { data, error } = await supabase.from('vehiculos').insert(payload).select('id').single()
      if (error) throw error
      id = data.id
    }
    const { data } = await supabase.from('vehiculos').select('*').order('placa')
    setVehiculos(data ?? [])
    return id
  }

  async function desactivarVehiculo(id: string) {
    await supabase.from('vehiculos').update({ activo: false }).eq('id', id)
    setVehiculos(vehiculos.map((v) => v.id === id ? { ...v, activo: false } : v))
  }

  const [eliminandoInspeccion, setEliminandoInspeccion] = useState<string | null>(null)

  async function eliminarInspeccion(id: string) {
    setEliminandoInspeccion(null)
    const { error } = await supabase.from('taller_inspecciones').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setInspecciones(inspecciones.filter((i) => i.id !== id))
  }

  async function guardarInspeccion() {
    if (!vehiculoSeleccionado || !user) return
    setGuardandoInspeccion(true)
    setGuardandoPDF(true)
    try {
      const v = vehiculos.find((x) => x.id === vehiculoSeleccionado)!
      const perfilRes = await supabase.from('perfiles').select('nombre').eq('id', user.id).single()
      const evaluadorNombre = perfilRes.data?.nombre ?? user.email ?? ''

      const docs = DOCS_POR_TIPO[vehiculoTipo].map((d) => ({
        label: d.label,
        presente: formDocs[d.key],
      }))

      const pdfDataUrl = await generarPDFTaller({
        placa: v.placa,
        marca: v.marca,
        modelo: v.modelo,
        anio: v.anio,
        color: v.color,
        tipo: v.tipo,
        fechaInicio: new Date().toLocaleDateString('es-VE', {
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
        evaluadorNombre,
        categorias: [],
        docs,
        observaciones: formInspeccion.observaciones,
        firma,
      })

      const payload: Record<string, any> = {
        vehiculo_id: vehiculoSeleccionado, evaluador_id: user.id,
        observaciones: formInspeccion.observaciones, ...formDocs, firma, pdf_base64: pdfDataUrl,
        checklist_interior: CHECKLIST_INTERIOR.filter((k) => formChecklist[k]).sort(),
        checklist_luces: CHECKLIST_LUCES.filter((k) => formChecklist[k]).sort(),
        checklist_lavado: CHECKLIST_LAVADO.filter((k) => formChecklist[k]).sort(),
        checklist_mecanico: CHECKLIST_MECANICO.filter((k) => formChecklist[k]).sort(),
      }
      const { error } = await supabase.from('taller_inspecciones').insert(payload)
      if (error) throw error

      setFormInspeccion({ ...INIT_INSPECCION })
      setFormDocs({ ...DOC_INIT })
      setFormChecklist({ ...INIT_CHECKLIST_INTERIOR, ...INIT_CHECKLIST_LUCES, ...INIT_CHECKLIST_LAVADO, ...INIT_CHECKLIST_MECANICO })
      setFirma(null)
      setMostrandoFormulario(false)
      const { data: recargadas } = await supabase.from('taller_inspecciones')
        .select('id, vehiculo_id, evaluador_id, fecha_inicio, fecha_cierre, observaciones, firma, danos, checklist_interior, checklist_luces, checklist_lavado, checklist_mecanico, created_at')
        .order('created_at', { ascending: false })
      if (recargadas) setInspecciones(recargadas)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGuardandoInspeccion(false)
      setGuardandoPDF(false)
    }
  }

  async function guardarMantenimiento() {
    if (!vehiculoSeleccionado || !user) return
    setGuardandoMantenimiento(true)
    try {
      const { error } = await supabase.from('taller_mantenimientos').insert({
        vehiculo_id: vehiculoSeleccionado, mecanico_id: user.id,
        ...formMantenimiento,
      })
      if (error) throw error
      setFormMantenimiento({ tipo: 'Cambio de aceite', descripcion: '', costo: 0, observaciones: '' })
      const { data } = await supabase.from('taller_mantenimientos').select('*')
        .eq('vehiculo_id', vehiculoSeleccionado)
        .order('created_at', { ascending: false })
      setMantenimientos(data ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGuardandoMantenimiento(false)
    }
  }

  function abrirPDF(pdfBase64: string) {
    const raw = atob(pdfBase64.split(',')[1])
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'application/pdf' })
    window.open(URL.createObjectURL(blob), '_blank')
  }

  async function verPDF(id: string) {
    const { data } = await supabase.from('taller_inspecciones').select('*').eq('id', id).single()
    if (!data) { setError('Inspeccion no encontrada'); return }

    if (data.pdf_base64) {
      abrirPDF(data.pdf_base64)
      return
    }

    try {
      const v = vehiculos.find((x) => x.id === data.vehiculo_id)
      if (!v) { setError('Vehiculo no encontrado'); return }

      const docs = DOCS_POR_TIPO[v.tipo].map((d) => ({
        label: d.label,
        presente: !!(data as any)[d.key],
      }))

      const pdfDataUrl = await generarPDFTaller({
        placa: v.placa, marca: v.marca, modelo: v.modelo, anio: v.anio,
        color: v.color, tipo: v.tipo,
        fechaInicio: new Date(data.created_at).toLocaleDateString('es-VE', {
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
        evaluadorNombre: '',
        categorias: [],
        docs,
        observaciones: data.observaciones ?? '',
        firma: data.firma,
      })

      await supabase.from('taller_inspecciones').update({ pdf_base64: pdfDataUrl }).eq('id', id)
      abrirPDF(pdfDataUrl)
    } catch (e: any) {
      setError('Error al generar PDF: ' + e.message)
    }
  }

  function fmtDate(iso: string) {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  async function generarResumen() {
    setGenerandoResumen(true)
    try {
      const vehMap: Record<string, string> = {}
      for (const v of vehiculos) vehMap[v.id] = v.tipo

      const particulares = insFiltradas.filter((i) => vehMap[i.vehiculo_id] === 'Particular')
      const cargas = insFiltradas.filter((i) => vehMap[i.vehiculo_id] === 'Carga')

      const pdf = generarPDFResumenTaller(
        fechaDesde ? fmtDate(fechaDesde) : '(sin filtro)',
        fechaHasta ? fmtDate(fechaHasta) : '(sin filtro)',
        insFiltradas, particulares, cargas,
      )
      abrirPDF(pdf)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGenerandoResumen(false)
    }
  }

  if (loading) return <LoadingScreen />

  const vehiculosActivos = vehiculos.filter((v) => v.activo)

  return (
    <div>
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Operaciones</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Taller automotriz</span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {([
          { key: 'vehiculos', label: 'Vehículos' },
          { key: 'inspeccion', label: 'Inspección' },
          { key: 'mantenimiento', label: 'Mantenimiento' },
        ] as const).map((t) => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: VEHICULOS */}
      {tab === 'vehiculos' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">{vehiculos.length} vehículo(s) registrados</p>
            <button onClick={() => setVehiculoModal({ tipo: 'Particular' })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <IconAgregar className="h-4 w-4" />
              Agregar vehículo
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="p-3 font-medium">Placa</th>
                  <th className="p-3 font-medium">Marca</th>
                  <th className="p-3 font-medium">Modelo</th>
                  <th className="p-3 font-medium">Año</th>
                  <th className="p-3 font-medium">Color</th>
                  <th className="p-3 font-medium">Tipo</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vehiculos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No hay vehículos registrados
                    </td>
                  </tr>
                ) : vehiculos.map((v) => (
                  <tr key={v.id} className={`border-b border-slate-100 ${!v.activo ? 'opacity-50' : ''}`}>
                    <td className="p-3 font-medium text-slate-800">{v.placa}</td>
                    <td className="p-3 text-slate-600">{v.marca}</td>
                    <td className="p-3 text-slate-600">{v.modelo}</td>
                    <td className="p-3 text-slate-600">{v.anio}</td>
                    <td className="p-3 text-slate-600">{v.color}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        v.tipo === 'Carga' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {v.tipo}
                      </span>
                    </td>
                    <td className="p-3">
                      {v.activo
                        ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Activo</span>
                        : <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Inactivo</span>
                      }
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => setQrVehiculo(v)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                          title="Codigo QR"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </button>
                        <button onClick={() => setVehiculoModal(v)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                          title="Editar"
                        >
                          <IconEditar />
                        </button>
                        {v.activo && (
                          <button onClick={() => desactivarVehiculo(v.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                            title="Deshabilitar"
                          >
                            <IconEliminar />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {vehiculoModal !== null && (
            <VehiculoModal
              vehiculo={vehiculoModal}
              onClose={() => setVehiculoModal(null)}
              onSave={guardarVehiculo}
            />
          )}
        </div>
      )}

      {/* TAB: INSPECCION */}
      {tab === 'inspeccion' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Desde</label>
              <input type="date" value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Hasta</label>
              <input type="date" value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
            <button onClick={() => {
              setVehiculoSeleccionado('')
              setFechaDesde('')
              setFechaHasta('')
            }}
              className="h-[38px] rounded-lg border border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
            <button onClick={generarResumen} disabled={generandoResumen}
              className="inline-flex h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {generandoResumen ? 'Generando...' : 'Generar resumen PDF'}
            </button>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Seleccionar vehículo</label>
              <select value={vehiculoSeleccionado} onChange={(e) => {
                setVehiculoSeleccionado(e.target.value)
                setMostrandoFormulario(false)
                setInspeccionExpandida(null)
              }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              >
                <option value="">-- Todos los vehículos --</option>
                {vehiculosActivos.map((v) => (
                  <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo} ({v.anio})</option>
                ))}
              </select>
            </div>
            {!mostrandoFormulario && (
              <button onClick={() => {
                if (!vehiculoSeleccionado) {
                  setError('Seleccione un vehículo antes de crear una inspección')
                  return
                }
                setMostrandoFormulario(true)
              }}
                className="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
              >
                <IconAgregar className="h-4 w-4" />
                Nueva inspección
              </button>
            )}
          </div>

          {mostrandoFormulario && vehiculoSeleccionado && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">
                  Nueva inspección — <span className={vehiculoTipo === 'Carga' ? 'text-amber-600' : 'text-blue-600'}>{vehiculoTipo}</span>
                </h3>
                <button onClick={() => setMostrandoFormulario(false)}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  ← Volver al historial
                </button>
              </div>
              {CHECKLIST_GROUPS.map((group) => (
                <details key={group.id} className="mt-4 rounded-lg border border-slate-200 open:border-purple-300">
                  <summary className="cursor-pointer rounded-lg bg-purple-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-purple-100">
                    Checklist: {group.titulo}
                  </summary>
                  <div className="space-y-1.5 p-4">
                    {group.items.map((item) => (
                      <label key={item} className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!formChecklist[item]}
                          onChange={(e) => setFormChecklist({ ...formChecklist, [item]: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-slate-700">{item}</span>
                      </label>
                    ))}
                  </div>
                </details>
              ))}

              <details className="mt-6 rounded-lg border border-slate-200 open:border-blue-300">
                <summary className="cursor-pointer rounded-lg bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  Documentación
                </summary>
                <div className="space-y-2 p-4">
                  {DOCS_POR_TIPO[vehiculoTipo].map((doc) => (
                    <label key={doc.key} className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" checked={formDocs[doc.key]}
                        onChange={(e) => setFormDocs({ ...formDocs, [doc.key]: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{doc.label}</span>
                    </label>
                  ))}
                </div>
              </details>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">Observaciones</label>
                <textarea value={formInspeccion.observaciones}
                  onChange={(e) => setFormInspeccion({ ...formInspeccion, observaciones: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  rows={3}
                />
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">Firma del evaluador</label>
                <SignaturePad value={firma} onChange={setFirma} />
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={guardarInspeccion} disabled={guardandoInspeccion || !firma}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {guardandoInspeccion ? 'Guardando...' : guardandoPDF ? 'Generando PDF...' : 'Guardar inspección'}
                </button>
              </div>
            </div>
          )}

          {mostrandoFormulario && !vehiculoSeleccionado && (
            <div className="flex items-center justify-center rounded-xl bg-white py-12 shadow-sm">
              <p className="text-sm text-slate-400">Seleccione un vehículo para crear una inspección</p>
            </div>
          )}

          {!mostrandoFormulario && insFiltradas.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl bg-white py-12 shadow-sm">
              <svg className="mb-3 h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-slate-400">
                {inspecciones.length === 0
                  ? 'No hay inspecciones registradas'
                  : 'Ninguna inspección coincide con los filtros seleccionados'}
              </p>
            </div>
          )}

          {!mostrandoFormulario && insFiltradas.length > 0 && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-800">
                Historial de inspecciones
                {insFiltradas.length < inspecciones.length && (
                  <span className="ml-2 text-sm font-normal text-slate-400">({insFiltradas.length} de {inspecciones.length})</span>
                )}
              </h3>
              <div className="space-y-3">
                {insFiltradas.map((ins) => {
                  const chkCount = [ins.checklist_interior, ins.checklist_luces, ins.checklist_lavado, ins.checklist_mecanico]
                    .filter((a): a is string[] => Array.isArray(a))
                    .reduce((sum, a) => sum + a.length, 0)
                  const expandida = inspeccionExpandida === ins.id
                  return (
                    <div key={ins.id} className="rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-500">{new Date(ins.created_at).toLocaleDateString('es-VE', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}</span>
                          <span className="text-xs text-slate-400">{vehiculos.find((v) => v.id === ins.vehiculo_id)?.placa ?? ''}</span>
                          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                            {chkCount} items
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setInspeccionExpandida(expandida ? null : ins.id)}
                            className="rounded px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            {expandida ? 'Ocultar detalles' : 'Ver detalles'}
                          </button>
                          <button onClick={() => verPDF(ins.id)}
                            className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                          >
                            Ver PDF
                          </button>
                          {perfil?.rol === 'admin' && (
                            <button onClick={() => setEliminandoInspeccion(ins.id)}
                              className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                      {expandida && (
                        <div className="border-t border-slate-100 p-4 pt-3">
                          {CHECKLIST_GROUPS.map((g) => {
                            const vals = (ins as any)[g.columna]
                            if (!vals || !Array.isArray(vals) || vals.length === 0) return null
                            return (
                              <div key={g.id} className="col-span-full mt-2">
                                <p className="text-xs font-medium text-slate-500 mb-1">{g.titulo}:</p>
                                <div className="flex flex-wrap gap-1">
                                  {(vals as string[]).map((v) => (
                                    <span key={v} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                      {v}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                          {ins.observaciones && (
                            <p className="mt-2 col-span-full text-sm text-slate-600">Observaciones: {ins.observaciones}</p>
                          )}
                          {ins.danos && Array.isArray(ins.danos) && ins.danos.length > 0 && (
                            <div className="relative mt-3 col-span-full inline-block max-w-xs">
                              <span className="text-xs text-slate-500">Daños marcados:</span>
                              <img src={vehiculos.find((v) => v.id === ins.vehiculo_id)?.tipo === 'Carga' ? '/camion.webp' : '/vehiculo.webp'} alt="Daños" className="mt-1 w-full rounded border border-slate-200" />
                              {(ins.danos as { x: number; y: number; comentario: string }[]).map((d: any, i: number) => (
                                <div key={i}
                                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                                  style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%` }}
                                >
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
                                    {i + 1}
                                  </span>
                                  {d.comentario && (
                                    <span className="mt-0.5 max-w-[100px] truncate rounded bg-white/90 px-1 py-0.5 text-[9px] text-slate-700 shadow">
                                      {d.comentario}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {ins.firma && (
                            <div className="mt-2 col-span-full">
                              <span className="text-xs text-slate-500">Firma:</span>
                              <img src={ins.firma} alt="Firma" className="mt-1 h-10 rounded border border-slate-200" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: MANTENIMIENTO */}
      {tab === 'mantenimiento' && (
        <div className="space-y-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Seleccionar vehículo</label>
            <select value={vehiculoSeleccionado} onChange={(e) => setVehiculoSeleccionado(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            >
              <option value="">-- Seleccione --</option>
              {vehiculosActivos.map((v) => (
                <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo} ({v.anio})</option>
              ))}
            </select>
          </div>

          {vehiculoSeleccionado && (
            <>
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-800">Registrar mantenimiento</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
                    <select value={formMantenimiento.tipo}
                      onChange={(e) => setFormMantenimiento({ ...formMantenimiento, tipo: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    >
                      {TIPOS_MANTENIMIENTO.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Costo ($)</label>
                    <input type="number" min={0} step={0.01} value={formMantenimiento.costo}
                      onChange={(e) => setFormMantenimiento({ ...formMantenimiento, costo: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
                  <textarea value={formMantenimiento.descripcion}
                    onChange={(e) => setFormMantenimiento({ ...formMantenimiento, descripcion: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    rows={3}
                    placeholder="Describa el trabajo realizado..."
                  />
                </div>
                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Observaciones</label>
                  <textarea value={formMantenimiento.observaciones}
                    onChange={(e) => setFormMantenimiento({ ...formMantenimiento, observaciones: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    rows={2}
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <button onClick={guardarMantenimiento} disabled={guardandoMantenimiento}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {guardandoMantenimiento ? 'Guardando...' : 'Registrar mantenimiento'}
                  </button>
                </div>
              </div>

              {mantenimientos.length > 0 && (
                <div className="rounded-xl bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-800">Historial de mantenimientos</h3>
                  <div className="space-y-3">
                    {mantenimientos.map((m) => (
                      <div key={m.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                          <span>{new Date(m.created_at).toLocaleDateString('es-VE', {
                            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}</span>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{m.tipo}</span>
                        </div>
                        <p className="text-sm text-slate-700">{m.descripcion || 'Sin descripción'}</p>
                        <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                          {m.costo > 0 && <span>Costo: ${m.costo.toFixed(2)}</span>}
                        </div>
                        {m.observaciones && (
                          <p className="mt-1 text-xs text-slate-400">Obs: {m.observaciones}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {eliminandoInspeccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEliminandoInspeccion(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-bold text-slate-800">Eliminar inspeccion</h2>
            <p className="mb-4 text-sm text-slate-600">Esta accion elimina la inspeccion permanentemente. No se puede deshacer.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => eliminarInspeccion(eliminandoInspeccion)}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Eliminar
              </button>
              <button type="button" onClick={() => setEliminandoInspeccion(null)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {qrVehiculo && <VehicleQRModal vehiculo={qrVehiculo} onClose={() => setQrVehiculo(null)} />}
    </div>
  )
}

function VehicleQRModal({ vehiculo, onClose }: { vehiculo: Vehiculo; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const url = `${window.location.origin}/taller/vehiculo/${vehiculo.id}`
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 250, margin: 2 }, (err) => {
        if (err) console.error(err)
      })
    }
  }, [url])

  async function copiarUrl() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">QR de vehiculo</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <canvas ref={canvasRef} />
          <div className="text-center">
            <p className="font-mono text-lg font-bold text-slate-800">{vehiculo.placa}</p>
            <p className="text-sm text-slate-500">{vehiculo.marca} {vehiculo.modelo} {vehiculo.anio} · {vehiculo.color}</p>
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
              <span className="block break-all text-xs text-slate-500">{url}</span>
            </div>
          </div>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={onClose}
              className="rounded-lg bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
            >
              Cerrar
            </button>
            <button onClick={() => window.open(url, '_blank')}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Abrir
            </button>
            <button onClick={copiarUrl}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {copiado ? 'Copiado' : 'Copiar URL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
