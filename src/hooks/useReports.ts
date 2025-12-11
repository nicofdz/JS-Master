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


  const generateMockData = (): MonthlyData[] => {
    // Mantener como fallback si falla la carga o para referencias iniciales
    // pero la lógica principal usará fetchReportsData real
    return []
  }

  const getMonthKey = (date: string) => {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const getMonthName = (monthKey: string) => {
    if (!monthKey) return ''
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleString('es-CL', { month: 'short' })
  }

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const fetchReportsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Definir rango de fechas (últimos 12 meses o año actual)
      // Por defecto tomaremos el año actual completo
      const currentYear = new Date().getFullYear()
      const startDate = `${currentYear}-01-01`
      const endDate = `${currentYear}-12-31`

      // 1. Fetch Facturas (Ingresos)
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoice_income')
        .select('net_amount, issue_date, status')
        .eq('status', 'processed')
        .gte('issue_date', startDate)
        .lte('issue_date', endDate)

      if (invoicesError) throw invoicesError

      // 2. Fetch Gastos
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('total_amount, date, type, status')
        .eq('status', 'active')
        .gte('date', startDate)
        .lte('date', endDate)

      if (expensesError) throw expensesError

      // 3. Fetch Pagos Trabajadores (Mano de Obra)
      const { data: payments, error: paymentsError } = await supabase
        .from('worker_payment_history')
        .select('total_amount, payment_date')
        .eq('is_deleted', false) // Asumiendo que existe este campo o similar para soft delete
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)

      if (paymentsError) throw paymentsError

      // 4. Fetch Tareas (para Progreso)
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('status, completed_at, created_at, is_deleted')
        .eq('is_deleted', false)

      if (tasksError) throw tasksError

      // 5. Fetch Proyectos (para conteos)
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, status, created_at, start_date')

      if (projectsError) throw projectsError

      const monthlyDataMap = new Map<string, MonthlyData>()

      for (let i = 0; i < 12; i++) {
        const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`
        const monthName = new Date(currentYear, i).toLocaleString('es-CL', { month: 'short' })
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)

        monthlyDataMap.set(monthKey, {
          month: capitalizedMonth,
          totalEarnings: 0,
          contractorEarnings: 0,
          workerPayments: 0,
          totalExpenses: 0,
          materialCosts: 0,
          laborCosts: 0,
          operationalCosts: 0,
          averageProgress: 0,
          completedProjects: 0,
          activeProjects: 0,
          delayedProjects: 0
        })
      }

      // Agrupar Facturas
      invoices?.forEach(inv => {
        const key = getMonthKey(inv.issue_date || '')
        const data = monthlyDataMap.get(key)
        if (data) {
          data.totalEarnings += (inv.net_amount || 0)
        }
      })

      // Agrupar Pagos Trabajadores
      payments?.forEach(pay => {
        const key = getMonthKey(pay.payment_date)
        const data = monthlyDataMap.get(key)
        if (data) {
          data.workerPayments += (pay.total_amount || 0)
          data.laborCosts += (pay.total_amount || 0) // Labor Costs es lo mismo que Worker Payments
        }
      })

      // Agrupar Gastos
      expenses?.forEach(exp => {
        const key = getMonthKey(exp.date)
        const data = monthlyDataMap.get(key)
        if (data) {
          const amount = exp.total_amount || 0

          if (exp.type === 'materiales') {
            data.materialCosts += amount
          } else {
            data.operationalCosts += amount
          }
        }
      })

      // Calcular totales calculados y progreso
      const sortedKeys = Array.from(monthlyDataMap.keys()).sort()

      sortedKeys.forEach(key => {
        const data = monthlyDataMap.get(key)!

        // 1. Total Gastos = Materiales + Mano de Obra (Payments) + Operacionales
        // Nota: laborCosts ya incluye workerPayments
        data.totalExpenses = data.materialCosts + data.laborCosts + data.operationalCosts

        // 2. Ganancia Contratista = Ingresos (Facturas) - Pagos Trabajadores
        data.contractorEarnings = data.totalEarnings - data.workerPayments

        // 3. Progreso Estimado
        // Contar tareas completadas en este mes
        const tasksCompletedInMonth = tasks?.filter(t => {
          if (t.status !== 'completed' || !t.completed_at) return false
          return getMonthKey(t.completed_at) === key
        }).length || 0

        // Total tareas acumuladas hasta fin de este mes (creadas antes del fin de mes)
        // Para simplificar "Average Progress", usaremos un proxy:
        // (Tareas Completadas Acumuladas / Tareas Totales Acumuladas) * 100
        // Esto es un 'Global Progress' histórico aproximado.

        const monthEnd = new Date(parseInt(key.split('-')[0]), parseInt(key.split('-')[1]), 0) // Último día del mes

        const cumulativeTasks = tasks?.filter(t => new Date(t.created_at) <= monthEnd)
        const cumulativeCompleted = cumulativeTasks?.filter(t => t.status === 'completed' && t.completed_at && new Date(t.completed_at) <= monthEnd)

        const totalCount = cumulativeTasks?.length || 0
        const completedCount = cumulativeCompleted?.length || 0

        data.averageProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

        // 4. Proyectos
        // Activos: Creados antes del fin de mes Y (no terminados O terminados después del inicio de mes)
        // Por ahora usaremos el status actual como proxy simple o las fechas si existen
        data.activeProjects = projects?.filter(p => {
          const created = new Date(p.created_at)
          return created <= monthEnd && p.status === 'active' // Simplificación
        }).length || 0
      })

      const finalMonthlyData = Array.from(monthlyDataMap.values())
      setMonthlyData(finalMonthlyData)

      // Calculate Current Month Stats
      const currentMonthKey = getMonthKey(new Date().toISOString())
      const currentMonthIndex = sortedKeys.indexOf(currentMonthKey)

      // Si estamos en enero, el anterior es diciembre del año pasado (que no tenemos cargado en este set),
      // así que compararemos con 0 o el mes anterior si existe en el array.
      const currentData = monthlyDataMap.get(currentMonthKey) || finalMonthlyData[finalMonthlyData.length - 1]
      const previousData = currentMonthIndex > 0 ? finalMonthlyData[currentMonthIndex - 1] : finalMonthlyData[0]

      if (currentData) {
        setCurrentMonthStats({
          totalEarnings: currentData.totalEarnings,
          contractorEarnings: currentData.contractorEarnings,
          workerPayments: currentData.workerPayments,
          totalExpenses: currentData.totalExpenses,
          earningsChange: calculateChange(currentData.totalEarnings, previousData?.totalEarnings || 0),
          contractorChange: calculateChange(currentData.contractorEarnings, previousData?.contractorEarnings || 0),
          workerChange: calculateChange(currentData.workerPayments, previousData?.workerPayments || 0),
          expensesChange: calculateChange(currentData.totalExpenses, previousData?.totalExpenses || 0)
        })
      }

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
