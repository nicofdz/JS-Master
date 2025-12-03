import { X, Layers, Package, AlertTriangle, ArrowRightLeft, Calendar, Building2, User, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

interface MaterialFiltersSidebarProps {
    isOpen: boolean
    onClose: () => void
    activeTab: 'materiales' | 'historial'

    // Material Filters
    search: string
    onSearchChange: (val: string) => void
    category: string
    onCategoryChange: (val: string) => void
    lowStockOnly: boolean
    onLowStockChange: (val: boolean) => void
    categories: string[]

    // History Filters
    movementType: 'todos' | 'entrada' | 'salida'
    onMovementTypeChange: (val: 'todos' | 'entrada' | 'salida') => void
    materialId: string
    onMaterialIdChange: (val: string) => void
    projectId: string
    onProjectIdChange: (val: string) => void
    workerId: string
    onWorkerIdChange: (val: string) => void
    userId: string
    onUserIdChange: (val: string) => void
    dateFrom: string
    onDateFromChange: (val: string) => void
    dateTo: string
    onDateToChange: (val: string) => void

    // Options for History
    materials: any[]
    projects: any[]
    workers: any[]
    users: any[]
}

export function MaterialFiltersSidebar({
    isOpen,
    onClose,
    activeTab,
    search,
    onSearchChange,
    category,
    onCategoryChange,
    lowStockOnly,
    onLowStockChange,
    categories,
    movementType,
    onMovementTypeChange,
    materialId,
    onMaterialIdChange,
    projectId,
    onProjectIdChange,
    workerId,
    onWorkerIdChange,
    userId,
    onUserIdChange,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    materials,
    projects,
    workers,
    users
}: MaterialFiltersSidebarProps) {

    const handleClearFilters = () => {
        if (activeTab === 'materiales') {
            onSearchChange('')
            onCategoryChange('')
            onLowStockChange(false)
        } else {
            onMovementTypeChange('todos')
            onMaterialIdChange('')
            onProjectIdChange('')
            onWorkerIdChange('')
            onUserIdChange('')
            onDateFromChange('')
            onDateToChange('')
        }
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
                                {activeTab === 'materiales' ? 'Filtros Materiales' : 'Filtros Historial'}
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

                        {activeTab === 'materiales' ? (
                            /* --- FILTROS MATERIALES --- */
                            <div className="space-y-6">

                                {/* Category */}
                                <div className="group">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Package className="w-4 h-4 text-purple-400" />
                                        <h3 className="text-sm font-medium text-slate-300">Categoría</h3>
                                    </div>
                                    <div className="relative">
                                        <Select
                                            className="appearance-none"
                                            value={category}
                                            onChange={(e) => onCategoryChange(e.target.value)}
                                        >
                                            <option value="">Todas las categorías</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </Select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-800 my-6" />

                                {/* Low Stock */}
                                <div className="group">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                                        <h3 className="text-sm font-medium text-slate-300">Stock</h3>
                                    </div>
                                    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-[#1e293b] cursor-pointer hover:border-slate-600 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={lowStockOnly}
                                            onChange={(e) => onLowStockChange(e.target.checked)}
                                            className="w-5 h-5 rounded border-slate-600 text-blue-600 focus:ring-blue-500/50 bg-slate-800"
                                        />
                                        <span className="text-sm text-slate-300">Solo bajo stock</span>
                                    </label>
                                </div>

                            </div>
                        ) : (
                            /* --- FILTROS HISTORIAL --- */
                            <div className="space-y-6">

                                {/* Movement Type */}
                                <div className="group">
                                    <div className="flex items-center gap-2 mb-3">
                                        <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                                        <h3 className="text-sm font-medium text-slate-300">Tipo de Movimiento</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 p-1 bg-[#1e293b] rounded-xl border border-slate-700">
                                        <button
                                            onClick={() => onMovementTypeChange('todos')}
                                            className={`py-2 text-xs font-medium rounded-lg transition-all ${movementType === 'todos'
                                                ? 'bg-blue-600 text-white shadow-lg'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                                }`}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            onClick={() => onMovementTypeChange('entrada')}
                                            className={`py-2 text-xs font-medium rounded-lg transition-all ${movementType === 'entrada'
                                                ? 'bg-emerald-600 text-white shadow-lg'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                                }`}
                                        >
                                            Entrada
                                        </button>
                                        <button
                                            onClick={() => onMovementTypeChange('salida')}
                                            className={`py-2 text-xs font-medium rounded-lg transition-all ${movementType === 'salida'
                                                ? 'bg-red-600 text-white shadow-lg'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                                }`}
                                        >
                                            Salida
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-800 my-6" />

                                {/* Material */}
                                <div className="group">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Package className="w-4 h-4 text-purple-400" />
                                        <h3 className="text-sm font-medium text-slate-300">Material</h3>
                                    </div>
                                    <div className="relative">
                                        <Select
                                            className="appearance-none"
                                            value={materialId}
                                            onChange={(e) => onMaterialIdChange(e.target.value)}
                                        >
                                            <option value="">Todos los materiales</option>
                                            {materials.map(mat => (
                                                <option key={mat.id} value={mat.id.toString()}>{mat.name}</option>
                                            ))}
                                        </Select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Project */}
                                <div className="group mt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Building2 className="w-4 h-4 text-orange-400" />
                                        <h3 className="text-sm font-medium text-slate-300">Proyecto</h3>
                                    </div>
                                    <div className="relative">
                                        <Select
                                            className="appearance-none"
                                            value={projectId}
                                            onChange={(e) => onProjectIdChange(e.target.value)}
                                        >
                                            <option value="">Todos los proyectos</option>
                                            {projects.map(proj => (
                                                <option key={proj.id} value={proj.id.toString()}>{proj.name}</option>
                                            ))}
                                        </Select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Worker */}
                                <div className="group mt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <User className="w-4 h-4 text-emerald-400" />
                                        <h3 className="text-sm font-medium text-slate-300">Trabajador</h3>
                                    </div>
                                    <div className="relative">
                                        <Select
                                            className="appearance-none"
                                            value={workerId}
                                            onChange={(e) => onWorkerIdChange(e.target.value)}
                                        >
                                            <option value="">Todos los trabajadores</option>
                                            {workers.map(worker => (
                                                <option key={worker.id} value={worker.id.toString()}>{worker.full_name}</option>
                                            ))}
                                        </Select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* User */}
                                <div className="group mt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <UserCircle className="w-4 h-4 text-cyan-400" />
                                        <h3 className="text-sm font-medium text-slate-300">Usuario</h3>
                                    </div>
                                    <div className="relative">
                                        <Select
                                            className="appearance-none"
                                            value={userId}
                                            onChange={(e) => onUserIdChange(e.target.value)}
                                        >
                                            <option value="">Todos los usuarios</option>
                                            {users.map(usr => (
                                                <option key={usr.id} value={usr.id}>
                                                    {usr.full_name} {usr.email ? `(${usr.email})` : ''}
                                                </option>
                                            ))}
                                        </Select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-800 my-6" />

                                {/* Date Range */}
                                <div className="group">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <h3 className="text-sm font-medium text-slate-300">Rango de Fechas</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Desde</label>
                                            <Input
                                                type="date"
                                                value={dateFrom}
                                                onChange={(e) => onDateFromChange(e.target.value)}
                                                className="bg-[#1e293b] border-slate-700 text-slate-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
                                            <Input
                                                type="date"
                                                value={dateTo}
                                                onChange={(e) => onDateToChange(e.target.value)}
                                                className="bg-[#1e293b] border-slate-700 text-slate-200"
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}

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
