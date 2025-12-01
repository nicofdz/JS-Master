'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Circle, Clock, AlertCircle, User, Plus, Search, Filter, Home } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { TaskFormModalV2 } from '@/components/tasks-v2/TaskFormModalV2'
import toast from 'react-hot-toast'

interface Task {
  id: number
  task_name: string
  task_description: string | null
  task_category: string | null
  status: string
  priority: string
  is_delayed?: boolean
  delay_reason?: string | null
  days_delayed?: number
  apartment_id: number
  apartment_number: string
  workers?: Array<{
    full_name: string
    rut?: string
  }>
}

interface FloorTasksModalProps {
  isOpen: boolean
  onClose: () => void
  floorId: number
  floorNumber: number
  projectId: number
  towerId: number
}

export function FloorTasksModal({ isOpen, onClose, floorId, floorNumber, projectId, towerId }: FloorTasksModalProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled' | 'delayed'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    if (isOpen && floorId) {
      fetchTasks()
      fetchCategories()
    }
  }, [isOpen, floorId])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .select('name')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching categories:', error)
        return
      }

      const uniqueCategories = Array.from(new Set((data || []).map(c => c.name)))
      setCategories(uniqueCategories)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchTasks = async () => {
    try {
      setLoading(true)
      // Obtener todos los departamentos del piso
      const { data: apartmentsData, error: apartmentsError } = await supabase
        .from('apartments')
        .select('id, apartment_number')
        .eq('floor_id', floorId)
        .eq('is_active', true)

      if (apartmentsError) {
        console.error('Error fetching apartments:', apartmentsError)
        setTasks([])
        return
      }

      if (!apartmentsData || apartmentsData.length === 0) {
        setTasks([])
        return
      }

      const apartmentIds = apartmentsData.map(apt => apt.id)

      // Consultar todas las tareas de los departamentos del piso
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          task_name,
          task_description,
          task_category,
          status,
          priority,
          is_delayed,
          delay_reason,
          apartment_id,
          start_date,
          end_date,
          completed_at
        `)
        .in('apartment_id', apartmentIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError)
        setTasks([])
        return
      }

      // Obtener trabajadores asignados para cada tarea
      const taskIds = (tasksData || []).map(t => t.id)
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
        .eq('is_deleted', false)
        .neq('assignment_status', 'removed')

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError)
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

      // Crear mapa de apartment_id a apartment_number
      const apartmentMap: Record<number, string> = {}
      apartmentsData.forEach(apt => {
        apartmentMap[apt.id] = apt.apartment_number
      })

      // Calcular días de retraso para cada tarea
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Combinar tareas con sus trabajadores y números de departamento
      const tasksWithDetails = (tasksData || []).map(task => {
        let daysDelayed = 0
        
        if (task.is_delayed) {
          // Si la tarea está completada, calcular desde end_date usando completed_at
          if (task.status === 'completed' && task.end_date) {
            const endDate = new Date(task.end_date)
            endDate.setHours(0, 0, 0, 0)
            const completedDate = task.completed_at ? new Date(task.completed_at) : today
            completedDate.setHours(0, 0, 0, 0)
            daysDelayed = Math.max(0, Math.floor((completedDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)))
          } else if (task.status !== 'completed' && task.end_date) {
            // Si no está completada, calcular desde end_date hasta hoy
            const endDate = new Date(task.end_date)
            endDate.setHours(0, 0, 0, 0)
            daysDelayed = Math.max(0, Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)))
          } else if (task.start_date) {
            // Si no tiene end_date pero tiene start_date, calcular desde start_date
            const startDate = new Date(task.start_date)
            startDate.setHours(0, 0, 0, 0)
            daysDelayed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
          }
        }

        return {
          ...task,
          apartment_number: apartmentMap[task.apartment_id] || 'N/A',
          workers: workersByTask[task.id] || [],
          days_delayed: daysDelayed
        }
      })

      setTasks(tasksWithDetails)
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setTasks([])
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
      case 'cancelled':
        return 'Cancelada'
      default:
        return 'Pendiente'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'low':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgente'
      case 'high':
        return 'Alta'
      case 'medium':
        return 'Media'
      case 'low':
        return 'Baja'
      default:
        return 'Sin prioridad'
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

  // Filtrar tareas
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchTerm === '' || 
      task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.apartment_number.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'delayed' ? task.is_delayed === true : task.status === statusFilter)
    
    const matchesCategory = categoryFilter === 'all' || task.task_category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  // Agrupar tareas por departamento
  const tasksByApartment = filteredTasks.reduce((acc, task) => {
    if (!acc[task.apartment_id]) {
      acc[task.apartment_id] = {
        apartment_number: task.apartment_number,
        tasks: []
      }
    }
    acc[task.apartment_id].tasks.push(task)
    return acc
  }, {} as Record<number, { apartment_number: string; tasks: Task[] }>)

  const completedCount = filteredTasks.filter(t => t.status === 'completed').length
  const totalCount = filteredTasks.length
  const delayedCount = filteredTasks.filter(t => t.is_delayed === true).length

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tareas - Piso ${floorNumber}`}
      size="xl"
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
          {delayedCount > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-red-400">
                {delayedCount}
              </div>
              <div className="text-xs text-gray-400">
                Tareas retrasadas
              </div>
            </div>
          )}
        </div>

        {/* Filtros y Búsqueda */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, descripción o departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Progreso</option>
              <option value="completed">Completada</option>
              <option value="blocked">Bloqueada</option>
              <option value="cancelled">Cancelada</option>
              <option value="delayed">Retrasadas</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de tareas agrupadas por departamento */}
        <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : Object.keys(tasksByApartment).length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No hay tareas para este piso</p>
            </div>
          ) : (
            Object.entries(tasksByApartment).map(([apartmentId, { apartment_number, tasks: apartmentTasks }]) => (
              <div key={apartmentId} className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h5 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Departamento {apartment_number}
                  <span className="text-xs text-slate-400 font-normal">
                    ({apartmentTasks.length} {apartmentTasks.length === 1 ? 'tarea' : 'tareas'})
                  </span>
                </h5>
                <div className="space-y-2">
                  {apartmentTasks.map(task => (
                    <div
                      key={task.id}
                      className={`${getStatusColor(task.status)} rounded-lg border p-3 transition-all duration-200 hover:shadow-md ${
                        task.is_delayed ? 'border-l-4 border-l-red-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getStatusIcon(task.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white mb-1 flex items-center gap-2">
                            {task.task_name || 'Tarea sin nombre'}
                            {task.is_delayed && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/40">
                                <AlertCircle className="w-3 h-3" />
                                Retrasada
                                {task.days_delayed !== undefined && task.days_delayed > 0 && (
                                  <span>({task.days_delayed} día{task.days_delayed > 1 ? 's' : ''})</span>
                                )}
                              </span>
                            )}
                          </div>
                          {task.task_description && (
                            <div className="text-sm text-gray-400 mb-2">
                              {task.task_description}
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
                            <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                            {task.task_category && (
                              <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {task.task_category}
                              </span>
                            )}
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
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-600">
          <Button
            onClick={() => {
              setSelectedApartmentId(null)
              setShowAddTaskModal(true)
            }}
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
    {showAddTaskModal && (
      <TaskFormModalV2
        isOpen={showAddTaskModal}
        onClose={() => {
          setShowAddTaskModal(false)
          setSelectedApartmentId(null)
        }}
        mode="create"
        initialProjectId={projectId}
        initialTowerId={towerId}
        initialFloorId={floorId}
        initialApartmentId={selectedApartmentId || undefined}
        onSuccess={() => {
          toast.success('Tarea creada exitosamente')
          setShowAddTaskModal(false)
          setSelectedApartmentId(null)
          fetchTasks() // Refrescar la lista de tareas
        }}
      />
    )}
    </>
  )
}

