// Tipos para autenticación y roles

export type UserRole = 'admin' | 'supervisor' | 'jefe_cuadrilla' | 'maestro'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  created_at: string
  updated_at: string
}

export interface AuthContextType {
  user: any | null
  profile: UserProfile | null
  session: any | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ data?: any, error?: any }>
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<{ data?: any, error?: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ data?: any, error?: any }>
  resetPassword: (email: string) => Promise<{ data?: any, error?: any }>
  hasRole: (requiredRole: string | string[]) => boolean
  isAdmin: () => boolean
  isSupervisorOrAbove: () => boolean
  getAccessLevel: () => number
}

export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  role: UserRole
  phone?: string
}

// Permisos por rol
export const ROLE_PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canManageProjects: true,
    canManageTeams: true,
    canViewAllReports: true,
    canEditAllActivities: true,
    canDeleteData: true,
  },
  supervisor: {
    canManageUsers: false,
    canManageProjects: true,
    canManageTeams: true,
    canViewAllReports: true,
    canEditAllActivities: true,
    canDeleteData: false,
  },
  jefe_cuadrilla: {
    canManageUsers: false,
    canManageProjects: false,
    canManageTeams: false,
    canViewAllReports: false,
    canEditAllActivities: false,
    canDeleteData: false,
  },
  maestro: {
    canManageUsers: false,
    canManageProjects: false,
    canManageTeams: false,
    canViewAllReports: false,
    canEditAllActivities: false,
    canDeleteData: false,
  },
} as const

// Labels en español para roles
export const ROLE_LABELS = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  jefe_cuadrilla: 'Jefe de Cuadrilla',
  maestro: 'Maestro',
} as const

// Descripciones de roles
export const ROLE_DESCRIPTIONS = {
  admin: 'Acceso completo al sistema, gestión de usuarios y configuración',
  supervisor: 'Supervisión de proyectos, equipos y generación de reportes',
  jefe_cuadrilla: 'Coordinación de equipos de trabajo y seguimiento de actividades',
  maestro: 'Ejecución de actividades y registro de progreso',
} as const

// Función para verificar permisos
export function hasPermission(userRole: UserRole | undefined, permission: keyof typeof ROLE_PERMISSIONS.admin): boolean {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) return false
  return ROLE_PERMISSIONS[userRole][permission] || false
}

// Función para obtener el nivel de acceso
export function getAccessLevel(role: UserRole | undefined): number {
  switch (role) {
    case 'admin': return 4
    case 'supervisor': return 3
    case 'jefe_cuadrilla': return 2
    case 'maestro': return 1
    default: return 0
  }
}

// Función para verificar si un rol tiene mayor o igual acceso que otro
export function hasEqualOrHigherAccess(userRole: UserRole | undefined, requiredRole: UserRole): boolean {
  return getAccessLevel(userRole) >= getAccessLevel(requiredRole)
}
