'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Save, Clock, FileText, CheckCircle2, XCircle, DollarSign } from 'lucide-react'
import { useAttendance } from '@/hooks/useAttendance'
import toast from 'react-hot-toast'

interface AttendanceEditModalProps {
    isOpen: boolean
    onClose: () => void
    attendance?: any // Existing attendance record if any
    workerId: number
    contractId: number
    workerName: string
    date: string
    onSave: () => void // Callback to refresh data
    userRole?: string | null
}

export function AttendanceEditModal({
    isOpen,
    onClose,
    attendance,
    workerId,
    contractId,
    workerName,
    date,
    onSave,
    userRole
}: AttendanceEditModalProps) {
    const { markAttendance } = useAttendance()
    const [isSaving, setIsSaving] = useState(false)

    // Form states
    const [isPresent, setIsPresent] = useState(false)
    const [checkInTime, setCheckInTime] = useState('08:00')
    const [checkOutTime, setCheckOutTime] = useState('18:00')
    const [notes, setNotes] = useState('')
    const [isPaid, setIsPaid] = useState(false)

    // Initialize form when opening
    useEffect(() => {
        if (isOpen) {
            if (attendance) {
                setIsPresent(attendance.is_present)
                // Extract time from timestamp
                setCheckInTime(attendance.check_in_time ? extractTime(attendance.check_in_time) : '08:00')
                setCheckOutTime(attendance.check_out_time ? extractTime(attendance.check_out_time) : '18:00')
                setNotes(attendance.notes || '')
                setIsPaid(attendance.is_paid || false)
            } else {
                // Default values for new attendance
                setIsPresent(false)
                setCheckInTime('08:00')
                setCheckOutTime('18:00')
                setNotes('')
                setIsPaid(false)
            }
        }
    }, [isOpen, attendance])

    const extractTime = (timestamp: string) => {
        if (!timestamp) return '08:00'
        if (timestamp.includes('T')) {
            return timestamp.split('T')[1].substring(0, 5)
        }
        return timestamp.substring(0, 5)
    }

    const handleSave = async () => {
        try {
            setIsSaving(true)

            // Calculate hours worked if present
            let hoursWorked = null
            let isOvertime = false
            let overtimeHours = null
            let earlyDeparture = false

            if (isPresent) {
                const [inH, inM] = checkInTime.split(':').map(Number)
                const [outH, outM] = checkOutTime.split(':').map(Number)

                let diff = (outH * 60 + outM) - (inH * 60 + inM)

                // Subtract lunch hour if applicable (between 13:00 and 14:00)
                if (inH < 14 && outH >= 13) {
                    diff -= 60
                }

                hoursWorked = Math.max(0, Math.round((diff / 60) * 100) / 100)

                // Standard day is 9 hours
                if (hoursWorked > 9) {
                    isOvertime = true
                    overtimeHours = Math.round((hoursWorked - 9) * 100) / 100
                }

                if (outH < 18) {
                    earlyDeparture = true
                }
            }

            const checkInTimestamp = isPresent ? `${date}T${checkInTime}:00` : `${date}T08:00:00`
            const checkOutTimestamp = isPresent ? `${date}T${checkOutTime}:00` : null

            await markAttendance({
                worker_id: workerId,
                contract_id: contractId,
                attendance_date: date,
                is_present: isPresent,
                check_in_time: checkInTimestamp,
                check_out_time: checkOutTimestamp,
                notes: notes,
                hours_worked: hoursWorked,
                is_overtime: isOvertime,
                overtime_hours: overtimeHours,
                early_departure: earlyDeparture,
                is_paid: isPaid
            })

            onSave()
            onClose()
        } catch (error) {
            console.error('Error saving attendance:', error)
            toast.error('Error al guardar asistencia')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Editar Asistencia"
            size="md"
        >
            <div className="space-y-6">
                {/* Header Info */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <p className="text-sm font-medium text-slate-200">{workerName}</p>
                    <p className="text-xs text-slate-400">
                        {new Date(date + 'T00:00:00').toLocaleDateString('es-CL', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}
                    </p>
                </div>

                {/* Presence Toggle */}
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsPresent(true)}
                        className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${isPresent
                            ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400'
                            : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:border-slate-500'
                            }`}
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">Presente</span>
                    </button>
                    <button
                        onClick={() => setIsPresent(false)}
                        className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${!isPresent
                            ? 'bg-red-900/30 border-red-500 text-red-400'
                            : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:border-slate-500'
                            }`}
                    >
                        <XCircle className="w-5 h-5" />
                        <span className="font-medium">Ausente</span>
                    </button>
                </div>

                {/* Time Inputs (only if present) */}
                {isPresent && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Entrada</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="time"
                                    value={checkInTime}
                                    onChange={(e) => setCheckInTime(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Salida</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="time"
                                    value={checkOutTime}
                                    onChange={(e) => setCheckOutTime(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Notes */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Notas</label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Observaciones..."
                            rows={3}
                            className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>
                </div>

                {/* Paid Status Toggle (Admin only) */}
                {userRole === 'admin' && (
                    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                        <div className={`p-2 rounded-full ${isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/50 text-slate-400'}`}>
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-slate-200">Estado de Pago</p>
                            <p className="text-xs text-slate-400">{isPaid ? 'Esta asistencia está pagada' : 'Pendiente de pago'}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isPaid}
                                onChange={(e) => setIsPaid(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>
                )}

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Guardando...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Guardar Cambios</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
