'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { authService, onAuthStateChange } from '@/lib/auth'
import type { UserProfile, AuthContextType } from '@/types/auth'
import type { User, Session } from '@supabase/supabase-js'

// Crear contexto de autenticación
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hook para usar el contexto de autenticación
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

// Hook personalizado para manejo de autenticación
export function useAuthState(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)

  // Cargar perfil del usuario
  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await authService.getUserProfile(userId)
      if (error) {
        console.error('Error al cargar perfil:', error)
        return
      }
      setProfile(profile)
    } catch (error) {
      console.error('Error al cargar perfil:', error)
    }
  }

  // Crear perfil si no existe
  const createUserProfile = async (user: User) => {
    const profileData = {
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
      role: (user.user_metadata?.role as any) || 'maestro',
      phone: user.user_metadata?.phone || null,
    }

    try {
      const { data, error } = await authService.upsertUserProfile(profileData)
      if (error) {
        console.error('Error al crear perfil:', error)
        return
      }
      setProfile(data)
    } catch (error) {
      console.error('Error al crear perfil:', error)
    }
  }

  // Inicializar autenticación
  useEffect(() => {
    let isMounted = true

    // Obtener sesión inicial
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await authService.getSession()
        
        if (error) {
          console.error('Error al obtener sesión:', error)
          setLoading(false)
          return
        }

        if (session?.user && isMounted) {
          setUser(session.user)
          setSession(session)
          
          // Cargar o crear perfil
          const { data: existingProfile } = await authService.getUserProfile(session.user.id)
          if (existingProfile) {
            setProfile(existingProfile)
          } else {
            await createUserProfile(session.user)
          }
        }
      } catch (error) {
        console.error('Error en inicialización de auth:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listener para cambios de autenticación
    const { data: { subscription } } = onAuthStateChange(async (session) => {
      if (!isMounted) return

      setSession(session)
      
      if (session?.user) {
        setUser(session.user)
        
        // Cargar o crear perfil
        const { data: existingProfile } = await authService.getUserProfile(session.user.id)
        if (existingProfile) {
          setProfile(existingProfile)
        } else {
          await createUserProfile(session.user)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  // Funciones de autenticación
  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await authService.signIn(email, password)
      if (error) {
        return { error }
      }
      return { data }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: any = 'maestro') => {
    setLoading(true)
    try {
      const { data, error } = await authService.signUp(email, password, fullName, role)
      if (error) {
        return { error }
      }
      return { data }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await authService.signOut()
      setUser(null)
      setProfile(null)
      setSession(null)
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'Usuario no autenticado' }

    try {
      const { data, error } = await authService.updateUserProfile(user.id, updates)
      if (error) {
        return { error }
      }
      setProfile(data)
      return { data }
    } catch (error) {
      return { error }
    }
  }

  // Funciones de utilidad
  const hasRole = (requiredRole: string | string[]) => {
    return authService.hasRole(profile?.role, requiredRole)
  }

  const isAdmin = () => {
    return authService.isAdmin(profile?.role)
  }

  const isSupervisorOrAbove = () => {
    return authService.isSupervisorOrAbove(profile?.role)
  }

  const getAccessLevel = () => {
    return authService.getAccessLevel(profile?.role)
  }

  return {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    hasRole,
    isAdmin,
    isSupervisorOrAbove,
    getAccessLevel,
  }
}

// Provider del contexto de autenticación
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthState()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}
