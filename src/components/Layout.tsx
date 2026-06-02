import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 lg:pt-4 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
