import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { jsPDF } from 'jspdf'

interface ReporteData {
  id: string
  planta_id: string
  supermercado: string
  planta_nombre: string
  usuario: string
  detalle: string
  fotos: { base64: string; comentario: string }[]
  created_at: string
}

function imgDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })
}

export function ReporteFalla() {
  const { id } = useParams()
  const [reporte, setReporte] = useState<ReporteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const { data, error } = await supabase.from('reportes_falla').select('*').eq('id', id).single()
      if (error) setError('Reporte no encontrado')
      else setReporte(data as unknown as ReporteData)
      setLoading(false)
    })()
  }, [id])

  async function descargarPDF() {
    if (!reporte) return
    setDescargando(true)
    try {
      const doc = new jsPDF()
      let y = 20
      const margin = 20
      const maxWidth = doc.internal.pageSize.width - margin * 2
      const LH = 6

      function saltar(h: number) {
        y += h
        if (y > doc.internal.pageSize.height - 20) { doc.addPage(); y = 20 }
      }

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Super App Luxor', margin, y)
      saltar(8)

      doc.setFontSize(14)
      doc.text('Reporte de Falla', margin, y)
      saltar(10)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(`Supermercado:`, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.text(reporte.supermercado, margin + 35, y)
      saltar(LH + 1)

      doc.setFont('helvetica', 'bold')
      doc.text(`Planta:`, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.text(reporte.planta_nombre, margin + 35, y)
      saltar(LH + 1)

      doc.setFont('helvetica', 'bold')
      doc.text(`Reportado por:`, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.text(reporte.usuario, margin + 35, y)
      saltar(LH + 1)

      doc.setFont('helvetica', 'bold')
      doc.text(`Fecha:`, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(reporte.created_at).toLocaleString('es-VE', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }), margin + 35, y)
      saltar(LH + 3)

      doc.line(margin, y, margin + maxWidth, y)
      saltar(4)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Descripcion de la falla:', margin, y)
      saltar(LH)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)

      const palabras = reporte.detalle.split(' ')
      let linea = ''
      let yy = y
      for (const p of palabras) {
        const test = linea ? `${linea} ${p}` : p
        if (doc.getTextWidth(test) > maxWidth - 8 && linea) {
          doc.text(linea, margin + 4, yy)
          linea = p
          yy += LH
        } else {
          linea = test
        }
      }
      if (linea) { doc.text(linea, margin + 4, yy); yy += LH }
      y = yy + 4

      if (reporte.fotos && reporte.fotos.length > 0) {
        doc.line(margin, y, margin + maxWidth, y)
        saltar(4)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.text('Fotos:', margin, y)
        saltar(LH + 2)

        for (const foto of reporte.fotos) {
          if (y > doc.internal.pageSize.height - 50) { doc.addPage(); y = 20 }
          try {
            const dims = await imgDimensions(foto.base64)
            const MAX_H = 50
            const ratio = dims.width / dims.height
            let imgW = ratio * MAX_H
            if (imgW > maxWidth - 8) imgW = maxWidth - 8
            const imgH = imgW / ratio
            const fmt = foto.base64.startsWith('data:image/png') ? 'PNG' : 'JPEG'
            doc.addImage(foto.base64, fmt, margin + 4, y, imgW, imgH)
            y += imgH + 2
            if (foto.comentario) {
              doc.setFont('helvetica', 'italic')
              doc.setFontSize(9)
              doc.text(foto.comentario, margin + 4, y)
              y += LH + 2
            }
          } catch {
            doc.text('(imagen no disponible)', margin + 4, y + 5)
            y += LH + 4
          }
        }
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor('#94a3b8')
      y = Math.max(y, doc.internal.pageSize.height - 30)
      doc.text(`Documento generado el ${new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, y)

      const dataUri = doc.output('datauristring')
      const blob = await (await fetch(dataUri)).blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } finally {
      setDescargando(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="text-sm text-slate-500">Cargando reporte...</div>
    </div>
  )

  if (error || !reporte) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-slate-500">{error || 'Reporte no encontrado'}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-800">Reporte de Falla</h1>
              <p className="text-xs text-slate-400">
                {new Date(reporte.created_at).toLocaleDateString('es-VE', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <button onClick={descargarPDF} disabled={descargando}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {descargando ? 'Generando...' : 'Descargar PDF'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 text-sm">
            <div>
              <span className="font-medium text-slate-600">Supermercado:</span>
              <p className="text-slate-800">{reporte.supermercado}</p>
            </div>
            <div>
              <span className="font-medium text-slate-600">Planta:</span>
              <p className="text-slate-800">{reporte.planta_nombre}</p>
            </div>
            <div>
              <span className="font-medium text-slate-600">Reportado por:</span>
              <p className="text-slate-800">{reporte.usuario}</p>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Detalle de la falla</h2>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {reporte.detalle}
            </p>
          </div>

          {reporte.fotos && reporte.fotos.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-700">
                Fotos ({reporte.fotos.length})
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {reporte.fotos.map((foto, i) => (
                  <div key={i} className="overflow-hidden rounded-lg border border-slate-200">
                    <img src={foto.base64} alt={`Foto ${i + 1}`}
                      className="h-36 w-full object-cover"
                    />
                    {foto.comentario && (
                      <p className="border-t border-slate-200 px-2 py-1.5 text-xs text-slate-600">
                        {foto.comentario}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
