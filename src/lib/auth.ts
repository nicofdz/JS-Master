import { supabase } from './supabase'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/auth'

export interface AuthUser extends User {
  user_metadata: {
    full_name?: string
    role?: string
  }
}

// Tipos de autenticación

// Tipos de autenticación
export interface AuthState {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  profile: UserProfile | null
}

// Funciones de autenticación
export const authService = {
  // Iniciar sesión con email y contraseña
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  // Registrar nuevo usuario
  async signUp(email: string, password: string, fullName: string, role: string = 'maestro', options?: { redirectTo?: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: options?.redirectTo,
        data: {
          full_name: fullName,
          role: role,
          must_change_password: true,
        },
      },
    })
    return { data, error }
  },

  // Cerrar sesión
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Obtener sesión actual
  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    return { data, error }
  },

  // Obtener usuario actual
  async getUser() {
    const { data, error } = await supabase.auth.getUser()
    return { data, error }
  },

  // Obtener perfil del usuario
  async getUserProfile(userId: string): Promise<{ data: UserProfile | null; error: any }> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    return { data, error }
  },

  // Crear o actualizar perfil de usuario
  async upsertUserProfile(profile: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: any }> {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profile)
      .select()
      .single()

    return { data, error }
  },

  // Actualizar perfil de usuario
  async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    return { data, error }
  },

  // Restablecer contraseña
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { data, error }
  },

  // Actualizar contraseña
  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { data, error }
  },

  // Verificar si el usuario tiene un rol específico
  hasRole(userRole: string | undefined, requiredRole: string | string[]): boolean {
    if (!userRole) return false

    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userRole)
    }

    return userRole === requiredRole
  },

  // Verificar si el usuario es admin
  isAdmin(userRole: string | undefined): boolean {
    return userRole === 'admin'
  },

  // Verificar si el usuario es supervisor o superior
  isSupervisorOrAbove(userRole: string | undefined): boolean {
    return ['admin', 'supervisor'].includes(userRole || '')
  },

  // Obtener nivel de acceso (número más alto = mayor acceso)
  getAccessLevel(role: string | undefined): number {
    switch (role) {
      case 'admin': return 4
      case 'supervisor': return 3
      case 'jefe_cuadrilla': return 2
      case 'maestro': return 1
      default: return 0
    }
  }
}

// Listener para cambios en el estado de autenticación
export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session)
  })
}
