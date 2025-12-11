'use client'

import { useState, useRef } from 'react'
import { toPng } from 'html-to-image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  TrendingUp,
  DollarSign, // eslint-disable-line @typescript-eslint/no-unused-vars
  Users,
  CreditCard,
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'
import { MonthlyEarningsChart } from '@/components/reports/MonthlyEarningsChart'
import { MonthlyExpensesChart } from '@/components/reports/MonthlyExpensesChart'
import { MonthlyProgressChart } from '@/components/reports/MonthlyProgressChart'
import { ReportCards } from '@/components/reports/ReportCards'
import { useReports } from '@/hooks/useReports'
import { generateExcelReport } from '@/utils/reportExporter'

export default function ReportesPage() {
  const {
    monthlyData,
    earningsData,
    expensesData,
    progressData,
    currentMonthStats,
    loading,
    error,
    refreshData
  } = useReports()

  const [selectedPeriod, setSelectedPeriod] = useState('current-month')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Refs for capturing charts
  const earningsChartRef = useRef<HTMLDivElement>(null)
  const expensesChartRef = useRef<HTMLDivElement>(null)
  const progressChartRef = useRef<HTMLDivElement>(null)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshData()
    setIsRefreshing(false)
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)

      // Capture charts
      const captureChart = async (ref: React.RefObject<HTMLDivElement>) => {
        if (ref.current) {
          return await toPng(ref.current, { backgroundColor: '#1e293b' }) // slate-900 background
        }
        return ''
      }

      const [earningsImg, expensesImg, progressImg] = await Promise.all([
        captureChart(earningsChartRef),
        captureChart(expensesChartRef),
        captureChart(progressChartRef)
      ])

      await generateExcelReport({
        stats: displayedStats,
        earningsData: filteredEarningsData,
        expensesData: filteredExpensesData,
        progressData: filteredProgressData,
        chartImages: {
          earnings: earningsImg,
          expenses: expensesImg,
          progress: progressImg
        }
      })
    } catch (error) {
      console.error('Error exporting report:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleFilter = () => {
    // TODO: Implementar filtros de reportes
    console.log('Aplicando filtros...')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-slate-400">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <CreditCard className="h-12 w-12 mx-auto mb-2 text-red-500" />
            <p className="text-lg font-semibold text-red-400">Error al cargar reportes</p>
            <p className="text-sm text-slate-400">{error}</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const calculateStatsForPeriod = (period: string, data: any[], currentStats: any) => {
    if (!data.length) return currentStats

    const now = new Date()
    const currentMonth = now.getMonth() // 0-11

    let filteredData: any[] = []

    switch (period) {
      case 'current-month':
        return currentStats
      case 'last-3-months':
        // Tomar los últimos 3 meses (incluyendo el actual si tiene datos, o los 3 anteriores)
        // Como monthlyData es fijo Ene-Dic del año actual:
        filteredData = data.slice(Math.max(0, currentMonth - 2), currentMonth + 1)
        break
      case 'last-6-months':
        filteredData = data.slice(Math.max(0, currentMonth - 5), currentMonth + 1)
        break
      case 'last-year':
        filteredData = data
        break
      default:
        return currentStats
    }

    if (filteredData.length === 0) return currentStats

    // Sumar totales
    const totals = filteredData.reduce((acc, curr) => ({
      totalEarnings: acc.totalEarnings + curr.totalEarnings,
      contractorEarnings: acc.contractorEarnings + curr.contractorEarnings,
      workerPayments: acc.workerPayments + curr.workerPayments,
      totalExpenses: acc.totalExpenses + curr.totalExpenses,
    }), {
      totalEarnings: 0,
      contractorEarnings: 0,
      workerPayments: 0,
      totalExpenses: 0
    })

    // Retornar con cambios en 0 ya que es un acumulado
    return {
      ...totals,
      earningsChange: 0,
      contractorChange: 0,
      workerChange: 0,
      expensesChange: 0
    }
  }

  const calculateChartDataForPeriod = (period: string, fullData: any[]) => {
    if (!fullData || fullData.length === 0) return []

    const now = new Date()
    const currentMonth = now.getMonth() // 0-11

    switch (period) {
      case 'current-month':
        return fullData.slice(Math.max(0, currentMonth - 0), currentMonth + 1)
      case 'last-3-months':
        return fullData.slice(Math.max(0, currentMonth - 2), currentMonth + 1)
      case 'last-6-months':
        return fullData.slice(Math.max(0, currentMonth - 5), currentMonth + 1)
      case 'last-year':
        return fullData
      default:
        return fullData
    }
  }

  const displayedStats = calculateStatsForPeriod(selectedPeriod, monthlyData, currentMonthStats)

  // Filter data for charts
  const filteredEarningsData = calculateChartDataForPeriod(selectedPeriod, earningsData)
  const filteredExpensesData = calculateChartDataForPeriod(selectedPeriod, expensesData)
  const filteredProgressData = calculateChartDataForPeriod(selectedPeriod, progressData)

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Reportes Financieros</h1>
            <p className="text-slate-400 mt-1">
              Análisis de ganancias, gastos y progreso de proyectos
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleFilter}
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>

            <Button
              onClick={handleExport}
              disabled={isExporting}
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-bounce' : ''}`} />
              {isExporting ? 'Exportando...' : 'Exportar Excel'}
            </Button>

            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedPeriod === 'current-month' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('current-month')}
                className={selectedPeriod === 'current-month' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Mes Actual
              </Button>
              <Button
                variant={selectedPeriod === 'last-3-months' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('last-3-months')}
                className={selectedPeriod === 'last-3-months' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'}
              >
                Últimos 3 Meses
              </Button>
              <Button
                variant={selectedPeriod === 'last-6-months' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('last-6-months')}
                className={selectedPeriod === 'last-6-months' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'}
              >
                Últimos 6 Meses
              </Button>
              <Button
                variant={selectedPeriod === 'last-year' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('last-year')}
                className={selectedPeriod === 'last-year' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'}
              >
                Último Año
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <ReportCards
          data={displayedStats}
          loading={loading}
        />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Earnings Chart */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Ganancias Mensuales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={earningsChartRef}>
                <MonthlyEarningsChart data={filteredEarningsData} />
              </div>
            </CardContent>
          </Card>

          {/* Monthly Expenses Chart */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <CreditCard className="h-5 w-5 text-red-500" />
                Gastos Mensuales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={expensesChartRef}>
                <MonthlyExpensesChart data={filteredExpensesData} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Chart - Full Width */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Users className="h-5 w-5 text-blue-500" />
              Avance de Proyectos por Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={progressChartRef}>
              <MonthlyProgressChart data={filteredProgressData} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
