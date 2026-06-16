import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

interface Vehiculo {
  id: string; placa: string; marca: string; modelo: string
  anio: number; color: string; tipo: string; activo: boolean
}

interface VehiculoDocumento {
  id: string
  vehiculo_id: string
  tipo: string
  archivo_base64: string | null
  fecha_vencimiento: string | null
}

const DOC_CAMPOS = [
  { key: 'doc_titulo_propiedad', label: 'Titulo de propiedad', sinFecha: true },
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

export function DetalleVehiculo() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null)
  const [documentos, setDocumentos] = useState<VehiculoDocumento[]>([])
  const [fechasEdit, setFechasEdit] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const [vRes, dRes] = await Promise.all([
          supabase.from('vehiculos').select('*').eq('id', id).single(),
          supabase.from('vehiculo_documentos').select('*').eq('vehiculo_id', id),
        ])
        if (vRes.data) setVehiculo(vRes.data)
        if (dRes.data) setDocumentos(dRes.data)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  )

  if (!vehiculo) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <p className="text-slate-500">Vehiculo no encontrado</p>
      <Link to="/departamento/taller-automotriz" className="text-sm text-blue-600 hover:underline">Volver al taller</Link>
    </div>
  )

  function getDoc(tipo: string): VehiculoDocumento | undefined {
    return documentos.find((d) => d.tipo === tipo)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>, tipo: string) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      const b64 = reader.result as string
      const existente = getDoc(tipo)
      if (existente) {
        await supabase.from('vehiculo_documentos').update({ archivo_base64: b64 }).eq('id', existente.id)
      } else {
        await supabase.from('vehiculo_documentos').insert({
          vehiculo_id: vehiculo!.id, tipo, archivo_base64: b64,
        })
      }
      const { data } = await supabase.from('vehiculo_documentos').select('*').eq('vehiculo_id', vehiculo!.id)
      if (data) setDocumentos(data)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function abrirArchivo(b64: string) {
    const parts = b64.split(',')
    const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'application/pdf'
    const raw = atob(parts[1])
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    window.open(URL.createObjectURL(blob), '_blank')
  }

  async function guardarFecha(tipo: string, fecha: string) {
    let existente = getDoc(tipo)
    if (!existente) {
      const { data } = await supabase.from('vehiculo_documentos').insert({
        vehiculo_id: vehiculo!.id, tipo, fecha_vencimiento: fecha || null,
      }).select().single()
      if (data) {
        setDocumentos([...documentos, data])
      }
      return
    }
    await supabase.from('vehiculo_documentos').update({ fecha_vencimiento: fecha || null }).eq('id', existente.id)
    const { data } = await supabase.from('vehiculo_documentos').select('*').eq('vehiculo_id', vehiculo!.id)
    if (data) setDocumentos(data)
  }

  async function eliminarDoc(tipo: string) {
    const existente = getDoc(tipo)
    if (!existente) return
    await supabase.from('vehiculo_documentos').delete().eq('id', existente.id)
    setDocumentos(documentos.filter((d) => d.id !== existente.id))
  }

  const statusColor: Record<string, string> = {
    ok: 'bg-green-100 text-green-700',
    vencido: 'bg-red-100 text-red-700',
    sin_archivo: 'bg-slate-100 text-slate-500',
  }

  const statusLabel: Record<string, string> = {
    ok: 'Vigente',
    vencido: 'Vencido',
    sin_archivo: 'Sin archivo',
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Operaciones</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Taller automotriz</span>
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-slate-800">{vehiculo.placa}</h1>
        <p className="text-lg text-slate-500">{vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}</p>
        <p className="text-sm text-slate-400">{vehiculo.color} · {vehiculo.tipo}</p>
      </div>

      <div className="mb-6 flex gap-3">
        <button onClick={() => navigate(`/taller/inspeccion/${vehiculo.id}`)}
          className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700"
        >
          Nueva inspeccion
        </button>
        <Link to="/departamento/taller-automotriz" state={{ tab: 'mantenimiento', vehiculoId: vehiculo.id }}
          className="flex-1 rounded-xl bg-amber-600 py-3 text-center text-sm font-bold text-white transition-all hover:bg-amber-700"
        >
          Nuevo mantenimiento
        </Link>
      </div>

      <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-bold uppercase text-slate-500">Documentos</h2>
            <div className="space-y-3">
              {DOC_CAMPOS.map((doc) => {
                const d = getDoc(doc.key)
                const st = d ? docStatus(d) : 'sin_archivo'

                return (
                  <div key={doc.key} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-700">{doc.label}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[st]}`}>
                        {statusLabel[st]}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {d?.archivo_base64 ? 'Cambiar' : 'Subir'}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                          onChange={(e) => handleFile(e, doc.key)} />
                      </label>

                      {d?.archivo_base64 && (
                        <button onClick={() => abrirArchivo(d.archivo_base64!)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver
                        </button>
                      )}

                      {!doc.sinFecha && (
                        <input type="date"
                          value={doc.key in fechasEdit ? fechasEdit[doc.key] : (d?.fecha_vencimiento ?? '')}
                          onChange={(e) => setFechasEdit({ ...fechasEdit, [doc.key]: e.target.value })}
                          onBlur={(e) => {
                            const val = e.target.value
                            if (val !== (d?.fecha_vencimiento ?? '')) guardarFecha(doc.key, val)
                            setFechasEdit((prev) => { const copy = { ...prev }; delete copy[doc.key]; return copy })
                          }}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      )}

                      {d && (
                        <button onClick={() => eliminarDoc(doc.key)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-200"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
      </div>
    </div>
  )
}
