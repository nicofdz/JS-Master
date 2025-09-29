'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadProjectPlanAlternative as uploadProjectPlan, deleteProjectPlanAlternative as deleteProjectPlan } from '@/lib/planUploadAlternative'
import type { Database } from '@/lib/supabase'

// Tipo combinado que incluye datos de projects + progress
type Project = Database['public']['Tables']['projects']['Row'] & {
  progress_percentage?: number
  floors_created?: number
  apartments_created?: number
  activities_completed?: number
  total_activities?: number
  progress?: number
}
type ProjectInsert = Database['public']['Tables']['projects']['Insert']

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = async () => {
    try {
      setLoading(true)
      
      // Obtener proyectos con progreso calculado automáticamente
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          *,
          floors(
            id,
            apartments(
              id,
              apartment_tasks(
                id,
                status
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Calcular progreso basado en tareas reales
      const projectsWithProgress = (projects || []).map(project => {
        let totalTasks = 0
        let completedTasks = 0
        let totalFloors = 0
        let totalApartments = 0

        // Contar tareas y apartamentos por piso (manejar casos donde no hay datos)
        if (project.floors && Array.isArray(project.floors)) {
          project.floors.forEach((floor: any) => {
            totalFloors++
            if (floor.apartments && Array.isArray(floor.apartments)) {
              floor.apartments.forEach((apartment: any) => {
                totalApartments++
                if (apartment.apartment_tasks && Array.isArray(apartment.apartment_tasks)) {
                  apartment.apartment_tasks.forEach((task: any) => {
                    totalTasks++
                    if (task.status === 'completed') {
                      completedTasks++
                    }
                  })
                }
              })
            }
          })
        }

        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        return {
          ...project,
          // Progreso calculado dinámicamente
          progress_percentage: progressPercentage,
          progress: progressPercentage,
          floors_created: totalFloors,
          apartments_created: totalApartments,
          activities_completed: completedTasks,
          total_activities: totalTasks,
          // Limpiar datos anidados para evitar problemas
          floors: undefined
        }
      })
      
      setProjects(projectsWithProgress)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar proyectos')
      console.error('Error fetching projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (project: ProjectInsert) => {
    try {
      console.log('🏗️ Creando proyecto:', project)
      
      // Crear el proyecto
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single()

      if (projectError) throw projectError
      
      console.log('✅ Proyecto creado:', projectData)
      
      // Crear pisos automáticamente si se especifica total_floors
      if (project.total_floors && project.total_floors > 0) {
        console.log('🏢 Creando', project.total_floors, 'pisos automáticamente')
        
        const floorsToCreate = []
        for (let i = 1; i <= project.total_floors; i++) {
          floorsToCreate.push({
            project_id: projectData.id,
            floor_number: i,
            status: 'pending'
          })
        }
        
        console.log('📋 Pisos a crear:', floorsToCreate)
        
        const { data: floorsData, error: floorsError } = await supabase
          .from('floors')
          .insert(floorsToCreate)
          .select()

        if (floorsError) {
          console.error('❌ Error creando pisos:', floorsError)
          throw floorsError
        }
        
        console.log('✅ Pisos creados:', floorsData)
      }
      
      // Actualizar la lista local
      setProjects(prev => [projectData, ...prev])
      return projectData
    } catch (err) {
      console.error('❌ Error en createProject:', err)
      setError(err instanceof Error ? err.message : 'Error al crear proyecto')
      throw err
    }
  }

  const updateProject = async (id: number, updates: Partial<Project>) => {
    try {
      console.log('🔍 Intentando actualizar proyecto:', { id, updates })
      
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error de Supabase:', error)
        throw error
      }
      
      console.log('✅ Proyecto actualizado exitosamente:', data)
      
      // Actualizar la lista local
      setProjects(prev => prev.map(p => p.id === id ? data : p))
      return data
    } catch (err) {
      console.error('❌ Error completo al actualizar proyecto:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar proyecto')
      throw err
    }
  }

  const deleteProject = async (id: number) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Actualizar la lista local
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar proyecto')
      throw err
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const updateProjectProgress = async (projectId: number) => {
    try {
      // Recalcular el progreso del proyecto específico
      const { data: project, error } = await supabase
        .from('projects')
        .select(`
          *,
          floors(
            id,
            apartments(
              id,
              apartment_tasks(
                id,
                status
              )
            )
          )
        `)
        .eq('id', projectId)
        .single()

      if (error) throw error

      let totalTasks = 0
      let completedTasks = 0
      let totalFloors = 0
      let totalApartments = 0

      // Contar tareas y apartamentos (manejar casos donde no hay datos)
      if (project.floors && Array.isArray(project.floors)) {
        project.floors.forEach((floor: any) => {
          totalFloors++
          if (floor.apartments && Array.isArray(floor.apartments)) {
            floor.apartments.forEach((apartment: any) => {
              totalApartments++
              if (apartment.apartment_tasks && Array.isArray(apartment.apartment_tasks)) {
                apartment.apartment_tasks.forEach((task: any) => {
                  totalTasks++
                  if (task.status === 'completed') {
                    completedTasks++
                  }
                })
              }
            })
          }
        })
      }

      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      // Actualizar el proyecto en la lista local
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? {
              ...p,
              progress_percentage: progressPercentage,
              progress: progressPercentage,
              floors_created: totalFloors,
              apartments_created: totalApartments,
              activities_completed: completedTasks,
              total_activities: totalTasks
            }
          : p
      ))

      return { progressPercentage, totalTasks, completedTasks }
    } catch (err) {
      console.error('Error updating project progress:', err)
      throw err
    }
  }

  const uploadPlan = async (projectId: number, file: File) => {
    try {
      setLoading(true)
      setError(null)
      
      const { planPdfUrl, planImageUrl } = await uploadProjectPlan(projectId, file)
      
      // Actualizar el proyecto con las URLs del plano
      const { data, error } = await supabase
        .from('projects')
        .update({
          plan_pdf: planPdfUrl,
          plan_image_url: planImageUrl,
          plan_uploaded_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('No se pudo actualizar el proyecto')
      }

      const updatedProject = data[0]

      // Actualizar la lista local
      setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p))
      return updatedProject
    } catch (err) {
      console.error('Error uploading plan:', err)
      setError(err instanceof Error ? err.message : 'Error al subir el plano')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const removePlan = async (projectId: number) => {
    try {
      setLoading(true)
      setError(null)
      
      await deleteProjectPlan(projectId)
      
      // Actualizar la lista local
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, plan_pdf: null, plan_image_url: null, plan_uploaded_at: null }
          : p
      ))
    } catch (err) {
      console.error('Error removing plan:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar el plano')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    projects,
    loading,
    error,
    refresh: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    updateProjectProgress,
    uploadPlan,
    removePlan
  }
}
