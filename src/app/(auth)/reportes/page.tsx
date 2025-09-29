'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  TrendingUp, 
  DollarSign, 
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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshData()
    setIsRefreshing(false)
  }

  const handleExport = () => {
    // TODO: Implementar exportación de reportes
    console.log('Exportando reportes...')
  }

  const handleFilter = () => {
    // TODO: Implementar filtros de reportes
    console.log('Aplicando filtros...')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600" />
          <p className="text-gray-600">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <CreditCard className="h-12 w-12 mx-auto mb-2 text-red-500" />
            <p className="text-lg font-semibold text-red-600">Error al cargar reportes</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes Financieros</h1>
          <p className="text-gray-600 mt-1">
            Análisis de ganancias, gastos y progreso de proyectos
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleFilter}
            variant="outline"
            size="sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedPeriod === 'current-month' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('current-month')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Mes Actual
            </Button>
            <Button
              variant={selectedPeriod === 'last-3-months' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('last-3-months')}
            >
              Últimos 3 Meses
            </Button>
            <Button
              variant={selectedPeriod === 'last-6-months' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('last-6-months')}
            >
              Últimos 6 Meses
            </Button>
            <Button
              variant={selectedPeriod === 'last-year' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('last-year')}
            >
              Último Año
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <ReportCards 
        data={currentMonthStats}
        loading={loading}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Earnings Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Ganancias Mensuales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyEarningsChart data={earningsData} />
          </CardContent>
        </Card>

        {/* Monthly Expenses Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-600" />
              Gastos Mensuales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyExpensesChart data={expensesData} />
          </CardContent>
        </Card>
      </div>

      {/* Progress Chart - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Avance de Proyectos por Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyProgressChart data={progressData} />
        </CardContent>
      </Card>
    </div>
  )
}
