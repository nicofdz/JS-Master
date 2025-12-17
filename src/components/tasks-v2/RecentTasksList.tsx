import React, { useState } from 'react'
import { Calendar, MapPin, User, ArrowRight, Search, Clock } from 'lucide-react'
import { TaskV2 } from '@/hooks/useTasks_v2'

interface RecentTasksListProps {
    tasks: TaskV2[]
    onTaskSelect: (taskId: number) => void
    onGoToLocation: (task: TaskV2) => void
    selectedProjectId?: number
}

export const RecentTasksList: React.FC<RecentTasksListProps> = ({
    tasks,
    onTaskSelect,
    onGoToLocation,
    selectedProjectId
}) => {
    const [searchTerm, setSearchTerm] = useState('')

    // Filtrar por proyecto si está seleccionado, luego ordenar y tomar las últimas 10
    const recentTasks = tasks
        .filter(t => !selectedProjectId || t.project_id === selectedProjectId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10) // Limitado a 10 como solicitado

    const filteredTasks = recentTasks.filter(task => {
        const searchLower = searchTerm.toLowerCase()
        return (
            task.task_name.toLowerCase().includes(searchLower) ||
            (task.created_by_name || '').toLowerCase().includes(searchLower) ||
            (task.project_name || '').toLowerCase().includes(searchLower)
        )
    })

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
        <div className="space-y-4">
            {/* Header / Buscador */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar en recientes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="text-sm text-slate-400">
                    Mostrando las últimas {filteredTasks.length} tareas
                </div>
            </div>

            {/* Lista */}
            <div className="space-y-2">
                {filteredTasks.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700">
                        <Clock className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg font-medium">No se encontraron tareas recientes</p>
                    </div>
                ) : (
                    filteredTasks.map((task) => (
                        <div
                            key={task.id}
                            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:bg-slate-800/70 hover:border-slate-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-base font-semibold text-slate-100 truncate pr-2">
                                        {task.task_name}
                                    </h3>
                                    <span className="px-2 py-0.5 text-xs font-medium bg-slate-700 text-slate-300 rounded border border-slate-600">
                                        {task.task_category}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-xs text-slate-400">
                                    <div className="flex items-center gap-1">
                                        <User className="w-3.5 h-3.5" />
                                        <span>{task.created_by_name || 'Desconocido'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5" />
                                        <span>{getLocationString(task)}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-500">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{formatDate(task.created_at)}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <button
                                        onClick={() => onGoToLocation(task)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 text-slate-300 text-sm font-medium rounded-md hover:bg-slate-600 transition-colors border border-slate-600"
                                        title="Ir a Tarea"
                                    >
                                        <MapPin className="w-4 h-4" />
                                        <span className="md:hidden lg:inline">Ir a Tarea</span>
                                    </button>

                                    <button
                                        onClick={() => onTaskSelect(task.id)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 text-sm font-medium rounded-md hover:bg-blue-500/20 transition-colors border border-blue-500/20 hover:border-blue-500/40"
                                    >
                                        Ver Tarea
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
