'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface WorkerPaymentSummary {
  worker_id: number
  full_name: string
  rut: string
  cargo?: string
  contract_type?: string
  total_tasks: number
  completed_tasks: number
  total_payment_due: number
  pending_payment: number
  uncompleted_payment: number
  total_paid: number
}

export function useWorkerPayments() {
  const [payments, setPayments] = useState<WorkerPaymentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkerPayments = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)

      console.log('🔄 Refrescando datos de pagos...')

      // Usar la vista que creamos en la base de datos con el contract_type
      const { data: viewData, error: viewError } = await supabase
        .from('worker_payment_summary')
        .select('*')
        .order('total_payment_due', { ascending: false })

      if (viewError) throw viewError

      // Obtener contract_type del contrato activo de cada trabajador
      const workerIds = viewData?.map(w => w.worker_id) || []
      const { data: contractsData, error: contractsError } = await supabase
        .from('contract_history')
        .select('worker_id, contract_type')
        .in('worker_id', workerIds)
        .eq('status', 'activo')
        .eq('is_active', true)

      if (contractsError) {
        console.warn('Error fetching contracts:', contractsError)
        // Continuar sin contract_type si falla
      }

      // Combinar los datos
      const data = viewData?.map(payment => {
        const contract = contractsData?.find(c => c.worker_id === payment.worker_id)
        return {
          ...payment,
          contract_type: contract?.contract_type || 'a_trato'
        }
      })

      console.log('✅ Datos de pagos actualizados:', data?.length || 0, 'registros')
      setPayments(data || [])
    } catch (err: any) {
      console.error('Error fetching worker payments:', err)
      setError(err.message || 'Error al cargar pagos de trabajadores')
    } finally {
      if (showLoading) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  const getWorkerPaymentDetails = async (workerId: number) => {
    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          worker_payment,
          tasks!inner(
            id,
            task_name,
            status,
            start_date,
            completed_at,
            end_date,
            created_at,
            apartments!inner(
              apartment_number,
              floors!inner(
                floor_number,
                projects!inner(name)
              )
            )
          )
        `)
        .eq('worker_id', workerId)
        .not('worker_payment', 'is', null)

      if (error) throw error

      return (data || []).map((row: any) => ({
        id: row.tasks.id,
        task_name: row.tasks.task_name,
        status: row.tasks.status,
        worker_payment: row.worker_payment,
        start_date: row.tasks.start_date,
        completed_at: row.tasks.completed_at,
        end_date: row.tasks.end_date,
        created_at: row.tasks.created_at,
        apartments: row.tasks.apartments
      })).sort((a, b) => {
        if (!a.completed_at) return 1
        if (!b.completed_at) return -1
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      })
    } catch (err: any) {
      console.error('Error fetching worker payment details:', err)
      throw err
    }
  }

  const getTotalPendingPayments = () => {
    return payments.reduce((total, worker) => total + worker.pending_payment, 0)
  }

  const getTotalCompletedPayments = () => {
    return payments.reduce((total, worker) => total + worker.total_paid, 0)
  }

  const getTotalPaymentDue = () => {
    return payments.reduce((total, worker) => total + worker.total_payment_due, 0)
  }

  const processPayment = async (workerId: number, notes?: string) => {
    try {
      const { data, error } = await supabase.rpc('process_worker_payment_simple', {
        p_worker_id: workerId,
        p_notes: notes || null
      })

      if (error) throw error

      // Refrescar los datos después del pago (sin mostrar loading)
      await fetchWorkerPayments(false)

      return data
    } catch (err: any) {
      console.error('Error processing payment:', err)
      throw new Error(err.message || 'Error al procesar el pago')
    }
  }

  const processPartialPayment = async (workerId: number, selectedTasks: number[], amount: number, notes?: string) => {
    try {
      const { data, error } = await supabase.rpc('process_partial_payment_simple', {
        p_worker_id: workerId,
        p_selected_tasks: selectedTasks,
        p_amount: amount,
        p_notes: notes || null
      })

      if (error) throw error

      // Refrescar los datos después del pago (sin mostrar loading)
      await fetchWorkerPayments(false)

      return data
    } catch (err: any) {
      console.error('Error processing partial payment:', err)
      throw new Error(err.message || 'Error al procesar el pago parcial')
    }
  }

  const updatePayment = async (paymentId: number, newAmount: number, notes?: string) => {
    try {
      const { error } = await supabase.rpc('update_payment', {
        p_payment_id: paymentId,
        p_new_amount: newAmount,
        p_notes: notes || null
      })

      if (error) throw error

      // Refrescar los datos después de la actualización (sin mostrar loading)
      await fetchWorkerPayments(false)
    } catch (err: any) {
      console.error('Error updating payment:', err)
      throw new Error(err.message || 'Error al actualizar el pago')
    }
  }

  const deletePayment = async (paymentId: number) => {
    try {
      console.log('🗑️ Eliminando pago con ID:', paymentId)

      const { error } = await supabase.rpc('delete_payment', {
        p_payment_id: paymentId
      })

      if (error) {
        console.error('❌ Error en delete_payment:', error)
        throw error
      }

      console.log('✅ Pago eliminado exitosamente')

      // Pequeño delay para asegurar que la base de datos se actualice
      await new Promise(resolve => setTimeout(resolve, 500))

      // Refrescar los datos después de la eliminación (sin mostrar loading)
      console.log('🔄 Refrescando datos después de eliminación...')
      await fetchWorkerPayments(false)

      console.log('✅ Datos refrescados después de eliminación')
    } catch (err: any) {
      console.error('Error deleting payment:', err)
      throw new Error(err.message || 'Error al eliminar el pago')
    }
  }

  const getAvailableTasksForPayment = async (workerId: number) => {
    try {
      const { data, error } = await supabase.rpc('get_available_tasks_for_payment', {
        p_worker_id: workerId
      })

      if (error) throw error
      return data || []
    } catch (err: any) {
      console.error('Error fetching available tasks:', err)
      throw err
    }
  }

  const getWorkerPaymentHistory = async (workerId: number) => {
    try {
      const { data, error } = await supabase.rpc('get_worker_payment_history', {
        p_worker_id: workerId
      })

      if (error) throw error
      return data || []
    } catch (err: any) {
      console.error('Error fetching payment history:', err)
      throw err
    }
  }

  const getPaymentTaskDetails = async (paymentId: number) => {
    try {
      const { data, error } = await supabase.rpc('get_payment_task_details', {
        p_payment_id: paymentId
      })

      if (error) throw error
      return data || []
    } catch (err: any) {
      console.error('Error fetching payment task details:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchWorkerPayments()
  }, [])

  return {
    payments,
    loading,
    refreshing,
    error,
    refresh: fetchWorkerPayments,
    getWorkerPaymentDetails,
    getTotalPendingPayments,
    getTotalCompletedPayments,
    getTotalPaymentDue,
    processPayment,
    processPartialPayment,
    updatePayment,
    deletePayment,
    getAvailableTasksForPayment,
    getWorkerPaymentHistory,
    getPaymentTaskDetails
  }
}
