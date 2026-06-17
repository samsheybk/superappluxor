import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

interface Presupuesto {
  id: string
  departamento: string
  mes: number
  anio: number
  presupuesto: number
  gasto: number
  pagado: number
  observaciones: string
  created_at: string
}

export function Administracion() {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [pagadoEdit, setPagadoEdit] = useState<Record<string, string>>({})

  useEffect(() => {
    cargarDatos()
  }, [mes, anio])

  async function cargarDatos() {
    setLoading(true)
    const { data } = await supabase.from('contabilidad_presupuestos').select('*')
      .eq('mes', mes).eq('anio', anio)
      .order('departamento')
    if (data) setPresupuestos(data)
    setLoading(false)
  }

  async function guardarPagado(id: string) {
    const val = parseFloat(pagadoEdit[id]) || 0
    await supabase.from('contabilidad_presupuestos').update({ pagado: val }).eq('id', id)
    setPresupuestos(presupuestos.map((p) => p.id === id ? { ...p, pagado: val } : p))
    const copy = { ...pagadoEdit }; delete copy[id]; setPagadoEdit(copy)
  }

  useEffect(() => {
    if (mensaje) { const t = setTimeout(() => setMensaje(''), 3000); return () => clearTimeout(t) }
  }, [mensaje])

  return (
    <div className="space-y-6">
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Finanzas</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Administracion</span>
      </div>

      {mensaje && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{mensaje}</div>
      )}

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
              <th className="p-3 font-medium">Presupuesto</th>
              <th className="p-3 font-medium">Gasto</th>
              <th className="p-3 font-medium">Pagado</th>
              <th className="p-3 font-medium">Saldo pendiente</th>
              <th className="p-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {presupuestos.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No hay presupuestos para {String(mes).padStart(2, '0')}/{anio}
                </td>
              </tr>
            ) : presupuestos.map((p) => {
              const saldo = p.presupuesto - p.pagado
              const editando = p.id in pagadoEdit
              return (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="p-3 font-medium text-slate-800">{p.departamento}</td>
                  <td className="p-3 text-slate-600">${p.presupuesto.toFixed(2)}</td>
                  <td className="p-3 text-slate-600">${p.gasto.toFixed(2)}</td>
                  <td className="p-3">
                    {editando ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">$</span>
                        <input type="number" min={0} step={0.01} value={pagadoEdit[p.id]}
                          onChange={(e) => setPagadoEdit({ ...pagadoEdit, [p.id]: e.target.value })}
                          className="w-24 rounded border border-blue-300 px-2 py-1 text-xs focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => guardarPagado(p.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button onClick={() => {
                          const copy = { ...pagadoEdit }; delete copy[p.id]; setPagadoEdit(copy)
                        }}
                          className="text-red-400 hover:text-red-600"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600">${p.pagado.toFixed(2)}</span>
                        <button onClick={() => setPagadoEdit({ ...pagadoEdit, [p.id]: String(p.pagado) })}
                          className="text-slate-400 hover:text-blue-600"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                  <td className={`p-3 font-medium ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${saldo.toFixed(2)}
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.pagado <= p.presupuesto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.pagado <= p.presupuesto ? 'OK' : 'Excedido'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
