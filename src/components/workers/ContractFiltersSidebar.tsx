import { X, Layers, Building2, User, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ContractFiltersSidebarProps {
    isOpen: boolean
    onClose: () => void
    currentProjectFilter: string
    onProjectFilterChange: (filter: string) => void
    currentWorkerFilter: string
    onWorkerFilterChange: (filter: string) => void
    currentStatusFilter: string
    onStatusFilterChange: (filter: string) => void
    currentTypeFilter: 'all' | 'a_trato' | 'por_dia'
    onTypeFilterChange: (filter: 'all' | 'a_trato' | 'por_dia') => void
    currentDateFilter: string
    onDateFilterChange: (date: string) => void
    projects: { id: number; name: string }[]
    workers: { id: number; full_name: string }[]
}

export function ContractFiltersSidebar({
    isOpen,
    onClose,
    currentProjectFilter,
    onProjectFilterChange,
    currentWorkerFilter,
    onWorkerFilterChange,
    currentStatusFilter,
    onStatusFilterChange,
    currentTypeFilter,
    onTypeFilterChange,
    currentDateFilter,
    onDateFilterChange,
    projects,
    workers
}: ContractFiltersSidebarProps) {

    const handleClearFilters = () => {
        onProjectFilterChange('all')
        onWorkerFilterChange('all')
        onStatusFilterChange('all')
        onTypeFilterChange('all')
        onDateFilterChange('')
    }

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 right-0 w-80 bg-[#0f172a] border-l border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Layers className="w-5 h-5 text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Filtros</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#0f172a]">

                        {/* Sección Principal */}
                        <div className="space-y-6">

                            {/* Filtro por Proyecto */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <Building2 className="w-4 h-4 text-purple-400" />
                                    <h3 className="text-sm font-medium text-slate-300">
                                        Proyecto
                                    </h3>
                                </div>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none text-sm hover:border-slate-600"
                                        value={currentProjectFilter}
                                        onChange={(e) => onProjectFilterChange(e.target.value)}
                                    >
                                        <option value="all">Todos los proyectos</option>
                                        {projects.map((project) => (
                                            <option key={project.id} value={project.id}>{project.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-800 my-6" />

                            {/* Filtro por Trabajador */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <User className="w-4 h-4 text-blue-400" />
                                    <h3 className="text-sm font-medium text-slate-300">
                                        Trabajador
                                    </h3>
                                </div>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none text-sm hover:border-slate-600"
                                        value={currentWorkerFilter}
                                        onChange={(e) => onWorkerFilterChange(e.target.value)}
                                    >
                                        <option value="all">Todos los trabajadores</option>
                                        {workers.map((worker) => (
                                            <option key={worker.id} value={worker.id}>{worker.full_name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-800 my-6" />

                            {/* Filtro por Mes y Año */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-4 h-4 text-emerald-400" />
                                    <h3 className="text-sm font-medium text-slate-300">
                                        Mes y Año
                                    </h3>
                                </div>
                                <div>
                                    <input
                                        type="month"
                                        className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none text-sm hover:border-slate-600"
                                        value={currentDateFilter}
                                        onChange={(e) => onDateFilterChange(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-slate-800 my-6" />

                            {/* Filtro por Tipo de Contrato */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4 text-orange-400" />
                                    <h3 className="text-sm font-medium text-slate-300">
                                        Tipo de Contrato
                                    </h3>
                                </div>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => onTypeFilterChange('all')}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${currentTypeFilter === 'all'
                                            ? 'bg-blue-900/30 border-blue-500'
                                            : 'bg-[#1e293b] border-slate-700 hover:border-slate-600'
                                            }`}
                                    >
                                        <span className={`text-sm font-medium ${currentTypeFilter === 'all' ? 'text-blue-400' : 'text-slate-300'}`}>
                                            Todos
                                        </span>
                                        {currentTypeFilter === 'all' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                    </button>

                                    <button
                                        onClick={() => onTypeFilterChange('a_trato')}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${currentTypeFilter === 'a_trato'
                                            ? 'bg-orange-900/30 border-orange-500'
                                            : 'bg-[#1e293b] border-slate-700 hover:border-slate-600'
                                            }`}
                                    >
                                        <span className={`text-sm font-medium ${currentTypeFilter === 'a_trato' ? 'text-orange-400' : 'text-slate-300'}`}>
                                            A Trato
                                        </span>
                                        {currentTypeFilter === 'a_trato' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                    </button>

                                    <button
                                        onClick={() => onTypeFilterChange('por_dia')}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${currentTypeFilter === 'por_dia'
                                            ? 'bg-cyan-900/30 border-cyan-500'
                                            : 'bg-[#1e293b] border-slate-700 hover:border-slate-600'
                                            }`}
                                    >
                                        <span className={`text-sm font-medium ${currentTypeFilter === 'por_dia' ? 'text-cyan-400' : 'text-slate-300'}`}>
                                            Por Día
                                        </span>
                                        {currentTypeFilter === 'por_dia' && <div className="w-2 h-2 rounded-full bg-cyan-500" />}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-800 bg-[#0f172a]">
                        <Button
                            variant="outline"
                            className="w-full h-12 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600 transition-all rounded-xl font-medium"
                            onClick={handleClearFilters}
                        >
                            Limpiar Filtros
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}
