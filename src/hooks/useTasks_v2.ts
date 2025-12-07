'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// Helper function to calculate days delayed
function calculateDaysDelayed(task: any): number {
  if (!task.is_delayed) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Si está en progreso y tiene end_date, calcular desde end_date
  if (task.status === 'in_progress' && task.end_date) {
    const endDate = new Date(task.end_date)
    endDate.setHours(0, 0, 0, 0)
    const diff = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  // Si está completada y tiene end_date, calcular desde end_date usando completed_at
  if (task.status === 'completed' && task.end_date && task.completed_at) {
    const endDate = new Date(task.end_date)
    endDate.setHours(0, 0, 0, 0)
    const completedDate = new Date(task.completed_at)
    completedDate.setHours(0, 0, 0, 0)
    const diff = Math.floor((completedDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  // Si no está iniciada y tiene start_date, calcular desde start_date
  if (task.start_date) {
    const startDate = new Date(task.start_date)
    startDate.setHours(0, 0, 0, 0)
    const diff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  return 0
}

export interface Worker {
  id: number
  full_name: string
  payment_share_percentage: number
  worker_payment: number
  assignment_status: 'assigned' | 'working' | 'completed' | 'removed'
  assignment_id: number
  role?: string
  is_paid?: boolean
  paid_at?: string
  completed_at?: string
  contract_type?: 'por_dia' | 'a_trato'  // ✅ Agregado contract_type
}

export interface TaskV2 {
  id: number
  apartment_id: number
  task_name: string
  task_description?: string
  task_category: string
  status: string
  priority: string
  total_budget: number
  start_date?: string
  end_date?: string
  completed_at?: string
  is_delayed?: boolean
  delay_reason?: string
  days_delayed?: number
  notes?: string
  created_at: string
  updated_at: string
  // Datos relacionados
  apartment_code?: string | null
  apartment_number?: string
  floor_number?: number
  floor_id?: number
  tower_number?: number
  tower_id?: number
  project_name?: string
  project_id?: number
  workers: Worker[]
  progress_photos?: any[]
}

export interface TaskStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  blocked: number
  delayed: number
}

export function useTasksV2() {
  const [tasks, setTasks] = useState<TaskV2[]>([])
  const [apartments, setApartments] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [floors, setFloors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [taskStats, setTaskStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    blocked: 0,
    delayed: 0
  })

  // Fetch tasks from tasks_with_workers_v2 view
  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks_with_workers_v2')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Process tasks and parse workers JSON
      const processedTasks = (data || []).map(task => {
        let workers: Worker[] = []
        if (task.workers) {
          try {
            // If workers is a string, parse it
            const parsedWorkers = typeof task.workers === 'string'
              ? JSON.parse(task.workers)
              : task.workers

            // Ensure workers is an array and has valid data
            if (Array.isArray(parsedWorkers)) {
              workers = parsedWorkers.map((w: any) => ({
                id: w.id || w.worker_id,
                full_name: w.full_name || w.worker_name || 'Sin nombre',
                payment_share_percentage: Number(w.payment_share_percentage || 0),
                worker_payment: Number(w.worker_payment || 0),
                assignment_status: w.assignment_status || 'assigned',
                assignment_id: w.assignment_id || w.id,
                role: w.role || 'worker',
                is_paid: w.is_paid || false,
                paid_at: w.paid_at,
                started_at: w.started_at,
                completed_at: w.completed_at,
                contract_type: w.contract_type || 'a_trato'  // ✅ Agregado contract_type
              }))
            }
          } catch (e) {
            console.error('Error parsing workers:', e, 'Task:', task.task_id || task.id)
            workers = []
          }
        }

        // IMPORTANTE: La vista devuelve 'task_id', no 'id'
        const processedTask = {
          ...task,
          id: task.task_id || task.id, // Mapear task_id → id
          workers: Array.isArray(workers) ? workers : []
        }

        // Calcular days_delayed si la tarea está retrasada
        if (processedTask.is_delayed) {
          processedTask.days_delayed = calculateDaysDelayed(processedTask)
        }

        return processedTask
      })

      setTasks(processedTasks)
    } catch (err: any) {
      console.error('Error fetching tasks:', err)
      setError(err.message)
    }
  }, [])

  // Fetch apartments
  const fetchApartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select(`
          *,
          floors!inner(
            id,
            floor_number,
            project_id,
            projects!inner(
              id,
              name
            )
          )
        `)
        .eq('is_active', true)
        .order('apartment_number')

      if (error) throw error
      setApartments(data || [])
    } catch (err: any) {
      console.error('Error fetching apartments:', err)
    }
  }, [])

  // Fetch workers
  const fetchWorkers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('is_deleted', false)
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      console.error('Error fetching workers:', err)
    }
  }, [])

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setProjects(data || [])
    } catch (err: any) {
      console.error('Error fetching projects:', err)
    }
  }, [])

  // Fetch floors
  const fetchFloors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('floors')
        .select(`
          *,
          projects!inner(
            id,
            name
          )
        `)
        .eq('is_active', true)
        .order('floor_number')

      if (error) throw error
      setFloors(data || [])
    } catch (err: any) {
      console.error('Error fetching floors:', err)
    }
  }, [])

  // Fetch task statistics
  const fetchTaskStats = useCallback(async (projectId?: number) => {
    try {
      const { data, error } = await supabase.rpc('get_task_stats', {
        p_project_id: projectId || null
      })

      if (error) throw error

      if (data && data.length > 0) {
        const stats = data[0]
        setTaskStats({
          total: stats.total_tasks || 0,
          pending: stats.pending_tasks || 0,
          inProgress: stats.in_progress_tasks || 0,
          completed: stats.completed_tasks || 0,
          blocked: stats.blocked_tasks || 0,
          delayed: stats.delayed_tasks || 0
        })
      }
    } catch (err: any) {
      console.error('Error fetching task stats:', err)
    }
  }, [])

  // Create task
  const createTask = async (taskData: any) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          apartment_id: taskData.apartment_id,
          task_name: taskData.task_name,
          task_description: taskData.task_description || null,
          task_category: taskData.task_category,
          status: taskData.status || 'pending',
          priority: taskData.priority || 'medium',
          estimated_hours: taskData.estimated_hours || null,
          total_budget: taskData.total_budget || 0,
          start_date: taskData.start_date || null,
          end_date: taskData.end_date || null,
          notes: taskData.notes || null
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Tarea creada exitosamente')
      await fetchTasks()
      await fetchTaskStats()
      return data
    } catch (err: any) {
      console.error('Error creating task:', err)
      toast.error(`Error al crear tarea: ${err.message}`)
      throw err
    }
  }

  // Update task
  const updateTask = async (taskId: number, updates: any) => {
    try {
      // If status is being changed to completed, use the RPC function
      if (updates.status === 'completed') {
        const { error } = await supabase.rpc('complete_task_manually', {
          p_task_id: taskId,
          p_completed_at: updates.completed_at || new Date().toISOString()
        })
        if (error) throw error
      } else {
        // Sanitize updates to remove fields that don't exist in the tasks table
        const {
          floor_id,
          tower_id,
          project_id,
          apartment_code,
          apartment_number,
          floor_number,
          tower_number,
          project_name,
          workers,
          ...validUpdates
        } = updates

        // Regular update
        const { error } = await supabase
          .from('tasks')
          .update({
            ...validUpdates,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId)

        if (error) throw error
      }

      toast.success('Tarea actualizada exitosamente')
      await fetchTasks()
      await fetchTaskStats()
    } catch (err: any) {
      console.error('Error updating task:', err)
      toast.error(`Error al actualizar tarea: ${err.message}`)
      throw err
    }
  }

  // Delete task (soft delete)
  const deleteTask = async (taskId: number, reason: string) => {
    try {
      const { error } = await supabase.rpc('soft_delete_task', {
        p_task_id: taskId,
        p_deletion_reason: reason
      })

      if (error) throw error

      toast.success('Tarea eliminada exitosamente')
      await fetchTasks()
      await fetchTaskStats()
    } catch (err: any) {
      console.error('Error deleting task:', err)
      toast.error(`Error al eliminar tarea: ${err.message}`)
      throw err
    }
  }

  // Hard delete task (permanent deletion)
  const hardDeleteTask = async (taskId: number) => {
    try {
      // Primero eliminar asignaciones asociadas (aunque debería ser CASCADE, es más seguro explícito)
      const { error: assignmentsError } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId)

      if (assignmentsError) {
        console.error('Error deleting assignments for hard delete:', assignmentsError)
      }

      // Eliminar la tarea permanentemente
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      toast.success('Tarea eliminada definitivamente')
      await fetchTasks()
      await fetchTaskStats()
    } catch (err: any) {
      console.error('Error hard deleting task:', err)
      toast.error(`Error al eliminar definitivamente la tarea: ${err.message}`)
      throw err
    }
  }

  // Fetch deleted tasks
  const fetchDeletedTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('deleted_tasks_view')
        .select('*')
        .order('deleted_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (err: any) {
      console.error('Error fetching deleted tasks:', err)
      toast.error(`Error al cargar tareas eliminadas: ${err.message}`)
      return []
    }
  }

  // Get deleted tasks count only (without loading all data)
  const getDeletedTasksCount = async () => {
    try {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', true)

      if (error) throw error
      return count || 0
    } catch (err: any) {
      console.error('Error fetching deleted tasks count:', err)
      return 0
    }
  }

  // Restore task
  const restoreTask = async (taskId: number) => {
    try {
      const { error } = await supabase.rpc('restore_task', {
        p_task_id: taskId
      })

      if (error) throw error

      toast.success('Tarea restaurada exitosamente')
      await fetchTasks()
      await fetchTaskStats()
    } catch (err: any) {
      console.error('Error restoring task:', err)
      toast.error(`Error al restaurar tarea: ${err.message}`)
      throw err
    }
  }

  // Assign worker to task
  const assignWorkerToTask = async (taskId: number, workerId: number, role: string = 'worker') => {
    try {
      const { error } = await supabase.rpc('assign_worker_to_task', {
        p_task_id: taskId,
        p_worker_id: workerId,
        p_role: role
      })

      if (error) throw error

      toast.success('Trabajador asignado exitosamente')
      await fetchTasks()
    } catch (err: any) {
      console.error('Error assigning worker:', err)
      toast.error(`Error al asignar trabajador: ${err.message}`)
      throw err
    }
  }

  // Adjust payment distribution
  const adjustPaymentDistribution = async (
    taskId: number,
    distributions: Array<{ worker_id: number; percentage: number }>,
    reason?: string
  ) => {
    try {
      // Validate that percentages sum to 100
      const total = distributions.reduce((sum, d) => sum + d.percentage, 0)
      if (Math.abs(total - 100) > 0.01) {
        throw new Error('Los porcentajes deben sumar exactamente 100%')
      }

      const { error } = await supabase.rpc('adjust_payment_distribution', {
        p_task_id: taskId,
        p_distributions: distributions,
        p_change_reason: reason || null
      })

      if (error) throw error

      toast.success('Distribución de pagos ajustada exitosamente')
      await fetchTasks()
    } catch (err: any) {
      console.error('Error adjusting distribution:', err)
      toast.error(`Error al ajustar distribución: ${err.message}`)
      throw err
    }
  }

  // Remove worker from task
  const removeWorkerFromTask = async (assignmentId: number, reason?: string) => {
    try {
      const { error } = await supabase.rpc('remove_worker_from_task', {
        p_assignment_id: assignmentId,
        p_removal_reason: reason || null
      })

      if (error) throw error

      toast.success('Trabajador removido exitosamente')
      await fetchTasks()
    } catch (err: any) {
      console.error('Error removing worker:', err)
      toast.error(`Error al remover trabajador: ${err.message}`)
      throw err
    }
  }

  // Get workers for a specific project (with active contracts)
  const getWorkersForProject = async (projectId: number) => {
    try {
      const { data, error } = await supabase
        .from('contract_history')
        .select(`
          id,
          worker_id,
          contract_type,
          workers!inner(
            id,
            full_name,
            rut,
            cargo
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'activo')
        .eq('is_active', true)

      if (error) throw error

      // Remove duplicates by worker_id and sort by full_name
      const uniqueWorkers = (data || []).reduce((acc: any[], contract: any) => {
        if (!acc.find(w => w.id === contract.worker_id)) {
          acc.push({
            id: contract.worker_id,
            full_name: contract.workers?.full_name,
            rut: contract.workers?.rut,
            cargo: contract.workers?.cargo,
            contract_type: contract.contract_type,
            contract_id: contract.id
          })
        }
        return acc
      }, [])

      // Sort by full_name in the frontend
      return uniqueWorkers.sort((a, b) =>
        (a.full_name || '').localeCompare(b.full_name || '')
      )
    } catch (err: any) {
      console.error('Error fetching workers for project:', err)
      return []
    }
  }

  // Update assignment status
  const updateAssignmentStatus = async (assignmentId: number, status: string) => {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({
          assignment_status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', assignmentId)

      if (error) throw error

      toast.success('Estado de asignación actualizado')
      await fetchTasks()
    } catch (err: any) {
      console.error('Error updating assignment status:', err)
      toast.error(`Error al actualizar estado: ${err.message}`)
      throw err
    }
  }

  // Update all active assignments for a task
  const updateAllAssignmentsStatus = async (taskId: number, status: string) => {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({
          assignment_status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('task_id', taskId)
        .eq('is_deleted', false)
        .neq('assignment_status', 'removed')

      if (error) throw error

      toast.success(`Estados de asignaciones actualizados a ${status}`)
      await fetchTasks()
    } catch (err: any) {
      console.error('Error updating all assignments status:', err)
      toast.error(`Error al actualizar estados: ${err.message}`)
      throw err
    }
  }

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchTasks(),
          fetchApartments(),
          fetchWorkers(),
          fetchProjects(),
          fetchFloors(),
          fetchTaskStats()
        ])
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [fetchTasks, fetchApartments, fetchWorkers, fetchProjects, fetchFloors, fetchTaskStats])

  return {
    tasks,
    apartments,
    users,
    projects,
    floors,
    loading,
    error,
    taskStats,
    createTask,
    updateTask,
    deleteTask,
    hardDeleteTask,
    assignWorkerToTask,
    adjustPaymentDistribution,
    removeWorkerFromTask,
    getWorkersForProject,
    updateAssignmentStatus,
    updateAllAssignmentsStatus,
    fetchDeletedTasks,
    getDeletedTasksCount,
    restoreTask,
    refreshTasks: fetchTasks,
    refreshStats: fetchTaskStats
  }
}

