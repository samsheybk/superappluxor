import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { LoadingScreen } from '../components/LoadingScreen'

function colorRango(valor: number, min: number, max: number): string {
  if (max === min) return '#EF4444'
  const t = (valor - min) / (max - min)
  const r = Math.round(239 * t + 34 * (1 - t))
  const g = Math.round(68 * t + 197 * (1 - t))
  const b = Math.round(68 * t + 94 * (1 - t))
  return `rgb(${r},${g},${b})`
}

const INSPECCION_CAMPOS = [
  'limp_cabina_interna', 'limp_carroceria_externa', 'limp_area_carga', 'limp_parabrisas_ventanas',
  'elec_luces_principales', 'elec_luces_senalizacion', 'elec_luces_freno_retroceso', 'elec_tablero_instrumentos', 'elec_limpia_parabrisas', 'elec_bateria',
  'mec_fluidos', 'mec_fugas', 'mec_frenos', 'mec_neumaticos', 'mec_correas', 'mec_suspension_direccion',
  'est_carroceria', 'est_parabrisas', 'est_tapiceria_asientos', 'est_retrovisores_parachoques', 'est_cerraduras_manillas',
  'aux_caucho_repuesto', 'aux_herramientas', 'aux_triangulos', 'aux_extintor', 'aux_tacos',
]

function puntajeInspeccion(fila: any): number {
  let total = 0; let maximo = 0
  for (const campo of INSPECCION_CAMPOS) {
    const val = fila[campo]
    maximo += 3
    if (val === 'Bueno') total += 3
    else if (val === 'Regular') total += 2
    else if (val === 'Malo') total += 1
  }
  return maximo > 0 ? Math.round((total / maximo) * 100) : 0
}

interface PromedioSuper { nombre: string; promedio: number; totalEvaluaciones: number }
interface DeptoNegativo { nombre: string; totalPenalizacion: number }

function defaultDesde(): string {
  const d = new Date(); d.setMonth(d.getMonth() - 3)
  return d.toISOString().slice(0, 10)
}
function defaultHasta(): string {
  return new Date().toISOString().slice(0, 10)
}

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [fechaDesde, setFechaDesde] = useState(defaultDesde)
  const [fechaHasta, setFechaHasta] = useState(defaultHasta)

  // Supermercados
  const [promedios, setPromedios] = useState<PromedioSuper[]>([])
  const [totalesEval, setTotalesEval] = useState<{ nombre: string; total: number }[]>([])
  const [mejores, setMejores] = useState<PromedioSuper[]>([])
  const [deptosNegativos, setDeptosNegativos] = useState<DeptoNegativo[]>([])
  const [conceptosCount, setConceptosCount] = useState<{ nombre: string; apariciones: number }[]>([])

  // Taller
  const [tallerPromedio, setTallerPromedio] = useState<number | null>(null)
  const [topGastos, setTopGastos] = useState<{ placa: string; total: number }[]>([])

  // Plantas
  const [plantasAceiteExcedidas, setPlantasAceiteExcedidas] = useState(0)
  const [combustibleBajo, setCombustibleBajo] = useState(0)

  // Almacen
  const [almacenPromedio, setAlmacenPromedio] = useState<number | null>(null)
  const [almacenAreasNegativas, setAlmacenAreasNegativas] = useState<{ nombre: string; penalizacion: number }[]>([])

  // Sistemas
  const [ticketsNoResueltos, setTicketsNoResueltos] = useState(0)
  const [ticketsPorEstado, setTicketsPorEstado] = useState<{ nombre: string; cantidad: number }[]>([])

  async function cargar(desde: string, hasta: string) {
    setLoading(true)
    const desdeISO = `${desde}T00:00:00Z`
    const hastaISO = `${hasta}T23:59:59Z`
    const filtroFecha = (q: any, col: string) => q.gte(col, desdeISO).lte(col, hastaISO)

    try {
      const [supRes, areasRes, conceptosRes, headersRes, saRes, ccRes] = await Promise.all([
        supabase.from('supermercados').select('id, nombre').eq('activo', true),
        supabase.from('areas').select('id, nombre'),
        supabase.from('conceptos').select('id, nombre'),
        filtroFecha(supabase.from('evaluacion_headers').select('id, supermercado_id'), 'fecha_inicio'),
        supabase.from('supermercado_areas').select('supermercado_id, area_id, peso'),
        supabase.from('concepto_criticidades').select('id, penalizacion'),
      ])

      const supermercados = supRes.data ?? []
      const areas = areasRes.data ?? []
      const conceptos = conceptosRes.data ?? []
      const headers = headersRes.data ?? []
      const sareas = saRes.data ?? []
      const crits = ccRes.data ?? []

      const evalIds = headers.map((h: any) => h.id)
      const comentsRes = evalIds.length > 0
        ? await supabase.from('evaluacion_comentarios').select('evaluacion_id, supermercado_id, area_id, concepto_id, criticidad_id').in('evaluacion_id', evalIds)
        : { data: [] }
      const coments = comentsRes.data ?? []

      // --- Supermercados ---
      const pesoPorSuperArea: Record<string, Record<string, number>> = {}
      for (const sa of sareas) {
        if (!pesoPorSuperArea[sa.supermercado_id]) pesoPorSuperArea[sa.supermercado_id] = {}
        pesoPorSuperArea[sa.supermercado_id][sa.area_id] = sa.peso
      }
      const penPorCrit: Record<string, number> = {}
      for (const c of crits) penPorCrit[c.id] = c.penalizacion
      const nombreArea: Record<string, string> = {}
      for (const a of areas) nombreArea[a.id] = a.nombre
      const nombreConcepto: Record<string, string> = {}
      for (const c of conceptos) nombreConcepto[c.id] = c.nombre

      const comentsPorEval: Record<string, any[]> = {}
      for (const c of coments) {
        if (!comentsPorEval[c.evaluacion_id]) comentsPorEval[c.evaluacion_id] = []
        comentsPorEval[c.evaluacion_id].push(c)
      }

      const evalScores: Record<string, { earned: number; max: number; superId: string }> = {}
      for (const h of headers) {
        const evalComents = comentsPorEval[h.id] ?? []
        const supPesos = pesoPorSuperArea[h.supermercado_id] ?? {}
        const penPorArea: Record<string, number> = {}
        const areasInEval = new Set<string>()
        for (const ec of evalComents) {
          areasInEval.add(ec.area_id)
          penPorArea[ec.area_id] = (penPorArea[ec.area_id] || 0) + (penPorCrit[ec.criticidad_id] || 0)
        }
        let earned = 0; let maxPts = 0
        for (const aid of areasInEval) {
          const peso = supPesos[aid] ?? 0
          maxPts += peso; earned += Math.max(0, peso - (penPorArea[aid] || 0))
        }
        if (maxPts > 0) evalScores[h.id] = { earned, max: maxPts, superId: h.supermercado_id }
      }

      const scoresPorSuper: Record<string, { earned: number; max: number; count: number }> = {}
      for (const ev of Object.values(evalScores)) {
        if (!scoresPorSuper[ev.superId]) scoresPorSuper[ev.superId] = { earned: 0, max: 0, count: 0 }
        scoresPorSuper[ev.superId].earned += ev.earned
        scoresPorSuper[ev.superId].max += ev.max
        scoresPorSuper[ev.superId].count += 1
      }

      const promList = supermercados.map((s: any) => {
        const d = scoresPorSuper[s.id]
        return { nombre: s.nombre, promedio: d && d.max > 0 ? Math.round((d.earned / d.max) * 100) : 0, totalEvaluaciones: d?.count ?? 0 }
      })
      setPromedios(promList.sort((a: any, b: any) => b.promedio - a.promedio))
      setTotalesEval(supermercados.map((s: any) => ({ nombre: s.nombre, total: scoresPorSuper[s.id]?.count ?? 0 })))
      setMejores(promList.filter((p: any) => p.totalEvaluaciones > 0).sort((a: any, b: any) => b.promedio - a.promedio).slice(0, 3))

      const penPorAreaTotal: Record<string, number> = {}
      for (const c of coments) penPorAreaTotal[c.area_id] = (penPorAreaTotal[c.area_id] || 0) + (penPorCrit[c.criticidad_id] || 0)
      setDeptosNegativos(Object.entries(penPorAreaTotal).map(([aid, t]) => ({ nombre: nombreArea[aid] ?? aid, totalPenalizacion: t })).sort((a, b) => b.totalPenalizacion - a.totalPenalizacion).slice(0, 10))

      const conceptCounts: Record<string, number> = {}
      for (const c of coments) conceptCounts[c.concepto_id] = (conceptCounts[c.concepto_id] || 0) + 1
      setConceptosCount(Object.entries(conceptCounts).map(([cid, c]) => ({ nombre: nombreConcepto[cid] ?? cid, apariciones: c })).sort((a, b) => b.apariciones - a.apariciones).slice(0, 10))

      // --- Taller ---
      const [insRes, mantRes, vehRes] = await Promise.all([
        filtroFecha(supabase.from('taller_inspecciones').select('*'), 'fecha_inicio'),
        filtroFecha(supabase.from('taller_mantenimientos').select('vehiculo_id, costo, created_at'), 'created_at'),
        supabase.from('vehiculos').select('id, placa'),
      ])

      const inspecciones = insRes.data ?? []
      if (inspecciones.length > 0) {
        const totalPts = inspecciones.reduce((s: number, i: any) => s + puntajeInspeccion(i), 0)
        setTallerPromedio(Math.round(totalPts / inspecciones.length))
      }

      const vehiculoMap: Record<string, string> = {}
      for (const v of vehRes.data ?? []) vehiculoMap[v.id] = v.placa

      const gastoPorVehiculo: Record<string, number> = {}
      for (const m of mantRes.data ?? []) {
        gastoPorVehiculo[m.vehiculo_id] = (gastoPorVehiculo[m.vehiculo_id] || 0) + Number(m.costo)
      }
      setTopGastos(
        Object.entries(gastoPorVehiculo)
          .map(([vid, total]) => ({ placa: vehiculoMap[vid] ?? vid, total: Math.round(total) }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10)
      )

      // --- Plantas ---
      const [plRes, mantPlRes, regRes] = await Promise.all([
        supabase.from('plantas_electricas').select('id, horas_para_cambio_aceite'),
        supabase.from('planta_mantenimientos').select('planta_id, tipo, horometro').eq('tipo', 'Cambio de aceite').order('created_at', { ascending: false }),
        filtroFecha(supabase.from('planta_registros').select('planta_id, combustible_inicial, combustible_final, created_at'), 'created_at'),
      ])

      const plantas = plRes.data ?? []
      const cambiosAceite = mantPlRes.data ?? []
      const registros = regRes.data ?? []

      const ultimoCambioPorPlanta: Record<string, number> = {}
      for (const ca of cambiosAceite) {
        if (!(ca.planta_id in ultimoCambioPorPlanta) && ca.horometro != null) {
          ultimoCambioPorPlanta[ca.planta_id] = Number(ca.horometro)
        }
      }

      const ultimoRegistroPorPlanta: Record<string, any> = {}
      for (const r of registros) {
        if (!(r.planta_id in ultimoRegistroPorPlanta) || new Date(r.created_at) > new Date(ultimoRegistroPorPlanta[r.planta_id].created_at)) {
          ultimoRegistroPorPlanta[r.planta_id] = r
        }
      }

      let excedidas = 0
      for (const p of plantas) {
        const ultimoReg = ultimoRegistroPorPlanta[p.id]
        if (!ultimoReg || ultimoReg.horometro_final == null) continue
        const horasUsadas = Number(ultimoReg.horometro_final) - (ultimoCambioPorPlanta[p.id] ?? 0)
        if (horasUsadas > Number(p.horas_para_cambio_aceite)) excedidas++
      }
      setPlantasAceiteExcedidas(excedidas)

      let bajos = 0
      for (const r of registros) {
        if (r.combustible_final != null && r.combustible_inicial > 0) {
          const pct = Number(r.combustible_final) / Number(r.combustible_inicial)
          if (pct < 0.15) bajos++
        }
      }
      setCombustibleBajo(bajos)

      // --- Almacen ---
      const [almEvRes, almAreaRes] = await Promise.all([
        filtroFecha(supabase.from('almacen_evaluaciones').select('id, fecha_inicio'), 'fecha_inicio'),
        supabase.from('almacen_areas').select('id, nombre'),
      ])

      const almacenEvals = almEvRes.data ?? []
      const almacenAreas = almAreaRes.data ?? []
      const almEvalIds = almacenEvals.map((ev: any) => ev.id)
      const almCCRes = almEvalIds.length > 0
        ? await supabase.from('almacen_evaluacion_comentarios').select('evaluacion_id, area_id, criticidad_id').in('evaluacion_id', almEvalIds)
        : { data: [] }
      const almacenCCs = almCCRes.data ?? []

      const almPenCrit: Record<string, number> = {}
      for (const c of crits) almPenCrit[c.id] = c.penalizacion

      const areaNombreAlmacen: Record<string, string> = {}
      for (const a of almacenAreas) areaNombreAlmacen[a.id] = a.nombre

      const penPorEval: Record<string, number> = {}
      const penPorAreaAlmacen: Record<string, number> = {}
      for (const c of almacenCCs) {
        const p = almPenCrit[c.criticidad_id] || 0
        penPorEval[c.evaluacion_id] = (penPorEval[c.evaluacion_id] || 0) + p
        penPorAreaAlmacen[c.area_id] = (penPorAreaAlmacen[c.area_id] || 0) + p
      }

      if (almacenEvals.length > 0) {
        let totalPct = 0
        for (const ev of almacenEvals) {
          const pen = penPorEval[ev.id] ?? 0
          totalPct += Math.max(0, 100 - pen)
        }
        setAlmacenPromedio(Math.round(totalPct / almacenEvals.length))
      }

      setAlmacenAreasNegativas(
        Object.entries(penPorAreaAlmacen)
          .map(([aid, p]) => ({ nombre: areaNombreAlmacen[aid] ?? aid, penalizacion: p }))
          .sort((a, b) => b.penalizacion - a.penalizacion)
          .slice(0, 10)
      )

      // --- Sistemas ---
      const { data: tickets } = await filtroFecha(supabase.from('sistemas_tickets').select('estado'), 'created_at')

      const tData = tickets ?? []
      const abiertos = tData.filter((t: any) => t.estado === 'Abierto' || t.estado === 'En Proceso').length
      setTicketsNoResueltos(abiertos)

      const estadosMap: Record<string, number> = {}
      for (const t of tData) estadosMap[t.estado] = (estadosMap[t.estado] || 0) + 1
      const orden = ['Abierto', 'En Proceso', 'Resuelto', 'Cerrado']
      setTicketsPorEstado(orden.filter((e) => estadosMap[e]).map((e) => ({ nombre: e, cantidad: estadosMap[e] })))

      setLoading(false)
    } catch { setLoading(false) }
  }

  useEffect(() => { cargar(fechaDesde, fechaHasta) }, [fechaDesde, fechaHasta])

  if (loading) return <LoadingScreen mensaje="Preparando los indicadores..." />

  const totalSuperEvals = totalesEval.reduce((s, t) => s + t.total, 0)

  return (
    <div className="space-y-6 p-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500">Panorama general del programa</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Desde</label>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
              className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Hasta</label>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
              className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Supermercados</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{totalSuperEvals}</p>
          <p className="text-xs text-slate-400">evaluaciones</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Almacen</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{almacenPromedio ?? 0}%</p>
          <p className="text-xs text-slate-400">promedio general</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Taller</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{tallerPromedio ?? 0}%</p>
          <p className="text-xs text-slate-400">promedio inspecciones</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">Helpdesk</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{ticketsNoResueltos}</p>
          <p className="text-xs text-slate-400">tickets no resueltos</p>
        </div>
      </div>

      {/* Supermercados */}
      {mejores.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Supermercados</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {mejores.map((m, i) => (
              <div key={m.nombre} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">{i + 1}</span>
                  <div>
                    <p className="font-medium text-slate-800">{m.nombre}</p>
                    <p className="text-2xl font-bold text-emerald-600">{m.promedio}%</p>
                    <p className="text-xs text-slate-400">{m.totalEvaluaciones} evaluaciones</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {promedios.some((p: any) => p.totalEvaluaciones > 0) && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Puntos por supermercado - del mejor al peor</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={promedios.filter((p: any) => p.totalEvaluaciones > 0)} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="nombre" stroke="#94a3b8" fontSize={12} angle={-30} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: unknown) => `${v ?? 0}%`} />
              <Bar dataKey="promedio" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {deptosNegativos.length > 0 && (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Departamento con mas puntos negativos</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deptosNegativos} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="nombre" stroke="#94a3b8" fontSize={12} angle={-30} textAnchor="end" height={60} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Bar dataKey="totalPenalizacion" radius={[4, 4, 0, 0]}>
                  {deptosNegativos.map((d, i) => {
                    const vals = deptosNegativos.map((x) => x.totalPenalizacion)
                    return <Cell key={i} fill={colorRango(d.totalPenalizacion, Math.min(...vals), Math.max(...vals))} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {conceptosCount.length > 0 && (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Conceptos con mas apariciones</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={conceptosCount} dataKey="apariciones" nameKey="nombre" cx="50%" cy="50%" outerRadius={100} innerRadius={45} paddingAngle={3}>
                  {(() => {
                    const vals = conceptosCount.map((c) => c.apariciones)
                    return conceptosCount.map((c, i) => <Cell key={i} fill={colorRango(c.apariciones, Math.min(...vals), Math.max(...vals))} />)
                  })()}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Taller */}
      {(tallerPromedio !== null || topGastos.length > 0) && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Taller Automotriz</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {tallerPromedio !== null && (
              <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-sm">
                <h3 className="mb-2 text-sm font-semibold text-slate-600">Promedio de inspecciones</h3>
                <div className="flex flex-1 items-center">
                  <p className="text-4xl font-bold text-amber-600">{tallerPromedio}%</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">sobre 3 categorias (Bueno=3, Regular=2, Malo=1)</p>
              </div>
            )}
            {topGastos.length > 0 && (
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-slate-600">10 vehiculos con mas gasto</h3>
                <div className="space-y-2">
                  {topGastos.map((v, i) => (
                    <div key={v.placa} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-xs font-bold text-slate-400">{i + 1}</span>
                        <span className="text-sm font-medium text-slate-700">{v.placa}</span>
                      </div>
                      <span className="text-sm font-semibold text-red-600">${v.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plantas Electricas */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Plantas Electricas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Horas de aceite excedidas</p>
                <p className="text-4xl font-bold text-orange-600">{plantasAceiteExcedidas}</p>
              </div>
              <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">plantas</span>
            </div>
            <div className="flex flex-1 items-end">
              <p className="text-xs text-slate-400">Plantas que han superado las horas recomendadas para cambio de aceite</p>
            </div>
          </div>
          <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Combustible bajo (&lt;15%)</p>
                <p className="text-4xl font-bold text-red-600">{combustibleBajo}</p>
              </div>
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">veces</span>
            </div>
            <div className="flex flex-1 items-end">
              <p className="text-xs text-slate-400">Veces que las plantas quedaron con menos del 15% de combustible</p>
            </div>
          </div>
        </div>
      </div>

      {/* Almacen */}
      {(almacenPromedio !== null || almacenAreasNegativas.length > 0) && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Almacen y Distribucion</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {almacenPromedio !== null && (
              <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-sm">
                <h3 className="mb-2 text-sm font-semibold text-slate-600">Promedio de evaluaciones</h3>
                <div className="flex flex-1 items-center">
                  <p className="text-4xl font-bold text-emerald-600">{almacenPromedio}%</p>
                </div>
              </div>
            )}
            {almacenAreasNegativas.length > 0 && (
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-slate-600">Areas con mayor puntos negativos</h3>
                <div className="space-y-2">
                  {almacenAreasNegativas.slice(0, 5).map((a, i) => (
                    <div key={a.nombre} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{i + 1}. {a.nombre}</span>
                      <span className="text-sm font-semibold text-red-600">-{a.penalizacion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sistemas */}
      {ticketsPorEstado.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Mesa de Ayuda - Sistemas</h2>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-slate-600">Tickets no resueltos</h3>
            <p className="text-4xl font-bold text-red-600">{ticketsNoResueltos}</p>
            <p className="mt-1 text-xs text-slate-400">de {(ticketsPorEstado.reduce((s, t) => s + t.cantidad, 0))} totales</p>
          </div>
        </div>
      )}

      {totalSuperEvals === 0 && almacenPromedio === null && tallerPromedio === null && (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-slate-400">No hay datos registrados. Comienza creando evaluaciones para ver los indicadores.</p>
        </div>
      )}
    </div>
  )
}
