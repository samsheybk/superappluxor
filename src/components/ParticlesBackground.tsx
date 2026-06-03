import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  hue: number
  shape: 'circle' | 'square' | 'triangle'
  rotation: number
  rotationSpeed: number
}

export function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particleCount = Math.min(150, Math.floor((window.innerWidth * window.innerHeight) / 6000))

    const shapes: Particle['shape'][] = ['circle', 'square', 'triangle']
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas!.width,
      y: Math.random() * canvas!.height,
      size: 2 + Math.random() * 4,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: -0.2 - Math.random() * 0.4,
      opacity: 0.15 + Math.random() * 0.35,
      hue: 200 + Math.random() * 60,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
    }))

    let animationId: number

    function drawShape(p: Particle) {
      ctx!.save()
      ctx!.translate(p.x, p.y)
      ctx!.rotate(p.rotation)
      ctx!.globalAlpha = p.opacity
      ctx!.fillStyle = `hsl(${p.hue}, 60%, 60%)`

      const s = p.size
      switch (p.shape) {
        case 'circle':
          ctx!.beginPath()
          ctx!.arc(0, 0, s, 0, Math.PI * 2)
          ctx!.fill()
          break
        case 'square':
          ctx!.fillRect(-s, -s, s * 2, s * 2)
          break
        case 'triangle':
          ctx!.beginPath()
          ctx!.moveTo(0, -s * 1.3)
          ctx!.lineTo(s * 1.3, s * 1.3)
          ctx!.lineTo(-s * 1.3, s * 1.3)
          ctx!.closePath()
          ctx!.fill()
          break
      }

      ctx!.restore()
    }

    let mouseX = -1000, mouseY = -1000

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      const mX = mouseX
      const mY = mouseY

      for (const p of particlesRef.current) {
        const dx = p.x - mX
        const dy = p.y - mY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150) {
          const force = (150 - dist) / 150
          p.x += (dx / dist) * force * 1.5
          p.y += (dy / dist) * force * 1.5
        }

        p.x += p.speedX
        p.y += p.speedY
        p.rotation += p.rotationSpeed

        if (p.y < -20) {
          p.y = canvas!.height + 10
          p.x = Math.random() * canvas!.width
        }
        if (p.x < -20) p.x = canvas!.width + 10
        if (p.x > canvas!.width + 20) p.x = -10

        drawShape(p)
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    function onMouse(e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
    }
    function onLeave() {
      mouseX = -1000
      mouseY = -1000
    }

    window.addEventListener('mousemove', onMouse)
    window.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}
