import { useParams, Link } from 'react-router-dom'
import { DEPARTAMENTOS_POR_DIRECCION, type Direcciones } from '../types'
import { useState } from 'react'

const NOMBRE_DEPARTAMENTO: Record<string, string> = {}
for (const deptos of Object.values(DEPARTAMENTOS_POR_DIRECCION)) {
  for (const d of deptos) {
    NOMBRE_DEPARTAMENTO[d.toLowerCase().replace(/\s+/g, '-')] = d
  }
}

function encontrarDireccion(slug: string): Direcciones | null {
  for (const [dir, deptos] of Object.entries(DEPARTAMENTOS_POR_DIRECCION)) {
    if (deptos.some((d) => d.toLowerCase().replace(/\s+/g, '-') === slug)) {
      return dir as Direcciones
    }
  }
  return null
}

export function Departamento() {
  const { slug } = useParams<{ slug: string }>()
  const nombre = slug ? NOMBRE_DEPARTAMENTO[slug] : undefined
  const direccion = slug ? encontrarDireccion(slug) : null
  const [corteMes, setCorteMes] = useState(new Date().toISOString().slice(0, 7))

  if (!nombre || !direccion) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-lg text-slate-500">Departamento no encontrado</p>
        <Link to="/" className="text-blue-600 hover:underline">Volver al inicio</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="mb-2 inline-block text-sm text-blue-600 hover:underline">← Volver al panel</Link>
        <h1 className="text-2xl font-bold text-slate-800">{nombre}</h1>
        <p className="text-slate-500">{direccion}</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Corte mensual</label>
          <input
            type="month"
            value={corteMes}
            onChange={(e) => setCorteMes(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
          />
        </div>
        <button className="mt-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
          + Nueva evaluación
        </button>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Informes semanales</h2>
          <span className="text-sm text-slate-400">{corteMes}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 font-medium">Semana</th>
                <th className="pb-3 font-medium">Puntaje</th>
                <th className="pb-3 font-medium">Observaciones</th>
                <th className="pb-3 font-medium">Evaluador</th>
                <th className="pb-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 text-slate-500">
                <td colSpan={5} className="py-8 text-center">
                  No hay evaluaciones registradas para este período
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
