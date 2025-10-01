'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type Task = {
  id: number
  apartment_id: number
  task_name: string
  task_description?: string
  task_category?: string
  status: string
  priority?: string
  assigned_to?: number
  start_date?: string
  end_date?: string
  actual_start_time?: string
  actual_end_time?: string
  is_delayed?: boolean
  delay_reason?: string
  worker_payment?: number
  created_at: string
  updated_at: string
  apartment_number?: string
  floor_number?: number
  project_name?: string
  assigned_user_name?: string
  materials_count?: number
}

type TaskInsert = {
  apartment_id: number
  task_name: string
  task_description?: string
  task_category?: string
  status?: string
  priority?: string
  assigned_to?: number
  start_date?: string
  end_date?: string
  worker_payment?: number
}

type TaskUpdate = {
  task_name?: string
  task_description?: string
  task_category?: string
  status?: string
  priority?: string
  assigned_to?: number
  start_date?: string
  end_date?: string
  worker_payment?: number
}

export function useTasks(apartmentId?: number) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [apartments, setApartments] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [floors, setFloors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [taskStats, setTaskStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    blocked: 0,
    delayed: 0
  })

  const fetchApartments = async () => {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('id, apartment_number, floor_id, floors!inner(floor_number, project_id, projects!inner(name))')
        .order('apartment_number', { ascending: true })

      if (error) throw error
      setApartments(data || [])
    } catch (err) {
      console.error('Error fetching apartments:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name, rut')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .order('name')

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
        .select('id, floor_number, project_id, projects!inner(name)')
        .order('floor_number')

      if (error) throw error
      setFloors(data || [])
    } catch (err) {
      console.error('Error fetching floors:', err)
    }
  }

  const fetchTaskStats = async (projectId?: number) => {
    try {
      console.log('📊 fetchTaskStats called with projectId:', projectId)
      
      // Consulta simple sin JOINs para evitar problemas
      let query = supabase
        .from('apartment_tasks')
        .select('status, is_delayed')

      const { data, error } = await query

      if (error) throw error

      // Si hay filtro de proyecto, filtrar después
      let filteredData = data || []
      if (projectId && typeof projectId === 'number') {
        console.log('🔍 Filtering by project:', projectId)
        // Necesitamos hacer una consulta separada para obtener las tareas del proyecto
        const { data: projectTasks } = await supabase
          .from('apartment_tasks')
          .select('status, is_delayed, apartments!inner(floors!inner(project_id))')
          .eq('apartments.floors.project_id', projectId)
        
        filteredData = projectTasks || []
      }

      // Contar por estado
      const stats = {
        total: filteredData.length,
        pending: filteredData.filter(t => t.status === 'pending').length,
        inProgress: filteredData.filter(t => t.status === 'in-progress').length,
        completed: filteredData.filter(t => t.status === 'completed').length,
        blocked: filteredData.filter(t => t.status === 'blocked').length,
        delayed: filteredData.filter(t => t.is_delayed === true).length
      }

      console.log('📊 Task Stats Debug:', {
        projectId,
        dataLength: filteredData.length,
        allStatuses: filteredData.map(t => t.status),
        stats
      })

      setTaskStats(stats)
    } catch (err) {
      console.error('Error fetching task stats:', err)
    }
  }

  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('apartment_tasks')
        .select(`
          *,
          apartments!inner(
            apartment_number,
            floor_id,
            floors!inner(
              id,
              floor_number,
              project_id,
              projects!inner(
                id,
                name
              )
            )
          ),
          workers!apartment_tasks_assigned_to_fkey(full_name, rut),
          task_materials(id)
        `)
        .order('created_at', { ascending: false })

      if (apartmentId) {
        query = query.eq('apartment_id', apartmentId)
      }

      const { data, error } = await query

      if (error) throw error

      const processedTasks = (data || []).map(task => ({
        ...task,
        apartment_number: (task.apartments as any)?.apartment_number,
        floor_number: (task.apartments as any)?.floors?.floor_number,
        floor_id: (task.apartments as any)?.floors?.id,
        project_name: (task.apartments as any)?.floors?.projects?.name,
        project_id: (task.apartments as any)?.floors?.projects?.id,
        assigned_user_name: (task.workers as any)?.full_name,
        materials_count: (task.task_materials as any[])?.length || 0
      }))

      setTasks(processedTasks)
    } catch (err: any) {
      console.error('Error fetching tasks:', err)
      setError(err.message || 'Error al cargar tareas')
    } finally {
      setLoading(false)
    }
  }

  const createTask = async (taskData: TaskInsert) => {
    try {
      // Si no se especifica start_date, usar la fecha actual
      // Convertir undefined o string vacío a null
      const dataToInsert = {
        ...taskData,
        start_date: taskData.start_date || new Date().toISOString().split('T')[0],
        end_date: taskData.end_date || null,
        completed_at: taskData.completed_at || null
      }
      
      const { data, error } = await supabase
        .from('apartment_tasks')
        .insert(dataToInsert)
        .select(`
          *,
          apartments!inner(
            apartment_number,
            floors!inner(
              floor_number,
              project_id,
              projects!inner(name)
            )
          ),
          workers!apartment_tasks_assigned_to_fkey(full_name, rut),
          task_materials(id)
        `)
        .single()

      if (error) {
        console.error('Supabase error creating task:', error)
        throw new Error(`Error Supabase: ${error.message} (Código: ${error.code})`)
      }
      if (data) {
        // Procesar la nueva tarea como en fetchTasks
        const processedTask = {
          ...data,
          apartment_number: (data.apartments as any)?.apartment_number,
          floor_number: (data.apartments as any)?.floors?.floor_number,
          project_name: (data.apartments as any)?.floors?.projects?.name,
          assigned_user_name: (data.workers as any)?.full_name,
          materials_count: (data.task_materials as any[])?.length || 0
        }
        
        // Agregar a la lista local sin recargar
        setTasks(prevTasks => [processedTask, ...prevTasks])
        
        // Actualizar estadísticas localmente
        const currentStats = { ...taskStats }
        currentStats.total++
        
        if (data.status === 'pending') currentStats.pending++
        else if (data.status === 'in-progress') currentStats.inProgress++
        else if (data.status === 'completed') currentStats.completed++
        else if (data.status === 'blocked') currentStats.blocked++
        
        setTaskStats(currentStats)
        
        return data
      }
      return null
    } catch (err: any) {
      console.error('Error creating task:', err)
      setError(err instanceof Error ? err.message : 'Error al crear tarea')
      throw err
    }
  }

  const updateTask = async (id: number, taskData: TaskUpdate) => {
    try {
      // Si el status cambia a 'completed' y no hay completed_at, establecer la fecha actual
      // Limpiar strings vacíos convirtiéndolos a null
      const dataToUpdate = {
        ...taskData,
        start_date: taskData.start_date === '' ? null : taskData.start_date,
        end_date: taskData.end_date === '' ? null : taskData.end_date,
        completed_at: taskData.status === 'completed' && !taskData.completed_at
          ? new Date().toISOString()
          : (taskData.completed_at === '' ? null : taskData.completed_at)
      }
      
      const { data, error } = await supabase
        .from('apartment_tasks')
        .update(dataToUpdate)
        .eq('id', id)
        .select(`
          *,
          apartments!inner(
            apartment_number,
            floors!inner(
              floor_number,
              projects!inner(name)
            )
          ),
          workers!apartment_tasks_assigned_to_fkey(full_name)
        `)
        .single()

      if (error) {
        console.error('Supabase error updating task:', error)
        throw new Error(`Error Supabase: ${error.message} (Código: ${error.code})`)
      }
      if (data) {
        // Actualizar el estado local con los datos completos
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === id 
              ? {
                  ...task,
                  ...taskData,
                  assigned_user_name: data.workers?.full_name || null,
                  apartment_number: data.apartments?.apartment_number,
                  floor_number: data.apartments?.floors?.floor_number,
                  project_name: data.apartments?.floors?.projects?.name,
                  updated_at: new Date().toISOString()
                }
              : task
          )
        )
        
        // Actualizar estadísticas localmente
        const currentStats = { ...taskStats }
        const oldTask = tasks.find(t => t.id === id)
        const newStatus = taskData.status
        
        if (oldTask && oldTask.status !== newStatus) {
          // Decrementar el estado anterior
          if (oldTask.status === 'pending') currentStats.pending--
          else if (oldTask.status === 'in-progress') currentStats.inProgress--
          else if (oldTask.status === 'completed') currentStats.completed--
          else if (oldTask.status === 'blocked') currentStats.blocked--
          
          // Incrementar el nuevo estado
          if (newStatus === 'pending') currentStats.pending++
          else if (newStatus === 'in-progress') currentStats.inProgress++
          else if (newStatus === 'completed') currentStats.completed++
          else if (newStatus === 'blocked') currentStats.blocked++
          
          setTaskStats(currentStats)
        }
        
        return data
      }
      return null
    } catch (err: any) {
      console.error('Error updating task:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar tarea')
      throw err
    }
  }

  const deleteTask = async (id: number) => {
    try {
      const { error } = await supabase
        .from('apartment_tasks')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Supabase error deleting task:', error)
        throw new Error(`Error Supabase: ${error.message} (Código: ${error.code})`)
      }
      
      // Actualizar el estado local sin recargar
      const deletedTask = tasks.find(t => t.id === id)
      setTasks(prevTasks => prevTasks.filter(task => task.id !== id))
      
      // Actualizar estadísticas localmente
      if (deletedTask) {
        const currentStats = { ...taskStats }
        currentStats.total--
        
        if (deletedTask.status === 'pending') currentStats.pending--
        else if (deletedTask.status === 'in-progress') currentStats.inProgress--
        else if (deletedTask.status === 'completed') currentStats.completed--
        else if (deletedTask.status === 'blocked') currentStats.blocked--
        
        setTaskStats(currentStats)
      }
    } catch (err: any) {
      console.error('Error deleting task:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar tarea')
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
    } catch (err: any) {
      console.error('Error updating apartment status from tasks:', err)
      throw err
    }
  }

  useEffect(() => {
    console.log('🔄 useTasks useEffect triggered')
    fetchApartments()
    fetchUsers()
    fetchProjects()
    fetchFloors()
    fetchTasks()
    fetchTaskStats()
  }, [apartmentId])

  return {
    tasks,
    apartments,
    users,
    projects,
    floors,
    loading,
    error,
    taskStats,
    refresh: fetchTasks,
    refreshStats: fetchTaskStats,
    createTask,
    updateTask,
    deleteTask,
    updateApartmentStatusFromTasks
  }
}
