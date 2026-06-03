import { useCallback, useEffect, useRef } from 'react'

interface FallingProduct {
  x: number
  y: number
  w: number
  h: number
  label: string
  points: number
}

interface FallingPowerUp {
  x: number
  y: number
  w: number
  h: number
  type: PowerUp
}

type PowerUp = 'life' | 'magnet' | 'star' | 'mega' | 'slow'

interface Effect {
  type: PowerUp
  endFrame: number
}

const PRODUCTOS = [
  { label: '🍎', points: 10 },
  { label: '🥛', points: 15 },
  { label: '🧀', points: 20 },
  { label: '🥩', points: 25 },
  { label: '🍞', points: 5 },
  { label: '🥦', points: 10 },
  { label: '🧃', points: 8 },
  { label: '🍪', points: 12 },
]

const POWERUPS: { type: PowerUp; label: string }[] = [
  { type: 'life', label: '❤️' },
  { type: 'magnet', label: '🧲' },
  { type: 'star', label: '⭐' },
  { type: 'mega', label: '🛒' },
  { type: 'slow', label: '🐌' },
]

const POWERUP_DURATION: Record<PowerUp, number> = {
  life: 0,
  magnet: 480,
  star: 900,
  mega: 600,
  slow: 480,
}

const BASE_CART_W = 70
const CART_H = 50
const W = 400
const H = 500
const MAX_CONCURRENT = 3
const MAX_LIVES = 5

function drawHearts(ctx: CanvasRenderingContext2D, lives: number) {
  ctx.font = '18px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  let h = ''
  for (let i = 0; i < lives; i++) h += '❤️'
  ctx.fillText(h, W - 10, 10)
}

function drawActiveEffects(ctx: CanvasRenderingContext2D, effects: Effect[], frame: number) {
  const labels: Record<PowerUp, string> = {
    life: '❤️', magnet: '🧲', star: '⭐', mega: '🛒', slow: '🐌',
  }
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  let x = 10
  for (const e of effects) {
    if (e.endFrame <= frame) continue
    const remaining = Math.ceil((e.endFrame - frame) / 60)
    ctx.fillStyle = '#fbbf24'
    ctx.fillText(`${labels[e.type]} ${remaining}s`, x, 50)
    x += ctx.measureText(`${labels[e.type]} ${remaining}s`).width + 12
  }
}

export function MiniGame({ cerrar }: { cerrar: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cartXRef = useRef(W / 2 - BASE_CART_W / 2)
  const productsRef = useRef<FallingProduct[]>([])
  const powerupsRef = useRef<FallingPowerUp[]>([])
  const effectsRef = useRef<Effect[]>([])
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const speedRef = useRef(1)
  const frameRef = useRef(0)
  const lastSpawnRef = useRef(0)
  const keysRef = useRef({ left: false, right: false })
  const gameOverRef = useRef(false)
  const milestoneRef = useRef(0)
  const mensajeRef = useRef('')
  const mensajeTimerRef = useRef(0)

  const startGame = useCallback(() => {
    scoreRef.current = 0
    livesRef.current = 3
    speedRef.current = 1
    frameRef.current = 0
    lastSpawnRef.current = 0
    productsRef.current = []
    powerupsRef.current = []
    effectsRef.current = []
    gameOverRef.current = false
    milestoneRef.current = 0
    mensajeRef.current = ''
    mensajeTimerRef.current = 0
    cartXRef.current = W / 2 - BASE_CART_W / 2
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = W
    canvas.height = H

    startGame()

    function getCartWidth(): number {
      const hasMega = effectsRef.current.some(
        e => e.type === 'mega' && e.endFrame > frameRef.current
      )
      return hasMega ? BASE_CART_W * 3 : BASE_CART_W
    }

    function spawnItem() {
      if (productsRef.current.length >= MAX_CONCURRENT) return

      const isPowerUp = Math.random() < 0.2
      if (isPowerUp) {
        const p = POWERUPS[Math.floor(Math.random() * POWERUPS.length)]
        powerupsRef.current.push({
          x: Math.random() * (W - 40) + 5,
          y: -30,
          w: 36,
          h: 30,
          type: p.type,
        })
      } else {
        const p = PRODUCTOS[Math.floor(Math.random() * PRODUCTOS.length)]
        productsRef.current.push({
          x: Math.random() * (W - 46) + 5,
          y: -30,
          w: 36,
          h: 30,
          label: p.label,
          points: p.points,
        })
      }
    }

    function applyEffect(type: PowerUp) {
      const dur = POWERUP_DURATION[type]
      if (dur === 0) {
        if (type === 'life') livesRef.current = Math.min(livesRef.current + 1, MAX_LIVES)
        return
      }

      if (type === 'slow') {
        speedRef.current = Math.max(0.5, speedRef.current - 1)
      }

      const existing = effectsRef.current.find(e => e.type === type)
      if (existing) {
        existing.endFrame = frameRef.current + dur
      } else {
        effectsRef.current.push({ type, endFrame: frameRef.current + dur })
      }
    }

    let animId: number

    function gameLoop() {
      const c = ctx!
      const frame = frameRef.current

      c.clearRect(0, 0, W, H)
      c.fillStyle = '#0f172a'
      c.fillRect(0, 0, W, H)

      if (gameOverRef.current) {
        c.fillStyle = 'white'
        c.font = 'bold 24px sans-serif'
        c.textAlign = 'center'
        c.fillText('Game Over', W / 2, H / 2 - 20)
        c.font = '18px sans-serif'
        c.fillText(`Puntaje: ${scoreRef.current}`, W / 2, H / 2 + 20)
        c.font = '14px sans-serif'
        c.fillStyle = '#94a3b8'
        c.fillText('Click "Reiniciar" para jugar de nuevo', W / 2, H / 2 + 60)
        animId = requestAnimationFrame(gameLoop)
        return
      }

      frameRef.current++
      const cartW = getCartWidth()
      const cartX = cartXRef.current
      const MAX_Y = H - CART_H

      if (keysRef.current.left) cartXRef.current = Math.max(0, cartXRef.current - 5)
      if (keysRef.current.right) cartXRef.current = Math.min(W - cartW, cartXRef.current + 5)

      if (frame - lastSpawnRef.current > Math.max(15, 40 - speedRef.current * 2)) {
        spawnItem()
        lastSpawnRef.current = frame
      }

      if (frame % 180 === 0) {
        speedRef.current = Math.min(speedRef.current + 0.15, 4)
      }

      const hasMagnet = effectsRef.current.some(
        e => e.type === 'magnet' && e.endFrame > frame
      )
      const hasStar = effectsRef.current.some(
        e => e.type === 'star' && e.endFrame > frame
      )

      for (let i = productsRef.current.length - 1; i >= 0; i--) {
        const p = productsRef.current[i]
        p.y += 1.2 * speedRef.current

        if (hasMagnet) {
          const cx = cartX + cartW / 2
          const dx = cx - (p.x + p.w / 2)
          p.x += dx * 0.06
        }

        if (
          p.y + p.h >= MAX_Y &&
          p.y + p.h <= H &&
          p.x + p.w > cartX &&
          p.x < cartX + cartW
        ) {
          scoreRef.current += p.points
          const s = scoreRef.current
          if (milestoneRef.current === 0 && s >= 100) {
            milestoneRef.current = 100
            mensajeRef.current = '🎉 100 puntos!'
            mensajeTimerRef.current = 120
          } else if (milestoneRef.current < 500 && s >= 500) {
            milestoneRef.current = 500
            mensajeRef.current = '🎉 500 puntos!'
            mensajeTimerRef.current = 120
          } else if (s >= 1000) {
            const ms = Math.floor(s / 1000)
            const prev = Math.floor(milestoneRef.current / 1000)
            if (ms > prev) {
              milestoneRef.current = ms * 1000
              mensajeRef.current = `🎉 ${ms}000 puntos!`
              mensajeTimerRef.current = 120
            }
          }
          productsRef.current.splice(i, 1)
          continue
        }

        if (p.y > H) {
          if (!hasStar) {
            livesRef.current--
            if (livesRef.current <= 0) {
              gameOverRef.current = true
              productsRef.current = []
              powerupsRef.current = []
            }
          }
          productsRef.current.splice(i, 1)
        }
      }

      for (let i = powerupsRef.current.length - 1; i >= 0; i--) {
        const p = powerupsRef.current[i]
        p.y += 1.2 * speedRef.current

        if (
          p.y + p.h >= MAX_Y &&
          p.y + p.h <= H &&
          p.x + p.w > cartX &&
          p.x < cartX + cartW
        ) {
          applyEffect(p.type)
          powerupsRef.current.splice(i, 1)
          continue
        }

        if (p.y > H) {
          powerupsRef.current.splice(i, 1)
        }
      }

      effectsRef.current = effectsRef.current.filter(e => e.endFrame > frame)

      for (const p of productsRef.current) {
        c.font = '22px sans-serif'
        c.textAlign = 'center'
        c.textBaseline = 'middle'
        c.fillText(p.label, p.x + p.w / 2, p.y + p.h / 2)
      }

  const PU_LABELS: Record<PowerUp, string> = {
    life: '❤️', magnet: '🧲', star: '⭐', mega: '🛒', slow: '🐌',
  }

  for (const p of powerupsRef.current) {
    c.font = '22px sans-serif'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(PU_LABELS[p.type], p.x + p.w / 2, p.y + p.h / 2)
  }

  const hasMega = effectsRef.current.some(e => e.type === 'mega' && e.endFrame > frame)
      const cy = H - CART_H / 2
      c.font = hasMega ? '72px sans-serif' : '48px sans-serif'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('🛒', cartX + cartW / 2, cy)

      drawHearts(c, livesRef.current)
      drawActiveEffects(c, effectsRef.current, frame)

      c.fillStyle = 'white'
      c.font = 'bold 16px sans-serif'
      c.textAlign = 'left'
      c.textBaseline = 'top'
      c.fillText(`Puntaje: ${scoreRef.current}`, 10, 10)

      if (mensajeTimerRef.current > 0) {
        mensajeTimerRef.current--
        c.font = 'bold 22px sans-serif'
        c.textAlign = 'center'
        c.textBaseline = 'middle'
        const alpha = Math.min(1, mensajeTimerRef.current / 30)
        c.fillStyle = `rgba(250,204,21,${alpha})`
        c.fillText(mensajeRef.current, W / 2, H / 2 - 40)
      }

      c.fillStyle = '#94a3b8'
      c.font = '12px sans-serif'
      c.fillText(`Velocidad: ${speedRef.current.toFixed(1)}x`, 10, 32)

      animId = requestAnimationFrame(gameLoop)
    }

    gameLoop()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') keysRef.current.left = e.type === 'keydown'
      if (e.key === 'ArrowRight') keysRef.current.right = e.type === 'keydown'
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [startGame])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="rounded-2xl bg-slate-800 p-4 shadow-2xl">
        <canvas
          ref={canvasRef}
          className="rounded-xl"
          onMouseMove={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect()
            if (rect) {
              const x = e.clientX - rect.left
              const maxX = 400 - (effectsRef.current.some(
                e => e.type === 'mega' && e.endFrame > frameRef.current
              ) ? BASE_CART_W * 3 : BASE_CART_W)
              cartXRef.current = Math.max(0, Math.min(maxX, x - 35))
            }
          }}
        />
        <div className="mt-3 flex justify-between">
          <button
            onClick={startGame}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Reiniciar
          </button>
          <button
            onClick={cerrar}
            className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
