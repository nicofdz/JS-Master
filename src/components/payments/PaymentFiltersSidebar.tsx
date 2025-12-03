import { X, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'

interface PaymentFiltersSidebarProps {
    isOpen: boolean
    onClose: () => void
    currentView: 'pending' | 'history'

    // Pending Filters
    projectFilter: string
    setProjectFilter: (value: string) => void
    typeFilter: string
    setTypeFilter: (value: string) => void
    workerFilter: string
    setWorkerFilter: (value: string) => void
    projects: any[]
    allWorkers: any[]

    // History Filters
    historyPeriod: string
    setHistoryPeriod: (value: string) => void
    historyWorker: string
    setHistoryWorker: (value: string) => void
    historyProject: string
    setHistoryProject: (value: string) => void
    allHistoryWorkers: Map<number, string>
    allHistoryProjects: Map<number, string>

    onClearFilters: () => void
}

export function PaymentFiltersSidebar({
    isOpen,
    onClose,
    currentView,
    projectFilter,
    setProjectFilter,
    typeFilter,
    setTypeFilter,
    workerFilter,
    setWorkerFilter,
    projects,
    allWorkers,
    historyPeriod,
    setHistoryPeriod,
    historyWorker,
    setHistoryWorker,
    historyProject,
    setHistoryProject,
    allHistoryWorkers,
    allHistoryProjects,
    onClearFilters
}: PaymentFiltersSidebarProps) {

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                    <div className="flex items-center gap-2 text-slate-100">
                        <Filter className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-semibold">Filtros</h2>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-full p-2 h-8 w-8"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {currentView === 'pending' ? (
                        <>
                            {/* Pending Filters */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Tipo de Contrato
                                    </label>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => setTypeFilter('all')}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${typeFilter === 'all'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                                }`}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            onClick={() => setTypeFilter('a_trato')}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${typeFilter === 'a_trato'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                                }`}
                                        >
                                            A Trato
                                        </button>
                                        <button
                                            onClick={() => setTypeFilter('por_dia')}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${typeFilter === 'por_dia'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                                }`}
                                        >
                                            Por Día
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-700 my-4" />

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Proyecto
                                    </label>
                                    <Select
                                        value={projectFilter}
                                        onChange={(e) => setProjectFilter(e.target.value)}
                                        className="w-full bg-slate-800 border-slate-600 text-slate-200 focus:ring-blue-500"
                                    >
                                        <option value="all">Todos los proyectos</option>
                                        {projects.map((project, idx) => (
                                            <option key={`project-filter-${project.project_id}-${idx}`} value={project.project_id.toString()}>
                                                {project.project_name}
                                            </option>
                                        ))}
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Trabajador
                                    </label>
                                    <Select
                                        value={workerFilter}
                                        onChange={(e) => setWorkerFilter(e.target.value)}
                                        className="w-full bg-slate-800 border-slate-600 text-slate-200 focus:ring-blue-500"
                                    >
                                        <option value="all">Todos los trabajadores</option>
                                        {allWorkers.map((worker, idx) => (
                                            <option key={`worker-filter-${worker.id}-${idx}`} value={worker.id.toString()}>
                                                {worker.name}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* History Filters */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Período
                                    </label>
                                    <Select
                                        value={historyPeriod}
                                        onChange={(e) => setHistoryPeriod(e.target.value)}
                                        className="w-full bg-slate-800 border-slate-600 text-slate-200 focus:ring-blue-500"
                                    >
                                        <option value="all">Todos los tiempos</option>
                                        <option value="monthly">Mensual</option>
                                        <option value="yearly">Anual</option>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Trabajador
                                    </label>
                                    <Select
                                        value={historyWorker}
                                        onChange={(e) => setHistoryWorker(e.target.value)}
                                        className="w-full bg-slate-800 border-slate-600 text-slate-200 focus:ring-blue-500"
                                    >
                                        <option value="all">Todos los trabajadores</option>
                                        {Array.from(allHistoryWorkers.entries()).map(([id, name], idx) => (
                                            <option key={`history-worker-${id}-${idx}`} value={id.toString()}>{name}</option>
                                        ))}
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Proyecto
                                    </label>
                                    <Select
                                        value={historyProject}
                                        onChange={(e) => setHistoryProject(e.target.value)}
                                        className="w-full bg-slate-800 border-slate-600 text-slate-200 focus:ring-blue-500"
                                    >
                                        <option value="all">Todos los proyectos</option>
                                        {Array.from(allHistoryProjects.entries()).map(([id, name], idx) => (
                                            <option key={`history-project-${id}-${idx}`} value={id.toString()}>{name}</option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 bg-slate-800/50">
                    <Button
                        variant="outline"
                        onClick={onClearFilters}
                        className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                        Limpiar Filtros
                    </Button>
                </div>
            </div>
        </>
    )
}
