'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TaskForm } from './TaskForm'
import { TaskDelayIndicator } from './TaskDelayIndicator'
import { Edit, Trash2, Plus, Clock, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { formatDate, getStatusColor, getStatusEmoji } from '@/lib/utils'
import { ACTIVITY_STATUSES } from '@/lib/constants'
import toast from 'react-hot-toast'

interface TaskRowProps {
  tasks: any[]
  apartmentId: number
  apartmentNumber: string
  apartments: any[]
  users: any[]
  floors?: any[]
  projects?: any[]
  onCreateTask: (data: any) => Promise<void>
  onUpdateTask: (id: number, data: any) => Promise<void>
  onDeleteTask: (id: number) => Promise<void>
}

export function TaskRow({ 
  tasks, 
  apartmentId, 
  apartmentNumber, 
  apartments, 
  users, 
  floors = [],
  projects = [],
  onCreateTask, 
  onUpdateTask, 
  onDeleteTask 
}: TaskRowProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const handleCreateTask = async (data: any) => {
    try {
      await onCreateTask(data)
      setShowCreateModal(false)
      setFormError(null)
    } catch (err: any) {
      setFormError(err.message || 'Error desconocido al crear tarea.')
    }
  }

  const handleUpdateTask = async (data: any) => {
    if (!editingTask) return
    try {
      await onUpdateTask(editingTask.id, data)
      setEditingTask(null)
      setFormError(null)
    } catch (err: any) {
      setFormError(err.message || 'Error desconocido al actualizar tarea.')
    }
  }

  const handleDelete = async (taskId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer.')) {
      return
    }
    try {
      await onDeleteTask(taskId)
      toast.success('Tarea eliminada exitosamente')
    } catch (err: any) {
      toast.error(`Error al eliminar tarea: ${err.message || 'Error desconocido'}`)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-3 h-3" />
      case 'high': return <AlertCircle className="w-3 h-3" />
      case 'medium': return <Clock className="w-3 h-3" />
      case 'low': return <CheckCircle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-600" />
      case 'blocked': return <XCircle className="w-4 h-4 text-red-600" />
      default: return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="bg-gray-50 px-6 py-4">
      <div className="space-y-3">
        {/* Header de tareas */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h4 className="text-sm font-medium text-gray-900">
              Tareas del Apartamento {apartmentNumber}
            </h4>
            <span className="text-xs text-gray-500">
              ({tasks.length} tarea{tasks.length !== 1 ? 's' : ''})
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Tarea</span>
          </Button>
        </div>

        {/* Lista de tareas */}
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No hay tareas asignadas a este apartamento</p>
            <p className="text-sm">Haz clic en "Agregar Tarea" para comenzar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(task.status)}
                      <h5 className="text-sm font-medium text-gray-900">{task.task_name}</h5>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        {getPriorityIcon(task.priority)}
                        <span className="ml-1 capitalize">{task.priority}</span>
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status === 'in-progress' || task.status === 'in_progress' ? (
                          <div className="w-3 h-3 mr-1 rounded-full bg-blue-500 border border-gray-800 flex-shrink-0"></div>
                        ) : (
                          <span className="mr-1">{getStatusEmoji(task.status)}</span>
                        )}
                        {task.status === 'in-progress' || task.status === 'in_progress' ? 'En Progreso' : ACTIVITY_STATUSES[task.status as keyof typeof ACTIVITY_STATUSES]}
                      </span>
                      {/* Indicador de retraso */}
                      {task.is_delayed && (
                        <TaskDelayIndicator 
                          isDelayed={task.is_delayed}
                          delayReason={task.delay_reason}
                        />
                      )}
                    </div>
                    
                    {task.task_description && (
                      <p className="text-sm text-gray-600 mb-2">{task.task_description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {task.assigned_user_name && (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{task.assigned_user_name}</span>
                        </div>
                      )}
                      {task.estimated_hours && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{task.estimated_hours}h</span>
                        </div>
                      )}
                      {task.start_date && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Inicia: {formatDate(task.start_date)}</span>
                        </div>
                      )}
                      {task.materials_count > 0 && (
                        <div className="flex items-center space-x-1">
                          <span>📦 {task.materials_count} material{task.materials_count !== 1 ? 'es' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTask(task)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(task.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Creación */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setFormError(null)
        }}
        title="Crear Nueva Tarea"
        size="md"
      >
        {formError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">¡Error!</strong>
            <span className="block sm:inline"> {formError}</span>
            <ul className="mt-2 list-disc list-inside">
              <li>Asegúrate de que todos los campos obligatorios estén llenos.</li>
              <li>Verifica tu conexión a la base de datos.</li>
              <li>Intenta recargar la página</li>
            </ul>
          </div>
        )}
        <TaskForm
          apartmentId={apartmentId}
          apartments={apartments}
          users={users}
          floors={floors}
          projects={projects}
          onSubmit={handleCreateTask}
          onCancel={() => {
            setShowCreateModal(false)
            setFormError(null)
          }}
        />
      </Modal>

      {/* Modal de Edición */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Editar Tarea"
        size="md"
      >
        {editingTask && (
          <TaskForm
            task={editingTask}
            apartments={apartments}
            users={users}
            floors={floors}
            projects={projects}
            onSubmit={handleUpdateTask}
            onCancel={() => setEditingTask(null)}
          />
        )}
      </Modal>
    </div>
  )
}
