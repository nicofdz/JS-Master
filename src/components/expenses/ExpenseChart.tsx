'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'

interface MonthlyData {
  month: number
  document_type?: string
  expense_type?: string
  total_amount: number
}

interface ExpenseChartProps {
  year: number
  projectId?: number
  refreshToken?: number
  onMonthClick?: (month: number) => void
  onYearChange?: (year: number) => void
  onCategoryClick?: (category: string) => void
  onMonthAndCategoryClick?: (month: number, category: string) => void
  onMonthAndDocumentTypeClick?: (month: number, documentType: string) => void
  onDocumentTypeClick?: (documentType: string) => void
  onViewModeChange?: (viewMode: 'document' | 'category') => void
}

const years = [
  { value: 'all', label: 'Todos los años' },
  { value: '2023', label: '2023' },
  { value: '2024', label: '2024' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' }
]

export function ExpenseChart({ 
  year, 
  projectId,
  refreshToken,
  onMonthClick, 
  onYearChange, 
  onCategoryClick, 
  onMonthAndCategoryClick, 
  onDocumentTypeClick,
  onMonthAndDocumentTypeClick,
  onViewModeChange 
}: ExpenseChartProps) {
  const [viewMode, setViewMode] = useState<'document' | 'category'>('document')
  const [selectedYear, setSelectedYear] = useState(year === 0 ? 'all' : year.toString())
  const [documentData, setDocumentData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ]

  const categoryColors = {
    materiales: '#3B82F6',    // Azul
    servicios: '#10B981',      // Verde
    epp: '#F59E0B',           // Amarillo
    combustible: '#F97316',    // Naranja
    herramientas: '#8B5CF6',   // Púrpura
    otros: '#6B7280'           // Gris
  }

  const fetchDocumentData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_expense_stats_by_document_type_monthly', {
        p_year: selectedYear === 'all' ? null : parseInt(selectedYear),
        p_project_id: projectId || null
      })

      if (error) throw error

      // Transformar datos para el gráfico
      const monthlyData: any[] = []
      for (let month = 1; month <= 12; month++) {
        const monthData: any = { month: monthNames[month - 1] }
        
        const monthStats = data?.filter((item: MonthlyData) => item.month === month) || []
        monthStats.forEach((stat: MonthlyData) => {
          monthData[stat.document_type!] = stat.total_amount
        })
        
        // Asegurar que siempre haya valores para boleta y factura
        monthData.boleta = monthData.boleta || 0
        monthData.factura = monthData.factura || 0
        
        monthlyData.push(monthData)
      }
      
      setDocumentData(monthlyData)
    } catch (err) {
      console.error('Error fetching document data:', err)
    }
  }

  const fetchCategoryData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_expense_stats_by_category_monthly', {
        p_year: selectedYear === 'all' ? null : parseInt(selectedYear),
        p_project_id: projectId || null
      })

      if (error) throw error

      // Transformar datos para el gráfico
      const monthlyData: any[] = []
      for (let month = 1; month <= 12; month++) {
        const monthData: any = { month: monthNames[month - 1] }
        
        const monthStats = data?.filter((item: MonthlyData) => item.month === month) || []
        monthStats.forEach((stat: MonthlyData) => {
          monthData[stat.expense_type!] = stat.total_amount
        })
        
        // Asegurar que siempre haya valores para todas las categorías
        const categories = ['materiales', 'servicios', 'epp', 'combustible', 'herramientas', 'otros']
        categories.forEach(category => {
          monthData[category] = monthData[category] || 0
        })
        
        monthlyData.push(monthData)
      }
      
      setCategoryData(monthlyData)
    } catch (err) {
      console.error('Error fetching category data:', err)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([fetchDocumentData(), fetchCategoryData()])
      setLoading(false)
    }
    
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, projectId, refreshToken])

  // Sincronizar con el año del prop cuando cambie
  useEffect(() => {
    setSelectedYear(year === 0 ? 'all' : year.toString())
  }, [year])

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const handleBarClick = (data: any, index: number, event?: any) => {
    const monthNumber = index + 1
    
    // Si estamos en vista de categorías, manejar click inteligente
    if (viewMode === 'category' && event) {
      // Obtener información del click
      const rect = event.currentTarget.getBoundingClientRect()
      const clickY = event.clientY - rect.top
      const barHeight = rect.height
      
      // Determinar qué categoría fue clickeada basado en la posición Y
      const categories = ['materiales', 'servicios', 'epp', 'combustible', 'herramientas', 'otros']
      const categoryHeight = barHeight / categories.length
      const clickedCategoryIndex = Math.floor(clickY / categoryHeight)
      
      if (clickedCategoryIndex >= 0 && clickedCategoryIndex < categories.length) {
        const clickedCategory = categories[clickedCategoryIndex]
        
        // Verificar si esa categoría tiene datos en ese mes
        const monthData = categoryData[index]
        if (monthData && monthData[clickedCategory] > 0) {
          // Click en categoría específica + mes
          if (onMonthAndCategoryClick) {
            onMonthAndCategoryClick(monthNumber, clickedCategory)
          }
        } else {
          // Click en área sin datos, solo filtrar por mes
          if (onMonthClick) {
            onMonthClick(monthNumber)
          }
        }
      } else {
        // Click fuera de las categorías, solo filtrar por mes
        if (onMonthClick) {
          onMonthClick(monthNumber)
        }
      }
    } else {
      // Vista de documento o sin información de evento, solo filtrar por mes
      if (onMonthClick) {
        onMonthClick(monthNumber)
      }
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {formatPrice(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const handleLegendClick = (category: string) => {
    if (viewMode === 'category') {
      if (onCategoryClick) {
        onCategoryClick(category)
      }
    } else {
      // Vista de documento, click en tipo de documento
      if (onDocumentTypeClick) {
        onDocumentTypeClick(category)
      }
    }
  }

  const createBarClickHandler = (dataKey: string) => (data: any, index: number, event: any) => {
    const monthNumber = index + 1
    
    if (viewMode === 'category') {
      // Click en categoría específica + mes
      if (onMonthAndCategoryClick) {
        onMonthAndCategoryClick(monthNumber, dataKey)
      }
    } else {
      // Vista de documento, click en tipo de documento específico + mes
      if (onMonthAndDocumentTypeClick) {
        onMonthAndDocumentTypeClick(monthNumber, dataKey)
      }
    }
  }

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400">Cargando gráfico...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800 border-slate-700 mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">
            {viewMode === 'document' ? 'Gastos por Tipo de Documento' : 'Gastos por Categoría'}
          </h3>
          <div className="flex items-center gap-3">
            <Select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value)
                if (onYearChange) {
                  onYearChange(e.target.value === 'all' ? 0 : parseInt(e.target.value))
                }
              }}
              className="bg-slate-700 border-slate-600 text-white w-32"
            >
              {years.map(year => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => {
                const newViewMode = viewMode === 'document' ? 'category' : 'document'
                setViewMode(newViewMode)
                if (onViewModeChange) {
                  onViewModeChange(newViewMode)
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {viewMode === 'document' ? 'Ver por Categorías' : 'Ver por Tipo de Documento'}
            </Button>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={viewMode === 'document' ? documentData : categoryData}
              onClick={(data: any, index: number) => {
                // Click en el fondo del gráfico (no en una barra específica)
                if (data && typeof index === 'number') {
                  const monthNumber = index + 1
                  if (onMonthClick) {
                    onMonthClick(monthNumber)
                  }
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="month" 
                stroke="#9CA3AF"
                fontSize={12}
                style={{ cursor: 'pointer' }}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => {
                  if (value >= 1000000) {
                    return `$${(value / 1000000).toFixed(0)}M`
                  } else if (value >= 1000) {
                    return `$${(value / 1000).toFixed(0)}K`
                  } else {
                    return `$${value.toFixed(0)}`
                  }
                }}
                domain={[0, 'dataMax']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                onClick={(e: any) => {
                  if (e.dataKey) {
                    handleLegendClick(e.dataKey)
                  }
                }}
                style={{ cursor: 'pointer' }}
              />
              
              {viewMode === 'document' ? (
                <>
                  <Bar 
                    dataKey="factura" 
                    name="Factura" 
                    fill="#3B82F6" 
                    radius={[2, 2, 0, 0]}
                    onClick={createBarClickHandler('factura')}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar 
                    dataKey="boleta" 
                    name="Boleta" 
                    fill="#6B7280" 
                    radius={[2, 2, 0, 0]}
                    onClick={createBarClickHandler('boleta')}
                    style={{ cursor: 'pointer' }}
                  />
                </>
              ) : (
                <>
                  <Bar 
                    dataKey="materiales" 
                    name="Materiales" 
                    fill={categoryColors.materiales} 
                    radius={[2, 2, 0, 0]}
                    onClick={createBarClickHandler('materiales')}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar 
                    dataKey="servicios" 
                    name="Servicios" 
                    fill={categoryColors.servicios} 
                    radius={[2, 2, 0, 0]}
                    onClick={createBarClickHandler('servicios')}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar 
                    dataKey="epp" 
                    name="EPP" 
                    fill={categoryColors.epp} 
                    radius={[2, 2, 0, 0]}
                    onClick={createBarClickHandler('epp')}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar 
                    dataKey="combustible" 
                    name="Combustible" 
                    fill={categoryColors.combustible} 
                    radius={[2, 2, 0, 0]}
                    onClick={createBarClickHandler('combustible')}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar 
                    dataKey="herramientas" 
                    name="Herramientas" 
                    fill={categoryColors.herramientas} 
                    radius={[2, 2, 0, 0]}
                    onClick={createBarClickHandler('herramientas')}
                    style={{ cursor: 'pointer' }}
                  />
                  <Bar 
                    dataKey="otros" 
                    name="Otros" 
                    fill={categoryColors.otros} 
                    radius={[2, 2, 0, 0]}
                    onClick={createBarClickHandler('otros')}
                    style={{ cursor: 'pointer' }}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
