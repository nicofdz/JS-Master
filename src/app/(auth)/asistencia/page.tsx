'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useContracts } from '@/hooks/useContracts'
import { useWorkers } from '@/hooks/useWorkers'
import { useProjects } from '@/hooks/useProjects'
import { useAttendance } from '@/hooks/useAttendance'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Users, Check, X, Calendar, Clock, RefreshCw, Building2, User, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { AttendanceHistoryByWorker } from '@/components/attendance/AttendanceHistoryByWorker'
import { AttendanceHistoryByCalendar } from '@/components/attendance/AttendanceHistoryByCalendar'
import { ProjectAttendanceModal } from '@/components/attendance/ProjectAttendanceModal'

type ViewMode = 'register' | 'history'
type HistoryMode = 'by-worker' | 'by-calendar'

export default function AsistenciaPage() {
  const { contracts } = useContracts()
  const { workers } = useWorkers()
  const { projects } = useProjects()
  const { attendances, loading, markAttendance, fetchAttendances, refreshAttendanceStats, refreshingStats, getChileDateTime } = useAttendance()
  const { user } = useAuth()

  const [viewMode, setViewMode] = useState<ViewMode>('register')
  const [historyMode, setHistoryMode] = useState<HistoryMode>('by-worker')
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [historyProjectId, setHistoryProjectId] = useState<number | null>(null)
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear())
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1)
  const [historyAttendances, setHistoryAttendances] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())
  const [expandedWorkers, setExpandedWorkers] = useState<Set<number>>(new Set())
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [selectedProjectForModal, setSelectedProjectForModal] = useState<{ id: number; name: string } | null>(null)
  const [workersChangedToAbsent, setWorkersChangedToAbsent] = useState<Set<number>>(new Set())
  // Obtener fecha actual en zona horaria de Chile
  const getChileDate = () => {
    const now = new Date()
    const chileDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }))
    const year = chileDate.getFullYear()
    const month = String(chileDate.getMonth() + 1).padStart(2, '0')
    const day = String(chileDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const today = getChileDate()

  // Función helper para extraer hora del timestamp sin conversión de zona horaria
  const extractTimeFromTimestamp = (timestamp: string | null | undefined): string => {
    if (!timestamp) return '08:00'

    // El timestamp puede venir en formato: "2025-11-27 08:00:00+00" o "2025-11-27T08:00:00.000Z"
    // Extraer la hora directamente sin conversión de zona horaria
    let timeStr = ''

    if (timestamp.includes('T')) {
      // Formato ISO: "2025-11-27T08:00:00.000Z"
      timeStr = timestamp.split('T')[1]?.split('.')[0] || ''
    } else if (timestamp.includes(' ')) {
      // Formato con espacio: "2025-11-27 08:00:00+00"
      timeStr = timestamp.split(' ')[1]?.split('+')[0] || timestamp.split(' ')[1]?.split('-')[0] || ''
    }

    // Extraer solo HH:MM
    if (timeStr) {
      const parts = timeStr.split(':')
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`
      }
    }

    return '08:00'
  }

  // Estados para cada contrato individual
  const [contractStates, setContractStates] = useState<Record<number, {
    isPresent: boolean
    checkInTime: string
    checkOutTime: string
    notes: string
    departureReason: string
    isSaving: boolean
  }>>({})

  // Estados originales para detectar cambios
  const [originalStates, setOriginalStates] = useState<Record<number, {
    isPresent: boolean
    checkInTime: string
    checkOutTime: string
    notes: string
    departureReason: string
  }>>({})

  // Obtener contratos activos y vigentes para hoy
  const activeContracts = useMemo(() => {
    return contracts.filter(contract => {
      // Debe estar activo
      if (contract.status !== 'activo' || !contract.is_active) return false

      // Debe haber iniciado
      if (contract.fecha_inicio > today) return false

      // Si tiene fecha término, no debe haber pasado
      if (contract.fecha_termino && contract.fecha_termino < today) return false

      // Filtro por proyecto si está seleccionado
      if (selectedProjectId && contract.project_id !== selectedProjectId) return false

      return true
    })
  }, [contracts, today, selectedProjectId])

  // Cargar asistencias del día (solo en modo registro)
  useEffect(() => {
    if (viewMode === 'register') {
      fetchAttendances(today, selectedProjectId)
    }
  }, [today, selectedProjectId, viewMode, fetchAttendances])

  // Función para cargar asistencias de un rango amplio (últimos 12 meses)
  const loadHistoryAttendances = useCallback(async () => {
    try {
      setHistoryLoading(true)

      // Rango: 12 meses atrás hasta hoy (agregamos 1 día para asegurar que incluya hoy por temas de zona horaria)
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 1)
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 12)

      let query = supabase
        .from('worker_attendance')
        .select(`
          *,
          workers!inner(full_name, rut),
          projects(name),
          contract_history(contract_number, contract_type, project_id)
        `)
        .gte('attendance_date', startDate.toISOString().split('T')[0])
        .lte('attendance_date', endDate.toISOString().split('T')[0])

      // Filtrar por proyecto si está seleccionado
      if (historyProjectId) {
        query = query.eq('project_id', historyProjectId)
      }

      query = query.order('attendance_date', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      const transformedData = (data || []).map((item: any) => ({
        ...item,
        worker_name: item.workers?.full_name || 'Sin nombre',
        worker_rut: item.workers?.rut || '',
        project_name: item.projects?.name || 'General',
        contract_number: item.contract_history?.contract_number || 'N/A',
        contract_type: item.contract_history?.contract_type || 'por_dia',
        payment_percentage: item.payment_percentage || 100,
        is_paid: item.is_paid || false
      }))

      setHistoryAttendances(transformedData)
    } catch (error) {
      console.error('Error loading history attendances:', error)
      toast.error('Error al cargar historial de asistencias')
    } finally {
      setHistoryLoading(false)
    }
  }, [historyProjectId])

  // Cargar asistencias de un rango amplio (solo en modo historial)
  useEffect(() => {
    if (viewMode === 'history') {
      loadHistoryAttendances()
    }
  }, [viewMode, loadHistoryAttendances])

  // Handler para cambio de mes en historial
  const handleHistoryMonthChange = (year: number, month: number) => {
    setHistoryYear(year)
    setHistoryMonth(month)
  }

  // Handler para cambio de proyecto en historial
  const handleHistoryProjectChange = (projectId: number | null) => {
    setHistoryProjectId(projectId)
  }

  // Inicializar estados de contratos
  useEffect(() => {
    const newStates: typeof contractStates = {}
    const originals: typeof originalStates = {}

    activeContracts.forEach(contract => {
      const attendance = attendances.find(a => a.contract_id === contract.id)

      if (attendance) {
        // Ya tiene asistencia registrada - extraer hora directamente del string
        const checkIn = extractTimeFromTimestamp(attendance.check_in_time)
        const checkOut = attendance.check_out_time
          ? extractTimeFromTimestamp(attendance.check_out_time)
          : '18:00'

        const stateData = {
          isPresent: attendance.is_present,
          checkInTime: checkIn,
          checkOutTime: checkOut,
          notes: attendance.notes || '',
          departureReason: attendance.departure_reason || ''
        }

        newStates[contract.id] = {
          ...stateData,
          isSaving: false
        }

        // Guardar estado original para comparación
        originals[contract.id] = { ...stateData }
      } else {
        // Sin asistencia, valores por defecto
        const stateData = {
          isPresent: false,
          checkInTime: '08:00',
          checkOutTime: '18:00',
          notes: '',
          departureReason: ''
        }

        newStates[contract.id] = {
          ...stateData,
          isSaving: false
        }

        originals[contract.id] = { ...stateData }
      }
    })

    setContractStates(newStates)
    setOriginalStates(originals)
  }, [activeContracts, attendances])

  // Toggle presencia
  const handleTogglePresence = (contractId: number) => {
    setContractStates(prev => ({
      ...prev,
      [contractId]: {
        ...prev[contractId],
        isPresent: !prev[contractId]?.isPresent
      }
    }))
  }

  // Actualizar campo
  const handleFieldChange = (contractId: number, field: string, value: string) => {
    setContractStates(prev => ({
      ...prev,
      [contractId]: {
        ...prev[contractId],
        [field]: value
      }
    }))
  }

  // Función para calcular horas trabajadas (con descuento de 1 hora de almuerzo 13:00-14:00)
  const calculateHoursWorked = (checkIn: string, checkOut: string): number => {
    const [inHour, inMinute] = checkIn.split(':').map(Number)
    const [outHour, outMinute] = checkOut.split(':').map(Number)

    const inMinutes = inHour * 60 + inMinute
    const outMinutes = outHour * 60 + outMinute

    let diffMinutes = outMinutes - inMinutes

    // Restar 1 hora de almuerzo (13:00-14:00) si trabajó durante ese periodo
    const lunchStart = 13 * 60 // 13:00 en minutos
    const lunchEnd = 14 * 60   // 14:00 en minutos

    // Si entró antes de las 14:00 y salió después de las 13:00, tuvo hora de almuerzo
    if (inMinutes < lunchEnd && outMinutes > lunchStart) {
      diffMinutes -= 60 // Restar 1 hora (60 minutos)
    }

    return Math.round((diffMinutes / 60) * 100) / 100 // Redondear a 2 decimales
  }

  // Detectar si hay cambios
  const hasChanges = (contractId: number): boolean => {
    const current = contractStates[contractId]
    const original = originalStates[contractId]

    if (!current || !original) return false

    return (
      current.isPresent !== original.isPresent ||
      current.checkInTime !== original.checkInTime ||
      current.checkOutTime !== original.checkOutTime ||
      current.notes !== original.notes ||
      current.departureReason !== original.departureReason
    )
  }

  // Guardar asistencia individual (tanto presente como ausente)
  const handleSaveAttendance = async (contractId: number) => {
    const state = contractStates[contractId]
    if (!state) return

    // Validación solo si está presente
    if (state.isPresent) {
      if (state.checkOutTime < state.checkInTime) {
        toast.error('La hora de salida no puede ser menor que la hora de entrada')
        return
      }

      // Validar razón si es salida temprana
      const isEarlyDeparture = state.checkOutTime < '18:00'
      if (isEarlyDeparture && !state.departureReason.trim()) {
        toast.error('Debe ingresar una razón para la salida temprana')
        return
      }
    }

    try {
      setContractStates(prev => ({
        ...prev,
        [contractId]: { ...prev[contractId], isSaving: true }
      }))

      const contract = activeContracts.find(c => c.id === contractId)
      if (!contract) return

      // Construir timestamps
      const checkInTimestamp = state.isPresent ? `${today}T${state.checkInTime}:00` : getChileDateTime()
      const checkOutTimestamp = state.isPresent ? `${today}T${state.checkOutTime}:00` : null

      // Calcular campos adicionales (solo si está presente)
      let hoursWorked = null
      let isOvertime = false
      let overtimeHours = null

      if (state.isPresent) {
        hoursWorked = calculateHoursWorked(state.checkInTime, state.checkOutTime)
        isOvertime = hoursWorked > 9
        overtimeHours = isOvertime ? Math.round((hoursWorked - 9) * 100) / 100 : null
      }

      // Guardar asistencia (tanto presente como ausente)
      await markAttendance({
        worker_id: contract.worker_id,
        project_id: contract.project_id,
        contract_id: contractId,
        attendance_date: today,
        is_present: state.isPresent,
        notes: state.notes || null,
        check_in_time: checkInTimestamp,
        check_out_time: checkOutTimestamp,
        hours_worked: hoursWorked,
        is_overtime: isOvertime,
        overtime_hours: overtimeHours,
        early_departure: state.isPresent && state.checkOutTime < '18:00',
        departure_reason: (state.isPresent && state.checkOutTime < '18:00') ? state.departureReason : null,
        created_by: user?.id || null
      })

      // Recargar asistencias
      await fetchAttendances(today, selectedProjectId)

      // Actualizar estado original después de guardar exitosamente
      setOriginalStates(prev => ({
        ...prev,
        [contractId]: {
          isPresent: state.isPresent,
          checkInTime: state.checkInTime,
          checkOutTime: state.checkOutTime,
          notes: state.notes,
          departureReason: state.departureReason
        }
      }))

      toast.success(state.isPresent ? 'Asistencia guardada' : 'Ausencia registrada')
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('Error al guardar asistencia')
    } finally {
      setContractStates(prev => ({
        ...prev,
        [contractId]: { ...prev[contractId], isSaving: false }
      }))
    }
  }

  // Manejar click en botón presente/ausente (solo expande, no guarda)
  const handleTogglePresenceAndExpand = (contractId: number, isPresent: boolean) => {
    // Cambiar estado de presencia
    handleTogglePresence(contractId)
    // Expandir el trabajador para mostrar el formulario
    if (!expandedWorkers.has(contractId)) {
      setExpandedWorkers(prev => {
        const newSet = new Set(prev)
        newSet.add(contractId)
        return newSet
      })
    }
  }

  // Marcar todos los trabajadores de un proyecto como presentes
  const handleMarkAllPresent = (projectId: number) => {
    const projectContracts = contractsByProject.find(p => p.projectId === projectId)
    if (!projectContracts) return

    // Marcar todos los contratos del proyecto como presentes
    projectContracts.contracts.forEach(contract => {
      const state = contractStates[contract.id]
      if (state && !state.isPresent) {
        handleTogglePresence(contract.id)
      }
    })

    toast.success(`Todos los trabajadores de ${projectContracts.projectName} marcados como presentes`)
  }

  // Abrir modal de registro de asistencia
  const handleOpenAttendanceModal = (projectId: number, projectName: string) => {
    setSelectedProjectForModal({ id: projectId, name: projectName })
    setShowAttendanceModal(true)
  }

  // Estadísticas
  const stats = useMemo(() => {
    const total = activeContracts.length
    const present = Object.values(contractStates).filter(s => s?.isPresent).length
    const absent = total - present

    return { total, present, absent }
  }, [activeContracts, contractStates])

  // Agrupar contratos por proyecto
  const contractsByProject = useMemo(() => {
    const grouped: Record<number, {
      projectId: number
      projectName: string
      contracts: typeof activeContracts
    }> = {}

    activeContracts.forEach(contract => {
      const projectId = contract.project_id
      if (!grouped[projectId]) {
        grouped[projectId] = {
          projectId,
          projectName: contract.project_name || 'Sin Proyecto',
          contracts: []
        }
      }
      grouped[projectId].contracts.push(contract)
    })

    return Object.values(grouped)
  }, [activeContracts])

  // Toggle expansión de proyecto
  const toggleProjectExpansion = (projectId: number) => {
    const isCurrentlyExpanded = expandedProjects.has(projectId)

    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (isCurrentlyExpanded) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })

    // Si se está colapsando, también colapsar todos los trabajadores de este proyecto
    if (isCurrentlyExpanded) {
      const projectContracts = contractsByProject.find(p => p.projectId === projectId)
      if (projectContracts) {
        setExpandedWorkers(prevWorkers => {
          const newWorkersSet = new Set(prevWorkers)
          projectContracts.contracts.forEach(contract => {
            newWorkersSet.delete(contract.id)
          })
          return newWorkersSet
        })
      }
    }
  }

  // Toggle expansión de trabajador
  const toggleWorkerExpansion = (contractId: number) => {
    setExpandedWorkers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(contractId)) {
        newSet.delete(contractId)
      } else {
        newSet.add(contractId)
      }
      return newSet
    })
  }

  // Calcular estadísticas por proyecto
  const getProjectStats = (projectContracts: typeof activeContracts) => {
    const total = projectContracts.length
    const present = projectContracts.filter(contract => {
      const state = contractStates[contract.id]
      return state?.isPresent
    }).length
    const absent = total - present
    return { total, present, absent }
  }

  return (
    <div className="container mx-auto py-8 px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Control de Asistencia</h1>
          <p className="text-slate-400 mt-1">Registra la asistencia diaria de los trabajadores</p>
        </div>

        {/* Botón Refrescar Estadísticas */}
        <button
          onClick={refreshAttendanceStats}
          disabled={refreshingStats}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          title="Actualizar estadísticas de asistencia"
        >
          <RefreshCw className={`w-4 h-4 ${refreshingStats ? 'animate-spin' : ''}`} />
          <span>{refreshingStats ? 'Actualizando...' : 'Refrescar Estadísticas'}</span>
        </button>
      </div>

      {/* Toggle principal: Pasar Asistencia / Historial */}
      <div className="inline-flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setViewMode('register')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'register'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
        >
          <div className={`p-1 rounded-md ${viewMode === 'register' ? 'bg-white/20' : 'bg-slate-800'}`}>
            <Clock className="w-4 h-4" />
          </div>
          Pasar Asistencia
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'history'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
        >
          <div className={`p-1 rounded-md ${viewMode === 'history' ? 'bg-white/20' : 'bg-slate-800'}`}>
            <Calendar className="w-4 h-4" />
          </div>
          Historial
        </button>
      </div>

      {/* Toggle secundario: Solo visible en modo Historial */}
      {viewMode === 'history' && (
        <div className="inline-flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => setHistoryMode('by-worker')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${historyMode === 'by-worker'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
          >
            <div className={`p-1 rounded-md ${historyMode === 'by-worker' ? 'bg-white/20' : 'bg-slate-800'}`}>
              <User className="w-4 h-4" />
            </div>
            Por Trabajador
          </button>
          <button
            onClick={() => setHistoryMode('by-calendar')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${historyMode === 'by-calendar'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
          >
            <div className={`p-1 rounded-md ${historyMode === 'by-calendar' ? 'bg-white/20' : 'bg-slate-800'}`}>
              <Calendar className="w-4 h-4" />
            </div>
            Por Calendario
          </button>
        </div>
      )}

      {/* Contenido según modo seleccionado */}
      {viewMode === 'register' ? (
        <>
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Total Contratos Activos</p>
                    <p className="text-2xl font-bold text-slate-100 mt-1">{stats.total}</p>
                  </div>
                  <div className="p-3 bg-blue-900/30 rounded-lg">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Presentes</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.present}</p>
                  </div>
                  <div className="p-3 bg-emerald-900/30 rounded-lg">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Ausentes</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">{stats.absent}</p>
                  </div>
                  <div className="p-3 bg-red-900/30 rounded-lg">
                    <X className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="bg-slate-800/50 border-slate-700">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-100">
                  {new Date(today + 'T00:00:00').toLocaleDateString('es-CL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h2>
              </div>

              <div className="flex gap-4">
                {/* Filtro por proyecto */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Filtrar por Proyecto
                  </label>
                  <select
                    value={selectedProjectId?.toString() || ''}
                    onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos los proyectos</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Lista de Contratos/Asistencia - Estructura Tree View */}
          <Card className="bg-slate-800/50 border-slate-700">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Asistencia por Contrato</h3>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-slate-400 mt-4">Cargando contratos...</p>
                </div>
              ) : contractsByProject.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">
                    {selectedProjectId
                      ? 'No hay contratos activos en este proyecto'
                      : 'No hay contratos activos para hoy'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contractsByProject.map((projectGroup, index) => {
                    const isProjectExpanded = expandedProjects.has(projectGroup.projectId)
                    const projectStats = getProjectStats(projectGroup.contracts)

                    return (
                      <div key={projectGroup.projectId} className={`space-y-3 ${index > 0 ? 'mt-6 pt-4 border-t-2 border-slate-600' : ''}`}>
                        {/* Card del Proyecto - Expandible */}
                        <div
                          className="bg-slate-700/50 rounded-lg border border-slate-600 px-4 py-3 hover:bg-slate-700/70 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-2 cursor-pointer flex-1"
                              onClick={() => toggleProjectExpansion(projectGroup.projectId)}
                            >
                              {isProjectExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-300" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                              )}
                              <Building2 className="w-4 h-4 text-blue-400" />
                              <p className="text-sm font-medium text-slate-200">
                                {projectGroup.projectName}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Total:</span>
                                  <span className="text-slate-300 font-medium">{projectStats.total}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Presentes:</span>
                                  <span className="text-emerald-400 font-medium">{projectStats.present}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Ausentes:</span>
                                  <span className="text-red-400 font-medium">{projectStats.absent}</span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenAttendanceModal(projectGroup.projectId, projectGroup.projectName)
                                }}
                                className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                                title="Registrar asistencia de todos los trabajadores"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                Registrar Asistencia - {new Date(today + 'T00:00:00').toLocaleDateString('es-CL', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: '2-digit'
                                })}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Trabajadores del Proyecto */}
                        {isProjectExpanded && (
                          <div className="ml-4 space-y-3">
                            {projectGroup.contracts.map(contract => {
                              const state = contractStates[contract.id]
                              if (!state) return null

                              const worker = workers.find(w => w.id === contract.worker_id)
                              const attendance = attendances.find(a => a.contract_id === contract.id)

                              // Determinar el estado de asistencia desde la base de datos
                              const isPresentFromDB = attendance?.is_present ?? false

                              // Determinar si llegó tarde o salió temprano
                              const checkInTime = attendance?.check_in_time ? extractTimeFromTimestamp(attendance.check_in_time) : null
                              const checkOutTime = attendance?.check_out_time ? extractTimeFromTimestamp(attendance.check_out_time) : null
                              const isLateArrival = isPresentFromDB && checkInTime && checkInTime > '08:00'
                              const isEarlyDeparture = isPresentFromDB && checkOutTime && checkOutTime < '18:00'
                              const hasBothIssues = isLateArrival && isEarlyDeparture

                              // Determinar color del borde según el estado
                              let borderColor = 'border-slate-500'
                              if (!isPresentFromDB) {
                                borderColor = 'border-red-500'
                              } else if (hasBothIssues) {
                                borderColor = 'border-orange-500'
                              } else if (isLateArrival) {
                                borderColor = 'border-yellow-500'
                              } else if (isEarlyDeparture) {
                                borderColor = 'border-red-500'
                              } else {
                                borderColor = 'border-emerald-500'
                              }

                              return (
                                <div key={contract.id}>
                                  {/* Card del Trabajador - Solo visual */}
                                  <div
                                    className={`bg-slate-700/30 rounded-lg border-2 px-4 py-3 transition-colors ${borderColor}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      {/* Izquierda: Icono, Nombre, RUT */}
                                      <div className="flex items-center gap-3 flex-1">
                                        <User className="w-4 h-4 text-purple-400" />
                                        <p className={`text-sm font-medium ${isPresentFromDB ? 'text-emerald-300' : 'text-red-300'}`}>
                                          {worker?.full_name}
                                        </p>
                                        <span className="text-xs text-slate-400">{worker?.rut}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${contract.contract_type === 'por_dia'
                                          ? 'bg-purple-900/30 text-purple-400'
                                          : 'bg-orange-900/30 text-orange-400'
                                          }`}>
                                          {contract.contract_type === 'por_dia' ? 'Por Día' : 'A Trato'}
                                        </span>
                                      </div>

                                      {/* Derecha: Estado y Horas */}
                                      <div className="flex items-center gap-4">
                                        {isPresentFromDB ? (
                                          <div className="flex items-center gap-3 text-sm">
                                            <div className="flex items-center gap-1 text-slate-300">
                                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                                              <span>{checkInTime} - {checkOutTime}</span>
                                            </div>

                                            {/* Badges de estado */}
                                            <div className="flex gap-1">
                                              {isLateArrival && (
                                                <span className="px-1.5 py-0.5 bg-yellow-900/30 text-yellow-400 text-[10px] rounded border border-yellow-700/50" title="Llegada Tardía">
                                                  Tarde
                                                </span>
                                              )}
                                              {isEarlyDeparture && (
                                                <span className="px-1.5 py-0.5 bg-red-900/30 text-red-400 text-[10px] rounded border border-red-700/50" title="Salida Temprana">
                                                  Salida T.
                                                </span>
                                              )}
                                              {!isLateArrival && !isEarlyDeparture && (
                                                <span className="px-1.5 py-0.5 bg-emerald-900/30 text-emerald-400 text-[10px] rounded border border-emerald-700/50">
                                                  Normal
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-sm text-red-400 font-medium">Ausente</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </>
      ) : (
        <div className="space-y-6">
          {historyMode === 'by-worker' ? (
            <AttendanceHistoryByWorker
              contracts={contracts}
              workers={workers}
              attendances={historyAttendances}
              projects={projects}
              selectedProjectId={historyProjectId}
              onProjectChange={handleHistoryProjectChange}
              onMonthChange={(year, month) => handleHistoryMonthChange(year, month)}
              onRefresh={loadHistoryAttendances}
            />
          ) : (
            <AttendanceHistoryByCalendar
              attendances={historyAttendances}
              projects={projects}
              selectedProjectId={historyProjectId}
              onProjectChange={handleHistoryProjectChange}
              onMonthChange={(year, month) => handleHistoryMonthChange(year, month)}
              onRefresh={loadHistoryAttendances}
            />
          )}
        </div>
      )}

      {/* Modal de Asistencia por Proyecto */}
      {showAttendanceModal && selectedProjectForModal && (
        <ProjectAttendanceModal
          isOpen={showAttendanceModal}
          onClose={() => setShowAttendanceModal(false)}
          projectId={selectedProjectForModal.id}
          projectName={selectedProjectForModal.name}
          contracts={contractsByProject.find(p => p.projectId === selectedProjectForModal.id)?.contracts || []}
          workers={workers}
          today={today}
          onWorkersChanged={(changedToAbsent) => {
            // Actualizar estado local para reflejar cambios a ausente
            setContractStates(prev => {
              const newStates = { ...prev }
              changedToAbsent.forEach(id => {
                if (newStates[id]) {
                  newStates[id] = {
                    ...newStates[id],
                    isPresent: false
                  }
                }
              })
              return newStates
            })

            // Recargar datos
            fetchAttendances(today, selectedProjectId)
          }}
        />
      )}
    </div>
  )
}
