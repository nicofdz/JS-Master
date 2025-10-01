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
  } | null
  incomeLoading?: boolean
}

export function InvoiceStats({ stats, incomeData: propIncomeData, incomeLoading: propIncomeLoading }: InvoiceStatsProps) {
  const { incomeData: hookIncomeData, loading: hookIncomeLoading } = useIncomeTracking()
  const processedPercentage = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0

  // Usar datos del prop si están disponibles, sino usar del hook
  const incomeData = propIncomeData || hookIncomeData
  const incomeLoading = propIncomeLoading !== undefined ? propIncomeLoading : hookIncomeLoading

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
          <CardTitle className="text-sm font-medium text-slate-400">Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-400">
            {incomeLoading ? (
              <div className="animate-pulse bg-slate-700 h-8 w-24 rounded"></div>
            ) : (
              formatCurrency(incomeData?.total_income || 0)
            )}
          </div>
          <p className="text-xs text-slate-400">
            {incomeData?.processed_invoices_count || 0} facturas procesadas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">Ingresos Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-400">
            {formatCurrency(stats.totalAmount - stats.realIncomeAmount)}
          </div>
          <p className="text-xs text-slate-400">
            Facturas no procesadas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">Desglose Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Neto:</span>
              <span className="font-medium text-slate-100">
                {incomeLoading ? (
                  <div className="animate-pulse bg-slate-700 h-4 w-16 rounded"></div>
                ) : (
                  formatCurrency(incomeData?.total_net || 0)
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">IVA 19%:</span>
              <span className="font-medium text-slate-100">
                {incomeLoading ? (
                  <div className="animate-pulse bg-slate-700 h-4 w-16 rounded"></div>
                ) : (
                  formatCurrency(incomeData?.total_iva || 0)
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-600 pt-1">
              <span className="text-slate-300 font-semibold">Total:</span>
              <span className="font-bold text-slate-100">
                {incomeLoading ? (
                  <div className="animate-pulse bg-slate-700 h-4 w-20 rounded"></div>
                ) : (
                  formatCurrency(incomeData?.total_income || 0)
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
