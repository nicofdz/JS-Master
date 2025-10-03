'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useWorkerPayments } from '@/hooks/useWorkerPayments'
import { DollarSign, Calendar, Clock, CheckCircle, Eye, ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface WorkerPaymentHistoryProps {
  workerId: number
  workerName: string
  onClose: () => void
  onPaymentChanged?: () => void
}

interface PaymentHistoryItem {
  payment_id: number
  payment_date: string
  total_amount: number
  tasks_count: number
  work_days: number
  payment_status: string
  notes?: string
  created_at: string
}

interface PaymentTaskDetail {
  task_id: number
  task_name: string
  project_name: string
  apartment_number: string
  task_payment_amount: number
  task_status: string
  task_created_at: string
}

export function WorkerPaymentHistory({ workerId, workerName, onClose, onPaymentChanged }: WorkerPaymentHistoryProps) {
  const { getWorkerPaymentHistory, getPaymentTaskDetails, updatePayment, deletePayment } = useWorkerPayments()
  const [history, setHistory] = useState<PaymentHistoryItem[]>([])
  const [selectedPayment, setSelectedPayment] = useState<number | null>(null)
  const [taskDetails, setTaskDetails] = useState<PaymentTaskDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [workerId])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const data = await getWorkerPaymentHistory(workerId)
      setHistory(data)
    } catch (error) {
      console.error('Error fetching payment history:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTaskDetails = async (paymentId: number) => {
    try {
      setLoadingDetails(true)
      const data = await getPaymentTaskDetails(paymentId)
      setTaskDetails(data)
    } catch (error) {
      console.error('Error fetching task details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleViewDetails = (paymentId: number) => {
    setSelectedPayment(paymentId)
    fetchTaskDetails(paymentId)
  }

  const handleCloseDetails = () => {
    setSelectedPayment(null)
    setTaskDetails([])
  }

  const handleEditPayment = (payment: PaymentHistoryItem) => {
    // Aquí podrías abrir un modal de edición o navegar a una página de edición
    const newAmount = prompt(`Editar monto del pago #${payment.payment_id}:`, payment.total_amount.toString())
    if (newAmount && !isNaN(Number(newAmount)) && Number(newAmount) > 0) {
      updatePayment(payment.payment_id, Number(newAmount))
        .then(() => {
          // Recargar el historial después de la actualización
          fetchHistory()
          // Notificar al componente padre que los datos han cambiado
          if (onPaymentChanged) {
            onPaymentChanged()
          }
        })
        .catch((error) => {
          console.error('Error updating payment:', error)
          alert('Error al actualizar el pago')
        })
    }
  }

  const handleDeletePayment = (payment: PaymentHistoryItem) => {
    if (confirm(`¿Está seguro de que desea eliminar el pago #${payment.payment_id} por ${formatCurrency(payment.total_amount)}? Esta acción no se puede deshacer.`)) {
      deletePayment(payment.payment_id)
        .then(() => {
          // Recargar el historial después de la eliminación
          fetchHistory()
          // Notificar al componente padre que los datos han cambiado
          if (onPaymentChanged) {
            onPaymentChanged()
          }
        })
        .catch((error) => {
          console.error('Error deleting payment:', error)
          alert('Error al eliminar el pago')
        })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
      case 'cancelled': return 'bg-red-500/20 text-red-400 border border-red-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado'
      case 'pending': return 'Pendiente'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="text-center py-8 text-slate-300">Cargando historial de pagos...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-6xl max-h-[80vh] overflow-y-auto w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-100">Historial de Pagos - {workerName}</h3>
            <p className="text-sm text-slate-400">Registro completo de pagos realizados</p>
          </div>
          <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        {selectedPayment ? (
          // Vista de detalles de un pago específico
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-medium text-slate-100">Detalles del Pago #{selectedPayment}</h4>
              <Button variant="outline" onClick={handleCloseDetails}>
                ← Volver al historial
              </Button>
            </div>

            {loadingDetails ? (
              <div className="text-center py-8 text-slate-300">Cargando detalles...</div>
            ) : (
              <div className="space-y-4">
                <Card className="bg-slate-700/30 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-100">Tareas Incluidas en este Pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {taskDetails.length === 0 ? (
                      <div className="text-center py-4 text-slate-400">
                        No hay detalles de tareas disponibles
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-600">
                          <thead className="bg-slate-700/50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase">
                                Tarea
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase">
                                Proyecto
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase">
                                Apartamento
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase">
                                Monto
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase">
                                Fecha
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-slate-800/50 divide-y divide-slate-600">
                            {taskDetails.map((task) => (
                              <tr key={task.task_id} className="hover:bg-slate-700/30">
                                <td className="px-4 py-2 text-sm font-medium text-slate-100">
                                  {task.task_name}
                                </td>
                                <td className="px-4 py-2 text-sm text-slate-300">
                                  {task.project_name}
                                </td>
                                <td className="px-4 py-2 text-sm text-slate-300">
                                  {task.apartment_number}
                                </td>
                                <td className="px-4 py-2 text-sm font-medium text-emerald-400">
                                  {formatCurrency(task.task_payment_amount)}
                                </td>
                                <td className="px-4 py-2 text-sm text-slate-300">
                                  {formatDate(task.task_created_at)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : (
          // Vista del historial completo
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No hay historial de pagos para este trabajador
              </div>
            ) : (
              <div className="grid gap-4">
                {history.map((payment, index) => (
                  <Card key={payment.payment_id} className="bg-slate-700/30 border-slate-600 hover:bg-slate-700/40 hover:shadow-lg transition-all">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <h4 className="text-lg font-medium text-slate-100">
                              Pago #{index + 1}
                            </h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.payment_status)}`}>
                              {getStatusText(payment.payment_status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-emerald-400" />
                              <span className="font-medium text-slate-100">{formatCurrency(payment.total_amount)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-blue-400" />
                              <span className="text-slate-200">{payment.tasks_count} tareas</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-orange-400" />
                              <span className="text-slate-200">{payment.work_days} días trabajados</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-200">{formatDate(payment.payment_date)}</span>
                            </div>
                          </div>

                          {payment.notes && (
                            <div className="mt-2 p-2 bg-slate-600/30 border border-slate-500 rounded text-sm">
                              <strong className="text-slate-200">Notas:</strong> <span className="text-slate-300">{payment.notes}</span>
                            </div>
                          )}
                        </div>

                        <div className="ml-4 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(payment.payment_id)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPayment(payment)}
                            className="flex items-center gap-1 text-blue-400 border-blue-600 hover:bg-blue-900/30"
                          >
                            <Edit className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePayment(payment)}
                            className="flex items-center gap-1 text-red-400 border-red-600 hover:bg-red-900/30"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
