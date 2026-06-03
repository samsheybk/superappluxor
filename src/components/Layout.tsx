import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MiniGame } from './MiniGame'
import { IconJuego } from './Icons'

export function Layout() {
  const [gameOpen, setGameOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden pt-14 lg:pt-0">
        <Outlet />
      </main>

      <button
        onClick={() => setGameOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-110 hover:bg-blue-700 active:scale-95"
        title="Mini juego"
      >
        <IconJuego className="h-6 w-6" />
      </button>

      {gameOpen && <MiniGame cerrar={() => setGameOpen(false)} />}
    </div>
  )
}
