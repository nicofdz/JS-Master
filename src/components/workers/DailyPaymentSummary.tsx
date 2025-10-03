'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useWorkers } from '@/hooks/useWorkers'
import { useAttendance } from '@/hooks/useAttendance'
import { useInvoices } from '@/hooks/useInvoices'
import { useIncomeTracking } from '@/hooks/useIncomeTracking'
import { DailyPaymentHistory } from './DailyPaymentHistory'
import { Calendar, DollarSign, Users, TrendingUp, History } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface WorkerDailyPayment {
  worker_id: number
  worker_name: string
  worker_rut: string
  daily_rate: number
  days_worked: number
  total_amount: number
  total_paid: number
}

interface DailyPaymentSummaryProps {
  totalRealIncome?: number
}

export function DailyPaymentSummary({ totalRealIncome = 0 }: DailyPaymentSummaryProps) {
  const { workers } = useWorkers()
  const { getWorkerAttendanceStats } = useAttendance()
  const { incomeData, loading: incomeLoading, refreshIncomeTracking } = useIncomeTracking()
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [workerPayments, setWorkerPayments] = useState<WorkerDailyPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<{ id: number; name: string } | null>(null)
  const [setupError, setSetupError] = useState<string | null>(null)

  // Filtrar solo trabajadores con contrato "por día" y activos (excluir al jefe)
  const dailyWorkers = workers.filter(w => 
    w.is_active && 
    w.contract_type === 'por_dia' && 
    w.rut !== '13.161.546-9'
  )

  useEffect(() => {
    loadWorkerPayments()
    verifySetup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, workers.length])

  const verifySetup = async () => {
    try {
      // Verificar que la tabla existe
      const { error: tableError } = await supabase
        .from('daily_worker_payments')
        .select('id')
        .limit(1)
      
      if (tableError) {
        const errorMsg = 'Ejecuta el script SQL: database/setup-daily-payments-complete.sql en Supabase'
        console.error('⚠️ SETUP INCOMPLETO: La tabla daily_worker_payments no existe')
        console.error('📋 ' + errorMsg)
        console.error('🔗 Guía: INSTRUCCIONES_PAGOS_DIARIOS.md')
        setSetupError(errorMsg)
        toast.error('Setup incompleto. Revisa la consola.')
        return
      }

      // Verificar que la función RPC existe
      const { error: rpcError } = await supabase.rpc('update_income_tracking_payment', {
        p_amount: 0
      })

      if (rpcError && rpcError.message.includes('does not exist')) {
        const errorMsg = 'Ejecuta el script SQL: database/setup-daily-payments-complete.sql en Supabase'
        console.error('⚠️ SETUP INCOMPLETO: La función RPC no existe')
        console.error('📋 ' + errorMsg)
        console.error('🔗 Guía: INSTRUCCIONES_PAGOS_DIARIOS.md')
        setSetupError(errorMsg)
        toast.error('Función RPC faltante. Revisa la consola.')
        return
      }

      console.log('✅ Setup verificado correctamente')
      setSetupError(null)
    } catch (error) {
      console.error('Error verificando setup:', error)
    }
  }

  const loadWorkerPayments = async () => {
    setLoading(true)
    try {
      const payments: WorkerDailyPayment[] = []
      
      // Obtener los pagos ya realizados
      const { data: existingPayments, error: paymentsError } = await supabase
        .from('daily_worker_payments')
        .select('*')
        .eq('payment_month', selectedMonth)
        .eq('payment_year', selectedYear)
      
      if (paymentsError) {
        console.error('Error fetching existing payments:', paymentsError)
      }
      
      for (const worker of dailyWorkers) {
        const stats = await getWorkerAttendanceStats(worker.id, selectedMonth, selectedYear)
        const dailyRate = worker.daily_rate || 0
        const totalGeneral = stats.totalDays * dailyRate
        
        // Buscar si ya hay un pago registrado para este trabajador en este período
        const existingPayment = existingPayments?.find(p => p.worker_id === worker.id)
        const totalPaid = existingPayment?.total_amount || 0
        
        // Total a pagar = Total general - Total ya pagado
        const totalAmount = totalGeneral - totalPaid
        
        payments.push({
          worker_id: worker.id,
          worker_name: worker.full_name,
          worker_rut: worker.rut,
          daily_rate: dailyRate,
          days_worked: stats.totalDays,
          total_amount: totalAmount, // Lo que FALTA por pagar
          total_paid: totalPaid // Lo que YA se pagó
        })
      }
      
      setWorkerPayments(payments)
    } catch (error) {
      console.error('Error loading worker payments:', error)
      toast.error('Error al cargar los pagos')
    } finally {
      setLoading(false)
    }
  }

  const handlePayWorker = async (payment: WorkerDailyPayment) => {
    if (payment.total_paid > 0) {
      toast.error('Este trabajador ya ha sido pagado para este período')
      return
    }

    if (payment.total_amount === 0) {
      toast.error('No hay días trabajados para pagar')
      return
    }

    try {
      console.log('💰 Iniciando pago:', {
        worker: payment.worker_name,
        amount: payment.total_amount,
        month: selectedMonth,
        year: selectedYear
      })

      // Registrar el pago en la base de datos
      const { data: paymentData, error: insertError } = await supabase
        .from('daily_worker_payments')
        .insert({
          worker_id: payment.worker_id,
          payment_month: selectedMonth,
          payment_year: selectedYear,
          days_worked: payment.days_worked,
          daily_rate: payment.daily_rate,
          total_amount: payment.total_amount,
          payment_date: new Date().toISOString()
        })
        .select()

      if (insertError) {
        console.error('❌ Error insertando pago:', insertError)
        throw insertError
      }

      console.log('✅ Pago insertado en BD:', paymentData)

      // Actualizar el income_tracking (sumar al gasto)
      console.log('📊 Actualizando income_tracking con monto:', payment.total_amount)
      const { data: rpcData, error: updateError } = await supabase.rpc('update_income_tracking_payment', {
        p_amount: payment.total_amount
      })

      if (updateError) {
        console.error('❌ Error en RPC update_income_tracking_payment:', updateError)
        toast.error('Error al actualizar el tracking de ingresos')
        throw updateError
      }

      console.log('✅ Income tracking actualizado:', rpcData)

      // Verificar que se actualizó correctamente
      const { data: verifyData } = await supabase
        .from('income_tracking')
        .select('total_spent_on_payments')
        .eq('id', 1)
        .single()

      console.log('🔍 Verificación - Total gastado actual:', verifyData?.total_spent_on_payments)

      toast.success(`Pago registrado: ${payment.worker_name} - ${formatCurrency(payment.total_amount)}`)
      
      // Recargar datos
      console.log('🔄 Recargando datos...')
      await loadWorkerPayments()
      await refreshIncomeTracking()
      
      console.log('✅ Pago completado exitosamente')
    } catch (error: any) {
      console.error('❌ Error processing payment:', error)
      toast.error(`Error al procesar el pago: ${error.message}`)
    }
  }

  const totalToPay = workerPayments.reduce((sum, p) => sum + p.total_amount, 0)

  return (
    <div className="space-y-6">
      {/* Alerta de Setup Incompleto */}
      {setupError && (
        <div className="bg-red-900/20 border-2 border-red-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-red-400 text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-red-300 font-bold text-lg mb-2">Setup Incompleto</h3>
              <p className="text-red-200 mb-3">{setupError}</p>
              <div className="bg-red-950/50 p-3 rounded border border-red-800">
                <p className="text-sm text-red-300 mb-2">📋 Instrucciones:</p>
                <ol className="text-sm text-red-200 list-decimal list-inside space-y-1">
                  <li>Ve a Supabase Dashboard → SQL Editor</li>
                  <li>Crea una &quot;New query&quot;</li>
                  <li>Copia el contenido de: <code className="bg-red-900/30 px-2 py-1 rounded">database/setup-daily-payments-complete.sql</code></li>
                  <li>Haz clic en &quot;Run&quot; o presiona Ctrl+Enter</li>
                  <li>Recarga esta página</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selector de Mes y Año */}
      <Card className="bg-slate-800/50 border-slate-700">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-100">Período de Pago</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Mes
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleDateString('es-CL', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Año
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Trabajadores por Día</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{dailyWorkers.length}</p>
              </div>
              <div className="p-3 bg-blue-900/30 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total a Pagar</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  {formatCurrency(totalToPay)}
                </p>
              </div>
              <div className="p-3 bg-emerald-900/30 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Dinero Disponible</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">
                  {incomeLoading ? (
                    <div className="animate-pulse bg-slate-700 h-8 w-24 rounded"></div>
                  ) : (
                    formatCurrency(totalRealIncome - (incomeData?.total_spent_on_payments || 0))
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {incomeData?.processed_invoices_count || 0} facturas procesadas
                </p>
              </div>
              <div className="p-3 bg-emerald-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Dinero Gastado en Pagos</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">
                  {incomeLoading ? (
                    <div className="animate-pulse bg-slate-700 h-8 w-24 rounded"></div>
                  ) : (
                    formatCurrency(incomeData?.total_spent_on_payments || 0)
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Total gastado en trabajadores
                </p>
              </div>
              <div className="p-3 bg-red-900/30 rounded-lg">
                <DollarSign className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabla de Pagos */}
      <Card className="bg-slate-800/50 border-slate-700">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">
            Detalle de Pagos - {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-slate-400 mt-4">Calculando pagos...</p>
            </div>
          ) : workerPayments.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No hay trabajadores con contrato &quot;por día&quot;</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Trabajador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      RUT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Tarifa Diaria
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Días Trabajados
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Total a Pagar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Total Pagado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {workerPayments.map((payment) => (
                    <tr key={payment.worker_id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-100">
                          {payment.worker_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{payment.worker_rut}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-emerald-400 font-semibold">
                          ${payment.daily_rate.toLocaleString('es-CL')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-100 font-semibold">
                          {payment.days_worked} días
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-emerald-400 font-bold text-lg">
                          ${payment.total_amount.toLocaleString('es-CL')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-bold text-lg ${payment.total_paid > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                          ${payment.total_paid.toLocaleString('es-CL')}
                        </div>
                        {payment.total_paid > 0 && (
                          <div className="text-xs text-emerald-400 mt-1">✓ Pagado</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handlePayWorker(payment)}
                            size="sm"
                            disabled={payment.total_amount === 0 || payment.total_paid > 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-600 disabled:cursor-not-allowed"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            {payment.total_paid > 0 ? 'Pagado' : 'Pagar'}
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedWorker({ id: payment.worker_id, name: payment.worker_name })
                              setShowHistory(true)
                            }}
                            size="sm"
                            className="bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 border border-blue-600"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Modal de Historial de Pagos */}
      {showHistory && selectedWorker && (
        <DailyPaymentHistory
          workerId={selectedWorker.id}
          workerName={selectedWorker.name}
          onClose={() => {
            setShowHistory(false)
            setSelectedWorker(null)
          }}
          onPaymentChanged={() => {
            loadWorkerPayments()
            refreshIncomeTracking()
          }}
        />
      )}
    </div>
  )
}

