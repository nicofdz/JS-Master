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
<<<<<<< HEAD
  selectedMonth?: number | 'all'
  selectedYear?: number
  totalRealIncome?: number
  showAllMonths?: boolean
  statusFilter?: 'all' | 'processed' | 'pending'
  onStatusFilterChange?: (filter: 'all' | 'processed' | 'pending') => void
=======
  selectedMonth?: number
  selectedYear?: number
  totalRealIncome?: number
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
}

export function InvoiceStats({ 
  stats, 
  incomeData: propIncomeData, 
  incomeLoading: propIncomeLoading, 
  selectedMonth, 
  selectedYear,
<<<<<<< HEAD
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

=======
  totalRealIncome 
}: InvoiceStatsProps) {
  const { incomeData: hookIncomeData, loading: hookIncomeLoading, fetchIncomeTracking } = useIncomeTracking()
  const processedPercentage = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
  // Actualizar datos cuando cambian las facturas procesadas
  useEffect(() => {
    fetchIncomeTracking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.processed])

<<<<<<< HEAD
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
=======
  // Usar datos del prop si están disponibles, sino usar del hook
  const incomeData = propIncomeData || hookIncomeData
  const incomeLoading = propIncomeLoading !== undefined ? propIncomeLoading : hookIncomeLoading
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620

  // Obtener el mes y año seleccionado o actual
  const displayMonth = selectedMonth || new Date().getMonth() + 1
  const displayYear = selectedYear || new Date().getFullYear()
  const monthName = new Date(displayYear, displayMonth - 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  // Calcular dinero disponible usando el total real acumulado - gastos en pagos
  const totalAccumulatedRealIncome = totalRealIncome || 0
  const totalSpentOnPayments = hookIncomeData?.total_spent_on_payments || 0
  const availableMoney = totalAccumulatedRealIncome - totalSpentOnPayments

  return (
<<<<<<< HEAD
    <div className="space-y-6">
      {/* Tarjetas de Dinero - Primera fila */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              {showAllMonths || selectedMonth === 'all' 
                ? (selectedYear !== undefined && selectedYear !== 0 ? 'Ingresos del Año' : 'Ingresos Totales')
                : 'Ingresos del Mes'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {incomeLoading ? (
                <div className="animate-pulse bg-slate-700 h-8 w-24 rounded"></div>
              ) : (
                formatCurrency((incomeData?.total_net || 0) + (incomeData?.total_iva || 0))
              )}
            </div>
            <p className="text-xs text-slate-400 capitalize">
              {showAllMonths || selectedMonth === 'all' 
                ? (selectedYear !== undefined && selectedYear !== 0 ? `${selectedYear}` : 'Todos los años')
                : monthName}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">IVA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {incomeLoading ? (
                <div className="animate-pulse bg-slate-700 h-8 w-24 rounded"></div>
              ) : (
                formatCurrency(incomeData?.total_iva || 0)
              )}
            </div>
            <p className="text-xs text-slate-400">
              {selectedMonth === 'all' 
                ? (selectedYear !== undefined && selectedYear !== 0 ? 'Del año seleccionado' : 'De todos los años')
                : 'Del mes seleccionado'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">PPM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {incomeLoading ? (
                <div className="animate-pulse bg-slate-700 h-8 w-24 rounded"></div>
              ) : (
                formatCurrency(((incomeData?.total_net || 0) + (incomeData?.total_iva || 0)) * 0.06)
              )}
            </div>
            <p className="text-xs text-slate-400">
              {selectedMonth === 'all' 
                ? (selectedYear !== undefined && selectedYear !== 0 ? 'Del año seleccionado' : 'De todos los años')
                : 'Del mes seleccionado'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Dinero</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const netAmount = incomeData?.total_net || 0
              const ivaAmount = incomeData?.total_iva || 0
              
              // Total factura = Neto + IVA
              const totalFactura = netAmount + ivaAmount
              
              // PPM = Total factura * 0.06
              const ppm = totalFactura * 0.06
              
              // Total final = Neto - PPM
              const totalFinal = netAmount - ppm
=======
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
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
            
            return (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-emerald-400">
                  {incomeLoading ? (
                    <div className="animate-pulse bg-slate-700 h-8 w-24 rounded"></div>
                  ) : (
<<<<<<< HEAD
                    formatCurrency(totalFinal)
=======
                    formatCurrency(totalReal)
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
                  )}
                </div>
                
                <div className="space-y-1 text-xs border-t border-slate-700 pt-2">
                  <div className="flex justify-between">
<<<<<<< HEAD
                    <span className="text-slate-400">PPM:</span>
                    <span className="font-medium text-red-400">
                      {incomeLoading ? (
                        <div className="animate-pulse bg-slate-700 h-3 w-16 rounded"></div>
                      ) : (
                        `- ${formatCurrency(ppm)}`
=======
                    <span className="text-slate-400">Neto - 6%:</span>
                    <span className="font-medium text-slate-100">
                      {incomeLoading ? (
                        <div className="animate-pulse bg-slate-700 h-3 w-16 rounded"></div>
                      ) : (
                        formatCurrency(netAfterDiscount)
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
<<<<<<< HEAD
                    <span className="text-slate-400">IVA:</span>
=======
                    <span className="text-slate-400">IVA 19%:</span>
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
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
<<<<<<< HEAD
                        formatCurrency(totalFinal)
=======
                        formatCurrency(totalReal)
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className={`transition-all duration-200 border-2 ${
            statusFilter === 'all'
              ? 'bg-blue-900/30 border-blue-500 shadow-lg cursor-pointer'
              : 'bg-slate-700/30 border-slate-600 hover:border-slate-500 cursor-pointer'
          }`}
          onClick={() => onStatusFilterChange && onStatusFilterChange('all')}
        >
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${
              statusFilter === 'all' ? 'text-blue-400' : 'text-slate-400'
            }`}>
              Total Facturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              statusFilter === 'all' ? 'text-blue-400' : 'text-slate-100'
            }`}>
              {stats.total}
            </div>
            <p className="text-xs text-slate-400">
              {stats.processed} procesadas ({processedPercentage}%)
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`transition-all duration-200 border-2 ${
            statusFilter === 'pending'
              ? 'bg-yellow-900/30 border-yellow-500 shadow-lg cursor-pointer'
              : 'bg-slate-700/30 border-slate-600 hover:border-slate-500 cursor-pointer'
          }`}
          onClick={() => onStatusFilterChange && onStatusFilterChange('pending')}
        >
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium ${
              statusFilter === 'pending' ? 'text-yellow-400' : 'text-slate-400'
            }`}>
              Facturas Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              statusFilter === 'pending' ? 'text-yellow-400' : 'text-yellow-400'
            }`}>
              {stats.pending}
            </div>
            <p className="text-xs text-slate-400">
              Requieren procesamiento
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
