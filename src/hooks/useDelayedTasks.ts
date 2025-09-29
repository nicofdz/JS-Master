'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useDelayedTasks() {
  const [delayedCount, setDelayedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDelayedTasks = async () => {
    try {
      setLoading(true)
      setError(null)

      // Contar tareas retrasadas (EXCLUIR tareas bloqueadas)
      const { data, error: fetchError } = await supabase
        .from('apartment_tasks')
        .select('id, is_delayed, status')
        .eq('is_delayed', true)
        .neq('status', 'blocked')

      if (fetchError) throw fetchError

      setDelayedCount(data?.length || 0)
    } catch (err: any) {
      console.error('Error fetching delayed tasks:', err)
      setError(err.message || 'Error al cargar tareas atrasadas')
      setDelayedCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDelayedTasks()
  }, [])

  return {
    delayedCount,
    loading,
    error,
    refresh: fetchDelayedTasks
  }
}
