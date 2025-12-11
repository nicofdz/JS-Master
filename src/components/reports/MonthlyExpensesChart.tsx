'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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
        <div className="bg-slate-800 p-4 border border-slate-700 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-100 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-slate-300">
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
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="text-center">
          <div className="text-4xl mb-2">💸</div>
          <p className="text-slate-400">No hay datos de gastos disponibles</p>
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
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="month"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8' }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8' }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: '#94a3b8' }}
            iconType="rect"
          />
          <Bar
            dataKey="materialCosts"
            name="Materiales"
            stackId="a"
            fill="#ef4444"
            radius={[0, 0, 4, 4]}
          />
          <Bar
            dataKey="laborCosts"
            name="Mano de Obra"
            stackId="a"
            fill="#f97316"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="operationalCosts"
            name="Operacionales"
            stackId="a"
            fill="#eab308"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
