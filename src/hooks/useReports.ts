'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface MonthlyData {
  month: string
  totalEarnings: number
  contractorEarnings: number
  workerPayments: number
  totalExpenses: number
  materialCosts: number
  laborCosts: number
  operationalCosts: number
  averageProgress: number
  completedProjects: number
  activeProjects: number
  delayedProjects: number
}

interface CurrentMonthStats {
  totalEarnings: number
  contractorEarnings: number
  workerPayments: number
  totalExpenses: number
  earningsChange: number
  contractorChange: number
  workerChange: number
  expensesChange: number
}

export function useReports() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [currentMonthStats, setCurrentMonthStats] = useState<CurrentMonthStats>({
    totalEarnings: 0,
    contractorEarnings: 0,
    workerPayments: 0,
    totalExpenses: 0,
    earningsChange: 0,
    contractorChange: 0,
    workerChange: 0,
    expensesChange: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generar datos mock para el esqueleto
  const generateMockData = (): MonthlyData[] => {
    const months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ]
    
    return months.map((month, index) => {
      const baseEarnings = 15000000 + (Math.random() * 5000000)
      const baseExpenses = 8000000 + (Math.random() * 3000000)
      const progress = Math.min(100, 20 + (index * 8) + (Math.random() * 10))
      
      return {
        month,
        totalEarnings: Math.round(baseEarnings),
        contractorEarnings: Math.round(baseEarnings * 0.6),
        workerPayments: Math.round(baseEarnings * 0.4),
        totalExpenses: Math.round(baseExpenses),
        materialCosts: Math.round(baseExpenses * 0.5),
        laborCosts: Math.round(baseExpenses * 0.3),
        operationalCosts: Math.round(baseExpenses * 0.2),
        averageProgress: Math.round(progress),
        completedProjects: Math.round(2 + Math.random() * 3),
        activeProjects: Math.round(5 + Math.random() * 4),
        delayedProjects: Math.round(Math.random() * 2)
      }
    })
  }

  const calculateCurrentMonthStats = (data: MonthlyData[]): CurrentMonthStats => {
    const currentMonth = data[data.length - 1] || data[0]
    const previousMonth = data[data.length - 2] || data[0]
    
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return 0
      return ((current - previous) / previous) * 100
    }

    return {
      totalEarnings: currentMonth.totalEarnings,
      contractorEarnings: currentMonth.contractorEarnings,
      workerPayments: currentMonth.workerPayments,
      totalExpenses: currentMonth.totalExpenses,
      earningsChange: calculateChange(currentMonth.totalEarnings, previousMonth.totalEarnings),
      contractorChange: calculateChange(currentMonth.contractorEarnings, previousMonth.contractorEarnings),
      workerChange: calculateChange(currentMonth.workerPayments, previousMonth.workerPayments),
      expensesChange: calculateChange(currentMonth.totalExpenses, previousMonth.totalExpenses)
    }
  }

  const fetchReportsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // TODO: Implementar consultas reales a la base de datos
      // Por ahora usamos datos mock
      const mockData = generateMockData()
      setMonthlyData(mockData)
      
      const stats = calculateCurrentMonthStats(mockData)
      setCurrentMonthStats(stats)

      // Ejemplo de consultas que se implementarán más tarde:
      /*
      const [projectsResponse, tasksResponse, expensesResponse] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('apartment_tasks').select('*'),
        supabase.from('expenses').select('*') // Esta tabla no existe aún
      ])

      if (projectsResponse.error) throw projectsResponse.error
      if (tasksResponse.error) throw tasksResponse.error
      if (expensesResponse.error) throw expensesResponse.error
      */

    } catch (err) {
      console.error('Error fetching reports data:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshData = async () => {
    await fetchReportsData()
  }

  useEffect(() => {
    fetchReportsData()
  }, [fetchReportsData])

  // Preparar datos para los gráficos
  const earningsData = monthlyData.map(item => ({
    month: item.month,
    totalEarnings: item.totalEarnings,
    contractorEarnings: item.contractorEarnings,
    workerPayments: item.workerPayments
  }))

  const expensesData = monthlyData.map(item => ({
    month: item.month,
    totalExpenses: item.totalExpenses,
    materialCosts: item.materialCosts,
    laborCosts: item.laborCosts,
    operationalCosts: item.operationalCosts
  }))

  const progressData = monthlyData.map(item => ({
    month: item.month,
    averageProgress: item.averageProgress,
    completedProjects: item.completedProjects,
    activeProjects: item.activeProjects,
    delayedProjects: item.delayedProjects
  }))

  return {
    monthlyData,
    earningsData,
    expensesData,
    progressData,
    currentMonthStats,
    loading,
    error,
    refreshData
  }
}
