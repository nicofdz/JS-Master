'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type Floor = any & {
  project_name?: string
  tower_id: number
  tower_number?: number
  tower_name?: string
  apartments_count?: number
  progress_percentage?: number
  total_tasks?: number
  completed_tasks?: number
  apartments_without_tasks?: number
  apartments?: any[]
}
type FloorInsert = any

export function useFloors(projectId?: number) {
  const [floors, setFloors] = useState<Floor[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .order('name', { ascending: true })

      if (error) throw error
      setProjects(data || [])
    } catch (err) {
      console.error('Error fetching projects:', err)
    }
  }

  const fetchFloors = async (includeDeleted = false) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('floors')
        .select(`
          *,
          projects!inner(id, name, status, is_active),
          towers!inner(id, tower_number, name, is_active),
          apartments(
            id, 
            apartment_code,
            apartment_number, 
            status, 
            previous_status,
            is_active
          )
        `)
        .order('floor_number', { ascending: true })

      if (!includeDeleted) {
        query = query.eq('is_active', true)
      }

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error

      // Obtener todos los IDs de apartamentos para consultar sus tareas (tasks V2)
      const allApartmentIds: number[] = []
        ; (data || []).forEach(floor => {
          const apartments = floor.apartments || []
          apartments.forEach((apt: any) => {
            if (apt.is_active !== false && apt.id) {
              allApartmentIds.push(apt.id)
            }
          })
        })

      // Consultar tareas de todos los apartamentos (tasks V2)
      let tasksByApartment: Record<number, Array<{ id: number; status: string }>> = {}
      if (allApartmentIds.length > 0) {
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('id, apartment_id, status')
          .in('apartment_id', allApartmentIds)
          .eq('is_deleted', false) // Excluir tareas eliminadas (soft delete)

        if (tasksError) {
          console.error('Error fetching tasks:', tasksError)
        } else if (tasksData) {
          // Agrupar tareas por apartment_id
          tasksData.forEach((task: any) => {
            if (!tasksByApartment[task.apartment_id]) {
              tasksByApartment[task.apartment_id] = []
            }
            tasksByApartment[task.apartment_id].push({
              id: task.id,
              status: task.status
            })
          })
        }
      }

      // Filtrar pisos que pertenecen a proyectos activos y torres activas
      const validFloors = (data || []).filter(floor => {
        const project = floor.projects as any
        const tower = floor.towers as any

        // Si estamos incluyendo eliminados, permitimos pisos de torres/proyectos inactivos
        if (includeDeleted) return true

        const isValid = project?.is_active === true &&
          project?.status === 'active' &&
          tower?.is_active === true

        if (!isValid) {
          console.log('❌ Piso filtrado:', {
            floor_id: floor.id,
            floor_number: floor.floor_number,
            project_id: project?.id,
            project_name: project?.name,
            project_is_active: project?.is_active,
            project_status: project?.status,
            tower_id: tower?.id,
            tower_is_active: tower?.is_active
          })
        }
        return isValid
      })

      console.log('✅ Pisos válidos después del filtro:', validFloors.length, 'de', (data || []).length)

      // Procesar datos para incluir información adicional
      const processedFloors = validFloors.map(floor => {
        // Filtrar solo apartments activos si no estamos en modo papelera
        const allApartments = floor.apartments || []
        const apartments = Array.isArray(allApartments)
          ? allApartments.filter((apt: any) => includeDeleted ? true : apt.is_active !== false)
          : []
        const totalApartments = apartments.length
        const tower = floor.towers as any

        // Calcular progreso basado en tareas (tasks V2)
        let totalTasks = 0
        let completedTasks = 0
        let delayedTasks = 0
        let apartmentsWithoutTasks = 0

        // Agregar tareas a cada apartamento y calcular estadísticas
        const apartmentsWithTasks = apartments.map((apt: any) => {
          const tasks = tasksByApartment[apt.id] || []
          return {
            ...apt,
            tasks: tasks // Agregar tareas al apartamento (tasks V2)
          }
        })

        apartmentsWithTasks.forEach((apt: any) => {
          const tasks = apt.tasks || []
          totalTasks += tasks.length
          completedTasks += tasks.filter((task: any) => task.status === 'completed').length

          // Contar tareas retrasadas (excluir bloqueadas y canceladas)
          delayedTasks += tasks.filter((task: any) =>
            task.is_delayed === true &&
            task.status !== 'blocked' &&
            task.status !== 'cancelled'
          ).length

          // Contar apartamentos sin tareas
          if (tasks.length === 0) {
            apartmentsWithoutTasks++
          }
        })

        const progress_percentage = totalTasks > 0
          ? Math.round((completedTasks / totalTasks) * 100)
          : 0

        const processedFloor = {
          ...floor,
          project_name: (floor.projects as any)?.name || 'Proyecto Desconocido',
          tower_id: floor.tower_id || tower?.id, // Asegurar que tower_id esté presente
          tower_number: tower?.tower_number || 1,
          tower_name: tower?.name || `Torre ${tower?.tower_number || 1}`,
          apartments_count: totalApartments,
          progress_percentage,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          delayed_tasks: delayedTasks,
          apartments_without_tasks: apartmentsWithoutTasks,
          apartments: apartmentsWithTasks // Incluir apartamentos con tareas
        }

        // Debug: verificar que tower_id esté presente
        if (!processedFloor.tower_id) {
          console.warn('⚠️ Piso sin tower_id:', {
            floor_id: floor.id,
            floor_number: floor.floor_number,
            project_id: floor.project_id,
            tower: tower
          })
        }

        return processedFloor
      })

      setFloors(processedFloors)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pisos')
      console.error('Error fetching floors:', err)
    } finally {
      setLoading(false)
    }
  }

  const createFloor = async (floor: FloorInsert) => {
    try {
      console.log('🔍 Intentando crear piso:', floor)

      const { data, error } = await supabase
        .from('floors')
        .insert(floor)
        .select(`
      *,
          projects!inner(name),
          towers!inner(id, tower_number, name)
        `)
        .single()

      if (error) {
        console.error('❌ Error de Supabase:', error)
        throw new Error(`Error de Supabase: ${error.message} (Código: ${error.code})`)
      }

      console.log('✅ Piso creado exitosamente:', data)

      const tower = data.towers as any

      // Actualizar la lista local
      const newFloor = {
        ...data,
        project_name: (data.projects as any)?.name || 'Proyecto Desconocido',
        tower_number: tower?.tower_number || 1,
        tower_name: tower?.name || `Torre ${tower?.tower_number || 1}`,
        apartments_count: 0,
        progress_percentage: 0
      }

      setFloors(prev => [...prev, newFloor].sort((a, b) => {
        if (a.tower_number !== b.tower_number) return a.tower_number - b.tower_number
        return a.floor_number - b.floor_number
      }))
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al crear piso'
      console.error('💥 Error completo:', err)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const updateFloor = async (id: number, updates: Partial<Floor>) => {
    try {
      const { data, error } = await supabase
        .from('floors')
        .update(updates)
        .eq('id', id)
        .select(`
      *,
          projects!inner(name)
        `)
        .single()

      if (error) throw error

      // Actualizar la lista local
      setFloors(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar piso')
      throw err
    }
  }

