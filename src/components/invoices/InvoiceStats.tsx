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
          <CardTitle className="text-sm font-medium text-gray-600">Total Facturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-black">{stats.total}</div>
          <p className="text-xs text-gray-600">
            {stats.processed} procesadas ({processedPercentage}%)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Facturas Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <p className="text-xs text-gray-600">
            Requieren procesamiento
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {incomeLoading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
            ) : (
              formatCurrency(incomeData?.total_income || 0)
            )}
          </div>
          <p className="text-xs text-gray-600">
            {incomeData?.processed_invoices_count || 0} facturas procesadas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Ingresos Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(stats.totalAmount - stats.realIncomeAmount)}
          </div>
          <p className="text-xs text-gray-600">
            Facturas no procesadas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Desglose Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Neto:</span>
              <span className="font-medium text-black">
                {incomeLoading ? (
                  <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                ) : (
                  formatCurrency(incomeData?.total_net || 0)
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">IVA 19%:</span>
              <span className="font-medium text-black">
                {incomeLoading ? (
                  <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                ) : (
                  formatCurrency(incomeData?.total_iva || 0)
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-1">
              <span className="text-gray-600 font-semibold">Total:</span>
              <span className="font-bold text-black">
                {incomeLoading ? (
                  <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
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
