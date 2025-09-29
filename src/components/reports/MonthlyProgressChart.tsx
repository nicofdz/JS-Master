'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'

interface MonthlyProgressChartProps {
  data: Array<{
    month: string
    averageProgress: number
    completedProjects: number
    activeProjects: number
    delayedProjects: number
  }>
}

export function MonthlyProgressChart({ data }: MonthlyProgressChartProps) {
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
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
                {entry.name}: {entry.dataKey === 'averageProgress' ? formatPercentage(entry.value) : entry.value}
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
          <div className="text-4xl mb-2">📈</div>
          <p className="text-gray-600">No hay datos de progreso disponibles</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
            yAxisId="progress"
            orientation="left"
            stroke="#374151"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#374151' }}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
          />
          <YAxis 
            yAxisId="projects"
            orientation="right"
            stroke="#374151"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#374151' }}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ color: '#374151' }}
            iconType="line"
          />
          <ReferenceLine 
            yAxisId="progress"
            y={75} 
            stroke="#10b981" 
            strokeDasharray="5 5" 
            label={{ value: "Meta 75%", position: "top" }}
          />
          <Line
            yAxisId="progress"
            type="monotone"
            dataKey="averageProgress"
            name="Progreso Promedio"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
          />
          <Line
            yAxisId="projects"
            type="monotone"
            dataKey="completedProjects"
            name="Proyectos Completados"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2 }}
          />
          <Line
            yAxisId="projects"
            type="monotone"
            dataKey="activeProjects"
            name="Proyectos Activos"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: '#f59e0b', strokeWidth: 2 }}
          />
          <Line
            yAxisId="projects"
            type="monotone"
            dataKey="delayedProjects"
            name="Proyectos Retrasados"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: '#ef4444', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
