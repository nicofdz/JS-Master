'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Building2, TrendingUp, Layers, Home } from 'lucide-react'

interface DashboardStatsProps {
  totalProjects: number
  activeProjects: number
  totalFloors: number
  totalApartments: number
  averageProgress: number
  delayedProjects: number
  loading?: boolean
}

export function DashboardStats({
  totalProjects,
  activeProjects,
  totalFloors,
  totalApartments,
  averageProgress,
  delayedProjects,
  loading = false
}: DashboardStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-200 rounded-lg animate-pulse">
                  <div className="w-8 h-8 bg-gray-300 rounded"></div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <Card className="h-full">
        <CardContent className="p-6 h-full flex items-center">
          <div className="flex items-center w-full">
            <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Proyectos Activos</p>
              <p className="text-2xl font-bold text-gray-900">{activeProjects}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardContent className="p-6 h-full flex items-center">
          <div className="flex items-center w-full">
            <div className="p-3 bg-green-100 rounded-lg flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Progreso Promedio</p>
              <p className="text-2xl font-bold text-gray-900">{averageProgress}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardContent className="p-6 h-full flex items-center">
          <div className="flex items-center w-full">
            <div className="p-3 bg-orange-100 rounded-lg flex-shrink-0">
              <Layers className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Total Pisos</p>
              <p className="text-2xl font-bold text-gray-900">{totalFloors}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardContent className="p-6 h-full flex items-center">
          <div className="flex items-center w-full">
            <div className="p-3 bg-purple-100 rounded-lg flex-shrink-0">
              <Home className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Total Departamentos</p>
              <p className="text-2xl font-bold text-gray-900">{totalApartments}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardContent className="p-6 h-full flex items-center">
          <div className="flex items-center w-full">
            <div className="p-3 bg-red-100 rounded-lg flex-shrink-0">
              <Building2 className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">Proyectos Retrasados</p>
              <p className="text-2xl font-bold text-gray-900">{delayedProjects}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
