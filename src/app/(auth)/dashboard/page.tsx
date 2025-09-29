'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { useDashboard } from '@/hooks/useDashboard'
import { useAuth } from '@/hooks'
import { getStatusEmoji, getStatusColor, getStatusText, formatDate } from '@/lib/utils'
import { ROLE_LABELS } from '@/types/auth'

export default function DashboardPage() {
  const { stats, projectProgress, floorStatus, loading, error } = useDashboard()
  const { profile } = useAuth()
  const [showAllFloors, setShowAllFloors] = useState(false)

  // Usar datos reales de la base de datos
  const projects = projectProgress || []
  const floors = floorStatus || []
  
  // Filtrar pisos para mostrar
  const displayedFloors = showAllFloors ? floors : floors.slice(0, 2)
    
  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header personalizado */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Dashboard Principal
          </h1>
          <p className="text-gray-600">
            Bienvenido {profile?.full_name} - {profile?.role ? ROLE_LABELS[profile.role] : 'Usuario'}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <span className="text-red-500 mr-2">⚠️</span>
              <div>
                <h3 className="text-red-800 font-medium">Error al conectar con Supabase</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                <p className="text-red-600 text-xs mt-2">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Projects List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Proyectos en Progreso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{project.name}</h3>
                          {project.is_delayed && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ⚠️ Retrasado {project.delay_percentage}% ({project.delayed_tasks} tareas)
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusEmoji(project.status)} {getStatusText(project.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{project.address || 'Sin dirección'}</p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">Pisos:</span> <span className="text-gray-900">{project.floors_created || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Apartamentos:</span> <span className="text-gray-900">{project.apartments_created || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Tareas:</span> <span className="text-gray-900">{project.activities_completed || 0}/{project.total_activities || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Progreso:</span> <span className="text-gray-900">{project.progress_percentage || 0}%</span>
                        </div>
                      </div>


                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">Progreso General</span>
                          <span className={`${project.is_delayed ? 'text-red-600' : 'text-gray-900'}`}>
                            {project.progress_percentage || 0}%
                          </span>
                        </div>
                        {project.is_delayed && (
                          <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700">
                            ⚠️ Proyecto retrasado un {project.delay_percentage}% - Revisar tareas pendientes
                          </div>
                        )}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${project.is_delayed ? 'bg-red-500' : 'bg-primary-600'}`}
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
            <Card>
              <CardHeader>
                <CardTitle>Estado de Pisos Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {displayedFloors.map((floor) => (
                    <div key={floor.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {floor.project_name} - Piso {floor.floor_number}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {floor.apartments_count} apartamentos
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(floor.status)}`}>
                          {getStatusEmoji(floor.status)} {getStatusText(floor.status)}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progreso</span>
                          <span>{floor.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              floor.status === 'completed' ? 'bg-success-500' :
                              floor.status === 'in-progress' ? 'bg-primary-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${floor.progress_percentage}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Tareas: {floor.completed_activities}/{floor.total_activities}</span>
                        <span className="text-primary-600">
                          {floor.progress_percentage}% completado
                        </span>
                      </div>
                      
                      {/* Información adicional de apartamentos */}
                      <div className="mt-2 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Apartamentos:</span>
                          <div className="flex space-x-2">
                            {floor.completed_apartments > 0 && (
                              <span className="text-green-600">
                                ✅ {floor.completed_apartments} terminados
                              </span>
                            )}
                            {floor.pending_apartments > 0 && (
                              <span className="text-gray-600">
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
                  
                  {/* Botón Ver más/Ver menos */}
                  {floors.length > 2 && (
                    <div className="flex justify-center pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setShowAllFloors(!showAllFloors)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200"
                      >
                        {showAllFloors ? (
                          <>
                            <span>Ver menos</span>
                            <span className="ml-1">↑</span>
                          </>
                        ) : (
                          <>
                            <span>Ver más ({floors.length - 2} pisos adicionales)</span>
                            <span className="ml-1">↓</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
