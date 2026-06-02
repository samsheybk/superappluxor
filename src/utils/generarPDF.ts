import { jsPDF } from 'jspdf'

interface ComentarioPDF {
  concepto: string
  criticidad: string
  penalizacion: number
  texto: string
}

interface AreaPDF {
  nombre: string
  peso: number
  comentarios: ComentarioPDF[]
  fotos: string[]
}

interface DatosPDF {
  supermercadoNombre: string
  fechaInicio: string
  fechaCierre: string | null
  evaluadorNombre: string
  firma: string | null
  areas: AreaPDF[]
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

export async function generarPDF(datos: DatosPDF): Promise<string> {
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
  doc.text('Super EvaLuxor', margin, y)
  saltar(8)

  doc.setFontSize(13)
  doc.text('Evaluacion de Desempeno', margin, y)
  saltar(6)

  lineaH('#3b82f6')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  doc.setFont('helvetica', 'bold')
  doc.text('Supermercado:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(datos.supermercadoNombre, margin + 35, y)
  saltar(LH)

  doc.setFont('helvetica', 'bold')
  doc.text('Inicio:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(datos.fechaInicio, margin + 35, y)
  saltar(LH)

  doc.setFont('helvetica', 'bold')
  doc.text('Cierre:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(datos.fechaCierre ?? '—', margin + 35, y)
  saltar(LH)

  doc.setFont('helvetica', 'bold')
  doc.text('Evaluador:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(datos.evaluadorNombre, margin + 35, y)
  saltar(LH + 2)

  if (datos.firma) {
    doc.setFont('helvetica', 'bold')
    doc.text('Firma del gerente:', margin, y)
    saltar(LH)
    try {
      doc.addImage(datos.firma, 'PNG', margin + 10, y, 50, 15)
    } catch {
      doc.text('(imagen de firma no disponible)', margin + 10, y + 5)
    }
    saltar(22)
  }

  lineaH('#94a3b8')
  saltar(2)

  let totalEarned = 0
  let totalMax = 0

  for (const area of datos.areas) {
    if (y > doc.internal.pageSize.height - 40) {
      doc.addPage()
      y = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(area.nombre, margin, y)
    saltar(LH)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Peso base: ${area.peso} pts`, margin + 2, y)
    saltar(LH)

    let areaPen = 0

    for (const cm of area.comentarios) {
      if (y > doc.internal.pageSize.height - 30) {
        doc.addPage()
        y = 20
      }

      areaPen += cm.penalizacion
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      const nivelColor =
        cm.criticidad === 'ALTO' ? '#dc2626' :
        cm.criticidad === 'MEDIO' ? '#d97706' : '#16a34a'
      doc.setTextColor(nivelColor)
      doc.text(`${cm.criticidad} (-${cm.penalizacion})`, margin + 2, y)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#1e293b')
      doc.text(cm.concepto, margin + 30, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#475569')
      y = textoAjustado(doc, cm.texto, margin + 55, y, maxWidth - 55, LH)
    }

    for (const foto of area.fotos) {
      if (y > doc.internal.pageSize.height - 50) {
        doc.addPage()
        y = 20
      }
      doc.setTextColor('#000000')
      doc.text('— Foto —', margin + 2, y)
      saltar(LH)
      try {
        const imgWidth = 70
        const imgHeight = 50
        doc.addImage(foto, 'JPEG', margin + 2, y, imgWidth, imgHeight)
        saltar(imgHeight + 4)
      } catch {
        doc.text('(imagen no disponible)', margin + 2, y + 5)
        saltar(LH)
      }
    }

    if (area.comentarios.length === 0 && area.fotos.length === 0) {
      doc.setTextColor('#94a3b8')
      doc.text('Sin comentarios', margin + 4, y)
      saltar(LH)
    }

    const areaScore = Math.max(0, area.peso - areaPen)
    totalEarned += areaScore
    totalMax += area.peso

    doc.setTextColor('#2563eb')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`Puntaje: ${areaScore} / ${area.peso} pts${areaPen > 0 ? ` (-${areaPen})` : ''}`, margin + 2, y)
    saltar(LH + 1)
    doc.setTextColor('#000000')

    lineaH('#e2e8f0')
  }

  saltar(4)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor('#1e40af')
  doc.text(`Puntaje Total: ${totalEarned} / ${totalMax} pts`, margin, y)
  saltar(6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor('#94a3b8')
  doc.text(`Documento generado el ${new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, y)

  return doc.output('datauristring')
}
