// Roles del sistema
export const USER_ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor', 
  JEFE_CUADRILLA: 'jefe_cuadrilla',
  MAESTRO: 'maestro'
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

// Estados de proyecto
export const PROJECT_STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  BLOCKED: 'blocked'
} as const

export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS]

// Labels para estados de proyecto
export const PROJECT_STATUSES = {
  planning: 'Planificación',
  active: 'Activo',
  completed: 'Completado',
  paused: 'Pausado',
  blocked: 'Bloqueado'
} as const

// Estados de pisos
export const FLOOR_STATUSES = {
  pending: 'Pendiente',
  'in-progress': 'En Progreso',
  completed: 'Completado',
  delayed: 'Retrasado'
} as const

// Estados de departamentos
export const APARTMENT_STATUSES = {
  pending: 'Pendiente',
  'in_progress': 'En Progreso',
  completed: 'Completado',
  blocked: 'Bloqueado'
} as const

// Estados de actividades
export const ACTIVITY_STATUSES = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completado',
  blocked: 'Bloqueado',
  cancelled: 'Cancelado',
  on_hold: 'En Espera'
} as const

// Estados de actividades
export const ACTIVITY_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold'
} as const

export type ActivityStatus = typeof ACTIVITY_STATUS[keyof typeof ACTIVITY_STATUS]

// Categorías de actividades
export const ACTIVITY_CATEGORIES = {
  ESTRUCTURA: 'Estructura',
  INSTALACIONES: 'Instalaciones',
  ACABADOS: 'Acabados',
  PISOS: 'Pisos',
  CARPINTERIA: 'Carpintería',
  TERMINACIONES: 'Terminaciones'
} as const

export type ActivityCategory = typeof ACTIVITY_CATEGORIES[keyof typeof ACTIVITY_CATEGORIES]

// Estados de apartamentos/pisos
export const FLOOR_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  GOOD: 'good',
  WARNING: 'warning',
  DANGER: 'danger'
} as const

export type FloorStatus = typeof FLOOR_STATUS[keyof typeof FLOOR_STATUS]
