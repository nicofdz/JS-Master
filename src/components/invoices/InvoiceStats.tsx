'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { useIncomeTracking } from '@/hooks/useIncomeTracking'
import { supabase } from '@/lib/supabase'

interface InvoiceStatsProps {
  stats: {
    total: number
    processed: number
    pending: number
    blocked: number
    totalAmount: number
    totalNet: number
    totalIva: number
    realIncomeAmount: number
    realIncomeNet: number
    realIncomeIva: number
  }
  incomeData?: {
    total_income: number
    total_net: number
    total_iva: number
    processed_invoices_count: number
    total_spent_on_payments: number
  } | null
  incomeLoading?: boolean
  selectedMonth?: number | 'all'
  selectedYear?: number
  totalRealIncome?: number
  showAllMonths?: boolean
  statusFilter?: 'all' | 'processed' | 'pending'
  onStatusFilterChange?: (filter: 'all' | 'processed' | 'pending') => void
}

export function InvoiceStats({
  stats,
  incomeData: propIncomeData,
  incomeLoading: propIncomeLoading,
  selectedMonth,
  selectedYear,
  totalRealIncome,
  showAllMonths = false,
  statusFilter = 'all',
  onStatusFilterChange
}: InvoiceStatsProps) {
  const { incomeData: hookIncomeData, loading: hookIncomeLoading, fetchIncomeTracking } = useIncomeTracking()
  const [annualData, setAnnualData] = useState<{
    total_income: number
    total_net: number
    total_iva: number
    processed_invoices_count: number
    total_spent_on_payments: number
  } | null>(null)
  const [annualLoading, setAnnualLoading] = useState(false)
  const processedPercentage = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0

  // Función para calcular datos anuales
  const fetchAnnualData = async (year: number) => {
    try {
      setAnnualLoading(true)
      console.log(`🔄 Calculando datos ${year === 0 ? 'de todos los años' : `anuales para ${year}`}...`)

      // Crear query base
      let invoicesQuery = supabase
        .from('invoice_income')
        .select('*')

      let paymentsQuery = supabase
        .from('worker_payments')
        .select('amount')

      // Solo filtrar por año si no es 0 (todos los años)
      if (year !== 0) {
        const startDate = new Date(year, 0, 1).toISOString()
        const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString()

        invoicesQuery = invoicesQuery
          .gte('created_at', startDate)
          .lte('created_at', endDate)

        paymentsQuery = paymentsQuery
          .gte('created_at', startDate)
          .lte('created_at', endDate)
      }

      const { data: invoices, error: invoicesError } = await invoicesQuery

      if (invoicesError) throw invoicesError

      // Calcular totales
      const totalIncome = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
      const totalNet = invoices?.reduce((sum, inv) => sum + (inv.net_amount || 0), 0) || 0
      const totalIva = invoices?.reduce((sum, inv) => sum + (inv.iva_amount || 0), 0) || 0
      const processedCount = invoices?.filter(inv => inv.status === 'processed').length || 0

      // Obtener pagos
      const { data: payments, error: paymentsError } = await paymentsQuery

      if (paymentsError) throw paymentsError

      const totalSpentOnPayments = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0

      const annualData = {
        total_income: totalIncome,
        total_net: totalNet,
        total_iva: totalIva,
        processed_invoices_count: processedCount,
        total_spent_on_payments: totalSpentOnPayments
      }

      console.log('📊 Datos calculados:', annualData)
      setAnnualData(annualData)
    } catch (error) {
      console.error('Error calculando datos:', error)
    } finally {
      setAnnualLoading(false)
    }
  }

  // Actualizar datos cuando cambian las facturas procesadas
  useEffect(() => {
    fetchIncomeTracking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.processed])

  // Calcular datos anuales cuando se activa showAllMonths SOLO si no hay propIncomeData
  useEffect(() => {
    if (showAllMonths && selectedYear !== undefined && !propIncomeData) {
      fetchAnnualData(selectedYear)
    } else if (!showAllMonths) {
      setAnnualData(null)
    }
  }, [showAllMonths, selectedYear, propIncomeData])

  // Priorizar propIncomeData (que ya tiene filtros correctos), luego annualData, luego hookIncomeData
  const incomeData = propIncomeData || (showAllMonths ? annualData : null) || hookIncomeData
  const incomeLoading = propIncomeLoading !== undefined ? propIncomeLoading : (showAllMonths ? annualLoading : hookIncomeLoading)

  // Obtener el mes y año seleccionado o actual
  const displayMonth = selectedMonth === 'all' ? null : (selectedMonth || new Date().getMonth() + 1)
  const displayYear = selectedYear !== undefined && selectedYear !== 0 ? selectedYear : new Date().getFullYear()

  // Generar el nombre del mes/año solo si no es "todos los meses"
  const monthName = displayMonth
    ? (() => {
      const monthNameOnly = new Date(2025, displayMonth - 1).toLocaleDateString('es-CL', { month: 'long' })
      // Si el año es 0 (todos los años), mostrar "Mes de todos los años"
      if (selectedYear === 0) {
        return `${monthNameOnly.charAt(0).toUpperCase() + monthNameOnly.slice(1)} de todos los años`
      }
      // Si hay un año específico, mostrar mes y año
      return new Date(displayYear, displayMonth - 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    })()
    : showAllMonths
      ? (selectedYear !== undefined && selectedYear !== 0 ? `${selectedYear}` : 'Todos los años')
      : 'Todos los meses'

  // Calcular dinero disponible usando el total real acumulado - gastos en pagos
  const totalAccumulatedRealIncome = totalRealIncome || 0
  const totalSpentOnPayments = hookIncomeData?.total_spent_on_payments || 0
  const availableMoney = totalAccumulatedRealIncome - totalSpentOnPayments

  return (
    <div className="space-y-4">
      {/* Tarjetas de Dinero - Primera fila */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-slate-400">
              {showAllMonths || selectedMonth === 'all'
                ? (selectedYear !== undefined && selectedYear !== 0 ? 'Ingresos del Año' : 'Ingresos Totales')
                : 'Ingresos del Mes'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold text-emerald-400">
              {incomeLoading ? (
                <div className="animate-pulse bg-slate-700 h-7 w-24 rounded"></div>
              ) : (
                formatCurrency((incomeData?.total_net || 0) + (incomeData?.total_iva || 0))
              )}
            </div>
            <p className="text-[10px] text-slate-500 capitalize mt-1">
              {showAllMonths || selectedMonth === 'all'
                ? (selectedYear !== undefined && selectedYear !== 0 ? `${selectedYear}` : 'Todos los años')
                : monthName}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-slate-400">IVA</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold text-red-400">
              {incomeLoading ? (
                <div className="animate-pulse bg-slate-700 h-7 w-24 rounded"></div>
              ) : (
                formatCurrency(incomeData?.total_iva || 0)
              )}
            </div>
            <p className="text-[10px] text-slate-500">
              {selectedMonth === 'all'
                ? (selectedYear !== undefined && selectedYear !== 0 ? 'Del año' : 'Histórico')
                : 'Del mes'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-slate-400">PPM</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold text-blue-400">
              {incomeLoading ? (
                <div className="animate-pulse bg-slate-700 h-7 w-24 rounded"></div>
              ) : (
                formatCurrency(((incomeData?.total_net || 0) + (incomeData?.total_iva || 0)) * 0.06)
              )}
            </div>
            <p className="text-[10px] text-slate-500">
              {selectedMonth === 'all'
                ? (selectedYear !== undefined && selectedYear !== 0 ? 'Del año' : 'Histórico')
                : 'Del mes'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-slate-400">Total Dinero</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            {(() => {
              const netAmount = incomeData?.total_net || 0
              const ivaAmount = incomeData?.total_iva || 0
              const totalFactura = netAmount + ivaAmount
              const ppm = totalFactura * 0.06
              const totalFinal = netAmount - ppm

              return (
                <div className="space-y-1">
                  <div className="text-xl font-bold text-emerald-400">
                    {incomeLoading ? (
                      <div className="animate-pulse bg-slate-700 h-7 w-24 rounded"></div>
                    ) : (
                      formatCurrency(totalFinal)
                    )}
                  </div>

                  <div className="space-y-0.5 text-[10px] border-t border-slate-700 pt-1 mt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">PPM:</span>
                      <span className="font-medium text-red-400">
                        {incomeLoading ? (
                          <div className="animate-pulse bg-slate-700 h-2 w-12 rounded"></div>
                        ) : (
                          `- ${formatCurrency(ppm)}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">IVA:</span>
                      <span className="font-medium text-red-400">
                        {incomeLoading ? (
                          <div className="animate-pulse bg-slate-700 h-2 w-12 rounded"></div>
                        ) : (
                          `- ${formatCurrency(ivaAmount)}`
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Tarjetas de Facturas - Segunda fila */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card
          className={`transition-all duration-200 border ${statusFilter === 'all'
              ? 'bg-blue-900/20 border-blue-500/50 shadow-md cursor-pointer'
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 cursor-pointer'
            }`}
          onClick={() => onStatusFilterChange && onStatusFilterChange('all')}
        >
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className={`text-xs font-medium ${statusFilter === 'all' ? 'text-blue-400' : 'text-slate-400'
              }`}>
              Total Facturas
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className={`text-xl font-bold ${statusFilter === 'all' ? 'text-blue-400' : 'text-slate-100'
              }`}>
              {stats.total}
            </div>
            <p className="text-[10px] text-slate-500">
              {stats.processed} procesadas ({processedPercentage}%)
            </p>
          </CardContent>
        </Card>

        <Card
          className={`transition-all duration-200 border ${statusFilter === 'pending'
              ? 'bg-yellow-900/20 border-yellow-500/50 shadow-md cursor-pointer'
              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 cursor-pointer'
            }`}
          onClick={() => onStatusFilterChange && onStatusFilterChange('pending')}
        >
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className={`text-xs font-medium ${statusFilter === 'pending' ? 'text-yellow-400' : 'text-slate-400'
              }`}>
              Facturas Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className={`text-xl font-bold ${statusFilter === 'pending' ? 'text-yellow-400' : 'text-yellow-400'
              }`}>
              {stats.pending}
            </div>
            <p className="text-[10px] text-slate-500">
              Requieren procesamiento
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
