import { useEffect, useState } from 'react'

const FRASES = [
  'Preparando todo para ti...',
  'Cargando informacion...',
  'Un momento por favor...',
  'Organizando los datos...',
  'Casi listo...',
  'Obteniendo la informacion mas reciente...',
]

export function LoadingScreen({ mensaje }: { mensaje?: string }) {
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndice((prev) => (prev + 1) % FRASES.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-6 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      <p className="text-sm text-slate-500 transition-opacity duration-300">
        {mensaje ?? FRASES[indice]}
      </p>
    </div>
  )
}
