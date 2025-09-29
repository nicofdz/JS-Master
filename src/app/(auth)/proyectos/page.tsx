'use client'

import React, { useState } from 'react'
import { useProjects } from '@/hooks'
import { useProjectFilter } from '@/hooks/useProjectFilter'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { PlanViewerModal } from '@/components/projects/PlanViewerModal'
import { Plus, Search, Filter, Edit, Trash2, Eye, ChevronDown, ChevronRight, Play, Pause, Lock, Unlock, Building2, CheckCircle, Calendar, AlertCircle, FileText } from 'lucide-react'
import { formatDate, getStatusColor, getStatusEmoji } from '@/lib/utils'
import { PROJECT_STATUSES } from '@/lib/constants'
import toast from 'react-hot-toast'

export default function ProyectosPage() {
  const { projects, loading, error, createProject, updateProject, deleteProject, refresh, uploadPlan } = useProjects()
  const { selectedProjectId, setSelectedProjectId } = useProjectFilter()
  const [searchTerm, setSearchTerm] = useState('')
  const [showPlanningOnly, setShowPlanningOnly] = useState<boolean>(false)
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(false)
  const [showCompletedOnly, setShowCompletedOnly] = useState<boolean>(false)
  const [showBlockedOnly, setShowBlockedOnly] = useState<boolean>(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [selectedProjectForPlan, setSelectedProjectForPlan] = useState<any>(null)

  // Filtrar proyectos
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          project.address?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filtro por estado (usando los filtros de tarjetas)
    const matchesStatus = 
      (!showPlanningOnly && !showActiveOnly && !showCompletedOnly && !showBlockedOnly) ||
      (showPlanningOnly && project.status === 'planning') ||
      (showActiveOnly && project.status === 'active') ||
      (showCompletedOnly && project.status === 'completed') ||
      (showBlockedOnly && project.status === 'blocked')
    
    return matchesSearch && matchesStatus
  })

  const handleDelete = async (projectId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      await deleteProject(projectId)
      toast.success('Proyecto eliminado exitosamente')
    } catch (error) {
      toast.error('Error al eliminar el proyecto')
    }
  }

  const handleCreateProject = async (data: any) => {
    try {
      // Si hay un archivo PDF, subirlo primero
      if (data.plan_pdf) {
        const project = await createProject(data)
        await uploadPlan(project.id, data.plan_pdf)
      } else {
        await createProject(data)
      }
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating project:', error)
      throw error
    }
  }

  const handleUpdateProject = async (data: any) => {
    if (editingProject) {
      try {
        // Si hay un archivo PDF, subirlo
        if (data.plan_pdf) {
          await uploadPlan(editingProject.id, data.plan_pdf)
        }
        
        // Actualizar el proyecto con los demás datos
        const { plan_pdf, ...updateData } = data
        await updateProject(editingProject.id, updateData)
        setEditingProject(null)
      } catch (error) {
        console.error('Error updating project:', error)
        throw error
      }
    }
  }

  const toggleProjectExpansion = (projectId: number) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  const handleViewPlan = (project: any) => {
    setSelectedProjectForPlan(project)
    setShowPlanModal(true)
  }


  const handleStatusChange = async (projectId: number, newStatus: string) => {
    try {
      await updateProject(projectId, { status: newStatus })
      
      // Refrescar los datos para actualizar el progreso y las tareas
      await refresh()
      
      toast.success(`Proyecto ${newStatus === 'active' ? 'activado' : newStatus === 'planning' ? 'puesto en planificación' : 'bloqueado'}`)
    } catch (error: any) {
      console.error('Error detallado al actualizar proyecto:', error)
      
      // Mostrar error detallado
      let errorMessage = 'Error al actualizar el estado del proyecto'
      
      if (error?.message) {
        errorMessage = `Error: ${error.message}`
      }
      
      if (error?.code) {
        errorMessage += ` (Código: ${error.code})`
      }
      
      if (error?.details) {
        errorMessage += ` - Detalles: ${error.details}`
      }
      
      if (error?.hint) {
        errorMessage += ` - Sugerencia: ${error.hint}`
      }
      
      toast.error(errorMessage, { duration: 10000 })
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error al cargar proyectos</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Proyectos</h1>
        <p className="text-gray-600">Administra todos los proyectos de construcción</p>
      </div>

      {/* Controles */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar proyectos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

        </div>

        {/* Botón crear */}
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
            showPlanningOnly 
              ? 'ring-2 ring-yellow-500 bg-yellow-50 shadow-lg' 
              : 'hover:bg-yellow-50 hover:shadow-md'
          }`}
          onClick={() => {
            setShowPlanningOnly(!showPlanningOnly)
            // Desactivar otros filtros de estado
            setShowActiveOnly(false)
            setShowCompletedOnly(false)
            setShowBlockedOnly(false)
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Planificación</p>
                <p className="text-2xl font-bold text-gray-900">{projects.filter(p => p.status === 'planning').length}</p>
                <p className={`text-xs mt-1 font-medium ${
                  showPlanningOnly ? 'text-yellow-600' : 'text-gray-500'
                }`}>
                  {showPlanningOnly ? '🟡 Filtrando...' : '👆 Ver planificación'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                showPlanningOnly ? 'bg-yellow-200' : 'bg-yellow-100'
              }`}>
                <Calendar className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
            showActiveOnly 
              ? 'ring-2 ring-green-500 bg-green-50 shadow-lg' 
              : 'hover:bg-green-50 hover:shadow-md'
          }`}
          onClick={() => {
            setShowActiveOnly(!showActiveOnly)
            // Desactivar otros filtros de estado
            setShowPlanningOnly(false)
            setShowCompletedOnly(false)
            setShowBlockedOnly(false)
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activo</p>
                <p className="text-2xl font-bold text-gray-900">{projects.filter(p => p.status === 'active').length}</p>
                <p className={`text-xs mt-1 font-medium ${
                  showActiveOnly ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {showActiveOnly ? '🟢 Filtrando...' : '👆 Ver activos'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                showActiveOnly ? 'bg-green-200' : 'bg-green-100'
              }`}>
                <Play className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
            showCompletedOnly 
              ? 'ring-2 ring-blue-500 bg-blue-50 shadow-lg' 
              : 'hover:bg-blue-50 hover:shadow-md'
          }`}
          onClick={() => {
            setShowCompletedOnly(!showCompletedOnly)
            // Desactivar otros filtros de estado
            setShowPlanningOnly(false)
            setShowActiveOnly(false)
            setShowBlockedOnly(false)
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completado</p>
                <p className="text-2xl font-bold text-gray-900">{projects.filter(p => p.status === 'completed').length}</p>
                <p className={`text-xs mt-1 font-medium ${
                  showCompletedOnly ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {showCompletedOnly ? '🔵 Filtrando...' : '👆 Ver completados'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                showCompletedOnly ? 'bg-blue-200' : 'bg-blue-100'
              }`}>
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de proyectos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Proyectos ({filteredProjects.length})
            </CardTitle>
            {selectedProjectId && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <span>Filtro activo:</span>
                <span className="font-medium">
                  {projects.find(p => p.id.toString() === selectedProjectId)?.name}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedProjectId(null)}
                  className="text-xs"
                >
                  Limpiar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || showPlanningOnly || showActiveOnly || showCompletedOnly || showBlockedOnly ? 'No se encontraron proyectos' : 'No hay proyectos'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || showPlanningOnly || showActiveOnly || showCompletedOnly || showBlockedOnly
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza creando tu primer proyecto'
                }
              </p>
              {!searchTerm && !showPlanningOnly && !showActiveOnly && !showCompletedOnly && !showBlockedOnly && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Proyecto
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proyecto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fechas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progreso
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProjects.map((project) => (
                    <React.Fragment key={project.id}>
                      <tr 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleProjectExpansion(project.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {expandedProjects.has(project.id) ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {project.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {project.address || 'Sin dirección'}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {project.total_floors 
                                  ? `${project.total_floors} pisos`
                                  : 'Sin datos de estructura'
                                }
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                            {getStatusEmoji(project.status)} {PROJECT_STATUSES[project.status as keyof typeof PROJECT_STATUSES]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="text-xs text-gray-500">Inicio</div>
                            <div>{project.start_date ? formatDate(project.start_date) : 'No definido'}</div>
                          </div>
                          {project.end_date && (
                            <div className="mt-1">
                              <div className="text-xs text-gray-500">Fin</div>
                              <div>{formatDate(project.end_date)}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Progreso</span>
                                <span>{Math.round(project.progress_percentage || project.progress || 0)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    project.status === 'planning' || project.status === 'blocked'
                                      ? 'bg-gray-500'  // Ploma para planificación y bloqueado
                                      : 'bg-blue-600' // Azul para activo
                                  }`}
                                  style={{ width: `${project.progress_percentage || project.progress || 0}%` }}
                                ></div>
                              </div>
                            <div className="text-xs text-gray-500">
                              {project.activities_completed || 0}/{project.total_activities || 0} tareas
                            </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {(project.plan_pdf || project.plan_image_url) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewPlan(project)
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="Ver Plano"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingProject(project)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(project.id)
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Fila expandible con opciones de estado */}
                      {expandedProjects.has(project.id) && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-3">Gestión de Estado del Proyecto</h4>
                              <div className="flex flex-wrap gap-2">
                                {project.status !== 'active' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(project.id, 'active')}
                                    className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-1"
                                  >
                                    <Play className="w-4 h-4" />
                                    <span>Activar</span>
                                  </Button>
                                )}
                                {project.status !== 'planning' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(project.id, 'planning')}
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white flex items-center space-x-1"
                                  >
                                    <Pause className="w-4 h-4" />
                                    <span>Planificación</span>
                                  </Button>
                                )}
                                {project.status !== 'blocked' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(project.id, 'blocked')}
                                    className="bg-red-600 hover:bg-red-700 text-white flex items-center space-x-1"
                                  >
                                    <Lock className="w-4 h-4" />
                                    <span>Bloquear</span>
                                  </Button>
                                )}
                                {project.status === 'blocked' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(project.id, 'planning')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1"
                                  >
                                    <Unlock className="w-4 h-4" />
                                    <span>Desbloquear</span>
                                  </Button>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                Estado actual: <span className="font-medium">{PROJECT_STATUSES[project.status as keyof typeof PROJECT_STATUSES]}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Creación */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Proyecto"
        size="lg"
      >
        <ProjectForm
          onSubmit={handleCreateProject}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Modal de Edición */}
      <Modal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        title="Editar Proyecto"
        size="lg"
      >
        {editingProject && (
          <ProjectForm
            project={editingProject}
            onSubmit={handleUpdateProject}
            onCancel={() => setEditingProject(null)}
          />
        )}
      </Modal>

      {/* Modal de Vista de Plano */}
      <PlanViewerModal
        isOpen={showPlanModal}
        onClose={() => {
          setShowPlanModal(false)
          setSelectedProjectForPlan(null)
        }}
        project={selectedProjectForPlan}
      />

    </div>
  )
}
