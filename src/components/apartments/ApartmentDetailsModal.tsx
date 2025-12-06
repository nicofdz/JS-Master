'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
    Building2,
    Home,
    Layers,
    CheckCircle,
    Clock,
    AlertCircle,
    Users,
    PieChart,
    Calendar,
    Ruler,
    Hash,
    Eye,
    ListTodo
} from 'lucide-react'
import { getStatusColor, getStatusText, getStatusEmoji, formatDate } from '@/lib/utils'

interface ApartmentDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    apartment: any
    onViewTasks: () => void
    workers: any[]
}

export function ApartmentDetailsModal({
    isOpen,
    onClose,
    apartment,
    onViewTasks,
    workers
}: ApartmentDetailsModalProps) {
    if (!apartment) return null

    // Helper para mostrar filas de información
    const InfoRow = ({ icon, label, value, valueClassName = "" }: { icon: any, label: string, value: string | number | null, valueClassName?: string }) => (
        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-700/50 rounded-md text-slate-400">
                    {icon}
                </div>
                <span className="text-sm text-slate-400 font-medium">{label}</span>
            </div>
            <span className={`text-sm text-slate-200 font-semibold ${valueClassName}`}>
                {value || 'N/A'}
            </span>
        </div>
    )

    const abbreviateName = (fullName: string): string => {
        const parts = fullName.trim().split(/\s+/)
        if (parts.length === 0) return fullName
        if (parts.length === 1) return parts[0]

        const firstName = parts[0]
        const lastName = parts[parts.length - 1]
        const lastInitial = lastName.charAt(0).toUpperCase()

        return `${firstName} ${lastInitial}.`
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Detalles del Departamento"
            size="lg"
        >
            <div className="space-y-6">

                {/* Header con Estado y Progreso */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-400">Estado Actual</span>
                            <Badge className={getStatusColor(apartment.status)}>
                                {getStatusEmoji(apartment.status)} {getStatusText(apartment.status)}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <div className="flex-1 bg-slate-700 rounded-full h-2.5">
                                <div
                                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${apartment.progress_percentage || 0}%` }}
                                ></div>
                            </div>
                            <span className="text-lg font-bold text-slate-100">{apartment.progress_percentage || 0}%</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 text-right">Progreso General</p>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-slate-400">Datos Principales</span>
                            <Home className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <h3 className="text-2xl font-bold text-slate-100">
                                {apartment.apartment_code ? `${apartment.apartment_code} ${apartment.apartment_number}` : apartment.apartment_number}
                            </h3>
                            <p className="text-sm text-slate-400">{apartment.project_name}</p>
                        </div>
                    </div>
                </div>

                {/* Información Detallada */}
                <div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                        <ListTodo className="w-5 h-5 text-blue-400" />
                        Información General
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <InfoRow
                            icon={<Building2 className="w-4 h-4" />}
                            label="Torre"
                            value={apartment.tower_name || `Torre ${apartment.tower_number}`}
                        />
                        <InfoRow
                            icon={<Layers className="w-4 h-4" />}
                            label="Piso"
                            value={`Piso ${apartment.floor_number}`}
                        />
                        <InfoRow
                            icon={<Hash className="w-4 h-4" />}
                            label="Tipo"
                            value={apartment.apartment_type}
                        />
                        <InfoRow
                            icon={<Ruler className="w-4 h-4" />}
                            label="Área"
                            value={apartment.area ? `${apartment.area} m²` : null}
                        />
                        <InfoRow
                            icon={<Calendar className="w-4 h-4" />}
                            label="Fecha Inicio"
                            value={formatDate(apartment.start_date)}
                        />
                        <InfoRow
                            icon={<Calendar className="w-4 h-4" />}
                            label="Fecha Fin"
                            value={formatDate(apartment.end_date)}
                        />
                    </div>
                </div>

                {/* Trabajadores */}
                <div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-400" />
                        Trabajadores Involucrados ({workers.length})
                    </h3>

                    {workers.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {workers.map((worker) => (
                                <div key={worker.id} className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-semibold text-xs">
                                        {worker.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">{worker.full_name}</p>
                                        <p className="text-xs text-slate-500">Trabajador</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg text-center">
                            <p className="text-slate-500 text-sm">No hay trabajadores registrados en tareas de este departamento.</p>
                        </div>
                    )}
                </div>

                {/* Botones de Acción */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                        onClick={onViewTasks}
                    >
                        <ListTodo className="w-4 h-4" />
                        Ver Tareas
                    </Button>
                </div>

            </div>
        </Modal>
    )
}
