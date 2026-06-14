import { jsPDF } from 'jspdf'

const CATEGORIAS = [
  {
    id: 'limp', titulo: 'Limpieza',
    items: [
      { key: 'limp_cabina_interna', label: 'Cabina interna' },
      { key: 'limp_carroceria_externa', label: 'Carrocería externa' },
      { key: 'limp_area_carga', label: 'Área de carga' },
      { key: 'limp_parabrisas_ventanas', label: 'Parabrisas y ventanas' },
    ],
  },
  {
    id: 'elec', titulo: 'Eléctrico',
    items: [
      { key: 'elec_luces_principales', label: 'Luces principales' },
      { key: 'elec_luces_senalizacion', label: 'Luces de señalización' },
      { key: 'elec_luces_freno_retroceso', label: 'Luces freno/retroceso' },
      { key: 'elec_tablero_instrumentos', label: 'Tablero instrumentos' },
      { key: 'elec_limpia_parabrisas', label: 'Limpia parabrisas' },
      { key: 'elec_bateria', label: 'Batería' },
    ],
  },
  {
    id: 'mec', titulo: 'Mecánico',
    items: [
      { key: 'mec_fluidos', label: 'Niveles fluidos' },
      { key: 'mec_fugas', label: 'Fugas visibles' },
      { key: 'mec_frenos', label: 'Sistema frenos' },
      { key: 'mec_neumaticos', label: 'Neumáticos' },
      { key: 'mec_correas', label: 'Correas motor' },
      { key: 'mec_suspension_direccion', label: 'Suspensión/dirección' },
    ],
  },
  {
    id: 'est', titulo: 'Estética',
    items: [
      { key: 'est_carroceria', label: 'Carrocería general' },
      { key: 'est_parabrisas', label: 'Parabrisas' },
      { key: 'est_tapiceria_asientos', label: 'Tapicería/asientos' },
      { key: 'est_retrovisores_parachoques', label: 'Retrovisores/parachoques' },
      { key: 'est_cerraduras_manillas', label: 'Cerraduras/manillas' },
    ],
  },
  {
    id: 'aux', titulo: 'Auxilio Vial',
    items: [
      { key: 'aux_caucho_repuesto', label: 'Caucho repuesto' },
      { key: 'aux_herramientas', label: 'Herramientas cambio' },
      { key: 'aux_triangulos', label: 'Triángulos/conos' },
      { key: 'aux_extintor', label: 'Extintor' },
      { key: 'aux_tacos', label: 'Tacos bloqueo' },
    ],
  },
]

function calcPromedio(registros: Record<string, any>[], key: string): number {
  let sum = 0
  let count = 0
  for (const r of registros) {
    const v = r[key]
    if (v === 'Bueno') { sum += 2; count++ }
    else if (v === 'Regular') { sum += 1; count++ }
    else if (v === 'Malo') { sum += 0; count++ }
  }
  return count > 0 ? Math.round((sum / (count * 2)) * 100) : 0
}

export function generarPDFResumenTaller(
  desde: string,
  hasta: string,
  todas: Record<string, any>[],
  particulares: Record<string, any>[],
  cargas: Record<string, any>[],
) {
  const doc = new jsPDF()
  let y = 20
  const margin = 20
  const maxWidth = doc.internal.pageSize.width - margin * 2
  const LH = 5

  function saltar(h: number) {
    y += h
    if (y > doc.internal.pageSize.height - 20) {
      doc.addPage()
      y = 20
    }
  }

  function linea(color: string) {
    doc.setDrawColor(color)
    doc.setLineWidth(0.5)
    doc.line(margin, y, margin + maxWidth, y)
    saltar(3)
  }

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Super App Luxor', margin, y)
  saltar(7)

  doc.setFontSize(13)
  doc.text('Resumen de inspecciones - Taller Automotriz', margin, y)
  saltar(5)
  linea('#3b82f6')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Periodo: ${desde} — ${hasta}`, margin, y)
  saltar(LH + 1)
  doc.text(`Total inspecciones: ${todas.length}`, margin, y)
  saltar(LH + 1)
  doc.text(`Particulares: ${particulares.length} | Carga: ${cargas.length}`, margin, y)
  saltar(4)
  linea('#94a3b8')
  saltar(2)

  function renderGroup(titulo: string, registros: Record<string, any>[]) {
    if (registros.length === 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor('#94a3b8')
      doc.text(`Sin inspecciones`, margin + 2, y)
      saltar(LH + 2)
      return
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor('#1e293b')
    doc.text(`${titulo} (${registros.length} inspecciones)`, margin, y)
    saltar(LH + 1)

    for (const cat of CATEGORIAS) {
      if (y > doc.internal.pageSize.height - 30) {
        doc.addPage()
        y = 20
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor('#475569')
      doc.text(cat.titulo, margin + 2, y)
      saltar(LH)

      const cols = 4
      const colW = (maxWidth - 8) / cols
      for (let i = 0; i < cat.items.length; i++) {
        const item = cat.items[i]
        const pct = calcPromedio(registros, item.key)
        const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'
        const cx = margin + 4 + (i % cols) * colW
        doc.setTextColor(color)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.text(`${pct}%`, cx, y)
        doc.setTextColor('#334155')
        doc.text(item.label, cx + 10, y)
        if ((i + 1) % cols === 0) saltar(LH - 1)
      }
      if (cat.items.length % cols !== 0) saltar(LH - 1)

      doc.setDrawColor('#e2e8f0')
      doc.setLineWidth(0.3)
      doc.line(margin + 2, y, margin + maxWidth - 2, y)
      saltar(2)
    }

    let totalPct = 0
    let totalCount = 0
    for (const cat of CATEGORIAS) {
      for (const item of cat.items) {
        totalPct += calcPromedio(registros, item.key)
        totalCount++
      }
    }
    const globalPct = totalCount > 0 ? Math.round(totalPct / totalCount) : 0
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor('#2563eb')
    doc.text(`Promedio general: ${globalPct}%`, margin + 2, y)
    saltar(LH + 2)
    linea('#e2e8f0')
    saltar(2)
  }

  renderGroup('RESULTADO GLOBAL', todas)
  renderGroup('VEHICULOS PARTICULARES', particulares)
  renderGroup('VEHICULOS DE CARGA', cargas)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor('#94a3b8')
  doc.text(`Documento generado el ${new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, y)

  return doc.output('datauristring')
}
