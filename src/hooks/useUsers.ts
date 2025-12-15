import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types/auth'

export function useUsers() {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchUsers = useCallback(async (includeInactive: boolean = true) => {
        try {
            setLoading(true)
            setError(null)

            let query = supabase
                .from('user_profiles')
                .select('*')
                .order('full_name', { ascending: true })

            if (!includeInactive) {
                query = query.eq('is_active', true)
            }

            const { data, error } = await query

            if (error) throw error

            setUsers(data || [])
        } catch (err: any) {
            console.error('Error fetching users:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    const updateUser = async (id: string, updates: Partial<UserProfile>) => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('user_profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            setUsers(prev => prev.map(user => user.id === id ? data : user))
            return { data, error: null }
        } catch (err: any) {
            console.error('Error updating user:', err)
            return { data: null, error: err.message }
        } finally {
            setLoading(false)
        }
    }

    const toggleUserStatus = async (id: string, isActive: boolean) => {
        return updateUser(id, { is_active: isActive })
    }

    const deleteUser = async (id: string) => {
        try {
            setLoading(true)

            // 1. Eliminar referencias en audit_log
            const { error: auditError } = await supabase
                .from('audit_log')
                .delete()
                .eq('user_id', id)

            if (auditError) {
                console.error('Error deleting audit logs:', auditError)
                throw auditError
            }

            // 2. Eliminar usuario via API Admin
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('No session found')

            const response = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.error || 'Error deleting user')
            }

            setUsers(prev => prev.filter(user => user.id !== id))
            return { error: null }
        } catch (err: any) {
            console.error('Error deleting user:', err)
            return { error: err.message }
        } finally {
            setLoading(false)
        }
    }

    const assignProjects = async (userId: string, projectIds: number[]) => {
        try {
            setLoading(true)

            // 1. Obtener asignaciones actuales
            const { data: currentAssignments } = await supabase
                .from('user_projects')
                .select('project_id')
                .eq('user_id', userId)

            const currentIds = currentAssignments?.map(a => a.project_id) || []

            // 2. Calcular qué agregar y qué eliminar
            const toAdd = projectIds.filter(id => !currentIds.includes(id))
            const toRemove = currentIds.filter(id => !projectIds.includes(id))

            console.log('assignProjects: ProjectIDs:', projectIds)
            console.log('assignProjects: Current:', currentIds)
            console.log('assignProjects: Adding:', toAdd)
            console.log('assignProjects: Removing:', toRemove)

            // 3. Eliminar
            if (toRemove.length > 0) {
                const { error: deleteError } = await supabase
                    .from('user_projects')
                    .delete()
                    .eq('user_id', userId)
                    .in('project_id', toRemove)

                if (deleteError) throw deleteError
            }

            // 4. Agregar
            if (toAdd.length > 0) {
                const { error: insertError } = await supabase
                    .from('user_projects')
                    .insert(
                        toAdd.map(projectId => ({
                            user_id: userId,
                            project_id: projectId
                        }))
                    )

                if (insertError) throw insertError
            }

            return { error: null }
        } catch (err: any) {
            console.error('Error assigning projects:', err)
            return { error: err.message }
        } finally {
            setLoading(false)
        }
    }

    const getUserProjects = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('user_projects')
                .select('project_id')
                .eq('user_id', userId)

            if (error) throw error

            return { data: data.map(item => item.project_id), error: null }
        } catch (err: any) {
            console.error('Error fetching user assignments:', err)
            return { data: [], error: err.message }
        }
    }

    return {
        users,
        loading,
        error,
        fetchUsers,
        updateUser,
        toggleUserStatus,
        deleteUser,
        assignProjects,
        getUserProjects
    }
}
