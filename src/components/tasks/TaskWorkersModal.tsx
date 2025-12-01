'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { X, User, Users, DollarSign, Percent, Plus, Trash2, Save, AlertCircle } from 'lucide-react'
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

interface TaskWorkersModalProps {
  task: any
  workers: any[] // Lista de todos los trabajadores disponibles
  projectId?: number // ID del proyecto para filtrar trabajadores con contrato
  getWorkersForProject?: (projectId: number) => Promise<any[]>
  isOpen: boolean
  onClose: () => void
  onAssignWorker: (taskId: number, workerId: number, role: string) => Promise<void>
  onRemoveWorker: (assignmentId: number, reason?: string) => Promise<void>
  onAdjustDistribution: (taskId: number, distributions: { worker_id: number, percentage: number }[]) => Promise<void>
}

export function TaskWorkersModal({ 
  task, 
  workers, 
  projectId,
  getWorkersForProject,
  isOpen, 
  onClose, 
  onAssignWorker,
  onRemoveWorker,
  onAdjustDistribution 
}: TaskWorkersModalProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<string>('worker')
  const [isEditing, setIsEditing] = useState(false)
  const [editedDistributions, setEditedDistributions] = useState<{ worker_id: number, percentage: number }[]>([])
  const [removalReason, setRemovalReason] = useState<string>('')
  const [filteredWorkers, setFilteredWorkers] = useState<any[]>(workers)
  const [loadingWorkers, setLoadingWorkers] = useState(false)

  const taskWorkers: TaskWorker[] = typeof task?.workers === 'string' 
    ? JSON.parse(task.workers) 
    : task?.workers || []

  // Cargar trabajadores del proyecto cuando se abra el modal
  useEffect(() => {
    const loadProjectWorkers = async () => {
      if (isOpen && projectId && getWorkersForProject) {
        setLoadingWorkers(true)
        try {
          const projectWorkers = await getWorkersForProject(projectId)
          setFilteredWorkers(projectWorkers)
        } catch (error) {
          console.error('Error loading project workers:', error)
          setFilteredWorkers([]) // No mostrar trabajadores si hay error
        } finally {
          setLoadingWorkers(false)
        }
      } else if (isOpen && !projectId) {
        // Si no hay projectId, no mostrar trabajadores (requisito: solo trabajadores con contrato activo)
        setFilteredWorkers([])
        setLoadingWorkers(false)
      } else {
        setFilteredWorkers([])
      }
    }
    
    loadProjectWorkers()
  }, [isOpen, projectId, getWorkersForProject])

  const availableWorkers = filteredWorkers.filter(
    w => !taskWorkers.some(tw => tw.worker_id === w.id)
  )

  useEffect(() => {
    if (isOpen && taskWorkers.length > 0) {
      setEditedDistributions(
        taskWorkers.map(tw => ({
          worker_id: tw.worker_id,
          percentage: tw.percentage
        }))
      )
    }
  }, [isOpen, task])

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
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    }
  }

  const handleRemoveWorker = async (assignmentId: number, workerName: string) => {
    if (!confirm(`¿Remover a ${workerName} de esta tarea? Los pagos NO se redistribuirán automáticamente.`)) {
      return
    }

    try {
      await onRemoveWorker(assignmentId, removalReason || undefined)
      toast.success('Trabajador removido. Ajusta la distribución manualmente si es necesario.')
      setRemovalReason('')
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    }
  }

  const handleSaveDistribution = async () => {
    const total = editedDistributions.reduce((sum, d) => sum + d.percentage, 0)
    
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`La suma debe ser 100% (actual: ${total.toFixed(2)}%)`)
      return
    }

    try {
      await onAdjustDistribution(task.id || task.task_id, editedDistributions)
      setIsEditing(false)
      toast.success('Distribución de pagos actualizada')
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

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[85vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Trabajadores Asignados - {task.task_name}</span>
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

        <CardContent className="overflow-y-auto max-h-[70vh] pt-6">
          <div className="space-y-6">
            
            {/* Información del presupuesto */}
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
                {taskWorkers.length > 0 && !isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
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
                    const percentage = isEditing && edited ? edited.percentage : tw.percentage
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
                                {isEditing ? (
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

                          {!isEditing && !tw.is_paid && tw.status !== 'removed' && (
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

              {isEditing && (
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
                        setIsEditing(false)
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
            {!isEditing && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <Plus className="w-5 h-5" />
                  <span>Asignar Nuevo Trabajador</span>
                </h3>

                {!projectId && (
                  <div className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-300">
                    <span className="font-medium">⚠️ Error:</span> No se pudo determinar el proyecto de esta tarea. No se pueden asignar trabajadores.
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
                    <span className="font-medium">ℹ️ Sin trabajadores disponibles:</span> No hay trabajadores con contrato activo en este proyecto, o todos ya están asignados a esta tarea.
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
        </CardContent>
      </Card>
    </div>
  )
}

