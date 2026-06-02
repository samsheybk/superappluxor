import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import { DEPARTAMENTOS_POR_DIRECCION, type Direcciones } from '../types'
import { Link } from 'react-router-dom'
import { IconOperaciones, IconTalento, IconComercial, IconFinanzas } from '../components/Icons'

const DIRECCIONES: Direcciones[] = ['Operaciones', 'Talento Humano', 'Comercial', 'Finanzas']

const COLORES_DIR: Record<Direcciones, string> = {
  'Operaciones': '#3B82F6',
  'Talento Humano': '#10B981',
  'Comercial': '#F59E0B',
  'Finanzas': '#8B5CF6',
}

const ICONOS: Record<Direcciones, React.ReactNode> = {
  'Operaciones': <IconOperaciones className="h-6 w-6" />,
  'Talento Humano': <IconTalento className="h-6 w-6" />,
  'Comercial': <IconComercial className="h-6 w-6" />,
  'Finanzas': <IconFinanzas className="h-6 w-6" />,
}

const datosSemanales = [
  { semana: 'Sem 1', Operaciones: 78, 'Talento Humano': 85, Comercial: 72, Finanzas: 90 },
  { semana: 'Sem 2', Operaciones: 82, 'Talento Humano': 80, Comercial: 76, Finanzas: 88 },
  { semana: 'Sem 3', Operaciones: 75, 'Talento Humano': 88, Comercial: 80, Finanzas: 85 },
  { semana: 'Sem 4', Operaciones: 80, 'Talento Humano': 82, Comercial: 78, Finanzas: 92 },
]

const datosDirecciones = DIRECCIONES.map((dir) => ({
  name: dir,
  value: DEPARTAMENTOS_POR_DIRECCION[dir].length,
  color: COLORES_DIR[dir],
}))

const datosGenerales = [
  { mes: 'Ene', puntaje: 82 },
  { mes: 'Feb', puntaje: 78 },
  { mes: 'Mar', puntaje: 85 },
  { mes: 'Abr', puntaje: 80 },
  { mes: 'May', puntaje: 88 },
  { mes: 'Jun', puntaje: 84 },
]

const resumen = [
  { label: 'Departamentos', valor: '21', cambio: '+0', color: 'text-blue-600' },
  { label: 'Evaluaciones este mes', valor: '0', cambio: '0', color: 'text-emerald-600' },
  { label: 'Puntaje promedio', valor: '--', cambio: '--', color: 'text-amber-600' },
  { label: 'Direcciones', valor: '4', cambio: '+0', color: 'text-purple-600' },
]

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">Resumen general de evaluaciones de desempeno</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {resumen.map((item) => (
          <div key={item.label} className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className={`mt-1 text-3xl font-bold ${item.color}`}>{item.valor}</p>
            <p className="mt-1 text-xs text-slate-400">{item.cambio} vs mes anterior</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Evolucion mensual</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={datosGenerales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="puntaje" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Departamentos por direccion</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={datosDirecciones} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {datosDirecciones.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Puntaje semanal por direccion</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={datosSemanales}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="semana" stroke="#94a3b8" fontSize={12} />
            <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
            <Tooltip />
            <Bar dataKey="Operaciones" fill={COLORES_DIR['Operaciones']} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Talento Humano" fill={COLORES_DIR['Talento Humano']} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Comercial" fill={COLORES_DIR['Comercial']} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Finanzas" fill={COLORES_DIR['Finanzas']} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {DIRECCIONES.map((dir) => (
          <div key={dir} className={`rounded-xl border-l-4 p-5 shadow-sm`} style={{ borderColor: COLORES_DIR[dir], backgroundColor: `${COLORES_DIR[dir]}10` }}>
            <div className="mb-3 flex items-center gap-2 text-slate-600">
              {ICONOS[dir]}
              <h2 className="text-lg font-semibold text-slate-800">{dir}</h2>
            </div>
            <div className="space-y-2">
              {DEPARTAMENTOS_POR_DIRECCION[dir].map((depto) => (
                <Link
                  key={depto}
                  to={`/departamento/${depto.toLowerCase().replace(/\s+/g, '-')}`}
                  className="flex items-center justify-between rounded-lg bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
                >
                  <span>{depto}</span>
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
