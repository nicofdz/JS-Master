'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'

interface ReportCardsProps {
  data: {
    totalEarnings: number
    contractorEarnings: number
    workerPayments: number
    totalExpenses: number
    earningsChange: number
    contractorChange: number
    workerChange: number
    expensesChange: number
  }
  loading?: boolean
}

export function ReportCards({ data, loading = false }: ReportCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const getChangeIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />
    if (value < 0) return <ArrowDownRight className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Ganancias Generales',
      value: formatCurrency(data.totalEarnings),
      change: data.earningsChange,
      icon: DollarSign,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/10',
      description: 'Ingresos totales del mes'
    },
    {
      title: 'Ganancias Contratista',
      value: formatCurrency(data.contractorEarnings),
      change: data.contractorChange,
      icon: TrendingUp,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: 'Beneficios del contratista'
    },
    {
      title: 'Pagos a Trabajadores',
      value: formatCurrency(data.workerPayments),
      change: data.workerChange,
      icon: Users,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      description: 'Salarios y bonificaciones'
    },
    {
      title: 'Gastos Realizados',
      value: formatCurrency(data.totalExpenses),
      change: data.expensesChange,
      icon: CreditCard,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-500/10',
      description: 'Gastos operacionales'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="relative overflow-hidden bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100 mb-1">
              {card.value}
            </div>
            <div className="flex items-center space-x-1 text-sm">
              {getChangeIcon(card.change)}
              <span className={getChangeColor(card.change)}>
                {formatPercentage(card.change)}
              </span>
              <span className="text-slate-500">vs mes anterior</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
