import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { LoadingScreen } from '../../components/LoadingScreen'

interface Planta {
  id: string
  supermercado_id: string
  marca: string
  modelo: string
  capacidad_electrica: string
  capacidad_combustible: string
  combustible_por_hora: number
  horas_para_cambio_aceite: number
  activo: boolean
}

export function VerificarPlanta() {
  const { id } = useParams<{ id: string }>()
  const [planta, setPlanta] = useState<Planta | null>(null)
  const [supermercado, setSupermercado] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const { data: p, error: err } = await supabase.from('plantas_electricas').select('*').eq('id', id).single()
        if (err) throw err
        setPlanta(p)
        const { data: s } = await supabase.from('supermercados').select('nombre').eq('id', p.supermercado_id).single()
        setSupermercado(s?.nombre ?? '—')
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <LoadingScreen />
  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-red-600">{error}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Volver al inicio</Link>
      </div>
    </div>
  )
  if (!planta) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-slate-500">Planta no encontrada</p>
        <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Volver al inicio</Link>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-lg text-center">
        <div className="mb-6">
          <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-800">Planta verificada</h1>
        <p className="mb-6 text-sm text-slate-500">Confirme que los datos coinciden con la planta fisica</p>

        <div className="mb-6 space-y-3 rounded-lg bg-slate-50 p-6 text-left">
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Supermercado</span>
            <span className="text-sm font-semibold text-slate-800">{supermercado}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Marca</span>
            <span className="text-sm font-semibold text-slate-800">{planta.marca}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Modelo</span>
            <span className="text-sm font-semibold text-slate-800">{planta.modelo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Capacidad electrica</span>
            <span className="text-sm font-semibold text-slate-800">{planta.capacidad_electrica}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Capacidad combustible</span>
            <span className="text-sm font-semibold text-slate-800">{planta.capacidad_combustible}</span>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <Link to="/"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Volver al inicio
          </Link>
          <Link to="/departamento/plantas-electricas"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ir a operacion
          </Link>
        </div>
      </div>
    </div>
  )
}
