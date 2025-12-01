'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { DollarSign, Calendar, ArrowLeft, Trash2, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface DailyPaymentHistoryProps {
  workerId: number
  workerName: string
  onClose: () => void
  onPaymentChanged?: () => void
}

interface DailyPaymentHistoryItem {
  id: number
  payment_month: number
  payment_year: number
  days_worked: number
  daily_rate: number
  total_amount: number
  payment_date: string
  notes?: string
}

export function DailyPaymentHistory({ workerId, workerName, onClose, onPaymentChanged }: DailyPaymentHistoryProps) {
  const [history, setHistory] = useState<DailyPaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [workerId])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('daily_worker_payments')
        .select('*')
        .eq('worker_id', workerId)
        .order('payment_year', { ascending: false })
        .order('payment_month', { ascending: false })

      if (error) throw error
      setHistory(data || [])
    } catch (error) {
      console.error('Error fetching payment history:', error)
      toast.error('Error al cargar historial de pagos')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePayment = async (payment: DailyPaymentHistoryItem) => {
    if (!confirm(`¿Eliminar pago de ${getMonthName(payment.payment_month)} ${payment.payment_year}?`)) {
      return
    }

    try {
      setDeletingId(payment.id)

      // Eliminar el pago
      const { error: deleteError } = await supabase
        .from('daily_worker_payments')
        .delete()
        .eq('id', payment.id)

      if (deleteError) throw deleteError

      // Restar del income_tracking
      const { error: updateError } = await supabase.rpc('update_income_tracking_payment', {
        p_amount: -payment.total_amount // Negativo para restar
      })

      if (updateError) {
        console.error('Error updating income tracking:', updateError)
      }

      toast.success('Pago eliminado exitosamente')
      await fetchHistory()
      onPaymentChanged?.()
    } catch (error: any) {
      console.error('Error deleting payment:', error)
      toast.error(`Error al eliminar pago: ${error.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleDateString('es-CL', { month: 'long' })
  }

  const totalPagado = history.reduce((sum, p) => sum + p.total_amount, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="text-slate-300 hover:text-slate-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h3 className="text-xl font-semibold text-slate-100">Historial de Pagos</h3>
              <p className="text-sm text-slate-400">{workerName}</p>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-slate-700/30 border-slate-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-900/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Pagado</p>
                  <p className="text-xl font-bold text-slate-100">{formatCurrency(totalPagado)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-700/30 border-slate-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-900/30 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Pagos Realizados</p>
                  <p className="text-xl font-bold text-slate-100">{history.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Pagos */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-slate-400 mt-4">Cargando historial...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No hay pagos registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((payment) => (
              <Card key={payment.id} className="bg-slate-700/30 border-slate-600 hover:bg-slate-700/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold text-slate-100 capitalize">
                          {getMonthName(payment.payment_month)} {payment.payment_year}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Días trabajados:</span>
                          <span className="ml-2 font-medium text-slate-100">{payment.days_worked} días</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Tarifa diaria:</span>
                          <span className="ml-2 font-medium text-slate-100">{formatCurrency(payment.daily_rate)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Fecha de pago:</span>
                          <span className="ml-2 font-medium text-slate-100">
                            {new Date(payment.payment_date).toLocaleDateString('es-CL')}
                          </span>
                        </div>
                      </div>

                      {payment.notes && (
                        <div className="mt-2 text-sm">
                          <span className="text-slate-400">Nota:</span>
                          <span className="ml-2 text-slate-300">{payment.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Total Pagado</p>
                        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(payment.total_amount)}</p>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePayment(payment)}
                        disabled={deletingId === payment.id}
                        className="bg-red-900/30 hover:bg-red-800/40 text-red-400 border border-red-600"
                      >
                        {deletingId === payment.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

<<<<<<< HEAD
=======

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
