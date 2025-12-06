'use client'

import { useState, useEffect } from 'react'
import { ModalV2 } from './ModalV2'
import { Building, Calendar, DollarSign, Users, FileText, Edit, Image, Package, History } from 'lucide-react'
import { formatApartmentNumber } from '@/lib/utils'
import { TaskPhotosContent } from './TaskPhotosContent'
import { TaskMaterialsContent } from './TaskMaterialsContent'
import { TaskHistoryContent } from './TaskHistoryContent'
import { AdjustDistributionModalV2 } from './AdjustDistributionModalV2'
import { TaskFormModalV2 } from './TaskFormModalV2'

interface TaskDetailModalV2Props {
  isOpen: boolean
  onClose: () => void
  task?: any // TaskV2 type - placeholder
  initialTab?: 'details' | 'photos' | 'materials' | 'history'
  onEdit?: () => void
  onAdjustDistribution?: () => void
  onViewPhotos?: () => void
  onViewMaterials?: () => void
  onViewHistory?: () => void
  onTaskUpdate?: () => void
}

type TabType = 'details' | 'photos' | 'materials' | 'history'

export function TaskDetailModalV2({
  isOpen,
  onClose,
  task,
  initialTab = 'details',
  onEdit,
  onAdjustDistribution,
  onViewPhotos,
  onViewMaterials,
  onViewHistory,
  onTaskUpdate
}: TaskDetailModalV2Props) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDistributionModal, setShowDistributionModal] = useState(false)

  // Actualizar tab cuando cambia initialTab o se abre el modal
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])
  // Placeholder data
  const taskData = task || {
    task_name: 'Tabiques',
    task_category: 'Estructura',
    status: 'in_progress',
    priority: 'high',
    total_budget: 500000,
    project_name: 'Parque Lourdes',
    tower_number: 1,
    floor_number: 2,
    apartment_number: '201',
    start_date: '2025-01-15',
    end_date: '2025-01-20',
    completed_at: null,
    workers: [
      { id: 1, full_name: 'Juan Pérez', payment_share_percentage: 50, worker_payment: 250000, assignment_status: 'working' },
      { id: 2, full_name: 'María González', payment_share_percentage: 30, worker_payment: 150000, assignment_status: 'assigned' },
      { id: 3, full_name: 'Carlos Rodríguez', payment_share_percentage: 20, worker_payment: 100000, assignment_status: 'completed' }
    ],
    notes: 'Se requiere revisión de estructura antes de continuar'
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', bg: 'bg-yellow-100', text: 'text-yellow-800' },
      in_progress: { label: 'En Progreso', bg: 'bg-blue-100', text: 'text-blue-800' },
      completed: { label: 'Completada', bg: 'bg-green-100', text: 'text-green-800' },
      blocked: { label: 'Bloqueada', bg: 'bg-red-100', text: 'text-red-800' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Baja', bg: 'bg-green-100', text: 'text-green-800' },
      medium: { label: 'Media', bg: 'bg-yellow-100', text: 'text-yellow-800' },
      high: { label: 'Alta', bg: 'bg-orange-100', text: 'text-orange-800' },
      urgent: { label: 'Urgente', bg: 'bg-red-100', text: 'text-red-800' }
    }
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getAssignmentStatusBadge = (status: string) => {
    const statusConfig = {
      assigned: { label: 'Asignado', bg: 'bg-gray-100', text: 'text-gray-800' },
      working: { label: 'Trabajando', bg: 'bg-blue-100', text: 'text-blue-800' },
      completed: { label: 'Completado', bg: 'bg-green-100', text: 'text-green-800' },
      removed: { label: 'Removido', bg: 'bg-red-100', text: 'text-red-800' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.assigned
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const completedWorkers = taskData.workers.filter((w: any) => w.assignment_status === 'completed').length
  const progress = taskData.workers.length > 0 ? Math.round((completedWorkers / taskData.workers.length) * 100) : 0

  // Reset tab cuando se cierra el modal
  const handleClose = () => {
    setActiveTab('details')
    onClose()
  }

  const tabs = [
    { id: 'details' as TabType, label: 'Detalles', icon: FileText },
    { id: 'photos' as TabType, label: 'Fotos', icon: Image },
    { id: 'materials' as TabType, label: 'Materiales', icon: Package },
    { id: 'history' as TabType, label: 'Historial', icon: History }
  ]

  return (
    <>
      <ModalV2
        isOpen={isOpen}
        onClose={handleClose}
        title="Detalles de Tarea"
        size="xl"
      >
        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-[-1px] scrollbar-none snap-x">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap snap-start flex-shrink-0 border-b-2 ${isActive
                      ? 'bg-blue-50 text-blue-700 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-transparent'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Información General */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Información General</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                  <p className="text-sm font-medium text-gray-900">{taskData.task_name}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1">Categoría</label>
                  <p className="text-sm font-medium text-gray-900">{taskData.task_category}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1">Estado</label>
                  {getStatusBadge(taskData.status)}
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1">Prioridad</label>
                  {getPriorityBadge(taskData.priority)}
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1">Presupuesto</label>
                  <p className="text-sm font-medium text-gray-900">${(taskData.total_budget / 1000).toFixed(0)}K</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1">Progreso</label>
                  <p className="text-sm font-medium text-gray-900">{progress}%</p>
                </div>
              </div>
            </div>

            {/* Ubicación */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Ubicación
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1">Proyecto</label>
                  <p className="text-sm font-medium text-gray-900">{taskData.project_name}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1">Torre</label>
                  <p className="text-sm font-medium text-gray-900">Torre {taskData.tower_number}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1">Piso</label>
                  <p className="text-sm font-medium text-gray-900">Piso {taskData.floor_number}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1">Departamento</label>
                  <p className="text-sm font-medium text-gray-900">Depto {formatApartmentNumber(taskData.apartment_code, taskData.apartment_number || '')}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Fecha Inicio
                  </label>
                  <p className="text-sm font-medium text-gray-900">{taskData.start_date || '-'}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Fecha Fin
                  </label>
                  <p className="text-sm font-medium text-gray-900">{taskData.end_date || '-'}</p>
                </div>
              </div>
            </div>

            {/* Trabajadores Asignados */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Trabajadores Asignados ({taskData.workers.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {taskData.workers.map((worker: any) => (
                  <div key={worker.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                        {worker.full_name.charAt(0)}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{worker.full_name}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Porcentaje:</span>
                        <span className="font-medium text-blue-600">{worker.payment_share_percentage}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Monto:</span>
                        <span className="font-medium text-green-600">${(worker.worker_payment / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="pt-1">
                        {getAssignmentStatusBadge(worker.assignment_status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progreso General */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Progreso General</label>
                <span className="text-sm text-gray-600">{progress}% ({completedWorkers}/{taskData.workers.length} completados)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Notas */}
            {taskData.notes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notas
                </h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{taskData.notes}</p>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => setShowDistributionModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
              >
                <DollarSign className="w-4 h-4" />
                Ajustar Distribución
              </button>
              <button
                onClick={() => setActiveTab('photos')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <Image className="w-4 h-4" />
                Ver Fotos
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <Package className="w-4 h-4" />
                Ver Materiales
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <History className="w-4 h-4" />
                Historial
              </button>
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <TaskPhotosContent task={task} onPhotoUploaded={onTaskUpdate} />
        )}

        {activeTab === 'materials' && (
          <TaskMaterialsContent task={task} />
        )}

        {activeTab === 'history' && (
          <TaskHistoryContent task={task} />
        )}
      </ModalV2>

      {/* Modales separados para Editar y Ajustar Distribución */}
      <TaskFormModalV2
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        task={task}
        mode="edit"
      />

      <AdjustDistributionModalV2
        isOpen={showDistributionModal}
        onClose={() => setShowDistributionModal(false)}
        task={task}
      />
    </>
  )
}

