import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden pt-14 lg:pt-0 lg:pl-[10px]">
        <div className="p-4 lg:py-8 lg:pr-[10px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
