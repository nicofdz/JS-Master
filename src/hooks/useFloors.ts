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

        // Verificar explícitamente que el proyecto y la torre estén activos
        // is_active puede ser true, false o null (se asume true si es null por compatibilidad)
        // AHORA PERMITIMOS PROYECTOS INACTIVOS para mostrar su historial
        const isProjectActive = project?.is_active !== false
        const isProjectStatusActive = project?.status === 'active'
        const isTowerActive = tower?.is_active !== false

        // Antes filtrábamos estrictamente: const isValid = isProjectActive && isProjectStatusActive && isTowerActive
        // Ahora permitimos todo, pero logueamos si es inactivo para debug
        return true
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

  const hardDeleteFloor = async (id: number) => {
    try {
      console.log(`🗑️ Iniciando hard delete del piso ${id}...`)

      // 1. Obtener apartamentos del piso
      const { data: apartments, error: apartmentsError } = await supabase
        .from('apartments')
        .select('id')
        .eq('floor_id', id)

      if (apartmentsError) {
        console.error('❌ Error obteniendo apartamentos:', apartmentsError)
        throw apartmentsError
      }

      const apartmentIds = apartments?.map(a => a.id) || []

      // 2. Verificar historial (tareas completadas)
      let hasHistory = false
      const keptApartmentIds = new Set<number>()

      if (apartmentIds.length > 0) {
        // Buscar tareas completadas en estos apartamentos
        const { data: meaningfulTasks, error: meaningfulTasksError } = await supabase
          .from('tasks')
          .select('id, apartment_id')
          .in('apartment_id', apartmentIds)
          .eq('status', 'completed')

        if (meaningfulTasksError) throw meaningfulTasksError

        if (meaningfulTasks && meaningfulTasks.length > 0) {
          hasHistory = true
          meaningfulTasks.forEach(t => keptApartmentIds.add(t.apartment_id))
        }
      }

      if (!hasHistory) {
        // --- ESCENARIO 1: BORRADO TOTAL ---
        console.log('No completed tasks found. Performing full delete.')

        // Eliminar Floor (Cascade eliminará apartamentos y tasks)
        const { error: deleteFloorError } = await supabase
          .from('floors')
          .delete()
          .eq('id', id)

        if (deleteFloorError) {
          console.error('❌ Error eliminando piso:', deleteFloorError)
          throw deleteFloorError
        }

        console.log('✅ Piso eliminado exitosamente!')
        setFloors(prev => prev.filter(f => f.id !== id))
        return { type: 'deleted', message: 'Piso eliminado permanentemente' }
      } else {
        // --- ESCENARIO 2: PODA (PRUNING) ---
        console.log('Found completed tasks. Pruning unused apartments.')

        // Eliminar apartamentos que NO tienen historial
        const apartmentsToDelete = apartmentIds.filter(aptId => !keptApartmentIds.has(aptId))

        if (apartmentsToDelete.length > 0) {
          const { error: pruneError } = await supabase
            .from('apartments')
            .delete()
            .in('id', apartmentsToDelete)

          if (pruneError) throw pruneError
        }

        console.log('✅ Piso podado: Se mantuvo el historial')
        // El piso se mantiene en la lista (soft deleted)
        return { type: 'pruned', message: 'Piso podado: Se mantuvo el historial de tareas completadas' }
      }

    } catch (err) {
      console.error('❌ Error completo en hardDeleteFloor:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar piso permanentemente'
      setError(errorMessage)
      throw err
    }
  }

  const deleteFloor = async (id: number) => {
    try {
      // Primero, hacer soft delete de todos los departamentos del piso (cascada)
      const { data: apartments, error: apartmentsError } = await supabase
        .from('apartments')
        .select('id, apartment_number')
        .eq('floor_id', id)
        .eq('is_active', true)

      if (apartmentsError) throw apartmentsError

      // Verificar si hay tareas completadas en los departamentos
      if (apartments && apartments.length > 0) {
        const apartmentIds = apartments.map(a => a.id)
        const { data: completedTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id')
          .in('apartment_id', apartmentIds)
          .eq('status', 'completed')
          .eq('is_deleted', false)
          .limit(1)

        if (tasksError) throw tasksError

        if (completedTasks && completedTasks.length > 0) {
          throw new Error('No se puede eliminar el piso porque contiene departamentos con tareas completadas. Elimine las tareas primero.')
        }
      }

      // Soft delete de todos los departamentos
      if (apartments && apartments.length > 0) {
        const apartmentUpdates = apartments.map(apt => {
          const currentNumber = apt.apartment_number
          const newNumber = currentNumber.startsWith('[ELIMINADO] ')
            ? currentNumber
            : `[ELIMINADO] ${currentNumber}`

          return {
            id: apt.id,
            apartment_number: newNumber,
            is_active: false
          }
        })

        // Actualizar cada departamento
        for (const update of apartmentUpdates) {
          const { error: aptError } = await supabase
            .from('apartments')
            .update({
              is_active: false,
              apartment_number: update.apartment_number
            })
            .eq('id', update.id)

          if (aptError) throw aptError
        }
      }

      // Ahora hacer soft delete del piso
      const { data, error } = await supabase
        .from('floors')
        .update({ is_active: false })
        .eq('id', id)
        .select(`
      *,
          projects!inner(name),
          towers!inner(id, tower_number, name)
        `)
        .single()

      if (error) throw error

      // Actualizar la lista local (remover de la lista ya que filtramos por is_active)
      setFloors(prev => prev.filter(f => f.id !== id))
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar piso')
      throw err
    }
  }

  const getNextFloorNumber = async (towerId: number, type: 'normal' | 'subterranean' = 'normal'): Promise<number> => {
    try {
      if (type === 'normal') {
        // Para pisos normales: buscar el máximo positivo y sumar 1
        const { data, error } = await supabase
          .from('floors')
          .select('floor_number')
          .eq('tower_id', towerId)
          .eq('is_active', true)
          .gte('floor_number', 1) // Solo pisos positivos
          .order('floor_number', { ascending: false })
          .limit(1)

        if (error) throw error

        if (!data || data.length === 0) {
          return 1
        }

        return (data[0].floor_number || 0) + 1
      } else {
        // Para subterráneos: buscar el mínimo negativo y restar 1
        const { data, error } = await supabase
          .from('floors')
          .select('floor_number')
          .eq('tower_id', towerId)
          .eq('is_active', true)
          .lt('floor_number', 1) // Solo pisos negativos
          .order('floor_number', { ascending: true })
          .limit(1)

        if (error) throw error

        if (!data || data.length === 0) {
          return -1
        }

        return (data[0].floor_number || 0) - 1
      }
    } catch (err) {
      console.error('Error getting next floor number:', err)
      throw err
    }
  }

  const updateFloorStatusFromApartments = async (floorId: number) => {
    try {
      // Obtener todos los apartamentos activos del piso (excluyendo bloqueados)
      const { data: apartments, error: apartmentsError } = await supabase
        .from('apartments')
        .select('id, status')
        .eq('floor_id', floorId)
        .eq('is_active', true)
        .neq('status', 'blocked')

      if (apartmentsError) throw apartmentsError

      const totalApartments = apartments?.length || 0
      const completedApartments = apartments?.filter(a => a.status === 'completed').length || 0
      const inProgressApartments = apartments?.filter(a => a.status === 'in-progress').length || 0

      // Obtener tareas retrasadas del piso (EXCLUIR tareas bloqueadas) solo si hay apartamentos (tasks V2)
      const apartmentIds = apartments?.map(a => a.id) || []

      let delayedTasksCount = 0
      if (apartmentIds.length > 0) {
        const { data: delayedTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id, is_delayed, status')
          .in('apartment_id', apartmentIds)
          .eq('is_delayed', true)
          .eq('is_deleted', false) // Excluir tareas eliminadas (soft delete)
          .neq('status', 'blocked')

        if (tasksError) throw tasksError
        delayedTasksCount = delayedTasks?.length || 0
      }

      // Determinar el nuevo status (PRIORIDAD: retrasado > completado > en progreso > pendiente)
      let newStatus: string
      if (totalApartments === 0) {
        newStatus = 'pending'
      } else if (delayedTasksCount > 0) {
        // Si hay tareas retrasadas, el piso está retrasado
        // TEMPORAL: usar 'in-progress' hasta que se ejecute el script SQL
        newStatus = 'in-progress' // Cambiar a 'delayed' después de ejecutar el script
        console.log('⚠️ Piso con tareas retrasadas - usando in-progress temporalmente')
      } else if (completedApartments === totalApartments) {
        newStatus = 'completed'
      } else if (inProgressApartments > 0 || completedApartments > 0) {
        newStatus = 'in-progress'
      } else {
        newStatus = 'pending'
      }

      // Actualizar el status del piso
      const { error: updateError } = await supabase
        .from('floors')
        .update({ status: newStatus })
        .eq('id', floorId)

      if (updateError) throw updateError

      console.log('🏢 Piso actualizado:', {
        floorId,
        newStatus,
        totalApartments,
        completedApartments,
        inProgressApartments,
        delayedTasksCount
      })

      // Refrescar la lista de pisos
      await fetchFloors()
    } catch (err: any) {
      console.error('Error updating floor status from apartments:', err)
      throw err
    }
  }

  const createFloorsForProject = async (projectId: number, totalFloors: number, towerIds: number[]) => {
    try {
      // Crear pisos para cada torre usando tower_id
      const floorsToCreate = []
      for (const towerId of towerIds) {
        for (let floor = 1; floor <= totalFloors; floor++) {
          floorsToCreate.push({
            project_id: projectId,
            tower_id: towerId,
            floor_number: floor,
            status: 'pending' as const
          })
        }
      }

      const { data, error } = await supabase
        .from('floors')
        .insert(floorsToCreate)
        .select(`
          *,
          projects!inner(name),
          towers!inner(id, tower_number, name)
        `)

      if (error) throw error

      // Actualizar la lista local
      const newFloors = (data || []).map(floor => {
        const tower = floor.towers as any
        return {
          ...floor,
          project_name: (floor.projects as any)?.name || 'Proyecto Desconocido',
          tower_number: tower?.tower_number || 1,
          tower_name: tower?.name || `Torre ${tower?.tower_number || 1}`,
          apartments_count: 0,
          progress_percentage: 0
        }
      })

      // Ordenar por torre y luego por piso
      setFloors(prev => [...prev, ...newFloors].sort((a, b) => {
        if (a.tower_number !== b.tower_number) {
          return a.tower_number - b.tower_number
        }
        return a.floor_number - b.floor_number
      }))
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear pisos')
      throw err
    }
  }

  const restoreFloor = async (id: number) => {
    try {
      // 1. Restaurar el piso
      const { data, error } = await supabase
        .from('floors')
        .update({ is_active: true })
        .eq('id', id)
        .select(`
          *,
          projects!inner(name),
          towers!inner(id, tower_number, name)
        `)
        .single()

      if (error) throw error

      // 2. Restaurar los departamentos asociados (Cascada)
      // Obtener departamentos eliminados de este piso
      const { data: apartments, error: apartmentsError } = await supabase
        .from('apartments')
        .select('id, apartment_number')
        .eq('floor_id', id)
        .eq('is_active', false)

      if (apartmentsError) {
        console.error('Error al obtener departamentos para restaurar:', apartmentsError)
        // No lanzamos error para no interrumpir la restauración del piso, pero logueamos
      } else if (apartments && apartments.length > 0) {
        // Preparar actualizaciones
        for (const apt of apartments) {
          const currentNumber = apt.apartment_number
          // Remover prefijo [ELIMINADO] si existe
          const restoredNumber = currentNumber.startsWith('[ELIMINADO] ')
            ? currentNumber.replace('[ELIMINADO] ', '')
            : currentNumber

          // Restaurar departamento
          await supabase
            .from('apartments')
            .update({
              is_active: true,
              apartment_number: restoredNumber
            })
            .eq('id', apt.id)

          // También restaurar tareas canceladas a 'pending'
          await supabase
            .from('tasks')
            .update({
              status: 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('apartment_id', apt.id)
            .eq('status', 'cancelled')
            .eq('is_deleted', false)
        }
      }

      await fetchFloors(true) // Recargar incluyendo eliminados para actualizar la vista
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restaurar piso')
      throw err
    }
  }

  useEffect(() => {
    fetchProjects()
    fetchFloors()
  }, [projectId])

  return {
    floors,
    setFloors,
    projects,
    loading,
    error,
    refresh: fetchFloors,
    createFloor,
    updateFloor,
    deleteFloor,
    hardDeleteFloor,
    restoreFloor,
    getNextFloorNumber,
    createFloorsForProject,
    updateFloorStatusFromApartments
  }
}
