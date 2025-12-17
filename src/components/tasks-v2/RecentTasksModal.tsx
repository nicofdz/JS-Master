import React from 'react'
import { X, Calendar, MapPin, User, ArrowRight } from 'lucide-react'
import { TaskV2 } from '@/hooks/useTasks_v2'

interface RecentTasksModalProps {
    isOpen: boolean
    onClose: () => void
    tasks: TaskV2[]
    onTaskSelect: (taskId: number) => void
}

export const RecentTasksModal: React.FC<RecentTasksModalProps> = ({
    isOpen,
    onClose,
    tasks,
    onTaskSelect
}) => {
    if (!isOpen) return null

    // Ordenar por fecha de creación (más reciente primero) y tomar las últimas 10
    const recentTasks = [...tasks]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)

    const formatDate = (dateString: string) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('es-CL', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date)
    }

    const getLocationString = (task: TaskV2) => {
        const parts = []
        if (task.tower_number) parts.push(`Torre ${task.tower_number}`)
        if (task.floor_number) parts.push(`Piso ${task.floor_number}`)
        if (task.apartment_number) parts.push(`Depto ${task.apartment_number}`)
        return parts.join(' • ') || 'Sin ubicación'
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Últimas Tareas Creadas</h2>
                        <p className="text-xs text-gray-500">Las 10 tareas más recientes del sistema</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid gap-3">
                        {recentTasks.map((task) => (
                            <div
                                key={task.id}
                                className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3"
                            >
                                {/* Info Principal */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between md:block">
                                        <h3 className="font-semibold text-gray-800 truncate pr-2 group-hover:text-blue-600 transition-colors">
                                            {task.task_name}
                                        </h3>
                                        <span className="md:hidden text-[10px] text-gray-400 whitespace-nowrap">
                                            {formatDate(task.created_at)}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                                        <div className="flex items-center gap-1 min-w-[120px]">
                                            <User className="w-3 h-3 text-gray-400" />
                                            <span className="truncate max-w-[150px]" title={task.created_by_name}>
                                                {task.created_by_name || 'Desconocido'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-gray-400" />
                                            <span className="truncate max-w-[200px]">{getLocationString(task)}</span>
                                        </div>
                                        <div className="hidden md:flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-gray-400" />
                                            <span>{formatDate(task.created_at)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Acciones */}
                                <div>
                                    <button
                                        onClick={() => {
                                            onTaskSelect(task.id)
                                            onClose()
                                        }}
                                        className="w-full md:w-auto flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-md hover:bg-blue-100 transition-colors group-hover:bg-blue-600 group-hover:text-white"
                                    >
                                        Ver Tarea
                                        <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {recentTasks.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                No hay tareas creadas recientemente.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
