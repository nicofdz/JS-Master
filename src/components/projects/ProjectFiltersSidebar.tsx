'use client'

import { X, Layers, Calendar, Play, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ProjectFiltersSidebarProps {
    isOpen: boolean
    onClose: () => void
    currentFilter: 'all' | 'planning' | 'active' | 'completed'
    onFilterChange: (filter: 'all' | 'planning' | 'active' | 'completed') => void
    counts: {
        all: number
        planning: number
        active: number
        completed: number
    }
}

export function ProjectFiltersSidebar({
    isOpen,
    onClose,
    currentFilter,
    onFilterChange,
    counts
}: ProjectFiltersSidebarProps) {
    const filters = [
        {
            id: 'all',
            label: 'Todos',
            icon: Layers,
            count: counts.all,
            color: 'blue'
        },
        {
            id: 'planning',
            label: 'Planificación',
            icon: Calendar,
            count: counts.planning,
            color: 'yellow'
        },
        {
            id: 'active',
            label: 'Activos',
            icon: Play,
            count: counts.active,
            color: 'emerald'
        },
        {
            id: 'completed',
            label: 'Completados',
            icon: CheckCircle,
            count: counts.completed,
            color: 'purple'
        }
    ] as const

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">Filtros</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
                                    Estado del Proyecto
                                </h3>
                                <div className="space-y-2">
                                    {filters.map((filter) => {
                                        const Icon = filter.icon
                                        const isActive = currentFilter === filter.id

                                        // Definir colores dinámicos basados en el estado activo
                                        const activeBgClass = {
                                            blue: 'bg-blue-900/30 border-blue-500',
                                            yellow: 'bg-yellow-900/30 border-yellow-500',
                                            emerald: 'bg-emerald-900/30 border-emerald-500',
                                            purple: 'bg-purple-900/30 border-purple-500'
                                        }[filter.color]

                                        const activeTextClass = {
                                            blue: 'text-blue-400',
                                            yellow: 'text-yellow-400',
                                            emerald: 'text-emerald-400',
                                            purple: 'text-purple-400'
                                        }[filter.color]

                                        return (
                                            <button
                                                key={filter.id}
                                                onClick={() => onFilterChange(filter.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${isActive
                                                        ? `${activeBgClass}`
                                                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-md ${isActive ? 'bg-slate-900/50' : 'bg-slate-900'
                                                        }`}>
                                                        <Icon className={`w-4 h-4 ${isActive ? activeTextClass : 'text-slate-400'
                                                            }`} />
                                                    </div>
                                                    <span className={`font-medium ${isActive ? 'text-white' : 'text-slate-300'
                                                        }`}>
                                                        {filter.label}
                                                    </span>
                                                </div>
                                                <span className={`text-sm font-bold ${isActive ? activeTextClass : 'text-slate-500'
                                                    }`}>
                                                    {filter.count}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-700 bg-slate-900">
                        <Button
                            variant="outline"
                            className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                            onClick={() => {
                                onFilterChange('all')
                                onClose()
                            }}
                        >
                            Limpiar Filtros
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}
