import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

interface Vehiculo {
  id: string; placa: string; marca: string; modelo: string
  anio: number; color: string; tipo: string; activo: boolean
}

interface Inspeccion {
  id: string; created_at: string
  [campo: string]: any
}

function calcularPuntos(ins: Inspeccion) {
  const ITEMS = [
    'limp_cabina_interna', 'limp_carroceria_externa', 'limp_area_carga', 'limp_parabrisas_ventanas',
    'elec_luces_principales', 'elec_luces_senalizacion', 'elec_luces_freno_retroceso',
    'elec_tablero_instrumentos', 'elec_limpia_parabrisas', 'elec_bateria',
    'mec_fluidos', 'mec_fugas', 'mec_frenos', 'mec_neumaticos', 'mec_correas', 'mec_suspension_direccion',
    'est_carroceria', 'est_parabrisas', 'est_tapiceria_asientos', 'est_retrovisores_parachoques',
    'est_cerraduras_manillas', 'aux_caucho_repuesto', 'aux_herramientas', 'aux_triangulos',
    'aux_extintor', 'aux_tacos',
  ]
  let total = 0; let obtenido = 0
  for (const key of ITEMS) {
    total += 2; const val = ins[key]
    if (val === 'Bueno') obtenido += 2
    else if (val === 'Regular') obtenido += 1
  }
  return { obtenido, total, pct: total > 0 ? Math.round((obtenido / total) * 100) : 0 }
}

const DOC_CAMPOS = [
  { key: 'doc_titulo_propiedad', label: 'Titulo de propiedad' },
  { key: 'doc_poliza_seguro', label: 'Poliza de seguro' },
  { key: 'doc_impuestos', label: 'Impuestos' },
  { key: 'doc_carta_autorizacion', label: 'Carta de autorizacion' },
  { key: 'doc_licencia', label: 'Licencia' },
  { key: 'doc_certificado_medico', label: 'Certificado medico' },
  { key: 'doc_rotec', label: 'RoTEC' },
  { key: 'doc_guias_movilizacion', label: 'Guías de movilizacion' },
  { key: 'doc_permiso_sustancias', label: 'Permiso sustancias' },
  { key: 'doc_guia_sanitaria', label: 'Guía sanitaria' },
  { key: 'doc_certificado_pesos', label: 'Certificado de pesos' },
]

export function DetalleVehiculo() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null)
  const [ultimaInspeccion, setUltimaInspeccion] = useState<Inspeccion | null>(null)
  const [ultimoCambioAceite, setUltimoCambioAceite] = useState<{ fecha: string; costo: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const [vRes, iRes, mRes] = await Promise.all([
          supabase.from('vehiculos').select('*').eq('id', id).single(),
          supabase.from('taller_inspecciones').select('*').eq('vehiculo_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('taller_mantenimientos').select('created_at, costo').eq('vehiculo_id', id).eq('tipo', 'Cambio de aceite').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ])
        if (vRes.data) setVehiculo(vRes.data)
        if (iRes.data) setUltimaInspeccion(iRes.data)
        if (mRes.data) setUltimoCambioAceite({ fecha: mRes.data.created_at, costo: mRes.data.costo })
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

  const pts = ultimaInspeccion ? calcularPuntos(ultimaInspeccion) : null
  const ultimoAceite = ultimoCambioAceite?.fecha
    ? new Date(ultimoCambioAceite.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link to="/departamento/taller-automotriz" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← Volver al taller
      </Link>

      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-slate-800">{vehiculo.placa}</h1>
        <p className="text-lg text-slate-500">{vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}</p>
        <p className="text-sm text-slate-400">{vehiculo.color} · {vehiculo.tipo}</p>
      </div>

      <div className="mb-6 flex gap-3">
        <button onClick={() => navigate('/departamento/taller-automotriz', { state: { tab: 'inspeccion', vehiculoId: vehiculo.id } })}
          className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700"
        >
          Nueva inspeccion
        </button>
        <button onClick={() => navigate('/departamento/taller-automotriz', { state: { tab: 'mantenimiento', vehiculoId: vehiculo.id } })}
          className="flex-1 rounded-xl bg-amber-600 py-3 text-sm font-bold text-white transition-all hover:bg-amber-700"
        >
          Nuevo mantenimiento
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold uppercase text-slate-500">Ultima inspeccion</h2>
          {pts ? (
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${pts.pct >= 80 ? 'text-green-600' : pts.pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {pts.pct}%
              </span>
              <span className="text-sm text-slate-500">
                {pts.obtenido}/{pts.total} puntos
              </span>
              <span className="text-xs text-slate-400">
                {new Date(ultimaInspeccion!.created_at).toLocaleDateString('es-ES')}
              </span>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin inspecciones registradas</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold uppercase text-slate-500">Ultimo cambio de aceite</h2>
          {ultimoAceite ? (
            <div>
              <p className="text-lg font-medium text-slate-800">{ultimoAceite}</p>
              {ultimoCambioAceite!.costo > 0 && (
                <p className="text-sm text-slate-500">Costo: ${ultimoCambioAceite!.costo.toFixed(2)}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin cambios de aceite registrados</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold uppercase text-slate-500">Documentacion</h2>
          <div className="grid grid-cols-2 gap-2">
            {DOC_CAMPOS.map((doc) => {
              const ok = ultimaInspeccion?.[doc.key] === true
              return (
                <div key={doc.key} className="flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-400'}`} />
                  <span className={ok ? 'text-slate-700' : 'text-slate-400'}>{doc.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {ultimaInspeccion?.observaciones && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-bold uppercase text-slate-500">Observaciones</h2>
            <p className="text-sm text-slate-600">{ultimaInspeccion.observaciones}</p>
          </div>
        )}
      </div>

    </div>
  )
}
