'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { useFloors } from './useFloors'

type Apartment = Database['public']['Tables']['apartments']['Row'] & {
  floor_number?: number
  project_name?: string
  tasks_count?: number
  progress_percentage?: number
  tasks?: any[]
}
type ApartmentInsert = Database['public']['Tables']['apartments']['Insert']

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
        .select('id, floor_number, projects(id, name)')
        .order('floor_number', { ascending: true })

      if (error) {
        console.error('❌ Error en fetchFloors:', error)
        throw error
      }
      
      console.log('✅ Datos de pisos obtenidos:', data?.length, 'pisos')
      
      // Procesar datos para incluir project_id
      const processedFloors = (data || []).map(floor => ({
        ...floor,
        project_id: floor.projects?.id || 0,
        project_name: floor.projects?.name || 'Proyecto Desconocido'
      }))
      
      setFloors(processedFloors)
    } catch (err) {
      console.error('Error fetching floors:', err)
    }
  }

  const fetchApartments = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('apartments')
        .select(`
          *,
          floors(floor_number, projects(id, name)),
          apartment_tasks(id, status)
        `)
        .order('apartment_number', { ascending: true })

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
        const project = floor?.projects as any
        const tasks = apartment.apartment_tasks || []
        const completedTasks = tasks.filter((task: any) => task.status === 'completed').length
        const totalTasks = tasks.length
        
        return {
          ...apartment,
          floor_number: floor?.floor_number || 0,
          project_id: project?.id || 0,
          project_name: project?.name || 'Proyecto Desconocido',
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
      
      // Actualizar la lista local
      setApartments(prev => prev.map(a => a.id === id ? { 
        ...data,
        floor_number: (data.floors as any)?.floor_number || 0,
        project_name: (data.floors as any)?.projects?.name || 'Proyecto Desconocido',
        tasks_count: a.tasks_count, // Mantener el conteo de tareas
        progress_percentage: a.progress_percentage // Mantener el progreso
      } : a))
      
      // Actualizar el status del piso si se cambió el status del apartamento
      if (updates.status && data.floor_id) {
        await updateFloorStatusFromApartments(data.floor_id)
      }
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar apartamentos')
      throw err
    }
  }

  const deleteApartment = async (id: number) => {
    try {
      const { error } = await supabase
        .from('apartments')
        .delete()
        .eq('id', id)

      if (error) throw error
      setApartments(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar apartamentos')
      throw err
    }
  }

  const updateApartmentStatusFromTasks = async (apartmentId: number) => {
    try {
      // Obtener todas las tareas del apartamento
      const { data: tasks, error: tasksError } = await supabase
        .from('apartment_tasks')
        .select('status')
        .eq('apartment_id', apartmentId)

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
    createApartment,
    updateApartment,
    deleteApartment,
    updateApartmentStatusFromTasks
  }
}
