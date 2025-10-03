'use client'

import { useState, useEffect } from 'react'
import { useApartments, useTasks } from '@/hooks'
import { useProjectFilter } from '@/hooks/useProjectFilter'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { ApartmentForm } from '@/components/apartments/ApartmentForm'
import { TaskRow } from '@/components/tasks/TaskRow'
import { Plus, Search, Filter, Edit, Trash2, Home, Building2, Clock, CheckCircle, ChevronDown, ChevronRight, Play, AlertCircle, Users, Building, Lock, Unlock } from 'lucide-react'
import { formatDate, getStatusColor, getStatusEmoji, getStatusText } from '@/lib/utils'
import { APARTMENT_STATUSES } from '@/lib/constants'
import toast from 'react-hot-toast'

export default function ApartamentosPage() {
  const { apartments, floors, projects, loading, error, createApartment, updateApartment, deleteApartment } = useApartments()
  const { tasks, users, createTask, updateTask, deleteTask } = useTasks()
  const { selectedProjectId, setSelectedProjectId } = useProjectFilter()
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [floorFilter, setFloorFilter] = useState<string>('all')
  const [showPendingOnly, setShowPendingOnly] = useState<boolean>(false)
  const [showInProgressOnly, setShowInProgressOnly] = useState<boolean>(false)
  const [showCompletedOnly, setShowCompletedOnly] = useState<boolean>(false)
  const [showBlockedOnly, setShowBlockedOnly] = useState<boolean>(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingApartment, setEditingApartment] = useState<any>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [expandedApartments, setExpandedApartments] = useState<Set<number>>(new Set())
  const [selectedApartmentForTasks, setSelectedApartmentForTasks] = useState<any>(null)

  // Resetear filtro de piso cuando cambie el proyecto
  useEffect(() => {
    setFloorFilter('all')
  }, [projectFilter])

  // Filtrar apartamentos (igual que en pisos)
  const filteredApartments = apartments.filter(apartment => {
    const matchesSearch = apartment.apartment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apartment.apartment_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apartment.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filtro por estado (usando los filtros de tarjetas)
    const matchesStatus = 
      (!showPendingOnly && !showInProgressOnly && !showCompletedOnly && !showBlockedOnly) ||
      (showPendingOnly && apartment.status === 'pending') ||
      (showInProgressOnly && apartment.status === 'in-progress') ||
      (showCompletedOnly && apartment.status === 'completed') ||
      (showBlockedOnly && apartment.status === 'blocked')
    
    const matchesProject = projectFilter === 'all' || (apartment.project_id && apartment.project_id.toString() === projectFilter)
    const matchesGlobalProject = selectedProjectId === null || (apartment.project_id && apartment.project_id.toString() === selectedProjectId)
    const matchesFloor = floorFilter === 'all' || (apartment.floor_id && apartment.floor_id.toString() === floorFilter)
    
    return matchesSearch && matchesStatus && matchesProject && matchesGlobalProject && matchesFloor
  })

  // Obtener proyectos únicos para el filtro (igual que en pisos)
  const uniqueProjects = Array.from(
    new Map(apartments.map(apartment => [apartment.project_id || 0, { id: apartment.project_id || 0, name: apartment.project_name || 'Sin proyecto' }])).values()
  )

  // Obtener pisos únicos para el filtro (solo del proyecto seleccionado)
  const uniqueFloors = projectFilter === 'all' 
    ? [] // No mostrar pisos si no hay proyecto seleccionado
    : Array.from(
        new Map(apartments
          .filter(apartment => apartment.project_id && apartment.project_id.toString() === projectFilter)
          .map(apartment => [apartment.floor_id || 0, { id: apartment.floor_id || 0, number: apartment.floor_number || 0, project_name: apartment.project_name || 'Sin proyecto' }])
        ).values()
      ).sort((a, b) => a.number - b.number)

  // Obtener tareas por apartamento
  const getTasksForApartment = (apartmentId: number) => {
    return tasks.filter(task => task.apartment_id === apartmentId)
  }

  // Toggle para expandir/contraer apartamento
  const toggleApartmentExpansion = (apartmentId: number) => {
    setExpandedApartments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(apartmentId)) {
        newSet.delete(apartmentId)
      } else {
        newSet.add(apartmentId)
      }
      return newSet
    })
  }

  const handleDelete = async (apartmentId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este apartamento? Esta acción no se puede deshacer.')) {
      return
    }
    try {
      await deleteApartment(apartmentId)
      toast.success('Apartamento eliminado exitosamente')
    } catch (err: any) {
      toast.error(`Error al eliminar apartamento: ${err.message || 'Error desconocido'}`)
    }
  }

  const handleBlockApartment = async (apartmentId: number, currentStatus: string) => {
    let updateData: any = {}
    let action: string
    
    if (currentStatus === 'blocked') {
      // Desbloquear: restaurar el estado anterior
      const apartment = apartments.find(a => a.id === apartmentId)
      console.log('🔓 Desbloqueando apartamento:', apartment)
      console.log('📋 previous_status en memoria:', (apartment as any)?.previous_status)
      
      const previousStatus = (apartment as any)?.previous_status || 'pending'
      console.log('✅ Estado a restaurar:', previousStatus)
      
      updateData = { 
        status: previousStatus,
        previous_status: null 
      }
      action = 'desbloquear'
    } else {
      // Bloquear: guardar el estado actual antes de bloquear
      console.log('🔒 Bloqueando apartamento - Estado actual:', currentStatus)
      updateData = { 
        status: 'blocked',
        previous_status: currentStatus 
      }
      action = 'bloquear'
    }
    
    if (!confirm(`¿Estás seguro de que quieres ${action} este apartamento?`)) {
      return
    }

    try {
      await updateApartment(apartmentId, updateData)
      toast.success(`Apartamento ${action}do exitosamente`)
    } catch (err: any) {
      toast.error(`Error al ${action} apartamento: ${err.message || 'Error desconocido'}`)
    }
  }

  const handleCreateApartment = async (data: any) => {
    try {
      console.log('📝 Creando apartamento con tareas:', data)
      
      // Extraer las tareas seleccionadas antes de crear el apartamento
      const { selectedTasks, ...apartmentData } = data
      
      // Crear el apartamento
      const createdApartment = await createApartment(apartmentData)
      
      // Si hay tareas seleccionadas, crearlas
      if (selectedTasks && selectedTasks.length > 0) {
        // Descripciones más útiles según el tipo de tarea
        const getTaskDescription = (taskName: string) => {
          const descriptions: Record<string, string> = {
            'Tabiques': 'Construcción e instalación de tabiques divisorios',
            'Instalacion de puertas': 'Instalación de puertas interiores y marcos',
            'Piso flotante': 'Instalación de piso flotante en todas las áreas',
            'Cornisas': 'Instalación de cornisas decorativas en techo'
          }
          return descriptions[taskName] || `Completar tarea de ${taskName}`
        }

        const tasksToCreate = selectedTasks
          .filter((task: any) => task.templateId > 0) // Solo tareas con template seleccionado
          .map((task: any) => ({
            apartment_id: createdApartment.id,
            task_name: task.name,
            task_description: getTaskDescription(task.name),
            task_category: task.category,
            priority: 'medium',
            estimated_hours: task.estimated_hours,
            status: 'pending'
          }))
        
        console.log('📋 Creando', tasksToCreate.length, 'tareas automáticamente')
        
        // Crear todas las tareas
        for (const taskData of tasksToCreate) {
          try {
            await createTask(taskData)
          } catch (taskErr) {
            console.error('Error creando tarea:', taskErr)
            // Continuar con las siguientes tareas aunque falle una
          }
        }
        
        toast.success(`Apartamento creado con ${tasksToCreate.length} tarea(s)`)
      } else {
        toast.success('Apartamento creado exitosamente')
      }
      
      setShowCreateModal(false)
      setFormError(null)
    } catch (err: any) {
      setFormError(err.message || 'Error desconocido al crear apartamento.')
      toast.error('Error al crear apartamento')
    }
  }

  const handleUpdateApartment = async (data: any) => {
    if (!editingApartment) return
    try {
      await updateApartment(editingApartment.id, data)
      setEditingApartment(null)
      setFormError(null)
    } catch (err: any) {
      setFormError(err.message || 'Error desconocido al actualizar apartamento.')
    }
  }

  const handleCreateTask = async (data: any) => {
    try {
      await createTask(data)
      toast.success('Tarea creada exitosamente')
    } catch (err: any) {
      toast.error(`Error al crear tarea: ${err.message || 'Error desconocido'}`)
      throw err
    }
  }

  const handleUpdateTask = async (id: number, data: any) => {
    try {
      await updateTask(id, data)
      toast.success('Tarea actualizada exitosamente')
    } catch (err: any) {
      toast.error(`Error al actualizar tarea: ${err.message || 'Error desconocido'}`)
      throw err
    }
  }

  const handleDeleteTask = async (id: number) => {
    try {
      await deleteTask(id)
      toast.success('Tarea eliminada exitosamente')
    } catch (err: any) {
      toast.error(`Error al eliminar tarea: ${err.message || 'Error desconocido'}`)
      throw err
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando apartamentos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-4 rounded-md bg-white shadow-md">
          <p className="text-red-600 font-semibold">Error al cargar apartamentos:</p>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  // Apartamentos filtrados solo por proyecto (sin filtro de estado)
  const apartmentsForStats = apartments.filter(apartment => {
    const matchesSearch = apartment.apartment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apartment.apartment_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apartment.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = projectFilter === 'all' || (apartment.project_id && apartment.project_id.toString() === projectFilter)
    const matchesGlobalProject = selectedProjectId === null || (apartment.project_id && apartment.project_id.toString() === selectedProjectId)
    
    return matchesSearch && matchesProject && matchesGlobalProject
  })

  const totalApartments = apartmentsForStats.length
  const pendingApartments = apartmentsForStats.filter(a => a.status === 'pending').length
  const inProgressApartments = apartmentsForStats.filter(a => a.status === 'in-progress').length
  const completedApartments = apartmentsForStats.filter(a => a.status === 'completed').length
  const blockedApartments = apartmentsForStats.filter(a => a.status === 'blocked').length

  // Debug: Ver qué status tienen los apartamentos
  console.log('🔍 Debug Apartamentos Status:', {
    total: totalApartments,
    pending: pendingApartments,
    inProgress: inProgressApartments,
    completed: completedApartments,
    blocked: blockedApartments,
    allStatuses: filteredApartments.map(a => ({ id: a.id, number: a.apartment_number, status: a.status }))
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Gestión de Apartamentos</h1>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Listado de Apartamentos</h2>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Apartamento
        </Button>
      </div>

      {/* Filtros y Búsqueda */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros y Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número, tipo o proyecto..."
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
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className={`pl-9 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none ${
                  projectFilter === 'all' ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                disabled={projectFilter === 'all'}
              >
                <option value="all">
                  {projectFilter === 'all' ? 'Selecciona un proyecto primero' : 'Todos los pisos'}
                </option>
                {uniqueFloors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    Piso {floor.number}
                  </option>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Apartamentos</p>
                <p className="text-2xl font-bold text-gray-900">{totalApartments}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-blue-600" />
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
                <p className="text-2xl font-bold text-gray-900">{pendingApartments}</p>
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
                <p className="text-2xl font-bold text-gray-900">{inProgressApartments}</p>
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
                <p className="text-2xl font-bold text-gray-900">{completedApartments}</p>
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
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
            showBlockedOnly 
              ? 'ring-2 ring-red-500 bg-red-50 shadow-lg' 
              : 'hover:bg-red-50 hover:shadow-md'
          }`}
          onClick={() => {
            setShowBlockedOnly(!showBlockedOnly)
            // Desactivar otros filtros de estado
            setShowPendingOnly(false)
            setShowInProgressOnly(false)
            setShowCompletedOnly(false)
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bloqueados</p>
                <p className="text-2xl font-bold text-gray-900">{blockedApartments}</p>
                <p className={`text-xs mt-1 font-medium ${
                  showBlockedOnly ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {showBlockedOnly ? '🔴 Filtrando...' : '👆 Ver bloqueados'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                showBlockedOnly ? 'bg-red-200' : 'bg-red-100'
              }`}>
                <Lock className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grilla de Apartamentos */}
      {filteredApartments.length === 0 ? (
        <div className="text-center py-12">
          <Home className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-400 text-lg">No se encontraron apartamentos.</p>
          {floorFilter !== 'all' && (
            <p className="text-slate-500 text-sm mt-2">
              Intenta seleccionar otro piso o proyecto
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredApartments.map((apartment) => {
            const apartmentTasks = getTasksForApartment(apartment.id)
            
            return (
              <Card 
                key={apartment.id}
                className="bg-slate-700/30 border-slate-600 hover:bg-slate-700/50 hover:shadow-xl transition-all cursor-pointer"
                onClick={() => setSelectedApartmentForTasks(apartment)}
              >
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Home className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-bold text-slate-100">
                        {apartment.apartment_number}
                      </h3>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>

                  {/* Proyecto y Piso */}
                  {projectFilter === 'all' && (
                    <div className="mb-3 space-y-1">
                      <p className="text-xs text-slate-400">
                        <Building2 className="w-3 h-3 inline mr-1" />
                        {apartment.project_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        <Building className="w-3 h-3 inline mr-1" />
                        Piso {apartment.floor_number}
                      </p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Tipo:</span>
                      <span className="text-slate-200 font-medium">
                        {apartment.apartment_type || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Área:</span>
                      <span className="text-slate-200 font-medium">
                        {apartment.area ? `${apartment.area} m²` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="mb-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      getStatusColor(apartment.status)
                    }`}>
                      {getStatusEmoji(apartment.status)} {getStatusText(apartment.status)}
                    </span>
                  </div>

                  {/* Progreso */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Progreso</span>
                      <span className="font-semibold text-slate-200">
                        {apartment.progress_percentage || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${apartment.progress_percentage || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Contador de Tareas */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 pb-4 border-b border-slate-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>{apartmentTasks.length} tarea(s)</span>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingApartment(apartment)}
                      className="flex-1 text-blue-400 border-blue-600 hover:bg-blue-900/30"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBlockApartment(apartment.id, apartment.status)}
                      className={`flex-1 ${
                        apartment.status === 'blocked' 
                          ? 'text-emerald-400 border-emerald-600 hover:bg-emerald-900/30' 
                          : 'text-orange-400 border-orange-600 hover:bg-orange-900/30'
                      }`}
                      title={apartment.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                    >
                      {apartment.status === 'blocked' ? (
                        <Unlock className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(apartment.id)}
                      className="flex-1 text-red-400 border-red-600 hover:bg-red-900/30"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de Creación */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setFormError(null)
        }}
        title="Crear Nuevo Apartamento"
        size="md"
      >
        {formError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">¡Error!</strong>
            <span className="block sm:inline"> {formError}</span>
            <ul className="mt-2 list-disc list-inside">
              <li>Asegúrate de que todos los campos obligatorios estén llenos.</li>
              <li>Verifica tu conexión a la base de datos.</li>
              <li>Intenta recargar la página</li>
            </ul>
          </div>
        )}
        <ApartmentForm
          floors={floors}
          projects={projects}
          onSubmit={handleCreateApartment}
          onCancel={() => {
            setShowCreateModal(false)
            setFormError(null)
          }}
        />
      </Modal>

      {/* Modal de Edición */}
      <Modal
        isOpen={!!editingApartment}
        onClose={() => setEditingApartment(null)}
        title="Editar Apartamento"
        size="md"
      >
        {editingApartment && (
          <ApartmentForm
            apartment={editingApartment}
            floors={floors}
            projects={projects}
            onSubmit={handleUpdateApartment}
            onCancel={() => setEditingApartment(null)}
          />
        )}
      </Modal>

      {/* Modal de Tareas del Apartamento */}
      <Modal
        isOpen={!!selectedApartmentForTasks}
        onClose={() => setSelectedApartmentForTasks(null)}
        title={`Tareas del Apartamento ${selectedApartmentForTasks?.apartment_number || ''}`}
        size="xl"
      >
        {selectedApartmentForTasks && (
          <div className="space-y-4">
            {/* Info del Apartamento */}
            <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 block mb-1">Proyecto</span>
                  <span className="text-slate-100 font-medium">{selectedApartmentForTasks.project_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Piso</span>
                  <span className="text-slate-100 font-medium">Piso {selectedApartmentForTasks.floor_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Tipo</span>
                  <span className="text-slate-100 font-medium">{selectedApartmentForTasks.apartment_type || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Estado</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                    getStatusColor(selectedApartmentForTasks.status)
                  }`}>
                    {getStatusEmoji(selectedApartmentForTasks.status)} {getStatusText(selectedApartmentForTasks.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Lista de Tareas */}
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
              <TaskRow
                tasks={getTasksForApartment(selectedApartmentForTasks.id)}
                apartmentId={selectedApartmentForTasks.id}
                apartmentNumber={selectedApartmentForTasks.apartment_number}
                apartments={apartments}
                users={users}
                floors={floors}
                projects={projects}
                onCreateTask={handleCreateTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}