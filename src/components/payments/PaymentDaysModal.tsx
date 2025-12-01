'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface AttendanceDay {
    id: number
    attendance_date: string
    project_name: string
    is_present: boolean
    hours_worked?: number
    payment_percentage?: number
}

interface PaymentDaysModalProps {
    isOpen: boolean
    onClose: () => void
    paymentId: number
    workerId: number
    workerName: string
    paymentDate: string
    paymentMonth: number
    paymentYear: number
    totalAmount: number
    daysCount: number
    dailyRate: number
    startDate?: string
    endDate?: string
    projectId?: number | null
}

export function PaymentDaysModal({
    isOpen,
    onClose,
    paymentId,
    workerId,
    workerName,
    paymentDate,
    paymentMonth,
    paymentYear,
    totalAmount,
    daysCount,
    dailyRate,
    startDate,
    endDate,
    projectId
}: PaymentDaysModalProps) {
    const [days, setDays] = useState<AttendanceDay[]>([])
    const [loading, setLoading] = useState(false)
    const [currentMonth, setCurrentMonth] = useState<{ year: number; month: number } | null>(null)

    useEffect(() => {
        if (isOpen && workerId) {
            // Inicializar mes actual
            if (paymentMonth && paymentYear) {
                setCurrentMonth({ year: paymentYear, month: paymentMonth })
            }
            loadDays()
        }
    }, [isOpen, workerId, paymentId, startDate, endDate, projectId])

    const loadDays = async () => {
        setLoading(true)
        try {
            // Construir query base común
            const baseQuery = (q: any) => {
                let query = q
                    .from('worker_attendance')
                    .select(`
            id,
            attendance_date,
            is_present,
            hours_worked,
            payment_percentage,
            project_id,
            payment_history_id,
            projects(id, name)
          `)
                    .eq('worker_id', workerId)
                    .eq('is_present', true)
                    .eq('is_paid', true)  // ✅ Solo días PAGADOS (al revés del WorkerAttendanceModal)
                    .order('attendance_date', { ascending: true })

                // Filtrar por proyecto si está disponible
                if (projectId) {
                    query = query.eq('project_id', projectId)
                }

                return query
            }

            // MÉTODO 1: Intentar filtrar por payment_history_id (más preciso)
            let query = baseQuery(supabase).eq('payment_history_id', paymentId)
            let { data: attendanceData, error: attendanceError } = await query

            // MÉTODO 2: Si no hay resultados con payment_history_id, usar rango de fechas (fallback)
            if (!attendanceData || attendanceData.length === 0) {
                query = baseQuery(supabase)

                if (startDate && endDate) {
                    query = query.gte('attendance_date', startDate)
                    query = query.lte('attendance_date', endDate)
                } else if (paymentMonth && paymentYear) {
                    const queryStartDate = `${paymentYear}-${String(paymentMonth).padStart(2, '0')}-01`
                    const queryEndDate = paymentMonth === 12
                        ? `${paymentYear + 1}-01-01`
                        : `${paymentYear}-${String(paymentMonth + 1).padStart(2, '0')}-01`
                    query = query.gte('attendance_date', queryStartDate)
                    query = query.lt('attendance_date', queryEndDate)
                } else {
                    throw new Error('No se pudo determinar el rango de fechas del pago')
                }

                const result = await query
                attendanceData = result.data
                attendanceError = result.error
            }

            if (attendanceError) throw attendanceError

            const daysData: AttendanceDay[] = (attendanceData || []).map((att: any) => ({
                id: att.id,
                attendance_date: att.attendance_date,
                project_name: att.projects?.name || 'N/A',
                is_present: att.is_present,
                hours_worked: att.hours_worked,
                payment_percentage: att.payment_percentage || 100
            }))

            setDays(daysData)
        } catch (err: any) {
            console.error('Error cargando días del pago:', err)
            setDays([])
        } finally {
            setLoading(false)
        }
    }

    // Calcular qué meses abarca el pago
    const paymentMonths = useMemo(() => {
        if (days.length === 0) return []

        const monthsSet = new Set<string>()
        days.forEach(day => {
            // Parsear fecha directamente del string YYYY-MM-DD
            const dateStr = day.attendance_date.split('T')[0]
            const [year, month] = dateStr.split('-').map(Number)
            const monthKey = `${year}-${month}`
            monthsSet.add(monthKey)
        })

        return Array.from(monthsSet)
            .map(key => {
                const [year, month] = key.split('-').map(Number)
                return { year, month }
            })
            .sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year
                return a.month - b.month
            })
    }, [days])

    // Inicializar mes actual al primer mes del pago
    useEffect(() => {
        if (paymentMonths.length > 0 && !currentMonth) {
            setCurrentMonth(paymentMonths[0])
        }
    }, [paymentMonths, currentMonth])

    // Crear un mapa de días asistidos para fácil búsqueda por fecha completa
    const attendanceMap = useMemo(() => {
        const map = new Map<string, AttendanceDay>()
        days.forEach(day => {
            // Parsear fecha directamente del string YYYY-MM-DD para evitar problemas de zona horaria
            // attendance_date viene como "2025-11-02" desde la BD
            const dateKey = day.attendance_date.split('T')[0] // Tomar solo la parte de fecha, ignorar hora si existe
            map.set(dateKey, day)
        })
        return map
    }, [days])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    // Calcular rango REAL de fechas de los días pagados
    const paymentDateRange = useMemo(() => {
        if (days.length === 0) return null

        // Obtener el primer y último día pagado directamente de los strings de fecha
        // Para evitar problemas de zona horaria, trabajar con strings YYYY-MM-DD
        const dateStrings = days.map(d => d.attendance_date.split('T')[0]).sort()
        const firstPaidDate = dateStrings[0]
        const lastPaidDate = dateStrings[dateStrings.length - 1]

        return {
            start: firstPaidDate,
            end: lastPaidDate,
            formatted: `${formatDate(firstPaidDate)} - ${formatDate(lastPaidDate)}`
        }
    }, [days])

    // Funciones de navegación
    const handlePrevMonth = () => {
        if (!currentMonth) return
        const currentIndex = paymentMonths.findIndex(
            m => m.year === currentMonth.year && m.month === currentMonth.month
        )
        if (currentIndex > 0) {
            setCurrentMonth(paymentMonths[currentIndex - 1])
        }
    }

    const handleNextMonth = () => {
        if (!currentMonth) return
        const currentIndex = paymentMonths.findIndex(
            m => m.year === currentMonth.year && m.month === currentMonth.month
        )
        if (currentIndex < paymentMonths.length - 1) {
            setCurrentMonth(paymentMonths[currentIndex + 1])
        }
    }

    const canGoPrev = currentMonth && paymentMonths.length > 0 &&
        paymentMonths.findIndex(m => m.year === currentMonth.year && m.month === currentMonth.month) > 0

    const canGoNext = currentMonth && paymentMonths.length > 0 &&
        paymentMonths.findIndex(m => m.year === currentMonth.year && m.month === currentMonth.month) < paymentMonths.length - 1

    const getMonthName = (year?: number, month?: number) => {
        const displayYear = year || currentMonth?.year || paymentYear
        const displayMonth = month || currentMonth?.month || paymentMonth
        const date = new Date(displayYear, displayMonth - 1, 1)
        return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    }

    // Generar días del mes
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month, 0).getDate()
    }

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month - 1, 1).getDay()
    }

    const displayYear = currentMonth?.year || paymentYear
    const displayMonth = currentMonth?.month || paymentMonth
    const daysInMonth = getDaysInMonth(displayYear, displayMonth)
    const firstDay = getFirstDayOfMonth(displayYear, displayMonth)
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

    // Generar array de días del mes
    const calendarDays = useMemo(() => {
        const daysArray: (number | null)[] = []

        // Agregar días vacíos al inicio
        for (let i = 0; i < firstDay; i++) {
            daysArray.push(null)
        }

        // Agregar días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            daysArray.push(day)
        }

        return daysArray
    }, [firstDay, daysInMonth, displayYear, displayMonth])

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Días de Asistencia del Pago - ${workerName}`}
            size="xl"
        >
            <div className="space-y-4">
                {/* Resumen del pago */}
                <Card className="bg-slate-700/30 border-slate-600">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Período del Pago</div>
                                <div className="text-lg font-semibold text-slate-100 capitalize">{getMonthName()}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Días Trabajados Pagados</div>
                                <div className="text-lg font-semibold text-slate-100">{daysCount} días</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Tarifa Diaria</div>
                                <div className="text-lg font-semibold text-slate-100">{formatCurrency(dailyRate)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Monto Total Pagado</div>
                                <div className="text-xl font-bold text-blue-400">{formatCurrency(totalAmount)}</div>
                            </div>
                            {paymentDateRange && (
                                <div>
                                    <div className="text-sm text-slate-400 mb-1">Rango de Fechas del Pago</div>
                                    <div className="text-base font-semibold text-slate-200">{paymentDateRange.formatted}</div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Calendario */}
                <Card className="bg-slate-700/30 border-slate-600">
                    <CardContent className="p-3">
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                                <button
                                    onClick={handlePrevMonth}
                                    disabled={!canGoPrev}
                                    className={`p-1.5 rounded-lg transition-colors ${canGoPrev
                                        ? 'hover:bg-slate-600 text-slate-300'
                                        : 'text-slate-600 cursor-not-allowed'
                                        }`}
                                    title="Mes anterior"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h3 className="text-base font-semibold text-slate-100 capitalize">
                                    {getMonthName()}
                                </h3>
                                <button
                                    onClick={handleNextMonth}
                                    disabled={!canGoNext}
                                    className={`p-1.5 rounded-lg transition-colors ${canGoNext
                                        ? 'hover:bg-slate-600 text-slate-300'
                                        : 'text-slate-600 cursor-not-allowed'
                                        }`}
                                    title="Mes siguiente"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-xs text-slate-400">
                                {paymentMonths.length > 1
                                    ? `Navegando ${paymentMonths.findIndex(m => m.year === displayYear && m.month === displayMonth) + 1} de ${paymentMonths.length} meses del pago`
                                    : 'Días marcados fueron trabajados y pagados en este período'}
                            </p>
                        </div>

                        {loading ? (
                            <div className="text-center py-6">
                                <p className="text-slate-400 text-sm">Cargando calendario...</p>
                            </div>
                        ) : (
                            <div className="calendar">
                                {/* Encabezados de días de la semana */}
                                <div className="grid grid-cols-7 gap-0.5 mb-1">
                                    {daysOfWeek.map(day => (
                                        <div key={day} className="text-center text-xs font-semibold text-slate-400 py-1">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Días del mes */}
                                <div className="grid grid-cols-7 gap-0.5">
                                    {calendarDays.map((day, index) => {
                                        if (day === null) {
                                            return <div key={`empty-${index}`} className="h-8" />
                                        }

                                        // Construir fecha completa YYYY-MM-DD para buscar en el mapa
                                        const dateKey = `${displayYear}-${String(displayMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                        const attendance = attendanceMap.get(dateKey)
                                        const isWorked = !!attendance
                                        const percentage = attendance?.payment_percentage || 100
                                        const isPartialDay = percentage < 100

                                        return (
                                            <div
                                                key={`day-${day}`}
                                                className={`
                          h-8 rounded border flex items-center justify-center px-1
                          transition-colors relative group
                          ${isWorked
                                                        ? isPartialDay
                                                            ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400'
                                                            : 'bg-green-900/30 border-green-500/50 text-green-400'
                                                        : 'bg-slate-800/50 border-slate-600/50 text-slate-400'
                                                    }
                        `}
                                                title={isWorked ? (isPartialDay ? `${percentage}% de pago` : '100% de pago') : 'Día no pagado en este período'}
                                            >
                                                <div className="flex flex-col items-center gap-0">
                                                    <span className={`text-xs font-medium ${isWorked
                                                        ? isPartialDay ? 'text-yellow-300' : 'text-green-300'
                                                        : 'text-slate-500'
                                                        }`}>
                                                        {day}
                                                    </span>
                                                    {isWorked && (
                                                        isPartialDay ? (
                                                            <span className="text-[8px] font-bold text-yellow-300">
                                                                {percentage}%
                                                            </span>
                                                        ) : (
                                                            <CheckCircle2 className="w-2 h-2 text-green-400" />
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Resumen de estadísticas */}
                {!loading && days.length > 0 && (
                    <Card className="bg-slate-700/30 border-slate-600">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    <div>
                                        <div className="text-sm text-slate-400">Días trabajados</div>
                                        <div className="text-lg font-semibold text-slate-100">{days.length} días</div>
                                    </div>
                                </div>
                                {days.some(d => d.hours_worked) && (
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-blue-400" />
                                        <div>
                                            <div className="text-sm text-slate-400">Total horas</div>
                                            <div className="text-lg font-semibold text-slate-100">
                                                {days.reduce((sum, d) => sum + (d.hours_worked || 0), 0)} hrs
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Modal>
    )
}
