'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Circle, Clock, AlertCircle, User, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { TaskFormModalV2 } from '@/components/tasks-v2/TaskFormModalV2'
import toast from 'react-hot-toast'

interface Task {
  id: number
  task_name: string
  task_description: string | null
  task_category: string | null
  status: string
  workers?: Array<{
    full_name: string
    rut?: string
  }>
}

interface ApartmentTasksModalProps {
  isOpen: boolean
  onClose: () => void
  apartmentId: number
  apartmentNumber: string
}

export function ApartmentTasksModal({ isOpen, onClose, apartmentId, apartmentNumber }: ApartmentTasksModalProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [apartmentContext, setApartmentContext] = useState<{
    projectId: number | null
    towerId: number | null
    floorId: number | null
  }>({
    projectId: null,
    towerId: null,
    floorId: null
  })
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)

  useEffect(() => {
    if (isOpen && apartmentId) {
      fetchTasks()
      loadApartmentContext()
    }
  }, [isOpen, apartmentId])

  const loadApartmentContext = async () => {
    try {
      // Cargar datos del departamento para obtener projectId, towerId, floorId
      const { data: apartmentData, error } = await supabase
        .from('apartments')
        .select(`
          id,
          floor_id,
          floors!inner(
            id,
            tower_id,
            towers!inner(
              id,
              project_id
            )
          )
        `)
        .eq('id', apartmentId)
        .single()

      if (error) {
        console.error('Error loading apartment context:', error)
        return
      }

      if (apartmentData) {
        const floor = (apartmentData as any).floors
        const tower = floor?.towers
        setApartmentContext({
          projectId: tower?.project_id || null,
          towerId: floor?.tower_id || null,
          floorId: floor?.id || null
        })
      }
    } catch (err) {
      console.error('Error loading apartment context:', err)
    }
  }

  const fetchTasks = async () => {
    try {
      setLoading(true)
      // Consultar tasks V2 con trabajadores desde task_assignments
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          task_name,
          task_description,
          task_category,
          status
        `)
        .eq('apartment_id', apartmentId)
        .eq('is_deleted', false) // Excluir tareas eliminadas
        .order('created_at', { ascending: true })

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError)
        setTasks([])
        return
      }

      if (!tasksData || tasksData.length === 0) {
        setTasks([])
        return
      }

      // Obtener trabajadores asignados para cada tarea
      const taskIds = tasksData.map(t => t.id)
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select(`
          task_id,
          worker_id,
          workers!task_assignments_worker_id_fkey (
            full_name,
            rut
          )
        `)
        .in('task_id', taskIds)
        .eq('is_deleted', false) // Solo asignaciones no eliminadas
        .neq('assignment_status', 'removed') // Excluir asignaciones removidas

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError)
        // Continuar sin trabajadores si hay error
      }

      // Agrupar trabajadores por tarea
      const workersByTask: Record<number, Array<{ full_name: string; rut?: string }>> = {}
      if (assignmentsData) {
        assignmentsData.forEach((assignment: any) => {
          if (assignment.workers) {
            if (!workersByTask[assignment.task_id]) {
              workersByTask[assignment.task_id] = []
            }
            workersByTask[assignment.task_id].push({
              full_name: assignment.workers.full_name,
              rut: assignment.workers.rut
            })
          }
        })
      }

      // Combinar tareas con sus trabajadores
      const tasksWithWorkers = tasksData.map(task => ({
        ...task,
        workers: workersByTask[task.id] || []
      }))
      
      setTasks(tasksWithWorkers)
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'in_progress':
      case 'in-progress':
        return <Clock className="w-5 h-5 text-yellow-400" />
      case 'blocked':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      default:
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 border-green-500/30 text-green-300'
      case 'in_progress':
      case 'in-progress':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
      case 'blocked':
        return 'bg-red-500/20 border-red-500/30 text-red-300'
      default:
        return 'bg-slate-500/20 border-slate-500/30 text-slate-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada'
      case 'in_progress':
      case 'in-progress':
        return 'En Progreso'
      case 'blocked':
        return 'Bloqueada'
      default:
        return 'Pendiente'
    }
  }

  // Función para abreviar nombres: "Juan Pérez" -> "Juan P"
  const abbreviateName = (fullName: string): string => {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length === 0) return fullName
    if (parts.length === 1) return parts[0]
    
    const firstName = parts[0]
    const lastName = parts[parts.length - 1]
    const lastInitial = lastName.charAt(0).toUpperCase()
    
    return `${firstName} ${lastInitial}`
  }

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalCount = tasks.length

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tareas - Departamento ${apartmentNumber}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Resumen */}
        <div className="bg-slate-700 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-white">
              {completedCount} / {totalCount}
            </div>
            <div className="text-sm text-gray-400">
              Tareas completadas
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-400">
              {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-400">
              Progreso
            </div>
          </div>
        </div>

        {/* Lista de tareas */}
        <div className="max-h-[500px] overflow-y-auto pr-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No hay tareas para este departamento</p>
            </div>
          ) : (
            tasks.map(task => (
              <div
                key={task.id}
                className={`${getStatusColor(task.status)} rounded-lg border p-4 transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(task.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white mb-1">
                      {task.task_name || 'Tarea sin nombre'}
                    </div>
                    {task.task_description && (
                      <div className="text-sm text-gray-400 mb-2">
                        {task.task_description}
                      </div>
                    )}
                    {task.task_category && (
                      <div className="text-xs text-gray-500 mb-2">
                        Categoría: {task.task_category}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded ${
                        task.status === 'completed' ? 'bg-green-500/30 text-green-300' :
                        (task.status === 'in_progress' || task.status === 'in-progress') ? 'bg-yellow-500/30 text-yellow-300' :
                        task.status === 'blocked' ? 'bg-red-500/30 text-red-300' :
                        'bg-slate-500/30 text-slate-300'
                      }`}>
                        {getStatusLabel(task.status)}
                      </span>
                      {task.workers && task.workers.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.workers.map((worker, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              title={worker.full_name}
                            >
                              <User className="w-2.5 h-2.5" />
                              {abbreviateName(worker.full_name)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-600">
          <Button
            onClick={() => setShowAddTaskModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
            Agregar Tarea
          </Button>
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>

    {/* Modal de Agregar Tarea - Fuera del Modal principal */}
    {apartmentContext.projectId && apartmentContext.towerId && apartmentContext.floorId && (
      <TaskFormModalV2
        isOpen={showAddTaskModal}
        onClose={() => {
          setShowAddTaskModal(false)
        }}
        mode="create"
        initialProjectId={apartmentContext.projectId}
        initialTowerId={apartmentContext.towerId}
        initialFloorId={apartmentContext.floorId}
        initialApartmentId={apartmentId}
        onSuccess={() => {
          toast.success('Tarea creada exitosamente')
          setShowAddTaskModal(false)
          fetchTasks() // Refrescar la lista de tareas
        }}
      />
    )}
    </>
  )
}

