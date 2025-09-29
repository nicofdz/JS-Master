import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Worker {
  id: number
  full_name: string
  rut: string
  email?: string
  phone?: string
  is_active: boolean
  // Campos adicionales
  nacionalidad?: string
  ciudad?: string
  direccion?: string
  estado_civil?: string
  fecha_nacimiento?: string
  prevision?: string
  salud?: string
  cargo?: string
  created_at: string
  updated_at: string
}

export interface WorkerFormData {
  full_name: string
  rut: string
  email?: string
  phone?: string
  is_active?: boolean
  // Campos adicionales
  nacionalidad?: string
  ciudad?: string
  direccion?: string
  estado_civil?: string
  fecha_nacimiento?: string
  prevision?: string
  salud?: string
  cargo?: string
}

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar trabajadores
  const fetchWorkers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setWorkers(data || [])
    } catch (err: any) {
      console.error('Error fetching workers:', err)
      setError(err.message || 'Error al cargar trabajadores')
    } finally {
      setLoading(false)
    }
  }

  // Crear trabajador
  const createWorker = async (workerData: WorkerFormData) => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .insert([{
          full_name: workerData.full_name,
          rut: workerData.rut,
          email: workerData.email || null,
          phone: workerData.phone || null,
          is_active: workerData.is_active ?? true,
          // Campos adicionales
          nacionalidad: workerData.nacionalidad || null,
          ciudad: workerData.ciudad || null,
          direccion: workerData.direccion || null,
          estado_civil: workerData.estado_civil || null,
          fecha_nacimiento: workerData.fecha_nacimiento || null,
          prevision: workerData.prevision || null,
          salud: workerData.salud || null,
          cargo: workerData.cargo || null
        }])
        .select()
        .single()

      if (error) {
        throw error
      }

      setWorkers(prev => [data, ...prev])
      return data
    } catch (err: any) {
      console.error('Error creating worker:', err)
      throw new Error(err.message || 'Error al crear trabajador')
    }
  }

  // Actualizar trabajador
  const updateWorker = async (id: number, workerData: WorkerFormData) => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .update({
          full_name: workerData.full_name,
          rut: workerData.rut,
          email: workerData.email || null,
          phone: workerData.phone || null,
          is_active: workerData.is_active ?? true,
          // Campos adicionales
          nacionalidad: workerData.nacionalidad || null,
          ciudad: workerData.ciudad || null,
          direccion: workerData.direccion || null,
          estado_civil: workerData.estado_civil || null,
          fecha_nacimiento: workerData.fecha_nacimiento || null,
          prevision: workerData.prevision || null,
          salud: workerData.salud || null,
          cargo: workerData.cargo || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      setWorkers(prev => prev.map(worker => 
        worker.id === id ? data : worker
      ))
      return data
    } catch (err: any) {
      console.error('Error updating worker:', err)
      throw new Error(err.message || 'Error al actualizar trabajador')
    }
  }

  // Eliminar trabajador
  const deleteWorker = async (id: number) => {
    try {
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      setWorkers(prev => prev.filter(worker => worker.id !== id))
    } catch (err: any) {
      console.error('Error deleting worker:', err)
      throw new Error(err.message || 'Error al eliminar trabajador')
    }
  }

  // Refrescar datos
  const refresh = () => {
    fetchWorkers()
  }

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchWorkers()
  }, [])

  return {
    workers,
    loading,
    error,
    createWorker,
    updateWorker,
    deleteWorker,
    refresh
  }
}
