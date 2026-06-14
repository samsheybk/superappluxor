import { useState, useMemo } from 'react'
import { DEPARTAMENTOS_POR_DIRECCION, type Direcciones } from '../types'
import { indicadoresPorDepartamento } from '../data/indicadores'

const DIRECCIONES: Direcciones[] = ['Operaciones', 'Talento Humano', 'Comercial', 'Finanzas']

export function Documentacion() {
  const [deptoSeleccionado, setDeptoSeleccionado] = useState<string>('Supermercados')

  const deptosDisponibles = useMemo(() => {
    const todos: { dir: Direcciones; deptos: string[] }[] = []
    for (const dir of DIRECCIONES) {
      const d = DEPARTAMENTOS_POR_DIRECCION[dir].filter((nom) => indicadoresPorDepartamento(nom).length > 0)
      if (d.length > 0) todos.push({ dir, deptos: d })
    }
    return todos
  }, [])

  const indicador = indicadoresPorDepartamento(deptoSeleccionado)[0]

  return (
    <div className="lg:py-8 lg:pr-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Documentación de Indicadores</h1>
        <p className="mt-1 text-sm text-slate-500">Ficha técnica completa de cada indicador de gestión por departamento</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {deptosDisponibles.map(({ dir, deptos }) => (
          <div key={dir} className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">{dir}:</span>
            {deptos.map((d) => (
              <button key={d} onClick={() => setDeptoSeleccionado(d)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  deptoSeleccionado === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        ))}
      </div>

      {indicador ? (
        <div className="space-y-5">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-800">{indicador.titulo}</h2>

            <Section label="Introduccion">
              <p className="text-sm text-slate-600 leading-relaxed">{indicador.introduccion}</p>
            </Section>

            <Section label="Objetivo principal">
              <p className="text-sm font-medium text-slate-700">{indicador.objetivoPrincipal}</p>
            </Section>

            <Section label="Objetivos secundarios">
              <ul className="list-disc pl-5 space-y-1">
                {indicador.objetivosSecundarios.map((obj, i) => (
                  <li key={i} className="text-sm text-slate-600">{obj}</li>
                ))}
              </ul>
            </Section>

            <Section label="Metodo de evaluacion">
              <p className="text-sm text-slate-600 leading-relaxed">{indicador.metodoEvaluacion}</p>
            </Section>

            <Section label="Valoracion de los resultados">
              <p className="text-sm text-slate-600 leading-relaxed">{indicador.valoracionResultados}</p>
            </Section>

            <Section label="Impacto en el negocio">
              <p className="text-sm text-slate-600 leading-relaxed">{indicador.impactoNegocio}</p>
            </Section>

            <Section label="Responsables directos">
              <div className="flex flex-wrap gap-2">
                {indicador.responsablesDirectos.map((r, i) => (
                  <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{r}</span>
                ))}
              </div>
            </Section>

            <Section label="Frecuencia de medicion">
              <p className="text-sm text-slate-600">{indicador.frecuenciaMedicion}</p>
            </Section>

            <Section label="Departamento">
              <p className="text-sm font-medium text-blue-600">{indicador.departamento}</p>
            </Section>

            <Section label="Repercusion a nivel de la relacion laboral">
              <p className="text-sm text-slate-600 leading-relaxed">{indicador.repercusionLaboral}</p>
            </Section>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">No hay documentación disponible para {deptoSeleccionado}</p>
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</h3>
      {children}
    </div>
  )
}
