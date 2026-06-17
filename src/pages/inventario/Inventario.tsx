import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

interface Indicador {
  departamento: string
  botes_porcentaje: number
  devoluciones_dias: number
  fidelidad_porcentaje: number
  error_recepcion_porcentaje: number
}

interface DeptoRow {
  departamento: string
  botes: string
  devoluciones: string
  fidelidad: string
  error: string
}

export function Inventario() {
  const { user } = useAuth()

  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())

  const [departamentos, setDepartamentos] = useState<string[]>([])
  const [indicadores, setIndicadores] = useState<Map<string, Indicador>>(new Map())
  const [rows, setRows] = useState<DeptoRow[]>([])
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [nuevoDepto, setNuevoDepto] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [mes, anio])

  async function cargarDatos() {
    setLoading(true)
    const [deptos, inds] = await Promise.all([
      supabase.from('departamentos').select('nombre').order('nombre'),
      supabase.from('inventario_indicadores').select('*').eq('mes', mes).eq('anio', anio),
    ])
    const deptoList = (deptos.data ?? []).map((d: any) => d.nombre)
    setDepartamentos(deptoList)

    const map = new Map<string, Indicador>()
    if (inds.data) {
      inds.data.forEach((i: any) => map.set(i.departamento, i))
    }
    setIndicadores(map)
    setLoading(false)
  }

  useEffect(() => {
    if (departamentos.length > 0) {
      setRows(departamentos.map(d => {
        const existing = indicadores.get(d)
        return {
          departamento: d,
          botes: existing?.botes_porcentaje?.toString() ?? '',
          devoluciones: existing?.devoluciones_dias?.toString() ?? '',
          fidelidad: existing?.fidelidad_porcentaje?.toString() ?? '',
          error: existing?.error_recepcion_porcentaje?.toString() ?? '',
        }
      }))
    }
  }, [departamentos, indicadores])

  function onCellChange(depto: string, field: keyof Omit<DeptoRow, 'departamento'>, value: string) {
    setRows(prev => prev.map(r => r.departamento === depto ? { ...r, [field]: value } : r))
  }

  async function guardarTodo() {
    if (!user) return
    setError(null)
    setGuardando(true)
    try {
      const aInsertar = rows
        .filter(r => r.botes !== '' || r.devoluciones !== '' || r.fidelidad !== '' || r.error !== '')
        .map(r => ({
          departamento: r.departamento,
          mes, anio,
          botes_porcentaje: parseFloat(r.botes) || 0,
          devoluciones_dias: parseInt(r.devoluciones) || 0,
          fidelidad_porcentaje: parseFloat(r.fidelidad) || 0,
          error_recepcion_porcentaje: parseFloat(r.error) || 0,
        }))

      if (aInsertar.length === 0) {
        setMensaje('No hay datos que guardar')
        return
      }

      const { error: err } = await supabase
        .from('inventario_indicadores')
        .upsert(aInsertar, { onConflict: 'departamento,mes,anio' })

      if (err) throw err
      setMensaje('Indicadores guardados')
      await cargarDatos()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function agregarDepto() {
    const nombre = nuevoDepto.trim().toUpperCase()
    if (!nombre) return
    const { error: err } = await supabase.from('departamentos').insert({ nombre })
    if (err) {
      setError(err.message)
      return
    }
    setNuevoDepto('')
    await cargarDatos()
  }

  useEffect(() => {
    if (mensaje) { const t = setTimeout(() => setMensaje(''), 3000); return () => clearTimeout(t) }
  }, [mensaje])

  return (
    <div>
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Finanzas</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Inventario</span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {mensaje && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{mensaje}</div>
      )}

      <div className="space-y-4">
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Mes</label>
            <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Año</label>
            <input type="number" value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value) || hoy.getFullYear())}
              className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button onClick={guardarTodo} disabled={guardando}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar todo'}
          </button>
        </div>

        <div className="relative overflow-x-auto rounded-xl bg-white shadow-sm">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="text-sm text-slate-500">Recopilando datos...</span>
              </div>
            </div>
          )}
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="p-3 font-medium">Departamento</th>
                <th className="p-3 font-medium">% Botes</th>
                <th className="p-3 font-medium">Devoluciones (dias)</th>
                <th className="p-3 font-medium">% Fidelidad</th>
                <th className="p-3 font-medium">% Error Recepcion</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No hay departamentos registrados
                  </td>
                </tr>
              ) : rows.map((r) => (
                <tr key={r.departamento} className="border-b border-slate-100">
                  <td className="p-3 font-medium text-slate-800">{r.departamento}</td>
                  <td className="p-3">
                    <input type="number" step={0.01} min={0} value={r.botes}
                      onChange={(e) => onCellChange(r.departamento, 'botes', e.target.value)}
                      className={`w-24 rounded-lg border px-2 py-1 text-sm focus:outline-none ${
                        r.botes !== '' && parseFloat(r.botes) > 0.05
                          ? 'border-red-300 bg-red-50'
                          : r.botes !== '' && parseFloat(r.botes) <= 0.05
                          ? 'border-green-300 bg-green-50'
                          : 'border-slate-300'
                      }`}
                    />
                  </td>
                  <td className="p-3">
                    <input type="number" min={0} value={r.devoluciones}
                      onChange={(e) => onCellChange(r.departamento, 'devoluciones', e.target.value)}
                      className={`w-24 rounded-lg border px-2 py-1 text-sm focus:outline-none ${
                        r.devoluciones !== '' && parseInt(r.devoluciones) > 25
                          ? 'border-red-300 bg-red-50'
                          : r.devoluciones !== '' && parseInt(r.devoluciones) <= 25
                          ? 'border-green-300 bg-green-50'
                          : 'border-slate-300'
                      }`}
                    />
                  </td>
                  <td className="p-3">
                    <input type="number" step={0.01} min={0} max={100} value={r.fidelidad}
                      onChange={(e) => onCellChange(r.departamento, 'fidelidad', e.target.value)}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="p-3">
                    <input type="number" step={0.01} min={0} value={r.error}
                      onChange={(e) => onCellChange(r.departamento, 'error', e.target.value)}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2">
          <input type="text" value={nuevoDepto}
            onChange={(e) => setNuevoDepto(e.target.value.toUpperCase())}
            placeholder="Nuevo departamento..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button onClick={agregarDepto} disabled={!nuevoDepto.trim()}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            + Agregar
          </button>
        </div>
      </div>
    </div>
  )
}
