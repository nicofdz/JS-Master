'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface ApartmentTemplate {
  id: number
  project_id: number
  name: string
  apartment_code?: string | null
  apartment_type: string
  status: string
  area: number | null
  floor_area: number | null
  balcony_area: number | null
  bedrooms: number
  bathrooms: number
  notes: string | null
  created_at: string
  updated_at: string
}

export function useApartmentTemplates(projectId?: number) {
  const [templates, setTemplates] = useState<ApartmentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('apartment_templates')
        .select('*')
        .order('name', { ascending: true })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setTemplates(data || [])
    } catch (err: any) {
      console.error('Error fetching apartment templates:', err)
      setError(err.message || 'Error al cargar las plantillas de departamentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [projectId])

  const createTemplate = async (data: {
    project_id: number
    name: string
    apartment_code?: string | null
    apartment_type?: string
    status?: string
    area?: number | null
    floor_area?: number | null
    balcony_area?: number | null
    bedrooms?: number
    bathrooms?: number
    notes?: string | null
  }) => {
    try {
      const { data: newTemplate, error: createError } = await supabase
        .from('apartment_templates')
        .insert({
          project_id: data.project_id,
          name: data.name,
          apartment_code: data.apartment_code || null,
          apartment_type: data.apartment_type || 'Departamento',
          status: data.status || 'pending',
          area: data.area || null,
          floor_area: data.floor_area || null,
          balcony_area: data.balcony_area || null,
          bedrooms: data.bedrooms || 0,
          bathrooms: data.bathrooms || 0,
          notes: data.notes || null
        })
        .select()
        .single()

      if (createError) throw createError

      setTemplates(prev => [...prev, newTemplate].sort((a, b) =>
        a.name.localeCompare(b.name)
      ))

      return newTemplate
    } catch (err: any) {
      console.error('Error creating template:', err)
      throw err
    }
  }

  const updateTemplate = async (id: number, data: {
    name?: string
    apartment_code?: string | null
    apartment_type?: string
    status?: string
    area?: number | null
    floor_area?: number | null
    balcony_area?: number | null
    bedrooms?: number
    bathrooms?: number
    notes?: string | null
  }) => {
    try {
      const { data: updatedTemplate, error: updateError } = await supabase
        .from('apartment_templates')
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
          .sort((a, b) => a.name.localeCompare(b.name))
      )

      return updatedTemplate
    } catch (err: any) {
      console.error('Error updating template:', err)
      throw err
    }
  }

  const deleteTemplate = async (id: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('apartment_templates')
        .delete()
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

