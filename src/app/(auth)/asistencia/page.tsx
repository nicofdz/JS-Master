'use client'

import { useState, useEffect, useMemo } from 'react'
import { useContracts } from '@/hooks/useContracts'
import { useWorkers } from '@/hooks/useWorkers'
import { useProjects } from '@/hooks/useProjects'
import { useAttendance } from '@/hooks/useAttendance'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Users, Check, X, Calendar, Clock, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { AttendanceHistoryByWorker } from '@/components/attendance/AttendanceHistoryByWorker'
import { AttendanceHistoryByCalendar } from '@/components/attendance/AttendanceHistoryByCalendar'

type ViewMode = 'register' | 'history'
type HistoryMode = 'by-worker' | 'by-calendar'

export default function AsistenciaPage() {
  const { contracts } = useContracts()
  const { workers } = useWorkers()
  const { projects } = useProjects()
  const { attendances, loading, markAttendance, fetchAttendances, refreshAttendanceStats, refreshingStats } = useAttendance()
  const { user } = useAuth()
  
  const [viewMode, setViewMode] = useState<ViewMode>('register')
  const [historyMode, setHistoryMode] = useState<HistoryMode>('by-worker')
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [historyProjectId, setHistoryProjectId] = useState<number | null>(null)
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear())
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1)
  const [historyAttendances, setHistoryAttendances] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  
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
  }, [today, selectedProjectId, viewMode])

  // Cargar asistencias de un rango amplio (solo en modo historial)
  useEffect(() => {
    if (viewMode === 'history') {
      // Cargar últimos 12 meses de asistencias
      const loadHistoryAttendances = async () => {
        try {
          setHistoryLoading(true)
          
          // Rango: 12 meses atrás hasta hoy
          const endDate = new Date()
          const startDate = new Date()
          startDate.setMonth(startDate.getMonth() - 12)
          
          let query = supabase
            .from('worker_attendance')
            .select(`
              *,
              workers!inner(full_name, rut),
              projects(name),
              contract_history(contract_number)
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
            contract_number: item.contract_history?.contract_number || 'N/A'
          }))

          setHistoryAttendances(transformedData)
        } catch (error) {
          console.error('Error loading history attendances:', error)
          toast.error('Error al cargar historial de asistencias')
        } finally {
          setHistoryLoading(false)
        }
      }

      loadHistoryAttendances()
    }
  }, [viewMode, historyProjectId])

  // Handler para cambio de mes en historial
  const handleHistoryMonthChange = (year: number, month: number) => {
    setHistoryYear(year)
    setHistoryMonth(month)
  }

  // Handler para cambio de proyecto en historial
  const handleHistoryProjectChange = (projectId: number | null) => {
    setHistoryProjectId(projectId)
  }

  // Función helper para extraer hora del timestamp sin conversión de zona horaria
  const extractTimeFromTimestamp = (timestamp: string): string => {
    // Formato esperado: "2025-11-05T08:00:00" o "2025-11-05T08:00:00.000Z"
    // Extraer solo la parte de la hora HH:MM
    const timePart = timestamp.split('T')[1]?.substring(0, 5) || '08:00'
    return timePart
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

  // Guardar asistencia individual
  const handleSaveAttendance = async (contractId: number) => {
    const state = contractStates[contractId]
    if (!state) return

    // Validación
    if (state.isPresent && state.checkOutTime < state.checkInTime) {
      toast.error('La hora de salida no puede ser menor que la hora de entrada')
      return
    }

    // Validar razón si es salida temprana
    const isEarlyDeparture = state.isPresent && state.checkOutTime < '18:00'
    if (isEarlyDeparture && !state.departureReason.trim()) {
      toast.error('Debe ingresar una razón para la salida temprana')
      return
    }

    try {
      setContractStates(prev => ({
        ...prev,
        [contractId]: { ...prev[contractId], isSaving: true }
      }))

      const contract = activeContracts.find(c => c.id === contractId)
      if (!contract) return

      // Construir timestamps
      const checkInTimestamp = `${today}T${state.checkInTime}:00`
      const checkOutTimestamp = state.isPresent ? `${today}T${state.checkOutTime}:00` : null

      // Calcular campos adicionales
      let hoursWorked = null
      let isOvertime = false
      let overtimeHours = null
      
      if (state.isPresent) {
        hoursWorked = calculateHoursWorked(state.checkInTime, state.checkOutTime)
        isOvertime = hoursWorked > 8
        overtimeHours = isOvertime ? Math.round((hoursWorked - 8) * 100) / 100 : null
      }

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
        early_departure: isEarlyDeparture,
        departure_reason: isEarlyDeparture ? state.departureReason : null,
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
      
      toast.success('Asistencia guardada')
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

  // Estadísticas
  const stats = useMemo(() => {
    const total = activeContracts.length
    const present = Object.values(contractStates).filter(s => s?.isPresent).length
    const absent = total - present
    
    return { total, present, absent }
  }, [activeContracts, contractStates])

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
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
      <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg p-1 w-fit">
        <button
          onClick={() => setViewMode('register')}
          className={`px-4 py-2 rounded-md transition-all ${
            viewMode === 'register'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📝 Pasar Asistencia
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`px-4 py-2 rounded-md transition-all ${
            viewMode === 'history'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📊 Historial
        </button>
        </div>
        
      {/* Toggle secundario: Solo visible en modo Historial */}
      {viewMode === 'history' && (
        <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg p-1 w-fit">
          <button
            onClick={() => setHistoryMode('by-worker')}
            className={`px-4 py-2 rounded-md transition-all ${
              historyMode === 'by-worker'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            👤 Por Trabajador
          </button>
          <button
            onClick={() => setHistoryMode('by-calendar')}
            className={`px-4 py-2 rounded-md transition-all ${
              historyMode === 'by-calendar'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📅 Por Calendario
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

      {/* Lista de Contratos/Asistencia */}
      <Card className="bg-slate-800/50 border-slate-700">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Asistencia por Contrato</h3>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-slate-400 mt-4">Cargando contratos...</p>
            </div>
          ) : activeContracts.length === 0 ? (
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
            <div className="space-y-3">
              {activeContracts.map(contract => {
                const state = contractStates[contract.id]
                if (!state) return null

                const worker = workers.find(w => w.id === contract.worker_id)
                const attendance = attendances.find(a => a.contract_id === contract.id)
                const isEarlyDeparture = state.isPresent && state.checkOutTime < '18:00'
                
                return (
                  <div
                    key={contract.id}
                    className={`p-4 rounded-lg border transition-all ${
                      state.isPresent
                        ? 'bg-emerald-900/20 border-emerald-600'
                        : 'bg-slate-700/30 border-slate-600'
                    }`}
                  >
                    {/* Cabecera */}
                    <div className="flex items-start gap-4 mb-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleTogglePresence(contract.id)}
                        className={`flex-shrink-0 w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                          state.isPresent
                            ? 'bg-emerald-600 border-emerald-500'
                            : 'bg-slate-700 border-slate-500 hover:border-slate-400'
                        }`}
                      >
                        {state.isPresent && <Check className="w-6 h-6 text-white" />}
                      </button>

                      {/* Información del trabajador */}
                      <div className="flex-1">
                        <p className="font-medium text-slate-100 text-lg">{worker?.full_name}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-sm text-slate-400">{worker?.rut}</span>
                          <span className="text-xs px-2 py-1 rounded bg-blue-900/30 text-blue-400">
                            📍 {contract.project_name}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            contract.contract_type === 'por_dia'
                              ? 'bg-purple-900/30 text-purple-400'
                              : 'bg-orange-900/30 text-orange-400'
                          }`}>
                            💼 {contract.contract_type === 'por_dia' ? 'Por Día' : 'A Trato'}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                            {contract.contract_number}
                          </span>
                          {attendance && (
                            <span className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-400">
                              ✓ Registrado
                            </span>
                          )}
                          {isEarlyDeparture && (
                            <span className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400">
                              ⚠️ Salida temprana
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Formulario de horas (solo si está presente) */}
                    {state.isPresent && (
                      <div className="ml-14 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Hora de entrada */}
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              🕐 Hora de Entrada
                            </label>
                            <input
                              type="time"
                              value={state.checkInTime}
                              onChange={(e) => handleFieldChange(contract.id, 'checkInTime', e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
            </div>

                          {/* Hora de salida */}
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              🕐 Hora de Salida
                            </label>
                            <input
                              type="time"
                              value={state.checkOutTime}
                              onChange={(e) => handleFieldChange(contract.id, 'checkOutTime', e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                      </div>
                      
                          {/* Notas */}
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              📝 Notas (opcional)
                            </label>
                            <input
                              type="text"
                              value={state.notes}
                              onChange={(e) => handleFieldChange(contract.id, 'notes', e.target.value)}
                              placeholder="Ej: Llegó tarde..."
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        
                        {/* Campo de razón de salida temprana (solo si sale antes de 18:00) */}
                        {isEarlyDeparture && (
                          <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-3">
                            <label className="block text-xs font-medium text-red-400 mb-2">
                              ⚠️ Razón de Salida Temprana (Requerido)
                            </label>
                            <input
                              type="text"
                              value={state.departureReason}
                              onChange={(e) => handleFieldChange(contract.id, 'departureReason', e.target.value)}
                              placeholder="Ej: Cita médica, emergencia familiar..."
                              className="w-full px-3 py-2 bg-slate-800 border border-red-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-slate-500"
                            />
                          </div>
                        )}

                        {/* Botón guardar */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSaveAttendance(contract.id)}
                            disabled={state.isSaving || !hasChanges(contract.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center gap-2"
                          >
                            {state.isSaving ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Guardando...
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                {attendance ? 'Actualizar' : 'Guardar'} Asistencia
                              </>
                            )}
                          </button>
                        </div>
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
        /* Vista de Historial */
              <div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : historyMode === 'by-worker' ? (
            <AttendanceHistoryByWorker
              contracts={contracts}
              workers={workers}
              attendances={historyAttendances}
              projects={projects}
              selectedProjectId={historyProjectId}
              onProjectChange={handleHistoryProjectChange}
              onMonthChange={handleHistoryMonthChange}
            />
          ) : (
            <AttendanceHistoryByCalendar
              attendances={historyAttendances}
              projects={projects}
              selectedProjectId={historyProjectId}
              onProjectChange={handleHistoryProjectChange}
              onMonthChange={handleHistoryMonthChange}
            />
          )}
        </div>
      )}
    </div>
  )
}
