'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, CheckCircle2, XCircle, Clock, Search, Users, UserCheck, UserX, FileText, Briefcase } from 'lucide-react'
import type { Contract } from '@/hooks/useContracts'
import { WorkerReportModal } from './WorkerReportModal'
import { GeneralReportModal } from './GeneralReportModal'
import { AttendanceEditModal } from './AttendanceEditModal'

interface Worker {
  id: number
  full_name: string
  rut: string
  is_active: boolean
}

interface WorkerAttendance {
  id: number
  worker_id: number
  contract_id: number | null
  attendance_date: string
  is_present: boolean
  check_in_time: string
  check_out_time?: string | null
  hours_worked?: number | null
  early_departure?: boolean
  is_overtime?: boolean
  overtime_hours?: number | null
  notes: string | null
  is_paid?: boolean
}

interface Project {
  id: number
  name: string
}

interface AttendanceHistoryByWorkerProps {
  contracts: Contract[]
  workers: Worker[]
  attendances: WorkerAttendance[]
  projects: Project[]
  selectedProjectId: number | null
  onProjectChange: (projectId: number | null) => void
  onMonthChange: (year: number, month: number) => void
  onRefresh?: () => void
  contractTypeFilter?: string
  userRole: string | null
}

export function AttendanceHistoryByWorker({
  contracts,
  workers,
  attendances,
  projects,
  selectedProjectId,
  onProjectChange,
  onMonthChange,
  onRefresh,
  contractTypeFilter = 'all',
  userRole
}: AttendanceHistoryByWorkerProps) {
  const currentDate = new Date()
  const [expandedWorker, setExpandedWorker] = useState<number | null>(null)

  // Estado de mes/año por trabajador
  const [workerMonths, setWorkerMonths] = useState<Record<number, { year: number; month: number }>>({})

  // Estado para mostrar selector de mes/año
  const [showMonthPicker, setShowMonthPicker] = useState<string | null>(null) // formato: "workerId-projectId"

  // NUEVOS ESTADOS: Búsqueda y filtro de estado
  const [searchTerm, setSearchTerm] = useState<string>('')

  // State for edit modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedEditData, setSelectedEditData] = useState<{
    attendance?: any
    workerId: number
    contractId: number
    workerName: string
    date: string
  } | null>(null)

  const handleDayClick = (
    date: string,
    workerId: number,
    contractId: number,
    workerName: string,
    attendance?: WorkerAttendance
  ) => {
    // Prevent clicking on future dates
    if (new Date(date) > new Date()) return

    setSelectedEditData({
      attendance,
      workerId,
      contractId,
      workerName,
      date
    })
    setEditModalOpen(true)
  }

  const handleEditSave = () => {
    if (onRefresh) onRefresh()
    setEditModalOpen(false)
  }
  const [workerStatusFilter, setWorkerStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [showReportModal, setShowReportModal] = useState(false)
  const [showGeneralReportModal, setShowGeneralReportModal] = useState(false)
  const [reportWorkerId, setReportWorkerId] = useState<number | null>(null)

  // Obtener o inicializar mes/año de un trabajador
  const getWorkerMonth = (workerId: number) => {
    if (!workerMonths[workerId]) {
      return { year: currentDate.getFullYear(), month: currentDate.getMonth() + 1 }
    }
    return workerMonths[workerId]
  }

  // Cambiar mes de un trabajador específico
  const handleWorkerMonthChange = (workerId: number, year: number, month: number) => {
    setWorkerMonths(prev => ({
      ...prev,
      [workerId]: { year, month }
    }))
    onMonthChange(year, month)
  }

  // Obtener trabajadores que han tenido contratos
  const workersWithContracts = useMemo(() => {
    const workerIds = new Set(contracts.map(c => c.worker_id))
    let filtered = workers.filter(w => workerIds.has(w.id))

    // Filtrar por estado (activo/inactivo/todos)
    if (workerStatusFilter === 'active') {
      filtered = filtered.filter(w => w.is_active)
    } else if (workerStatusFilter === 'inactive') {
      filtered = filtered.filter(w => !w.is_active)
    }
    // Si es 'all', no filtramos por estado

    // Filtrar por búsqueda (nombre o RUT)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(w =>
        w.full_name.toLowerCase().includes(search) ||
        w.rut.toLowerCase().includes(search)
      )
    }

    // Filtrar por tipo de contrato
    if (contractTypeFilter !== 'all') {
      filtered = filtered.filter(w => {
        const workerContracts = contracts.filter(c => c.worker_id === w.id)
        return workerContracts.some(c => c.contract_type === contractTypeFilter)
      })
    }

    // Separar activos e inactivos para ordenar
    const active = filtered.filter(w => w.is_active)
    const inactive = filtered.filter(w => !w.is_active)

    // Activos primero, inactivos al final
    return [...active, ...inactive]
  }, [contracts, workers, workerStatusFilter, searchTerm])

  // Contar trabajadores por estado
  const workerCounts = useMemo(() => {
    const workerIds = new Set(contracts.map(c => c.worker_id))
    const allWorkers = workers.filter(w => workerIds.has(w.id))

    return {
      active: allWorkers.filter(w => w.is_active).length,
      inactive: allWorkers.filter(w => !w.is_active).length,
      total: allWorkers.length
    }
  }, [contracts, workers])

  // Agrupar contratos por trabajador y proyecto
  const contractsByWorker = useMemo(() => {
    const grouped: Record<number, Record<number, Contract[]>> = {}

    contracts.forEach(contract => {
      if (!grouped[contract.worker_id]) {
        grouped[contract.worker_id] = {}
      }
      if (!grouped[contract.worker_id][contract.project_id]) {
        grouped[contract.worker_id][contract.project_id] = []
      }
      grouped[contract.worker_id][contract.project_id].push(contract)
    })

    return grouped
  }, [contracts])

  // Generar días del mes
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month - 1, 1).getDay()
    return day === 0 ? 6 : day - 1 // Lunes = 0, Domingo = 6
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="bg-slate-800/50 border-slate-700">
        <div className="p-4 space-y-4">
          {/* Encabezado con botón de reporte */}
          <div className="flex items-center justify-end">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowGeneralReportModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors w-full sm:w-auto"
                title="Generar reporte general de todos los trabajadores"
              >
                <Users className="w-5 h-5" />
                <span>Reporte General</span>
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors w-full sm:w-auto"
                title="Generar reporte individual"
              >
                <FileText className="w-5 h-5" />
                <span>Reporte Individual</span>
              </button>
            </div>
          </div>

          {/* Input de búsqueda */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Buscar Trabajador
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o RUT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tarjetas de filtro de estado */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Estado del Trabajador
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tarjeta: Activos */}
              <button
                onClick={() => setWorkerStatusFilter('active')}
                className={`p-4 rounded-lg border-2 transition-all ${workerStatusFilter === 'active'
                  ? 'bg-emerald-900/30 border-emerald-500 shadow-lg'
                  : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                  }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <UserCheck className={`w-5 h-5 ${workerStatusFilter === 'active' ? 'text-emerald-400' : 'text-slate-400'
                    }`} />
                  <span className={`font-semibold ${workerStatusFilter === 'active' ? 'text-emerald-400' : 'text-slate-300'
                    }`}>
                    Activos
                  </span>
                </div>
                <div className={`text-2xl font-bold ${workerStatusFilter === 'active' ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                  {workerCounts.active}
                </div>
              </button>

              {/* Tarjeta: Inactivos */}
              <button
                onClick={() => setWorkerStatusFilter('inactive')}
                className={`p-4 rounded-lg border-2 transition-all ${workerStatusFilter === 'inactive'
                  ? 'bg-red-900/30 border-red-500 shadow-lg'
                  : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                  }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <UserX className={`w-5 h-5 ${workerStatusFilter === 'inactive' ? 'text-red-400' : 'text-slate-400'
                    }`} />
                  <span className={`font-semibold ${workerStatusFilter === 'inactive' ? 'text-red-400' : 'text-slate-300'
                    }`}>
                    Inactivos
                  </span>
                </div>
                <div className={`text-2xl font-bold ${workerStatusFilter === 'inactive' ? 'text-red-400' : 'text-slate-400'
                  }`}>
                  {workerCounts.inactive}
                </div>
              </button>

              {/* Tarjeta: Todos */}
              <button
                onClick={() => setWorkerStatusFilter('all')}
                className={`p-4 rounded-lg border-2 transition-all ${workerStatusFilter === 'all'
                  ? 'bg-blue-900/30 border-blue-500 shadow-lg'
                  : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                  }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className={`w-5 h-5 ${workerStatusFilter === 'all' ? 'text-blue-400' : 'text-slate-400'
                    }`} />
                  <span className={`font-semibold ${workerStatusFilter === 'all' ? 'text-blue-400' : 'text-slate-300'
                    }`}>
                    Todos
                  </span>
                </div>
                <div className={`text-2xl font-bold ${workerStatusFilter === 'all' ? 'text-blue-400' : 'text-slate-400'
                  }`}>
                  {workerCounts.total}
                </div>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de trabajadores con estadísticas */}
      <div className="space-y-3">
        {
          workersWithContracts.map(worker => {
            const workerContracts = contractsByWorker[worker.id] || {}
            const workerAttendances = attendances.filter(a => a.worker_id === worker.id)

            // Filtrar por proyecto si está seleccionado
            const projectsToShow = selectedProjectId
              ? Object.keys(workerContracts).filter(pid => parseInt(pid) === selectedProjectId)
              : Object.keys(workerContracts)

            if (projectsToShow.length === 0) return null

            const isExpanded = expandedWorker === worker.id

            // Calcular estadísticas globales del trabajador en el mes
            const totalPresent = workerAttendances.filter(a => a.is_present).length
            const totalEarlyDepartures = workerAttendances.filter(a => a.early_departure).length
            const totalOvertime = workerAttendances.filter(a => a.is_overtime).length
            const totalHours = workerAttendances
              .filter(a => a.is_present && a.hours_worked)
              .reduce((sum, a) => sum + (a.hours_worked || 0), 0)

            // Obtener tipos de contrato únicos del trabajador (filtrado por proyectos visibles)
            const visibleContracts = Object.entries(workerContracts)
              .filter(([pid]) => projectsToShow.includes(pid))
              .flatMap(([, contracts]) => contracts)

            const uniqueContractTypes = Array.from(new Set(visibleContracts.map(c => c.contract_type)))

            return (
              <Card key={worker.id} className="relative bg-slate-800/50 border-slate-700 overflow-hidden">
                {/* Header del trabajador - Clickeable */}
                <button
                  onClick={() => setExpandedWorker(isExpanded ? null : worker.id)}
                  className="w-full p-4 text-left hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-100">
                          {worker.full_name}
                        </h3>
                        {!worker.is_active && (
                          <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-400">
                            Inactivo
                          </span>
                        )}

                        {/* Tipos de contrato */}
                        {uniqueContractTypes.map(type => (
                          <span
                            key={type}
                            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${type === 'por_dia'
                              ? 'bg-purple-900/30 text-purple-400 border border-purple-700'
                              : 'bg-amber-900/30 text-amber-400 border border-amber-700'
                              }`}
                          >
                            <Briefcase className="w-3 h-3" />
                            {type === 'por_dia' ? 'Por día' : 'A trato'}
                          </span>
                        ))}

                        {/* Proyectos donde trabajó */}
                        {projectsToShow.map(projectId => {
                          const project = projects.find(p => p.id === parseInt(projectId))
                          return (
                            <span
                              key={projectId}
                              className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300 border border-slate-600 truncate max-w-[150px]"
                              title={project?.name || 'Sin nombre'}
                            >
                              {project?.name || 'Sin nombre'}
                            </span>
                          )
                        })}

                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''
                            }`}
                        />
                      </div>
                      <p className="text-sm text-slate-400 mb-3">{worker.rut}</p>

                      {/* Estadísticas del mes */}
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-slate-300">
                            <span className="font-semibold text-emerald-400">{totalPresent}</span> días
                          </span>
                        </div>

                        {totalHours > 0 && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-slate-300">
                              <span className="font-semibold text-blue-400">{Math.round(totalHours)}</span> horas
                            </span>
                          </div>
                        )}

                        {totalEarlyDepartures > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded bg-yellow-900/30 text-yellow-400">
                              ⚠️ {totalEarlyDepartures} salidas tempranas
                            </span>
                          </div>
                        )}

                        {totalOvertime > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded bg-blue-900/30 text-blue-400">
                              ⏰ {totalOvertime} días con extras
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botón de reporte individual */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setReportWorkerId(worker.id)
                        setShowReportModal(true)
                      }}
                      className="flex-shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
                      title="Generar reporte de asistencia del trabajador"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">Generar Reporte</span>
                    </button>
                  </div>
                </button>



                {/* Calendarios (solo visible si está expandido) */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-700">
                    {/* Calendarios por proyecto */}
                    <div className="mt-4 space-y-6">
                      {projectsToShow.map(projectId => {
                        const projectContracts = workerContracts[parseInt(projectId)]
                        const project = projects.find(p => p.id === parseInt(projectId))

                        // Obtener mes/año de este trabajador
                        const { year: workerYear, month: workerMonth } = getWorkerMonth(worker.id)
                        const daysInMonth = getDaysInMonth(workerYear, workerMonth)
                        const firstDay = getFirstDayOfMonth(workerYear, workerMonth)

                        const monthName = new Date(workerYear, workerMonth - 1).toLocaleDateString('es-CL', {
                          month: 'long',
                          year: 'numeric'
                        })

                        // Filtrar asistencias de este proyecto y mes
                        const projectAttendances = workerAttendances.filter(a => {
                          const contract = projectContracts.find(c => c.id === a.contract_id)
                          const [year, month] = a.attendance_date.split('-').map(Number)
                          const isInMonth = year === workerYear && month === workerMonth
                          return contract !== undefined && isInMonth
                        })

                        // Calcular estadísticas
                        const daysPresent = projectAttendances.filter(a => a.is_present).length
                        const attendanceRate = daysInMonth > 0 ? Math.round((daysPresent / daysInMonth) * 100) : 0

                        // Handlers para este trabajador
                        const handlePrevMonth = () => {
                          if (workerMonth === 1) {
                            handleWorkerMonthChange(worker.id, workerYear - 1, 12)
                          } else {
                            handleWorkerMonthChange(worker.id, workerYear, workerMonth - 1)
                          }
                        }

                        const handleNextMonth = () => {
                          if (workerMonth === 12) {
                            handleWorkerMonthChange(worker.id, workerYear + 1, 1)
                          } else {
                            handleWorkerMonthChange(worker.id, workerYear, workerMonth + 1)
                          }
                        }

                        const pickerKey = `${worker.id}-${projectId}`
                        const isPickerOpen = showMonthPicker === pickerKey

                        // Generar opciones de años (últimos 3 años y próximos 1)
                        const currentYear = new Date().getFullYear()
                        const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i)

                        return (
                          <div key={projectId}>
                            {/* Nombre del proyecto y selector de mes */}
                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                              <h4 className="text-md font-medium text-slate-200">
                                📍 {project?.name}
                              </h4>

                              <div className="flex items-center gap-3">
                                {/* Selector de mes/año */}
                                <div className="relative flex items-center gap-2">
                                  <button
                                    onClick={handlePrevMonth}
                                    className="p-1 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                                  >
                                    <ChevronLeft className="w-4 h-4 text-slate-300" />
                                  </button>

                                  <button
                                    onClick={() => setShowMonthPicker(isPickerOpen ? null : pickerKey)}
                                    className="text-sm font-medium text-slate-100 min-w-[140px] text-center capitalize hover:bg-slate-700/50 px-2 py-1 rounded transition-colors"
                                  >
                                    {monthName}
                                  </button>

                                  {/* Dropdown selector */}
                                  {isPickerOpen && (
                                    <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 p-3 min-w-[200px]">
                                      <div className="space-y-3">
                                        {/* Selector de año */}
                                        <div>
                                          <label className="block text-xs text-slate-400 mb-1">Año</label>
                                          <select
                                            value={workerYear}
                                            onChange={(e) => {
                                              handleWorkerMonthChange(worker.id, parseInt(e.target.value), workerMonth)
                                            }}
                                            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          >
                                            {years.map(year => (
                                              <option key={year} value={year}>{year}</option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Selector de mes */}
                                        <div>
                                          <label className="block text-xs text-slate-400 mb-1">Mes</label>
                                          <select
                                            value={workerMonth}
                                            onChange={(e) => {
                                              handleWorkerMonthChange(worker.id, workerYear, parseInt(e.target.value))
                                            }}
                                            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          >
                                            <option value={1}>Enero</option>
                                            <option value={2}>Febrero</option>
                                            <option value={3}>Marzo</option>
                                            <option value={4}>Abril</option>
                                            <option value={5}>Mayo</option>
                                            <option value={6}>Junio</option>
                                            <option value={7}>Julio</option>
                                            <option value={8}>Agosto</option>
                                            <option value={9}>Septiembre</option>
                                            <option value={10}>Octubre</option>
                                            <option value={11}>Noviembre</option>
                                            <option value={12}>Diciembre</option>
                                          </select>
                                        </div>

                                        <button
                                          onClick={() => setShowMonthPicker(null)}
                                          className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                                        >
                                          Cerrar
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <button
                                    onClick={handleNextMonth}
                                    className="p-1 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                                  >
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                  </button>
                                </div>

                                {/* Estadísticas */}
                                <div className="flex items-center gap-3 text-sm">
                                  <span className="text-slate-400">
                                    {daysPresent}/{daysInMonth}
                                  </span>
                                  <span className={`font-semibold ${attendanceRate >= 80 ? 'text-emerald-400' :
                                    attendanceRate >= 60 ? 'text-yellow-400' :
                                      'text-red-400'
                                    }`}>
                                    {attendanceRate}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Calendario */}
                            <div className="bg-slate-900/50 rounded-lg p-3 overflow-x-auto">
                              <div className="grid grid-cols-7 gap-1 min-w-[600px]">
                                {/* Encabezados de días */}
                                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                                  <div
                                    key={i}
                                    className="text-center text-xs font-medium text-slate-500 py-1"
                                  >
                                    {day}
                                  </div>
                                ))}

                                {/* Espacios vacíos antes del primer día */}
                                {Array.from({ length: firstDay }).map((_, i) => (
                                  <div key={`empty-${i}`} className="h-8" />
                                ))}

                                {/* Días del mes */}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                  const day = i + 1
                                  const dateStr = `${workerYear}-${String(workerMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                  const attendance = projectAttendances.find(a => a.attendance_date === dateStr)

                                  // Primero intentar obtener el contrato del registro de asistencia
                                  let displayContract = attendance?.contract_id
                                    ? projectContracts.find(c => c.id === attendance.contract_id)
                                    : null

                                  // Si no hay registro de asistencia, buscar el contrato activo para ese día
                                  if (!displayContract) {
                                    displayContract = projectContracts.find(c => {
                                      const startDate = new Date(c.fecha_inicio)
                                      const endDate = c.fecha_termino ? new Date(c.fecha_termino) : new Date('2099-12-31')
                                      const checkDate = new Date(dateStr)
                                      return checkDate >= startDate && checkDate <= endDate
                                    })
                                  }

                                  const hadContract = !!displayContract
                                  const isWeekend = (firstDay + i) % 7 >= 5
                                  const isPaid = attendance?.is_paid

                                  // Determinar color de fondo base según tipo de contrato
                                  const getContractTypeColor = () => {
                                    if (!hadContract || new Date(dateStr) > new Date()) return 'bg-slate-800'

                                    const baseColor = displayContract?.contract_type === 'por_dia'
                                      ? 'bg-purple-900/20'
                                      : 'bg-amber-900/20'

                                    if (isWeekend) return baseColor

                                    if (attendance?.is_present) {
                                      if (attendance.early_departure) return 'bg-yellow-900/30 border border-yellow-600'
                                      if (attendance.is_overtime) return 'bg-blue-900/30 border border-blue-600'
                                      return displayContract?.contract_type === 'por_dia'
                                        ? 'bg-purple-900/40 border border-purple-600'
                                        : 'bg-amber-900/40 border border-amber-600'
                                    } else if (attendance) {
                                      return 'bg-red-900/20 border border-red-600/50'
                                    }

                                    return baseColor
                                  }

                                  // Construir tooltip detallado
                                  const getTooltip = () => {
                                    if (!hadContract) return 'Sin contrato'
                                    if (new Date(dateStr) > new Date()) return 'Fecha futura'

                                    const contractInfo = `Contrato: ${displayContract?.contract_number || 'N/A'} (${displayContract?.contract_type === 'por_dia' ? 'Por día' : 'A trato'})`

                                    if (attendance?.is_present) {
                                      const hours = `${attendance.hours_worked?.toFixed(1)}h`
                                      const status = attendance.early_departure ? 'Salida temprana' : attendance.is_overtime ? 'Horas extra' : 'Presente'
                                      const paid = isPaid ? ' - Pagado' : ''
                                      return `${contractInfo}\n${status}: ${hours}${paid}`
                                    }

                                    return attendance ? `${contractInfo}\nAusente` : `${contractInfo}\nSin registro`
                                  }

                                  return (
                                    <button
                                      key={day}
                                      onClick={() => handleDayClick(
                                        dateStr,
                                        worker.id,
                                        attendance?.contract_id || (displayContract?.id || 0),
                                        worker.full_name,
                                        attendance
                                      )}
                                      disabled={!hadContract || new Date(dateStr) > new Date()}
                                      className={`h-10 w-full flex flex-col items-center justify-center text-xs rounded relative group transition-all
                                      ${!hadContract || new Date(dateStr) > new Date()
                                          ? 'text-slate-600 cursor-not-allowed'
                                          : 'cursor-pointer hover:ring-2 hover:ring-blue-500'
                                        }
                                      ${getContractTypeColor()}
                                      ${isPaid ? 'border-b-4 border-b-emerald-500' : ''}`}
                                      title={getTooltip()}
                                    >
                                      <span className="font-medium">{day}</span>
                                      {hadContract && displayContract && (
                                        <span className="text-[8px] opacity-60 truncate max-w-full px-0.5">
                                          {displayContract.contract_number || 'N/A'}
                                        </span>
                                      )}
                                      {attendance?.is_present && (
                                        <span className="absolute top-0 right-0 text-[8px]">
                                          {attendance.early_departure ? '⚠️' :
                                            attendance.is_overtime ? '⏰' : '✓'}
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>

                              {/* Leyenda */}
                              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded bg-purple-900/40 border border-purple-600"></div>
                                  <span>Por día</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded bg-amber-900/40 border border-amber-600"></div>
                                  <span>A trato</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded bg-yellow-900/30 border border-yellow-600"></div>
                                  <span>Salida temprana</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded bg-blue-900/30 border border-blue-600"></div>
                                  <span>Horas extra</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded bg-red-900/20 border border-red-600/50"></div>
                                  <span>Ausente</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded bg-slate-800"></div>
                                  <span>Sin contrato</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        }

        {
          workersWithContracts.length === 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <div className="p-12 text-center">
                <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">
                  {searchTerm
                    ? `No se encontraron trabajadores que coincidan con "${searchTerm}"`
                    : workerStatusFilter === 'active'
                      ? 'No hay trabajadores activos con contratos'
                      : workerStatusFilter === 'inactive'
                        ? 'No hay trabajadores inactivos con contratos'
                        : 'No hay trabajadores con contratos'
                  }
                </p>
              </div>
            </Card>
          )
        }
      </div >

      <WorkerReportModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false)
          setReportWorkerId(null)
        }}
        workers={workers}
        projects={projects}
        selectedProjectId={selectedProjectId}
        preselectedWorkerId={reportWorkerId}
        contracts={contracts}
      />

      <GeneralReportModal
        isOpen={showGeneralReportModal}
        onClose={() => setShowGeneralReportModal(false)}
        workers={workers}
        projects={projects}
        selectedProjectId={selectedProjectId}
      />

      <AttendanceEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        attendance={selectedEditData?.attendance}
        workerId={selectedEditData?.workerId || 0}
        contractId={selectedEditData?.contractId || 0}
        workerName={selectedEditData?.workerName || ''}
        date={selectedEditData?.date || ''}
        onSave={handleEditSave}
        userRole={userRole}
      />
    </div >
  )
}

