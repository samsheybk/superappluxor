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
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Historial Entradas / Salidas</span>
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
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500">
                <th className="w-[100px] px-2 py-1.5">Placa</th>
                <th className="px-2 py-1.5">Vehiculo</th>
                <th className="w-[52px] px-2 py-1.5">Garita</th>
                <th className="w-[68px] px-2 py-1.5">Tipo</th>
                <th className="px-2 py-1.5">Chofer</th>
                <th className="px-2 py-1.5">Carga</th>
                <th className="px-2 py-1.5">Destino / Origen</th>
                <th className="w-[80px] px-2 py-1.5">Combustible</th>
                <th className="w-[128px] px-2 py-1.5">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => {
                const textoVehiculo = r.vehiculo ? `${r.vehiculo.marca} ${r.vehiculo.modelo} ${r.vehiculo.color}` : ''
                return (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-1.5 font-mono font-bold text-slate-800 truncate" onMouseEnter={(e) => { const el = e.currentTarget; if (el.scrollWidth > el.clientWidth && !el.title) el.title = el.textContent || '' }}>{r.placa}</td>
                  <td className="px-2 py-1.5 text-slate-600 truncate max-w-[140px]" onMouseEnter={(e) => { const el = e.currentTarget; if (el.scrollWidth > el.clientWidth && !el.title) el.title = el.textContent || '' }}>
                    {textoVehiculo || '—'}
                  </td>
                  <td className="px-2 py-1.5">{r.garita}</td>
                  <td className="px-2 py-1.5">
                    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${r.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {r.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-slate-600 truncate max-w-[100px]" onMouseEnter={(e) => { const el = e.currentTarget; if (el.scrollWidth > el.clientWidth && !el.title) el.title = el.textContent || '' }}>{r.chofer || '—'}</td>
                  <td className="px-2 py-1.5 text-slate-600 truncate max-w-[100px]" onMouseEnter={(e) => { const el = e.currentTarget; if (el.scrollWidth > el.clientWidth && !el.title) el.title = el.textContent || '' }}>{r.tipo_carga || '—'}</td>
                  <td className="px-2 py-1.5 text-slate-600 truncate max-w-[120px]" onMouseEnter={(e) => { const el = e.currentTarget; if (el.scrollWidth > el.clientWidth && !el.title) el.title = el.textContent || '' }}>{r.destino_origen || '—'}</td>
                  <td className="px-2 py-1.5">
                    {r.vehiculo?.origen === 'Luxor' ? (
                      r.combustible_defectuoso ? (
                        <span className="text-[11px] text-amber-600">Defectuoso</span>
                      ) : r.nivel_combustible !== null ? (
                        <span className="text-[11px] font-medium text-amber-700">{r.nivel_combustible}%</span>
                      ) : '—'
                    ) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
