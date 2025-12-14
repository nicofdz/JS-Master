'use client'

import { useState, useEffect, useCallback } from 'react'
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
  description?: string
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

  const fetchProjects = useCallback(async (includeDeleted = false) => {
    try {
      setLoading(true)
      setError(null)

      // Consulta SQL personalizada para obtener proyectos con progreso y conteo de torres
      const { data, error } = await supabase.rpc('get_projects_with_progress')

      if (error) {
        throw error
      }

      // Filtrar proyectos según includeDeleted
      if (includeDeleted) {
        setProjects(data || [])
      } else {
        setProjects((data || []).filter((p: any) => p.is_active !== false))
      }
    } catch (err: any) {
      console.error('Error fetching projects:', err)
      setError(err.message || 'Error al cargar proyectos')
    } finally {
      setLoading(false)
    }
  }, [])

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
      // Obtener el proyecto actual para agregar prefijo al nombre
      const project = projects.find(p => p.id === id)
      const currentName = project?.name || ''
      // Soft delete: marcar como eliminado usando is_active
      const { error } = await supabase
        .from('projects')
        .update({
          is_active: false
        })
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
      // Obtener el proyecto actual para remover el prefijo [ELIMINADO]
      // Necesitamos buscarlo en la BD porque podría no estar en el estado local si está filtrado
      const { data: currentProject, error: fetchError } = await supabase
        .from('projects')
        .select('name')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      const currentName = currentProject?.name || ''
      const newName = currentName.replace('[ELIMINADO] ', '')

      // Restaurar proyecto: marcar como activo y restaurar nombre
      const { error } = await supabase
        .from('projects')
        .update({
          is_active: true,
          name: newName
        })
        .eq('id', id)

      if (error) throw error

      await fetchProjects(true) // Recargar incluyendo eliminados para que la UI se actualice correctamente si estamos en vista papelera
    } catch (err: any) {
      console.error('Error restoring project:', err)
      setError(err.message || 'Error al restaurar proyecto')
      throw err
    }
  }

  const hardDeleteProject = async (id: number) => {
    try {
      console.log(`🗑️ Starting hard delete/prune for project ${id}...`)

      // 1. Identificar si hay tareas completadas que deban preservarse
      // Buscamos tareas completadas en todos los apartamentos de este proyecto
      // Necesitamos unir: projects -> towers -> floors -> apartments -> tasks
      const { data: completedTasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          apartment_id,
          apartments!inner (
            id,
            floor_id,
            floors!inner (
              id,
              tower_id,
              towers!inner (
                id,
                project_id
              )
            )
          )
        `)
        .eq('status', 'completed')
        .eq('apartments.floors.towers.project_id', id) // Esto puede requerir un filtrado manual si Supabase no soporta nesting profundo en .eq

      // Nota: Supabase a veces tiene límites con filtros profundos. 
      // Si falla, podemos buscar primero los IDs de apartamentos del proyecto.

      // Enfoque alternativo más robusto:
      // A. Obtener todas las torres del proyecto
      const { data: towers } = await supabase.from('towers').select('id').eq('project_id', id)
      const towerIds = towers?.map(t => t.id) || []

      // B. Obtener todos los pisos
      const { data: floors } = await supabase.from('floors').select('id, tower_id').in('tower_id', towerIds)
      const floorIds = floors?.map(f => f.id) || []

      // C. Obtener todos los apartamentos
      const { data: apartments } = await supabase.from('apartments').select('id, floor_id').in('floor_id', floorIds)
      const apartmentIds = apartments?.map(a => a.id) || []

      // D. Buscar tareas completadas en estos apartamentos (incluyendo las eliminadas logicamente)
      const { data: meaningfulTasks, error: meaningfulTasksError } = await supabase
        .from('tasks')
        .select('id, apartment_id')
        .in('apartment_id', apartmentIds)
        .eq('status', 'completed')
      // No filtramos is_deleted porque queremos preservar historial aunque la tarea haya sido borrada soft

      if (meaningfulTasksError) throw meaningfulTasksError

      const hasHistory = meaningfulTasks && meaningfulTasks.length > 0

      if (!hasHistory) {
        // --- ESCENARIO 1: BORRADO TOTAL ---
        console.log('No completed tasks found. Performing full delete.')

        // Eliminar Proyecto (Cascade eliminará todo lo demás)
        const { error: deleteError } = await supabase
          .from('projects')
          .delete()
          .eq('id', id)

        if (deleteError) throw deleteError

        setProjects(prev => prev.filter(p => p.id !== id))
        return { type: 'deleted', message: 'Proyecto eliminado permanentemente' }
      } else {
        // --- ESCENARIO 2: PODA (PRUNING) ---
        console.log(`Found ${meaningfulTasks.length} completed tasks. Pruning unused elements.`)

        // Identificar IDs a MANTENER
        const keptApartmentIds = new Set(meaningfulTasks.map(t => t.apartment_id))

        // Encontrar pisos a mantener (los que contienen apartamentos mantenidos)
        const keptFloorIds = new Set<number>()
        apartments?.forEach(a => {
          if (keptApartmentIds.has(a.id)) {
            keptFloorIds.add(a.floor_id)
          }
        })

        // Encontrar torres a mantener (las que contienen pisos mantenidos)
        const keptTowerIds = new Set<number>()
        floors?.forEach(f => {
          if (keptFloorIds.has(f.id)) {
            keptTowerIds.add(f.tower_id)
          }
        })

        // Ejecutar eliminación de lo NO mantenido

        // 1. Eliminar Apartamentos no usados
        const apartmentsToDelete = apartmentIds.filter(id => !keptApartmentIds.has(id))
        if (apartmentsToDelete.length > 0) {
          await supabase.from('apartments').delete().in('id', apartmentsToDelete)
        }

        // 2. Eliminar Pisos no usados
        const floorsToDelete = floorIds.filter(id => !keptFloorIds.has(id))
        if (floorsToDelete.length > 0) {
          await supabase.from('floors').delete().in('id', floorsToDelete)
        }

        // 3. Eliminar Torres no usadas
        const towersToDelete = towerIds.filter(id => !keptTowerIds.has(id))
        if (towersToDelete.length > 0) {
          await supabase.from('towers').delete().in('id', towersToDelete)
        }

        // El proyecto SE MANTIENE, pero nos aseguramos que siga inactivo y lo marcamos como ARCHIVADO
        // Actualizamos la descripción para marcarlo (esto nos permite filtrarlo en la papelera)
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            is_active: false,
            description: 'ARCHIVADO'
          })
          .eq('id', id)

        if (updateError) throw updateError

        return { type: 'pruned', message: 'Proyecto podado: Se mantuvo el historial de tareas completadas' }
      }

    } catch (err: any) {
      console.error('Error hard deleting project:', err)
      setError(err.message || 'Error al eliminar proyecto permanentemente')
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
    hardDeleteProject,
    uploadPlan,
    uploadContract,
    uploadSpecifications
  }
}
