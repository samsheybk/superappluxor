import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { LoadingScreen } from '../../components/LoadingScreen'
import { SignaturePad } from '../../components/SignaturePad'
import type { Supermercado } from '../../types'

const RRLL_EVAL_ITEMS = [
  'ACUERDO INDIVIDUAL DE ACEPTACION DE EMISION DE RECIBOS DE PAGOS POR VIA ELECTRONICA',
  'CARTELERA / CARPETA PARAFISCAL (INCES - FAOV - MINTRA - TRIMESTRE DE PRESTACIONES - IVSS - NIL)',
  'FORMA 14-02 IVSS (EXISTENTES Y FALTANTES)',
  'APERTURA DE CUENTAS MERCANTIL (SOLICITUD)',
  'TRASLADOS (EXPEDIENTE POR ENVIAR Y RECIBIR)',
  'PLANTILLAS (ACTUALIZACION Y ENVIO OPORTUNO) APROBADO - ACTIVO - VACANTE',
  'EXPEDIENTES (ORGANIZACION Y CONTENIDO)',
  'UNIFORMES (SOLICITUD / CUMPLIMIENTO)',
  'RECLASIFICACION (SOLICITUDES, PERIODO DE FORMACION, CULMINACION)',
  'RECIBOS DE PAGO (ENVIO Y ENTREGA OPORTUNO)',
  'TRIMESTRE PRESTACIONES SOCIALES (TRIMESTRAL POR TRABAJADOR)',
  'LIBRO DE VACACIONES (REGISTRO Y ACTUALIZACION)',
  'HORARIOS Y MARCAJE DE MERCADO (ELABORACION, ORGANIZACION Y ENVIO OPORTUNO)',
  'ALCANCE DE METAS (REDOBLES ENVIO OPORTUNO)',
  'JORNADA NOCTURNA / ESPECIALES (REALIZACION Y ENVIO OPORTUNO)',
  'CESTA TICKETS / BONO DE ASISTENCIA (TARJETAS POR RECIBIR Y ENTREGAR)',
  'ORDEN Y LIMPIEZA',
  'PARAFISCAL SEGURO SOCIAL IVSS (MENSUAL: FACTURACION - SOLVENCIA - SOPORTE ELECTRONICO)',
  'PARAFISCAL FAOV (MENSUAL: FACTURACION - SOLVENCIA - SOPORTE ELECTRONICO)',
  'ANALISTA DE TALENTO HUMANO (DESEMPEÑO, DESENVOLVIMIENTO, ERRORES RECURRENTES)',
  'AJUSTE DE SALARIO (REALIZACION Y ENVIO OPORTUNO)',
  'CONSTANCIAS DE BUENA CONDUCTA (EXISTENTES Y FALTANTES)',
  'CERTIFICADO MANIPULACION DE ALIMENTOS (EXISTENTE Y FALTANTES)',
  'CERTIFICADO DE SALUD (EXISTENTES Y FALTANTES)',
  'CAPACITACIONES APLICADAS / TEMA (REALIZADAS Y SOLICITUDES)',
  'LIBRO DE CONTRATOS (REGISTRO Y ACTUALIZACION)',
  'CONTRATO DE TRABAJO (ELABORACION / POR MODIFICACION)',
  'CULMINACIONES DE CONTRATO (REALIZACION Y ENVIO OPORTUNO)',
  'HORARIOS Y MARCAJE DE GERENCIA (ENVIO OPORTUNO)',
  'NOTIFICACION POR FALTA Y LLAMADOS DE ATENCION (ELABORACION)',
  'ACTAS DE DESCUENTOS (ELABORACION Y ENVIO OPORTUNO)',
  'PARAFISCAL NIL (REGISTRO UNICO)',
  'PARAFISCAL MINTRA (TRIMESTRAL: FACTURACION - SOLVENCIA - SOPORTE ELECTRONICO)',
  'PARAFISCAL INCES (TRIMESTRAL: FACTURACION - SOLVENCIA - SOPORTE ELECTRONICO)',
  'PAGO EN EFECTIVO (PENDIENTE POR ENTREGAR)',
  'PERSONAL FIJO (REALIZACION Y ENVIO OPORTUNO)',
]

const ESCALAS = ['EXCELENTE', 'REGULAR', 'DEFICIENTE', 'NO APLICA']

const ESCALA_COLORS: Record<string, string> = {
  EXCELENTE: '#16a34a',
  REGULAR: '#f59e0b',
  DEFICIENTE: '#dc2626',
  'NO APLICA': '#64748b',
}

export function EvaluacionRRLL() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [supermercado, setSupermercado] = useState<Supermercado | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [evalNombre, setEvalNombre] = useState('')
  const [evalCedula, setEvalCedula] = useState('')
  const [reprNombre, setReprNombre] = useState('')
  const [reprCedula, setReprCedula] = useState('')
  const [firmaTthh, setFirmaTthh] = useState<string | null>(null)
  const [firmaSuper, setFirmaSuper] = useState<string | null>(null)

  const [items, setItems] = useState<{ escala: string; comentario: string }[]>(() =>
    RRLL_EVAL_ITEMS.map(() => ({ escala: '', comentario: '' }))
  )

  useEffect(() => {
    if (!id) return
    supabase.from('supermercados').select('*').eq('id', id).single().then(({ data }) => {
      setSupermercado(data)
      setLoading(false)
    })
  }, [id])

  function setEscala(idx: number, value: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, escala: value } : it))
  }

  function setComentario(idx: number, value: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, comentario: value } : it))
  }

  async function guardar() {
    if (!id || !supermercado) return
    if (!evalNombre.trim() || !evalCedula.trim()) { setError('Complete los datos del representante de TTHH'); return }
    if (!reprNombre.trim() || !reprCedula.trim()) { setError('Complete los datos del representante del supermercado'); return }
    if (!firmaTthh) { setError('Debe agregar la firma del representante de TTHH'); return }
    if (!firmaSuper) { setError('Debe agregar la firma del representante del supermercado'); return }

    const sinEscala = items.findIndex(it => !it.escala)
    if (sinEscala !== -1) { setError(`Seleccione escala para el item #${sinEscala + 1}`); return }

    setGuardando(true)
    setError('')

    const { error: err } = await supabase.from('rrhh_evaluaciones').insert({
      supermercado_id: id,
      evaluador_nombre: evalNombre.trim().toUpperCase(),
      evaluador_cedula: evalCedula.trim().toUpperCase(),
      representante_nombre: reprNombre.trim().toUpperCase(),
      representante_cedula: reprCedula.trim().toUpperCase(),
      firma_tthh: firmaTthh,
      firma_super: firmaSuper,
      items: RRLL_EVAL_ITEMS.map((item, i) => ({
        item,
        escala: items[i].escala,
        comentario: items[i].comentario.trim(),
      })),
    })

    if (err) { setError(err.message); setGuardando(false); return }

    navigate(`/operaciones/supermercados`)
  }

  if (loading) return <LoadingScreen />
  if (!supermercado) return <div className="py-10 text-center text-slate-500">Supermercado no encontrado</div>

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <Link to="/operaciones/supermercados" className="text-slate-500 hover:text-blue-600">Supermercados</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Evaluacion RRLL — {supermercado.nombre}</span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Signatures section */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Datos de la evaluacion</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-700">Representante de TTHH</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">NOMBRE Y APELLIDO</label>
                <input value={evalNombre} onChange={e => setEvalNombre(e.target.value.toUpperCase())}
                  placeholder="Nombre y apellido"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">CEDULA</label>
                <input value={evalCedula} onChange={e => setEvalCedula(e.target.value.toUpperCase())}
                  placeholder="V-12345678"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-slate-500">FIRMA</label>
              <SignaturePad value={firmaTthh} onChange={setFirmaTthh} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-700">Representante del supermercado</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">NOMBRE Y APELLIDO</label>
                <input value={reprNombre} onChange={e => setReprNombre(e.target.value.toUpperCase())}
                  placeholder="Nombre y apellido"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">CEDULA</label>
                <input value={reprCedula} onChange={e => setReprCedula(e.target.value.toUpperCase())}
                  placeholder="V-12345678"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-slate-500">FIRMA</label>
              <SignaturePad value={firmaSuper} onChange={setFirmaSuper} />
            </div>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Items de evaluacion</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600 w-10">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">ITEM</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600 w-36">ESCALA</th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600 w-64">COMENTARIO</th>
              </tr>
            </thead>
            <tbody>
              {RRLL_EVAL_ITEMS.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 text-xs text-slate-400 align-top pt-3">{idx + 1}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-700 leading-relaxed">{item}</td>
                  <td className="px-3 py-2.5 text-center">
                    <select value={items[idx].escala} onChange={e => setEscala(idx, e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none w-full"
                      style={{
                        fontWeight: items[idx].escala ? 600 : 400,
                        color: items[idx].escala ? ESCALA_COLORS[items[idx].escala] : '#64748b',
                        background: items[idx].escala ? `${ESCALA_COLORS[items[idx].escala]}10` : '#fff',
                      }}
                    >
                      <option value="">Seleccionar</option>
                      {ESCALAS.map(esc => (
                        <option key={esc} value={esc}>{esc}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={items[idx].comentario} onChange={e => setComentario(idx, e.target.value)}
                      placeholder="Observaciones..."
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-8">
        <Link to="/operaciones/supermercados"
          className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >Cancelar</Link>
        <button onClick={guardar} disabled={guardando}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >{guardando ? 'Guardando...' : 'Guardar evaluacion'}</button>
      </div>
    </div>
  )
}
