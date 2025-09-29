'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts'

interface MonthlyExpensesChartProps {
  data: Array<{
    month: string
    totalExpenses: number
    materialCosts: number
    laborCosts: number
    operationalCosts: number
  }>
}

export function MonthlyExpensesChart({ data }: MonthlyExpensesChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">
                {entry.name}: {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">💸</div>
          <p className="text-gray-600">No hay datos de gastos disponibles</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="colorTotalExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorMaterialCosts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorLaborCosts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOperationalCosts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            stroke="#374151"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#374151' }}
          />
          <YAxis 
            stroke="#374151"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#374151' }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ color: '#374151' }}
            iconType="rect"
          />
          <Area
            type="monotone"
            dataKey="totalExpenses"
            name="Gastos Totales"
            stroke="#ef4444"
            fillOpacity={1}
            fill="url(#colorTotalExpenses)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="materialCosts"
            name="Costos Materiales"
            stroke="#8b5cf6"
            fillOpacity={1}
            fill="url(#colorMaterialCosts)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="laborCosts"
            name="Costos Mano de Obra"
            stroke="#f59e0b"
            fillOpacity={1}
            fill="url(#colorLaborCosts)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="operationalCosts"
            name="Gastos Operacionales"
            stroke="#06b6d4"
            fillOpacity={1}
            fill="url(#colorOperationalCosts)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
