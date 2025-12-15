'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ChevronUp, ChevronDown, LayoutDashboard } from 'lucide-react'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { useDashboard } from '@/hooks/useDashboard'
import { useAuth } from '@/hooks'
import { getStatusEmoji, getStatusColor, getStatusText, formatDate } from '@/lib/utils'
import { ROLE_LABELS } from '@/types/auth'

export default function DashboardPage() {
  const { stats, projectProgress, floorStatus, loading, error } = useDashboard()
  const { profile } = useAuth()
  const [showAllFloors, setShowAllFloors] = useState(false)
  const [showAllProjects, setShowAllProjects] = useState(false)

  // Usar datos reales de la base de datos
  const projects = projectProgress || []
  const floors = floorStatus || []

  // Filtrar pisos para mostrar
  const displayedFloors = showAllFloors ? floors : floors.slice(0, 2)
  const displayedProjects = showAllProjects ? projects : projects.slice(0, 2)

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="w-full">
        {/* Header personalizado */}
        {/* Header personalizado - Título restaurado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-600/20">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Dashboard Principal</h1>
              <p className="text-slate-400">Resumen general del estado de los proyectos</p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
            <div className="flex">
              <span className="text-red-400 mr-2">⚠️</span>
              <div>
                <h3 className="text-red-300 font-medium">Error al conectar con Supabase</h3>
                <p className="text-red-400 text-sm mt-1">{error}</p>
                <p className="text-red-500 text-xs mt-2">
                  Asegúrate de que tu proyecto Supabase esté configurado y las tablas creadas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <DashboardStats
          totalProjects={stats.totalProjects}
          activeProjects={stats.activeProjects}
          totalFloors={stats.totalFloors}
          totalApartments={stats.totalApartments}
          averageProgress={stats.averageProgress}
          delayedProjects={projects.filter(p => p.is_delayed).length}
          loading={loading}
        />

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Projects List */}
          <div>
            <Card className="bg-slate-800/50 border-slate-700 transition-all duration-300">
              <CardHeader
                className="flex flex-row items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors rounded-t-lg flex-shrink-0"
                onClick={() => setShowAllProjects(!showAllProjects)}
              >
                <CardTitle className="text-slate-100">Proyectos en Progreso</CardTitle>
                {projects.length > 2 && (
                  <button
                    className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700/50"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAllProjects(!showAllProjects)
                    }}
                  >
                    {showAllProjects ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {displayedProjects.map((project) => (
                    <div key={project.id} className="border border-slate-700 rounded-lg p-4 bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                          <h3 className="font-semibold text-slate-100">{project.name}</h3>
                          {project.is_delayed && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-700 w-fit">
                              ⚠️ Retrasado {project.delay_percentage}% ({project.delayed_tasks} tareas)
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)} self-start sm:self-auto`}>
                          {getStatusEmoji(project.status)} {getStatusText(project.status)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-3">{project.address || 'Sin dirección'}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-slate-500">Pisos:</span> <span className="text-slate-200">{project.floors_created || 0}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Apartamentos:</span> <span className="text-slate-200">{project.apartments_created || 0}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Tareas:</span> <span className="text-slate-200">{project.activities_completed || 0}/{project.total_activities || 0}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Progreso:</span> <span className="text-slate-200">{project.progress_percentage || 0}%</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-300">Progreso General</span>
                          <span className={`${project.is_delayed ? 'text-red-400' : 'text-slate-200'}`}>
                            {project.progress_percentage || 0}%
                          </span>
                        </div>
                        {project.is_delayed && (
                          <div className="mb-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg flex justify-between items-center gap-2">
                            <span className="text-xs text-red-400">
                              ⚠️ Proyecto retrasado un {project.delay_percentage}%
                            </span>
                            <Link
                              href={`/tareas?status=delayed&project=${project.id}`}
                              className="text-xs bg-red-600/20 hover:bg-red-600/40 text-red-300 px-2 py-1 rounded border border-red-500/30 transition-colors whitespace-nowrap"
                            >
                              Ver tareas
                            </Link>
                          </div>
                        )}
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${project.is_delayed ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${project.progress_percentage || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Floor Status */}
          <div>
            <Card className="bg-slate-800/50 border-slate-700 transition-all duration-300">
              <CardHeader
                className="flex flex-row items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors rounded-t-lg flex-shrink-0"
                onClick={() => setShowAllFloors(!showAllFloors)}
              >
                <CardTitle className="text-slate-100">Estado de Pisos Recientes</CardTitle>
                {floors.length > 2 && (
                  <button
                    className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700/50"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAllFloors(!showAllFloors)
                    }}
                  >
                    {showAllFloors ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {displayedFloors.map((floor) => (
                    <div key={floor.id} className="border border-slate-700 rounded-lg p-4 bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-slate-100">
                            {floor.project_name} - Piso {floor.floor_number}
                          </h4>
                          <p className="text-sm text-slate-400">
                            {floor.apartments_count} apartamentos
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(floor.status)}`}>
                          {getStatusEmoji(floor.status)} {getStatusText(floor.status)}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-300">Progreso</span>
                          <span className="text-slate-200">{floor.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${floor.status === 'completed' ? 'bg-green-500' :
                              floor.status === 'in-progress' ? 'bg-blue-500' :
                                'bg-slate-500'
                              }`}
                            style={{ width: `${floor.progress_percentage}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex justify-between text-sm text-slate-400">
                        <span>Tareas: {floor.completed_activities}/{floor.total_activities}</span>
                        <span className="text-blue-400">
                          {floor.progress_percentage}% completado
                        </span>
                      </div>

                      {/* Información adicional de apartamentos */}
                      <div className="mt-2 text-xs text-slate-500">
                        <div className="flex flex-col sm:flex-row justify-between gap-2">
                          <span>Apartamentos:</span>
                          <div className="flex flex-wrap gap-2">
                            {floor.completed_apartments > 0 && (
                              <span className="text-green-600">
                                ✅ {floor.completed_apartments} terminados
                              </span>
                            )}
                            {floor.pending_apartments > 0 && (
                              <span className="text-slate-400">
                                ⚪ {floor.pending_apartments} pendientes
                              </span>
                            )}
                            {floor.in_progress_apartments > 0 && (
                              <span className="text-blue-600">
                                🔵 {floor.in_progress_apartments} en progreso
                              </span>
                            )}
                            {floor.blocked_apartments > 0 && (
                              <span className="text-red-600">
                                ⛔ {floor.blocked_apartments} bloqueados
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
