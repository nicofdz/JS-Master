import { X, Layers, Building2, Building } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ApartmentFiltersSidebarProps {
    isOpen: boolean
    onClose: () => void
    currentStatusFilter: string
    onStatusFilterChange: (filter: any) => void
    currentProjectFilter: string
    onProjectFilterChange: (filter: string) => void
    currentTowerFilter: string
    onTowerFilterChange: (filter: string) => void
    currentFloorFilter: string
    onFloorFilterChange: (filter: string) => void
    projects: { id: number; name: string }[]
    towers: { id: number; name: string; number: number }[]
    floors: { id: number; floor_number: number }[]
    counts: {
        all: number
        pending: number
        in_progress: number
        completed: number
        blocked: number
    }
}

export function ApartmentFiltersSidebar({
    isOpen,
    onClose,
    currentStatusFilter,
    onStatusFilterChange,
    currentProjectFilter,
    onProjectFilterChange,
    currentTowerFilter,
    onTowerFilterChange,
    currentFloorFilter,
    onFloorFilterChange,
    projects,
    towers,
    floors,
    counts
}: ApartmentFiltersSidebarProps) {

    const handleClearFilters = () => {
        onStatusFilterChange('all')
        onProjectFilterChange('all')
        onTowerFilterChange('all')
        onFloorFilterChange('all')
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

                            {/* Sección Ubicación */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 text-slate-500 mb-2">
                                    <Layers className="w-4 h-4" />
                                    <h3 className="text-xs font-bold uppercase tracking-widest">
                                        UBICACIÓN
                                    </h3>
                                </div>

                                {/* Filtro por Torre */}
                                <div className="group">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Building className="w-4 h-4 text-blue-400" />
                                        <h3 className="text-sm font-medium text-slate-300">
                                            Torre
                                        </h3>
                                    </div>
                                    <div className="relative">
                                        <select
                                            className={`w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none text-sm hover:border-slate-600 ${currentProjectFilter === 'all' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={currentTowerFilter}
                                            onChange={(e) => onTowerFilterChange(e.target.value)}
                                            disabled={currentProjectFilter === 'all'}
                                        >
                                            <option value="all">
                                                {currentProjectFilter === 'all' ? 'Selecciona un proyecto' : 'Todas las torres'}
                                            </option>
                                            {towers.map((tower) => {
                                                const displayName = tower.name === `Torre ${tower.number}` || tower.name === `Torre${tower.number}`
                                                    ? `Torre ${tower.number}`
                                                    : `Torre ${tower.number} - ${tower.name}`
                                                return (
                                                    <option key={tower.id} value={tower.id}>
                                                        {displayName}
                                                    </option>
                                                )
                                            })}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Filtro por Piso */}
                                <div className="group">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Layers className="w-4 h-4 text-cyan-400" />
                                        <h3 className="text-sm font-medium text-slate-300">
                                            Piso
                                        </h3>
                                    </div>
                                    <div className="relative">
                                        <select
                                            className={`w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all appearance-none text-sm hover:border-slate-600 ${currentTowerFilter === 'all' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={currentFloorFilter}
                                            onChange={(e) => onFloorFilterChange(e.target.value)}
                                            disabled={currentTowerFilter === 'all'}
                                        >
                                            <option value="all">
                                                {currentTowerFilter === 'all' ? 'Selecciona una torre' : 'Todos los pisos'}
                                            </option>
                                            {floors.map((floor) => (
                                                <option key={floor.id} value={floor.id}>
                                                    Piso {floor.floor_number}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
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
