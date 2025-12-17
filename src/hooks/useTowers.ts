'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface Tower {
  id: number
  project_id: number
  tower_number: number
  name?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  project_name?: string
}

type TowerInsert = {
  project_id: number
  tower_number: number
  name?: string
  description?: string
}

export function useTowers(projectId?: number) {
  const { user, profile, assignedProjectIds } = useAuth()
  const [towers, setTowers] = useState<Tower[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userRole = profile?.role || null

  const fetchTowers = async (includeDeleted = false) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('towers')
        .select(`
          *,
          projects!inner(name)
        `)
        .order('project_id', { ascending: true })
        .order('tower_number', { ascending: true })

      if (!includeDeleted) {
        query = query.eq('is_active', true)
      }

      if (projectId) {
        // Security Check
        if (userRole && userRole !== 'admin' && !assignedProjectIds.includes(projectId)) {
          setTowers([])
          setLoading(false)
          return
        }
        query = query.eq('project_id', projectId)
      } else {
        // General filter if no project specified
        if (userRole && userRole !== 'admin') {
          if (assignedProjectIds.length > 0) {
            query = query.in('project_id', assignedProjectIds)
          } else {
            setTowers([])
            setLoading(false)
            return
          }
        }
      }

      const { data, error } = await query

      if (error) throw error

      const processedTowers = (data || []).map(tower => ({
        ...tower,
        project_name: (tower.projects as any)?.name || 'Proyecto Desconocido'
      }))

      setTowers(processedTowers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar torres')
      console.error('Error fetching towers:', err)
    } finally {
      setLoading(false)
    }
  }

  const createTower = async (tower: TowerInsert) => {
    try {
      const { data, error } = await supabase
        .from('towers')
        .insert(tower)
        .select(`
          *,
          projects!inner(name)
        `)
        .single()

      if (error) throw error

      const newTower = {
        ...data,
        project_name: (data.projects as any)?.name || 'Proyecto Desconocido'
      }

      setTowers(prev => [...prev, newTower].sort((a, b) => {
        if (a.project_id !== b.project_id) return a.project_id - b.project_id
        return a.tower_number - b.tower_number
      }))

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear torre')
      throw err
    }
  }

  const updateTower = async (id: number, updates: Partial<Tower>) => {
    try {
      const { data, error } = await supabase
        .from('towers')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          projects!inner(name)
        `)
        .single()

      if (error) throw error

      setTowers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar torre')
      throw err
    }
  }

  const deleteTower = async (id: number) => {
    try {
      const { error } = await supabase
        .from('towers')
        .delete()
        .eq('id', id)

      if (error) throw error
      setTowers(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar torre')
      throw err
    }
  }

  const checkTowerDependencies = async (id: number) => {
    try {
      const { data: floors, error: floorsError } = await supabase
        .from('floors')
        .select('id')
        .eq('tower_id', id)
        .eq('is_active', true)

      if (floorsError) throw floorsError
      if (!floors || floors.length === 0) return { hasDependencies: false, count: 0 }

      const floorIds = floors.map(f => f.id)
      const { data: apartments, error: apartmentsError } = await supabase
        .from('apartments')
        .select('id')
        .in('floor_id', floorIds)
        .eq('is_active', true)

      if (apartmentsError) throw apartmentsError
      if (!apartments || apartments.length === 0) return { hasDependencies: false, count: 0 }

      const apartmentIds = apartments.map(a => a.id)
      const { count, error: tasksError } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('apartment_id', apartmentIds)
        .eq('status', 'completed')
        .eq('is_deleted', false)

      if (tasksError) throw tasksError

      return {
        hasDependencies: (count || 0) > 0,
        count: count || 0
      }
    } catch (err) {
      console.error('Error checking tower dependencies:', err)
      throw err
    }
  }

  const softDeleteTower = async (id: number, force: boolean = false) => {
    try {
      // 1. Verificar si hay tareas completadas (si no es forzado)
      if (!force) {
        const { hasDependencies } = await checkTowerDependencies(id)
        if (hasDependencies) {
          throw new Error('HAS_COMPLETED_TASKS')
        }
      }

      // 2. Proceder con el soft delete en cascada
      // Recuperar pisos para la cascada (necesario aunque force=true)
      const { data: floors, error: floorsError } = await supabase
        .from('floors')
        .select('id')
        .eq('tower_id', id)
        .eq('is_active', true)

      if (floorsError) throw floorsError

      // Soft delete de departamentos
      if (floors && floors.length > 0) {
        const floorIds = floors.map(f => f.id)

        const { data: apartmentsToUpdate, error: fetchAptsError } = await supabase
          .from('apartments')
          .select('id, apartment_number')
          .in('floor_id', floorIds)
          .eq('is_active', true)

        if (fetchAptsError) throw fetchAptsError

        if (apartmentsToUpdate && apartmentsToUpdate.length > 0) {
          const aptIds = apartmentsToUpdate.map(a => a.id)

          // OPTIMIZACION: Cancelar todas las tareas en una sola consulta
          await supabase
            .from('tasks')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .in('apartment_id', aptIds)
            .eq('is_deleted', false)

          // Actualizar departamentos uno por uno para mantener la lógica de renombrado
          // (Si no fuera necesario renombrar, podríamos hacer un bulk update también)
          for (const apt of apartmentsToUpdate) {
            const currentNumber = apt.apartment_number
            const newNumber = currentNumber.startsWith('[ELIMINADO] ')
              ? currentNumber
              : `[ELIMINADO] ${currentNumber}`

            await supabase
              .from('apartments')
              .update({
                is_active: false,
                apartment_number: newNumber
              })
              .eq('id', apt.id)
          }
        }
      }

      // Soft delete de pisos
      await supabase
        .from('floors')
        .update({ is_active: false })
        .eq('tower_id', id)

      // Soft delete de la torre
      // Obtener la torre actual para agregar prefijo al nombre
      const tower = towers.find(t => t.id === id)
      const currentName = tower?.name || `Torre ${tower?.tower_number || ''}`
      const newName = currentName.startsWith('[ELIMINADO] ')
        ? currentName
        : `[ELIMINADO] ${currentName}`

      const { data, error } = await supabase
        .from('towers')
        .update({
          is_active: false,
          name: newName
        })
        .eq('id', id)
        .select(`
          *,
          projects!inner(name)
        `)
        .single()

      if (error) throw error

      // Actualizar la lista local (remover de la lista ya que filtramos por is_active)
      setTowers(prev => prev.filter(t => t.id !== id))
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar torre')
      throw err
    }
  }

  const restoreTower = async (id: number) => {
    try {
      // 1. Restaurar la torre
      // Obtener el nombre actual de la BD
      const { data: currentTower, error: fetchError } = await supabase
        .from('towers')
        .select('name')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      const currentName = currentTower?.name || ''
      const newName = currentName.replace('[ELIMINADO] ', '')

      const { data, error } = await supabase
        .from('towers')
        .update({
          is_active: true,
          name: newName
        })
        .eq('id', id)
        .select(`
          *,
          projects!inner(name)
        `)
        .single()

      if (error) throw error

      // 2. Restaurar pisos asociados (Cascada)
      await supabase
        .from('floors')
        .update({ is_active: true })
        .eq('tower_id', id)
        .eq('is_active', false)

      // 3. Restaurar departamentos asociados (Cascada)
      // Primero obtener los pisos de la torre (ahora activos)
      const { data: floors } = await supabase
        .from('floors')
        .select('id')
        .eq('tower_id', id)

      if (floors && floors.length > 0) {
        const floorIds = floors.map(f => f.id)

        // Obtener departamentos eliminados de estos pisos
        const { data: apartments } = await supabase
          .from('apartments')
          .select('id, apartment_number')
          .in('floor_id', floorIds)
          .eq('is_active', false)

        if (apartments && apartments.length > 0) {
          for (const apt of apartments) {
            const currentNumber = apt.apartment_number
            const restoredNumber = currentNumber.replace('[ELIMINADO] ', '')

            await supabase
              .from('apartments')
              .update({
                is_active: true,
                apartment_number: restoredNumber
              })
              .eq('id', apt.id)

            // Restaurar tareas canceladas
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
      }

      // Actualizar la lista local agregando la torre restaurada
      const restoredTower = {
        ...data,
        project_name: (data.projects as any)?.name || 'Proyecto Desconocido'
      }

      setTowers(prev => [...prev, restoredTower].sort((a, b) => {
        if (a.project_id !== b.project_id) return a.project_id - b.project_id
        return a.tower_number - b.tower_number
      }))

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restaurar torre')
      throw err
    }
  }

  const hardDeleteTower = async (id: number) => {
    try {
      console.log(`🗑️ Iniciando hard delete de la torre ${id}...`)

      // 1. Obtener toda la estructura (pisos y departamentos)
      const { data: floors, error: floorsError } = await supabase
        .from('floors')
        .select('id')
        .eq('tower_id', id)

      if (floorsError) throw floorsError

      const floorIds = floors?.map(f => f.id) || []

      let apartmentIds: number[] = []
      if (floorIds.length > 0) {
        const { data: apartments, error: apartmentsError } = await supabase
          .from('apartments')
          .select('id, floor_id')
          .in('floor_id', floorIds)

        if (apartmentsError) throw apartmentsError
        apartmentIds = apartments?.map(a => a.id) || []
      }

      // 2. Verificar historial (tareas completadas)
      const keptApartmentIds = new Set<number>()

      if (apartmentIds.length > 0) {
        const { data: meaningfulTasks, error: meaningfulTasksError } = await supabase
          .from('tasks')
          .select('id, apartment_id')
          .in('apartment_id', apartmentIds)
          .eq('status', 'completed')

        if (meaningfulTasksError) throw meaningfulTasksError

        meaningfulTasks?.forEach(t => keptApartmentIds.add(t.apartment_id))
      }

      const hasHistory = keptApartmentIds.size > 0

      // Helper para limpiar dependencias de tareas (constraint de pagos)
      const cleanupTaskDependencies = async (aptIds: number[]) => {
        if (aptIds.length === 0) return

        // 1. Obtener tareas de 'tasks'
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id')
          .in('apartment_id', aptIds)

        if (tasks && tasks.length > 0) {
          const taskIds = tasks.map(t => t.id)
          // Eliminar dependencias de pagos y asignaciones
          await supabase.from('payment_task_assignments').delete().in('task_id', taskIds)
          await supabase.from('payment_distribution_history').delete().in('task_id', taskIds)
          await supabase.from('task_assignments').delete().in('task_id', taskIds)
        }

        // 2. Obtener tareas de 'apartment_tasks' (si existe y es relevante para constraints)
        const { data: aptTasks } = await supabase
          .from('apartment_tasks')
          .select('id')
          .in('apartment_id', aptIds)

        if (aptTasks && aptTasks.length > 0) {
          const aptTaskIds = aptTasks.map(t => t.id)
          await supabase.from('payment_tasks').delete().in('task_id', aptTaskIds)
          await supabase.from('task_materials').delete().in('apartment_task_id', aptTaskIds)
          await supabase.from('progress_photos').delete().in('apartment_task_id', aptTaskIds)
        }
      }

      if (!hasHistory) {
        // --- ESCENARIO 1: BORRADO TOTAL ---
        console.log('No completed tasks found. Performing full delete of tower.')

        // NEW: Limpiar dependencias antes de borrar
        if (apartmentIds.length > 0) {
          await cleanupTaskDependencies(apartmentIds)
        }

        // Borrar torre (Cascade borrará pisos, deptos y tareas)
        const { error: deleteTowerError } = await supabase
          .from('towers')
          .delete()
          .eq('id', id)

        if (deleteTowerError) throw deleteTowerError

        console.log('✅ Torre eliminada permanentemente')
        setTowers(prev => prev.filter(t => t.id !== id))
        return { type: 'deleted', message: 'Torre eliminada permanentemente' }
      } else {
        // --- ESCENARIO 2: PODA (PRUNING) ---
        console.log(`Found history in ${keptApartmentIds.size} apartments. Pruning tower.`)

        // a. Eliminar departamentos sin historial (limpiando dependencias primero)
        const apartmentsToDelete = apartmentIds.filter(id => !keptApartmentIds.has(id))
        if (apartmentsToDelete.length > 0) {
          await cleanupTaskDependencies(apartmentsToDelete)
          await supabase.from('apartments').delete().in('id', apartmentsToDelete)
        }

        // b. Identificar pisos a mantener (los que tienen deptos con historial)
        // Necesitamos saber qué piso corresponde a qué depto, o volver a consultar
        // O más fácil: Consultar los pisos de los departamentos guardados
        // Pero ya tenemos floorIds, podemos verificar cuáles quedan vacíos.
        // Simplificación: Un piso se queda SI tiene algún apartmentId en keptApartmentIds
        // Requerimos mapeo aptId -> floorId.
        // Recuperemos esa data
        const { data: keptApartmentsFloors } = await supabase
          .from('apartments')
          .select('floor_id')
          .in('id', Array.from(keptApartmentIds))

        const keptFloorIds = new Set(keptApartmentsFloors?.map(a => a.floor_id))

        // c. Eliminar pisos que NO están en keptFloorIds
        const floorsToDelete = floorIds.filter(fid => !keptFloorIds.has(fid))
        if (floorsToDelete.length > 0) {
          await supabase.from('floors').delete().in('id', floorsToDelete)
        }

        console.log('✅ Torre podada: Se mantuvo el historial')
        return { type: 'pruned', message: 'Torre podada: Se mantuvo el historial de tareas completadas' }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar torre definitivamente')
      throw err
    }
  }

  const getNextTowerNumber = async (projectId: number): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('towers')
        .select('tower_number')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('tower_number', { ascending: false })
        .limit(1)

      if (error) throw error

      if (!data || data.length === 0) {
        return 1
      }

      return (data[0].tower_number || 0) + 1
    } catch (err) {
      console.error('Error getting next tower number:', err)
      throw err
    }
  }

  const createTowersForProject = async (projectId: number, totalTowers: number) => {
    try {
      const towersToCreate = Array.from({ length: totalTowers }, (_, index) => ({
        project_id: projectId,
        tower_number: index + 1,
        name: `Torre ${index + 1}`
      }))

      const { data, error } = await supabase
        .from('towers')
        .insert(towersToCreate)
        .select(`
          *,
          projects!inner(name)
        `)

      if (error) throw error

      const newTowers = (data || []).map(tower => ({
        ...tower,
        project_name: (tower.projects as any)?.name || 'Proyecto Desconocido'
      }))

      setTowers(prev => [...prev, ...newTowers].sort((a, b) => {
        if (a.project_id !== b.project_id) return a.project_id - b.project_id
        return a.tower_number - b.tower_number
      }))

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear torres')
      throw err
    }
  }

  useEffect(() => {
    // Only fetch if access info is loaded (userRole is available via profile from useAuth)
    if (userRole) {
      fetchTowers()
    }
  }, [projectId, userRole, assignedProjectIds])

  return {
    towers,
    loading,
    error,
    refresh: fetchTowers,
    createTower,
    updateTower,
    deleteTower,
    softDeleteTower,
    checkTowerDependencies,
    hardDeleteTower,
    restoreTower,
    getNextTowerNumber,
    createTowersForProject
  }
}

