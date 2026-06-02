export interface Departamento {
  id: string
  nombre: string
  direccion: Direcciones
}

export type Direcciones = 'Operaciones' | 'Talento Humano' | 'Comercial' | 'Finanzas'

export const DEPARTAMENTOS_POR_DIRECCION: Record<Direcciones, string[]> = {
  'Operaciones': ['Supermercados', 'Servicios generales', 'Taller automotriz', 'Almacen y distribucion', 'Sistemas'],
  'Talento Humano': ['Reclutamiento y seleccion', 'Capacitacion y desarrollo', 'Seguridad laboral', 'Nomina', 'Bienestar social', 'Relaciones laborales'],
  'Comercial': ['Compras', 'Mercadeo'],
  'Finanzas': ['Administracion', 'Contabilidad', 'Cuentas por pagar', 'Cuentas por cobrar', 'Inventario', 'Tesoreria', 'Banco', 'Impuestos', 'Auditoria de caja'],
}

export interface Evaluacion {
  id: string
  departamento_id: string
  corte_mes: string
  semana: number
  puntaje: number
  observaciones: string
  creado_por: string
  creado_en: string
}

export interface Usuario {
  id: string
  email: string
  nombre: string
  rol: 'admin' | 'evaluador'
}

export interface Supermercado {
  id: string
  nombre: string
  activo: boolean
  gerente_id: string | null
  created_at: string
}

export interface SupermercadoConGerente extends Supermercado {
  gerente?: { nombre: string; email: string } | null
}

export interface Area {
  id: string
  nombre: string
}

export interface SupermercadoArea {
  id: string
  supermercado_id: string
  area_id: string
  peso: number
  area?: Area
}

export interface EvaluacionSupermercado {
  id: string
  evaluacion_id: string
  supermercado_id: string
  area_id: string
  fecha_inicio: string
  creado_por: string
  creado_en: string
}

export interface Concepto {
  id: string
  nombre: string
  created_at: string
}

export interface ConceptoCriticidad {
  id: string
  concepto_id: string
  nivel: string
  penalizacion: number
  created_at: string
}

export interface ConceptoArea {
  id: string
  concepto_id: string
  area_id: string
}

export interface EvaluacionComentario {
  id: string
  evaluacion_id: string
  supermercado_id: string
  area_id: string
  concepto_id: string
  criticidad_id: string
  comentario: string
  fecha_inicio: string
  creado_por: string
  creado_en: string
}

export interface EvaluacionHeader {
  id: string
  supermercado_id: string
  fecha_inicio: string
  fecha_cierre: string | null
  firma: string | null
  pdf_url: string | null
  creado_por: string
  creado_en: string
}

export const SUPERMERCADOS = [
  'LAS ACACIAS', 'SAN JUAN', 'SANTA RITA', 'NAGUANAGUA', 'EL BOSQUE',
  'BARQUISIMETO', 'TUCACAS', 'EL CASTAÑO', 'LA MORA', 'VILLAS DE ARAGUA',
  'LA VICTORIA', 'GUACARA', 'SAN DIEGO', 'CIRCULO MILITAR', 'IPSFA',
]
