'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface IncomeTracking {
  id: number
  total_income: number
  total_net: number
  total_iva: number
  processed_invoices_count: number
  total_spent_on_payments: number
  created_at: string
  updated_at: string
}

export function useIncomeTracking() {
  const [incomeData, setIncomeData] = useState<IncomeTracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIncomeTracking = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Fetching income tracking data...')
      const { data, error } = await supabase
        .from('income_tracking')
        .select('*')
        .eq('id', 1)
        .single()

      if (error) throw error

      console.log('📊 Income tracking data received:', data)
      setIncomeData(data)
    } catch (err) {
      console.error('Error fetching income tracking:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar datos de ingresos')
    } finally {
      setLoading(false)
    }
  }

  const refreshIncomeTracking = async () => {
    try {
      console.log('🔄 Refreshing income tracking...')
      // Forzar actualización completa de la tabla
      const { error } = await supabase.rpc('refresh_income_tracking_complete')
      
      if (error) {
        console.error('Error updating income tracking:', error)
        return
      }
      
      console.log('✅ Income tracking updated in database')
      // Recargar los datos directamente
      await fetchIncomeTracking()
    } catch (err) {
      console.error('Error refreshing income tracking:', err)
    }
  }

  // Función para refrescar y actualizar el estado
  const refreshAndUpdate = async () => {
    await refreshIncomeTracking()
  }

  useEffect(() => {
    fetchIncomeTracking()
  }, [])

  // Función para refrescar automáticamente
  const refreshData = async () => {
    await refreshIncomeTracking()
  }

  return {
    incomeData,
    loading,
    error,
    fetchIncomeTracking,
    refreshIncomeTracking,
    refreshData,
    refreshAndUpdate
  }
}
