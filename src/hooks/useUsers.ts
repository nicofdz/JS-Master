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

    return {
        users,
        loading,
        error,
        fetchUsers,
        updateUser,
        toggleUserStatus,
        deleteUser
    }
}
