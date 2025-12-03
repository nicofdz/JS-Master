import { X, Layers, Activity, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ToolFiltersSidebarProps {
    isOpen: boolean
    onClose: () => void
    currentStatusFilter: 'all' | 'disponible' | 'prestada'
    onStatusFilterChange: (filter: 'all' | 'disponible' | 'prestada') => void
    currentActiveFilter: string
    onActiveFilterChange: (filter: string) => void
}

export function ToolFiltersSidebar({
    isOpen,
    onClose,
    currentStatusFilter,
    onStatusFilterChange,
    currentActiveFilter,
    onActiveFilterChange
}: ToolFiltersSidebarProps) {

    const handleClearFilters = () => {
        onStatusFilterChange('all')
        onActiveFilterChange('active')
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

                            {/* Filtro de Estado (Disponible/Prestada) */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <Activity className="w-4 h-4 text-purple-400" />
                                    <h3 className="text-sm font-medium text-slate-300">
                                        Estado
                                    </h3>
                                </div>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none text-sm hover:border-slate-600"
                                        value={currentStatusFilter}
                                        onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'disponible' | 'prestada')}
                                    >
                                        <option value="all">Todos los estados</option>
                                        <option value="disponible">Disponible</option>
                                        <option value="prestada">Prestada</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-800 my-6" />

                            {/* Filtro de Actividad (Activas/Inactivas) */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                    <h3 className="text-sm font-medium text-slate-300">
                                        Visibilidad
                                    </h3>
                                </div>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none text-sm hover:border-slate-600"
                                        value={currentActiveFilter}
                                        onChange={(e) => onActiveFilterChange(e.target.value)}
                                    >
                                        <option value="active">Activas</option>
                                        <option value="inactive">Inactivas</option>
                                        <option value="all">Todas</option>
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
