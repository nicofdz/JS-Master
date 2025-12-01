'use client'

import React, { useState } from 'react'
import { useProjects } from '@/hooks'
import { useProjectFilter } from '@/hooks/useProjectFilter'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { PlanViewerModal } from '@/components/projects/PlanViewerModal'
import { DocumentViewerModal } from '@/components/projects/DocumentViewerModal'
import { StructureViewModal } from '@/components/projects/StructureViewModal'
import { EditStructureModal } from '@/components/projects/EditStructureModal'
import { ProjectWorkersModal } from '@/components/projects/ProjectWorkersModal'
import { ApartmentTemplatesModal } from '@/components/apartments/ApartmentTemplatesModal'
import { Plus, Search, Filter, Edit, Trash2, Eye, ChevronDown, ChevronRight, Building2, CheckCircle, Calendar, AlertCircle, FileText, Info, DollarSign, Users, UserCheck, FileSignature, Play, Layers } from 'lucide-react'
import { StatusFilterCards } from '@/components/common/StatusFilterCards'
import { formatDate, getStatusColor, getStatusEmoji } from '@/lib/utils'
import { PROJECT_STATUSES } from '@/lib/constants'
import toast from 'react-hot-toast'

export default function ProyectosPage() {
  const { projects, loading, error, createProject, updateProject, deleteProject, refresh, uploadPlan, uploadContract, uploadSpecifications } = useProjects()
  const { selectedProjectId, setSelectedProjectId } = useProjectFilter()
  const [searchTerm, setSearchTerm] = useState('')
  const [cardFilter, setCardFilter] = useState<'all' | 'planning' | 'active' | 'completed'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [selectedProjectForPlan, setSelectedProjectForPlan] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<any>(null)
  const [showContractModal, setShowContractModal] = useState(false)
  const [showSpecificationsModal, setShowSpecificationsModal] = useState(false)
  const [selectedProjectForDocument, setSelectedProjectForDocument] = useState<any>(null)
  const [showStructureModal, setShowStructureModal] = useState(false)
  const [selectedProjectForStructure, setSelectedProjectForStructure] = useState<any>(null)
  const [showEditStructureModal, setShowEditStructureModal] = useState(false)
  const [selectedProjectForEditStructure, setSelectedProjectForEditStructure] = useState<any>(null)
  const [showWorkersModal, setShowWorkersModal] = useState(false)
  const [selectedProjectForWorkers, setSelectedProjectForWorkers] = useState<any>(null)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [selectedProjectForTemplates, setSelectedProjectForTemplates] = useState<number | null>(null)

  // Filtrar proyectos
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          project.address?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filtro por estado (usando cardFilter)
    const matchesCardFilter = cardFilter === 'all' || project.status === cardFilter
    
    return matchesSearch && matchesCardFilter
  })

  const handleDelete = async (projectId: number) => {
    if (!confirm('¿Estás seguro de que quieres archivar este proyecto? Podrás restaurarlo más tarde si lo necesitas.')) {
      return
    }

    try {
      await deleteProject(projectId)
      toast.success('Proyecto archivado exitosamente')
    } catch (error) {
      toast.error('Error al archivar el proyecto')
    }
  }

  const handleCreateProject = async (data: any) => {
    try {
      // Extraer archivos del data
      const { plan_pdf, contract_pdf, specifications_pdf, ...projectData } = data
      
      // Crear el proyecto primero
      const project = await createProject(projectData)
      
      // Subir archivos si existen
      const uploadPromises = []
      if (plan_pdf) {
        uploadPromises.push(uploadPlan(project.id, plan_pdf))
      }
      if (contract_pdf) {
        uploadPromises.push(uploadContract(project.id, contract_pdf))
      }
      if (specifications_pdf) {
        uploadPromises.push(uploadSpecifications(project.id, specifications_pdf))
      }
      
      // Esperar a que todos los archivos se suban
      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises)
      }
      
      setShowCreateModal(false)
      toast.success('Proyecto creado exitosamente')
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Error al crear el proyecto')
      throw error
    }
  }

  const handleUpdateProject = async (data: any) => {
    if (editingProject) {
      try {
        // Extraer archivos del data
        const { plan_pdf, contract_pdf, specifications_pdf, ...updateData } = data
        
        // Actualizar el proyecto con los demás datos
        await updateProject(editingProject.id, updateData)
        
        // Subir archivos si existen
        const uploadPromises = []
        if (plan_pdf) {
          uploadPromises.push(uploadPlan(editingProject.id, plan_pdf))
        }
        if (contract_pdf) {
          uploadPromises.push(uploadContract(editingProject.id, contract_pdf))
        }
        if (specifications_pdf) {
          uploadPromises.push(uploadSpecifications(editingProject.id, specifications_pdf))
        }
        
        // Esperar a que todos los archivos se suban
        if (uploadPromises.length > 0) {
          await Promise.all(uploadPromises)
        }
        
        setEditingProject(null)
        toast.success('Proyecto actualizado exitosamente')
      } catch (error) {
        console.error('Error updating project:', error)
        toast.error('Error al actualizar el proyecto')
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
    <div className="container mx-auto py-8 px-6">
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
      <StatusFilterCards
        selectedValue={cardFilter}
        onSelect={(value) => setCardFilter(value as 'all' | 'planning' | 'active' | 'completed')}
        defaultOption={{
          value: 'all',
          label: 'Todos',
          icon: Layers,
          count: projects.length,
          activeColor: 'blue-400',
          activeBg: 'blue-900/30',
          activeBorder: 'blue-500'
        }}
        options={[
          {
            value: 'planning',
            label: 'Planificación',
            icon: Calendar,
            count: projects.filter(p => p.status === 'planning').length,
            activeColor: 'yellow-400',
            activeBg: 'yellow-900/30',
            activeBorder: 'yellow-500'
          },
          {
            value: 'active',
            label: 'Activos',
            icon: Play,
            count: projects.filter(p => p.status === 'active').length,
            activeColor: 'emerald-400',
            activeBg: 'emerald-900/30',
            activeBorder: 'emerald-500'
          },
          {
            value: 'completed',
            label: 'Completados',
            icon: CheckCircle,
            count: projects.filter(p => p.status === 'completed').length,
            activeColor: 'blue-400',
            activeBg: 'blue-900/30',
            activeBorder: 'blue-500'
          }
        ]}
      />

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
                {searchTerm || cardFilter !== 'all' ? 'No se encontraron proyectos' : 'No hay proyectos'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || cardFilter !== 'all'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza creando tu primer proyecto'
                }
              </p>
              {!searchTerm && cardFilter === 'all' && (
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
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-slate-900 rounded-lg border border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Tarjeta principal del proyecto */}
                  <div
                    className="p-6 cursor-pointer hover:bg-slate-800/50 transition-colors"
                    onClick={() => toggleProjectExpansion(project.id)}
                  >
                    <div className="flex items-center justify-between">
                      {/* Información principal */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          {expandedProjects.has(project.id) ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-100">
                              {project.name}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                              {getStatusEmoji(project.status)} {PROJECT_STATUSES[project.status as keyof typeof PROJECT_STATUSES]}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">
                            {project.address || 'Sin dirección'}
                          </p>
                        </div>
                      </div>

                      {/* Información secundaria */}
                      <div className="flex items-center gap-8">
                        {/* Torres */}
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">
                            {project.towers_count || 0}
                          </div>
                          <div className="text-xs text-slate-400">
                            {project.towers_count === 1 ? 'Torre' : 'Torres'}
                          </div>
                        </div>

                        {/* Fechas */}
                        <div className="text-sm">
                          <div className="text-slate-300 font-medium">
                            {project.start_date ? formatDate(project.start_date) : 'Sin inicio'}
                          </div>
                          {project.estimated_completion && (
                            <div className="text-xs text-slate-400 mt-1">
                              Fin: {formatDate(project.estimated_completion)}
                            </div>
                          )}
                        </div>

                        {/* Progreso */}
                        <div className="w-32">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Progreso</span>
                            <span className="font-semibold text-slate-300">
                              {Math.round(project.progress_percentage || project.progress || 0)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2 mb-1">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                project.status === 'planning' || project.status === 'blocked'
                                  ? 'bg-gray-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${project.progress_percentage || project.progress || 0}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-slate-400">
                            {project.activities_completed || 0}/{project.total_activities || 0} tareas
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedProjectForWorkers(project)
                              setShowWorkersModal(true)
                            }}
                            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                            title="Ver Trabajadores"
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedProjectForDetails(project)
                              setShowDetailsModal(true)
                            }}
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                            title="Ver Detalles"
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                          {(project.plan_pdf || project.plan_image_url) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewPlan(project)
                              }}
                              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
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
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            title="Editar"
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
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta anidada con desglose */}
                  {expandedProjects.has(project.id) && (
                    <div className="px-6 pb-6">
                      <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
                        <div className="flex items-center gap-6">
                          {/* Tarjetas de información */}
                          <div className="grid grid-cols-3 gap-4 flex-1">
                            {/* Tarjeta de Torres */}
                            <div className="bg-slate-800 rounded-lg border border-blue-500/30 shadow-sm hover:shadow-md hover:border-blue-500/50 transition-all duration-200 p-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Building2 className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-2xl font-bold text-blue-400">
                                    {project.towers_count || 0}
                                  </div>
                                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                                    {project.towers_count === 1 ? 'Torre' : 'Torres'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Tarjeta de Pisos Totales */}
                            <div className="bg-slate-800 rounded-lg border border-purple-500/30 shadow-sm hover:shadow-md hover:border-purple-500/50 transition-all duration-200 p-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Calendar className="w-5 h-5 text-purple-400" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-2xl font-bold text-purple-400">
                                    {project.total_floors_count || 0}
                                  </div>
                                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                                    Pisos Totales
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Tarjeta de Departamentos por Piso */}
                            <div className="bg-slate-800 rounded-lg border border-green-500/30 shadow-sm hover:shadow-md hover:border-green-500/50 transition-all duration-200 p-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Building2 className="w-5 h-5 text-green-400" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-2xl font-bold text-green-400">
                                    {(() => {
                                      const totalFloors = project.total_floors_count || 1
                                      const totalApartments = project.apartments_count || 0
                                      return totalFloors > 0 ? Math.round(totalApartments / totalFloors) : 0
                                    })()}
                                  </div>
                                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                                    Dptos/Piso <span className="text-gray-500">(promedio)</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Botones de acción a la derecha */}
                          <div className="flex flex-col gap-3 flex-shrink-0 ml-auto">
                            <button 
                              onClick={() => {
                                setSelectedProjectForEditStructure(project)
                                setShowEditStructureModal(true)
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 shadow-sm hover:shadow-md transition-all duration-200 px-4 py-2.5 flex items-center gap-2 min-w-[160px]"
                            >
                              <Edit className="w-4 h-4 text-cyan-400" />
                              <span className="text-sm font-medium">Editar Estructura</span>
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedProjectForStructure(project)
                                setShowStructureModal(true)
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-indigo-500/30 hover:border-indigo-500/50 shadow-sm hover:shadow-md transition-all duration-200 px-4 py-2.5 flex items-center gap-2 min-w-[160px]"
                            >
                              <Eye className="w-4 h-4 text-indigo-400" />
                              <span className="text-sm font-medium">Ver Estructura</span>
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedProjectForTemplates(project.id)
                                setShowTemplatesModal(true)
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-amber-500/30 hover:border-amber-500/50 shadow-sm hover:shadow-md transition-all duration-200 px-4 py-2.5 flex items-center gap-2 min-w-[160px]"
                            >
                              <FileText className="w-4 h-4 text-amber-400" />
                              <span className="text-sm font-medium">Plantillas</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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

      {/* Modal de Vista de Contrato */}
      <DocumentViewerModal
        isOpen={showContractModal}
        onClose={() => {
          setShowContractModal(false)
          setSelectedProjectForDocument(null)
        }}
        project={selectedProjectForDocument || { id: 0, name: '' }}
        documentUrl={selectedProjectForDocument?.contract_pdf_url}
        documentType="contract"
        title="Contrato del Proyecto"
      />

      {/* Modal de Vista de Especificaciones */}
      <DocumentViewerModal
        isOpen={showSpecificationsModal}
        onClose={() => {
          setShowSpecificationsModal(false)
          setSelectedProjectForDocument(null)
        }}
        project={selectedProjectForDocument || { id: 0, name: '' }}
        documentUrl={selectedProjectForDocument?.specifications_pdf_url}
        documentType="specifications"
        title="Especificaciones Técnicas"
      />

      {/* Modal de Vista de Estructura */}
      {selectedProjectForStructure && (
        <StructureViewModal
          isOpen={showStructureModal}
          onClose={() => {
            setShowStructureModal(false)
            setSelectedProjectForStructure(null)
          }}
          projectId={selectedProjectForStructure.id}
          projectName={selectedProjectForStructure.name}
        />
      )}

      {/* Modal de Detalles del Proyecto */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedProjectForDetails(null)
        }}
        title="Detalles del Proyecto"
        size="lg"
      >
        {selectedProjectForDetails && (
          <div className="space-y-6">
            {/* Información General */}
            <div className="bg-slate-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-blue-400" />
                Información General
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-300">Nombre del Proyecto</p>
                  <p className="text-base font-medium text-white">{selectedProjectForDetails.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Estado</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedProjectForDetails.status)}`}>
                    {getStatusEmoji(selectedProjectForDetails.status)} {PROJECT_STATUSES[selectedProjectForDetails.status as keyof typeof PROJECT_STATUSES]}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Dirección</p>
                  <p className="text-base font-medium text-white">{selectedProjectForDetails.address || 'No especificada'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Ciudad</p>
                  <p className="text-base font-medium text-white">{selectedProjectForDetails.city || 'No especificada'}</p>
                </div>
              </div>
            </div>

            {/* Cronograma */}
            <div className="bg-slate-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-400" />
                Cronograma
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-300">Fecha de Inicio</p>
                  <p className="text-base font-medium text-white">
                    {selectedProjectForDetails.start_date ? formatDate(selectedProjectForDetails.start_date) : 'No definida'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Fecha de Finalización Estimada</p>
                  <p className="text-base font-medium text-white">
                    {selectedProjectForDetails.estimated_completion ? formatDate(selectedProjectForDetails.estimated_completion) : 'No definida'}
                  </p>
                </div>
                {selectedProjectForDetails.actual_completion && (
                  <div className="col-span-2">
                    <p className="text-sm text-slate-300">Fecha de Finalización Real</p>
                    <p className="text-base font-medium text-green-400">
                      {formatDate(selectedProjectForDetails.actual_completion)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Presupuesto */}
            <div className="bg-slate-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                Presupuesto
              </h3>
              <div>
                <p className="text-sm text-slate-300">Presupuesto Inicial</p>
                <p className="text-2xl font-bold text-green-400">
                  {selectedProjectForDetails.initial_budget 
                    ? `$${selectedProjectForDetails.initial_budget.toLocaleString('es-CL')}`
                    : 'No especificado'
                  }
                </p>
              </div>
            </div>

            {/* Datos de la Empresa Cliente */}
            <div className="bg-slate-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-400" />
                Empresa Cliente
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-300">Nombre de la Empresa</p>
                  <p className="text-base font-medium text-white">{selectedProjectForDetails.client_company_name || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">RUT</p>
                  <p className="text-base font-medium text-white">{selectedProjectForDetails.client_company_rut || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Contacto</p>
                  <p className="text-base font-medium text-white">{selectedProjectForDetails.client_company_contact || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Teléfono</p>
                  <p className="text-base font-medium text-white">{selectedProjectForDetails.client_company_phone || 'No especificado'}</p>
                </div>
              </div>
            </div>

            {/* Datos del Administrador de Obra */}
            <div className="bg-slate-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <UserCheck className="w-5 h-5 mr-2 text-orange-400" />
                Administrador de Obra
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-300">Nombre</p>
                  <p className="text-base font-medium text-white">{selectedProjectForDetails.site_admin_name || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">RUT</p>
                  <p className="text-base font-medium text-white">{selectedProjectForDetails.site_admin_rut || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Teléfono</p>
                  <p className="text-base font-medium text-white">{selectedProjectForDetails.site_admin_phone || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Correo Electrónico</p>
                  <p className="text-base font-medium text-white">{selectedProjectForDetails.site_admin_email || 'No especificado'}</p>
                </div>
              </div>
            </div>

            {/* Datos del Contrato */}
            <div className="bg-slate-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <FileSignature className="w-5 h-5 mr-2 text-cyan-400" />
                Información del Contrato
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-300">Fecha del Contrato</p>
                  <p className="text-base font-medium text-white">
                    {selectedProjectForDetails.contract_date ? formatDate(selectedProjectForDetails.contract_date) : 'No especificada'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Tipo de Contrato</p>
                  <p className="text-base font-medium text-white">{selectedProjectForDetails.contract_type || 'No especificado'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-300">Monto del Contrato</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {selectedProjectForDetails.contract_amount 
                      ? `$${selectedProjectForDetails.contract_amount.toLocaleString('es-CL')}`
                      : 'No especificado'
                    }
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-300 mb-2">Contrato PDF</p>
                  {selectedProjectForDetails.contract_pdf_url ? (
                    <Button
                      onClick={() => {
                        setSelectedProjectForDocument(selectedProjectForDetails)
                        setShowContractModal(true)
                      }}
                      className="inline-flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Ver Contrato
                      <Eye className="w-3 h-3 ml-2" />
                    </Button>
                  ) : (
                    <p className="text-base font-medium text-slate-400">No especificado</p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-300 mb-2">Especificaciones Técnicas PDF</p>
                  {selectedProjectForDetails.specifications_pdf_url ? (
                    <Button
                      onClick={() => {
                        setSelectedProjectForDocument(selectedProjectForDetails)
                        setShowSpecificationsModal(true)
                      }}
                      className="inline-flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Ver Especificaciones
                      <Eye className="w-3 h-3 ml-2" />
                    </Button>
                  ) : (
                    <p className="text-base font-medium text-slate-400">No especificado</p>
                  )}
                </div>
              </div>
            </div>

            {/* Botón de Cerrar */}
            <div className="flex justify-end pt-4 border-t border-slate-600">
              <Button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedProjectForDetails(null)
                }}
                className="bg-gray-600 hover:bg-gray-700"
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Editar Estructura */}
      {selectedProjectForEditStructure && (
        <EditStructureModal
          isOpen={showEditStructureModal}
          onClose={() => {
            setShowEditStructureModal(false)
            setSelectedProjectForEditStructure(null)
            refresh() // Refrescar proyectos para actualizar contadores
          }}
          projectId={selectedProjectForEditStructure.id}
          projectName={selectedProjectForEditStructure.name}
        />
      )}

      {/* Modal de Trabajadores del Proyecto */}
      {selectedProjectForWorkers && (
        <ProjectWorkersModal
          isOpen={showWorkersModal}
          onClose={() => {
            setShowWorkersModal(false)
            setSelectedProjectForWorkers(null)
          }}
          projectId={selectedProjectForWorkers.id}
          projectName={selectedProjectForWorkers.name}
        />
      )}

      {/* Modal de Plantillas de Departamentos */}
      {selectedProjectForTemplates !== null && (
        <ApartmentTemplatesModal
          isOpen={showTemplatesModal}
          onClose={() => {
            setShowTemplatesModal(false)
            setSelectedProjectForTemplates(null)
          }}
          projectId={selectedProjectForTemplates}
        />
      )}

    </div>
  )
}
