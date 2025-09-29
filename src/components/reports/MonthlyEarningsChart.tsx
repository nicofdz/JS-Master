'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface MonthlyEarningsChartProps {
  data: Array<{
    month: string
    totalEarnings: number
    contractorEarnings: number
    workerPayments: number
  }>
}

export function MonthlyEarningsChart({ data }: MonthlyEarningsChartProps) {
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
          <div className="text-4xl mb-2">📊</div>
          <p className="text-gray-600">No hay datos de ganancias disponibles</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
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
          <Bar 
            dataKey="totalEarnings" 
            name="Ganancias Totales"
            fill="#10b981" 
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="contractorEarnings" 
            name="Ganancias Contratista"
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="workerPayments" 
            name="Pagos Trabajadores"
            fill="#f59e0b" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
