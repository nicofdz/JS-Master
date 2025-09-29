'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type Floor = Database['public']['Tables']['floors']['Row'] & {
  project_name?: string
  apartments_count?: number
  progress_percentage?: number
}
type FloorInsert = Database['public']['Tables']['floors']['Insert']

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

  const fetchFloors = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('floors')
        .select(`
          *,
          projects!inner(name),
          apartments(id, apartment_number, status)
        `)
        .order('floor_number', { ascending: true })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error

      // Procesar datos para incluir información adicional
      const processedFloors = (data || []).map(floor => {
        const apartments = floor.apartments || []
        const completedApartments = apartments.filter((apt: any) => apt.status === 'completed').length
        const totalApartments = apartments.length
        
        return {
          ...floor,
          project_name: (floor.projects as any)?.name || 'Proyecto Desconocido',
          apartments_count: totalApartments,
          progress_percentage: totalApartments > 0 ? Math.round((completedApartments / totalApartments) * 100) : 0
        }
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
          projects!inner(name)
        `)
        .single()

      if (error) {
        console.error('❌ Error de Supabase:', error)
        throw new Error(`Error de Supabase: ${error.message} (Código: ${error.code})`)
      }
      
      console.log('✅ Piso creado exitosamente:', data)
      
      // Actualizar la lista local
      const newFloor = {
        ...data,
        project_name: (data.projects as any)?.name || 'Proyecto Desconocido',
        apartments_count: 0,
        progress_percentage: 0
      }
      
      setFloors(prev => [...prev, newFloor].sort((a, b) => a.floor_number - b.floor_number))
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

  const deleteFloor = async (id: number) => {
    try {
      const { error } = await supabase
        .from('floors')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Actualizar la lista local
      setFloors(prev => prev.filter(f => f.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar piso')
      throw err
    }
  }

  const updateFloorStatusFromApartments = async (floorId: number) => {
    try {
      // Obtener todos los apartamentos del piso (excluyendo bloqueados)
      const { data: apartments, error: apartmentsError } = await supabase
        .from('apartments')
        .select('status')
        .eq('floor_id', floorId)
        .neq('status', 'blocked')

      if (apartmentsError) throw apartmentsError

      const totalApartments = apartments?.length || 0
      const completedApartments = apartments?.filter(a => a.status === 'completed').length || 0
      const inProgressApartments = apartments?.filter(a => a.status === 'in-progress').length || 0

      // Obtener tareas retrasadas del piso (EXCLUIR tareas bloqueadas)
      const { data: delayedTasks, error: tasksError } = await supabase
        .from('apartment_tasks')
        .select('id, is_delayed, status')
        .in('apartment_id', apartments?.map(a => a.id) || [])
        .eq('is_delayed', true)
        .neq('status', 'blocked')

      if (tasksError) throw tasksError

      const delayedTasksCount = delayedTasks?.length || 0

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

  const createFloorsForProject = async (projectId: number, totalFloors: number) => {
    try {
      const floorsToCreate = Array.from({ length: totalFloors }, (_, index) => ({
        project_id: projectId,
        floor_number: index + 1,
        status: 'pending' as const
      }))

      const { data, error } = await supabase
        .from('floors')
        .insert(floorsToCreate)
        .select(`
          *,
          projects!inner(name)
        `)

      if (error) throw error
      
      // Actualizar la lista local
      const newFloors = (data || []).map(floor => ({
        ...floor,
        project_name: (floor.projects as any)?.name || 'Proyecto Desconocido',
        apartments_count: 0,
        progress_percentage: 0
      }))
      
      setFloors(prev => [...prev, ...newFloors].sort((a, b) => a.floor_number - b.floor_number))
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear pisos')
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
    createFloorsForProject,
    updateFloorStatusFromApartments
  }
}
