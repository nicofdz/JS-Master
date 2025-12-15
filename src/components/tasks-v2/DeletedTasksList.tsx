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
  onHardDelete?: (taskId: number) => Promise<void>
  onEmptyTrash?: () => Promise<void>
  onRefresh: () => void
}

export function DeletedTasksList({ deletedTasks, loading, onRestore, onHardDelete, onEmptyTrash, onRefresh }: DeletedTasksListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<DeletedTask | null>(null)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [showHardDeleteConfirm, setShowHardDeleteConfirm] = useState(false)
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false) // Nuevo estado
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
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Acciones Globales */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-400">
          {filteredTasks.length} tareas encontradas
        </div>
        {onEmptyTrash && deletedTasks.length > 0 && (
          <button
            onClick={() => setShowEmptyTrashConfirm(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors border border-transparent hover:border-red-900/30"
          >
            <Trash2 className="w-4 h-4" />
            Vaciar Papelera
          </button>
        )}
      </div>

      {/* Lista de tareas eliminadas */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700">
          <Trash2 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">
            {searchTerm ? 'No se encontraron tareas eliminadas' : 'La papelera está vacía'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div
              key={task.task_id}
              className="bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800/70 hover:border-slate-600 transition-all"
            >
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                {/* Información Principal */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-slate-100">{task.task_name}</h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-slate-700 text-slate-300 rounded border border-slate-600">
                      {task.task_category}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    {task.project_name && (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{task.project_name}</span>
                      </div>
                    )}
                    {(task.floor_number || task.apartment_number) && (
                      <div className="flex items-center gap-1">
                        <span>
                          {task.floor_number ? `Piso ${task.floor_number}` : ''}
                          {task.floor_number && task.apartment_number ? ' • ' : ''}
                          {task.apartment_number ? `Depto ${task.apartment_number}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Detalles de eliminación */}
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="text-red-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Eliminada: {formatDate(task.deleted_at || '')}
                    </span>
                    {task.deleted_by_email && (
                      <span className="text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {task.deleted_by_email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-4 justify-end w-full sm:w-auto">
                  <button
                    onClick={() => handleViewDetails(task)}
                    className="p-2 hover:bg-blue-900/30 rounded-md transition-colors text-blue-400 hover:text-blue-300"
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRestoreClick(task.task_id)}
                    className="p-2 hover:bg-green-900/30 rounded-md transition-colors text-green-400 hover:text-green-300"
                    title="Restaurar tarea"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  {onHardDelete && (
                    <button
                      onClick={() => {
                        setTaskToRestore(task.task_id) // Reutilizamos state para ID
                        setShowHardDeleteConfirm(true)
                      }}
                      className="p-2 hover:bg-red-900/30 rounded-md transition-colors text-red-400 hover:text-red-300"
                      title="Eliminar definitivamente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals and other components remain mostly the same, implemented below or reused */}
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
          {/* Detail content reused/adapted for dark mode */}
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

      {/* Modal de confirmación de Hard Delete */}
      <ConfirmModalV2
        isOpen={showHardDeleteConfirm}
        onClose={() => {
          setShowHardDeleteConfirm(false)
          setTaskToRestore(null)
        }}
        onConfirm={async () => {
          if (taskToRestore && onHardDelete) {
            await onHardDelete(taskToRestore)
            setShowHardDeleteConfirm(false)
            setTaskToRestore(null)
            onRefresh()
          }
        }}
        title="Eliminar Definitivamente"
        message="¿Estás seguro de que deseas eliminar esta tarea permanentemente? Esta acción NO se puede deshacer."
        confirmText="Eliminar Definitivamente"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Modal de confirmación de Vaciar Papelera */}
      <ConfirmModalV2
        isOpen={showEmptyTrashConfirm}
        onClose={() => setShowEmptyTrashConfirm(false)}
        onConfirm={async () => {
          if (onEmptyTrash) {
            await onEmptyTrash()
            setShowEmptyTrashConfirm(false)
            onRefresh()
          }
        }}
        title="Vaciar Papelera"
        message="¿Estás seguro de que deseas eliminar PERMANENTEMENTE todas las tareas de la papelera? Esta acción no se puede deshacer."
        confirmText="Sí, vaciar papelera"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  )
}

