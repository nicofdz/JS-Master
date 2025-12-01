'use client'

import { useState } from 'react'
import { Trash2, RotateCcw, Eye, Calendar, User, AlertCircle, Building2, Search, Users } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ModalV2 } from './ModalV2'
import { TaskDetailModalV2 } from './TaskDetailModalV2'
import { ConfirmModalV2 } from './ConfirmModalV2'
import toast from 'react-hot-toast'

interface DeletedTask {
  task_id: number
  task_name: string
  task_category: string
  apartment_number?: string
  floor_number?: number
  project_name?: string
  total_budget?: number
  status?: string
  deleted_at?: string
  deletion_reason?: string
  deleted_by_email?: string
  deleted_assignments_count?: number
  assigned_workers?: Array<{
    worker_name: string
    amount: number
    was_paid: boolean
  }>
}

interface DeletedTasksListProps {
  deletedTasks: DeletedTask[]
  loading: boolean
  onRestore: (taskId: number) => Promise<void>
  onRefresh: () => void
}

export function DeletedTasksList({ deletedTasks, loading, onRestore, onRefresh }: DeletedTasksListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<DeletedTask | null>(null)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [taskToRestore, setTaskToRestore] = useState<number | null>(null)
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false)
  const [selectedTaskAssignments, setSelectedTaskAssignments] = useState<DeletedTask | null>(null)

  const filteredTasks = deletedTasks.filter(task => {
    const searchLower = searchTerm.toLowerCase()
    return (
      task.task_name.toLowerCase().includes(searchLower) ||
      (task.apartment_number?.toLowerCase() || '').includes(searchLower) ||
      (task.project_name?.toLowerCase() || '').includes(searchLower) ||
      (task.task_category?.toLowerCase() || '').includes(searchLower)
    )
  })

  const handleRestoreClick = (taskId: number) => {
    setTaskToRestore(taskId)
    setShowRestoreConfirm(true)
  }

  const handleConfirmRestore = async () => {
    if (taskToRestore) {
      try {
        await onRestore(taskToRestore)
        setShowRestoreConfirm(false)
        setTaskToRestore(null)
        onRefresh()
      } catch (error) {
        // Error ya manejado en onRestore
      }
    }
  }

  const handleViewDetails = (task: DeletedTask) => {
    setSelectedTask(task)
    setShowDetailModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tareas eliminadas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar en papelera..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Lista de tareas eliminadas */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Trash2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">
            {searchTerm ? 'No se encontraron tareas eliminadas' : 'La papelera está vacía'}
          </p>
          {searchTerm && (
            <p className="text-gray-500 text-sm mt-2">
              Intenta con otros términos de búsqueda
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.task_id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{task.task_name}</h3>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      {task.task_category}
                    </span>
                  </div>

                  {/* Información de ubicación */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    {task.project_name && (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        <span>{task.project_name}</span>
                      </div>
                    )}
                    {task.floor_number && (
                      <span>Piso {task.floor_number}</span>
                    )}
                    {task.apartment_number && (
                      <span>Depto {task.apartment_number}</span>
                    )}
                  </div>

                  {/* Información de eliminación */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Eliminada: {formatDate(task.deleted_at || '')}</span>
                    </div>
                    {task.deleted_by_email && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Por: {task.deleted_by_email}</span>
                      </div>
                    )}
                    {task.deleted_assignments_count !== undefined && task.deleted_assignments_count > 0 && (
                      <button
                        onClick={() => {
                          setSelectedTaskAssignments(task)
                          setShowAssignmentsModal(true)
                        }}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        <Users className="w-3 h-3" />
                        <span>{task.deleted_assignments_count} asignación(es)</span>
                      </button>
                    )}
                  </div>

                  {/* Razón de eliminación */}
                  {task.deletion_reason && (
                    <div className="mt-2 p-2 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-400" />
                        <span><strong className="text-slate-100">Razón:</strong> {task.deletion_reason}</span>
                      </div>
                    </div>
                  )}

                  {/* Presupuesto */}
                  {task.total_budget && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">Presupuesto: </span>
                      <span className="font-semibold text-gray-900">{formatCurrency(task.total_budget)}</span>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleViewDetails(task)}
                    className="p-2 hover:bg-blue-50 rounded-md transition-colors text-blue-600 hover:text-blue-700"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRestoreClick(task.task_id)}
                    className="p-2 hover:bg-green-50 rounded-md transition-colors text-green-600 hover:text-green-700"
                    title="Restaurar tarea"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalles (simplificado para tareas eliminadas) */}
      {selectedTask && (
        <ModalV2
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedTask(null)
          }}
          title={`Detalles: ${selectedTask.task_name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Categoría</label>
                <p className="text-slate-100">{selectedTask.task_category}</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Ubicación</label>
                <p className="text-slate-100">
                  {selectedTask.project_name} - Piso {selectedTask.floor_number} - Depto {selectedTask.apartment_number}
                </p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Presupuesto</label>
                <p className="text-slate-100">{formatCurrency(selectedTask.total_budget || 0)}</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Estado al eliminar</label>
                <p className="text-slate-100">{selectedTask.status || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Eliminada el</label>
                <p className="text-slate-100">{formatDate(selectedTask.deleted_at || '')}</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Eliminada por</label>
                <p className="text-slate-100">{selectedTask.deleted_by_email || 'N/A'}</p>
              </div>
            </div>
            {selectedTask.deletion_reason && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Razón de eliminación</label>
                <p className="text-slate-100 bg-slate-700/50 p-3 rounded">{selectedTask.deletion_reason}</p>
              </div>
            )}
            {selectedTask.assigned_workers && selectedTask.assigned_workers.length > 0 && (
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Trabajadores asignados</label>
                <div className="space-y-2">
                  {selectedTask.assigned_workers.map((worker, index) => (
                    <div key={index} className="bg-slate-700/50 p-2 rounded flex justify-between items-center">
                      <span className="text-slate-100">{worker.worker_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 text-sm">{formatCurrency(worker.amount)}</span>
                        {worker.was_paid && (
                          <span className="px-2 py-0.5 text-xs bg-green-900/50 text-green-300 rounded">Pagado</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ModalV2>
      )}

      {/* Modal de confirmación de restauración */}
      <ConfirmModalV2
        isOpen={showRestoreConfirm}
        onClose={() => {
          setShowRestoreConfirm(false)
          setTaskToRestore(null)
        }}
        onConfirm={handleConfirmRestore}
        title="Restaurar Tarea"
        message="¿Estás seguro de que quieres restaurar esta tarea? Se restaurarán también todas las asignaciones asociadas."
        confirmText="Restaurar"
        cancelText="Cancelar"
        variant="info"
      />

      {/* Modal de asignaciones */}
      {selectedTaskAssignments && (
        <ModalV2
          isOpen={showAssignmentsModal}
          onClose={() => {
            setShowAssignmentsModal(false)
            setSelectedTaskAssignments(null)
          }}
          title={`Asignaciones: ${selectedTaskAssignments.task_name}`}
          size="lg"
        >
          <div className="space-y-4">
            {selectedTaskAssignments.assigned_workers && selectedTaskAssignments.assigned_workers.length > 0 ? (
              <div className="space-y-3">
                {selectedTaskAssignments.assigned_workers.map((worker, index) => (
                  <div key={index} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <h4 className="text-slate-100 font-medium">{worker.worker_name}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Monto Asignado</label>
                            <p className="text-slate-100 font-semibold">{formatCurrency(worker.amount)}</p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Estado de Pago</label>
                            {worker.was_paid ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-900/50 text-green-300 rounded">
                                Pagado
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-900/50 text-yellow-300 rounded">
                                Pendiente
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                <p>No hay asignaciones registradas para esta tarea</p>
              </div>
            )}
          </div>
        </ModalV2>
      )}
    </div>
  )
}

