'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Project {
  id: number
  name: string
  address?: string
  city?: string
  start_date?: string
  estimated_completion?: string
  actual_completion?: string
  status: string
  plan_pdf?: string
  plan_image_url?: string
  created_at: string
  updated_at?: string
  is_active?: boolean  // Campo unificado para soft delete
  progress_percentage?: number
  progress?: number
  total_activities?: number
  activities_completed?: number
  towers_count?: number
  total_floors_count?: number
  apartments_count?: number
  initial_budget?: number
  // Datos de la Empresa Cliente
  client_company_name?: string
  client_company_rut?: string
  client_company_contact?: string
  client_company_phone?: string
  // Datos del Administrador de Obra
  site_admin_name?: string
  site_admin_rut?: string
  site_admin_phone?: string
  site_admin_email?: string
  // Datos del Contrato
  contract_date?: string
  contract_type?: string
  contract_amount?: number
  contract_pdf_url?: string
  specifications_pdf_url?: string
}

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)

      // Consulta SQL personalizada para obtener proyectos con progreso y conteo de torres
      // Ahora filtra por is_active = true (unificado con el resto del sistema)
      const { data, error } = await supabase.rpc('get_projects_with_progress')

      if (error) {
        throw error
      }

      // Filtrar proyectos activos (la función RPC debería hacerlo, pero por seguridad)
      setProjects((data || []).filter((p: any) => p.is_active !== false))
    } catch (err: any) {
      console.error('Error fetching projects:', err)
      setError(err.message || 'Error al cargar proyectos')
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (projectData: any) => {
    try {
      // Extraer 'towers' del form data (no existe en la tabla)
      const { towers, plan_pdf, ...dataToSave } = projectData
      
      // Limpiar campos numéricos: asegurar que cadenas vacías sean null/undefined
      if (dataToSave.initial_budget === '' || dataToSave.initial_budget === null) {
        dataToSave.initial_budget = null
      } else if (typeof dataToSave.initial_budget === 'string') {
        const parsed = parseFloat(dataToSave.initial_budget)
        dataToSave.initial_budget = isNaN(parsed) ? null : parsed
      }
      
      if (dataToSave.contract_amount === '' || dataToSave.contract_amount === null) {
        dataToSave.contract_amount = null
      } else if (typeof dataToSave.contract_amount === 'string') {
        const parsed = parseFloat(dataToSave.contract_amount)
        dataToSave.contract_amount = isNaN(parsed) ? null : parsed
      }
      
      const { data, error } = await supabase
        .from('projects')
        .insert(dataToSave)
        .select()
        .single()

      if (error) throw error

      // Si se especificó número de torres, crearlas automáticamente
      if (towers && towers > 0) {
        const towersToCreate = Array.from({ length: towers }, (_, index) => ({
          project_id: data.id,
          tower_number: index + 1,
          name: `Torre ${index + 1}`
        }))

        await supabase.from('towers').insert(towersToCreate)
      }

      await fetchProjects()
      return data
    } catch (err: any) {
      console.error('Error creating project:', err)
      setError(err.message || 'Error al crear proyecto')
      throw err
    }
  }

  const updateProject = async (id: number, projectData: any) => {
    try {
      // Extraer campos que no existen en la tabla
      const { towers, plan_pdf, ...dataToSave } = projectData
      
      // Limpiar campos numéricos: asegurar que cadenas vacías sean null/undefined
      if (dataToSave.initial_budget === '' || dataToSave.initial_budget === null) {
        dataToSave.initial_budget = null
      } else if (typeof dataToSave.initial_budget === 'string') {
        const parsed = parseFloat(dataToSave.initial_budget)
        dataToSave.initial_budget = isNaN(parsed) ? null : parsed
      }
      
      if (dataToSave.contract_amount === '' || dataToSave.contract_amount === null) {
        dataToSave.contract_amount = null
      } else if (typeof dataToSave.contract_amount === 'string') {
        const parsed = parseFloat(dataToSave.contract_amount)
        dataToSave.contract_amount = isNaN(parsed) ? null : parsed
      }
      
      const { data, error } = await supabase
        .from('projects')
        .update(dataToSave)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await fetchProjects()
      return data
    } catch (err: any) {
      console.error('Error updating project:', err)
      setError(err.message || 'Error al actualizar proyecto')
      throw err
    }
  }

  const deleteProject = async (id: number) => {
    try {
      // Soft delete: marcar como eliminado usando is_active (unificado con el resto del sistema)
      const { error } = await supabase
        .from('projects')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error

      await fetchProjects()
    } catch (err: any) {
      console.error('Error deleting project:', err)
      setError(err.message || 'Error al eliminar proyecto')
      throw err
    }
  }

  const restoreProject = async (id: number) => {
    try {
      // Restaurar proyecto: marcar como activo
      const { error } = await supabase
        .from('projects')
        .update({ is_active: true })
        .eq('id', id)

      if (error) throw error

      await fetchProjects()
    } catch (err: any) {
      console.error('Error restoring project:', err)
      setError(err.message || 'Error al restaurar proyecto')
      throw err
    }
  }

  const uploadPlan = async (projectId: number, file: File) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${projectId}-${Date.now()}.${fileExt}`
      const filePath = `project-plans/${fileName}`

      // Subir archivo a storage
      const { error: uploadError } = await supabase.storage
        .from('project-plans')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('project-plans')
        .getPublicUrl(filePath)

      // Actualizar proyecto con URL del plan
      const { error: updateError } = await supabase
        .from('projects')
        .update({ plan_pdf: publicUrl })
        .eq('id', projectId)

      if (updateError) throw updateError

      await fetchProjects()
    } catch (err: any) {
      console.error('Error uploading plan:', err)
      setError(err.message || 'Error al subir plano')
      throw err
    }
  }

  const uploadContract = async (projectId: number, file: File) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `contract-${projectId}-${Date.now()}.${fileExt}`
      const filePath = `project-contracts/${fileName}`

      // Subir archivo a storage
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath)

      // Actualizar proyecto con URL del contrato
      const { error: updateError } = await supabase
        .from('projects')
        .update({ contract_pdf_url: publicUrl })
        .eq('id', projectId)

      if (updateError) throw updateError

      await fetchProjects()
      return publicUrl
    } catch (err: any) {
      console.error('Error uploading contract:', err)
      setError(err.message || 'Error al subir contrato')
      throw err
    }
  }

  const uploadSpecifications = async (projectId: number, file: File) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `specifications-${projectId}-${Date.now()}.${fileExt}`
      const filePath = `project-specifications/${fileName}`

      // Subir archivo a storage
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath)

      // Actualizar proyecto con URL de especificaciones
      const { error: updateError } = await supabase
        .from('projects')
        .update({ specifications_pdf_url: publicUrl })
        .eq('id', projectId)

      if (updateError) throw updateError

      await fetchProjects()
      return publicUrl
    } catch (err: any) {
      console.error('Error uploading specifications:', err)
      setError(err.message || 'Error al subir especificaciones')
      throw err
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  return {
    projects,
    loading,
    error,
    refresh: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    restoreProject,
    uploadPlan,
    uploadContract,
    uploadSpecifications
  }
}
