'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { ChevronLeft, ChevronRight, Calendar, X, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

interface WorkerAttendance {
  id: number
  worker_id: number
  worker_name?: string
  worker_rut?: string
  project_name?: string
  attendance_date: string
  is_present: boolean
  check_in_time: string
  check_out_time?: string | null
  hours_worked?: number | null
  early_departure?: boolean
  is_overtime?: boolean
  overtime_hours?: number | null
  notes: string | null
}

interface Project {
  id: number
  name: string
}

interface AttendanceHistoryByCalendarProps {
  attendances: WorkerAttendance[]
  projects: Project[]
  selectedProjectId: number | null
  onProjectChange: (projectId: number | null) => void
  onMonthChange: (year: number, month: number) => void
}

export function AttendanceHistoryByCalendar({
  attendances,
  projects,
  selectedProjectId,
  onProjectChange,
  onMonthChange
}: AttendanceHistoryByCalendarProps) {
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  
  // Filtrar asistencias por el mes seleccionado
  const monthAttendances = useMemo(() => {
    return attendances.filter(a => {
      const date = new Date(a.attendance_date)
      return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth
    })
  }, [attendances, selectedYear, selectedMonth])

  // Cambiar mes
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1)
      setSelectedMonth(12)
      onMonthChange(selectedYear - 1, 12)
    } else {
      setSelectedMonth(selectedMonth - 1)
      onMonthChange(selectedYear, selectedMonth - 1)
    }
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1)
      setSelectedMonth(1)
      onMonthChange(selectedYear + 1, 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
      onMonthChange(selectedYear, selectedMonth + 1)
    }
    setSelectedDate(null)
  }

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric'
  })
  
  // Generar opciones de años (últimos 3 años y próximos 1)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i)

  // Generar días del mes
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month - 1, 1).getDay()
    return day === 0 ? 6 : day - 1 // Lunes = 0, Domingo = 6
  }

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
  const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth)

  // Agrupar asistencias por fecha (del mes seleccionado)
  const attendancesByDate = useMemo(() => {
    const grouped: Record<string, WorkerAttendance[]> = {}
    
    monthAttendances.forEach(attendance => {
      if (!grouped[attendance.attendance_date]) {
        grouped[attendance.attendance_date] = []
      }
      grouped[attendance.attendance_date].push(attendance)
    })
    
    return grouped
  }, [monthAttendances])

  // Obtener asistencias del día seleccionado
  const selectedDayAttendances = selectedDate ? (attendancesByDate[selectedDate] || []) : []
  const presentCount = selectedDayAttendances.filter(a => a.is_present).length
  const absentCount = selectedDayAttendances.filter(a => !a.is_present).length

  // Formatear hora
  const formatTime = (timestamp: string): string => {
    const time = timestamp.split('T')[1]?.substring(0, 5) || '00:00'
    return time
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="bg-slate-800/50 border-slate-700">
        <div className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Filtro de proyecto */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Filtrar por Proyecto
              </label>
              <select
                value={selectedProjectId?.toString() || ''}
                onChange={(e) => onProjectChange(e.target.value ? parseInt(e.target.value) : null)}
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

            {/* Selector de mes */}
            <div className="relative flex items-center gap-3">
              <button
                onClick={handlePrevMonth}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-300" />
              </button>
              
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="text-lg font-semibold text-slate-100 min-w-[200px] text-center capitalize hover:bg-slate-700/50 px-3 py-1 rounded transition-colors"
              >
                {monthName}
              </button>
              
              {/* Dropdown selector */}
              {showMonthPicker && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 p-4 min-w-[220px]">
                  <div className="space-y-3">
                    {/* Selector de año */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Año</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          setSelectedYear(parseInt(e.target.value))
                          onMonthChange(parseInt(e.target.value), selectedMonth)
                        }}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        value={selectedMonth}
                        onChange={(e) => {
                          setSelectedMonth(parseInt(e.target.value))
                          onMonthChange(selectedYear, parseInt(e.target.value))
                        }}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      onClick={() => setShowMonthPicker(false)}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleNextMonth}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Calendario mensual */}
      <Card className="bg-slate-800/50 border-slate-700">
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2">
            {/* Encabezados de días */}
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day, i) => (
              <div
                key={i}
                className="text-center text-sm font-semibold text-slate-300 py-2"
              >
                {day}
              </div>
            ))}

            {/* Espacios vacíos antes del primer día */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px]" />
            ))}

            {/* Días del mes */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayAttendances = attendancesByDate[dateStr] || []
              const present = dayAttendances.filter(a => a.is_present).length
              const total = dayAttendances.length
              const isWeekend = (firstDay + i) % 7 >= 5
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const isSelected = dateStr === selectedDate

              // Calcular color según asistencia
              const getColor = () => {
                if (total === 0) return 'bg-slate-800'
                const rate = present / total
                if (rate >= 0.8) return 'bg-emerald-900/40 border-emerald-600'
                if (rate >= 0.6) return 'bg-emerald-900/20 border-emerald-600/50'
                if (rate >= 0.4) return 'bg-yellow-900/30 border-yellow-600'
                if (rate >= 0.2) return 'bg-orange-900/30 border-orange-600'
                return 'bg-red-900/30 border-red-600'
              }

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`min-h-[100px] p-2 rounded-lg border transition-all ${
                    isSelected
                      ? 'ring-2 ring-blue-500 border-blue-500'
                      : isToday
                      ? 'border-blue-400'
                      : isWeekend
                      ? 'border-slate-700'
                      : 'border-slate-700'
                  } ${getColor()} hover:opacity-80`}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${
                        isToday ? 'text-blue-400' : 'text-slate-300'
                      }`}>
                        {day}
                      </span>
                      {isToday && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-blue-600 text-white">
                          HOY
                        </span>
                      )}
                    </div>
                    
                    {total > 0 && (
                      <div className="mt-auto">
                        <div className="text-xs text-slate-400 mb-1">
                          {present} / {total}
                        </div>
                        <div className="text-lg font-bold text-slate-100">
                          {Math.round((present / total) * 100)}%
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-6 text-xs text-slate-400 flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-emerald-900/40 border border-emerald-600"></div>
              <span>80%+</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-900/30 border border-yellow-600"></div>
              <span>40-80%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-red-900/30 border border-red-600"></div>
              <span>&lt;40%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-slate-800"></div>
              <span>Sin registros</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Detalle del día seleccionado */}
      {selectedDate && (
        <Card className="bg-slate-800/50 border-slate-700">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-100">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-CL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 hover:bg-slate-700 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Estadísticas del día */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-emerald-900/20 border border-emerald-600 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-sm text-slate-400">Presentes</p>
                    <p className="text-2xl font-bold text-emerald-400">{presentCount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm text-slate-400">Ausentes</p>
                    <p className="text-2xl font-bold text-red-400">{absentCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de trabajadores */}
            <div className="space-y-2">
              {selectedDayAttendances.map(attendance => (
                <div
                  key={attendance.id}
                  className={`p-3 rounded-lg border ${
                    attendance.is_present
                      ? 'bg-emerald-900/10 border-emerald-600/30'
                      : 'bg-red-900/10 border-red-600/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {attendance.is_present ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      <div>
                        <p className="font-medium text-slate-100">
                          {attendance.worker_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{attendance.worker_rut}</span>
                          <span>•</span>
                          <span>📍 {attendance.project_name}</span>
                        </div>
                      </div>
                    </div>

                    {attendance.is_present && (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Horario</p>
                          <p className="text-sm font-medium text-slate-200">
                            {formatTime(attendance.check_in_time)} - {attendance.check_out_time ? formatTime(attendance.check_out_time) : '--:--'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Horas</p>
                          <p className="text-sm font-medium text-slate-200">
                            {attendance.hours_worked?.toFixed(1) || '0'}h
                          </p>
                        </div>
                        {attendance.early_departure && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-900/30 rounded text-xs text-yellow-400">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Temprano</span>
                          </div>
                        )}
                        {attendance.is_overtime && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 rounded text-xs text-blue-400">
                            <Clock className="w-3 h-3" />
                            <span>+{attendance.overtime_hours?.toFixed(1)}h</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {attendance.notes && (
                    <div className="mt-2 text-xs text-slate-400 pl-8">
                      📝 {attendance.notes}
                    </div>
                  )}
                </div>
              ))}

              {selectedDayAttendances.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No hay registros de asistencia para este día</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

