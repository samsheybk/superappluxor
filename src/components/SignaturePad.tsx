import { useRef, useEffect, useState } from 'react'

interface SignaturePadProps {
  value?: string | null
  onChange: (dataUrl: string | null) => void
  disabled?: boolean
}

export function SignaturePad({ value, onChange, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2

    if (value) {
      const img = new Image()
      img.src = value
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [value])

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    if (disabled) return
    e.preventDefault()
    setIsDrawing(true)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing || disabled) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function stopDrawing() {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current!
    const dataUrl = canvas.toDataURL('image/png')
    onChange(dataUrl)
  }

  function handleClear() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          className="w-full rounded-lg border border-slate-300 bg-white"
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!value && !isDrawing && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-3 text-sm text-slate-400 select-none">
            Firma del gerente del supermercado
          </div>
        )}
      </div>
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-red-500 hover:underline"
        >
          Limpiar firma
        </button>
      )}
    </div>
  )
}
