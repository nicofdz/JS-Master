'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FileText, CheckCircle2, AlertCircle, DollarSign, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface TaskAssignment {
    id: number
    task_id: number
    task_name: string
    apartment_number: string
    project_name: string
    worker_payment: number
    completed_at?: string
}

interface ProcessTaskPaymentModalProps {
    isOpen: boolean
    onClose: () => void
    worker: {
        id: number
        name: string
        rut: string
    }
    onPaymentProcessed: () => void
}

export function ProcessTaskPaymentModal({
    isOpen,
    onClose,
    worker,
    onPaymentProcessed
}: ProcessTaskPaymentModalProps) {
    const [tasks, setTasks] = useState<TaskAssignment[]>([])
    const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())
    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [notes, setNotes] = useState('')
    const [paymentMode, setPaymentMode] = useState<'all' | 'partial'>('all')

    // Cargar tareas pendientes al abrir el modal
    useEffect(() => {
        if (isOpen && worker.id) {
            loadPendingTasks()
        } else {
            // Limpiar estado al cerrar
            setTasks([])
            setSelectedTasks(new Set())
            setNotes('')
            setPaymentMode('all')
        }
    }, [isOpen, worker.id])

    const loadPendingTasks = async () => {
        setLoading(true)
        try {
            // Obtener asignaciones pendientes de pago del trabajador
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from('task_assignments')
                .select(`
          id,
          task_id,
          worker_payment,
          completed_at,
          assignment_status,
          tasks!inner(
            id,
            task_name,
            status,
            apartment_id,
            apartments!inner(
              id,
              apartment_number,
              floor_id,
              floors!inner(
                id,
                project_id,
                projects!inner(id, name)
              )
            )
          )
        `)
                .eq('worker_id', worker.id)
                .eq('contract_type', 'a_trato')
                .eq('assignment_status', 'completed')
                .eq('is_paid', false)
                .eq('is_deleted', false)
                .gt('worker_payment', 0)

            if (assignmentsError) throw assignmentsError

            // Transformar datos
            const tasksData: TaskAssignment[] = (assignmentsData || [])
                .filter(a => {
                    const task = (a.tasks as any)
                    return task && task.status === 'completed' && !task.is_deleted
                })
                .map(a => {
                    const task = (a.tasks as any)
                    const apartment = task.apartments
                    const project = apartment.floors.projects

                    return {
                        id: a.id,
                        task_id: task.id,
                        task_name: task.task_name,
                        apartment_number: apartment.apartment_number,
                        project_name: project.name,
                        worker_payment: Number(a.worker_payment || 0),
                        completed_at: a.completed_at
                    }
                })

            setTasks(tasksData)

            // Si hay tareas, seleccionar todas por defecto
            if (tasksData.length > 0) {
                setSelectedTasks(new Set(tasksData.map(t => t.id)))
            }
        } catch (err: any) {
            console.error('Error cargando tareas pendientes:', err)
            toast.error('Error al cargar tareas pendientes')
            setTasks([])
        } finally {
            setLoading(false)
        }
    }

    // Calcular total de tareas seleccionadas
    const selectedTotal = useMemo(() => {
        return tasks
            .filter(t => selectedTasks.has(t.id))
            .reduce((sum, t) => sum + t.worker_payment, 0)
    }, [tasks, selectedTasks])

    const selectedCount = selectedTasks.size

    // Toggle selección de tarea (solo funciona en modo parcial)
    const toggleTaskSelection = (taskId: number) => {
        if (paymentMode !== 'partial') {
            return // No permitir cambiar selección en modo completo
        }
        setSelectedTasks(prev => {
            const newSet = new Set(prev)
            if (newSet.has(taskId)) {
                newSet.delete(taskId)
            } else {
                newSet.add(taskId)
            }
            return newSet
        })
    }

    // Seleccionar todas las tareas
    const selectAllTasks = () => {
        setSelectedTasks(new Set(tasks.map(t => t.id)))
        setPaymentMode('all')
    }

    // Deseleccionar todas
    const deselectAllTasks = () => {
        setSelectedTasks(new Set())
    }

    // Cambiar modo de pago
    useEffect(() => {
        if (paymentMode === 'all') {
            // En modo completo, seleccionar todas las tareas y no permitir desmarcar
            setSelectedTasks(new Set(tasks.map(t => t.id)))
        }
        // En modo parcial, mantener la selección actual
    }, [paymentMode, tasks])

    const handleProcessPayment = async () => {
        if (selectedTasks.size === 0) {
            toast.error('Debe seleccionar al menos una tarea para pagar')
            return
        }

        if (selectedTotal <= 0) {
            toast.error('El monto total debe ser mayor a 0')
            return
        }

        try {
            setProcessing(true)
            toast.loading('Procesando pago...', { id: 'processing-payment' })

            // Llamar a la función RPC
            const assignmentIds = paymentMode === 'partial' && selectedTasks.size > 0
                ? Array.from(selectedTasks)
                : null

            const { data: paymentId, error: paymentError } = await supabase.rpc(
                'process_worker_payment_v2',
                {
                    p_worker_id: worker.id,
                    p_payment_amount: selectedTotal,
                    p_payment_notes: notes.trim() || null,
                    p_assignment_ids: assignmentIds
                }
            )

            if (paymentError) throw paymentError

            toast.success(`Pago procesado exitosamente por ${formatCurrency(selectedTotal)}`, {
                id: 'processing-payment'
            })

            // Cerrar modal y refrescar datos
            onClose()
            onPaymentProcessed()
        } catch (err: any) {
            console.error('Error procesando pago:', err)
            toast.error(err.message || 'Error al procesar el pago', { id: 'processing-payment' })
        } finally {
            setProcessing(false)
        }
    }

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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Procesar Pago - ${worker.name}`}
            size="xl"
        >
            <div className="space-y-6">
                {/* Información del trabajador */}
                <Card className="bg-blue-900/20 border-blue-600/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400 mb-1">Trabajador</p>
                                <p className="font-semibold text-slate-100">{worker.name}</p>
                                <p className="text-sm text-slate-400">{worker.rut}</p>
                            </div>
                            <Badge className="bg-purple-900/30 text-purple-400 border-purple-500">
                                A Trato
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Modo de pago */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Modo de Pago
                    </label>
                    <div className="flex gap-2 bg-slate-700/50 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setPaymentMode('all')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${paymentMode === 'all'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            Pago Completo
                        </button>
                        <button
                            onClick={() => setPaymentMode('partial')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${paymentMode === 'partial'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            Pago Parcial
                        </button>
                    </div>
                </div>

                {/* Lista de tareas */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                        <span className="ml-3 text-slate-400">Cargando tareas pendientes...</span>
                    </div>
                ) : tasks.length === 0 ? (
                    <Card className="bg-slate-700/30 border-slate-600">
                        <CardContent className="p-8 text-center">
                            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">
                                No hay tareas pendientes de pago para este trabajador
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Controles de selección */}
                        {paymentMode === 'partial' && (
                            <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={selectAllTasks}
                                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                                    >
                                        Seleccionar Todas
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={deselectAllTasks}
                                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                                    >
                                        Deseleccionar Todas
                                    </Button>
                                </div>
                                <span className="text-sm text-slate-400">
                                    {selectedCount} de {tasks.length} tareas seleccionadas
                                </span>
                            </div>
                        )}

                        {/* Lista de tareas */}
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {tasks.map(task => {
                                const isSelected = selectedTasks.has(task.id)
                                const canSelect = paymentMode === 'partial' // Solo en modo parcial se puede seleccionar/deseleccionar

                                return (
                                    <Card
                                        key={task.id}
                                        className={`transition-all ${isSelected
                                                ? 'bg-blue-900/30 border-blue-600'
                                                : 'bg-slate-700/30 border-slate-600'
                                            } ${paymentMode === 'partial'
                                                ? 'cursor-pointer hover:border-slate-500'
                                                : 'cursor-default'
                                            }`}
                                        onClick={() => canSelect && toggleTaskSelection(task.id)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3 flex-1">
                                                    {paymentMode === 'partial' ? (
                                                        <div
                                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 cursor-pointer ${isSelected
                                                                    ? 'bg-blue-600 border-blue-600'
                                                                    : 'border-slate-500'
                                                                }`}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                toggleTaskSelection(task.id)
                                                            }}
                                                        >
                                                            {isSelected && (
                                                                <CheckCircle2 className="w-4 h-4 text-white" />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 bg-blue-600 border-blue-600 cursor-default">
                                                            <CheckCircle2 className="w-4 h-4 text-white" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                            <span className="font-semibold text-slate-100 truncate">
                                                                {task.task_name}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-slate-400 space-y-1 ml-6">
                                                            <div>📍 {task.project_name} - {task.apartment_number}</div>
                                                            {task.completed_at && (
                                                                <div>✅ Completada: {formatDate(task.completed_at)}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <div className="text-sm text-slate-400 mb-1">Monto</div>
                                                    <div className="text-lg font-bold text-blue-400">
                                                        {formatCurrency(task.worker_payment)}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </>
                )}

                {/* Resumen y notas */}
                {tasks.length > 0 && (
                    <>
                        <Card className="bg-slate-700/30 border-slate-600">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Total a Pagar</p>
                                        <p className="text-2xl font-bold text-blue-400">
                                            {formatCurrency(selectedTotal)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-400 mb-1">Tareas Seleccionadas</p>
                                        <p className="text-2xl font-bold text-slate-200">
                                            {selectedCount}
                                        </p>
                                    </div>
                                </div>

                                {/* Campo de notas */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Notas (opcional)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Agregar notas sobre este pago..."
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        rows={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Botones */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={processing}
                                className="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleProcessPayment}
                                disabled={processing || selectedTasks.size === 0 || selectedTotal <= 0}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <DollarSign className="w-4 h-4 mr-2" />
                                        Procesar Pago
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}
