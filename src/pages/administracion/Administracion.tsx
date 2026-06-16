import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

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
  const { user, perfil } = useAuth()
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [limite, setLimite] = useState(0)
  const [limiteForm, setLimiteForm] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [pagadoEdit, setPagadoEdit] = useState<Record<string, string>>({})
  const esAdmin = perfil?.rol === 'admin'

  useEffect(() => {
    cargarDatos()
  }, [mes, anio])

  async function cargarDatos() {
    const [pRes, lRes] = await Promise.all([
      supabase.from('contabilidad_presupuestos').select('*')
        .eq('mes', mes).eq('anio', anio)
        .order('departamento'),
      supabase.from('administracion_limite_flujo').select('limite')
        .eq('mes', mes).eq('anio', anio).maybeSingle(),
    ])
    if (pRes.data) setPresupuestos(pRes.data)
    if (lRes.data) { setLimite(lRes.data.limite); setLimiteForm(String(lRes.data.limite)) }
    else { setLimite(0); setLimiteForm('') }
  }

  async function guardarLimite() {
    if (!user) return
    setGuardando(true)
    try {
      const val = parseFloat(limiteForm) || 0
      const existente = await supabase.from('administracion_limite_flujo')
        .select('id').eq('mes', mes).eq('anio', anio).maybeSingle()
      if (existente.data) {
        await supabase.from('administracion_limite_flujo').update({ limite: val }).eq('id', existente.data.id)
      } else {
        await supabase.from('administracion_limite_flujo').insert({ mes, anio, limite: val, creado_por: user.id })
      }
      setLimite(val)
      setMensaje('Limite guardado')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function guardarPagado(id: string) {
    const val = parseFloat(pagadoEdit[id]) || 0
    await supabase.from('contabilidad_presupuestos').update({ pagado: val }).eq('id', id)
    setPresupuestos(presupuestos.map((p) => p.id === id ? { ...p, pagado: val } : p))
    const copy = { ...pagadoEdit }; delete copy[id]; setPagadoEdit(copy)
  }

  const totalPagado = presupuestos.reduce((s, p) => s + p.pagado, 0)

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

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
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

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-600">Limite de flujo de caja</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className="mb-1 block text-xs font-medium text-slate-600">Monto maximo a pagar $</label>
            <input type="number" min={0} step={0.01} value={limiteForm}
              onChange={(e) => setLimiteForm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button onClick={guardarLimite} disabled={guardando}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar limite'}
          </button>
        </div>
        {limite > 0 && (
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-slate-500">Total pagado: <strong className="text-slate-700">${totalPagado.toFixed(2)}</strong></span>
            <span className="text-slate-500">Limite: <strong className="text-slate-700">${limite.toFixed(2)}</strong></span>
            <span className={`font-medium ${totalPagado <= limite ? 'text-green-600' : 'text-red-600'}`}>
              {totalPagado <= limite ? 'Dentro del limite' : `Excede por $${(totalPagado - limite).toFixed(2)}`}
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="p-3 font-medium">Departamento</th>
              <th className="p-3 font-medium">Presupuesto</th>
              <th className="p-3 font-medium">Gasto</th>
              <th className="p-3 font-medium">Pagado</th>
              <th className="p-3 font-medium">Saldo pendiente</th>
              <th className="p-3 font-medium">Estado</th>
              {esAdmin && <th className="p-3 font-medium">Accion</th>}
            </tr>
          </thead>
          <tbody>
            {presupuestos.length === 0 ? (
              <tr>
                <td colSpan={esAdmin ? 7 : 6} className="p-8 text-center text-slate-400">
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
                          className="text-xs text-blue-600 hover:underline"
                        >
                          OK
                        </button>
                        <button onClick={() => {
                          const copy = { ...pagadoEdit }; delete copy[p.id]; setPagadoEdit(copy)
                        }}
                          className="text-xs text-slate-400 hover:text-red-600"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-600">${p.pagado.toFixed(2)}</span>
                    )}
                  </td>
                  <td className={`p-3 font-medium ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${saldo.toFixed(2)}
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.gasto <= p.presupuesto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.gasto <= p.presupuesto ? 'OK' : 'Excedido'}
                    </span>
                  </td>
                  {esAdmin && (
                    <td className="p-3">
                      <button onClick={() => setPagadoEdit({ ...pagadoEdit, [p.id]: String(p.pagado) })}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Editar pago
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
