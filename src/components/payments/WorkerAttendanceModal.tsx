'use client'

import { useState, useMemo, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

interface Attendance {
    id: number
    attendance_date: string
    is_present: boolean
    check_in_time: string
    check_out_time?: string | null
    hours_worked?: number | null
    early_departure?: boolean
    late_arrival?: boolean
    arrival_reason?: string | null
    departure_reason?: string | null
    is_overtime?: boolean
    overtime_hours?: number | null
    is_paid?: boolean
    payment_percentage?: number
    project_name?: string
}

interface Contract {
    id: number
    contract_number: string
    fecha_inicio: string
    fecha_termino?: string | null
    project_name: string
}

interface WorkerAttendanceModalProps {
    isOpen: boolean
    onClose: () => void
    worker: {
        id: number
        name: string
        rut: string
    }
    attendances: Attendance[]
    contracts: Contract[]
}

export function WorkerAttendanceModal({ isOpen, onClose, worker, attendances, contracts }: WorkerAttendanceModalProps) {
    const currentDate = new Date()
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)

    // Filtrar asistencias por el mes seleccionado (solo días no pagados)
    const monthAttendances = useMemo(() => {
        return attendances.filter(a => {
            const date = new Date(a.attendance_date)
            return date.getFullYear() === selectedYear &&
                (date.getMonth() + 1) === selectedMonth &&
                !a.is_paid // Solo días no pagados
        })
    }, [attendances, selectedYear, selectedMonth])

    // Obtener meses que tienen días no pagados
    const monthsWithUnpaidDays = useMemo(() => {
        const monthsSet = new Set<string>()
        attendances.forEach(a => {
            if (!a.is_paid && a.is_present) {
                const date = new Date(a.attendance_date)
                const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
                monthsSet.add(monthKey)
            }
        })
        return Array.from(monthsSet).map(key => {
            const [year, month] = key.split('-').map(Number)
            return { year, month }
        }).sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year
            return b.month - a.month
        })
    }, [attendances])

    // Inicializar mes/año al primer mes con días no pagados
    useEffect(() => {
        if (monthsWithUnpaidDays.length > 0 && isOpen) {
            const firstMonth = monthsWithUnpaidDays[0]
            setSelectedYear(firstMonth.year)
            setSelectedMonth(firstMonth.month)
        }
    }, [monthsWithUnpaidDays, isOpen])

    // Obtener contrato activo del mes
    const activeContract = useMemo(() => {
        return contracts.find(c => {
            const startDate = new Date(c.fecha_inicio)
            const endDate = c.fecha_termino ? new Date(c.fecha_termino) : new Date('2099-12-31')
            const monthStart = new Date(selectedYear, selectedMonth - 1, 1)
            const monthEnd = new Date(selectedYear, selectedMonth, 0)
            return (monthStart >= startDate && monthStart <= endDate) ||
                (monthEnd >= startDate && monthEnd <= endDate) ||
                (startDate >= monthStart && startDate <= monthEnd)
        })
    }, [contracts, selectedYear, selectedMonth])

    // Calcular días restantes del contrato
    const daysRemaining = useMemo(() => {
        if (!activeContract) return null
        if (!activeContract.fecha_termino) return 'Indefinido'

        const endDate = new Date(activeContract.fecha_termino)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        endDate.setHours(0, 0, 0, 0)

        const diffTime = endDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        return diffDays > 0 ? diffDays : 0
    }, [activeContract])

    const handlePrevMonth = () => {
        if (selectedMonth === 1) {
            setSelectedYear(selectedYear - 1)
            setSelectedMonth(12)
        } else {
            setSelectedMonth(selectedMonth - 1)
        }
    }

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedYear(selectedYear + 1)
            setSelectedMonth(1)
        } else {
            setSelectedMonth(selectedMonth + 1)
        }
    }

    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('es-CL', {
        month: 'long',
        year: 'numeric'
    })

    // Generar días del mes
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month, 0).getDate()
    }

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month - 1, 1).getDay()
    }

    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth)
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    const totalDaysWorked = monthAttendances.filter(a => a.is_present).length
    const totalHoursWorked = monthAttendances
        .filter(a => a.is_present && a.hours_worked)
        .reduce((sum, a) => sum + (a.hours_worked || 0), 0)

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Asistencia de ${worker.name}`}
            size="xl"
        >
            <div className="space-y-4">
                {/* Información del Contrato */}
                {activeContract && (
                    <Card className="bg-slate-700/30 border-slate-600">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <div className="text-sm text-slate-400 mb-1">Contrato</div>
                                    <div className="font-semibold text-slate-100">{activeContract.contract_number}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-400 mb-1">Inicio</div>
                                    <div className="font-semibold text-slate-100">{formatDate(activeContract.fecha_inicio)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-400 mb-1">Fin</div>
                                    <div className="font-semibold text-slate-100">
                                        {activeContract.fecha_termino ? formatDate(activeContract.fecha_termino) : 'Indefinido'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-400 mb-1">Días Restantes</div>
                                    <div className="font-semibold text-blue-400">
                                        {daysRemaining === null ? 'N/A' : daysRemaining === 'Indefinido' ? 'Indefinido' : `${daysRemaining} días`}
                                    </div>
                                </div>
                            </div>
                            {activeContract.project_name && (
                                <div className="mt-3 pt-3 border-t border-slate-600">
                                    <div className="text-sm text-slate-400">Proyecto: <span className="text-slate-200">{activeContract.project_name}</span></div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Estadísticas del mes */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-slate-700/30 border-slate-600">
                        <CardContent className="p-4">
                            <div className="text-sm text-slate-400 mb-1">Días Trabajados</div>
                            <div className="text-2xl font-bold text-emerald-400">{totalDaysWorked}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-700/30 border-slate-600">
                        <CardContent className="p-4">
                            <div className="text-sm text-slate-400 mb-1">Horas Totales</div>
                            <div className="text-2xl font-bold text-blue-400">{totalHoursWorked.toFixed(1)}h</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-700/30 border-slate-600">
                        <CardContent className="p-4">
                            <div className="text-sm text-slate-400 mb-1">Días del Mes</div>
                            <div className="text-2xl font-bold text-slate-200">{daysInMonth}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Calendario */}
                <Card className="bg-slate-700/30 border-slate-600">
                    <CardContent className="p-4">
                        {/* Navegación del mes */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={handlePrevMonth}
                                disabled={monthsWithUnpaidDays.length === 0}
                                className="p-2 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-5 h-5 text-slate-300" />
                            </button>
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-slate-100 capitalize">{monthName}</h3>
                                {monthsWithUnpaidDays.length > 0 && (
                                    <span className="text-xs text-slate-400">
                                        ({monthAttendances.length} días pendientes)
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleNextMonth}
                                disabled={monthsWithUnpaidDays.length === 0}
                                className="p-2 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-5 h-5 text-slate-300" />
                            </button>
                        </div>

                        {monthsWithUnpaidDays.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <p>No hay días pendientes de pago para este trabajador</p>
                            </div>
                        )}

                        {/* Días de la semana */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {daysOfWeek.map(day => (
                                <div key={day} className="text-center text-xs font-semibold text-slate-400 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Días del mes */}
                        <div className="grid grid-cols-7 gap-1">
                            {/* Días vacíos al inicio */}
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <div key={`empty-${i}`} className="h-10" />
                            ))}

                            {/* Días del mes */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1
                                const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                const attendance = monthAttendances.find(a => a.attendance_date === dateStr)

                                // Verificar si tenía contrato activo ese día
                                const hadContract = activeContract ? (() => {
                                    const startDate = new Date(activeContract.fecha_inicio)
                                    const endDate = activeContract.fecha_termino ? new Date(activeContract.fecha_termino) : new Date('2099-12-31')
                                    const checkDate = new Date(dateStr)
                                    return checkDate >= startDate && checkDate <= endDate
                                })() : false

                                // Calcular el día de la semana correctamente (0 = domingo, 6 = sábado)
                                const dayOfWeek = new Date(selectedYear, selectedMonth - 1, day).getDay()
                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 // Domingo o Sábado
                                const isToday = dateStr === new Date().toISOString().split('T')[0]

                                return (
                                    <div
                                        key={day}
                                        className={`h-10 w-full flex items-center justify-center text-xs rounded relative ${!hadContract
                                                ? 'bg-slate-800 text-slate-600'
                                                : isWeekend
                                                    ? 'bg-slate-700/30'
                                                    : attendance?.is_present
                                                        ? (attendance.late_arrival && attendance.early_departure)
                                                            ? 'bg-orange-900/30 border border-orange-600 text-orange-300'
                                                            : attendance.late_arrival
                                                                ? 'bg-amber-900/30 border border-amber-600 text-amber-300'
                                                                : attendance.early_departure
                                                                    ? 'bg-yellow-900/30 border border-yellow-600 text-yellow-300'
                                                                    : attendance.is_overtime
                                                                        ? 'bg-blue-900/30 border border-blue-600 text-blue-300'
                                                                        : 'bg-emerald-900/30 border border-emerald-600 text-emerald-300'
                                                        : attendance
                                                            ? 'bg-red-900/20 border border-red-600/50 text-red-400'
                                                            : 'bg-slate-800/50'
                                            } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                                        title={
                                            !hadContract
                                                ? 'Sin contrato'
                                                : attendance?.is_present
                                                    ? `Presente: ${attendance.hours_worked?.toFixed(1)}h${attendance.late_arrival ? ' - Llegó tarde' : ''}${attendance.early_departure ? ' - Salió temprano' : ''}${attendance.is_overtime ? ' - Horas extras' : ''}${attendance.payment_percentage && attendance.payment_percentage < 100 ? ` - Pago: ${attendance.payment_percentage}%` : ''}`
                                                    : attendance
                                                        ? 'Ausente'
                                                        : 'Sin registro'
                                        }
                                    >
                                        <span className="font-medium">{day}</span>
                                        {attendance?.is_present && (
                                            <span className="absolute top-0 right-0 text-[8px]">
                                                {(attendance.late_arrival && attendance.early_departure) ? '⚠️⚠️' :
                                                    attendance.late_arrival ? '⏰' :
                                                        attendance.early_departure ? '⚠️' :
                                                            attendance.is_overtime ? '⏰' : '✓'}
                                            </span>
                                        )}
                                        {attendance?.payment_percentage && attendance.payment_percentage < 100 && (
                                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-500 rounded-b" title={`Pago parcial: ${attendance.payment_percentage}%`}></span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Leyenda */}
                        <div className="flex items-center gap-4 mt-4 text-xs text-slate-400 flex-wrap">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-emerald-900/30 border border-emerald-600"></div>
                                <span>Presente</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-amber-900/30 border border-amber-600"></div>
                                <span>Llegada tardía</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-yellow-900/30 border border-yellow-600"></div>
                                <span>Salida temprana</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-orange-900/30 border border-orange-600"></div>
                                <span>Llegada tardía y salida temprana</span>
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
                    </CardContent>
                </Card>
            </div>
        </Modal>
    )
}
