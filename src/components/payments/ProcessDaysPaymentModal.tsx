'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Calendar, CheckCircle2, AlertCircle, DollarSign, Loader2, Percent, Edit2, Save, X, Clock, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface AttendanceDay {
    id: number
    attendance_date: string
    payment_percentage: number
    hours_worked?: number
    late_arrival?: boolean
    early_departure?: boolean
    arrival_reason?: string | null
    departure_reason?: string | null
    is_overtime?: boolean
    overtime_hours?: number | null
}

interface ProcessDaysPaymentModalProps {
    isOpen: boolean
    onClose: () => void
    worker: {
        id: number
        name: string
        rut: string
    }
    project: {
        id: number
        name: string
    }
    dailyRate: number
    onPaymentProcessed: () => void
}

export function ProcessDaysPaymentModal({
    isOpen,
    onClose,
    worker,
    project,
    dailyRate,
    onPaymentProcessed
}: ProcessDaysPaymentModalProps) {
    const [attendanceDays, setAttendanceDays] = useState<AttendanceDay[]>([])
    const [editingPercentage, setEditingPercentage] = useState<number | null>(null)
    const [tempPercentage, setTempPercentage] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [savingPercentage, setSavingPercentage] = useState(false)
    const [notes, setNotes] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    // Cargar días pendientes al abrir el modal
    useEffect(() => {
        if (isOpen) {
            console.log('🔄 Modal abierto:', {
                workerId: worker.id,
                projectId: project.id,
                dailyRate,
                workerName: worker.name
            })

            if (worker.id && project.id) {
                loadPendingDays()
            } else {
                console.warn('⚠️ Faltan datos:', { workerId: worker.id, projectId: project.id })
                toast.error('Faltan datos del trabajador o proyecto')
            }

            // Establecer rango por defecto: primer y último día pendiente
            setStartDate('')
            setEndDate('')
            setNotes('')
        } else if (!isOpen) {
            // Limpiar estado al cerrar
            setAttendanceDays([])
            setStartDate('')
            setEndDate('')
            setNotes('')
        }
    }, [isOpen, worker.id, project.id, dailyRate, worker.name])

    const loadPendingDays = async () => {
        setLoading(true)
        try {
            console.log('📅 Buscando días pendientes:', { workerId: worker.id, projectId: project.id })

            const { data, error } = await supabase
                .from('worker_attendance')
                .select('id, attendance_date, payment_percentage, hours_worked, late_arrival, early_departure, arrival_reason, departure_reason, is_overtime, overtime_hours')
                .eq('worker_id', worker.id)
                .eq('project_id', project.id)
                .eq('is_present', true)
                .eq('is_paid', false)
                .order('attendance_date', { ascending: true })

            if (error) {
                console.error('❌ Error en query:', error)
                throw error
            }

            console.log('✅ Días encontrados:', data?.length || 0, data)
            setAttendanceDays(data || [])

            // Establecer rango por defecto
            if (data && data.length > 0) {
                // Ordenar fechas para asegurar el orden correcto
                const sortedDates = [...data]
                    .map(d => d.attendance_date)
                    .sort((a, b) => {
                        if (a < b) return -1
                        if (a > b) return 1
                        return 0
                    })

                setStartDate(sortedDates[0])
                setEndDate(sortedDates[sortedDates.length - 1])
                console.log('📅 Rango establecido:', { start: sortedDates[0], end: sortedDates[sortedDates.length - 1] })
            } else {
                console.warn('⚠️ No se encontraron días pendientes')
            }
        } catch (err: any) {
            console.error('❌ Error cargando días pendientes:', err)
            toast.error('Error al cargar días pendientes')
            setAttendanceDays([])
        } finally {
            setLoading(false)
        }
    }

    // Calcular rango mínimo y máximo de fechas disponibles
    const dateRange = useMemo(() => {
        if (attendanceDays.length === 0) {
            return { min: '', max: '' }
        }

        // Ordenar fechas como strings (formato YYYY-MM-DD) para evitar problemas de zona horaria
        const dates = attendanceDays
            .map(d => d.attendance_date)
            .sort((a, b) => {
                // Comparar como strings YYYY-MM-DD
                if (a < b) return -1
                if (a > b) return 1
                return 0
            })

        return {
            min: dates[0],
            max: dates[dates.length - 1]
        }
    }, [attendanceDays])

    // Filtrar días en el rango seleccionado
    const filteredDays = useMemo(() => {
        if (!startDate || !endDate) return attendanceDays

        return attendanceDays.filter(day => {
            const dayDate = new Date(day.attendance_date)
            const start = new Date(startDate)
            const end = new Date(endDate)
            return dayDate >= start && dayDate <= end
        })
    }, [attendanceDays, startDate, endDate])

    // Calcular total
    const selectedTotal = useMemo(() => {
        return filteredDays.reduce((sum, day) => {
            const dayAmount = dailyRate * (Number(day.payment_percentage || 100) / 100.0)
            return sum + dayAmount
        }, 0)
    }, [filteredDays, dailyRate])

    const selectedDaysCount = filteredDays.length

    const handleEditPercentage = (dayId: number, currentPercentage: number) => {
        setEditingPercentage(dayId)
        setTempPercentage(currentPercentage.toString())
    }

    const handleCancelEdit = () => {
        setEditingPercentage(null)
        setTempPercentage('')
    }

    const handleSavePercentage = async (dayId: number) => {
        const numPercentage = parseFloat(tempPercentage)

        // Validaciones
        if (isNaN(numPercentage)) {
            toast.error('El porcentaje debe ser un número válido')
            return
        }

        if (numPercentage < 0 || numPercentage > 100) {
            toast.error('El porcentaje debe estar entre 0 y 100')
            return
        }

        try {
            setSavingPercentage(true)
            toast.loading('Guardando porcentaje...', { id: 'saving-percentage' })

            const { error } = await supabase
                .from('worker_attendance')
                .update({ payment_percentage: numPercentage })
                .eq('id', dayId)

            if (error) throw error

            // Actualizar el estado local
            setAttendanceDays(prev => prev.map(day =>
                day.id === dayId
                    ? { ...day, payment_percentage: numPercentage }
                    : day
            ))

            toast.success(`Porcentaje actualizado a ${numPercentage}%`, { id: 'saving-percentage' })
            setEditingPercentage(null)
            setTempPercentage('')
        } catch (err: any) {
            console.error('Error actualizando porcentaje:', err)
            toast.error(err.message || 'Error al actualizar el porcentaje', { id: 'saving-percentage' })
        } finally {
            setSavingPercentage(false)
        }
    }

    const handleProcessPayment = async () => {
        if (filteredDays.length === 0) {
            toast.error('Debe seleccionar al menos un día para pagar')
            return
        }

        if (!startDate || !endDate) {
            toast.error('Debe especificar un rango de fechas')
            return
        }

        if (selectedTotal <= 0) {
            toast.error('El monto total debe ser mayor a 0')
            return
        }

        try {
            setProcessing(true)
            toast.loading('Procesando pago...', { id: 'processing-payment' })

            // Llamar a la función RPC
            const { data: paymentId, error: paymentError } = await supabase.rpc(
                'process_daily_payment',
                {
                    p_worker_id: worker.id,
                    p_project_id: project.id,
                    p_start_date: startDate,
                    p_end_date: endDate,
                    p_daily_rate: dailyRate,
                    p_notes: notes.trim() || null
                }
            )

            if (paymentError) throw paymentError

            toast.success(`Pago procesado exitosamente por ${formatCurrency(selectedTotal)}`, {
                id: 'processing-payment'
            })

            // Cerrar modal y refrescar datos
            onClose()
            onPaymentProcessed()
        } catch (err: any) {
            console.error('Error procesando pago:', err)
            toast.error(err.message || 'Error al procesar el pago', { id: 'processing-payment' })
        } finally {
            setProcessing(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return ''

        // Si la fecha viene en formato YYYY-MM-DD, formatearla directamente sin conversión de zona horaria
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateString.split('-')
            return `${day}/${month}/${year}`
        }

        // Si no, usar el método anterior como fallback
        const date = new Date(dateString)
        return date.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Procesar Pago - ${worker.name}`}
            size="xl"
        >
            <div className="space-y-6">
                {/* Información del trabajador */}
                <Card className="bg-green-900/20 border-green-600/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400 mb-1">Trabajador</p>
                                <p className="font-semibold text-slate-100">{worker.name}</p>
                                <p className="text-sm text-slate-400">{worker.rut}</p>
                                <p className="text-sm text-slate-400 mt-1">Proyecto: {project.name}</p>
                            </div>
                            <Badge className="bg-green-900/30 text-green-400 border-green-500">
                                Por Día
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Rango de fechas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Fecha Inicio
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                const newStart = e.target.value
                                setStartDate(newStart)
                                // Si la fecha fin es anterior a la nueva fecha inicio, ajustarla
                                if (endDate && newStart > endDate) {
                                    setEndDate(newStart)
                                }
                            }}
                            min={dateRange.min}
                            max={dateRange.max}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {dateRange.min && (
                            <p className="text-xs text-slate-500 mt-1">
                                Rango disponible: {formatDate(dateRange.min)} - {formatDate(dateRange.max)}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Fecha Fin
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                const newEnd = e.target.value
                                setEndDate(newEnd)
                                // Si la fecha inicio es posterior a la nueva fecha fin, ajustarla
                                if (startDate && newEnd < startDate) {
                                    setStartDate(newEnd)
                                }
                            }}
                            min={startDate || dateRange.min}
                            max={dateRange.max}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Lista de días */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                        <span className="ml-3 text-slate-400">Cargando días pendientes...</span>
                    </div>
                ) : attendanceDays.length === 0 ? (
                    <Card className="bg-slate-700/30 border-slate-600">
                        <CardContent className="p-8 text-center">
                            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">
                                No hay días pendientes de pago para este trabajador
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Resumen */}
                        <Card className="bg-slate-700/30 border-slate-600">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Días en Rango</p>
                                        <p className="text-2xl font-bold text-slate-200">
                                            {selectedDaysCount} día{selectedDaysCount !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-400 mb-1">Tarifa Diaria</p>
                                        <p className="text-lg font-semibold text-blue-400">
                                            {formatCurrency(dailyRate)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Lista de días */}
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {filteredDays.map(day => {
                                const dayPercentage = Number(day.payment_percentage || 100)
                                const dayAmount = dailyRate * (dayPercentage / 100.0)
                                const isPartialDay = dayPercentage < 100
                                const isEditing = editingPercentage === day.id

                                return (
                                    <Card
                                        key={day.id}
                                        className={`bg-slate-700/30 border-slate-600 ${isPartialDay ? 'border-yellow-500/50' : ''
                                            }`}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                                                <div className="flex items-start gap-3 flex-1 w-full">
                                                    <Calendar className="w-4 h-4 text-green-400 flex-shrink-0 mt-1" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                            <span className="font-semibold text-slate-100">
                                                                {formatDate(day.attendance_date)}
                                                            </span>

                                                            {/* Badge de porcentaje - editable */}
                                                            {isEditing ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            step="0.01"
                                                                            value={tempPercentage}
                                                                            onChange={(e) => setTempPercentage(e.target.value)}
                                                                            disabled={savingPercentage}
                                                                            className="w-20 px-2 py-1 pr-6 bg-slate-800 border border-blue-500 rounded text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                                            autoFocus
                                                                        />
                                                                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs">
                                                                            %
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleSavePercentage(day.id)}
                                                                        disabled={savingPercentage}
                                                                        className="p-1 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
                                                                        title="Guardar"
                                                                    >
                                                                        <Save className="w-4 h-4 text-green-400" />
                                                                    </button>
                                                                    <button
                                                                        onClick={handleCancelEdit}
                                                                        disabled={savingPercentage}
                                                                        className="p-1 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
                                                                        title="Cancelar"
                                                                    >
                                                                        <X className="w-4 h-4 text-red-400" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <Badge className={`text-xs ${isPartialDay
                                                                        ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500'
                                                                        : 'bg-green-900/30 text-green-400 border-green-500'
                                                                        }`}>
                                                                        {dayPercentage}% de pago
                                                                    </Badge>
                                                                    <button
                                                                        onClick={() => handleEditPercentage(day.id, dayPercentage)}
                                                                        className="p-1 hover:bg-slate-600 rounded transition-colors"
                                                                        title="Editar porcentaje"
                                                                    >
                                                                        <Edit2 className="w-3 h-3 text-blue-400" />
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {/* Badges de detalles - solo si existen */}
                                                            {day.late_arrival && (
                                                                <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-500 text-xs">
                                                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                                                    Llegó Tarde
                                                                </Badge>
                                                            )}
                                                            {day.early_departure && (
                                                                <Badge className="bg-orange-900/30 text-orange-400 border-orange-500 text-xs">
                                                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                                                    Salió Temprano
                                                                </Badge>
                                                            )}
                                                            {day.is_overtime && day.overtime_hours && (
                                                                <Badge className="bg-blue-900/30 text-blue-400 border-blue-500 text-xs">
                                                                    <Clock className="w-3 h-3 mr-1" />
                                                                    +{Number(day.overtime_hours).toFixed(1)}h extras
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {/* Información adicional */}
                                                        <div className="space-y-1">
                                                            {day.hours_worked && (
                                                                <p className="text-xs text-slate-400">
                                                                    ⏱️ {Number(day.hours_worked).toFixed(1)} horas trabajadas
                                                                </p>
                                                            )}
                                                            {day.arrival_reason && (
                                                                <p className="text-xs text-yellow-400">
                                                                    📝 Llegada: {day.arrival_reason}
                                                                </p>
                                                            )}
                                                            {day.departure_reason && (
                                                                <p className="text-xs text-orange-400">
                                                                    📝 Salida: {day.departure_reason}
                                                                </p>
                                                            )}
                                                            {isPartialDay && (
                                                                <p className="text-xs text-yellow-400 mt-1">
                                                                    ⚠️ Día parcial - Se pagará {dayPercentage}% del día completo
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-slate-600 pt-2 sm:pt-0">
                                                    <div className="text-sm text-slate-400 mb-1">Monto a Pagar</div>
                                                    <div className={`text-lg font-bold ${isPartialDay ? 'text-yellow-400' : 'text-green-400'}`}>
                                                        {formatCurrency(dayAmount)}
                                                    </div>
                                                    {isPartialDay && (
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            de {formatCurrency(dailyRate)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </>
                )}

                {/* Resumen y notas */}
                {attendanceDays.length > 0 && (
                    <>
                        <Card className="bg-slate-700/30 border-slate-600">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Total a Pagar</p>
                                        <p className="text-2xl font-bold text-blue-400">
                                            {formatCurrency(selectedTotal)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-400 mb-1">Días Seleccionados</p>
                                        <p className="text-2xl font-bold text-slate-200">
                                            {selectedDaysCount}
                                        </p>
                                    </div>
                                </div>

                                {/* Campo de notas */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Notas (opcional)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Agregar notas sobre este pago..."
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        rows={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Botones */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={processing}
                                className="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleProcessPayment}
                                disabled={processing || filteredDays.length === 0 || selectedTotal <= 0}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <DollarSign className="w-4 h-4 mr-2" />
                                        Procesar Pago
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}
