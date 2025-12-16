'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, MoreVertical, Edit, Trash2, Users, Calendar, DollarSign, Eye, AlertCircle, Clock, CheckCircle, UserPlus, UserMinus, Image, Package, History } from 'lucide-react'
import { getStatusColor, getStatusText, formatCurrency, formatDate, calculateBusinessDuration } from '@/lib/utils'
import { TaskDetailModalV2 } from './TaskDetailModalV2'
import { TaskFormModalV2 } from './TaskFormModalV2'
import { AdjustDistributionModalV2 } from './AdjustDistributionModalV2'
import { WorkerDetailModalV2 } from './WorkerDetailModalV2'
import { ModalV2 } from './ModalV2'
import { useTasksV2, type TaskV2 } from '@/hooks/useTasks_v2'
import toast from 'react-hot-toast'

// Componente para tooltip de retraso que se posiciona correctamente
function DelayTooltip({ children, delayReason }: { children: React.ReactNode, delayReason?: string | null }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)

  const handleMouseEnter = () => {
    if (delayReason && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      // Usar getBoundingClientRect que ya está relativo al viewport para fixed positioning
      setTooltipPosition({
        top: rect.bottom + 8, // 8px debajo del badge
        left: rect.left + (rect.width / 2) // Centro del badge
      })
      setShowTooltip(true)
    }
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </span>
      {showTooltip && delayReason && (
        <div
          className="fixed z-[9999] w-64 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg border border-slate-700 pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translateX(-50%)' // Centrar el tooltip respecto al punto calculado
          }}
        >
          {delayReason}
        </div>
      )}
    </>
  )
}

type Task = TaskV2

interface TaskRowV2Props {
  task: Task
  isExpanded: boolean
  onToggleExpand: () => void
  onTaskUpdate?: () => void
}

export function TaskRowV2({ task, isExpanded, onToggleExpand, onTaskUpdate }: TaskRowV2Props) {
  const { deleteTask, updateTask, updateAssignmentStatus, updateAllAssignmentsStatus } = useTasksV2()
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailModalTab, setDetailModalTab] = useState<'details' | 'photos' | 'materials' | 'history'>('details')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDistributionModal, setShowDistributionModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Calcular tiempo transcurrido de la tarea (solo si está completada)
  const calculateTaskDuration = () => {
    if (task.status !== 'completed') return null

    const completedAssignments = task.workers.filter(
      (w: any) => w.assignment_status === 'completed' && (w as any).started_at && (w as any).completed_at
    )

    if (completedAssignments.length === 0) return null

    // Calcular el tiempo total sumando todas las asignaciones completadas
    let totalMs = 0
    completedAssignments.forEach((worker: any) => {
      totalMs += calculateBusinessDuration(worker.started_at, worker.completed_at)
    })

    // Calcular promedio si hay múltiples trabajadores
    const avgMs = totalMs / completedAssignments.length

    // Convertir a horas y minutos
    const hours = Math.floor(avgMs / (1000 * 60 * 60))
    const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim()
    } else if (minutes > 0) {
      return `${minutes}m`
    } else {
      return '<1m'
    }
  }

  const taskDuration = calculateTaskDuration()
  const [deleteReason, setDeleteReason] = useState('')
  const [showReasonInput, setShowReasonInput] = useState(false)
  const [showWorkerDetailModal, setShowWorkerDetailModal] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null)
  const [selectedWorkerName, setSelectedWorkerName] = useState<string>('')
  const [taskStatusOpen, setTaskStatusOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [assignmentStatusOpen, setAssignmentStatusOpen] = useState<number | null>(null)
  const [allAssignmentsStatusOpen, setAllAssignmentsStatusOpen] = useState(false)
  const taskStatusRef = useRef<HTMLDivElement>(null)
  const priorityRef = useRef<HTMLDivElement>(null)
  const assignmentStatusRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const allAssignmentsStatusRef = useRef<HTMLDivElement>(null)

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
    setDeleteReason('')
    setShowReasonInput(false)
  }

  const handleDelete = async () => {
    try {
      await deleteTask(task.id, deleteReason.trim() || 'Eliminada por usuario')
      toast.success('Tarea eliminada exitosamente')
      setShowDeleteConfirm(false)
      setDeleteReason('')
      setShowReasonInput(false)
      // Refrescar la lista de tareas inmediatamente
      if (onTaskUpdate) {
        onTaskUpdate()
      }
    } catch (err: any) {
      toast.error(`Error al eliminar tarea: ${err.message || 'Error desconocido'}`)
    }
  }

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (taskStatusRef.current && !taskStatusRef.current.contains(event.target as Node)) {
        setTaskStatusOpen(false)
      }
      if (priorityRef.current && !priorityRef.current.contains(event.target as Node)) {
        setPriorityOpen(false)
      }
      if (assignmentStatusOpen !== null) {
        const ref = assignmentStatusRefs.current[assignmentStatusOpen]
        if (ref && !ref.contains(event.target as Node)) {
          setAssignmentStatusOpen(null)
        }
      }
      if (allAssignmentsStatusRef.current && !allAssignmentsStatusRef.current.contains(event.target as Node)) {
        setAllAssignmentsStatusOpen(false)
      }
    }

    if (taskStatusOpen || priorityOpen || assignmentStatusOpen !== null || allAssignmentsStatusOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [taskStatusOpen, priorityOpen, assignmentStatusOpen, allAssignmentsStatusOpen])

  const handleTaskStatusChange = async (newStatus: string) => {
    try {
      await updateTask(task.id, { status: newStatus })
      setTaskStatusOpen(false)

      // Actualizar estados de asignaciones según el nuevo estado de la tarea
      if (newStatus === 'pending') {
        // Si la tarea vuelve a pendiente, todas las asignaciones activas vuelven a 'assigned'
        await updateAllAssignmentsStatus(task.id, 'assigned')
      } else if (newStatus === 'in_progress') {
        // Si la tarea vuelve a en progreso, todas las asignaciones activas vuelven a 'working'
        await updateAllAssignmentsStatus(task.id, 'working')
      } else if (newStatus === 'blocked' || newStatus === 'cancelled' || newStatus === 'on_hold') {
        // Si la tarea se bloquea, cancela o pausa, todas las asignaciones activas vuelven a 'assigned'
        await updateAllAssignmentsStatus(task.id, 'assigned')
      }
      // Si es 'completed', complete_task_manually ya actualiza todas las asignaciones

      if (onTaskUpdate) onTaskUpdate()

      const statusMessages: Record<string, string> = {
        'completed': 'completada',
        'in_progress': 'iniciada',
        'blocked': 'bloqueada',
        'pending': 'marcada como pendiente',
        'cancelled': 'cancelada',
        'on_hold': 'pausada'
      }

      toast.success(`Tarea ${statusMessages[newStatus] || 'actualizada'}`)
    } catch (err: any) {
      toast.error(`Error al actualizar estado: ${err.message}`)
    }
  }

  const handleAllAssignmentsStatusChange = async (newStatus: string) => {
    try {
      await updateAllAssignmentsStatus(task.id, newStatus)
      setAllAssignmentsStatusOpen(false)
      if (onTaskUpdate) onTaskUpdate()

      const statusMessages: Record<string, string> = {
        'assigned': 'asignadas',
        'working': 'en trabajo',
        'completed': 'completadas'
      }

      toast.success(`Todas las asignaciones ${statusMessages[newStatus] || 'actualizadas'}`)
    } catch (err: any) {
      toast.error(`Error al actualizar estados: ${err.message}`)
    }
  }

  const handleAssignmentStatusChange = async (assignmentId: number, newStatus: string) => {
    try {
      await updateAssignmentStatus(assignmentId, newStatus)
      setAssignmentStatusOpen(null)
      if (onTaskUpdate) onTaskUpdate()

      const statusMessages: Record<string, string> = {
        'assigned': 'asignada',
        'working': 'en trabajo',
        'completed': 'completada'
      }

      toast.success(`Asignación ${statusMessages[newStatus] || 'actualizada'}`)
    } catch (err: any) {
      toast.error(`Error al actualizar estado: ${err.message}`)
    }
  }

  const getAssignmentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Completado
          </span>
        )
      case 'working':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3" />
            Trabajando
          </span>
        )
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Users className="w-3 h-3" />
            Asignado
          </span>
        )
      case 'removed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <UserMinus className="w-3 h-3" />
            Removido
          </span>
        )
      default:
        return null
    }
  }

  const getAssignmentStatusOptions = (currentStatus: string) => {
    const allOptions = [
      { value: 'assigned', label: 'Asignado', icon: Users, color: 'bg-gray-100 text-gray-800' },
      { value: 'working', label: 'Trabajando', icon: Clock, color: 'bg-blue-100 text-blue-800' },
      { value: 'completed', label: 'Completado', icon: CheckCircle, color: 'bg-green-100 text-green-800' }
    ]
    // Si currentStatus está vacío, devolver todas las opciones
    if (!currentStatus) return allOptions
    return allOptions.filter(opt => opt.value !== currentStatus)
  }

  const getTaskStatusOptions = (currentStatus: string) => {
    const allOptions = [
      { value: 'pending', label: 'Pendiente', color: 'bg-slate-600 text-white' },
      { value: 'in_progress', label: 'En Progreso', color: 'bg-blue-600 text-white' },
      { value: 'completed', label: 'Completado', color: 'bg-emerald-600 text-white' },
      { value: 'blocked', label: 'Bloqueado', color: 'bg-red-600 text-white' },
      { value: 'cancelled', label: 'Cancelado', color: 'bg-gray-500 text-white' },
      { value: 'on_hold', label: 'En Pausa', color: 'bg-yellow-600 text-white' }
    ]
    return allOptions.filter(opt => opt.value !== currentStatus)
  }

  const getPriorityOptions = (currentPriority?: string) => {
    const allOptions = [
      { value: 'urgent', label: 'Urgente', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: AlertCircle },
      { value: 'high', label: 'Alta', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: AlertCircle },
      { value: 'medium', label: 'Media', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: Clock },
      { value: 'low', label: 'Baja', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: CheckCircle }
    ]
    if (!currentPriority) return allOptions
    return allOptions.filter(opt => opt.value !== currentPriority)
  }

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await updateTask(task.id, { priority: newPriority || null })
      setPriorityOpen(false)
      toast.success('Prioridad actualizada exitosamente')
      if (onTaskUpdate) {
        onTaskUpdate()
      }
    } catch (err: any) {
      toast.error(`Error al cambiar prioridad: ${err.message || 'Error desconocido'}`)
    }
  }

  const getProgressPercentage = () => {
    const completedWorkers = task.workers.filter(w => w.assignment_status === 'completed').length
    const totalWorkers = task.workers.length
    return totalWorkers > 0 ? Math.round((completedWorkers / totalWorkers) * 100) : 0
  }

  const getPriorityBadge = (priority?: string, showChevron: boolean = false) => {
    if (!priority) return null

    const priorityConfig = {
      urgent: { label: 'Urgente', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: AlertCircle },
      high: { label: 'Alta', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: AlertCircle },
      medium: { label: 'Media', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: Clock },
      low: { label: 'Baja', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: CheckCircle }
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border} ${showChevron ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}>
        <Icon className="w-3 h-3" />
        {config.label}
        {showChevron && (
          <ChevronDown className={`w-3 h-3 transition-transform ${priorityOpen ? 'rotate-180' : ''}`} />
        )}
      </span>
    )
  }

  const progress = getProgressPercentage()

  return (
    <div className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all overflow-hidden ${task.is_delayed ? 'border-red-300 border-l-4' : 'border-gray-200'
      }`}>
      {/* Fila principal (compacta) - Toda clickeable */}
      <div
        onClick={onToggleExpand}
        className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 px-4 py-4 items-start md:items-center text-sm cursor-pointer hover:bg-gray-50 transition-colors"
      >
        {/* Tarea (nombre + categoría) */}
        <div className="w-full md:col-span-3 mb-2 md:mb-0">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex-shrink-0 text-gray-400">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 truncate md:whitespace-normal">{task.task_name}</div>
              <div className="text-xs text-gray-500 truncate">{task.task_category}</div>
            </div>
          </div>
        </div>

        {/* Prioridad - Badge seleccionable */}
        <div className="w-full md:col-span-1 mb-2 md:mb-0 flex items-center justify-between md:block" ref={priorityRef}>
          <span className="md:hidden text-xs text-gray-500 mr-2">Prioridad:</span>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setPriorityOpen(!priorityOpen)
                // Expandir la tarea cuando se hace click en el badge de prioridad
                if (!isExpanded) {
                  onToggleExpand()
                }
              }}
              className="inline-flex items-center"
            >
              {getPriorityBadge(task.priority, true) || (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors">
                  Sin prioridad
                  <ChevronDown className={`w-3 h-3 transition-transform ${priorityOpen ? 'rotate-180' : ''}`} />
                </span>
              )}
            </button>

            {priorityOpen && (
              <div className="absolute z-50 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 left-0 md:left-auto">
                {getPriorityOptions(task.priority).map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Expandir la tarea antes de cambiar la prioridad
                        if (!isExpanded) {
                          onToggleExpand()
                        }
                        handlePriorityChange(option.value)
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${option.bg} ${option.text} border ${option.border}`}>
                        <Icon className="w-3 h-3" />
                        {option.label}
                      </span>
                    </button>
                  )
                })}
                {/* Opción para quitar prioridad si tiene una */}
                {task.priority && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePriorityChange('')
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2 text-gray-500"
                  >
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                      Sin prioridad
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Badge de Retraso - Solo mostrar si está retrasada */}
        {task.is_delayed && (
          <div className="w-full md:col-span-1 mb-2 md:mb-0 flex justify-between md:block">
            <span className="md:hidden text-xs text-gray-500 mr-2">Estado:</span>
            <DelayTooltip delayReason={task.delay_reason}>
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-600 border border-red-500/40 cursor-help"
                title={task.delay_reason || 'Tarea atrasada'}
              >
                <AlertCircle className="w-3 h-3" />
                {task.days_delayed || 0} día{task.days_delayed !== 1 ? 's' : ''}
              </span>
            </DelayTooltip>
          </div>
        )}

        {/* Badge de Tiempo Transcurrido - Solo mostrar si está completada */}
        {task.status === 'completed' && taskDuration && (
          <div className="w-full md:col-span-1 mb-2 md:mb-0 flex justify-between md:block">
            <span className="md:hidden text-xs text-gray-500 mr-2">Duración:</span>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-600 border border-blue-500/40"
              title="Tiempo promedio que se demoró en completar la tarea"
            >
              <Clock className="w-3 h-3" />
              {taskDuration}
            </span>
          </div>
        )}

        {/* Trabajadores (nombre completo si es 1, avatares si son más) */}
        <div className={`w-full ${task.is_delayed || (task.status === 'completed' && taskDuration) ? 'md:col-span-2' : 'md:col-span-3'} mb-2 md:mb-0`}>
          {task.workers.length === 1 ? (
            // Si hay 1 trabajador: mostrar nombre completo
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm flex-shrink-0">
                {task.workers[0].full_name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 truncate">
                  {task.workers[0].full_name || 'Sin nombre'}
                </div>
                <div className="text-xs text-gray-500">1 trabajador</div>
              </div>
            </div>
          ) : (
            // Si hay más de 1: mostrar círculos con iniciales
            <>
              <div className="flex items-center gap-1">
                {task.workers.slice(0, 3).map((worker, index) => (
                  <div
                    key={`${task.id}-${worker.assignment_id || worker.id}-${index}`}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm"
                    title={worker.full_name || 'Sin nombre'}
                  >
                    {worker.full_name?.charAt(0) || '?'}
                  </div>
                ))}
                {task.workers.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold">
                    +{task.workers.length - 3}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {task.workers.length} trabajadores
              </div>
            </>
          )}
        </div>

        {/* Presupuesto y Estado de Pago */}
        <div className="w-full md:col-span-1 text-left md:text-right flex items-center justify-between md:flex-col md:items-end md:justify-center mb-2 md:mb-0">
          <span className="md:hidden text-xs text-gray-500">Presupuesto:</span>
          <div className="flex flex-col items-end">
            {task.workers.some(w => w.contract_type === 'a_trato' && w.assignment_status !== 'removed') ? (
              <>
                <div className="font-semibold text-gray-900">${(task.total_budget / 1000).toFixed(0)}K</div>
                {task.workers.length > 0 && task.workers.every(w => w.is_paid) && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 border border-green-200 mt-0.5">
                    <CheckCircle className="w-3 h-3" />
                    Pagada
                  </span>
                )}
                {!(task.workers.length > 0 && task.workers.every(w => w.is_paid)) && (
                  <div className="text-xs text-gray-500">Total</div>
                )}
              </>
            ) : (
              /* Si no es a trato, verificamos si igual está pagada (casos raros o por día) */
              task.workers.length > 0 && task.workers.every(w => w.is_paid) ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 border border-green-200">
                  <CheckCircle className="w-3 h-3" />
                  Pagada
                </span>
              ) : (
                <div className="text-xs text-gray-400">-</div>
              )
            )}
          </div>
        </div>

        {/* Estado */}
        <div className="w-full md:col-span-1 mb-2 md:mb-0 flex justify-between md:block" ref={taskStatusRef}>
          <span className="md:hidden text-xs text-gray-500 mr-2 flex items-center">Status:</span>
          <div className="relative flex-1 md:flex-none flex justify-end md:block">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setTaskStatusOpen(!taskStatusOpen)
                // Expandir la tarea cuando se hace click en el badge
                if (!isExpanded) {
                  onToggleExpand()
                }
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity ${getStatusColor(task.status)}`}
            >
              {getStatusText(task.status)}
              <ChevronDown className={`w-3 h-3 transition-transform ${taskStatusOpen ? 'rotate-180' : ''}`} />
            </button>

            {taskStatusOpen && (
              <div className="absolute z-50 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 right-0 md:left-0">
                {getTaskStatusOptions(task.status).map((option) => (
                  <button
                    key={option.value}
                    onClick={(e) => {
                      e.stopPropagation()
                      // Expandir la tarea antes de cambiar el estado
                      if (!isExpanded) {
                        onToggleExpand()
                      }
                      handleTaskStatusChange(option.value)
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${option.color}`}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Barra de progreso mini - Hidden on mobile or inline */}
          <div className="hidden md:block mt-1 w-full bg-gray-200 rounded-full h-1">
            <div
              className={`h-1 rounded-full ${task.status === 'completed' ? 'bg-green-500' :
                task.status === 'in_progress' ? 'bg-blue-500' :
                  task.status === 'blocked' ? 'bg-red-500' :
                    'bg-gray-400'
                }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Fechas */}
        <div className="w-full md:col-span-2 text-xs flex justify-between md:block mb-2 md:mb-0">
          <div className="text-gray-900 flex md:block gap-2">
            <span className="text-gray-500">Inicio:</span> {formatDate(task.start_date || '')}
          </div>
          <div className="text-gray-900 flex md:block gap-2">
            <span className="text-gray-500">Fin:</span> {formatDate(task.end_date || '')}
          </div>
        </div>

        {/* Acciones */}
        <div className="w-full md:col-span-1 flex items-center justify-end gap-1 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
          <button
            className="p-1.5 hover:bg-blue-50 rounded-md transition-colors text-blue-600 hover:text-blue-700"
            title="Ver detalles"
            onClick={(e) => {
              e.stopPropagation()
              setDetailModalTab('details')
              setShowDetailModal(true)
            }}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-600 hover:text-gray-700"
            title="Editar"
            onClick={(e) => {
              e.stopPropagation()
              setShowEditModal(true)
            }}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 hover:bg-red-50 rounded-md transition-colors text-red-600 hover:text-red-700"
            title="Eliminar"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteClick()
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fila expandida (detalles de trabajadores) */}
      {isExpanded && (
        <div className="bg-gray-50 border-t border-gray-200">
          <div className="px-4 pb-4 pt-4">
            {/* Encabezado de trabajadores */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Desglose de Trabajadores
              </h4>
              {task.workers.filter(w => w.assignment_status !== 'removed').length > 0 && (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Select para cambiar estado de todos los trabajadores */}
                  <div className="relative" ref={allAssignmentsStatusRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setAllAssignmentsStatusOpen(!allAssignmentsStatusOpen)
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors border border-gray-300 flex items-center gap-1"
                    >
                      Cambiar todos
                      <ChevronDown className={`w-3 h-3 transition-transform ${allAssignmentsStatusOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {allAssignmentsStatusOpen && (
                      <div className="absolute z-50 right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                        {getAssignmentStatusOptions('').map((option) => {
                          const Icon = option.icon
                          return (
                            <button
                              key={option.value}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAllAssignmentsStatusChange(option.value)
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                            >
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${option.color}`}>
                                <Icon className="w-3 h-3" />
                                {option.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  {/* Solo mostrar botón "Ajustar Distribución" si hay trabajadores "a_trato" */}
                  {task.workers.some(w => w.contract_type === 'a_trato' && w.assignment_status !== 'removed') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDistributionModal(true)
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
                    >
                      Ajustar Distribución
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Lista de trabajadores */}
            {task.workers.filter(w => w.assignment_status !== 'removed').length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No hay trabajadores asignados a esta tarea</p>
              </div>
            ) : (
              <div className="space-y-2">
                {task.workers.map((worker, index) => {
                  const isRemoved = worker.assignment_status === 'removed'
                  return (
                    <div
                      key={worker.assignment_id || `${task.id}-${worker.id}-${index}`}
                      className={`bg-gray-50 border rounded-lg p-3 transition-colors ${isRemoved
                        ? 'border-red-300 bg-red-50/50 opacity-75'
                        : 'border-gray-300 hover:bg-gray-100'
                        }`}
                    >
                      <div className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center">
                        {/* Avatar + Nombre + ID + Acciones (Móvil) */}
                        <div className="w-full md:col-span-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-sm flex-shrink-0 ${isRemoved
                              ? 'bg-gradient-to-br from-red-400 to-red-600'
                              : 'bg-gradient-to-br from-blue-500 to-purple-600'
                              }`}>
                              {worker.full_name?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0">
                              <div className={`font-medium truncate max-w-[150px] sm:max-w-none ${isRemoved ? 'text-red-700 line-through' : 'text-gray-900'}`}>
                                {worker.full_name || 'Sin nombre'}
                              </div>
                              <div className="text-xs text-gray-500">ID: {worker.id}</div>
                            </div>
                          </div>

                          {/* Botón de acciones visible en móvil */}
                          <div className="md:hidden">
                            {!isRemoved && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedWorkerId(worker.id)
                                  setSelectedWorkerName(worker.full_name || 'Sin nombre')
                                  setShowWorkerDetailModal(true)
                                }}
                                className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                                title="Ver detalles"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-500" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Porcentaje, Monto y Estado Group Wrapper */}
                        <div className="w-full md:col-span-7 grid grid-cols-2 md:grid-cols-7 gap-3 md:gap-4 items-center">
                          {/* Porcentaje - Solo mostrar si no es "por_dia" */}
                          {worker.contract_type === 'por_dia' ? (
                            <div className="col-span-2 md:col-span-4 text-left md:text-center pl-12 md:pl-0">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-600 border border-yellow-500/40 rounded-full">
                                <span className="text-sm font-semibold">Al Día</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Sin pago por tarea</div>
                            </div>
                          ) : (
                            <>
                              <div className="text-left md:text-center pl-12 md:pl-0 md:col-span-2">
                                <div className={`text-lg font-bold ${isRemoved ? 'text-red-500' : 'text-blue-600'}`}>
                                  {isRemoved ? '0%' : `${worker.payment_share_percentage}%`}
                                </div>
                                <div className="text-xs text-gray-500">Porcentaje</div>
                              </div>

                              {/* Monto */}
                              <div className="text-left md:text-center md:col-span-2">
                                <div className={`text-lg font-bold ${isRemoved ? 'text-red-500' : 'text-green-600'}`}>
                                  {isRemoved ? '$0K' : `$${(worker.worker_payment / 1000).toFixed(0)}K`}
                                </div>
                                <div className="text-xs text-gray-500">Monto</div>
                              </div>
                            </>
                          )}

                          {/* Estado */}
                          <div
                            className="col-span-2 md:col-span-3 flex justify-start md:justify-center pl-12 md:pl-0"
                            ref={(el) => {
                              if (worker.assignment_id) {
                                assignmentStatusRefs.current[worker.assignment_id] = el
                              }
                            }}
                          >
                            {worker.assignment_status === 'removed' ? (
                              getAssignmentStatusBadge(worker.assignment_status)
                            ) : (
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (worker.assignment_id) {
                                      setAssignmentStatusOpen(
                                        assignmentStatusOpen === worker.assignment_id ? null : worker.assignment_id
                                      )
                                    }
                                  }}
                                  className="inline-flex items-center gap-1"
                                >
                                  {getAssignmentStatusBadge(worker.assignment_status)}
                                  <ChevronDown
                                    className={`w-3 h-3 text-gray-500 transition-transform ${assignmentStatusOpen === worker.assignment_id ? 'rotate-180' : ''
                                      }`}
                                  />
                                </button>

                                {assignmentStatusOpen === worker.assignment_id && worker.assignment_id && (
                                  <div className="absolute z-50 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 left-0 md:left-auto">
                                    {getAssignmentStatusOptions(worker.assignment_status).map((option) => {
                                      const Icon = option.icon
                                      return (
                                        <button
                                          key={option.value}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleAssignmentStatusChange(worker.assignment_id!, option.value)
                                          }}
                                          className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2"
                                        >
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${option.color}`}>
                                            <Icon className="w-3 h-3" />
                                            {option.label}
                                          </span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Acciones (Desktop) */}
                        <div className="hidden md:block col-span-1 text-right">
                          {!isRemoved && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedWorkerId(worker.id)
                                setSelectedWorkerName(worker.full_name || 'Sin nombre')
                                setShowWorkerDetailModal(true)
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                              title="Ver detalles del trabajador"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tabs adicionales */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDetailModalTab('photos')
                  setShowDetailModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-300 transition-colors whitespace-nowrap snap-start flex-shrink-0"
              >
                <Image className="w-4 h-4" />
                Fotos de Progreso
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDetailModalTab('materials')
                  setShowDetailModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-300 transition-colors whitespace-nowrap snap-start flex-shrink-0"
              >
                <Package className="w-4 h-4" />
                Materiales
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDetailModalTab('history')
                  setShowDetailModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-300 transition-colors whitespace-nowrap snap-start flex-shrink-0"
              >
                <History className="w-4 h-4" />
                Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales */}
      <TaskDetailModalV2
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        task={task}
        initialTab={detailModalTab}
        onEdit={() => {
          setShowDetailModal(false)
          setShowEditModal(true)
        }}
        onAdjustDistribution={() => {
          setShowDetailModal(false)
          setShowDistributionModal(true)
        }}
        onViewPhotos={() => setDetailModalTab('photos')}
        onViewMaterials={() => setDetailModalTab('materials')}
        onViewHistory={() => setDetailModalTab('history')}
        onTaskUpdate={onTaskUpdate}
      />

      <TaskFormModalV2
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        task={task}
        mode="edit"
        onSuccess={onTaskUpdate}
      />

      <AdjustDistributionModalV2
        isOpen={showDistributionModal}
        onClose={() => setShowDistributionModal(false)}
        task={task}
        onSuccess={onTaskUpdate}
      />

      <WorkerDetailModalV2
        isOpen={showWorkerDetailModal}
        onClose={() => {
          setShowWorkerDetailModal(false)
          setSelectedWorkerId(null)
          setSelectedWorkerName('')
        }}
        workerId={selectedWorkerId || 0}
        workerName={selectedWorkerName}
      />

      {/* Modal de Confirmación de Eliminación */}
      <ModalV2
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setDeleteReason('')
          setShowReasonInput(false)
        }}
        title="Eliminar Tarea"
        size="md"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-red-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <p className="text-slate-200">
                ¿Estás seguro de que quieres eliminar esta tarea? Esta acción marcará la tarea como eliminada.
              </p>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowReasonInput(!showReasonInput)}
                  className="text-sm text-slate-400 hover:text-slate-200 underline"
                >
                  {showReasonInput ? 'Ocultar' : 'Agregar'} razón de eliminación (opcional)
                </button>
                {showReasonInput && (
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Ingresa una razón para la eliminación..."
                    className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              onClick={() => {
                setShowDeleteConfirm(false)
                setDeleteReason('')
                setShowReasonInput(false)
              }}
              className="px-6 py-2 text-sm font-medium text-slate-100 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      </ModalV2>
    </div>
  )
}

