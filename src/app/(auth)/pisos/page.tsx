'use client'

import React, { useState } from 'react'
import { useFloors } from '@/hooks/useFloors'
import { useApartments } from '@/hooks/useApartments'
import { useProjectFilter } from '@/hooks/useProjectFilter'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { FloorForm } from '@/components/floors/FloorForm'
import { ApartmentRow } from '@/components/apartments/ApartmentRow'
import { Plus, Search, Filter, Edit, Trash2, Building2, AlertTriangle, CheckCircle, Clock, Home, ChevronDown, ChevronRight, Layers, Play, AlertCircle } from 'lucide-react'
import { formatDate, getStatusColor, getStatusEmoji } from '@/lib/utils'
import { FLOOR_STATUSES } from '@/lib/constants'
import toast from 'react-hot-toast'

export default function PisosPage() {
  const { floors, setFloors, projects, loading, error, createFloor, updateFloor, deleteFloor, refresh } = useFloors()
  const { updateApartment, deleteApartment, updateApartmentStatusFromTasks } = useApartments()
  const { selectedProjectId, setSelectedProjectId } = useProjectFilter()
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [showPendingOnly, setShowPendingOnly] = useState<boolean>(false)
  const [showInProgressOnly, setShowInProgressOnly] = useState<boolean>(false)
  const [showCompletedOnly, setShowCompletedOnly] = useState<boolean>(false)
  const [showBlockedOnly, setShowBlockedOnly] = useState<boolean>(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingFloor, setEditingFloor] = useState<any>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set())
  const [apartments, setApartments] = useState<any[]>([])
  const [apartmentStatusFilter, setApartmentStatusFilter] = useState<string>('all')

  // Obtener proyectos únicos para el filtro
  const uniqueProjects = Array.from(
    new Map(floors.map(floor => [floor.project_id, { id: floor.project_id, name: floor.project_name }])).values()
  )

  // Filtrar pisos
  const filteredFloors = floors.filter(floor => {
    const matchesSearch = floor.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          floor.floor_number.toString().includes(searchTerm)
    
    // Filtro por estado (usando los filtros de tarjetas)
    const matchesStatus = 
      (!showPendingOnly && !showInProgressOnly && !showCompletedOnly && !showBlockedOnly) ||
      (showPendingOnly && floor.status === 'pending') ||
      (showInProgressOnly && floor.status === 'in-progress') ||
      (showCompletedOnly && floor.status === 'completed') ||
      (showBlockedOnly && floor.status === 'blocked')
    
    const matchesProject = projectFilter === 'all' || floor.project_id.toString() === projectFilter
    const matchesGlobalProject = selectedProjectId === null || floor.project_id.toString() === selectedProjectId
    
    return matchesSearch && matchesStatus && matchesProject && matchesGlobalProject
  })


  const handleDelete = async (floorId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este piso? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      await deleteFloor(floorId)
      toast.success('Piso eliminado exitosamente')
    } catch (error) {
      toast.error('Error al eliminar el piso')
    }
  }

  const handleCreateFloor = async (data: any) => {
    try {
      setFormError(null)
      console.log('🚀 Iniciando creación de piso:', data)
      await createFloor(data)
      toast.success('Piso creado exitosamente')
      setShowCreateModal(false)
    } catch (error) {
      console.error('💥 Error al crear piso:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setFormError(errorMessage)
      toast.error(`Error al crear el piso: ${errorMessage}`)
    }
  }

  const handleUpdateFloor = async (data: any) => {
    if (editingFloor) {
      try {
        await updateFloor(editingFloor.id, data)
        toast.success('Piso actualizado exitosamente')
        setEditingFloor(null)
      } catch (error) {
        toast.error('Error al actualizar el piso')
      }
    }
  }

  const toggleFloorExpansion = (floorId: number) => {
    setExpandedFloors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(floorId)) {
        newSet.delete(floorId)
      } else {
        newSet.add(floorId)
      }
      return newSet
    })
  }


  const handleDeleteApartment = async (apartmentId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este apartamento?')) {
      return
    }
    
    try {
      await deleteApartment(apartmentId)
      toast.success('Apartamento eliminado exitosamente')
      // Refrescar la lista de pisos para actualizar el conteo
      setTimeout(() => {
        refresh()
      }, 500)
    } catch (error) {
      console.error('Error al eliminar apartamento:', error)
      toast.error('Error al eliminar apartamento')
    }
  }

  const handleBlockApartment = async (apartmentId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'blocked' ? 'pending' : 'blocked'
      console.log('🔒 Bloqueando apartamento:', apartmentId, 'de', currentStatus, 'a', newStatus)
      
      // Actualizar en la base de datos
      console.log('📝 Llamando a updateApartment...')
      const result = await updateApartment(apartmentId, { status: newStatus })
      console.log('✅ updateApartment resultado:', result)
      
      // Actualizar el status del apartamento basado en sus tareas
      console.log('🔄 Actualizando status basado en tareas...')
      await updateApartmentStatusFromTasks(apartmentId)
      console.log('✅ Status actualizado basado en tareas')
      
      // Actualizar localmente el status del apartamento en los pisos
      console.log('🔄 Actualizando estado local...')
      setFloors(prevFloors => 
        prevFloors.map(floor => ({
          ...floor,
          apartments: floor.apartments?.map(apt => 
            apt.id === apartmentId ? { ...apt, status: newStatus } : apt
          )
        }))
      )
      console.log('✅ Estado local actualizado')
      
      toast.success(`Apartamento ${newStatus === 'blocked' ? 'bloqueado' : 'desbloqueado'} exitosamente`)
      
    } catch (error) {
      console.error('Error al bloquear/desbloquear apartamento:', error)
      toast.error('Error al bloquear/desbloquear apartamento')
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Cargando pisos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-800">Error al cargar pisos</h3>
          </div>
          <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
            <p className="text-red-700 text-sm font-mono">{error}</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Recargar página
            </Button>
            <Button 
              onClick={() => setError(null)} 
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Intentar de nuevo
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Calcular estadísticas de pisos
  const totalFloors = filteredFloors.length
  const pendingFloors = filteredFloors.filter(floor => floor.status === 'pending').length
  const inProgressFloors = filteredFloors.filter(floor => floor.status === 'in-progress').length
  const completedFloors = filteredFloors.filter(floor => floor.status === 'completed').length

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Pisos</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Piso
        </Button>
      </div>


      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros y Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por proyecto o número de piso..."
                className="pl-9 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className="pl-9 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <option value="all">Todos los proyectos</option>
                {uniqueProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Indicador de filtro de proyecto activo */}
      {selectedProjectId && (
        <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            Filtrado por: {projects.find(p => p.id.toString() === selectedProjectId)?.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedProjectId(null)}
            className="text-blue-600 hover:text-blue-800"
          >
            Limpiar
          </Button>
        </div>
      )}

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pisos</p>
                <p className="text-2xl font-bold text-gray-900">{floors.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
            showPendingOnly 
              ? 'ring-2 ring-yellow-500 bg-yellow-50 shadow-lg' 
              : 'hover:bg-yellow-50 hover:shadow-md'
          }`}
          onClick={() => {
            setShowPendingOnly(!showPendingOnly)
            // Desactivar otros filtros de estado
            setShowInProgressOnly(false)
            setShowCompletedOnly(false)
            setShowBlockedOnly(false)
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{floors.filter(f => f.status === 'pending').length}</p>
                <p className={`text-xs mt-1 font-medium ${
                  showPendingOnly ? 'text-yellow-600' : 'text-gray-500'
                }`}>
                  {showPendingOnly ? '🟡 Filtrando...' : '👆 Ver pendientes'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                showPendingOnly ? 'bg-yellow-200' : 'bg-gray-100'
              }`}>
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
            showInProgressOnly 
              ? 'ring-2 ring-blue-500 bg-blue-50 shadow-lg' 
              : 'hover:bg-blue-50 hover:shadow-md'
          }`}
          onClick={() => {
            setShowInProgressOnly(!showInProgressOnly)
            // Desactivar otros filtros de estado
            setShowPendingOnly(false)
            setShowCompletedOnly(false)
            setShowBlockedOnly(false)
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Progreso</p>
                <p className="text-2xl font-bold text-gray-900">{floors.filter(f => f.status === 'in-progress').length}</p>
                <p className={`text-xs mt-1 font-medium ${
                  showInProgressOnly ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {showInProgressOnly ? '🔵 Filtrando...' : '👆 Ver en progreso'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                showInProgressOnly ? 'bg-blue-200' : 'bg-blue-100'
              }`}>
                <Play className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
            showCompletedOnly 
              ? 'ring-2 ring-green-500 bg-green-50 shadow-lg' 
              : 'hover:bg-green-50 hover:shadow-md'
          }`}
          onClick={() => {
            setShowCompletedOnly(!showCompletedOnly)
            // Desactivar otros filtros de estado
            setShowPendingOnly(false)
            setShowInProgressOnly(false)
            setShowBlockedOnly(false)
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completados</p>
                <p className="text-2xl font-bold text-gray-900">{floors.filter(f => f.status === 'completed').length}</p>
                <p className={`text-xs mt-1 font-medium ${
                  showCompletedOnly ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {showCompletedOnly ? '🟢 Filtrando...' : '👆 Ver completados'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                showCompletedOnly ? 'bg-green-200' : 'bg-green-100'
              }`}>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Pisos</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFloors.length === 0 ? (
            <p className="text-center text-gray-500">No se encontraron pisos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proyecto
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Piso
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progreso
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Departamentos
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Creación
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFloors.map((floor) => (
                    <React.Fragment key={floor.id}>
                      <tr 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleFloorExpansion(floor.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 mr-3">
                              {expandedFloors.has(floor.id) ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {floor.project_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Piso {floor.floor_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(floor.status)}`}>
                            {floor.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                            {floor.status === 'in-progress' && (
                              <div className="w-3 h-3 mr-1 rounded-full bg-blue-600 border border-gray-800"></div>
                            )}
                            {floor.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {FLOOR_STATUSES[floor.status as keyof typeof FLOOR_STATUSES]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Progreso</span>
                                <span>{floor.progress_percentage || 0}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${floor.progress_percentage || 0}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {floor.apartments_count || 0} departamentos
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(floor.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingFloor(floor)
                              }}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(floor.id)
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Fila expandible con apartamentos */}
                      {expandedFloors.has(floor.id) && (
                        <tr>
                          <td colSpan={7} className="px-0 py-0">
                            <div className="bg-gray-50 border-t border-gray-200">
                              {floor.apartments && floor.apartments.length > 0 ? (
                                <div className="p-4">
                                  <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-medium text-gray-900">
                                      Apartamentos del Piso {floor.floor_number}
                                    </h4>
                                    <div className="flex items-center space-x-2">
                                      <Filter className="w-4 h-4 text-gray-400" />
                                      <select
                                        className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={apartmentStatusFilter}
                                        onChange={(e) => setApartmentStatusFilter(e.target.value)}
                                      >
                                        <option value="all">Todos los estados</option>
                                        <option value="pending">Pendientes</option>
                                        <option value="in-progress">En Progreso</option>
                                        <option value="completed">Completados</option>
                                        <option value="blocked">Bloqueados</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    {floor.apartments
                                      .filter((apartment: any) => 
                                        apartmentStatusFilter === 'all' || apartment.status === apartmentStatusFilter
                                      )
                                      .map((apartment: any) => (
                                      <ApartmentRow
                                        key={apartment.id}
                                        apartment={apartment}
                                        onDelete={handleDeleteApartment}
                                        onBlock={handleBlockApartment}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-4 text-center text-gray-500">
                                  <p>No hay apartamentos en este piso</p>
                                </div>
                              )}
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
        onClose={() => {
          setShowCreateModal(false)
          setFormError(null)
        }}
        title="Crear Nuevo Piso"
        size="md"
      >
        {formError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <h4 className="text-red-800 font-semibold">Error al crear piso</h4>
            </div>
            <div className="bg-red-100 border border-red-300 rounded p-3">
              <p className="text-red-700 text-sm font-mono break-words">{formError}</p>
            </div>
            <div className="mt-3 text-xs text-red-600">
              <p><strong>Posibles soluciones:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Verifica que el proyecto seleccionado existe</li>
                <li>Revisa que el número de piso no esté duplicado</li>
                <li>Comprueba tu conexión a internet</li>
                <li>Intenta recargar la página</li>
              </ul>
            </div>
          </div>
        )}
        <FloorForm
          projects={projects}
          onSubmit={handleCreateFloor}
          onCancel={() => {
            setShowCreateModal(false)
            setFormError(null)
          }}
        />
      </Modal>

      {/* Modal de Edición */}
      <Modal
        isOpen={!!editingFloor}
        onClose={() => setEditingFloor(null)}
        title="Editar Piso"
        size="md"
      >
        {editingFloor && (
          <FloorForm
            floor={editingFloor}
            projects={projects}
            onSubmit={handleUpdateFloor}
            onCancel={() => setEditingFloor(null)}
          />
        )}
      </Modal>

    </div>
  )
}
