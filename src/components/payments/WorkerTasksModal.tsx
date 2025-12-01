'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { FileText, Calendar, CheckCircle, Clock } from 'lucide-react'

interface Task {
    id: number
    task_name: string
    apartment_number: string
    project_name: string
    assignment_status: string
    worker_payment: number
    completed_at?: string
    paid_at?: string
    payment_id?: number
    contract_id?: number
    contract_start?: string
    contract_end?: string
    contract_number?: string
}

interface WorkerTasksModalProps {
    isOpen: boolean
    onClose: () => void
    worker: {
        id: number
        name: string
        rut: string
    }
    tasks: Task[]
}

export function WorkerTasksModal({ isOpen, onClose, worker, tasks }: WorkerTasksModalProps) {
    const currentDate = new Date()
    const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending')
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all')

    // Filtrar tareas según el tab activo
    const filteredTasks = useMemo(() => {
        let filtered = tasks.filter(task => {
            if (activeTab === 'pending') {
                return task.assignment_status === 'completed' && !task.paid_at
            } else {
                return task.paid_at !== null && task.paid_at !== undefined
            }
        })

        // Filtrar por mes
        if (selectedMonth !== 'all') {
            filtered = filtered.filter(task => {
                const taskDate = task.completed_at ? new Date(task.completed_at) :
                    (task.paid_at ? new Date(task.paid_at) : null)
                if (!taskDate) return false
                return taskDate.getFullYear() === selectedYear && (taskDate.getMonth() + 1) === selectedMonth
            })
        } else {
            // Si es "todos los meses", filtrar solo por año
            filtered = filtered.filter(task => {
                const taskDate = task.completed_at ? new Date(task.completed_at) :
                    (task.paid_at ? new Date(task.paid_at) : null)
                if (!taskDate) return false
                return taskDate.getFullYear() === selectedYear
            })
        }

        return filtered
    }, [tasks, activeTab, selectedYear, selectedMonth])

    // Generar opciones de meses
    const monthOptions = [
        { value: 'all', label: 'Todos los meses' },
        { value: 1, label: 'Enero' },
        { value: 2, label: 'Febrero' },
        { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Mayo' },
        { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' },
        { value: 11, label: 'Noviembre' },
        { value: 12, label: 'Diciembre' }
    ]

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A'
        const date = new Date(dateString)
        return date.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    const pendingTotal = filteredTasks
        .filter(t => t.assignment_status === 'completed' && !t.paid_at)
        .reduce((sum, t) => sum + t.worker_payment, 0)

    const paidTotal = filteredTasks
        .filter(t => t.paid_at)
        .reduce((sum, t) => sum + t.worker_payment, 0)

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Tareas de ${worker.name}`}
            size="xl"
        >
            <div className="space-y-4">
                {/* Tabs */}
                <div className="flex gap-2 bg-slate-700/50 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'pending'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Pendientes ({tasks.filter(t => t.assignment_status === 'completed' && !t.paid_at).length})
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('paid')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'paid'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Pagadas ({tasks.filter(t => t.paid_at).length})
                        </div>
                    </button>
                </div>

                {/* Filtros por mes */}
                <Card className="bg-slate-700/30 border-slate-600">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Mes</label>
                                <Select
                                    value={selectedMonth === 'all' ? 'all' : selectedMonth.toString()}
                                    onChange={(e) => {
                                        const value = e.target.value
                                        if (value === 'all') {
                                            setSelectedMonth('all')
                                        } else {
                                            setSelectedMonth(parseInt(value))
                                        }
                                    }}
                                >
                                    {monthOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Año</label>
                                <Select
                                    value={selectedYear.toString()}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                >
                                    {Array.from({ length: 5 }, (_, i) => {
                                        const year = currentDate.getFullYear() - 2 + i
                                        return (
                                            <option key={year} value={year.toString()}>
                                                {year}
                                            </option>
                                        )
                                    })}
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Resumen */}
                <div className="flex gap-4">
                    <Card className="bg-slate-700/30 border-slate-600 flex-1">
                        <CardContent className="p-4">
                            <div className="text-sm text-slate-400 mb-1">
                                {activeTab === 'pending' ? 'Total Pendiente' : 'Total Pagado'}
                            </div>
                            <div className="text-2xl font-bold text-blue-400">
                                {formatCurrency(activeTab === 'pending' ? pendingTotal : paidTotal)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-700/30 border-slate-600 flex-1">
                        <CardContent className="p-4">
                            <div className="text-sm text-slate-400 mb-1">Tareas {activeTab === 'pending' ? 'Pendientes' : 'Pagadas'}</div>
                            <div className="text-2xl font-bold text-slate-200">
                                {filteredTasks.length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Lista de tareas */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredTasks.length === 0 ? (
                        <Card className="bg-slate-700/30 border-slate-600">
                            <CardContent className="p-8 text-center">
                                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">
                                    No hay tareas {activeTab === 'pending' ? 'pendientes' : 'pagadas'}
                                    {selectedMonth !== 'all' ? ' en el período seleccionado' : ''}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredTasks.map(task => (
                            <Card key={task.id} className="bg-slate-700/30 border-slate-600">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <FileText className="w-5 h-5 text-blue-400" />
                                                <span className="font-semibold text-slate-100">{task.task_name}</span>
                                                <Badge className={
                                                    task.assignment_status === 'completed'
                                                        ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500'
                                                        : 'bg-yellow-900/30 text-yellow-400 border-yellow-500'
                                                }>
                                                    {task.assignment_status === 'completed' ? 'Completada' : 'En Progreso'}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-slate-400 space-y-1 ml-8">
                                                <div>📍 {task.project_name} - {task.apartment_number}</div>
                                                {task.completed_at && (
                                                    <div>✅ Completada: {formatDate(task.completed_at)}</div>
                                                )}
                                                {task.paid_at && (
                                                    <div>💰 Pagada: {formatDate(task.paid_at)}</div>
                                                )}
                                                {activeTab === 'paid' && task.contract_number && (
                                                    <div className="mt-2 pt-2 border-t border-slate-600">
                                                        <div className="font-medium text-slate-300 mb-1">Información del Contrato:</div>
                                                        <div>📄 Contrato: {task.contract_number}</div>
                                                        {task.contract_start && (
                                                            <div>📅 Inicio: {formatDate(task.contract_start)}</div>
                                                        )}
                                                        {task.contract_end && (
                                                            <div>📅 Fin: {formatDate(task.contract_end)}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right ml-4">
                                            <div className="text-sm text-slate-400 mb-1">Monto</div>
                                            <div className="text-lg font-bold text-blue-400">
                                                {formatCurrency(task.worker_payment)}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    )
}
