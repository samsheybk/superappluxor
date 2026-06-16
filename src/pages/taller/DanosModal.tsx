import { useNavigate } from 'react-router-dom'

interface Props {
  vehiculoId: string
  onClose: () => void
}

export function DanosModal({ vehiculoId, onClose }: Props) {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-bold text-slate-800">Nueva inspeccion</h2>
        <p className="mb-4 text-sm text-slate-600">
          La inspeccion incluye marcado de daños y checklist de revision.
        </p>
        <div className="flex gap-2">
          <button onClick={() => { onClose(); navigate(`/taller/inspeccion/${vehiculoId}`) }}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Abrir inspeccion
          </button>
          <button onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
