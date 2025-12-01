'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FileText, Calendar, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PaymentTask {
    id: number
    task_name: string
    apartment_number: string
    project_name: string
    worker_payment: number
    completed_at?: string
    paid_at?: string
}

interface PaymentTasksModalProps {
    isOpen: boolean
    onClose: () => void
    paymentId: number
    workerName: string
    paymentDate: string
    totalAmount: number
}

export function PaymentTasksModal({
    isOpen,
    onClose,
    paymentId,
    workerName,
    paymentDate,
    totalAmount
}: PaymentTasksModalProps) {
    const [tasks, setTasks] = useState<PaymentTask[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen && paymentId) {
            loadTasks()
        }
    }, [isOpen, paymentId])

    const loadTasks = async () => {
        setLoading(true)
        try {
            // Obtener las asignaciones de tareas pagadas en este pago
            const { data: paymentAssignments, error: paymentError } = await supabase
                .from('payment_task_assignments')
                .select(`
          task_assignment_id,
          amount_paid,
          task_assignments!inner(
            id,
            task_id,
            worker_payment,
            completed_at,
            tasks!inner(
              id,
              task_name,
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
          )
        `)
                .eq('payment_id', paymentId)

            if (paymentError) throw paymentError

            const tasksData: PaymentTask[] = (paymentAssignments || []).map(pa => {
                const assignment = pa.task_assignments as any
                const task = assignment.tasks
                const apartment = task.apartments
                const project = apartment.floors.projects

                return {
                    id: assignment.id,
                    task_name: task.task_name,
                    apartment_number: apartment.apartment_number,
                    project_name: project.name,
                    worker_payment: Number(pa.amount_paid || assignment.worker_payment || 0),
                    completed_at: assignment.completed_at,
                    paid_at: paymentDate
                }
            })

            setTasks(tasksData)
        } catch (err: any) {
            console.error('Error cargando tareas del pago:', err)
            setTasks([])
        } finally {
            setLoading(false)
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
            title={`Tareas del Pago - ${workerName}`}
            size="xl"
        >
            <div className="space-y-4">
                {/* Resumen del pago */}
                <Card className="bg-slate-700/30 border-slate-600">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Fecha del Pago</div>
                                <div className="text-lg font-semibold text-slate-100">{formatDate(paymentDate)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-400 mb-1">Total Pagado</div>
                                <div className="text-lg font-semibold text-blue-400">{formatCurrency(totalAmount)}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de tareas */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {loading ? (
                        <Card className="bg-slate-700/30 border-slate-600">
                            <CardContent className="p-8 text-center">
                                <p className="text-slate-400">Cargando tareas...</p>
                            </CardContent>
                        </Card>
                    ) : tasks.length === 0 ? (
                        <Card className="bg-slate-700/30 border-slate-600">
                            <CardContent className="p-8 text-center">
                                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">No hay tareas en este pago</p>
                            </CardContent>
                        </Card>
                    ) : (
                        tasks.map(task => (
                            <Card key={task.id} className="bg-slate-700/30 border-slate-600">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <FileText className="w-5 h-5 text-blue-400" />
                                                <span className="font-semibold text-slate-100">{task.task_name}</span>
                                                <Badge className="bg-emerald-900/30 text-emerald-400 border-emerald-500">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Pagada
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
