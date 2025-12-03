import { X, Layers, Calendar, Building2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

interface InvoiceFiltersSidebarProps {
    isOpen: boolean
    onClose: () => void

    // Filters
    projectFilter: string
    onProjectChange: (val: string) => void
    monthFilter: number | 'all'
    onMonthChange: (val: number | 'all') => void
    yearFilter: number
    onYearChange: (val: number) => void
    statusFilter: 'all' | 'processed' | 'pending'
    onStatusChange: (val: 'all' | 'processed' | 'pending') => void

    // Options
    projects: any[]
}

export function InvoiceFiltersSidebar({
    isOpen,
    onClose,
    projectFilter,
    onProjectChange,
    monthFilter,
    onMonthChange,
    yearFilter,
    onYearChange,
    statusFilter,
    onStatusChange,
    projects
}: InvoiceFiltersSidebarProps) {

    const handleClearFilters = () => {
        onProjectChange('all')
        onMonthChange('all')
        onYearChange(0)
        onStatusChange('all')
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
                            <h2 className="text-xl font-bold text-white tracking-tight">
                                Filtros Facturas
                            </h2>
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

                        <div className="space-y-6">

                            {/* Project */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <Building2 className="w-4 h-4 text-orange-400" />
                                    <h3 className="text-sm font-medium text-slate-300">Proyecto</h3>
                                </div>
                                <div className="relative">
                                    <Select
                                        className="appearance-none"
                                        value={projectFilter}
                                        onChange={(e) => onProjectChange(e.target.value)}
                                    >
                                        <option value="all">Todos los proyectos</option>
                                        {projects.map(proj => (
                                            <option key={proj.id} value={proj.id.toString()}>{proj.name}</option>
                                        ))}
                                    </Select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-800 my-6" />

                            {/* Period */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-sm font-medium text-slate-300">Período</h3>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Mes</label>
                                        <div className="relative">
                                            <Select
                                                className="appearance-none"
                                                value={monthFilter}
                                                onChange={(e) => onMonthChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                            >
                                                <option value="all">Todos los meses</option>
                                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                                    <option key={month} value={month}>
                                                        {new Date(2000, month - 1).toLocaleDateString('es-CL', { month: 'long' })}
                                                    </option>
                                                ))}
                                            </Select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">Año</label>
                                        <div className="relative">
                                            <Select
                                                className="appearance-none"
                                                value={yearFilter}
                                                onChange={(e) => onYearChange(parseInt(e.target.value))}
                                            >
                                                <option value={0}>Todos los años</option>
                                                {Array.from({ length: 4 }, (_, i) => 2023 + i).map(year => (
                                                    <option key={year} value={year}>
                                                        {year}
                                                    </option>
                                                ))}
                                            </Select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-800 my-6" />

                            {/* Status */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <h3 className="text-sm font-medium text-slate-300">Estado</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-2 p-1 bg-[#1e293b] rounded-xl border border-slate-700">
                                    <button
                                        onClick={() => onStatusChange('all')}
                                        className={`py-2 text-xs font-medium rounded-lg transition-all ${statusFilter === 'all'
                                                ? 'bg-blue-600 text-white shadow-lg'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                            }`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => onStatusChange('processed')}
                                        className={`py-2 text-xs font-medium rounded-lg transition-all ${statusFilter === 'processed'
                                                ? 'bg-emerald-600 text-white shadow-lg'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                            }`}
                                    >
                                        Procesadas
                                    </button>
                                    <button
                                        onClick={() => onStatusChange('pending')}
                                        className={`py-2 text-xs font-medium rounded-lg transition-all ${statusFilter === 'pending'
                                                ? 'bg-yellow-600 text-white shadow-lg'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                            }`}
                                    >
                                        Pendientes
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
