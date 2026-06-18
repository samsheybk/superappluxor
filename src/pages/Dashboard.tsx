import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { DEPARTAMENTOS_POR_DIRECCION } from '../types'

interface Indicador {
  id: string
  titulo: string
  tipo: string
  frecuencia_medicion: string
  departamento: string
}

interface Resultado {
  id: string
  indicador_id: string
  resultado: number
  meta: number
  cumplimiento: number | null
  observaciones: string
}

function defaultDesde(): string {
  const d = new Date(); d.setDate(1)
  return d.toISOString().slice(0, 10)
}
function defaultHasta(): string {
  return new Date().toISOString().slice(0, 10)
}

export function Dashboard() {
  const [desde, setDesde] = useState(defaultDesde())
  const [hasta, setHasta] = useState(defaultHasta())
  const [indicadores, setIndicadores] = useState<Indicador[]>([])
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loading, setLoading] = useState(true)
  const [dirAbierta, setDirAbierta] = useState<string | null>(null)
  const [deptoAbierto, setDeptoAbierto] = useState<string | null>(null)

  useEffect(() => {
    cargarIndicadores()
  }, [])

  useEffect(() => {
    if (indicadores.length > 0) cargarResultados()
  }, [desde, hasta, indicadores])

  async function cargarIndicadores() {
    const { data } = await supabase.from('documentacion_indicadores').select('id, titulo, tipo, frecuencia_medicion, departamento').order('departamento').order('titulo')
    if (data) setIndicadores(data as Indicador[])
    setLoading(false)
  }

  async function cargarResultados() {
    const { data } = await supabase.from('indicador_resultados').select('*').gte('fecha_desde', desde).lte('fecha_hasta', hasta)
    if (data) setResultados(data as Resultado[])
  }

  function resultadoDeIndicador(indId: string): Resultado | undefined {
    return resultados.find(r => r.indicador_id === indId)
  }

  async function guardarResultado(indId: string, field: 'resultado' | 'meta' | 'observaciones', value: number | string) {
    const existente = resultadoDeIndicador(indId)
    const payload: Record<string, unknown> = { indicador_id: indId, fecha_desde: desde, fecha_hasta: hasta }

    if (existente) {
      payload[field] = value
      const { error } = await supabase.from('indicador_resultados').update(payload).eq('id', existente.id)
      if (error) return
    } else {
      payload.resultado = field === 'resultado' ? value : 0
      payload.meta = field === 'meta' ? value : 100
      payload.observaciones = field === 'observaciones' ? value : ''
      const { error } = await supabase.from('indicador_resultados').insert(payload)
      if (error) return
    }
    cargarResultados()
  }

  async function guardarCampo(indId: string, field: 'resultado' | 'meta' | 'observaciones', raw: string) {
    const val = field === 'observaciones' ? raw : parseFloat(raw) || 0
    guardarResultado(indId, field, val)
  }

  const indicadoresPorDepto = new Map<string, Indicador[]>()
  for (const ind of indicadores) {
    const key = ind.departamento
    if (!indicadoresPorDepto.has(key)) indicadoresPorDepto.set(key, [])
    indicadoresPorDepto.get(key)!.push(ind)
  }

  return (
    <div style={{ padding: '12px 32px', maxWidth: 1280, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#001A4A', marginBottom: 4 }}>Cierre de Evaluaciones</h1>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 20 }}>Registro de resultados de indicadores por periodo</p>

      {/* Filtro de fechas */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>DESDE</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: 2 }}>HASTA</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', outline: 'none' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
      ) : indicadores.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: 60, textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No hay indicadores registrados. Agregue indicadores en Documentacion primero.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(DEPARTAMENTOS_POR_DIRECCION).map(([direccion, departamentos]) => (
            <div key={direccion} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <button onClick={() => setDirAbierta(dirAbierta === direccion ? null : direccion)}
                style={{
                  width: '100%', padding: '12px 16px', textAlign: 'left', border: 'none', cursor: 'pointer',
                  background: dirAbierta === direccion ? '#f1f5f9' : '#fff', fontSize: '0.85rem', fontWeight: 700,
                  color: '#001A4A', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                <span>{direccion}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{dirAbierta === direccion ? '▼' : '▶'}</span>
              </button>
              {dirAbierta === direccion && (
                <div style={{ padding: '0 16px 12px' }}>
                  {departamentos.map(depto => {
                    const inds = indicadoresPorDepto.get(depto) || []
                    return (
                      <div key={depto} style={{ marginTop: 8, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <button onClick={() => setDeptoAbierto(deptoAbierto === depto ? null : depto)}
                          style={{
                            width: '100%', padding: '10px 14px', textAlign: 'left', border: 'none', cursor: 'pointer',
                            background: deptoAbierto === depto ? '#f8fafc' : '#fff', fontSize: '0.8rem', fontWeight: 600,
                            color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}>
                          <span>{depto} <span style={{ fontWeight: 400, color: '#94a3b8' }}>({inds.length})</span></span>
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{deptoAbierto === depto ? '▼' : '▶'}</span>
                        </button>
                        {deptoAbierto === depto && (
                          inds.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                              No hay indicadores registrados para {depto}.
                            </div>
                          ) : (
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
                                    <th style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600, textAlign: 'left', minWidth: 200 }}>INDICADOR</th>
                                    <th style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600, textAlign: 'center', width: 80 }}>TIPO</th>
                                    <th style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600, textAlign: 'center', width: 70 }}>META</th>
                                    <th style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600, textAlign: 'center', width: 80 }}>RESULTADO</th>
                                    <th style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600, textAlign: 'center', width: 80 }}>CUMPLE</th>
                                    <th style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600, textAlign: 'left', minWidth: 150 }}>OBSERVACIONES</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inds.map(ind => {
                                    const res = resultadoDeIndicador(ind.id)
                                    const cumple = res && res.meta > 0 ? (res.resultado / res.meta) * 100 : null
                                    return (
                                      <tr key={ind.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px 12px', color: '#1e293b', fontWeight: 500 }}>{ind.titulo}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>{ind.tipo}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                          <input type="number" step="0.01"
                                            value={res?.meta ?? ''}
                                            onChange={e => guardarCampo(ind.id, 'meta', e.target.value)}
                                            style={{ width: 60, padding: '4px 6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', textAlign: 'center', outline: 'none' }}
                                          />
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                          <input type="number" step="0.01"
                                            value={res?.resultado ?? ''}
                                            onChange={e => guardarCampo(ind.id, 'resultado', e.target.value)}
                                            style={{ width: 60, padding: '4px 6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', textAlign: 'center', outline: 'none' }}
                                          />
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                          {cumple !== null ? (
                                            <span style={{
                                              fontWeight: 700, fontSize: '0.78rem',
                                              color: cumple >= 100 ? '#16a34a' : cumple >= 70 ? '#f59e0b' : '#ef4444',
                                            }}>{cumple.toFixed(1)}%</span>
                                          ) : (
                                            <span style={{ color: '#94a3b8' }}>-</span>
                                          )}
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                          <input
                                            value={res?.observaciones ?? ''}
                                            onChange={e => guardarCampo(ind.id, 'observaciones', e.target.value)}
                                            style={{ width: '100%', padding: '4px 6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box' }}
                                          />
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}