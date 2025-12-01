'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Expense {
  id: number
  name: string
  type: 'materiales' | 'servicios' | 'epp' | 'combustible' | 'herramientas' | 'otros'
  quantity: number | null
  date: string
  total_amount: number
  document_type: 'boleta' | 'factura'
  iva_percentage: number
  iva_amount: number
  net_amount: number
  supplier: string
  project_id: number | null
  description: string | null
  receipt_url: string | null
  receipt_filename: string | null
  status: 'active' | 'cancelled'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseStats {
  total_amount: number
  recoverable_iva: number
  materiales_amount: number
  servicios_amount: number
  epp_amount: number
  combustible_amount: number
  herramientas_amount: number
  otros_amount: number
}

export function useExpenses(year?: number, month?: number, documentType?: 'boleta' | 'factura', projectId?: number) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stats, setStats] = useState<ExpenseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })

      // Aplicar filtro de proyecto si está especificado
      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error
      setExpenses(data || [])
    } catch (err: any) {
      console.error('Error fetching expenses:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (yearFilter?: number, monthFilter?: number, documentTypeFilter?: 'boleta' | 'factura') => {
    try {
      // Si hay filtro de proyecto, obtener estadísticas filtradas por proyecto
      if (projectId) {
        const { data, error } = await supabase.rpc('get_expense_stats_by_project', {
          p_project_id: projectId,
          p_year: yearFilter || null,
          p_month: monthFilter || null,
          p_document_type: documentTypeFilter || null
        })

        if (error) throw error
        setStats(data?.[0] || null)
      } else {
        // Sin filtro de proyecto, usar la función original
        const { data, error } = await supabase.rpc('get_expense_stats', {
          p_year: yearFilter || null,
          p_month: monthFilter || null,
          p_document_type: documentTypeFilter || null
        })

        if (error) throw error
        setStats(data?.[0] || null)
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err)
      setError(err.message)
    }
  }

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()

      if (error) throw error
      
      if (data?.[0]) {
        setExpenses(prev => [data[0], ...prev])
        await fetchStats(year, month, documentType) // Refresh stats with current filters
      }
      
      return data?.[0]
    } catch (err: any) {
      console.error('Error adding expense:', err)
      setError(err.message)
      throw err
    }
  }

  const updateExpense = async (id: number, updates: Partial<Expense>) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error
      
      if (data?.[0]) {
        setExpenses(prev => 
          prev.map(expense => 
            expense.id === id ? { ...expense, ...data[0] } : expense
          )
        )
        await fetchStats(year, month, documentType) // Refresh stats with current filters
      }
      
      return data?.[0]
    } catch (err: any) {
      console.error('Error updating expense:', err)
      setError(err.message)
      throw err
    }
  }

  const cancelExpense = async (id: number) => {
    try {
      await updateExpense(id, { status: 'cancelled' })
    } catch (err: any) {
      console.error('Error cancelling expense:', err)
      setError(err.message)
      throw err
    }
  }

  const uploadReceipt = async (file: File, expenseId: number) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${expenseId}-${Date.now()}.${fileExt}`
      const filePath = `receipts/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(filePath)

      // Update expense with receipt info
      await updateExpense(expenseId, {
        receipt_url: publicUrl,
        receipt_filename: file.name
      })

      return publicUrl
    } catch (err: any) {
      console.error('Error uploading receipt:', err)
      setError(err.message)
      throw err
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [projectId])

  useEffect(() => {
    fetchStats(year, month, documentType)
  }, [year, month, documentType, projectId])

  return {
    expenses,
    stats,
    loading,
    error,
    fetchExpenses,
    fetchStats,
    addExpense,
    updateExpense,
    cancelExpense,
    uploadReceipt
  }
}
