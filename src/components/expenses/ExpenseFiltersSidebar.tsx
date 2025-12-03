import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

interface Project {
    id: number
    name: string
}

interface ExpenseFiltersSidebarProps {
    isOpen: boolean
    onClose: () => void
    projectFilter: string
    onProjectChange: (val: string) => void
    monthFilter: string
    onMonthChange: (val: string) => void
    yearFilter: string
    onYearChange: (val: string) => void
    typeFilter: string
    onTypeChange: (val: string) => void
    documentTypeFilter: string
    onDocumentTypeChange: (val: string) => void
    ivaFilter: boolean
    onIvaChange: (val: boolean) => void
    projects: Project[]
}

export function ExpenseFiltersSidebar({
    isOpen,
    onClose,
    projectFilter,
    onProjectChange,
    monthFilter,
    onMonthChange,
    yearFilter,
    onYearChange,
    typeFilter,
    onTypeChange,
    documentTypeFilter,
    onDocumentTypeChange,
    ivaFilter,
    onIvaChange,
    projects
}: ExpenseFiltersSidebarProps) {

    const handleClearFilters = () => {
        onProjectChange('all')
        onMonthChange('all')
        onYearChange('all')
        onTypeChange('all')
        onDocumentTypeChange('all')
        onIvaChange(false)
    }

    const months = [
        { value: 'all', label: 'Todos los meses' },
        { value: '01', label: 'Enero' },
        { value: '02', label: 'Febrero' },
        { value: '03', label: 'Marzo' },
        { value: '04', label: 'Abril' },
        { value: '05', label: 'Mayo' },
        { value: '06', label: 'Junio' },
        { value: '07', label: 'Julio' },
        { value: '08', label: 'Agosto' },
        { value: '09', label: 'Septiembre' },
        { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' },
        { value: '12', label: 'Diciembre' }
    ]

    const years = [
        { value: 'all', label: 'Todos los años' },
        { value: '2023', label: '2023' },
        { value: '2024', label: '2024' },
        { value: '2025', label: '2025' },
        { value: '2026', label: '2026' }
    ]

    const expenseTypes = [
        { value: 'all', label: 'Todos los tipos' },
        { value: 'materiales', label: 'Materiales' },
        { value: 'servicios', label: 'Servicios' },
        { value: 'epp', label: 'EPP' },
        { value: 'combustible', label: 'Combustible' },
        { value: 'herramientas', label: 'Herramientas' },
        { value: 'otros', label: 'Otros' },
        { value: 'cancelled', label: 'Gastos Anulados' }
    ]

    const documentTypes = [
        { value: 'all', label: 'Boleta / Factura' },
        { value: 'boleta', label: 'Boleta' },
        { value: 'factura', label: 'Factura' }
    ]

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
            <div className={`fixed right-0 top-0 h-full w-80 bg-slate-900 border-l border-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-100">Filtros</h2>
                        <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Proyecto */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Proyecto</label>
                            <Select
                                value={projectFilter}
                                onChange={(e) => onProjectChange(e.target.value)}
                                className="w-full bg-slate-800 border-slate-700 text-slate-200"
                            >
                                <option value="all">Todos los proyectos</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id.toString()}>
                                        {project.name}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        {/* Año */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Año</label>
                            <Select
                                value={yearFilter}
                                onChange={(e) => onYearChange(e.target.value)}
                                className="w-full bg-slate-800 border-slate-700 text-slate-200"
                            >
                                {years.map(year => (
                                    <option key={year.value} value={year.value}>
                                        {year.label}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        {/* Mes */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Mes</label>
                            <Select
                                value={monthFilter}
                                onChange={(e) => onMonthChange(e.target.value)}
                                className="w-full bg-slate-800 border-slate-700 text-slate-200"
                            >
                                {months.map(month => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        {/* Tipo de Gasto */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Categoría</label>
                            <Select
                                value={typeFilter}
                                onChange={(e) => onTypeChange(e.target.value)}
                                className="w-full bg-slate-800 border-slate-700 text-slate-200"
                            >
                                {expenseTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        {/* Tipo de Documento */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Documento</label>
                            <Select
                                value={documentTypeFilter}
                                onChange={(e) => onDocumentTypeChange(e.target.value)}
                                className="w-full bg-slate-800 border-slate-700 text-slate-200"
                            >
                                {documentTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        {/* IVA Recuperable */}
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={ivaFilter}
                                    onChange={(e) => onIvaChange(e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-blue-600 rounded border-slate-700 bg-slate-800 focus:ring-blue-500 focus:ring-offset-slate-900"
                                />
                                <span className="text-sm font-medium text-slate-300">Solo IVA Recuperable</span>
                            </label>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-800 bg-slate-900">
                        <Button
                            variant="outline"
                            className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
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
