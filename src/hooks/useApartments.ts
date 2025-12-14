'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useFloors } from './useFloors'

type Apartment = any & {
  floor_number?: number
  project_id?: number
  project_name?: string
  tasks_count?: number
  progress_percentage?: number
  tasks?: any[]
}
type ApartmentInsert = any

export function useApartments(floorId?: number) {
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [floors, setFloors] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtener la función para actualizar el status del piso
  const { updateFloorStatusFromApartments } = useFloors()

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

  const fetchFloors = async () => {
    try {
      const { data, error } = await supabase
        .from('floors')
        .select('id, floor_number, project_id, projects!inner(id, name)')
        .order('floor_number', { ascending: true })

      if (error) {
        console.error('❌ Error en fetchFloors:', error)
        throw error
      }

      console.log('✅ Datos de pisos obtenidos:', data?.length, 'pisos')

      // Procesar datos para incluir project_id y project_name
      const processedFloors = (data || []).map(floor => {
        const project = floor.projects as any
        return {
          ...floor,
          project_id: project?.id || floor.project_id || 0,
          project_name: project?.name || 'Proyecto Desconocido'
        }
      })

      console.log('✅ Pisos procesados:', processedFloors)
      setFloors(processedFloors)
    } catch (err) {
      console.error('Error fetching floors:', err)
    }
  }

  const fetchApartments = async (includeDeleted = false) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('apartments')
        .select(`
          *,
          floors!inner(
            id,
            floor_number,
            tower_id,
            towers!inner(
              id,
              tower_number,
              tower_number,
              name,
              is_active,
              projects!inner(
                id,
                name,
                is_active
              )
            )
          ),
          tasks(id, status, is_deleted)
        `)
        .order('apartment_number', { ascending: true })

      if (!includeDeleted) {
        query = query.eq('is_active', true)
      }

      if (floorId) {
        query = query.eq('floor_id', floorId)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error en fetchApartments:', error)
        throw error
      }

      console.log('✅ Datos de apartamentos obtenidos:', data?.length, 'apartamentos')

      // Procesar datos para incluir información adicional
      const processedApartments = (data || []).map(apartment => {
        const floor = apartment.floors as any
        const tower = floor?.towers as any
        const project = tower?.projects as any
        const tasks = (apartment.tasks || []).filter((task: any) => !task.is_deleted) // Filtrar tareas eliminadas
        const completedTasks = tasks.filter((task: any) => task.status === 'completed').length
        const totalTasks = tasks.length

        return {
          ...apartment,
          floor_id: floor?.id || 0,
          floor_number: floor?.floor_number || 0,
          tower_id: tower?.id || 0,
          tower_number: tower?.tower_number || 0,
          tower_name: tower?.name || `Torre ${tower?.tower_number || 0}`,
          project_id: project?.id || 0,
          project_name: project?.name || 'Proyecto Desconocido',
          project_is_active: project?.is_active !== false,
          tasks_count: totalTasks,
          progress_percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        }
      })

      setApartments(processedApartments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar apartamentos')
      console.error('Error fetching apartments:', err)
    } finally {
      setLoading(false)
    }
  }

  const createApartment = async (apartment: ApartmentInsert) => {
    try {
      console.log('🔍 Intentando crear apartamento:', apartment)

      const { data, error } = await supabase
        .from('apartments')
        .insert(apartment)
        .select(`
          *,
          floors!inner(floor_number, projects!inner(name))
        `)
        .single()

      if (error) {
        console.error('❌ Error de Supabase:', error)
        throw new Error(`Error de Supabase: ${error.message} (Código: ${error.code})`)
      }

      console.log('✅ Apartamento creado exitosamente:', data)

      // Actualizar la lista local
      const newApartment = {
        ...data,
        floor_number: (data.floors as any)?.floor_number || 0,
        project_name: (data.floors as any)?.projects?.name || 'Proyecto Desconocido',
        tasks_count: 0,
        progress_percentage: 0
      }

      setApartments(prev => [...prev, newApartment].sort((a, b) => a.apartment_number.localeCompare(b.apartment_number)))
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al crear apartamento'
      console.error('💥 Error completo:', err)
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const updateApartment = async (id: number, updates: Partial<Apartment>) => {
    try {
      console.log('🔄 useApartments - updateApartment llamado con:', { id, updates })

      const { data, error } = await supabase
        .from('apartments')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          floors!inner(floor_number, projects!inner(name))
        `)
        .single()

      if (error) {
        console.error('❌ Error en updateApartment:', error)
        throw error
      }

      console.log('✅ updateApartment exitoso:', data)

      // Actualizar la lista local - mantener campos calculados y agregar previous_status
      setApartments(prev => {
        const updated = prev.map(a => {
          if (a.id !== id) return a

          return {
            ...a, // Mantener todo el apartamento existente
            ...data, // Sobrescribir con datos actualizados de BD
            floor_number: (data.floors as any)?.floor_number || a.floor_number,
            project_name: (data.floors as any)?.projects?.name || a.project_name,
            project_id: (data.floors as any)?.projects?.id || a.project_id,
            tasks_count: a.tasks_count, // Mantener el conteo de tareas calculado
            progress_percentage: a.progress_percentage, // Mantener el progreso calculado
            previous_status: data.previous_status // Actualizar el estado anterior
          }
        })

        console.log('🔄 Apartamento actualizado:', updated.find(a => a.id === id))
        return updated
      })

      // Actualizar el status del piso si se cambió el status del apartamento
      // NO actualizar si es un bloqueo/desbloqueo (se maneja con refresh manual)
      if (updates.status && data.floor_id && updates.status !== 'blocked') {
        // Solo actualizar si no estamos bloqueando (el desbloqueo también salta esto 
        // porque previous_status estará presente en updates)
        if (!(updates as any).previous_status) {
          await updateFloorStatusFromApartments(data.floor_id)
        }
      }

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar apartamentos')
      throw err
    }
  }



  const hardDeleteApartment = async (id: number) => {
    try {
      // 1. Verificar historial (tareas completadas)
      const { data: completedTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('apartment_id', id)
        .eq('status', 'completed')

      if (tasksError) throw tasksError

      const hasHistory = completedTasks && completedTasks.length > 0

      if (!hasHistory) {
        // --- ESCENARIO 1: BORRADO TOTAL ---
        console.log('No completed tasks found. Performing full delete.')

        // Eliminar Apartamento (Cascade eliminará tasks)
        const { error: deleteAptError } = await supabase
          .from('apartments')
          .delete()
          .eq('id', id)

        if (deleteAptError) {
          console.error('❌ Error eliminando apartamento:', deleteAptError)
          throw deleteAptError
        }

        console.log('✅ Apartamento eliminado exitosamente!')
        setApartments(prev => prev.filter(a => a.id !== id))
        return { type: 'deleted', message: 'Apartamento eliminado permanentemente' }
      } else {
        // --- ESCENARIO 2: PODA (PRUNING) ---
        console.log('Found completed tasks. Pruning non-completed tasks.')

        // Eliminar tareas NO completadas (para limpiar)
        const { error: pruneError } = await supabase
          .from('tasks')
          .delete()
          .eq('apartment_id', id)
          .neq('status', 'completed')

        if (pruneError) {
          console.warn('⚠️ Error pruning non-completed tasks:', pruneError)
          // No detenemos el proceso por esto
        }

        console.log('✅ Apartamento podado: Se mantuvo el historial')
        // El apartamento se mantiene en la lista (soft deleted)
        return { type: 'pruned', message: 'Apartamento podado: Se mantuvo el historial de tareas completadas' }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar definitivamente apartamento'
      console.error('Error completo en hardDeleteApartment:', err)
      setError(errorMessage)
      throw err
    }
  }

  const deleteApartment = async (id: number) => {
    try {
      // Obtener el departamento actual para agregar prefijo al número
      // Esto es necesario porque hay una restricción UNIQUE (floor_id, apartment_number)
      // Si no modificamos el nombre, no podríamos crear otro departamento con el mismo número
      let apartment = apartments.find(a => a.id === id)
      let currentNumber = apartment?.apartment_number || ''

      // Si no está en el array local, obtenerlo de la BD
      if (!apartment || !currentNumber) {
        const { data: aptData, error: fetchError } = await supabase
          .from('apartments')
          .select('apartment_number')
          .eq('id', id)
          .single()

        if (fetchError) {
          console.error('Error obteniendo apartamento:', fetchError)
          // Continuar con string vacío si no se puede obtener
        } else if (aptData) {
          currentNumber = aptData.apartment_number || ''
        }
      }

      // Verificar si hay tareas completadas
      const { data: completedTasks, error: checkTasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('apartment_id', id)
        .eq('status', 'completed')
        .eq('is_deleted', false)
        .limit(1)

      if (checkTasksError) throw checkTasksError

      if (completedTasks && completedTasks.length > 0) {
        throw new Error('No se puede eliminar el departamento porque tiene tareas completadas. Elimine las tareas primero.')
      }

      // Agregar prefijo [ELIMINADO] para evitar conflictos de unicidad
      // La columna ahora permite hasta 50 caracteres, suficiente para el prefijo
      const newNumber = currentNumber.startsWith('[ELIMINADO] ')
        ? currentNumber
        : `[ELIMINADO] ${currentNumber}`

      // Cancelar tareas pendientes/en progreso/bloqueadas (NO las completadas)
      // Las tareas completadas se mantienen para preservar el historial financiero
      const { error: tasksError } = await supabase
        .from('tasks')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('is_deleted', false)
        .eq('apartment_id', id)
        .in('status', ['pending', 'in-progress', 'blocked'])

      if (tasksError) {
        console.error('Error cancelando tareas del apartamento:', tasksError)
        // No lanzamos error aquí, solo lo registramos
        // Continuamos con la eliminación del departamento
      } else {
        console.log('✅ Tareas pendientes/en progreso/bloqueadas canceladas correctamente')
      }

      const { data, error } = await supabase
        .from('apartments')
        .update({
          is_active: false,
          apartment_number: newNumber
        })
        .eq('id', id)
        .select(`
          *,
          floors!inner(floor_number, projects!inner(name))
        `)
        .single()

      if (error) {
        console.error('Error de Supabase al eliminar apartamento:', error)
        throw error
      }

      // Actualizar la lista local (remover de la lista ya que filtramos por is_active)
      setApartments(prev => prev.filter(a => a.id !== id))
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar apartamento'
      console.error('Error completo en softDeleteApartment:', err)
      setError(errorMessage)
      throw err
    }
  }

  const getNextApartmentNumber = async (floorId: number): Promise<string> => {
    try {
      // Obtener todos los departamentos activos del piso
      const { data, error } = await supabase
        .from('apartments')
        .select('apartment_number')
        .eq('floor_id', floorId)
        .eq('is_active', true)

      if (error) throw error

      if (!data || data.length === 0) {
        return '1'
      }

      // Extraer todos los números de cada código y encontrar el más grande
      let maxNumber = 0

      data.forEach(apt => {
        const apartmentNumber = apt.apartment_number

        // Buscar todos los números en el string
        const allNumbers = apartmentNumber.match(/\d+/g)

        if (allNumbers && allNumbers.length > 0) {
          // Convertir todos los números a enteros y encontrar el máximo
          const numbers = allNumbers.map((n: string) => parseInt(n, 10))
          const currentMax = Math.max(...numbers)

          // Actualizar el máximo global
          if (currentMax > maxNumber) {
            maxNumber = currentMax
          }
        }
      })

      // Retornar el siguiente número
      return (maxNumber + 1).toString()
    } catch (err) {
      console.error('Error getting next apartment number:', err)
      throw err
    }
  }

  const fetchAllApartments = async (includeInactive: boolean = true) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('apartments')
        .select(`
          *,
          floors!inner(
            id,
            floor_number,
            tower_id,
            towers!inner(
              id,
              tower_number,
              name,
              projects!inner(
                id,
                name
              )
            )
          ),
          tasks(id, status, is_deleted)
        `)
        .order('apartment_number', { ascending: true })

      // Si includeInactive es false, solo obtener activos
      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      if (floorId) {
        query = query.eq('floor_id', floorId)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error en fetchAllApartments:', error)
        throw error
      }

      console.log('✅ Datos de apartamentos obtenidos (incluyendo inactivos):', data?.length, 'apartamentos')

      // Procesar datos para incluir información adicional
      const processedApartments = (data || []).map(apartment => {
        const floor = apartment.floors as any
        const tower = floor?.towers as any
        const project = tower?.projects as any
        const tasks = (apartment.tasks || []).filter((task: any) => !task.is_deleted) // Filtrar tareas eliminadas
        const completedTasks = tasks.filter((task: any) => task.status === 'completed').length
        const totalTasks = tasks.length

        return {
          ...apartment,
          floor_id: floor?.id || 0,
          floor_number: floor?.floor_number || 0,
          tower_id: tower?.id || 0,
          tower_number: tower?.tower_number || 0,
          tower_name: tower?.name || `Torre ${tower?.tower_number || 0}`,
          project_id: project?.id || 0,
          project_name: project?.name || 'Proyecto Desconocido',
          project_is_active: project?.is_active !== false,
          tasks_count: totalTasks,
          progress_percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        }
      })

      setApartments(processedApartments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar apartamentos')
      console.error('Error fetching all apartments:', err)
    } finally {
      setLoading(false)
    }
  }

  const restoreApartment = async (id: number) => {
    try {
      // Obtener el departamento actual para remover el prefijo [ELIMINADO]
      const { data: aptData, error: fetchError } = await supabase
        .from('apartments')
        .select('apartment_number')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error obteniendo apartamento:', fetchError)
        throw fetchError
      }

      let currentNumber = aptData?.apartment_number || ''

      // Remover el prefijo [ELIMINADO] si existe
      const restoredNumber = currentNumber.startsWith('[ELIMINADO] ')
        ? currentNumber.replace('[ELIMINADO] ', '')
        : currentNumber

      // Restaurar tareas canceladas a 'pending' (no podemos saber su estado original)
      // Solo restaurar las que fueron canceladas por la eliminación del departamento
      const { error: tasksError } = await supabase
        .from('tasks')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('apartment_id', id)
        .eq('status', 'cancelled')
        .eq('is_deleted', false)

      if (tasksError) {
        console.error('Error restaurando tareas del apartamento:', tasksError)
        // No lanzamos error aquí, solo lo registramos
        // Continuamos con la restauración del departamento
      } else {
        console.log('✅ Tareas canceladas restauradas a pending correctamente')
      }

      const { data, error } = await supabase
        .from('apartments')
        .update({
          is_active: true,
          apartment_number: restoredNumber
        })
        .eq('id', id)
        .select(`
          *,
          floors!inner(floor_number, projects!inner(name))
        `)
        .single()

      if (error) {
        console.error('Error de Supabase al restaurar apartamento:', error)
        throw error
      }

      // Actualizar la lista local
      const restoredApartment = {
        ...data,
        floor_number: (data.floors as any)?.floor_number || 0,
        project_name: (data.floors as any)?.projects?.name || 'Proyecto Desconocido',
        tasks_count: 0,
        progress_percentage: 0
      }

      setApartments(prev => {
        const filtered = prev.filter(a => a.id !== id)
        return [...filtered, restoredApartment].sort((a, b) => a.apartment_number.localeCompare(b.apartment_number))
      })

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al restaurar apartamento'
      console.error('Error completo en restoreApartment:', err)
      setError(errorMessage)
      throw err
    }
  }

  const updateApartmentStatusFromTasks = async (apartmentId: number) => {
    try {
      // Obtener todas las tareas del apartamento (excluyendo eliminadas)
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('status')
        .eq('apartment_id', apartmentId)
        .eq('is_deleted', false)

      if (tasksError) throw tasksError

      const totalTasks = tasks?.length || 0
      const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0
      const inProgressTasks = tasks?.filter(t => t.status === 'in-progress').length || 0

      // Determinar el nuevo status
      let newStatus: string
      if (totalTasks === 0) {
        newStatus = 'pending'
      } else if (completedTasks === totalTasks) {
        newStatus = 'completed'
      } else if (inProgressTasks > 0) {
        newStatus = 'in-progress'
      } else {
        newStatus = 'pending'
      }

      // Actualizar el status del apartamento
      const { error: updateError } = await supabase
        .from('apartments')
        .update({ status: newStatus })
        .eq('id', apartmentId)

      if (updateError) throw updateError

      // Refrescar la lista de apartamentos
      await fetchApartments()
    } catch (err: any) {
      console.error('Error updating apartment status from tasks:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchProjects()
    fetchFloors()
    fetchApartments()
  }, [floorId])

  return {
    apartments,
    floors,
    projects,
    loading,
    error,
    refresh: fetchApartments,
    fetchAllApartments,
    createApartment,
    updateApartment,
    deleteApartment,
    hardDeleteApartment,
    restoreApartment,
    getNextApartmentNumber,
    updateApartmentStatusFromTasks
  }
}
