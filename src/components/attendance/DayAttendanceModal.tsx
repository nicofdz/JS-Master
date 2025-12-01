'use client'

import { Modal } from '@/components/ui/Modal'
import { X, CheckCircle2, XCircle, Clock, AlertTriangle, Edit2, Calendar } from 'lucide-react'
import { WorkerAttendance } from '@/hooks/useAttendance'

interface DayAttendanceModalProps {
    isOpen: boolean
    onClose: () => void
    date: string | null
    attendances: WorkerAttendance[]
    onEdit: (attendance: WorkerAttendance) => void
}

export function DayAttendanceModal({
    isOpen,
    onClose,
    date,
    attendances,
    onEdit
}: DayAttendanceModalProps) {
    if (!date) return null

    const presentCount = attendances.filter(a => a.is_present).length
    const absentCount = attendances.filter(a => !a.is_present).length

    // Agrupar por proyecto
    const groupedAttendances = attendances.reduce((acc, attendance) => {
        const projectName = attendance.project_name || 'Sin Proyecto'
        if (!acc[projectName]) {
            acc[projectName] = []
        }
        acc[projectName].push(attendance)
        return acc
    }, {} as Record<string, WorkerAttendance[]>)

    // Formatear hora
    const formatTime = (timestamp: string): string => {
        if (!timestamp) return '--:--'
        // Manejar formato ISO o "YYYY-MM-DD HH:mm:ss"
        if (timestamp.includes('T')) {
            return timestamp.split('T')[1]?.substring(0, 5) || '00:00'
        }
        return timestamp.split(' ')[1]?.substring(0, 5) || '00:00'
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={new Date(date + 'T00:00:00').toLocaleDateString('es-CL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })}
            size="xl"
        >
            <div className="space-y-6">
                {/* Estadísticas del día */}
                <div className="grid grid-cols-2 gap-4">
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

                {/* Lista de trabajadores agrupada por proyecto */}
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                    {Object.entries(groupedAttendances).map(([projectName, projectAttendances]) => (
                        <div key={projectName} className="space-y-3">
                            {/* Separador de Proyecto */}
                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-700"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-slate-800 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        {projectName}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {projectAttendances.map(attendance => (
                                    <div
                                        key={attendance.id}
                                        className={`p-3 rounded-lg border ${attendance.is_present
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
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-slate-100">
                                                            {attendance.worker_name}
                                                        </p>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${attendance.contract_type === 'por_dia'
                                                            ? 'bg-purple-900/30 text-purple-400 border-purple-600/30'
                                                            : 'bg-orange-900/30 text-orange-400 border-orange-600/30'
                                                            }`}>
                                                            {attendance.contract_type === 'por_dia' ? 'Por Día' : 'A Trato'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                                        <span>{attendance.worker_rut}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {attendance.is_present ? (
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-xs text-slate-400">Horario</p>
                                                        <p className="text-sm font-medium text-slate-200">
                                                            {formatTime(attendance.check_in_time)} - {attendance.check_out_time ? formatTime(attendance.check_out_time) : '--:--'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-xs text-slate-400">Horas</p>
                                                        <p className="text-sm font-medium text-slate-200">
                                                            {attendance.hours_worked?.toFixed(1) || '0'}h
                                                        </p>
                                                    </div>
                                                    {attendance.early_departure && (
                                                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-900/30 rounded text-xs text-yellow-400" title="Salida Temprana">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            <span className="hidden sm:inline">Temprano</span>
                                                        </div>
                                                    )}
                                                    {attendance.is_overtime && (
                                                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 rounded text-xs text-blue-400" title="Horas Extra">
                                                            <Clock className="w-3 h-3" />
                                                            <span className="hidden sm:inline">+{attendance.overtime_hours?.toFixed(1)}h</span>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => onEdit(attendance)}
                                                        className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-blue-400 transition-colors"
                                                        title="Editar asistencia"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => onEdit(attendance)}
                                                    className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-blue-400 transition-colors"
                                                    title="Editar asistencia"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {attendance.notes && (
                                            <div className="mt-2 text-xs text-slate-400 pl-8">
                                                📝 {attendance.notes}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {attendances.length === 0 && (
                        <div className="text-center py-8">
                            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">No hay registros de asistencia para este día</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal >
    )
}
