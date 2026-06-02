import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import type { Supermercado, Area, SupermercadoArea } from '../../types'

function generarUUID() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

interface AreaEval {
  areaId: string
  nombre: string
  peso: number
  orden: number
  limpieza: number
  comentarios: string
}

function ahoraLocal() {
  const ahora = new Date()
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset())
  return ahora.toISOString().slice(0, 16)
}

export function EvaluarSupermercado() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [supermercado, setSupermercado] = useState<Supermercado | null>(null)
  const [areas, setAreas] = useState<AreaEval[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fechaInicio, setFechaInicio] = useState(ahoraLocal)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('supermercados').select('*').eq('id', id).single(),
      supabase.from('supermercado_areas').select('*, area:area_id(*)').eq('supermercado_id', id).order('area_id'),
    ]).then(([sRes, saRes]) => {
      if (sRes.data) setSupermercado(sRes.data)
      const lista = (saRes.data as (SupermercadoArea & { area: Area })[]) ?? []
      setAreas(
        lista.map((sa) => ({
          areaId: sa.area_id,
          nombre: sa.area?.nombre ?? '?',
          peso: sa.peso,
          orden: 0,
          limpieza: 0,
          comentarios: '',
        }))
      )
      setLoading(false)
    })
  }, [id])

  function actualizar(areaId: string, campo: keyof Omit<AreaEval, 'areaId' | 'nombre' | 'peso'>, valor: number | string) {
    setAreas((prev) => prev.map((a) => (a.areaId === areaId ? { ...a, [campo]: valor } : a)))
  }

  async function guardarEvaluacion() {
    if (!user || !id || !supermercado) return
    setGuardando(true)
    setError(null)

    const evaluacionId = generarUUID()
    const fechaISO = new Date(fechaInicio).toISOString()

    const registros = areas.map((a) => ({
      evaluacion_id: evaluacionId,
      supermercado_id: id,
      area_id: a.areaId,
      fecha_inicio: fechaISO,
      orden: a.orden,
      limpieza: a.limpieza,
      comentarios: a.comentarios.trim() || '',
      creado_por: user.id,
    }))

    const { error: err } = await supabase.from('evaluaciones_supermercado').insert(registros)
    if (err) {
      setError(err.message)
      setGuardando(false)
    } else {
      navigate('/operaciones/supermercados', { state: { mensaje: `Evaluacion de "${supermercado.nombre}" guardada` } })
    }
  }

  if (loading) return <div className="py-10 text-center text-slate-500">Cargando...</div>
  if (!supermercado) return <div className="py-10 text-center text-slate-500">Supermercado no encontrado</div>

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link to="/operaciones/supermercados" className="mb-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Todos los supermercados
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">{supermercado.nombre}</h1>
        <p className="text-slate-500">Nueva evaluacion</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-slate-700">Fecha y hora de inicio de la evaluacion</label>
        <input
          type="datetime-local"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
        />
      </div>

      <div className="space-y-4">
        {areas.map((area) => (
          <div key={area.areaId} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                {area.nombre[0]}
              </span>
              <h2 className="text-lg font-semibold text-slate-800">{area.nombre}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Peso: {area.peso} pts</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Orden</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="0" max="100" step="0.5"
                    value={area.orden}
                    onChange={(e) => actualizar(area.areaId, 'orden', Number(e.target.value))}
                    className="flex-1 accent-blue-600"
                  />
                  <span className="w-12 text-right text-sm font-semibold text-slate-700">{area.orden}</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Limpieza</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="0" max="100" step="0.5"
                    value={area.limpieza}
                    onChange={(e) => actualizar(area.areaId, 'limpieza', Number(e.target.value))}
                    className="flex-1 accent-blue-600"
                  />
                  <span className="w-12 text-right text-sm font-semibold text-slate-700">{area.limpieza}</span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-slate-600">Comentarios</label>
              <textarea
                value={area.comentarios}
                onChange={(e) => actualizar(area.areaId, 'comentarios', e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                placeholder="Agregar comentarios..."
              />
            </div>
          </div>
        ))}
      </div>

      {areas.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-slate-400">Este supermercado no tiene departamentos asignados.</p>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Link
          to="/operaciones/supermercados"
          className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <button
          onClick={guardarEvaluacion}
          disabled={guardando || areas.length === 0}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar evaluacion'}
        </button>
      </div>
    </div>
  )
}
