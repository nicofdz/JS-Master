'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Select } from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'

interface InvoiceChartProps {
  projectId?: number
  onMonthClick?: (month: number) => void
  onYearChange?: (year: number) => void
}

interface MonthlyData {
  month: number
  total_income: number
  total_iva: number
  total_ppm: number
}

export function InvoiceChart({ projectId, onMonthClick, onYearChange }: InvoiceChartProps) {
  const [data, setData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<string>('all')

  const years = [
    { value: 'all', label: 'Todos los años' },
    { value: '2023', label: '2023' },
    { value: '2024', label: '2024' },
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' }
  ]

  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ]

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const yearParam = selectedYear === 'all' ? null : parseInt(selectedYear)
      
      const { data: chartData, error } = await supabase.rpc('get_invoice_stats_monthly', {
        p_year: yearParam,
        p_project_id: projectId || null
      })

      if (error) throw error

      // Crear array completo de 12 meses con datos por defecto
      const fullYearData = Array.from({ length: 12 }, (_, index) => {
        const monthNumber = index + 1
        const existingData = chartData?.find((item: MonthlyData) => item.month === monthNumber)
        
        return {
          month: monthNumber,
          total_income: existingData?.total_income || 0,
          total_iva: existingData?.total_iva || 0,
          total_ppm: existingData?.total_ppm || 0
        }
      })

      setData(fullYearData)
    } catch (error) {
      console.error('Error fetching invoice chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedYear, projectId])

  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value.toFixed(0)}`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const monthName = monthNames[label - 1]
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-slate-200 font-medium mb-2">{monthName}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatPrice(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const handleBarClick = (data: any) => {
    // Recharts pasa el objeto de datos completo al hacer click
    if (data && data.month && onMonthClick) {
      onMonthClick(data.month)
    }
  }

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const year = event.target.value
    setSelectedYear(year)
    
    if (onYearChange) {
      const yearNum = year === 'all' ? 0 : parseInt(year)
      onYearChange(yearNum)
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-100">
          Ingresos por Mes
        </h3>
        <div className="flex items-center gap-4">
          <Select
            value={selectedYear}
            onChange={handleYearChange}
            className="w-48 text-sm"
          >
            {years.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          onClick={handleBarClick}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="month" 
            tickFormatter={(value) => monthNames[value - 1]}
            stroke="#9CA3AF"
            onClick={handleBarClick}
            style={{ cursor: 'pointer' }}
          />
          <YAxis 
            tickFormatter={formatPrice}
            stroke="#9CA3AF"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="total_income" 
            name="Ingreso" 
            fill="#10B981"
            onClick={handleBarClick}
            style={{ cursor: 'pointer' }}
          />
          <Bar 
            dataKey="total_iva" 
            name="IVA" 
            fill="#3B82F6"
            onClick={handleBarClick}
            style={{ cursor: 'pointer' }}
          />
          <Bar 
            dataKey="total_ppm" 
            name="PPM" 
            fill="#EF4444"
            onClick={handleBarClick}
            style={{ cursor: 'pointer' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
