'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface TaskTemplate {
  id: number
  name: string
  category: string
  estimated_hours: number
  priority?: string | null
  description?: string | null
  sort_order: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useTaskTemplates() {
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

  const createTemplate = async (data: {
    name: string
    category: string
    estimated_hours: number
    priority?: string | null
    description?: string | null
    sort_order?: number
  }) => {
    try {
      // Obtener el siguiente sort_order si no se proporciona
      let nextSortOrder = data.sort_order
      if (!nextSortOrder) {
        const { data: maxData } = await supabase
          .from('task_templates')
          .select('sort_order')
          .order('sort_order', { ascending: false })
          .limit(1)
        
        nextSortOrder = maxData && maxData.length > 0 
          ? (maxData[0].sort_order || 0) + 1 
          : 1
      }

      const { data: newTemplate, error: createError } = await supabase
        .from('task_templates')
        .insert({
          name: data.name,
          category: data.category,
          estimated_hours: data.estimated_hours,
          priority: data.priority || 'medium',
          description: data.description || null,
          sort_order: nextSortOrder,
          is_active: true
        })
        .select()
        .single()

      if (createError) throw createError

      setTemplates(prev => [...prev, newTemplate].sort((a, b) => 
        (a.sort_order || 0) - (b.sort_order || 0)
      ))

      return newTemplate
    } catch (err: any) {
      console.error('Error creating template:', err)
      throw err
    }
  }

  const updateTemplate = async (id: number, data: {
    name?: string
    category?: string
    estimated_hours?: number
    priority?: string | null
    description?: string | null
    sort_order?: number
  }) => {
    try {
      const { data: updatedTemplate, error: updateError } = await supabase
        .from('task_templates')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      setTemplates(prev => 
        prev.map(t => t.id === id ? updatedTemplate : t)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      )

      return updatedTemplate
    } catch (err: any) {
      console.error('Error updating template:', err)
      throw err
    }
  }

  const deleteTemplate = async (id: number) => {
    try {
      // Soft delete: marcar como inactivo
      const { error: deleteError } = await supabase
        .from('task_templates')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) throw deleteError

      setTemplates(prev => prev.filter(t => t.id !== id))

      return true
    } catch (err: any) {
      console.error('Error deleting template:', err)
      throw err
    }
  }

  return {
    templates,
    loading,
    error,
    refresh: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate
  }
}

