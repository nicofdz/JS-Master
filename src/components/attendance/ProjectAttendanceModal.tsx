'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Check, X, Calendar, Clock, Search } from 'lucide-react'
import { useAttendance } from '@/hooks/useAttendance'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Worker {
    id: number
    full_name: string
    rut: string
}

import { type Contract } from '@/hooks/useContracts'

interface ProjectAttendanceModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: number
    projectName: string
    contracts: Contract[]
    workers: Worker[]
    today: string
    onWorkersChanged?: (changedToAbsent: number[]) => void
    onAttendanceSaved?: () => void
}

interface WorkerAttendanceState {
    isPresent: boolean
    checkInTime: string
    checkOutTime: string
    notes: string
    departureReason: string
    arrivalReason: string
}



export function ProjectAttendanceModal({
    isOpen,
    onClose,
    projectId,
    projectName,
    contracts,
    workers,
    today,
    onWorkersChanged,
    onAttendanceSaved
}: ProjectAttendanceModalProps) {
    const { markAttendance } = useAttendance()
    const { user } = useAuth()
    const [workerStates, setWorkerStates] = useState<Record<number, WorkerAttendanceState>>({})
    const [originalStates, setOriginalStates] = useState<Record<number, WorkerAttendanceState>>({})
    const [existingAttendances, setExistingAttendances] = useState<Record<number, any>>({})
    const [saving, setSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

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

    // Cargar asistencias existentes y inicializar estados
    useEffect(() => {
        if (isOpen && contracts.length > 0) {
            const loadExistingAttendances = async () => {
                try {
                    // Cargar asistencias del día para estos contratos
                    const contractIds = contracts.map(c => c.id)
                    if (contractIds.length === 0) return

                    const { data: attendances, error } = await supabase
                        .from('worker_attendance')
                        .select('*')
                        .eq('attendance_date', today)
                        .in('contract_id', contractIds)

                    if (error) {
                        console.error('Error loading attendances:', error)
                        return
                    }

                    // Crear un mapa de asistencias por contract_id
                    const attendanceMap: Record<number, any> = {}
                    if (attendances) {
                        attendances.forEach(att => {
                            if (att.contract_id) {
                                attendanceMap[att.contract_id] = att
                            }
                        })
                    }
                    setExistingAttendances(attendanceMap)

                    // Inicializar estados con datos existentes o valores por defecto
                    const initialState: Record<number, WorkerAttendanceState> = {}
                    const originalState: Record<number, WorkerAttendanceState> = {}

                    contracts.forEach(contract => {
                        const existing = attendanceMap[contract.id]

                        if (existing) {
                            // Hay datos existentes
                            // Extraer hora directamente del timestamp sin conversión de zona horaria
                            const checkInTime = extractTimeFromTimestamp(existing.check_in_time)
                            const checkOutTime = extractTimeFromTimestamp(existing.check_out_time)

                            const state: WorkerAttendanceState = {
                                isPresent: existing.is_present || false,
                                checkInTime,
                                checkOutTime,
                                notes: existing.notes || '',
                                departureReason: existing.departure_reason || '',
                                arrivalReason: existing.arrival_reason || ''
                            }

                            initialState[contract.id] = state
                            originalState[contract.id] = { ...state }
                        } else {
                            // No hay datos, valores por defecto
                            const defaultState: WorkerAttendanceState = {
                                isPresent: false,
                                checkInTime: '08:00',
                                checkOutTime: '18:00',
                                notes: '',
                                departureReason: '',
                                arrivalReason: ''
                            }
                            initialState[contract.id] = defaultState
                            originalState[contract.id] = { ...defaultState }
                        }
                    })

                    setWorkerStates(initialState)
                    setOriginalStates(originalState)
                } catch (error) {
                    console.error('Error loading attendances:', error)
                }
            }

            loadExistingAttendances()
        }
    }, [isOpen, contracts, today, projectId])

    const handleTogglePresence = (contractId: number) => {
        setWorkerStates(prev => ({
            ...prev,
            [contractId]: {
                ...prev[contractId],
                isPresent: !prev[contractId].isPresent
            }
        }))
    }

    const handleFieldChange = (contractId: number, field: keyof WorkerAttendanceState, value: string) => {
        setWorkerStates(prev => ({
            ...prev,
            [contractId]: {
                ...prev[contractId],
                [field]: value
            }
        }))
    }

    const calculateHoursWorked = (checkIn: string, checkOut: string): number => {
        const [inHours, inMinutes] = checkIn.split(':').map(Number)
        const [outHours, outMinutes] = checkOut.split(':').map(Number)

        const inTotalMinutes = inHours * 60 + inMinutes
        const outTotalMinutes = outHours * 60 + outMinutes

        let diffMinutes = outTotalMinutes - inTotalMinutes

        // Restar 1 hora de almuerzo (13:00-14:00) si trabajó durante ese periodo
        const lunchStart = 13 * 60
        const lunchEnd = 14 * 60

        if (inTotalMinutes < lunchEnd && outTotalMinutes > lunchStart) {
            diffMinutes -= 60
        }

        return Math.round((diffMinutes / 60) * 100) / 100
    }

    // Detectar si hay cambios en un contrato específico
    const hasChanges = (contractId: number): boolean => {
        const current = workerStates[contractId]
        const original = originalStates[contractId]
        const hasExisting = !!existingAttendances[contractId]

        // Solo mostrar botón si hay datos existentes y hay cambios
        if (!hasExisting || !current || !original) return false

        return (
            current.isPresent !== original.isPresent ||
            current.checkInTime !== original.checkInTime ||
            current.checkOutTime !== original.checkOutTime ||
            current.notes !== original.notes ||
            current.departureReason !== original.departureReason ||
            current.arrivalReason !== original.arrivalReason
        )
    }

    // Actualizar asistencia de un trabajador específico
    const handleUpdateAttendance = async (contractId: number) => {
        const state = workerStates[contractId]
        const contract = contracts.find(c => c.id === contractId)
        if (!state || !contract) return

        // Validaciones
        if (state.isPresent) {
            if (state.checkOutTime < state.checkInTime) {
                const workerName = workers.find(w => w.id === contract.worker_id)?.full_name || 'Trabajador'
                toast.error(`La hora de salida no puede ser menor que la hora de entrada para ${workerName}`)
                return
            }

            const isLateArrival = state.checkInTime > '08:00'
            if (isLateArrival && !state.arrivalReason.trim()) {
                const workerName = workers.find(w => w.id === contract.worker_id)?.full_name || 'Trabajador'
                toast.error(`Debe ingresar una razón para la llegada tardía de ${workerName}`)
                return
            }

            const isEarlyDeparture = state.checkOutTime < '18:00'
            if (isEarlyDeparture && !state.departureReason.trim()) {
                const workerName = workers.find(w => w.id === contract.worker_id)?.full_name || 'Trabajador'
                toast.error(`Debe ingresar una razón para la salida temprana de ${workerName}`)
                return
            }
        }

        try {
            setSaving(true)

            const checkInTimestamp = state.isPresent ? `${today}T${state.checkInTime}:00` : undefined
            const checkOutTimestamp = state.isPresent ? `${today}T${state.checkOutTime}:00` : null

            let hoursWorked = null
            let isOvertime = false
            let overtimeHours = null

            if (state.isPresent) {
                hoursWorked = calculateHoursWorked(state.checkInTime, state.checkOutTime)
                isOvertime = hoursWorked > 9
                overtimeHours = isOvertime ? Math.round((hoursWorked - 9) * 100) / 100 : null
            }

            await markAttendance({
                worker_id: contract.worker_id,
                project_id: contract.project_id,
                contract_id: contractId,
                attendance_date: today,
                is_present: state.isPresent,
                notes: state.notes || undefined,
                check_in_time: checkInTimestamp,
                check_out_time: checkOutTimestamp,
                hours_worked: hoursWorked,
                is_overtime: isOvertime,
                overtime_hours: overtimeHours,
                early_departure: state.isPresent && state.checkOutTime < '18:00',
                departure_reason: (state.isPresent && state.checkOutTime < '18:00') ? state.departureReason : undefined,
                late_arrival: state.isPresent && state.checkInTime > '08:00',
                arrival_reason: (state.isPresent && state.checkInTime > '08:00') ? state.arrivalReason : undefined,
                created_by: user?.id || undefined
            })

            // Actualizar estado original después de guardar
            setOriginalStates(prev => ({
                ...prev,
                [contractId]: { ...state }
            }))

            // Recargar asistencias
            const { data: attendances } = await supabase
                .from('worker_attendance')
                .select('*')
                .eq('attendance_date', today)
                .in('contract_id', contracts.map(c => c.id))

            if (attendances) {
                const attendanceMap: Record<number, any> = {}
                attendances.forEach(att => {
                    if (att.contract_id) {
                        attendanceMap[att.contract_id] = att
                    }
                })
                setExistingAttendances(attendanceMap)
            }

            // No mostrar toast individual, se mostrará uno al final
        } catch (error) {
            console.error('Error updating attendance:', error)
            toast.error('Error al actualizar asistencia')
        } finally {
            setSaving(false)
            if (onAttendanceSaved) onAttendanceSaved()
        }
    }

    const handleSaveAll = async () => {
        // Validaciones
        for (const contract of contracts) {
            const state = workerStates[contract.id]
            if (!state) continue

            if (state.isPresent) {
                if (state.checkOutTime < state.checkInTime) {
                    const workerName = workers.find(w => w.id === contract.worker_id)?.full_name || 'Trabajador'
                    toast.error(`La hora de salida no puede ser menor que la hora de entrada para ${workerName}`)
                    return
                }

                const isLateArrival = state.checkInTime > '08:00'
                if (isLateArrival && !state.arrivalReason.trim()) {
                    const workerName = workers.find(w => w.id === contract.worker_id)?.full_name || 'Trabajador'
                    toast.error(`Debe ingresar una razón para la llegada tardía de ${workerName}`)
                    return
                }

                const isEarlyDeparture = state.checkOutTime < '18:00'
                if (isEarlyDeparture && !state.departureReason.trim()) {
                    const workerName = workers.find(w => w.id === contract.worker_id)?.full_name || 'Trabajador'
                    toast.error(`Debe ingresar una razón para la salida temprana de ${workerName}`)
                    return
                }
            }
        }

        try {
            setSaving(true)

            // Detectar trabajadores que cambiaron de presente a ausente ANTES de guardar
            const changedToAbsentBeforeSave: number[] = []
            contracts.forEach(contract => {
                const state = workerStates[contract.id]
                const existing = existingAttendances[contract.id]

                // Solo si estaba presente originalmente y ahora está ausente
                if (existing && existing.is_present && state && !state.isPresent) {
                    changedToAbsentBeforeSave.push(contract.id)
                }
            })

            // Guardar todas las asistencias (solo las que no están registradas o han cambiado)
            let savedCount = 0
            const savedContractIds = new Set<number>()

            for (const contract of contracts) {
                const state = workerStates[contract.id]
                if (!state) continue

                // Solo guardar si no existe o si hay cambios
                const hasExisting = !!existingAttendances[contract.id]
                const hasChanged = hasChanges(contract.id)

                if (!hasExisting || hasChanged) {
                    const checkInTimestamp = state.isPresent ? `${today}T${state.checkInTime}:00` : undefined
                    const checkOutTimestamp = state.isPresent ? `${today}T${state.checkOutTime}:00` : null

                    let hoursWorked = null
                    let isOvertime = false
                    let overtimeHours = null

                    if (state.isPresent) {
                        hoursWorked = calculateHoursWorked(state.checkInTime, state.checkOutTime)
                        isOvertime = hoursWorked > 9
                        overtimeHours = isOvertime ? Math.round((hoursWorked - 9) * 100) / 100 : null
                    }

                    await markAttendance({
                        worker_id: contract.worker_id,
                        project_id: contract.project_id,
                        contract_id: contract.id,
                        attendance_date: today,
                        is_present: state.isPresent,
                        notes: state.notes || undefined,
                        check_in_time: checkInTimestamp,
                        check_out_time: checkOutTimestamp,
                        hours_worked: hoursWorked,
                        is_overtime: isOvertime,
                        overtime_hours: overtimeHours,
                        early_departure: state.isPresent && state.checkOutTime < '18:00',
                        departure_reason: (state.isPresent && state.checkOutTime < '18:00') ? state.departureReason : undefined,
                        late_arrival: state.isPresent && state.checkInTime > '08:00',
                        arrival_reason: (state.isPresent && state.checkInTime > '08:00') ? state.arrivalReason : undefined,
                        created_by: user?.id || undefined
                    }, { skipToast: true })
                    savedCount++
                    savedContractIds.add(contract.id)
                }
            }

            // Filtrar: solo los que cambiaron a ausente pero NO se guardaron
            const changedToAbsent = changedToAbsentBeforeSave.filter(contractId => !savedContractIds.has(contractId))

            if (onWorkersChanged && changedToAbsent.length > 0) {
                onWorkersChanged(changedToAbsent)
            }

            if (onAttendanceSaved && savedCount > 0) {
                onAttendanceSaved()
            }

            toast.success(`Asistencia ${savedCount > 0 ? 'registrada/actualizada' : 'sin cambios'} para ${savedCount} trabajador(es)`)
            onClose()
        } catch (error) {
            console.error('Error saving attendance:', error)
            toast.error('Error al registrar asistencia')
        } finally {
            setSaving(false)
        }
    }

    // Detectar cambios no guardados cuando se cierra el modal sin guardar
    const handleClose = () => {
        // Detectar trabajadores que cambiaron de presente a ausente pero NO se guardaron
        const changedToAbsent: number[] = []
        contracts.forEach(contract => {
            const state = workerStates[contract.id]
            const existing = existingAttendances[contract.id]

            // Solo si estaba presente originalmente y ahora está ausente
            if (existing && existing.is_present && state && !state.isPresent) {
                // Verificar si este trabajador tiene cambios no guardados
                const hasChanged = hasChanges(contract.id)
                // Si tiene cambios pero no se guardó, agregarlo
                if (hasChanged) {
                    changedToAbsent.push(contract.id)
                }
            }
        })

        if (onWorkersChanged && changedToAbsent.length > 0) {
            onWorkersChanged(changedToAbsent)
        }

        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={`Registrar Asistencia - ${projectName}`}
            size="xl"
        >
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-slate-400">
                        Fecha: {new Date(today + 'T00:00:00').toLocaleDateString('es-CL', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                    <button
                        onClick={() => {
                            const newStates: Record<number, WorkerAttendanceState> = {}
                            contracts.forEach(contract => {
                                newStates[contract.id] = {
                                    ...workerStates[contract.id],
                                    isPresent: true
                                }
                            })
                            setWorkerStates(newStates)
                            toast.success('Todos los trabajadores marcados como presentes')
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
                        title="Marcar todos como presentes"
                    >
                        <Check className="w-4 h-4" />
                        Marcar a Todos
                    </button>
                </div>

                {/* Búsqueda de trabajador */}
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar trabajador por nombre o RUT..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    {contracts.filter(contract => {
                        if (!searchQuery.trim()) return true
                        const worker = workers.find(w => w.id === contract.worker_id)
                        if (!worker) return false
                        const query = searchQuery.toLowerCase()
                        return (
                            worker.full_name.toLowerCase().includes(query) ||
                            worker.rut.toLowerCase().includes(query)
                        )
                    }).map(contract => {
                        const worker = workers.find(w => w.id === contract.worker_id)
                        const state = workerStates[contract.id]
                        if (!state || !worker) return null

                        const isLateArrival = state.isPresent && state.checkInTime > '08:00'
                        const isEarlyDeparture = state.isPresent && state.checkOutTime < '18:00'
                        const hasExistingRecord = !!existingAttendances[contract.id]
                        const wasPresent = hasExistingRecord && existingAttendances[contract.id]?.is_present

                        return (
                            <div
                                key={contract.id}
                                className={`p-4 rounded-lg border-2 transition-colors ${state.isPresent
                                    ? 'bg-emerald-900/20 border-emerald-500'
                                    : 'bg-red-900/20 border-red-500'
                                    }`}
                            >
                                {/* Header del trabajador */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <button
                                            onClick={() => handleTogglePresence(contract.id)}
                                            className={`flex-shrink-0 w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${state.isPresent
                                                ? 'bg-emerald-600 border-emerald-500'
                                                : 'bg-slate-700 border-slate-500 hover:border-slate-400'
                                                }`}
                                        >
                                            {state.isPresent && <Check className="w-6 h-6 text-white" />}
                                        </button>
                                        <div>
                                            <p className="font-medium text-slate-100">{worker.full_name}</p>
                                            <p className="text-sm text-slate-400">{worker.rut}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-14 sm:ml-0">
                                        <span className={`px-2 py-1 rounded text-xs ${contract.contract_type === 'por_dia'
                                            ? 'bg-purple-900/30 text-purple-400'
                                            : 'bg-orange-900/30 text-orange-400'
                                            }`}>
                                            {contract.contract_type === 'por_dia' ? 'Por Día' : 'A Trato'}
                                        </span>
                                        <span className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">
                                            {contract.contract_number}
                                        </span>
                                    </div>
                                </div>

                                {/* Formulario (solo si está presente) */}
                                {state.isPresent && (
                                    <div className="ml-0 sm:ml-14 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
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
                                                placeholder="Ej: Observaciones adicionales..."
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        {/* Alertas de llegada tardía y/o salida temprana */}
                                        {(isLateArrival || isEarlyDeparture) && (
                                            <div className="space-y-3">
                                                {/* Mensaje informativo si ambos casos ocurren */}
                                                {isLateArrival && isEarlyDeparture && (
                                                    <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-2">
                                                        <p className="text-xs text-orange-300 font-medium">
                                                            ⚠️ El trabajador llegó tarde y salió temprano. Se requiere motivo para ambos casos.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Razón de llegada tardía */}
                                                {isLateArrival && (
                                                    <div className="bg-yellow-900/10 border border-yellow-900/30 rounded-lg p-3">
                                                        <label className="block text-xs font-medium text-yellow-400 mb-2">
                                                            ⚠️ Razón de Llegada Tardía (Requerido)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={state.arrivalReason}
                                                            onChange={(e) => handleFieldChange(contract.id, 'arrivalReason', e.target.value)}
                                                            placeholder="Ej: Tráfico, problemas de transporte..."
                                                            className="w-full px-3 py-2 bg-slate-800 border border-yellow-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-slate-500"
                                                        />
                                                    </div>
                                                )}

                                                {/* Razón de salida temprana */}
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
                                            </div>
                                        )}

                                        {/* Botones de acción */}
                                        <div className="ml-14 mt-3 flex justify-end gap-2">
                                            {/* Botón actualizar (solo si hay datos existentes y cambios) */}
                                            {hasChanges(contract.id) && (
                                                <button
                                                    onClick={() => handleUpdateAttendance(contract.id)}
                                                    disabled={saving}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center gap-2 text-sm"
                                                >
                                                    {saving ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                            Actualizando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check className="w-4 h-4" />
                                                            Actualizar
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Botón actualizar a ausente (solo si estaba presente y ahora está ausente) */}
                                {!state.isPresent && wasPresent && (
                                    <div className="ml-14 mt-3 flex justify-end">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    setSaving(true)
                                                    const checkInTimestamp = undefined
                                                    const checkOutTimestamp = null

                                                    await markAttendance({
                                                        worker_id: contract.worker_id,
                                                        project_id: contract.project_id,
                                                        contract_id: contract.id,
                                                        attendance_date: today,
                                                        is_present: false,
                                                        notes: undefined,
                                                        check_in_time: checkInTimestamp,
                                                        check_out_time: checkOutTimestamp,
                                                        hours_worked: null,
                                                        is_overtime: false,
                                                        overtime_hours: null,
                                                        early_departure: false,
                                                        departure_reason: undefined,
                                                        late_arrival: false,
                                                        arrival_reason: undefined,
                                                        created_by: user?.id || undefined
                                                    })

                                                    // Actualizar estado original
                                                    setOriginalStates(prev => ({
                                                        ...prev,
                                                        [contract.id]: {
                                                            ...state,
                                                            isPresent: false
                                                        }
                                                    }))

                                                    // Recargar asistencias
                                                    const { data: attendances } = await supabase
                                                        .from('worker_attendance')
                                                        .select('*')
                                                        .eq('attendance_date', today)
                                                        .in('contract_id', contracts.map(c => c.id))

                                                    if (attendances) {
                                                        const attendanceMap: Record<number, any> = {}
                                                        attendances.forEach(att => {
                                                            if (att.contract_id) {
                                                                attendanceMap[att.contract_id] = att
                                                            }
                                                        })
                                                        setExistingAttendances(attendanceMap)
                                                    }

                                                    toast.success(`${worker?.full_name || 'Trabajador'} actualizado a ausente`)
                                                } catch (error) {
                                                    console.error('Error updating to absent:', error)
                                                    toast.error('Error al actualizar a ausente')
                                                } finally {
                                                    setSaving(false)
                                                }
                                            }}
                                            disabled={saving}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center gap-2 text-sm"
                                        >
                                            {saving ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                    Actualizando...
                                                </>
                                            ) : (
                                                <>
                                                    <X className="w-4 h-4" />
                                                    Actualizar a Ausente
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Botón guardar (solo para nuevos registros) */}
                <div className="flex justify-end pt-4 border-t border-slate-700">
                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Calendar className="w-4 h-4" />
                                Registrar Asistencia
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
