import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { LoadingScreen } from '../../components/LoadingScreen'

interface Registro {
  id: string
  garita: number
  placa: string
  tipo: 'entrada' | 'salida'
  chofer: string
  tipo_carga: string
  destino_origen: string
  nivel_combustible: number | null
  combustible_defectuoso: boolean
  created_at: string
  vehiculo?: { marca: string; modelo: string; color: string; origen: string }
}

export function HistorialGaritas() {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroPlaca, setFiltroPlaca] = useState('')
  const [filtroGarita, setFiltroGarita] = useState<number | ''>('')
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  function cargar() {
    setLoading(true)
    let query = supabase
      .from('seguridad_registros')
      .select('*, vehiculo:seguridad_vehiculos(*)')
      .order('created_at', { ascending: false })

    if (filtroPlaca.trim()) query = query.ilike('placa', `%${filtroPlaca.trim().toUpperCase()}%`)
    if (filtroGarita !== '') query = query.eq('garita', filtroGarita)
    if (filtroTipo) query = query.eq('tipo', filtroTipo)
    if (filtroDesde) query = query.gte('created_at', filtroDesde)
    if (filtroHasta) query = query.lte('created_at', `${filtroHasta}T23:59:59`)

    query.then(({ data }) => {
      setRegistros((data ?? []) as unknown as Registro[])
      setLoading(false)
    })
  }

  useEffect(() => { cargar() }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Historial de Garitas</h1>
          <p className="text-sm text-slate-400">Registro de entradas y salidas</p>
        </div>
        <Link to="/departamento/seguridad"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Volver al control
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input value={filtroPlaca} onChange={(e) => setFiltroPlaca(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          className="min-w-[120px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Placa" maxLength={10}
        />
        <select value={filtroGarita} onChange={(e) => setFiltroGarita(e.target.value ? Number(e.target.value) : '')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todas las garitas</option>
          <option value="1">Garita 1</option>
          <option value="2">Garita 2</option>
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Entrada / Salida</option>
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
        </select>
        <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button type="button" onClick={cargar}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Filtrar
        </button>
      </div>

      {loading ? <LoadingScreen /> : registros.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center text-sm text-slate-400">
          No hay registros
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Placa</th>
                <th className="px-4 py-3">Vehiculo</th>
                <th className="px-4 py-3">Garita</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Chofer</th>
                <th className="px-4 py-3">Carga</th>
                <th className="px-4 py-3">Destino / Origen</th>
                <th className="px-4 py-3">Combustible</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{r.placa}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.vehiculo ? `${r.vehiculo.marca} ${r.vehiculo.modelo} ${r.vehiculo.color}` : '—'}
                  </td>
                  <td className="px-4 py-3">{r.garita}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {r.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.chofer || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.tipo_carga || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.destino_origen || '—'}</td>
                  <td className="px-4 py-3">
                    {r.vehiculo?.origen === 'Luxor' ? (
                      r.combustible_defectuoso ? (
                        <span className="text-xs text-amber-600">Defectuoso</span>
                      ) : r.nivel_combustible !== null ? (
                        <span className="text-xs font-medium text-amber-700">{r.nivel_combustible}%</span>
                      ) : '—'
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
