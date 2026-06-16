import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

const DEPARTAMENTOS = [
  'ADMINISTRACION', 'IMPUESTOS', 'SERVICIOS GENERALES',
  'MERCADEO', 'RRHH', 'SEGURIDAD', 'COMPRAS', 'SISTEMAS',
]

interface Presupuesto {
  id: string
  departamento: string
  mes: number
  anio: number
  presupuesto: number
  gasto: number
  observaciones: string
  created_at: string
}

export function Contabilidad() {
  const { user, perfil } = useAuth()

  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())

  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [formPres, setFormPres] = useState({ departamento: '', presupuesto: '', gasto: '', observaciones: '' })
  const [otroDepto, setOtroDepto] = useState('')

  const esAdmin = perfil?.rol === 'admin'

  useEffect(() => {
    cargarPresupuestos()
  }, [])

  async function cargarPresupuestos() {
    const { data } = await supabase.from('contabilidad_presupuestos').select('*').order('created_at', { ascending: false })
    if (data) setPresupuestos(data)
  }

  function presFiltrados() {
    return presupuestos.filter((p) => p.mes === mes && p.anio === anio)
  }

  function estadoPres(p: Presupuesto): 'OK' | 'Excedido' {
    return p.gasto <= p.presupuesto ? 'OK' : 'Excedido'
  }

  async function guardarPresupuesto(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setGuardando(true)
    try {
      const depto = formPres.departamento === '__otro__' ? otroDepto : formPres.departamento
      const { error: err } = await supabase.from('contabilidad_presupuestos').insert({
        departamento: depto,
        mes, anio,
        presupuesto: parseFloat(formPres.presupuesto) || 0,
        gasto: parseFloat(formPres.gasto) || 0,
        observaciones: formPres.observaciones,
        creado_por: user.id,
      })
      if (err) throw err
      setFormPres({ departamento: '', presupuesto: '', gasto: '', observaciones: '' })
      setOtroDepto('')
      setMensaje('Presupuesto registrado')
      cargarPresupuestos()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarPresupuesto(id: string) {
    await supabase.from('contabilidad_presupuestos').delete().eq('id', id)
    setPresupuestos(presupuestos.filter((p) => p.id !== id))
  }

  useEffect(() => {
    if (mensaje) { const t = setTimeout(() => setMensaje(''), 3000); return () => clearTimeout(t) }
  }, [mensaje])

  const filtrados = presFiltrados()

  return (
    <div>
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Finanzas</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Contabilidad</span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {mensaje && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{mensaje}</div>
      )}
        <div className="space-y-6">
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

          <form onSubmit={guardarPresupuesto} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-600">Registrar presupuesto mensual</h3>
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Departamento</label>
                <select required value={formPres.departamento}
                  onChange={(e) => setFormPres({ ...formPres, departamento: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleccione --</option>
                  {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
                  <option value="__otro__">Otra...</option>
                </select>
                {formPres.departamento === '__otro__' && (
                  <input type="text" required placeholder="Nombre del departamento" value={otroDepto}
                    onChange={(e) => setOtroDepto(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Presupuesto $</label>
                <input type="number" required min={0} step={0.01} value={formPres.presupuesto}
                  onChange={(e) => setFormPres({ ...formPres, presupuesto: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Gasto $</label>
                <input type="number" required min={0} step={0.01} value={formPres.gasto}
                  onChange={(e) => setFormPres({ ...formPres, gasto: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Observaciones</label>
                <input type="text" value={formPres.observaciones}
                  onChange={(e) => setFormPres({ ...formPres, observaciones: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <button type="submit" disabled={guardando}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Registrar'}
            </button>
          </form>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="p-3 font-medium">Departamento</th>
                  <th className="p-3 font-medium">Presupuesto</th>
                  <th className="p-3 font-medium">Gasto</th>
                  <th className="p-3 font-medium">Diferencia</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium">Observaciones</th>
                  {esAdmin && <th className="p-3 font-medium">Accion</th>}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={esAdmin ? 7 : 6} className="p-8 text-center text-slate-400">
                      No hay registros para {String(mes).padStart(2, '0')}/{anio}
                    </td>
                  </tr>
                ) : filtrados.map((p) => {
                  const est = estadoPres(p)
                  const dif = p.presupuesto - p.gasto
                  return (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="p-3 font-medium text-slate-800">{p.departamento}</td>
                      <td className="p-3 text-slate-600">${p.presupuesto.toFixed(2)}</td>
                      <td className="p-3 text-slate-600">${p.gasto.toFixed(2)}</td>
                      <td className={`p-3 font-medium ${dif >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${dif.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          est === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {est}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate p-3 text-slate-500">{p.observaciones || '-'}</td>
                      {esAdmin && (
                        <td className="p-3">
                          <button onClick={() => eliminarPresupuesto(p.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Eliminar
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
    </div>
  )
}
