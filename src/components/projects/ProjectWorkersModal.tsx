'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { Users, CheckCircle, Clock, XCircle, UserCheck, UserX, Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ProjectWorkersModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: number
  projectName: string
}

interface WorkerStats {
  worker_id: number
  full_name: string
  rut: string
  cargo: string
  contract_id: number
  contract_status: 'activo' | 'finalizado' | 'cancelado'
  fecha_inicio: string
  fecha_termino: string | null
  contract_type: 'por_dia' | 'a_trato'
  daily_rate: number | null
  // Estadísticas de tareas (para contratos a_trato)
  total_tasks: number
  completed_tasks: number
  pending_tasks: number
  in_progress_tasks: number
  blocked_tasks: number
  // Estadísticas de asistencia (para todos)
  days_worked: number
  total_hours: number
  days_worked_in_contract: number // Días trabajados dentro del período del contrato (para por_dia)
}

export function ProjectWorkersModal({ isOpen, onClose, projectId, projectName }: ProjectWorkersModalProps) {
  const [workers, setWorkers] = useState<WorkerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnlyActive, setShowOnlyActive] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      fetchWorkers()
    }
  }, [isOpen, showOnlyActive])

  const fetchWorkers = async () => {
    try {
      setLoading(true)

      // Obtener contratos del proyecto
      let contractsQuery = supabase
        .from('contract_history')
        .select(`
          id,
          worker_id,
          status,
          fecha_inicio,
          fecha_termino,
          contract_type,
          daily_rate,
          workers!inner(
            id,
            full_name,
            rut,
            cargo
          )
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)

      // Filtrar por status si solo queremos activos
      if (showOnlyActive) {
        contractsQuery = contractsQuery.eq('status', 'activo')
      }

      const { data: contracts, error: contractsError } = await contractsQuery

      if (contractsError) {
        console.error('Error obteniendo contratos:', contractsError)
        throw contractsError
      }

      if (!contracts || contracts.length === 0) {
        setWorkers([])
        setLoading(false)
        return
      }

      // Obtener estadísticas de tareas y asistencia para cada trabajador
      const workerIds = contracts.map(c => c.worker_id)
      
      // Obtener asistencia de todos los trabajadores del proyecto
      const { data: attendances, error: attendanceError } = await supabase
        .from('worker_attendance')
        .select('worker_id, attendance_date, is_present, hours_worked')
        .eq('project_id', projectId)
        .in('worker_id', workerIds)
        .eq('is_present', true)

      if (attendanceError) {
        console.error('Error obteniendo asistencia:', attendanceError)
      }

      // Agrupar asistencia por trabajador
      const attendanceByWorker: Record<number, { days: number; hours: number; dates: string[] }> = {}
      
      attendances?.forEach(att => {
        if (!attendanceByWorker[att.worker_id]) {
          attendanceByWorker[att.worker_id] = {
            days: 0,
            hours: 0,
            dates: []
          }
        }
        attendanceByWorker[att.worker_id].days++
        attendanceByWorker[att.worker_id].hours += att.hours_worked || 0
        attendanceByWorker[att.worker_id].dates.push(att.attendance_date)
      })

      // Obtener tareas del proyecto (solo para contratos a_trato)
      const contractsByTrato = contracts.filter(c => c.contract_type === 'a_trato')
      const workerIdsByTrato = contractsByTrato.map(c => c.worker_id)
      
      let projectTasks: any[] = []
      let floorIds: number[] = []
      let apartmentIds: number[] = []

      if (workerIdsByTrato.length > 0) {
        // Obtener pisos del proyecto
        const { data: projectFloors, error: floorsError } = await supabase
          .from('floors')
          .select('id')
          .eq('project_id', projectId)
          .eq('is_active', true)

        if (floorsError) {
          console.error('Error obteniendo pisos:', floorsError)
        } else {
          floorIds = projectFloors?.map(f => f.id) || []
        }

        if (floorIds.length > 0) {
          // Obtener departamentos del proyecto
          const { data: projectApartments, error: apartmentsError } = await supabase
            .from('apartments')
            .select('id')
            .in('floor_id', floorIds)
            .eq('is_active', true)

          if (apartmentsError) {
            console.error('Error obteniendo departamentos:', apartmentsError)
          } else {
            apartmentIds = projectApartments?.map(a => a.id) || []
          }

          // Obtener tareas de los departamentos del proyecto
          if (apartmentIds.length > 0) {
            const { data: tasks, error: tasksError } = await supabase
              .from('apartment_tasks')
              .select('assigned_to, status')
              .in('apartment_id', apartmentIds)
              .in('assigned_to', workerIdsByTrato)
              .neq('status', 'cancelled')
              .not('assigned_to', 'is', null)

            if (tasksError) {
              console.error('Error obteniendo tareas:', tasksError)
            } else {
              projectTasks = tasks || []
            }
          }
        }
      }

      // Agrupar tareas por trabajador (solo para a_trato)
      const tasksByWorker: Record<number, { total: number; completed: number; pending: number; in_progress: number; blocked: number }> = {}
      
      projectTasks.forEach(task => {
        if (!task.assigned_to) return
        
        if (!tasksByWorker[task.assigned_to]) {
          tasksByWorker[task.assigned_to] = {
            total: 0,
            completed: 0,
            pending: 0,
            in_progress: 0,
            blocked: 0
          }
        }

        tasksByWorker[task.assigned_to].total++
        
        if (task.status === 'completed') {
          tasksByWorker[task.assigned_to].completed++
        } else if (task.status === 'pending') {
          tasksByWorker[task.assigned_to].pending++
        } else if (task.status === 'in-progress' || task.status === 'in_progress') {
          tasksByWorker[task.assigned_to].in_progress++
        } else if (task.status === 'blocked') {
          tasksByWorker[task.assigned_to].blocked++
        }
      })

      // Combinar datos de contratos con estadísticas de tareas y asistencia
      const workersData: WorkerStats[] = contracts.map(contract => {
        const worker = contract.workers as any
        const stats = tasksByWorker[contract.worker_id] || {
          total: 0,
          completed: 0,
          pending: 0,
          in_progress: 0,
          blocked: 0
        }

        const attendance = attendanceByWorker[contract.worker_id] || {
          days: 0,
          hours: 0,
          dates: []
        }

        // Calcular días trabajados dentro del período del contrato (para por_dia)
        let daysWorkedInContract = 0
        if (contract.contract_type === 'por_dia') {
          const contractStart = new Date(contract.fecha_inicio)
          const contractEnd = contract.fecha_termino 
            ? new Date(contract.fecha_termino)
            : new Date() // Si no tiene fecha término, usar hoy
          
          // Filtrar asistencias que estén dentro del período del contrato
          const contractAttendances = attendance.dates.filter(date => {
            const attDate = new Date(date)
            return attDate >= contractStart && attDate <= contractEnd
          })
          
          daysWorkedInContract = contractAttendances.length
        }

        return {
          worker_id: contract.worker_id,
          full_name: worker?.full_name || 'Desconocido',
          rut: worker?.rut || '',
          cargo: worker?.cargo || '',
          contract_id: contract.id,
          contract_status: contract.status as 'activo' | 'finalizado' | 'cancelado',
          fecha_inicio: contract.fecha_inicio,
          fecha_termino: contract.fecha_termino || null,
          contract_type: contract.contract_type as 'por_dia' | 'a_trato',
          daily_rate: contract.daily_rate || null,
          // Estadísticas de tareas (para a_trato)
          total_tasks: stats.total,
          completed_tasks: stats.completed,
          pending_tasks: stats.pending,
          in_progress_tasks: stats.in_progress,
          blocked_tasks: stats.blocked,
          // Estadísticas de asistencia (para todos)
          days_worked: attendance.days,
          total_hours: attendance.hours,
          days_worked_in_contract: daysWorkedInContract
        }
      })

      // Ordenar: activos primero, luego por nombre
      workersData.sort((a, b) => {
        if (a.contract_status === 'activo' && b.contract_status !== 'activo') return -1
        if (a.contract_status !== 'activo' && b.contract_status === 'activo') return 1
        return a.full_name.localeCompare(b.full_name)
      })

      setWorkers(workersData)
    } catch (err) {
      console.error('Error fetching workers:', err)
      setWorkers([])
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (workerId: number, contractId: number, section: 'tasks' | 'days' | 'attendance') => {
    const key = `${workerId}-${contractId}-${section}`
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const isSectionExpanded = (workerId: number, contractId: number, section: 'tasks' | 'days' | 'attendance') => {
    const key = `${workerId}-${contractId}-${section}`
    return expandedSections.has(key)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activo':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/50">
            <UserCheck className="w-3 h-3 mr-1" />
            Activo
          </span>
        )
      case 'finalizado':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-500/50">
            <CheckCircle className="w-3 h-3 mr-1" />
            Finalizado
          </span>
        )
      case 'cancelado':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-500/50">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelado
          </span>
        )
      default:
        return null
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Trabajadores - ${projectName}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Switch para filtrar activos/todos */}
        <div className="flex items-center justify-between bg-slate-700/50 p-4 rounded-lg border border-slate-600">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm font-medium text-slate-200">Filtrar Trabajadores</p>
              <p className="text-xs text-slate-400">
                {showOnlyActive ? 'Mostrando solo trabajadores activos' : 'Mostrando todos los trabajadores'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${showOnlyActive ? 'text-slate-300' : 'text-slate-500'}`}>
              Activos
            </span>
            <button
              onClick={() => setShowOnlyActive(!showOnlyActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showOnlyActive ? 'bg-green-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showOnlyActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${!showOnlyActive ? 'text-slate-300' : 'text-slate-500'}`}>
              Todos
            </span>
          </div>
        </div>

        {/* Lista de trabajadores */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-300 font-medium">
              {showOnlyActive 
                ? 'No hay trabajadores activos en este proyecto'
                : 'No hay trabajadores registrados en este proyecto'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workers.map((worker) => (
              <div
                key={`${worker.worker_id}-${worker.contract_id}`}
                className="bg-slate-700/50 rounded-lg border border-slate-600 p-4 hover:border-slate-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{worker.full_name}</h3>
                      {getStatusBadge(worker.contract_status)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">RUT</p>
                        <p className="text-slate-200 font-medium">{worker.rut}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Cargo</p>
                        <p className="text-slate-200 font-medium">{worker.cargo || 'No especificado'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Tipo de Contrato</p>
                        <p className="text-slate-200 font-medium">
                          {worker.contract_type === 'por_dia' ? 'Por Día' : 'A Trato'}
                        </p>
                      </div>
                      {worker.daily_rate && worker.contract_type === 'por_dia' && (
                        <div>
                          <p className="text-slate-400">Tarifa Diaria</p>
                          <p className="text-slate-200 font-medium">
                            ${worker.daily_rate.toLocaleString('es-CL')}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-400">Fecha Inicio</p>
                        <p className="text-slate-200 font-medium">{formatDate(worker.fecha_inicio)}</p>
                      </div>
                      {worker.fecha_termino && (
                        <div>
                          <p className="text-slate-400">Fecha Término</p>
                          <p className="text-slate-200 font-medium">{formatDate(worker.fecha_termino)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Estadísticas según tipo de contrato */}
                {worker.contract_type === 'a_trato' ? (
                  /* Estadísticas de Tareas (para contratos a_trato) - Colapsable */
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <button
                      onClick={() => toggleSection(worker.worker_id, worker.contract_id, 'tasks')}
                      className="w-full flex items-center justify-between text-sm font-semibold text-slate-300 mb-3 hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isSectionExpanded(worker.worker_id, worker.contract_id, 'tasks') ? (
                          <ChevronDown className="w-4 h-4 text-green-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-green-400" />
                        )}
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>Estadísticas de Tareas</span>
                        {worker.total_tasks > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-green-900/30 text-green-400 rounded text-xs">
                            {worker.total_tasks} tareas
                          </span>
                        )}
                      </div>
                    </button>
                    {isSectionExpanded(worker.worker_id, worker.contract_id, 'tasks') && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-600">
                            <p className="text-xs text-slate-400 mb-1">Total</p>
                            <p className="text-lg font-bold text-white">{worker.total_tasks}</p>
                          </div>
                          <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30">
                            <p className="text-xs text-green-400 mb-1">Completadas</p>
                            <p className="text-lg font-bold text-green-400">{worker.completed_tasks}</p>
                          </div>
                          <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-500/30">
                            <p className="text-xs text-yellow-400 mb-1">Pendientes</p>
                            <p className="text-lg font-bold text-yellow-400">{worker.pending_tasks}</p>
                          </div>
                          <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
                            <p className="text-xs text-blue-400 mb-1">En Progreso</p>
                            <p className="text-lg font-bold text-blue-400">{worker.in_progress_tasks}</p>
                          </div>
                          <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30">
                            <p className="text-xs text-red-400 mb-1">Bloqueadas</p>
                            <p className="text-lg font-bold text-red-400">{worker.blocked_tasks}</p>
                          </div>
                        </div>
                        {worker.total_tasks > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                              <span>Progreso</span>
                              <span>{Math.round((worker.completed_tasks / worker.total_tasks) * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(worker.completed_tasks / worker.total_tasks) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Estadísticas de Días Trabajados (para contratos por_dia) - Colapsable */
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <button
                      onClick={() => toggleSection(worker.worker_id, worker.contract_id, 'days')}
                      className="w-full flex items-center justify-between text-sm font-semibold text-slate-300 mb-3 hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isSectionExpanded(worker.worker_id, worker.contract_id, 'days') ? (
                          <ChevronDown className="w-4 h-4 text-blue-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-blue-400" />
                        )}
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span>Días Trabajados en el Contrato</span>
                        <span className="ml-2 px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded text-xs">
                          {worker.days_worked_in_contract} días
                        </span>
                      </div>
                    </button>
                    {isSectionExpanded(worker.worker_id, worker.contract_id, 'days') && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
                          <p className="text-xs text-blue-400 mb-1">Días en el Contrato</p>
                          <p className="text-lg font-bold text-blue-400">{worker.days_worked_in_contract}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Desde {formatDate(worker.fecha_inicio)}
                            {worker.fecha_termino && ` hasta ${formatDate(worker.fecha_termino)}`}
                          </p>
                        </div>
                        {worker.daily_rate && (
                          <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30">
                            <p className="text-xs text-green-400 mb-1">Monto Estimado</p>
                            <p className="text-lg font-bold text-green-400">
                              ${(worker.days_worked_in_contract * worker.daily_rate).toLocaleString('es-CL')}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {worker.days_worked_in_contract} días × ${worker.daily_rate.toLocaleString('es-CL')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Estadísticas de Asistencia (para todos los trabajadores) - Colapsable */}
                <div className="mt-4 pt-4 border-t border-slate-600">
                  <button
                    onClick={() => toggleSection(worker.worker_id, worker.contract_id, 'attendance')}
                    className="w-full flex items-center justify-between text-sm font-semibold text-slate-300 mb-3 hover:text-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isSectionExpanded(worker.worker_id, worker.contract_id, 'attendance') ? (
                        <ChevronDown className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-cyan-400" />
                      )}
                      <UserCheck className="w-4 h-4 text-cyan-400" />
                      <span>Asistencia en el Proyecto</span>
                      <span className="ml-2 px-2 py-0.5 bg-cyan-900/30 text-cyan-400 rounded text-xs">
                        {worker.days_worked} días
                      </span>
                    </div>
                  </button>
                  {isSectionExpanded(worker.worker_id, worker.contract_id, 'attendance') && (
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                      <div className="bg-cyan-900/20 rounded-lg p-3 border border-cyan-500/30">
                        <p className="text-xs text-cyan-400 mb-1">Días Presentes</p>
                        <p className="text-lg font-bold text-cyan-400">{worker.days_worked}</p>
                        <p className="text-xs text-slate-400 mt-1">Total en el proyecto</p>
                      </div>
                      <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-500/30">
                        <p className="text-xs text-purple-400 mb-1">Horas Trabajadas</p>
                        <p className="text-lg font-bold text-purple-400">{Math.round(worker.total_hours)}</p>
                        <p className="text-xs text-slate-400 mt-1">Total acumulado</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botón de cerrar */}
        <div className="flex justify-end pt-4 border-t border-slate-600">
          <Button
            onClick={onClose}
            className="bg-slate-600 hover:bg-slate-700 text-white"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

