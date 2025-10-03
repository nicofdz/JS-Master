'use client'

import { useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { useIncomeTracking } from '@/hooks/useIncomeTracking'

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
  selectedMonth?: number
  selectedYear?: number
  totalRealIncome?: number
}

export function InvoiceStats({ 
  stats, 
  incomeData: propIncomeData, 
  incomeLoading: propIncomeLoading, 
  selectedMonth, 
  selectedYear,
  totalRealIncome 
}: InvoiceStatsProps) {
  const { incomeData: hookIncomeData, loading: hookIncomeLoading, fetchIncomeTracking } = useIncomeTracking()
  const processedPercentage = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0

  // Actualizar datos cuando cambian las facturas procesadas
  useEffect(() => {
    fetchIncomeTracking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.processed])

  // Usar datos del prop si están disponibles, sino usar del hook
  const incomeData = propIncomeData || hookIncomeData
  const incomeLoading = propIncomeLoading !== undefined ? propIncomeLoading : hookIncomeLoading

  // Obtener el mes y año seleccionado o actual
  const displayMonth = selectedMonth || new Date().getMonth() + 1
  const displayYear = selectedYear || new Date().getFullYear()
  const monthName = new Date(displayYear, displayMonth - 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  // Calcular dinero disponible usando el total real acumulado - gastos en pagos
  const totalAccumulatedRealIncome = totalRealIncome || 0
  const totalSpentOnPayments = hookIncomeData?.total_spent_on_payments || 0
  const availableMoney = totalAccumulatedRealIncome - totalSpentOnPayments

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">Total Facturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
          <p className="text-xs text-slate-400">
            {stats.processed} procesadas ({processedPercentage}%)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">Facturas Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
          <p className="text-xs text-slate-400">
            Requieren procesamiento
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">Ingresos del Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-400">
            {incomeLoading ? (
              <div className="animate-pulse bg-slate-700 h-8 w-24 rounded"></div>
            ) : (
              formatCurrency(incomeData?.total_income || 0)
            )}
          </div>
          <p className="text-xs text-slate-400 capitalize">
            {monthName}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">Dinero Disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-400">
            {hookIncomeLoading ? (
              <div className="animate-pulse bg-slate-700 h-8 w-24 rounded"></div>
            ) : (
              formatCurrency(availableMoney)
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Gastado en pagos:</p>
            <p className="text-sm font-semibold text-red-400">
              {hookIncomeLoading ? (
                <div className="animate-pulse bg-slate-700 h-4 w-20 rounded"></div>
              ) : (
                formatCurrency(totalSpentOnPayments)
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">Total Real a Recibir</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const netAmount = incomeData?.total_net || 0
            const ivaAmount = incomeData?.total_iva || 0
            const totalPDF = incomeData?.total_income || 0
            
            // Neto con descuento del 6%
            const netAfterDiscount = netAmount * 0.94
            
            // Total real = (Neto - 6%) - IVA
            const totalReal = netAfterDiscount - ivaAmount
            
            return (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-emerald-400">
                  {incomeLoading ? (
                    <div className="animate-pulse bg-slate-700 h-8 w-24 rounded"></div>
                  ) : (
                    formatCurrency(totalReal)
                  )}
                </div>
                
                <div className="space-y-1 text-xs border-t border-slate-700 pt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Neto - 6%:</span>
                    <span className="font-medium text-slate-100">
                      {incomeLoading ? (
                        <div className="animate-pulse bg-slate-700 h-3 w-16 rounded"></div>
                      ) : (
                        formatCurrency(netAfterDiscount)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">IVA 19%:</span>
                    <span className="font-medium text-red-400">
                      {incomeLoading ? (
                        <div className="animate-pulse bg-slate-700 h-3 w-16 rounded"></div>
                      ) : (
                        `- ${formatCurrency(ivaAmount)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-600 pt-1">
                    <span className="text-slate-300 font-semibold">Total:</span>
                    <span className="font-bold text-emerald-400">
                      {incomeLoading ? (
                        <div className="animate-pulse bg-slate-700 h-3 w-20 rounded"></div>
                      ) : (
                        formatCurrency(totalReal)
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
  )
}
