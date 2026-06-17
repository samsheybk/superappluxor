import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DEPARTAMENTOS_POR_DIRECCION, type Direcciones } from '../types'
import {
  IconDashboard, IconOperaciones, IconTalento, IconComercial, IconFinanzas, IconSeguridad,
  IconChevronDown, IconCerrar,
} from './Icons'

const DIRECCIONES: Direcciones[] = ['Operaciones', 'Talento Humano', 'Comercial', 'Finanzas']

const ICONOS_DIR: Record<Direcciones, typeof IconOperaciones> = {
  'Operaciones': IconOperaciones,
  'Talento Humano': IconTalento,
  'Comercial': IconComercial,
  'Finanzas': IconFinanzas,
}

export function Sidebar() {
  const [abierto, setAbierto] = useState(false)
  const [direccionAbierta, setDireccionAbierta] = useState<Direcciones | null>(null)
  const [seguridadAbierto, setSeguridadAbierto] = useState(false)
  const { signOut, user, perfil } = useAuth()

  return (
    <>
      {/* Top navigation bar for mobile */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-slate-900 px-4 py-3 text-white lg:hidden">
        <button
          className="rounded-lg p-1.5 hover:bg-slate-800"
          onClick={() => setAbierto(!abierto)}
          aria-label="Menu"
        >
          {abierto ? <IconCerrar /> : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        <img src="/logo_fusion_luxor_euromaxx.webp" alt="Super App Luxor" className="h-8 w-8 rounded-lg object-contain" />
        <span className="text-sm font-bold">Super App Luxor</span>
      </nav>

      {/* Overlay for mobile */}
      {abierto && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setAbierto(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-900 text-white transition-transform pt-14
        lg:static lg:sticky lg:top-0 lg:translate-x-0 lg:h-screen lg:pt-0
        ${abierto ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="hidden lg:flex items-center gap-3 border-b border-slate-700 p-5">
          <img src="/logo_fusion_luxor_euromaxx.webp" alt="Super App Luxor" className="h-10 w-10 rounded-lg object-contain" />
          <div>
            <h1 className="text-lg font-bold">Super App Luxor</h1>
            <p className="text-xs text-slate-400">Evaluaciones de desempeno</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <NavLink
            to="/"
            end
            onClick={() => setAbierto(false)}
            className={({ isActive }) =>
              `mb-2 flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`
            }
          >
            <IconDashboard />
            Dashboard
          </NavLink>

          {DIRECCIONES.map((dir) => {
            const IconDir = ICONOS_DIR[dir]
            return (
              <div key={dir} className="mb-1">
                <button
                  onClick={() => setDireccionAbierta(direccionAbierta === dir ? null : dir)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-colors hover:bg-slate-800 ${direccionAbierta === dir ? 'bg-slate-800' : ''}`}
                >
                  <IconDir />
                  <span className="flex-1 font-medium">{dir}</span>
                  <IconChevronDown className={`h-4 w-4 transition-transform ${direccionAbierta === dir ? 'rotate-180' : ''}`} />
                </button>
                {direccionAbierta === dir && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-3">
                    {DEPARTAMENTOS_POR_DIRECCION[dir].map((depto) => {
                      const path = depto === 'Supermercados'
                        ? '/operaciones/supermercados'
                        : `/departamento/${depto.toLowerCase().replace(/\s+/g, '-')}`
                      return (
                        <NavLink
                          key={depto}
                          to={path}
                          onClick={() => setAbierto(false)}
                          className={({ isActive }) =>
                            `block rounded-lg px-4 py-2 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
                          }
                        >
                          {depto}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          <div className="mb-1">
            <button
              onClick={() => setSeguridadAbierto(!seguridadAbierto)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-colors hover:bg-slate-800 ${seguridadAbierto ? 'bg-slate-800' : ''}`}
            >
              <IconSeguridad />
              <span className="flex-1 font-medium">Seguridad</span>
              <IconChevronDown className={`h-4 w-4 transition-transform ${seguridadAbierto ? 'rotate-180' : ''}`} />
            </button>
            {seguridadAbierto && (
              <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-3">
                <NavLink to="/seguridad/garita-1" onClick={() => setAbierto(false)}
                  className={({ isActive }) => `block rounded-lg px-4 py-2 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                >
                  Garita 1
                </NavLink>
                <NavLink to="/seguridad/garita-2" onClick={() => setAbierto(false)}
                  className={({ isActive }) => `block rounded-lg px-4 py-2 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                >
                  Garita 2
                </NavLink>
                <NavLink to="/seguridad/reportes-cctv" onClick={() => setAbierto(false)}
                  className={({ isActive }) => `block rounded-lg px-4 py-2 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                >
                  Reportes de CCTV
                </NavLink>
                <NavLink to="/seguridad/recorridos-qr" onClick={() => setAbierto(false)}
                  className={({ isActive }) => `block rounded-lg px-4 py-2 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                >
                  Recorridos QR
                </NavLink>
                <NavLink to="/seguridad/historial-entradas-salidas" onClick={() => setAbierto(false)}
                  className={({ isActive }) => `block rounded-lg px-4 py-2 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                >
                  Historial Entradas / Salidas
                </NavLink>
              </div>
            )}
          </div>

          {perfil?.rol === 'admin' && (
            <NavLink
              to="/admin/usuarios"
              onClick={() => setAbierto(false)}
              className={({ isActive }) =>
                `mb-2 flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`
              }
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Usuarios
            </NavLink>
          )}
          <NavLink
            to="/documentacion"
            onClick={() => setAbierto(false)}
            className={({ isActive }) =>
              `mb-2 flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`
            }
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Documentacion
          </NavLink>
          <NavLink to="/sitio" onClick={() => setAbierto(false)}
            className={({ isActive }) =>
              `mb-2 flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
            }
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            Sitio Luxor
          </NavLink>
        </div>

        <div className="border-t border-slate-700 p-4">
          <p className="truncate text-sm font-medium text-slate-200">{perfil?.username ?? user?.email}</p>
          <p className="text-xs text-slate-500">{perfil?.nombre ?? 'cargando...'} · <span className="capitalize">{perfil?.rol ?? ''}</span></p>
          <button onClick={signOut} className="mt-2 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-red-600 hover:text-white">
            Cerrar sesion
          </button>
        </div>
      </aside>
    </>
  )
}
