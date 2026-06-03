import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { LoadingScreen } from '../components/LoadingScreen'

interface SuperData {
  id: string
  nombre: string
}

interface AreaData {
  id: string
  nombre: string
}

interface ConceptoData {
  id: string
  nombre: string
}

interface EvalHeader {
  id: string
  supermercado_id: string
}

interface EvalComent {
  evaluacion_id: string
  supermercado_id: string
  area_id: string
  concepto_id: string
  criticidad_id: string
}

interface SA {
  supermercado_id: string
  area_id: string
  peso: number
}

interface CC {
  id: string
  penalizacion: number
}

interface PromedioSuper {
  nombre: string
  promedio: number
  totalEvaluaciones: number
}

interface DeptoNegativo {
  nombre: string
  totalPenalizacion: number
}

interface ConceptoCount {
  nombre: string
  apariciones: number
}

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [promedios, setPromedios] = useState<PromedioSuper[]>([])
  const [totales, setTotales] = useState<{ nombre: string; total: number }[]>([])
  const [mejores, setMejores] = useState<PromedioSuper[]>([])
  const [deptosNegativos, setDeptosNegativos] = useState<DeptoNegativo[]>([])
  const [conceptosCount, setConceptosCount] = useState<ConceptoCount[]>([])

  useEffect(() => {
    async function cargar() {
      const [supRes, areasRes, conceptosRes, headersRes, comentsRes, saRes, ccRes] = await Promise.all([
        supabase.from('supermercados').select('id, nombre').eq('activo', true),
        supabase.from('areas').select('id, nombre'),
        supabase.from('conceptos').select('id, nombre'),
        supabase.from('evaluacion_headers').select('id, supermercado_id'),
        supabase.from('evaluacion_comentarios').select('evaluacion_id, supermercado_id, area_id, concepto_id, criticidad_id'),
        supabase.from('supermercado_areas').select('supermercado_id, area_id, peso'),
        supabase.from('concepto_criticidades').select('id, penalizacion'),
      ])

      const supermercados: SuperData[] = supRes.data ?? []
      const areas: AreaData[] = areasRes.data ?? []
      const conceptos: ConceptoData[] = conceptosRes.data ?? []
      const headers: EvalHeader[] = headersRes.data ?? []
      const coments: EvalComent[] = comentsRes.data ?? []
      const sareas: SA[] = saRes.data ?? []
      const crits: CC[] = ccRes.data ?? []

      if (supermercados.length === 0) { setLoading(false); return }

      // Build lookup maps
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

      const nombreSuper: Record<string, string> = {}
      for (const s of supermercados) nombreSuper[s.id] = s.nombre

      // Group comments by evaluacion_id
      const comentsPorEval: Record<string, EvalComent[]> = {}
      for (const c of coments) {
        if (!comentsPorEval[c.evaluacion_id]) comentsPorEval[c.evaluacion_id] = []
        comentsPorEval[c.evaluacion_id].push(c)
      }

      // --- Calculate per-evaluation scores ---
      // For each evaluation, for each area: earned = peso - sum(penalties for that area)
      // Total = sum of earned across areas; Max = sum of pesos across evaluated areas
      const evalScores: Record<string, { earned: number; max: number; superId: string }> = {}
      for (const h of headers) {
        const evalComents = comentsPorEval[h.id] ?? []
        const supPesos = pesoPorSuperArea[h.supermercado_id] ?? {}

        // Group comments by area_id within this evaluation
        const penPorArea: Record<string, number> = {}
        const areasInEval = new Set<string>()
        for (const ec of evalComents) {
          areasInEval.add(ec.area_id)
          penPorArea[ec.area_id] = (penPorArea[ec.area_id] || 0) + (penPorCrit[ec.criticidad_id] || 0)
        }

        let earned = 0
        let maxPts = 0
        for (const aid of areasInEval) {
          const peso = supPesos[aid] ?? 0
          maxPts += peso
          earned += Math.max(0, peso - (penPorArea[aid] || 0))
        }

        if (maxPts > 0) {
          evalScores[h.id] = { earned, max: maxPts, superId: h.supermercado_id }
        }
      }

      // --- 1 & 3: Promedio por supermercado + Mejores 3 ---
      const scoresPorSuper: Record<string, { earned: number; max: number; count: number }> = {}
      for (const ev of Object.values(evalScores)) {
        if (!scoresPorSuper[ev.superId]) scoresPorSuper[ev.superId] = { earned: 0, max: 0, count: 0 }
        scoresPorSuper[ev.superId].earned += ev.earned
        scoresPorSuper[ev.superId].max += ev.max
        scoresPorSuper[ev.superId].count += 1
      }

      const promList: PromedioSuper[] = supermercados.map((s) => {
        const data = scoresPorSuper[s.id]
        const promedio = data && data.max > 0 ? Math.round((data.earned / data.max) * 100) : 0
        return { nombre: s.nombre, promedio, totalEvaluaciones: data?.count ?? 0 }
      })

      setPromedios(promList.sort((a, b) => b.promedio - a.promedio))

      // --- 2: Total evaluaciones por supermercado ---
      const totalEvalPorSuper: Record<string, number> = {}
      for (const h of headers) {
        totalEvalPorSuper[h.supermercado_id] = (totalEvalPorSuper[h.supermercado_id] || 0) + 1
      }
      setTotales(
        supermercados
          .map((s) => ({ nombre: s.nombre, total: totalEvalPorSuper[s.id] ?? 0 }))
          .sort((a, b) => b.total - a.total)
      )

      // --- 3: Mejores 3 ---
      setMejores(promList.filter((p) => p.totalEvaluaciones > 0).sort((a, b) => b.promedio - a.promedio).slice(0, 3))

      // --- 4: Departamentos con mas puntos negativos totales ---
      const penPorAreaTotal: Record<string, number> = {}
      for (const c of coments) {
        penPorAreaTotal[c.area_id] = (penPorAreaTotal[c.area_id] || 0) + (penPorCrit[c.criticidad_id] || 0)
      }
      setDeptosNegativos(
        Object.entries(penPorAreaTotal)
          .map(([aid, total]) => ({ nombre: nombreArea[aid] ?? aid, totalPenalizacion: total }))
          .sort((a, b) => b.totalPenalizacion - a.totalPenalizacion)
          .slice(0, 10)
      )

      // --- 5: Conceptos con mas apariciones ---
      const conceptCounts: Record<string, number> = {}
      for (const c of coments) {
        conceptCounts[c.concepto_id] = (conceptCounts[c.concepto_id] || 0) + 1
      }
      setConceptosCount(
        Object.entries(conceptCounts)
          .map(([cid, count]) => ({ nombre: nombreConcepto[cid] ?? cid, apariciones: count }))
          .sort((a, b) => b.apariciones - a.apariciones)
          .slice(0, 10)
      )

      setLoading(false)
    }
    cargar()
  }, [])

  if (loading) return <LoadingScreen mensaje="Preparando los indicadores..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">Indicadores generales de evaluaciones</p>
      </div>

      {/* Mejores 3 supermercados */}
      {mejores.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Mejores 3 supermercados</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {mejores.map((m, i) => (
              <div key={m.nombre} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">
                    {i + 1}
                  </span>
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

      {/* Promedio de resultado por supermercado */}
      {promedios.some((p) => p.totalEvaluaciones > 0) && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Promedio de resultado por supermercado</h2>
          <ResponsiveContainer width="100%" height={Math.max(200, promedios.filter((p) => p.totalEvaluaciones > 0).length * 40)}>
            <BarChart data={promedios.filter((p) => p.totalEvaluaciones > 0)} layout="vertical" margin={{ left: 120, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v ?? 0}%`} />
              <YAxis type="category" dataKey="nombre" stroke="#94a3b8" fontSize={12} width={110} />
              <Tooltip formatter={(v: unknown) => `${v ?? 0}%`} />
              <Bar dataKey="promedio" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Total de evaluaciones por supermercado */}
      {totales.some((t) => t.total > 0) && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Total de evaluaciones por supermercado</h2>
          <ResponsiveContainer width="100%" height={Math.max(200, totales.filter((t) => t.total > 0).length * 40)}>
            <BarChart data={totales.filter((t) => t.total > 0)} layout="vertical" margin={{ left: 120, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} />
              <YAxis type="category" dataKey="nombre" stroke="#94a3b8" fontSize={12} width={110} />
              <Tooltip />
              <Bar dataKey="total" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Departamentos con mas puntos negativos */}
        {deptosNegativos.length > 0 && (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Departamentos con mas puntos negativos</h2>
            <ResponsiveContainer width="100%" height={Math.max(200, deptosNegativos.length * 40)}>
              <BarChart data={deptosNegativos} layout="vertical" margin={{ left: 120, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis type="category" dataKey="nombre" stroke="#94a3b8" fontSize={12} width={110} />
                <Tooltip />
                <Bar dataKey="totalPenalizacion" fill="#EF4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Conceptos con mas apariciones */}
        {conceptosCount.length > 0 && (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Conceptos con mas apariciones</h2>
            <ResponsiveContainer width="100%" height={Math.max(200, conceptosCount.length * 40)}>
              <BarChart data={conceptosCount} layout="vertical" margin={{ left: 120, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis type="category" dataKey="nombre" stroke="#94a3b8" fontSize={12} width={110} />
                <Tooltip />
                <Bar dataKey="apariciones" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Mensaje si no hay datos */}
      {totales.every((t) => t.total === 0) && (
        <div className="rounded-xl bg-white p-10 text-center shadow-sm">
          <p className="text-slate-400">No hay evaluaciones registradas. Crea una evaluacion para ver los indicadores.</p>
        </div>
      )}
    </div>
  )
}
