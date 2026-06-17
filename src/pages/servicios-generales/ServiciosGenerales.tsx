import { Link } from 'react-router-dom'

export function ServiciosGenerales() {
  return (
    <div>
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-500">Operaciones</span>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Servicios generales</span>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <svg className="mb-4 h-16 w-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p className="text-lg font-medium text-slate-500">Departamento no incluido</p>
        <p className="mt-1 text-sm">Este departamento no sera incluido dentro del proyecto</p>
      </div>
    </div>
  )
}
