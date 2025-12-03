import { X, Layers, Calendar, User, Building2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface LoanHistoryFiltersSidebarProps {
    isOpen: boolean
    onClose: () => void
    currentStatusFilter: string
    onStatusFilterChange: (filter: string) => void
    currentMonthFilter: string
    onMonthFilterChange: (filter: string) => void
    currentYearFilter: string
    onYearFilterChange: (filter: string) => void
    currentWorkerFilter: string
    onWorkerFilterChange: (filter: string) => void
    currentProjectFilter: string
    onProjectFilterChange: (filter: string) => void
    workers: Array<{ id: number; full_name: string }>
    projects: Array<{ id: number; name: string }>
}

export function LoanHistoryFiltersSidebar({
    isOpen,
    onClose,
    currentStatusFilter,
    onStatusFilterChange,
    currentMonthFilter,
    onMonthFilterChange,
    currentYearFilter,
    onYearFilterChange,
    currentWorkerFilter,
    onWorkerFilterChange,
    currentProjectFilter,
    onProjectFilterChange,
    workers,
    projects
}: LoanHistoryFiltersSidebarProps) {

    const handleClearFilters = () => {
        onStatusFilterChange('all')
        onMonthFilterChange('all')
        onYearFilterChange('all')
        onWorkerFilterChange('all')
        onProjectFilterChange('all')
    }

    const months = [
        { value: '1', label: 'Enero' },
        { value: '2', label: 'Febrero' },
        { value: '3', label: 'Marzo' },
        { value: '4', label: 'Abril' },
        { value: '5', label: 'Mayo' },
        { value: '6', label: 'Junio' },
        { value: '7', label: 'Julio' },
        { value: '8', label: 'Agosto' },
        { value: '9', label: 'Septiembre' },
        { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' },
        { value: '12', label: 'Diciembre' }
    ]

    const years = [
        { value: '2023', label: '2023' },
        { value: '2024', label: '2024' },
        { value: '2025', label: '2025' },
        { value: '2026', label: '2026' }
    ]

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
                            <h2 className="text-xl font-bold text-white tracking-tight">Filtros Historial</h2>
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

                            {/* Filtro de Estado */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-4 h-4 text-purple-400" />
                                    <h3 className="text-sm font-medium text-slate-300">
                                        Estado
                                    </h3>
                                </div>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none text-sm hover:border-slate-600"
                                        value={currentStatusFilter}
                                        onChange={(e) => onStatusFilterChange(e.target.value)}
                                    >
                                        <option value="all">Todos los estados</option>
                                        <option value="active">Activos</option>
                                        <option value="returned">Devueltos</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-800 my-6" />

                            {/* Filtro de Mes */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="w-4 h-4 text-blue-400" />
                                    <h3 className="text-sm font-medium text-slate-300">
                                        Mes
                                    </h3>
                                </div>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none text-sm hover:border-slate-600"
                                        value={currentMonthFilter}
                                        onChange={(e) => onMonthFilterChange(e.target.value)}
                                    >
                                        <option value="all">Todos los meses</option>
                                        {months.map(month => (
                                            <option key={month.value} value={month.value}>{month.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Filtro de Año */}
                            <div className="group mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="w-4 h-4 text-blue-400" />
                                    <h3 className="text-sm font-medium text-slate-300">
                                        Año
                                    </h3>
                                </div>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none text-sm hover:border-slate-600"
                                        value={currentYearFilter}
                                        onChange={(e) => onYearFilterChange(e.target.value)}
                                    >
                                        <option value="all">Todos los años</option>
                                        {years.map(year => (
                                            <option key={year.value} value={year.value}>{year.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-800 my-6" />

                            {/* Filtro de Trabajador */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <User className="w-4 h-4 text-emerald-400" />
                                    <h3 className="text-sm font-medium text-slate-300">
                                        Trabajador
                                    </h3>
                                </div>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none text-sm hover:border-slate-600"
                                        value={currentWorkerFilter}
                                        onChange={(e) => onWorkerFilterChange(e.target.value)}
                                    >
                                        <option value="all">Todos los trabajadores</option>
                                        {workers.map(worker => (
                                            <option key={worker.id} value={worker.id.toString()}>{worker.full_name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Filtro de Proyecto */}
                            <div className="group mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Building2 className="w-4 h-4 text-orange-400" />
                                    <h3 className="text-sm font-medium text-slate-300">
                                        Proyecto
                                    </h3>
                                </div>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all appearance-none text-sm hover:border-slate-600"
                                        value={currentProjectFilter}
                                        onChange={(e) => onProjectFilterChange(e.target.value)}
                                    >
                                        <option value="all">Todos los proyectos</option>
                                        {projects.map(project => (
                                            <option key={project.id} value={project.id.toString()}>{project.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
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
