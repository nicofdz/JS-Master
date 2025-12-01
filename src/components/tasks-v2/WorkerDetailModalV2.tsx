'use client'

import { useState, useEffect } from 'react'
import { ModalV2 } from './ModalV2'
import { WorkerTaskStatsModal } from './WorkerTaskStatsModal'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { User, Briefcase, CheckCircle, Clock, AlertCircle, DollarSign, Calendar, MapPin, FileText, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface WorkerDetailModalV2Props {
  isOpen: boolean
  onClose: () => void
  workerId: number
  workerName: string
}

interface WorkerInfo {
  id: number
  full_name: string
  rut: string
  email?: string
  phone?: string
  cargo?: string
  is_active: boolean
  created_at: string
}

interface TaskAssignment {
  id: number
  task_id: number
  task_name: string
  task_category: string
  project_name: string
  apartment_number: string
  tower_number: number
  floor_number: number
  status: string
  priority: string
  assignment_status: string
  payment_share_percentage: number
  worker_payment: number
  is_paid: boolean
  completed_at?: string
  created_at: string
}

interface WorkerStats {
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  pending_tasks: number
  total_earnings: number
  paid_earnings: number
  pending_earnings: number
}

interface Contract {
  id: number
  contract_number: string
  contract_type: string
  project_name: string
  fecha_inicio: string
  fecha_termino?: string
  status: string
  daily_rate?: number
}

export function WorkerDetailModalV2({ isOpen, onClose, workerId, workerName }: WorkerDetailModalV2Props) {
  const [loading, setLoading] = useState(true)
  const [workerInfo, setWorkerInfo] = useState<WorkerInfo | null>(null)
  const [tasks, setTasks] = useState<TaskAssignment[]>([])
  const [stats, setStats] = useState<WorkerStats | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'contracts'>('overview')
  const [showStatsModal, setShowStatsModal] = useState(false)

  useEffect(() => {
    if (isOpen && workerId) {
      loadWorkerData()
    } else {
      // Reset on close
      setWorkerInfo(null)
      setTasks([])
      setStats(null)
      setContracts([])
      setActiveTab('overview')
    }
  }, [isOpen, workerId])

  const loadWorkerData = async () => {
    if (!workerId) return

    setLoading(true)
    try {
      // 1. Cargar información básica del trabajador
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id, full_name, rut, email, phone, cargo, is_active, created_at')
        .eq('id', workerId)
        .single()

      if (workerError) throw workerError
      setWorkerInfo(workerData)

      // 2. Cargar tareas asignadas
      const { data: tasksData, error: tasksError } = await supabase
        .from('task_assignments')
        .select(`
          id,
          task_id,
          assignment_status,
          payment_share_percentage,
          worker_payment,
          is_paid,
          completed_at,
          created_at,
          tasks!inner(
            id,
            task_name,
            task_category,
            status,
            priority,
            apartments!inner(
              apartment_number,
              floors!inner(
                floor_number,
                towers!inner(
                  tower_number,
                  projects!inner(
                    name
                  )
                )
              )
            )
          )
        `)
        .eq('worker_id', workerId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError

      const formattedTasks: TaskAssignment[] = (tasksData || []).map((ta: any) => ({
        id: ta.id,
        task_id: ta.task_id,
        task_name: ta.tasks.task_name,
        task_category: ta.tasks.task_category,
        project_name: ta.tasks.apartments.floors.towers.projects.name,
        apartment_number: ta.tasks.apartments.apartment_number,
        tower_number: ta.tasks.apartments.floors.towers.tower_number,
        floor_number: ta.tasks.apartments.floors.floor_number,
        status: ta.tasks.status,
        priority: ta.tasks.priority,
        assignment_status: ta.assignment_status,
        payment_share_percentage: ta.payment_share_percentage,
        worker_payment: ta.worker_payment,
        is_paid: ta.is_paid,
        completed_at: ta.completed_at,
        created_at: ta.created_at
      }))

      setTasks(formattedTasks)

      // 3. Calcular estadísticas
      const totalTasks = formattedTasks.length
      const completedTasks = formattedTasks.filter(t => t.assignment_status === 'completed').length
      const inProgressTasks = formattedTasks.filter(t => t.assignment_status === 'working').length
      const pendingTasks = formattedTasks.filter(t => t.assignment_status === 'assigned').length
      
      const totalEarnings = formattedTasks.reduce((sum, t) => sum + (t.worker_payment || 0), 0)
      const paidEarnings = formattedTasks.filter(t => t.is_paid).reduce((sum, t) => sum + (t.worker_payment || 0), 0)
      const pendingEarnings = totalEarnings - paidEarnings

      setStats({
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        in_progress_tasks: inProgressTasks,
        pending_tasks: pendingTasks,
        total_earnings: totalEarnings,
        paid_earnings: paidEarnings,
        pending_earnings: pendingEarnings
      })

      // 4. Cargar contratos activos
      const { data: contractsData, error: contractsError } = await supabase
        .from('contract_history')
        .select(`
          id,
          contract_number,
          contract_type,
          fecha_inicio,
          fecha_termino,
          status,
          daily_rate,
          projects!inner(
            name
          )
        `)
        .eq('worker_id', workerId)
        .eq('is_active', true)
        .order('fecha_inicio', { ascending: false })

      if (contractsError) throw contractsError

      const formattedContracts: Contract[] = (contractsData || []).map((c: any) => ({
        id: c.id,
        contract_number: c.contract_number,
        contract_type: c.contract_type,
        project_name: c.projects.name,
        fecha_inicio: c.fecha_inicio,
        fecha_termino: c.fecha_termino,
        status: c.status,
        daily_rate: c.daily_rate
      }))

      setContracts(formattedContracts)
    } catch (error: any) {
      console.error('Error loading worker data:', error)
      toast.error(`Error al cargar datos del trabajador: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'working': return 'bg-blue-100 text-blue-800'
      case 'assigned': return 'bg-gray-100 text-gray-800'
      case 'removed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado'
      case 'working': return 'Trabajando'
      case 'assigned': return 'Asignado'
      case 'removed': return 'Removido'
      default: return status
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

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente'
      case 'high': return 'Alta'
      case 'medium': return 'Media'
      case 'low': return 'Baja'
      default: return priority
    }
  }

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalles del Trabajador: ${workerName}`}
      size="xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400">Cargando información...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'tasks'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tareas ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'contracts'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Contratos ({contracts.length})
            </button>
          </div>

          {/* Tab: Resumen */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Información Básica */}
              {workerInfo && (
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                  <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Información Personal
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Nombre Completo</div>
                      <div className="text-sm text-slate-100">{workerInfo.full_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">RUT</div>
                      <div className="text-sm text-slate-100">{workerInfo.rut}</div>
                    </div>
                    {workerInfo.cargo && (
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Cargo</div>
                        <div className="text-sm text-slate-100">{workerInfo.cargo}</div>
                      </div>
                    )}
                    {workerInfo.email && (
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Email</div>
                        <div className="text-sm text-slate-100">{workerInfo.email}</div>
                      </div>
                    )}
                    {workerInfo.phone && (
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Teléfono</div>
                        <div className="text-sm text-slate-100">{workerInfo.phone}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Estado</div>
                      <div className="text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          workerInfo.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {workerInfo.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Estadísticas */}
              {stats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                    <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Estadísticas de Tareas
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Total de Tareas</span>
                        <span className="text-lg font-bold text-slate-100">{stats.total_tasks}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Completadas
                        </span>
                        <span className="text-lg font-bold text-green-400">{stats.completed_tasks}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          En Progreso
                        </span>
                        <span className="text-lg font-bold text-blue-400">{stats.in_progress_tasks}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Pendientes
                        </span>
                        <span className="text-lg font-bold text-yellow-400">{stats.pending_tasks}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                    <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Estadísticas de Pagos
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Total Ganado</span>
                        <span className="text-lg font-bold text-slate-100">
                          {formatCurrency(stats.total_earnings)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Pagado
                        </span>
                        <span className="text-lg font-bold text-green-400">
                          {formatCurrency(stats.paid_earnings)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pendiente
                        </span>
                        <span className="text-lg font-bold text-yellow-400">
                          {formatCurrency(stats.pending_earnings)}
                        </span>
                      </div>
                      {stats.total_earnings > 0 && (
                        <div className="pt-2 border-t border-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">% Pagado</span>
                            <span className="text-sm font-semibold text-slate-100">
                              {Math.round((stats.paid_earnings / stats.total_earnings) * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Tareas */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {/* Botón para ver estadísticas */}
              {stats && stats.completed_tasks > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowStatsModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Ver Estadísticas de Rendimiento
                  </button>
                </div>
              )}
              {tasks.length === 0 ? (
                <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
                  <Briefcase className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-400">No hay tareas asignadas a este trabajador</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-slate-800 rounded-lg border border-slate-700 p-4 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-slate-100">{task.task_name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                              {getPriorityText(task.priority)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mb-2">
                            {task.task_category} • {task.project_name}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Torre {task.tower_number} - Piso {task.floor_number} - {task.apartment_number}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.assignment_status)}`}>
                            {getStatusText(task.assignment_status)}
                          </span>
                          {task.is_paid && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Pagado
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-700">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Porcentaje</div>
                          <div className="text-sm font-semibold text-slate-100">{task.payment_share_percentage}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Monto</div>
                          <div className="text-sm font-semibold text-green-400">
                            {formatCurrency(task.worker_payment)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Asignado</div>
                          <div className="text-sm text-slate-300">
                            {formatDate(task.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Contratos */}
          {activeTab === 'contracts' && (
            <div className="space-y-4">
              {contracts.length === 0 ? (
                <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-400">No hay contratos activos para este trabajador</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="bg-slate-800 rounded-lg border border-slate-700 p-4 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-slate-100">
                              Contrato #{contract.contract_number}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              contract.status === 'activo' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {contract.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mb-2">
                            {contract.contract_type} • {contract.project_name}
                          </div>
                        </div>
                      </div>
                      <div className={`grid gap-4 pt-3 border-t border-slate-700 ${
                        contract.contract_type === 'a_trato' ? 'grid-cols-2' : 'grid-cols-3'
                      }`}>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Fecha Inicio</div>
                          <div className="text-sm text-slate-100 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(contract.fecha_inicio)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Fecha Término</div>
                          <div className="text-sm text-slate-100 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {contract.fecha_termino ? formatDate(contract.fecha_termino) : 'Sin término'}
                          </div>
                        </div>
                        {contract.contract_type !== 'a_trato' && contract.daily_rate && (
                          <div>
                            <div className="text-xs text-slate-400 mb-1">Tarifa Diaria</div>
                            <div className="text-sm font-semibold text-green-400">
                              {formatCurrency(contract.daily_rate)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de Estadísticas */}
      <WorkerTaskStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        workerId={workerId}
        workerName={workerInfo?.full_name}
        workerRut={workerInfo?.rut}
      />
    </ModalV2>
  )
}

