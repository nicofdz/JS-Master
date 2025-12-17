'use client'

import { X, Layers, Building2, Building, User, Home, Search, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface TaskFiltersSidebarProps {
    isOpen: boolean
    onClose: () => void

    // Filters
    currentProjectFilter: string
    onProjectFilterChange: (filter: string) => void

    currentWorkerFilter: string
    onWorkerFilterChange: (filter: string) => void

    currentTowerFilter: string
    onTowerFilterChange: (filter: string) => void

    currentFloorFilter: string
    onFloorFilterChange: (filter: string) => void

    currentApartmentFilter: string
    onApartmentFilterChange: (filter: string) => void

    // Date Filters
    dateFilterType: 'all' | 'specific' | 'range' | 'month' | 'year'
    onDateFilterTypeChange: (type: 'all' | 'specific' | 'range' | 'month' | 'year') => void
    dateStart: string
    onDateStartChange: (date: string) => void
    dateEnd: string
    onDateEndChange: (date: string) => void

    // Data
    projects: { id: number; name: string }[]
    workers: { id: number; full_name: string }[]
    towers: any[]
    floors: any[]
    apartments: any[]
}

export function TaskFiltersSidebar({
    isOpen,
    onClose,
    currentProjectFilter,
    onProjectFilterChange,
    currentWorkerFilter,
    onWorkerFilterChange,
    currentTowerFilter,
    onTowerFilterChange,
    currentFloorFilter,
    onFloorFilterChange,
    currentApartmentFilter,
    onApartmentFilterChange,

    dateFilterType,
    onDateFilterTypeChange,
    dateStart,
    onDateStartChange,
    dateEnd,
    onDateEndChange,

    projects,
    workers,
    towers,
    floors,
    apartments
}: TaskFiltersSidebarProps) {

    const handleClearFilters = () => {
        onProjectFilterChange('all')
        onWorkerFilterChange('all')
        onTowerFilterChange('all')
        onFloorFilterChange('all')
        onApartmentFilterChange('all')
        onDateFilterTypeChange('all')
        onDateStartChange('')
        onDateEndChange('')
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

                            {/* Filtro de Fecha */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-4 h-4 text-orange-400" />
                                    <h3 className="text-sm font-medium text-slate-300">
                                        Fecha de Inicio
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    <select
                                        className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all appearance-none text-sm hover:border-slate-600"
                                        value={dateFilterType}
                                        onChange={(e) => onDateFilterTypeChange(e.target.value as any)}
                                    >
                                        <option value="all">Cualquier fecha</option>
                                        <option value="specific">Fecha específica</option>
                                        <option value="range">Rango de fechas</option>
                                        <option value="month">Mes</option>
                                        <option value="year">Año</option>
                                    </select>

                                    {/* Inputs dinámicos según tipo */}
                                    {dateFilterType === 'specific' && (
                                        <input
                                            type="date"
                                            value={dateStart}
                                            onChange={(e) => onDateStartChange(e.target.value)}
                                            className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        />
                                    )}

                                    {dateFilterType === 'range' && (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-xs text-slate-500 ml-1">Desde</label>
                                                <input
                                                    type="date"
                                                    value={dateStart}
                                                    onChange={(e) => onDateStartChange(e.target.value)}
                                                    className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 ml-1">Hasta</label>
                                                <input
                                                    type="date"
                                                    value={dateEnd}
                                                    onChange={(e) => onDateEndChange(e.target.value)}
                                                    className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {dateFilterType === 'month' && (
                                        <input
                                            type="month"
                                            value={dateStart} // YYYY-MM
                                            onChange={(e) => onDateStartChange(e.target.value)}
                                            className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        />
                                    )}

                                    {dateFilterType === 'year' && (
                                        <input
                                            type="number"
                                            placeholder="YYYY"
                                            min="2000"
                                            max="2100"
                                            value={dateStart}
                                            onChange={(e) => onDateStartChange(e.target.value)}
                                            className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        />
                                    )}
                                </div>
                            </div>

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
                                        value={currentProjectFilter || 'all'}
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

                            {/* Filtro por Trabajador */}
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
                                        {workers.map((worker) => (
                                            <option key={worker.id} value={worker.id}>{worker.full_name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
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
                                        className={`w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none text-sm hover:border-slate-600 ${(!currentProjectFilter || currentProjectFilter === 'all') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        value={currentTowerFilter}
                                        onChange={(e) => onTowerFilterChange(e.target.value)}
                                        disabled={!currentProjectFilter || currentProjectFilter === 'all'}
                                    >
                                        <option value="all">
                                            {(!currentProjectFilter || currentProjectFilter === 'all') ? 'Selecciona proyecto' : 'Selecciona torre'}
                                        </option>
                                        {towers.map((tower) => (
                                            <option key={tower.id} value={tower.id}>
                                                Torre {tower.number} {tower.name ? `- ${tower.name}` : ''}
                                            </option>
                                        ))}
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
                                            {currentTowerFilter === 'all' ? 'Selecciona torre' : 'Selecciona piso'}
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

                            {/* Filtro por Apartamento */}
                            <div className="group">
                                <div className="flex items-center gap-2 mb-3">
                                    <Home className="w-4 h-4 text-pink-400" />
                                    <h3 className="text-sm font-medium text-slate-300">
                                        Apartamento
                                    </h3>
                                </div>
                                <div className="relative">
                                    <select
                                        className={`w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-all appearance-none text-sm hover:border-slate-600 ${currentFloorFilter === 'all' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        value={currentApartmentFilter}
                                        onChange={(e) => onApartmentFilterChange(e.target.value)}
                                        disabled={currentFloorFilter === 'all'}
                                    >
                                        <option value="all">
                                            {currentFloorFilter === 'all' ? 'Selecciona piso' : 'Selecciona apartamento'}
                                        </option>
                                        {apartments.map((apt) => (
                                            <option key={apt.id} value={apt.id}>
                                                Depto {apt.number}
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
