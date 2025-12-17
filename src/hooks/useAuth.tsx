'use client'

import { useState, useEffect, createContext, useContext, useMemo } from 'react'
import { authService, onAuthStateChange } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
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
  const [assignedProjectIds, setAssignedProjectIds] = useState<number[]>([])

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

      // Load assignments if not admin
      if (data && data.role !== 'admin') {
        const { data: assignments } = await supabase // access supabase directly or via authService? authService wraps simple methods.
          .from('user_projects')
          .select('project_id')
          .eq('user_id', user.id)

        if (assignments) {
          setAssignedProjectIds(assignments.map(a => a.project_id))
        }
      }
    } catch (error) {
      console.error('Error al crear perfil:', error)
    }
  }

  // Inicializar autenticación
  useEffect(() => {
    let isMounted = true

    // Helper to load assignments
    const loadAssignments = async (userId: string, userRole: string) => {
      if (!isMounted) return

      if (userRole && userRole !== 'admin') {
        const { data: assignments } = await supabase
          .from('user_projects')
          .select('project_id')
          .eq('user_id', userId)

        if (assignments && isMounted) {
          const newProjectIds = assignments.map(a => a.project_id).sort((a, b) => a - b)

          setAssignedProjectIds(prev => {
            const sortedPrev = [...prev].sort((a, b) => a - b)
            if (JSON.stringify(sortedPrev) === JSON.stringify(newProjectIds)) {
              return prev
            }
            return newProjectIds
          })
        }
      } else if (userRole === 'admin' && isMounted) {
        setAssignedProjectIds(prev => prev.length === 0 ? prev : [])
      }
    }

    // Obtener sesión inicial
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await authService.getSession()

        if (error) {
          console.error('Error al obtener sesión:', error)
          if (isMounted) setLoading(false)
          return
        }

        if (session?.user && isMounted) {
          setUser(session.user)
          setSession(session)

          // Cargar o crear perfil
          const { data: existingProfile } = await authService.getUserProfile(session.user.id)
          let currentProfile = existingProfile

          if (existingProfile) {
            if (isMounted) setProfile(existingProfile)
          } else {
            await createUserProfile(session.user)
            // Intentar obtener el perfil de nuevo o usar los datos básicos
            const { data: newProfile } = await authService.getUserProfile(session.user.id)
            currentProfile = newProfile
          }

          if (currentProfile) {
            await loadAssignments(session.user.id, currentProfile.role)
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

      // Solo actualizar si la sesión ha cambiado realmente
      setSession(prevSession => {
        if (prevSession?.access_token === session?.access_token) {
          return prevSession
        }
        return session
      })

      if (session?.user) {
        setUser(prevUser => {
          if (prevUser?.id === session.user.id && prevUser?.updated_at === session.user.updated_at) {
            return prevUser
          }
          return session.user
        })

        const { data: existingProfile } = await authService.getUserProfile(session.user.id)
        if (existingProfile && isMounted) {
          setProfile(existingProfile)
          await loadAssignments(session.user.id, existingProfile.role)
        } else if (isMounted) {
          await createUserProfile(session.user)
        }

        // Subscription for assignments changes
        const assignmentsSubscription = supabase
          .channel('user-assignments-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_projects',
              filter: `user_id=eq.${session.user.id}`
            },
            async () => {
              console.log('⚡ Cambios en asignaciones detectados, actualizando...')
              if (existingProfile) {
                await loadAssignments(session.user.id, existingProfile.role)
              }
            }
          )
          .subscribe()

        return () => {
          assignmentsSubscription.unsubscribe()
        }

      } else if (isMounted) {
        setUser(null)
        setProfile(null)
        setAssignedProjectIds([])
      }

      if (isMounted) setLoading(false)
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

  const signUp = async (email: string, password: string, fullName: string, role: any = 'maestro', options?: { redirectTo?: string }) => {
    setLoading(true)
    try {
      const { data, error } = await authService.signUp(email, password, fullName, role, options)
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

  const resetPassword = async (email: string) => {
    setLoading(true)
    try {
      const { data, error } = await authService.resetPassword(email)
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

  // Memoizar el valor del contexto para evitar re-renders innecesarios
  const authValue = useMemo(() => ({
    user,
    profile,
    session,
    loading,
    assignedProjectIds,
    signIn,
    signUp,
    signOut,
    updateProfile,
    hasRole,
    isAdmin,
    isSupervisorOrAbove,
    getAccessLevel,
    resetPassword,
  }), [user, profile, session, loading, assignedProjectIds])

  return authValue
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
