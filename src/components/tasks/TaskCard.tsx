'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Building2,
  Play,
  Pause,
  Square,
  RotateCcw,
  MessageSquare,
  Info,
} from 'lucide-react'
import { formatDate, getStatusColor, getStatusEmoji } from '@/lib/utils'
import { ACTIVITY_STATUSES } from '@/lib/constants'
import { TaskDelayIndicator } from './TaskDelayIndicator'
import toast from 'react-hot-toast'

interface TaskCardProps {
  task: any
  onStatusChange: (taskId: number, newStatus: string) => Promise<void>
  onEdit: (task: any) => void
  onDelete: (taskId: number) => void
  onComments: (taskId: number) => void
  onInfo: (task: any) => void
}

export function TaskCard({ task, onStatusChange, onEdit, onDelete, onComments, onInfo }: TaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'in_progress': return <Play className="w-5 h-5 text-blue-600" />
      case 'blocked': return <XCircle className="w-5 h-5 text-red-600" />
      default: return <Clock className="w-5 h-5 text-gray-600" />
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

  const handleStatusChange = async (newStatus: string) => {
    if (isUpdating) return
    
    try {
      setIsUpdating(true)
      await onStatusChange(task.id, newStatus)
      toast.success(`Tarea ${newStatus === 'completed' ? 'completada' : newStatus === 'in_progress' ? 'iniciada' : 'bloqueada'}`)
    } catch (error: any) {
      toast.error(`Error al actualizar tarea: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusActions = () => {
    switch (task.status) {
      case 'pending':
        return (
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => handleStatusChange('in_progress')}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play className="w-4 h-4 mr-1" />
              Iniciar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('blocked')}
              disabled={isUpdating}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Bloquear
            </Button>
          </div>
        )
      case 'in_progress':
        return (
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => handleStatusChange('completed')}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Completar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('pending')}
              disabled={isUpdating}
              className="text-gray-600 border-gray-600 hover:bg-gray-50"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Pendiente
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('blocked')}
              disabled={isUpdating}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Bloquear
            </Button>
          </div>
        )
      case 'blocked':
        return (
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => handleStatusChange('in_progress')}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play className="w-4 h-4 mr-1" />
              Reanudar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('pending')}
              disabled={isUpdating}
              className="text-gray-600 border-gray-600 hover:bg-gray-50"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Pendiente
            </Button>
          </div>
        )
      case 'completed':
        return (
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('in_progress')}
              disabled={isUpdating}
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              <Play className="w-4 h-4 mr-1" />
              Reabrir
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('pending')}
              disabled={isUpdating}
              className="text-gray-600 border-gray-600 hover:bg-gray-50"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Pendiente
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      task.status === 'completed' ? 'bg-green-50 border-green-200' :
      task.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
      task.status === 'blocked' ? 'bg-red-50 border-red-200' :
      'bg-white border-gray-200'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Header con estado y prioridad */}
            <div className="flex items-center space-x-3 mb-3">
              {getStatusIcon(task.status)}
              <h3 className="text-lg font-medium text-gray-900">{task.task_name}</h3>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                {getPriorityIcon(task.priority)}
                <span className="ml-1 capitalize">{task.priority}</span>
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                {task.status === 'in_progress' ? (
                  <div className="w-3 h-3 mr-1 rounded-full bg-blue-500 border border-gray-800 flex-shrink-0"></div>
                ) : (
                  <span className="mr-1">{getStatusEmoji(task.status)}</span>
                )}
                {task.status === 'in_progress' ? 'En Progreso' : ACTIVITY_STATUSES[task.status as keyof typeof ACTIVITY_STATUSES]}
              </span>
              
              {/* Indicador de retraso */}
              <TaskDelayIndicator 
                isDelayed={task.is_delayed} 
                delayReason={task.delay_reason}
              />
            </div>
            
            {/* Descripción */}
            {task.task_description && (
              <p className="text-sm text-gray-600 mb-2">{task.task_description}</p>
            )}
            
            {/* Información de la tarea */}
            <div className="space-y-2 text-sm text-gray-500 mb-3">
              <div className="flex items-center space-x-1">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">Proyecto:</span>
                <span>{task.project_name}</span>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-1">
                  <span className="font-medium">Piso:</span>
                  <span>{task.floor_number}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-medium">Apartamento:</span>
                  <span>{task.apartment_number}</span>
                </div>
                {task.assigned_user_name && (
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{task.assigned_user_name}</span>
                  </div>
                )}
                {task.estimated_hours && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{task.estimated_hours}h</span>
                  </div>
                )}
              </div>
            </div>

            {/* Fechas */}
            <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
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

            {/* Acciones rápidas */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {getStatusActions()}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onInfo(task)}
                  className="text-purple-600 hover:text-purple-900 flex items-center space-x-1"
                >
                  <Info className="w-4 h-4" />
                  <span>Info</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(task)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onComments(task.id)}
                  className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Comentarios</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(task.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

