'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface TaskTemplate {
  id: number
  name: string
  category: string
  estimated_hours: number
  sort_order: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useActivityTemplates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)

      // Consultar la tabla task_templates (plantillas de tareas)
      // Las tareas reales se guardan en apartment_tasks
      const { data, error: fetchError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (fetchError) throw fetchError

      setTemplates(data || [])
    } catch (err: any) {
      console.error('Error fetching task templates:', err)
      setError(err.message || 'Error al cargar las plantillas de tareas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  return {
    templates,
    loading,
    error,
    refresh: fetchTemplates
  }
}

