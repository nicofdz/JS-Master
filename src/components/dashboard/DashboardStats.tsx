'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Building2, TrendingUp, Layers, Home } from 'lucide-react'
import Link from 'next/link'

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="bg-slate-700/30 border-2 border-slate-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-slate-600 rounded animate-pulse mb-2"></div>
                  <div className="h-8 bg-slate-600 rounded animate-pulse"></div>
                </div>
                <div className="w-10 h-10 bg-slate-600 rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <Link href="/proyectos" className="block h-full group">
        <Card className="h-full bg-slate-700/30 border-2 border-slate-600 group-hover:border-blue-500/50 group-hover:bg-slate-700/50 transition-all cursor-pointer">
          <CardContent className="p-6 h-full flex items-center">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-sm font-medium text-slate-300 group-hover:text-blue-300 transition-colors">Proyectos Activos</p>
                <p className="text-2xl font-bold text-slate-100">{activeProjects}</p>
              </div>
              <Building2 className="w-10 h-10 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </Link>

      <Card className="h-full bg-slate-700/30 border-2 border-slate-600">
        <CardContent className="p-6 h-full flex items-center">
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-sm font-medium text-slate-300">Progreso Promedio</p>
              <p className="text-2xl font-bold text-slate-100">{averageProgress}%</p>
            </div>
            <TrendingUp className="w-10 h-10 text-emerald-400" />
          </div>
        </CardContent>
      </Card>

      <Link href="/pisos" className="block h-full group">
        <Card className="h-full bg-slate-700/30 border-2 border-slate-600 group-hover:border-orange-500/50 group-hover:bg-slate-700/50 transition-all cursor-pointer">
          <CardContent className="p-6 h-full flex items-center">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-sm font-medium text-slate-300 group-hover:text-orange-300 transition-colors">Total Pisos</p>
                <p className="text-2xl font-bold text-slate-100">{totalFloors}</p>
              </div>
              <Layers className="w-10 h-10 text-orange-400 group-hover:scale-110 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </Link>

      <Link href="/apartamentos" className="block h-full group">
        <Card className="h-full bg-slate-700/30 border-2 border-slate-600 group-hover:border-purple-500/50 group-hover:bg-slate-700/50 transition-all cursor-pointer">
          <CardContent className="p-6 h-full flex items-center">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-sm font-medium text-slate-300 group-hover:text-purple-300 transition-colors">Total Departamentos</p>
                <p className="text-2xl font-bold text-slate-100">{totalApartments}</p>
              </div>
              <Home className="w-10 h-10 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </Link>

      <Card className="h-full bg-slate-700/30 border-2 border-slate-600">
        <CardContent className="p-6 h-full flex items-center">
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-sm font-medium text-slate-300">Proyectos Retrasados</p>
              <p className="text-2xl font-bold text-slate-100">{delayedProjects}</p>
            </div>
            <Building2 className="w-10 h-10 text-red-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
