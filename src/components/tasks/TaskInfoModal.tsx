'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  X, 
  Building2, 
  Home, 
  Layers, 
  FileText, 
  StickyNote, 
  Calendar, 
  User, 
  Clock, 
  DollarSign, 
  Users, 
  Camera,
  Upload,
  Trash2,
  Plus,
  Percent,
  Save,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react'
import { formatDate, getStatusColor, getStatusEmoji } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface TaskWorker {
  assignment_id: number
  worker_id: number
  worker_name: string
  role: string
  status: string
  percentage: number
  amount: number
  is_paid: boolean
  completed_at: string | null
}

interface ProgressPhoto {
  url: string
  description?: string
  uploaded_at: string
}

interface TaskInfoModalProps {
  task: any
  workers: any[]
  projectId?: number
  getWorkersForProject?: (projectId: number) => Promise<any[]>
  isOpen: boolean
  onClose: () => void
  onAssignWorker: (taskId: number, workerId: number, role: string) => Promise<void>
  onRemoveWorker: (assignmentId: number, reason?: string) => Promise<void>
  onAdjustDistribution: (taskId: number, distributions: { worker_id: number, percentage: number }[]) => Promise<void>
  onTaskUpdate?: () => void
}

export function TaskInfoModal({ 
  task, 
  workers,
  projectId,
  getWorkersForProject,
  isOpen, 
  onClose,
  onAssignWorker,
  onRemoveWorker,
  onAdjustDistribution,
  onTaskUpdate
}: TaskInfoModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'workers' | 'photos'>('info')
  const [taskWorkers, setTaskWorkers] = useState<TaskWorker[]>([])
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([])
  const [isEditingDistribution, setIsEditingDistribution] = useState(false)
  const [editedDistributions, setEditedDistributions] = useState<{ worker_id: number, percentage: number }[]>([])
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<string>('worker')
  const [filteredWorkers, setFilteredWorkers] = useState<any[]>([])
  const [loadingWorkers, setLoadingWorkers] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoDescription, setPhotoDescription] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Parsear trabajadores y fotos desde task
  useEffect(() => {
    if (task) {
      const workers = typeof task?.workers === 'string' 
        ? JSON.parse(task.workers) 
        : task?.workers || []
      setTaskWorkers(workers)

      const photos = typeof task?.progress_photos === 'string'
        ? JSON.parse(task.progress_photos)
        : task?.progress_photos || []
      setProgressPhotos(photos)

      // Inicializar distribuciones editadas
      if (workers.length > 0) {
        setEditedDistributions(
          workers.map((tw: TaskWorker) => ({
            worker_id: tw.worker_id,
            percentage: tw.percentage
          }))
        )
      }
    }
  }, [task])

  // Cargar trabajadores del proyecto
  useEffect(() => {
    const loadProjectWorkers = async () => {
      if (isOpen && projectId && getWorkersForProject) {
        setLoadingWorkers(true)
        try {
          const projectWorkers = await getWorkersForProject(projectId)
          setFilteredWorkers(projectWorkers)
        } catch (error) {
          console.error('Error loading project workers:', error)
          setFilteredWorkers([])
        } finally {
          setLoadingWorkers(false)
        }
      } else if (isOpen && !projectId) {
        setFilteredWorkers([])
        setLoadingWorkers(false)
      }
    }
    
    loadProjectWorkers()
  }, [isOpen, projectId, getWorkersForProject])

  const availableWorkers = filteredWorkers.filter(
    w => !taskWorkers.some(tw => tw.worker_id === w.id)
  )

  // Asignar trabajador
  const handleAssignWorker = async () => {
    if (!selectedWorkerId) {
      toast.error('Selecciona un trabajador')
      return
    }

    try {
      await onAssignWorker(task.id || task.task_id, parseInt(selectedWorkerId), selectedRole)
      setSelectedWorkerId('')
      setSelectedRole('worker')
      toast.success('Trabajador asignado. Pagos redistribuidos equitativamente.')
      // Recargar datos
      if (onTaskUpdate) onTaskUpdate()
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    }
  }

  // Remover trabajador
  const handleRemoveWorker = async (assignmentId: number, workerName: string) => {
    if (!confirm(`¿Remover a ${workerName} de esta tarea? Los pagos NO se redistribuirán automáticamente.`)) {
      return
    }

    try {
      await onRemoveWorker(assignmentId)
      toast.success('Trabajador removido. Ajusta la distribución manualmente si es necesario.')
      if (onTaskUpdate) onTaskUpdate()
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    }
  }

  // Guardar distribución
  const handleSaveDistribution = async () => {
    const total = editedDistributions.reduce((sum, d) => sum + d.percentage, 0)
    
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`La suma debe ser 100% (actual: ${total.toFixed(2)}%)`)
      return
    }

    try {
      await onAdjustDistribution(task.id || task.task_id, editedDistributions)
      setIsEditingDistribution(false)
      toast.success('Distribución de pagos actualizada')
      if (onTaskUpdate) onTaskUpdate()
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    }
  }

  const updatePercentage = (workerId: number, newPercentage: number) => {
    setEditedDistributions(prev =>
      prev.map(d =>
        d.worker_id === workerId
          ? { ...d, percentage: Math.max(0, Math.min(100, newPercentage)) }
          : d
      )
    )
  }

  const totalPercentage = editedDistributions.reduce((sum, d) => sum + d.percentage, 0)
  const isValidDistribution = Math.abs(totalPercentage - 100) < 0.01

  // Subir foto
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen')
      return
    }

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no puede ser mayor a 10MB')
      return
    }

    setUploadingPhoto(true)

    try {
      // Generar nombre único
      const fileExt = file.name.split('.').pop()
      const fileName = `task-${task.id}-${Date.now()}.${fileExt}`
      const filePath = `${task.id}/${fileName}`

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Error al subir foto: ${uploadError.message}`)
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('task-photos')
        .getPublicUrl(filePath)

      // Agregar foto a la lista
      const newPhoto: ProgressPhoto = {
        url: publicUrl,
        description: photoDescription || undefined,
        uploaded_at: new Date().toISOString()
      }

      const updatedPhotos = [...progressPhotos, newPhoto]

      // Actualizar en la base de datos
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ progress_photos: updatedPhotos })
        .eq('id', task.id || task.task_id)

      if (updateError) {
        throw new Error(`Error al guardar foto: ${updateError.message}`)
      }

      setProgressPhotos(updatedPhotos)
      setPhotoDescription('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      toast.success('Foto subida exitosamente')
      if (onTaskUpdate) onTaskUpdate()
    } catch (error: any) {
      console.error('Error uploading photo:', error)
      toast.error(error.message || 'Error al subir foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Eliminar foto
  const handleDeletePhoto = async (index: number) => {
    if (!confirm('¿Eliminar esta foto?')) return

    try {
      const photo = progressPhotos[index]
      const updatedPhotos = progressPhotos.filter((_, i) => i !== index)

      // Actualizar en la base de datos
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ progress_photos: updatedPhotos })
        .eq('id', task.id || task.task_id)

      if (updateError) {
        throw new Error(`Error al eliminar foto: ${updateError.message}`)
      }

      // Intentar eliminar del storage (opcional, no crítico si falla)
      try {
        const filePath = photo.url.split('/').slice(-2).join('/')
        await supabase.storage
          .from('task-photos')
          .remove([filePath])
      } catch (storageError) {
        console.warn('No se pudo eliminar del storage:', storageError)
      }

      setProgressPhotos(updatedPhotos)
      toast.success('Foto eliminada')
      if (onTaskUpdate) onTaskUpdate()
    } catch (error: any) {
      console.error('Error deleting photo:', error)
      toast.error(error.message || 'Error al eliminar foto')
    }
  }

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>{task.task_name}</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        {/* Tabs */}
        <div className="border-b px-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-3 px-4 border-b-2 font-medium transition-colors ${
                activeTab === 'info'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Información
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`py-3 px-4 border-b-2 font-medium transition-colors ${
                activeTab === 'workers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Trabajadores ({taskWorkers.length})
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`py-3 px-4 border-b-2 font-medium transition-colors ${
                activeTab === 'photos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Fotos ({progressPhotos.length})
            </button>
          </div>
        </div>

        <CardContent className="overflow-y-auto max-h-[calc(90vh-180px)] pt-6">
          {/* Tab: Información */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Información básica */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Información Básica</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <InfoRow icon={<FileText className="w-4 h-4" />} label="Tarea" value={task.task_name} />
                    <InfoRow icon={<Building2 className="w-4 h-4" />} label="Proyecto" value={task.project_name} />
                    <InfoRow icon={<Layers className="w-4 h-4" />} label="Piso" value={task.floor_number} />
                    <InfoRow icon={<Home className="w-4 h-4" />} label="Apartamento" value={task.apartment_number} />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Estado:</span>
                      <Badge className={getStatusColor(task.status)}>
                        {getStatusEmoji(task.status)} {task.status}
                      </Badge>
                    </div>
                    
                    <InfoRow 
                      icon={<DollarSign className="w-4 h-4" />} 
                      label="Presupuesto" 
                      value={`$${task.total_budget?.toLocaleString('es-CL') || '0'}`}
                      valueClassName="text-green-600 dark:text-green-400 font-semibold"
                    />
                    
                    <InfoRow icon={<Calendar className="w-4 h-4" />} label="Creada" value={formatDate(task.created_at)} />
                    
                    {task.completed_at && (
                      <InfoRow icon={<Calendar className="w-4 h-4" />} label="Completada" value={formatDate(task.completed_at)} />
                    )}
                  </div>
                </div>
              </div>

              {/* Descripción */}
              {task.task_description && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                    <StickyNote className="w-5 h-5" />
                    <span>Descripción</span>
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {task.task_description}
                    </p>
                  </div>
                </div>
              )}

              {/* Notas */}
              {task.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                    <StickyNote className="w-5 h-5" />
                    <span>Notas</span>
                  </h3>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {task.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Información de retraso */}
              {task.is_delayed && task.delay_reason && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 text-red-700 dark:text-red-400">
                    ⚠️ Tarea Retrasada
                  </h3>
                  <p className="text-red-600 dark:text-red-300">
                    {task.delay_reason}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Trabajadores */}
          {activeTab === 'workers' && (
            <div className="space-y-6">
              {/* Presupuesto */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium">Presupuesto Total:</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ${task.total_budget?.toLocaleString('es-CL')}
                  </span>
                </div>
              </div>

              {/* Trabajadores asignados */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Asignados ({taskWorkers.length})</span>
                  </h3>
                  {taskWorkers.length > 0 && !isEditingDistribution && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingDistribution(true)}
                    >
                      <Percent className="w-4 h-4 mr-2" />
                      Ajustar Distribución
                    </Button>
                  )}
                </div>

                {taskWorkers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay trabajadores asignados a esta tarea</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {taskWorkers.map((tw) => {
                      const edited = editedDistributions.find(d => d.worker_id === tw.worker_id)
                      const percentage = isEditingDistribution && edited ? edited.percentage : tw.percentage
                      const amount = task.total_budget * percentage / 100

                      return (
                        <div key={tw.assignment_id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">{tw.worker_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {tw.role}
                                </Badge>
                                {tw.is_paid && (
                                  <Badge className="bg-green-600 text-white text-xs">
                                    Pagado
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-4 mt-3">
                                <div>
                                  <span className="text-sm text-gray-500">Porcentaje</span>
                                  {isEditingDistribution ? (
                                    <div className="flex items-center space-x-2 mt-1">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={percentage.toFixed(2)}
                                        onChange={(e) => updatePercentage(tw.worker_id, parseFloat(e.target.value) || 0)}
                                        className="w-24 px-2 py-1 border rounded text-sm"
                                      />
                                      <Percent className="w-4 h-4 text-gray-400" />
                                    </div>
                                  ) : (
                                    <div className="font-semibold text-lg">
                                      {percentage.toFixed(2)}%
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <span className="text-sm text-gray-500">Monto</span>
                                  <div className="font-semibold text-lg text-green-600 dark:text-green-400">
                                    ${amount.toLocaleString('es-CL')}
                                  </div>
                                </div>

                                <div>
                                  <span className="text-sm text-gray-500">Estado</span>
                                  <div className="font-semibold text-sm capitalize">
                                    {tw.status === 'completed' && '✅ Completado'}
                                    {tw.status === 'working' && '🔄 Trabajando'}
                                    {tw.status === 'assigned' && '📋 Asignado'}
                                    {tw.status === 'removed' && '❌ Removido'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {!isEditingDistribution && !tw.is_paid && tw.status !== 'removed' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveWorker(tw.assignment_id, tw.worker_name)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {isEditingDistribution && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <span className="font-medium">
                          Total: {totalPercentage.toFixed(2)}%
                        </span>
                      </div>
                      {!isValidDistribution && (
                        <span className="text-red-600 text-sm font-medium">
                          ⚠️ Debe sumar 100%
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSaveDistribution}
                        disabled={!isValidDistribution}
                        className="flex-1"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Guardar Distribución
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingDistribution(false)
                          setEditedDistributions(
                            taskWorkers.map(tw => ({
                              worker_id: tw.worker_id,
                              percentage: tw.percentage
                            }))
                          )
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Asignar nuevo trabajador */}
              {!isEditingDistribution && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                    <Plus className="w-5 h-5" />
                    <span>Asignar Nuevo Trabajador</span>
                  </h3>

                  {!projectId && (
                    <div className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-300">
                      <span className="font-medium">⚠️ Error:</span> No se pudo determinar el proyecto de esta tarea.
                    </div>
                  )}

                  {projectId && (
                    <div className="mb-4 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                      <span className="font-medium">ℹ️ Filtro activo:</span> Solo se muestran trabajadores con contrato activo en este proyecto
                    </div>
                  )}

                  {loadingWorkers && (
                    <div className="mb-4 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                      Cargando trabajadores del proyecto...
                    </div>
                  )}

                  {!loadingWorkers && projectId && availableWorkers.length === 0 && (
                    <div className="mb-4 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm text-orange-800 dark:text-orange-300">
                      <span className="font-medium">ℹ️ Sin trabajadores disponibles:</span> No hay trabajadores con contrato activo en este proyecto, o todos ya están asignados.
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Trabajador</label>
                      <select
                        value={selectedWorkerId}
                        onChange={(e) => setSelectedWorkerId(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={!projectId || loadingWorkers || availableWorkers.length === 0}
                      >
                        <option value="">
                          {!projectId 
                            ? 'No se puede determinar el proyecto'
                            : loadingWorkers
                            ? 'Cargando trabajadores...'
                            : availableWorkers.length === 0
                            ? 'No hay trabajadores disponibles'
                            : 'Seleccionar trabajador...'
                          }
                        </option>
                        {availableWorkers.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.full_name} ({w.rut})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Rol</label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="worker">Trabajador</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="assistant">Ayudante</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      ℹ️ Al asignar un nuevo trabajador, los pagos se redistribuirán <strong>equitativamente</strong> entre todos los asignados.
                    </p>
                  </div>

                  <Button
                    onClick={handleAssignWorker}
                    disabled={!selectedWorkerId || !projectId || loadingWorkers}
                    className="w-full mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Asignar Trabajador
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Tab: Fotos */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <Camera className="w-5 h-5" />
                  <span>Fotos de Progreso ({progressPhotos.length})</span>
                </h3>

                {/* Subir foto */}
                <div className="mb-6 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Descripción (opcional)</label>
                      <Input
                        type="text"
                        placeholder="Ej: Estado inicial, Avance 50%, etc."
                        value={photoDescription}
                        onChange={(e) => setPhotoDescription(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="photo-upload"
                        disabled={uploadingPhoto}
                      />
                      <label htmlFor="photo-upload">
                        <Button
                          disabled={uploadingPhoto}
                          className="w-full cursor-pointer"
                        >
                          {uploadingPhoto ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Subir Foto
                            </>
                          )}
                        </Button>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      Formatos permitidos: JPG, PNG, WEBP. Tamaño máximo: 10MB
                    </p>
                  </div>
                </div>

                {/* Galería de fotos */}
                {progressPhotos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No hay fotos de progreso</p>
                    <p className="text-sm mt-2">Sube fotos para documentar el avance de la tarea</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {progressPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo.url}
                          alt={photo.description || `Foto ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        {photo.description && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 rounded-b-lg">
                            {photo.description}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeletePhoto(index)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {photo.uploaded_at && (
                          <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                            {formatDate(photo.uploaded_at)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Componente auxiliar para filas de información
function InfoRow({ 
  icon, 
  label, 
  value, 
  valueClassName = "text-gray-900 dark:text-gray-100" 
}: { 
  icon: React.ReactNode
  label: string
  value: string | number
  valueClassName?: string
}) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-gray-500">{icon}</span>
      <span className="font-medium text-gray-700 dark:text-gray-300">{label}:</span>
      <span className={valueClassName}>{value}</span>
    </div>
  )
}

