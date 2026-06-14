import { jsPDF } from 'jspdf'

interface FotoEntry {
  foto: string
  comentario: string
}

interface CategoriaPDF {
  titulo: string
  campos: { label: string; valor: string; fotos: FotoEntry[] }[]
}

interface DatosPDFTaller {
  placa: string
  marca: string
  modelo: string
  anio: number
  color: string
  tipo: string
  fechaInicio: string
  evaluadorNombre: string
  categorias: CategoriaPDF[]
  docs: { label: string; presente: boolean }[]
  observaciones: string
  firma: string | null
}

function imgDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })
}

function medida(texto: string, doc: jsPDF): number {
  return doc.getTextWidth(texto)
}

function textoAjustado(doc: jsPDF, texto: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const palabras = texto.split(' ')
  let linea = ''
  let yy = y
  for (const p of palabras) {
    const test = linea ? `${linea} ${p}` : p
    if (medida(test, doc) > maxWidth && linea) {
      doc.text(linea, x, yy)
      linea = p
      yy += lineHeight
    } else {
      linea = test
    }
  }
  if (linea) {
    doc.text(linea, x, yy)
    yy += lineHeight
  }
  return yy
}

export async function generarPDFTaller(datos: DatosPDFTaller): Promise<string> {
  const doc = new jsPDF()
  let y = 20
  const margin = 20
  const maxWidth = doc.internal.pageSize.width - margin * 2
  const LH = 6

  function saltar(h: number) {
    y += h
    if (y > doc.internal.pageSize.height - 20) {
      doc.addPage()
      y = 20
    }
  }

  function lineaH(color: string) {
    doc.setDrawColor(color)
    doc.setLineWidth(0.5)
    doc.line(margin, y, margin + maxWidth, y)
    saltar(4)
  }

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Super App Luxor', margin, y)
  saltar(8)

  doc.setFontSize(13)
  doc.text('Inspeccion de Vehiculo - Taller Automotriz', margin, y)
  saltar(6)

  lineaH('#3b82f6')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  const campos = [
    { label: 'Placa:', value: datos.placa },
    { label: 'Marca:', value: datos.marca },
    { label: 'Modelo:', value: datos.modelo },
    { label: 'Año:', value: String(datos.anio) },
    { label: 'Color:', value: datos.color },
    { label: 'Tipo:', value: datos.tipo },
    { label: 'Fecha:', value: datos.fechaInicio },
    { label: 'Evaluador:', value: datos.evaluadorNombre },
  ]

  for (const c of campos) {
    doc.setFont('helvetica', 'bold')
    doc.text(c.label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(c.value, margin + 28, y)
    saltar(LH)
  }

  saltar(2)
  lineaH('#94a3b8')
  saltar(2)

  for (const cat of datos.categorias) {
    if (y > doc.internal.pageSize.height - 40) {
      doc.addPage()
      y = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(cat.titulo, margin, y)
    saltar(LH + 1)

    doc.setFontSize(9)
    for (const campo of cat.campos) {
      if (y > doc.internal.pageSize.height - 30) {
        doc.addPage()
        y = 20
      }
      const colorVal =
        campo.valor === 'Bueno' ? '#16a34a' :
        campo.valor === 'Regular' ? '#d97706' : '#dc2626'
      doc.setTextColor(colorVal)
      doc.setFont('helvetica', 'bold')
      doc.text(campo.valor, margin + 2, y)
      doc.setTextColor('#1e293b')
      doc.setFont('helvetica', 'normal')
      doc.text(campo.label, margin + 16, y)
      saltar(LH)

      if (campo.fotos.length > 0) {
        const MAX_H = 36
        const GAP = 4
        let x = margin + 16
        for (const foto of campo.fotos) {
          if (y > doc.internal.pageSize.height - 50) {
            doc.addPage()
            y = 20
            x = margin + 16
          }
          try {
            const dims = await imgDimensions(foto.foto)
            const ratio = dims.width / dims.height
            let imgW = dims.height > MAX_H ? MAX_H * ratio : dims.width
            const imgH = dims.height > MAX_H ? MAX_H : dims.height
            const remaining = margin + maxWidth - x
            if (imgW > remaining) {
              if (imgW > maxWidth - 16) imgW = maxWidth - 16
              if (x !== margin + 16) {
                y += imgH + GAP
                x = margin + 16
              }
            }
            if (y > doc.internal.pageSize.height - 50) {
              doc.addPage()
              y = 20
              x = margin + 16
            }
            const fmt = foto.foto.startsWith('data:image/png') ? 'PNG' : 'JPEG'
            doc.addImage(foto.foto, fmt, x, y, imgW, imgH)
            if (foto.comentario) {
              doc.setFontSize(7)
              doc.setTextColor('#64748b')
              doc.text(foto.comentario, x, y + imgH + 3)
            }
            x += imgW + GAP
          } catch {
            doc.text('(img)', x, y + 5)
            x += 12
          }
        }
        y += MAX_H + 6
        doc.setTextColor('#1e293b')
        doc.setFontSize(9)
      }
    }
    lineaH('#e2e8f0')
  }

  if (y > doc.internal.pageSize.height - 40) {
    doc.addPage()
    y = 20
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Documentacion', margin, y)
  saltar(LH + 1)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const anyDocs = datos.docs.some((d) => d.presente)
  if (anyDocs) {
    for (const d of datos.docs) {
      if (d.presente) {
        doc.setTextColor('#16a34a')
        doc.text('✓', margin + 2, y)
        doc.setTextColor('#1e293b')
        doc.text(d.label, margin + 10, y)
        saltar(LH)
      }
    }
  } else {
    doc.setTextColor('#94a3b8')
    doc.text('Sin documentacion registrada', margin + 2, y)
    saltar(LH)
  }

  if (datos.observaciones) {
    saltar(2)
    doc.setTextColor('#1e293b')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Observaciones:', margin, y)
    saltar(LH)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor('#475569')
    y = textoAjustado(doc, datos.observaciones, margin + 2, y, maxWidth - 4, LH)
  }

  if (datos.firma) {
    saltar(4)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor('#1e293b')
    doc.text('Firma del evaluador:', margin, y)
    saltar(LH)
    try {
      const dims = await imgDimensions(datos.firma)
      const maxH = 18
      const ratio = dims.width / dims.height
      const fw = dims.height > maxH ? maxH * ratio : dims.width
      const fh = dims.height > maxH ? maxH : dims.height
      doc.addImage(datos.firma, 'PNG', margin + 10, y, fw, fh)
    } catch {
      doc.text('(imagen de firma no disponible)', margin + 10, y + 5)
    }
    saltar(22)
  }

  saltar(4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor('#94a3b8')
  doc.text(`Documento generado el ${new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, y)

  return doc.output('datauristring')
}
