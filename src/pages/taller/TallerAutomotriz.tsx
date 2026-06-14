import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { IconAgregar, IconEditar, IconEliminar } from '../../components/Icons'
import { SignaturePad } from '../../components/SignaturePad'
import { LoadingScreen } from '../../components/LoadingScreen'
import { generarPDFTaller } from '../../utils/generarPDFTaller'

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
  pdf_base64: string | null
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

const ESTADOS = ['Bueno', 'Regular', 'Malo'] as const
const TIPOS_MANTENIMIENTO = ['Cambio de aceite', 'Reparacion', 'Revision general', 'Otro'] as const

const CATEGORIAS_INSPECCION = [
  {
    id: 'limp', titulo: 'Limpieza (Aspecto y Sanidad)',
    items: [
      { key: 'limp_cabina_interna', label: 'Cabina interna', tipo: 'ambos' },
      { key: 'limp_carroceria_externa', label: 'Carrocería externa', tipo: 'ambos' },
      { key: 'limp_area_carga', label: 'Área de carga (Furgón/Plataforma)', tipo: 'carga' },
      { key: 'limp_parabrisas_ventanas', label: 'Parabrisas y ventanas', tipo: 'ambos' },
    ],
  },
  {
    id: 'elec', titulo: 'Eléctrico (Iluminación y Componentes)',
    items: [
      { key: 'elec_luces_principales', label: 'Luces principales (altas y bajas)', tipo: 'ambos' },
      { key: 'elec_luces_senalizacion', label: 'Luces de señalización (direccionales / emergencia)', tipo: 'ambos' },
      { key: 'elec_luces_freno_retroceso', label: 'Luces de freno y marcha atrás', tipo: 'ambos' },
      { key: 'elec_tablero_instrumentos', label: 'Tablero de instrumentos', tipo: 'ambos' },
      { key: 'elec_limpia_parabrisas', label: 'Limpia parabrisas', tipo: 'ambos' },
      { key: 'elec_bateria', label: 'Batería (bornes y cables)', tipo: 'ambos' },
    ],
  },
  {
    id: 'mec', titulo: 'Mecánico (Funcionamiento y Fluidos)',
    items: [
      { key: 'mec_fluidos', label: 'Niveles de fluidos', tipo: 'ambos' },
      { key: 'mec_fugas', label: 'Fugas visibles', tipo: 'ambos' },
      { key: 'mec_frenos', label: 'Sistema de frenos', tipo: 'ambos' },
      { key: 'mec_neumaticos', label: 'Neumáticos (presión y dibujo)', tipo: 'ambos' },
      { key: 'mec_correas', label: 'Correas del motor', tipo: 'ambos' },
      { key: 'mec_suspension_direccion', label: 'Suspensión y dirección', tipo: 'ambos' },
    ],
  },
  {
    id: 'est', titulo: 'Estética (Estructura e Imagen)',
    items: [
      { key: 'est_carroceria', label: 'Carrocería general (abolladuras / rayones)', tipo: 'ambos' },
      { key: 'est_parabrisas', label: 'Parabrisas (rajaduras / grietas)', tipo: 'ambos' },
      { key: 'est_tapiceria_asientos', label: 'Tapicería y asientos', tipo: 'ambos' },
      { key: 'est_retrovisores_parachoques', label: 'Retrovisores y parachoques', tipo: 'ambos' },
      { key: 'est_cerraduras_manillas', label: 'Cerraduras y manillas', tipo: 'ambos' },
    ],
  },
  {
    id: 'aux', titulo: 'Auxilio Vial (Herramientas y Emergencia)',
    items: [
      { key: 'aux_caucho_repuesto', label: 'Caucho (llanta) de repuesto', tipo: 'ambos' },
      { key: 'aux_herramientas', label: 'Herramientas de cambio (gato / llave)', tipo: 'ambos' },
      { key: 'aux_triangulos', label: 'Triángulos de seguridad o conos', tipo: 'ambos' },
      { key: 'aux_extintor', label: 'Extintor de incendios', tipo: 'ambos' },
      { key: 'aux_tacos', label: 'Tacos de bloqueo (Chock blocks)', tipo: 'carga' },
    ],
  },
] as const

const CAMPOS_INSPECCION: string[] = []
for (const cat of CATEGORIAS_INSPECCION) for (const item of cat.items) CAMPOS_INSPECCION.push(item.key)

const DOCS_PARTICULAR = [
  { key: 'doc_titulo_propiedad', label: 'Título de Propiedad / Carnet de Circulación' },
  { key: 'doc_poliza_seguro', label: 'Póliza de Seguro R.C.V. vigente' },
  { key: 'doc_impuestos', label: 'Impuestos vehiculares al día' },
  { key: 'doc_carta_autorizacion', label: 'Carta de Autorización de la Empresa' },
  { key: 'doc_licencia', label: 'Licencia de conducir del conductor' },
  { key: 'doc_certificado_medico', label: 'Certificado Médico Vial del conductor' },
] as const

const DOCS_CARGA = [
  ...DOCS_PARTICULAR,
  { key: 'doc_rotec', label: 'ROTC / Permiso de transporte de carga' },
  { key: 'doc_guias_movilizacion', label: 'Guías de Movilización / Facturas' },
  { key: 'doc_permiso_sustancias', label: 'Permiso de Sustancias Peligrosas' },
  { key: 'doc_guia_sanitaria', label: 'Guía Sanitaria' },
  { key: 'doc_certificado_pesos', label: 'Certificado de Pesos y Medidas' },
] as const

const DOC_LABELS: Record<string, string> = {}
for (const d of DOCS_CARGA) DOC_LABELS[d.key] = d.label

const DOCS_POR_TIPO: Record<string, readonly { key: string; label: string }[]> = {
  Particular: DOCS_PARTICULAR,
  Carga: DOCS_CARGA,
}

function VehiculoModal({ vehiculo, onClose, onSave }: {
  vehiculo: Partial<Vehiculo> | null
  onClose: () => void
  onSave: (v: Partial<Vehiculo>) => Promise<void>
}) {
  const [form, setForm] = useState({
    placa: vehiculo?.placa ?? '',
    marca: vehiculo?.marca ?? '',
    modelo: vehiculo?.modelo ?? '',
    anio: vehiculo?.anio ?? new Date().getFullYear(),
    color: vehiculo?.color ?? '',
    tipo: vehiculo?.tipo ?? 'Particular',
  })
  const [guardando, setGuardando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      await onSave({ ...form, id: vehiculo?.id })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">
          {vehiculo?.id ? 'Editar vehículo' : 'Agregar vehículo'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Placa</label>
            <input type="text" required value={form.placa}
              onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              placeholder="ABC-123"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Marca</label>
              <input type="text" required value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Modelo</label>
              <input type="text" required value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Año</label>
              <input type="number" required value={form.anio}
                onChange={(e) => setForm({ ...form, anio: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                min={1990} max={new Date().getFullYear() + 1}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Color</label>
              <input type="text" required value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
            <select value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as 'Particular' | 'Carga' })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            >
              <option value="Particular">Particular (Uso Administrativo / Gerencial)</option>
              <option value="Carga">Carga (Operativo / Distribución)</option>
            </select>
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
              {guardando ? 'Guardando...' : vehiculo?.id ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SelectEstado({ value, onChange, label }: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
      >
        {ESTADOS.map((e) => (
          <option key={e} value={e}>{e}</option>
        ))}
      </select>
    </div>
  )
}

type FormDocs = Record<string, boolean>
const INIT_INSPECCION: Record<string, string> = { observaciones: '' }
for (const k of CAMPOS_INSPECCION) INIT_INSPECCION[k] = 'Bueno'

const DOC_INIT: FormDocs = {}
for (const d of DOCS_CARGA) DOC_INIT[d.key] = false

export function TallerAutomotriz() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('vehiculos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [vehiculoModal, setVehiculoModal] = useState<Partial<Vehiculo> | null>(null)

  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<string>('')
  const [vehiculoTipo, setVehiculoTipo] = useState<'Particular' | 'Carga'>('Particular')
  const [inspecciones, setInspecciones] = useState<TallerInspeccion[]>([])
  const [formInspeccion, setFormInspeccion] = useState<Record<string, string>>({ ...INIT_INSPECCION })
  const [formDocs, setFormDocs] = useState<FormDocs>({ ...DOC_INIT })
  const [firma, setFirma] = useState<string | null>(null)
  const [guardandoInspeccion, setGuardandoInspeccion] = useState(false)

  const [mantenimientos, setMantenimientos] = useState<TallerMantenimiento[]>([])
  const [formMantenimiento, setFormMantenimiento] = useState({
    tipo: 'Cambio de aceite', descripcion: '', costo: 0, observaciones: '',
  })
  const [guardandoMantenimiento, setGuardandoMantenimiento] = useState(false)

  const [fotosPorCampo, setFotosPorCampo] = useState<Record<string, { foto: string; comentario: string }[]>>({})
  const [guardandoPDF, setGuardandoPDF] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    ;(async () => {
      try {
        const vehRes = await supabase.from('vehiculos').select('*').order('placa')
        if (vehRes.error) throw vehRes.error
        setVehiculos(vehRes.data ?? [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!vehiculoSeleccionado) {
      setInspecciones([])
      setMantenimientos([])
      return
    }
    const v = vehiculos.find((x) => x.id === vehiculoSeleccionado)
    setVehiculoTipo(v?.tipo ?? 'Particular')
    ;(async () => {
      try {
        const [insRes, mantRes] = await Promise.all([
          supabase.from('taller_inspecciones').select('*')
            .eq('vehiculo_id', vehiculoSeleccionado)
            .order('created_at', { ascending: false }),
          supabase.from('taller_mantenimientos').select('*')
            .eq('vehiculo_id', vehiculoSeleccionado)
            .order('created_at', { ascending: false }),
        ])
        if (insRes.error) throw insRes.error
        if (mantRes.error) throw mantRes.error
        setInspecciones(insRes.data ?? [])
        setMantenimientos(mantRes.data ?? [])
      } catch (e: any) {
        setError(e.message)
      }
    })()
  }, [vehiculoSeleccionado, vehiculos])

  async function guardarVehiculo(v: Partial<Vehiculo>) {
    const payload: Record<string, any> = {
      placa: v.placa, marca: v.marca, modelo: v.modelo,
      anio: v.anio, color: v.color, tipo: v.tipo,
    }
    if (v.id) {
      const { error } = await supabase.from('vehiculos').update(payload).eq('id', v.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('vehiculos').insert(payload)
      if (error) throw error
    }
    const { data } = await supabase.from('vehiculos').select('*').order('placa')
    setVehiculos(data ?? [])
    setVehiculoModal(null)
  }

  async function desactivarVehiculo(id: string) {
    await supabase.from('vehiculos').update({ activo: false }).eq('id', id)
    setVehiculos(vehiculos.map((v) => v.id === id ? { ...v, activo: false } : v))
  }

  function handleAgregarFoto(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const foto = reader.result as string
      setFotosPorCampo((prev) => ({
        ...prev,
        [key]: [...(prev[key] ?? []), { foto, comentario: '' }],
      }))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleEliminarFoto(key: string, idx: number) {
    setFotosPorCampo((prev) => {
      const arr = [...(prev[key] ?? [])]
      arr.splice(idx, 1)
      return { ...prev, [key]: arr }
    })
  }

  function handleComentarioFoto(key: string, idx: number, comentario: string) {
    setFotosPorCampo((prev) => {
      const arr = [...(prev[key] ?? [])]
      arr[idx] = { ...arr[idx], comentario }
      return { ...prev, [key]: arr }
    })
  }

  async function guardarInspeccion() {
    if (!vehiculoSeleccionado || !user) return
    setGuardandoInspeccion(true)
    setGuardandoPDF(true)
    try {
      const v = vehiculos.find((x) => x.id === vehiculoSeleccionado)!
      const perfilRes = await supabase.from('perfiles').select('nombre').eq('id', user.id).single()
      const evaluadorNombre = perfilRes.data?.nombre ?? user.email ?? ''

      const categoriasPDF: {
        titulo: string
        campos: { label: string; valor: string; fotos: { foto: string; comentario: string }[] }[]
      }[] = []

      for (const cat of CATEGORIAS_INSPECCION) {
        const campos = cat.items
          .filter((item) => item.tipo === 'ambos' || item.tipo === vehiculoTipo.toLowerCase())
          .map((item) => ({
            label: item.label,
            valor: formInspeccion[item.key],
            fotos: fotosPorCampo[item.key] ?? [],
          }))
        categoriasPDF.push({ titulo: cat.titulo, campos })
      }

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
        categorias: categoriasPDF,
        docs,
        observaciones: formInspeccion.observaciones,
        firma,
      })

      const payload: Record<string, any> = {
        vehiculo_id: vehiculoSeleccionado, evaluador_id: user.id,
        ...formInspeccion, ...formDocs, firma, pdf_base64: pdfDataUrl,
      }
      const { error } = await supabase.from('taller_inspecciones').insert(payload)
      if (error) throw error

      setFormInspeccion({ ...INIT_INSPECCION })
      setFormDocs({ ...DOC_INIT })
      setFirma(null)
      setFotosPorCampo({})
      const { data } = await supabase.from('taller_inspecciones').select('*')
        .eq('vehiculo_id', vehiculoSeleccionado)
        .order('created_at', { ascending: false })
      setInspecciones(data ?? [])
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

  if (loading) return <LoadingScreen />

  const vehiculosActivos = vehiculos.filter((v) => v.activo)

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="mb-2 inline-block text-sm text-blue-600 hover:underline">← Volver al panel</Link>
        <div className="flex items-center gap-3">
          <svg className="h-8 w-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Taller automotriz</h1>
            <p className="text-slate-500">Operaciones</p>
          </div>
        </div>
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
                <h3 className="mb-4 text-lg font-semibold text-slate-800">
                  Nueva inspección — <span className={vehiculoTipo === 'Carga' ? 'text-amber-600' : 'text-blue-600'}>{vehiculoTipo}</span>
                </h3>
                {CATEGORIAS_INSPECCION.map((cat) => {
                  const items = cat.items.filter((item) => item.tipo === 'ambos' || item.tipo === vehiculoTipo.toLowerCase())
                  if (items.length === 0) return null
                  return (
                    <details key={cat.id} className="mt-4 rounded-lg border border-slate-200 open:border-blue-300">
                      <summary className="cursor-pointer rounded-lg bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                        {cat.titulo}
                      </summary>
                      <div className="space-y-4 p-4">
                        {items.map((item) => {
                          const fotos = fotosPorCampo[item.key] ?? []
                          return (
                            <div key={item.key} className="rounded-lg border border-slate-100 p-3">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <SelectEstado label={item.label}
                                    value={formInspeccion[item.key]}
                                    onChange={(v) => setFormInspeccion({ ...formInspeccion, [item.key]: v })} />
                                </div>
                                <button type="button" onClick={() => fileInputRefs.current[item.key]?.click()}
                                  className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                  title="Agregar foto"
                                >
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </button>
                                <input ref={(el) => { fileInputRefs.current[item.key] = el }}
                                  type="file" accept="image/*" className="hidden"
                                  onChange={(e) => handleAgregarFoto(item.key, e)} />
                              </div>
                              {fotos.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-3">
                                  {fotos.map((foto, idx) => (
                                    <div key={idx} className="relative w-40">
                                      <img src={foto.foto} alt={`Foto ${idx + 1}`}
                                        className="h-32 w-full rounded-lg border border-slate-200 object-cover" />
                                      <button type="button" onClick={() => handleEliminarFoto(item.key, idx)}
                                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                                      >
                                        ✕
                                      </button>
                                      <input type="text" value={foto.comentario}
                                        onChange={(e) => handleComentarioFoto(item.key, idx, e.target.value)}
                                        placeholder="Comentario de la foto..."
                                        className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </details>
                  )
                })}

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

              {inspecciones.length > 0 && (
                <div className="rounded-xl bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-800">Historial de inspecciones</h3>
                  <div className="space-y-3">
                    {inspecciones.map((ins) => (
                      <div key={ins.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                          <span>{new Date(ins.created_at).toLocaleDateString('es-VE', {
                            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}</span>
                            {ins.pdf_base64 && (
                            <button onClick={() => window.open(ins.pdf_base64!, '_blank')}
                              className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                            >
                              Ver PDF
                            </button>
                          )}
                        </div>
                        {CATEGORIAS_INSPECCION.map((cat) => {
                          const vals = cat.items
                            .filter((item) => item.tipo === 'ambos' || item.tipo === vehiculoTipo.toLowerCase())
                            .map((item) => ({ key: item.key, label: item.label, val: ins[item.key] }))
                          if (!vals.some((v) => v.val)) return null
                          return (
                            <div key={cat.id} className="col-span-full">
                              <p className="text-xs font-medium text-slate-500 mt-2 mb-1">{cat.titulo}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                {vals.map((v) => (
                                  <span key={v.key}>
                                    <span className="text-slate-400">{v.label}: </span>
                                    <span className={colorEstado(v.val)}>{v.val}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                        {(
                          [
                            'doc_titulo_propiedad', 'doc_poliza_seguro', 'doc_impuestos',
                            'doc_carta_autorizacion', 'doc_licencia', 'doc_certificado_medico',
                            'doc_rotec', 'doc_guias_movilizacion', 'doc_permiso_sustancias',
                            'doc_guia_sanitaria', 'doc_certificado_pesos',
                          ] as const
                        ).filter((k) => (ins as any)[k]).length > 0 && (
                          <div className="col-span-full mt-2">
                            <p className="text-xs font-medium text-slate-500 mb-1">Documentos:</p>
                            <div className="flex flex-wrap gap-1">
                              {(
                                [
                                  'doc_titulo_propiedad', 'doc_poliza_seguro', 'doc_impuestos',
                                  'doc_carta_autorizacion', 'doc_licencia', 'doc_certificado_medico',
                                  'doc_rotec', 'doc_guias_movilizacion', 'doc_permiso_sustancias',
                                  'doc_guia_sanitaria', 'doc_certificado_pesos',
                                ] as const
                              ).filter((k) => (ins as any)[k]).map((k) => (
                                <span key={k} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                  {DOC_LABELS[k]}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {ins.observaciones && (
                          <p className="mt-2 col-span-full text-sm text-slate-600">Observaciones: {ins.observaciones}</p>
                        )}
                        {ins.firma && (
                          <div className="mt-2 col-span-full">
                            <span className="text-xs text-slate-500">Firma:</span>
                            <img src={ins.firma} alt="Firma" className="mt-1 h-10 rounded border border-slate-200" />
                          </div>
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
    </div>
  )
}

function colorEstado(valor: string): string {
  if (valor === 'Bueno') return 'text-green-600 font-medium'
  if (valor === 'Regular') return 'text-yellow-600 font-medium'
  return 'text-red-600 font-medium'
}
