'use client'

import React, { useState, useEffect } from 'react'
import { useFloors } from '@/hooks/useFloors'
import { useApartments } from '@/hooks/useApartments'
import { useProjectFilter } from '@/hooks/useProjectFilter'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { FloorForm } from '@/components/floors/FloorForm'
import { ApartmentRow } from '@/components/apartments/ApartmentRow'
import { ApartmentTasksModal } from '@/components/projects/ApartmentTasksModal'
import { AddApartmentsModal } from '@/components/projects/AddApartmentsModal'
import { AddTasksToFloorsModal } from '@/components/projects/AddTasksToFloorsModal'
import { FloorTasksModal } from '@/components/projects/FloorTasksModal'
import { ApartmentForm } from '@/components/apartments/ApartmentForm'
import { Plus, Search, Filter, Edit, Trash2, Building2, Building, AlertTriangle, CheckCircle, Clock, Home, ChevronDown, ChevronRight, Layers, Play, AlertCircle, RotateCcw } from 'lucide-react'
import { formatDate, getStatusColor, getStatusEmoji, formatApartmentNumber } from '@/lib/utils'
import { FLOOR_STATUSES } from '@/lib/constants'
import toast from 'react-hot-toast'

export default function PisosPage() {
  const { floors, setFloors, projects, loading, error, createFloor, updateFloor, deleteFloor, refresh } = useFloors()
  const { updateApartment, deleteApartment, updateApartmentStatusFromTasks, softDeleteApartment, hardDeleteApartment, restoreApartment } = useApartments()
  const { selectedProjectId, setSelectedProjectId } = useProjectFilter()
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'blocked' | 'delayed'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingFloor, setEditingFloor] = useState<any>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set())
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())
  const [expandedTowers, setExpandedTowers] = useState<Set<number>>(new Set())
  const [apartments, setApartments] = useState<any[]>([])
  const [apartmentStatusFilter, setApartmentStatusFilter] = useState<string>('all')
  const [selectedApartmentForTasks, setSelectedApartmentForTasks] = useState<{ id: number; number: string } | null>(null)
  const [showAddApartmentsModal, setShowAddApartmentsModal] = useState(false)
  const [selectedFloorForApartments, setSelectedFloorForApartments] = useState<{ id: number; projectId: number } | null>(null)
  const [showAddTasksToFloorModal, setShowAddTasksToFloorModal] = useState(false)
  const [selectedFloorForTasks, setSelectedFloorForTasks] = useState<{ id: number; projectId: number } | null>(null)
  const [showFloorTasksModal, setShowFloorTasksModal] = useState(false)
  const [selectedFloorForViewTasks, setSelectedFloorForViewTasks] = useState<{ id: number; floorNumber: number; projectId: number; towerId: number } | null>(null)
  const [showEditApartmentModal, setShowEditApartmentModal] = useState(false)
  const [selectedApartmentForEdit, setSelectedApartmentForEdit] = useState<any>(null)
  const [showDeleteApartmentConfirm, setShowDeleteApartmentConfirm] = useState(false)
  const [apartmentToDelete, setApartmentToDelete] = useState<{ id: number; number: string } | null>(null)
  const [showHardDeleteApartmentConfirm, setShowHardDeleteApartmentConfirm] = useState(false)
  const [apartmentToHardDelete, setApartmentToHardDelete] = useState<{ id: number; number: string } | null>(null)

  // Obtener proyectos únicos para el filtro
  const uniqueProjects = Array.from(
    new Map(floors.map(floor => [floor.project_id, { id: floor.project_id, name: floor.project_name }])).values()
  )

  // Filtrar pisos
  const filteredFloors = floors.filter(floor => {
    const matchesSearch = floor.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          floor.floor_number.toString().includes(searchTerm)
    
    // Filtro por estado (usando el filtro de tarjetas)
    let matchesStatus = false
    if (statusFilter === 'all') {
      matchesStatus = true
    } else if (statusFilter === 'delayed') {
      // Filtrar pisos con tareas retrasadas
      matchesStatus = (floor as any).delayed_tasks > 0
    } else {
      matchesStatus = floor.status === statusFilter
    }
    
    // Solo usar el filtro local de proyectos, ignorar el filtro global
    // La página de pisos tiene su propio filtro y no debe verse afectada por el filtro global
    const matchesProject = projectFilter === 'all' || floor.project_id.toString() === projectFilter
    
    return matchesSearch && matchesStatus && matchesProject
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

  const handleRestoreApartment = async (apartmentId: number, apartmentNumber: string) => {
    try {
      await restoreApartment(apartmentId)
      toast.success(`Departamento ${apartmentNumber.replace('[ELIMINADO] ', '')} restaurado exitosamente`)
      refresh()
    } catch (err: any) {
      console.error('Error completo al restaurar departamento:', err)
      const errorMessage = err?.message || 'Error desconocido al restaurar el departamento'
      toast.error(`Error al restaurar el departamento: ${errorMessage}`)
    }
  }

  const confirmDeleteApartment = async () => {
    if (!apartmentToDelete) return

    try {
      await softDeleteApartment(apartmentToDelete.id)
      toast.success('Departamento eliminado exitosamente')
      refresh()
      setShowDeleteApartmentConfirm(false)
      setApartmentToDelete(null)
    } catch (err: any) {
      console.error('Error completo al eliminar departamento:', err)
      const errorMessage = err?.message || 'Error desconocido al eliminar el departamento'
      toast.error(`Error al eliminar el departamento: ${errorMessage}`)
    }
  }

  const confirmHardDeleteApartment = async () => {
    if (!apartmentToHardDelete) return

    try {
      await hardDeleteApartment(apartmentToHardDelete.id)
      toast.success('Departamento eliminado definitivamente')
      refresh()
      setShowHardDeleteApartmentConfirm(false)
      setApartmentToHardDelete(null)
    } catch (err: any) {
      console.error('Error completo al eliminar departamento definitivamente:', err)
      const errorMessage = err?.message || 'Error desconocido al eliminar el departamento'
      toast.error(`Error al eliminar el departamento: ${errorMessage}`)
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

  const toggleTowerExpansion = (towerId: number) => {
    setExpandedTowers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(towerId)) {
        newSet.delete(towerId)
      } else {
        newSet.add(towerId)
      }
      return newSet
    })
  }

  // Cargar estados expandidos desde localStorage al iniciar
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false)
  
  useEffect(() => {
    if (hasLoadedFromStorage) return // Ya se cargó desde localStorage
    
    try {
      const savedExpanded = localStorage.getItem('pisos-expanded-state')
      if (savedExpanded) {
        const parsed = JSON.parse(savedExpanded)
        if (parsed.expandedProjects) {
          setExpandedProjects(new Set(parsed.expandedProjects))
        }
        if (parsed.expandedTowers) {
          setExpandedTowers(new Set(parsed.expandedTowers))
        }
        if (parsed.expandedFloors) {
          setExpandedFloors(new Set(parsed.expandedFloors))
        }
        setHasLoadedFromStorage(true)
      } else {
        // Si no hay nada guardado, expandir todo por defecto la primera vez
        if (filteredFloors.length > 0) {
          const projectIds = new Set(filteredFloors.map(floor => floor.project_id))
          setExpandedProjects(projectIds)
          const towerIds = new Set(filteredFloors.map(floor => floor.tower_id))
          setExpandedTowers(towerIds)
        }
        setHasLoadedFromStorage(true)
      }
    } catch (error) {
      console.error('Error loading expanded state from localStorage:', error)
      setHasLoadedFromStorage(true)
    }
  }, [filteredFloors, hasLoadedFromStorage])

  // Guardar estados expandidos en localStorage cuando cambian
  useEffect(() => {
    if (!hasLoadedFromStorage) return // No guardar hasta que se haya cargado desde localStorage
    
    try {
      const stateToSave = {
        expandedProjects: Array.from(expandedProjects),
        expandedTowers: Array.from(expandedTowers),
        expandedFloors: Array.from(expandedFloors)
      }
      localStorage.setItem('pisos-expanded-state', JSON.stringify(stateToSave))
    } catch (error) {
      console.error('Error saving expanded state to localStorage:', error)
    }
  }, [expandedProjects, expandedTowers, expandedFloors, hasLoadedFromStorage])


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
      let updateData: any = {}
      let newStatus: string
      
      if (currentStatus === 'blocked') {
        // Desbloquear: restaurar el estado anterior
        const apartment = floors
          .flatMap(f => f.apartments || [])
          .find(a => a.id === apartmentId)
        
        const previousStatus = (apartment as any)?.previous_status || 'pending'
        newStatus = previousStatus
        updateData = { 
          status: previousStatus,
          previous_status: null 
        }
        console.log('🔓 Desbloqueando apartamento:', apartmentId, 'restaurando a:', previousStatus)
      } else {
        // Bloquear: guardar el estado actual antes de bloquear
        newStatus = 'blocked'
        updateData = { 
          status: 'blocked',
          previous_status: currentStatus 
        }
        console.log('🔒 Bloqueando apartamento:', apartmentId, 'guardando estado previo:', currentStatus)
      }
      
      // Actualizar localmente primero (optimistic update)
      setFloors(prevFloors => 
        prevFloors.map(floor => {
          // Actualizar el apartamento
          const updatedApartments = floor.apartments?.map((apt: any) => 
            apt.id === apartmentId ? { 
              ...apt, 
              status: newStatus,
              previous_status: updateData.previous_status 
            } : apt
          ) || []
          
          // Recalcular el progreso del piso basado en tareas
          let totalTasks = 0
          let completedTasks = 0
          let apartmentsWithoutTasks = 0
          
          updatedApartments.forEach((apt: any) => {
            const tasks = (apt as any).tasks || [] // tasks V2
            totalTasks += tasks.length
            completedTasks += tasks.filter((task: any) => task.status === 'completed').length
            
            // Contar apartamentos sin tareas
            if (tasks.length === 0) {
              apartmentsWithoutTasks++
            }
          })
          
          const newProgressPercentage = totalTasks > 0 
            ? Math.round((completedTasks / totalTasks) * 100) 
            : 0
          
          return {
            ...floor,
            apartments: updatedApartments,
            progress_percentage: newProgressPercentage,
            apartments_count: updatedApartments.length,
            total_tasks: totalTasks,
            completed_tasks: completedTasks,
            apartments_without_tasks: apartmentsWithoutTasks
          }
        })
      )
      
      // Actualizar en la base de datos
      await updateApartment(apartmentId, updateData)
      console.log('✅ Apartamento bloqueado/desbloqueado exitosamente - sin recarga')
      
      toast.success(`Apartamento ${newStatus === 'blocked' ? 'bloqueado' : 'desbloqueado'} exitosamente`)
      
    } catch (error) {
      console.error('Error al bloquear/desbloquear apartamento:', error)
      toast.error('Error al bloquear/desbloquear apartamento')
      // Revertir el cambio optimista en caso de error
      refresh()
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
              onClick={() => refresh()} 
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
  const delayedFloors = filteredFloors.filter(floor => (floor as any).delayed_tasks > 0).length

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Pisos</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Piso
        </Button>
      </div>


      <Card className="mb-6 bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Filtros y Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por proyecto o número de piso..."
                className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md w-full text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-md w-full text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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
      

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card 
          className={`cursor-pointer transition-all duration-200 border-2 ${
            statusFilter === 'all'
              ? 'bg-blue-900/30 border-blue-500 shadow-lg' 
              : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
          }`}
          onClick={() => {
            setStatusFilter('all')
            setTimeout(() => {
              document.getElementById('floors-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 100)
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Layers className={`w-5 h-5 ${
                statusFilter === 'all' ? 'text-blue-400' : 'text-slate-400'
              }`} />
              <span className={`font-semibold ${
                statusFilter === 'all' ? 'text-blue-400' : 'text-slate-300'
              }`}>
                Todos
              </span>
              </div>
            <div className={`text-2xl font-bold text-center ${
              statusFilter === 'all' ? 'text-blue-400' : 'text-slate-400'
            }`}>
              {totalFloors}
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 border-2 ${
            statusFilter === 'pending'
              ? 'bg-yellow-900/30 border-yellow-500 shadow-lg' 
              : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
          }`}
          onClick={() => {
            setStatusFilter('pending')
            setTimeout(() => {
              document.getElementById('floors-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 100)
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className={`w-5 h-5 ${
                statusFilter === 'pending' ? 'text-yellow-400' : 'text-slate-400'
              }`} />
              <span className={`font-semibold ${
                statusFilter === 'pending' ? 'text-yellow-400' : 'text-slate-300'
              }`}>
                Pendientes
              </span>
              </div>
            <div className={`text-2xl font-bold text-center ${
              statusFilter === 'pending' ? 'text-yellow-400' : 'text-slate-400'
              }`}>
              {pendingFloors}
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 border-2 ${
            statusFilter === 'in-progress'
              ? 'bg-blue-900/30 border-blue-500 shadow-lg' 
              : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
          }`}
          onClick={() => {
            setStatusFilter('in-progress')
            setTimeout(() => {
              document.getElementById('floors-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 100)
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Play className={`w-5 h-5 ${
                statusFilter === 'in-progress' ? 'text-blue-400' : 'text-slate-400'
              }`} />
              <span className={`font-semibold ${
                statusFilter === 'in-progress' ? 'text-blue-400' : 'text-slate-300'
              }`}>
                En Progreso
              </span>
              </div>
            <div className={`text-2xl font-bold text-center ${
              statusFilter === 'in-progress' ? 'text-blue-400' : 'text-slate-400'
              }`}>
              {inProgressFloors}
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 border-2 ${
            statusFilter === 'completed'
              ? 'bg-emerald-900/30 border-emerald-500 shadow-lg' 
              : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
          }`}
          onClick={() => {
            setStatusFilter('completed')
            setTimeout(() => {
              document.getElementById('floors-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 100)
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className={`w-5 h-5 ${
                statusFilter === 'completed' ? 'text-emerald-400' : 'text-slate-400'
              }`} />
              <span className={`font-semibold ${
                statusFilter === 'completed' ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                Completados
              </span>
              </div>
            <div className={`text-2xl font-bold text-center ${
              statusFilter === 'completed' ? 'text-emerald-400' : 'text-slate-400'
              }`}>
              {completedFloors}
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-200 border-2 ${
            statusFilter === 'delayed'
              ? 'bg-red-900/30 border-red-500 shadow-lg' 
              : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
          }`}
          onClick={() => {
            setStatusFilter('delayed')
            setTimeout(() => {
              document.getElementById('floors-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 100)
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertCircle className={`w-5 h-5 ${
                statusFilter === 'delayed' ? 'text-red-400' : 'text-slate-400'
              }`} />
              <span className={`font-semibold ${
                statusFilter === 'delayed' ? 'text-red-400' : 'text-slate-300'
              }`}>
                Atrasadas
              </span>
              </div>
            <div className={`text-2xl font-bold text-center ${
              statusFilter === 'delayed' ? 'text-red-400' : 'text-slate-400'
              }`}>
              {delayedFloors}
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredFloors.length === 0 ? (
        <div className="text-center py-12">
          <Layers className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-400 text-lg">No se encontraron pisos.</p>
        </div>
      ) : (
        <div id="floors-list" className="space-y-6">
              {/* Agrupar pisos por proyecto y torre */}
              {(() => {
                // Agrupar pisos por proyecto y luego por torre
                const floorsByProject = filteredFloors.reduce((acc, floor) => {
                  const projectId = floor.project_id
                  if (!acc[projectId]) {
                    acc[projectId] = {
                      projectId,
                      projectName: floor.project_name || 'Proyecto Desconocido',
                      towers: {} as Record<number, { towerId: number; towerNumber: number; towerName: string; floors: typeof filteredFloors }>
                    }
                  }
                  
                  // Agrupar por torre dentro del proyecto
                  const towerId = floor.tower_id
                  const towerNumber = floor.tower_number || 1
                  const towerName = floor.tower_name || `Torre ${towerNumber}`
                  
                  if (!acc[projectId].towers[towerId]) {
                    acc[projectId].towers[towerId] = {
                      towerId,
                      towerNumber,
                      towerName,
                      floors: []
                    }
                  }
                  
                  acc[projectId].towers[towerId].floors.push(floor)
                  return acc
                }, {} as Record<number, { 
                  projectId: number
                  projectName: string
                  towers: Record<number, { towerId: number; towerNumber: number; towerName: string; floors: typeof filteredFloors }>
                }>)

                return (Object.values(floorsByProject) as Array<{
                  projectId: number
                  projectName: string
                  towers: Record<number, { towerId: number; towerNumber: number; towerName: string; floors: typeof filteredFloors }>
                }>).map((projectGroup, index) => {
                  const isProjectExpanded = expandedProjects.has(projectGroup.projectId)
                  
                  // Calcular estadísticas del proyecto
                  const allProjectFloors = projectGroup.towers
                    ? Object.values(projectGroup.towers).flatMap(t => t.floors)
                    : []
                  
                  const totalFloors = allProjectFloors.length
                  const totalTasks = allProjectFloors.reduce((sum, floor) => sum + ((floor as any).total_tasks || 0), 0)
                  const completedTasks = allProjectFloors.reduce((sum, floor) => sum + ((floor as any).completed_tasks || 0), 0)
                  const averageProgress = totalFloors > 0
                    ? Math.round(allProjectFloors.reduce((sum, floor) => sum + (floor.progress_percentage || 0), 0) / totalFloors)
                    : 0
                  
                  return (
                  <div key={projectGroup.projectId} className={`space-y-4 ${index > 0 ? 'mt-8 pt-6 border-t-2 border-slate-600' : ''}`}>
                    {/* Separador de Proyecto - Colapsable */}
                    <div 
                      className="bg-slate-700/50 rounded-lg border border-slate-600 px-4 py-3 cursor-pointer hover:bg-slate-700/70 transition-colors"
                      onClick={() => toggleProjectExpansion(projectGroup.projectId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isProjectExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-300" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          )}
                          <Building2 className="w-4 h-4 text-blue-400" />
                          <p className="text-sm font-medium text-slate-200">
                            {projectGroup.projectName}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Progreso:</span>
                            <div className="flex items-center gap-1">
                              <div className="w-16 bg-slate-800 rounded-full h-1.5">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${averageProgress}%` }}
                                />
                              </div>
                              <span className="text-slate-300 font-medium w-8">{averageProgress}%</span>
                            </div>
                          </div>
                          {totalTasks > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">Tareas:</span>
                              <span className="text-slate-300 font-medium">{completedTasks}/{totalTasks}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Pisos:</span>
                            <span className="text-slate-300 font-medium">{totalFloors}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Torres del proyecto */}
                    {isProjectExpanded && (
                    <div className="space-y-4 ml-4">
                      {Object.values(projectGroup.towers)
                        .sort((a, b) => a.towerNumber - b.towerNumber)
                        .map((towerGroup) => {
                          const isTowerExpanded = expandedTowers.has(towerGroup.towerId)
                          
                          return (
                          <div key={towerGroup.towerId} className="space-y-3">
                            {/* Separador de Torre - Colapsable */}
                            <div 
                              className="bg-slate-700/40 rounded-lg border border-slate-600 px-4 py-2 cursor-pointer hover:bg-slate-700/60 transition-colors"
                              onClick={() => toggleTowerExpansion(towerGroup.towerId)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {isTowerExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                  <Building className="w-3.5 h-3.5 text-purple-400" />
                                  <p className="text-xs font-medium text-slate-300">
                                    {towerGroup.towerName}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400">Pisos:</span>
                                    <span className="text-slate-300 font-medium">{towerGroup.floors.length}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Pisos de la torre */}
                            {isTowerExpanded && (
                            <div className="space-y-3 ml-4">
                              {towerGroup.floors
                                .sort((a, b) => a.floor_number - b.floor_number)
                                .map((floor) => {
                                  const isFloorExpanded = expandedFloors.has(floor.id)
                                  const floorApartments = floor.apartments || []

                                  // Función para extraer el número del código del departamento
                                  const extractApartmentNumber = (apartmentNumber: string): number => {
                                    if (!apartmentNumber) return 0
                                    // Extraer todos los números del string
                                    const numbers = apartmentNumber.match(/\d+/g)
                                    if (!numbers || numbers.length === 0) return 0
                                    // Usar el último número encontrado (generalmente el más relevante, ej: "A1 D-104" -> 104, "LC 120" -> 120)
                                    return parseInt(numbers[numbers.length - 1], 10) || 0
                                  }
                                  
                                  // Ordenar departamentos por número numéricamente
                                  const sortedFloorApartments = [...floorApartments].sort((a: any, b: any) => {
                                    const numA = extractApartmentNumber(a.apartment_number || '')
                                    const numB = extractApartmentNumber(b.apartment_number || '')
                                    return numA - numB
                                  })

                                  return (
                                    <div key={floor.id} className="space-y-3">
                                      {/* Card del Piso */}
                                      <div 
                                        className="bg-slate-700/30 rounded-lg border border-slate-600 px-3 py-2 cursor-pointer hover:bg-slate-700/50 transition-colors"
                                        onClick={() => toggleFloorExpansion(floor.id)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            {isFloorExpanded ? (
                                              <ChevronDown className="w-3 h-3 text-slate-400" />
                                            ) : (
                                              <ChevronRight className="w-3 h-3 text-slate-400" />
                                            )}
                                            <Layers className="w-3 h-3 text-green-400" />
                                            <p className="text-xs font-medium text-slate-300">
                                              Piso {floor.floor_number}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-3 text-xs">
                                            <div className="flex items-center gap-1">
                                              <span className="text-slate-400">Progreso:</span>
                                              <span className="text-slate-300 font-medium">{floor.progress_percentage || 0}%</span>
                                            </div>
                                            {(floor as any).total_tasks > 0 && (
                                              <div className="flex items-center gap-1">
                                                <span className="text-slate-400">Tareas:</span>
                                                <span className="text-slate-300 font-medium">{(floor as any).completed_tasks || 0}/{(floor as any).total_tasks || 0}</span>
                                              </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                              <span className="text-slate-400">Deptos:</span>
                                              <span className="text-slate-300 font-medium">{floor.apartments_count || 0}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Departamentos del Piso */}
                                      {isFloorExpanded && (
                                        <div className="ml-8 space-y-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-medium text-slate-300">
                                              Departamentos
                                    </h4>
                                            <div className="flex items-center gap-2">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setSelectedFloorForApartments({ id: floor.id, projectId: floor.project_id })
                                                  setShowAddApartmentsModal(true)
                                                }}
                                                className="text-xs bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 border border-blue-600"
                                              >
                                                <Plus className="w-3 h-3 mr-1" />
                                                Agregar Departamentos
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setSelectedFloorForTasks({ id: floor.id, projectId: floor.project_id })
                                                  setShowAddTasksToFloorModal(true)
                                                }}
                                                className="text-xs bg-green-900/30 hover:bg-green-800/40 text-green-400 border border-green-600"
                                              >
                                                <Plus className="w-3 h-3 mr-1" />
                                                Agregar Tareas
                                              </Button>
                                    <div className="flex items-center space-x-2">
                                                <Filter className="w-4 h-4 text-slate-400" />
                                      <select
                                                  className="text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={apartmentStatusFilter}
                                        onChange={(e) => setApartmentStatusFilter(e.target.value)}
                                                  onClick={(e) => e.stopPropagation()}
                                      >
                                        <option value="all">Todos los estados</option>
                                        <option value="pending">Pendientes</option>
                                        <option value="in-progress">En Progreso</option>
                                        <option value="completed">Completados</option>
                                        <option value="blocked">Bloqueados</option>
                                      </select>
                                    </div>
                                  </div>
                                          </div>
                                          {sortedFloorApartments.length > 0 ? (
                                            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                                              {sortedFloorApartments
                                      .filter((apartment: any) => 
                                        apartmentStatusFilter === 'all' || apartment.status === apartmentStatusFilter
                                      )
                                                .map((apartment: any) => {
                                                  const apartmentTasks = apartment.tasks || [] // tasks V2
                                                  const totalTasks = apartmentTasks.length
                                                  const completedTasks = apartmentTasks.filter((task: any) => task.status === 'completed').length
                                                  const hasTasks = totalTasks > 0
                                                  const allCompleted = hasTasks && completedTasks === totalTasks

                                                  const isDeleted = apartment.is_active === false
                                                  const fullNumber = formatApartmentNumber(apartment.apartment_code, apartment.apartment_number)
                                                  const displayNumber = isDeleted ? fullNumber.replace('[ELIMINADO] ', '') : fullNumber
                                                  
                                                  return (
                                                    <div key={apartment.id} className="relative group">
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation()
                                                          setSelectedApartmentForTasks({ id: apartment.id, number: fullNumber })
                                                        }}
                                                        className={`${isDeleted 
                                                          ? 'bg-slate-700/50 text-gray-400 hover:bg-slate-700/70 border-2 border-red-500/50 opacity-60' 
                                                          : 'bg-slate-500 text-white hover:bg-slate-400 border border-green-500/30'
                                                        } rounded-lg p-2 flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-lg relative w-full min-h-[3rem]`}
                                                        title={`Departamento ${displayNumber}${isDeleted ? ' (Eliminado)' : ''} - Click para ver tareas`}
                                                      >
                                                        <span className={`text-xs font-bold truncate w-full text-center ${isDeleted ? 'line-through' : ''}`}>
                                                          {displayNumber}
                                                        </span>
                                                        {hasTasks && (
                                                          <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                                                            allCompleted 
                                                              ? 'bg-green-500 text-white' 
                                                              : 'bg-blue-500 text-white'
                                                          }`}>
                                                            {completedTasks}/{totalTasks}
                                                          </span>
                                                        )}
                                                      </button>
                                                      
                                                      {/* Botones de acción del Departamento */}
                                                      {apartment.is_active !== false && (
                                                        <div className="flex gap-1 mt-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                          <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                              e.stopPropagation()
                                                              setSelectedApartmentForEdit({
                                                                id: apartment.id,
                                                                apartment_number: fullNumber,
                                                                apartment_type: apartment.apartment_type,
                                                                area: apartment.area,
                                                                bedrooms: apartment.bedrooms,
                                                                bathrooms: apartment.bathrooms,
                                                                floor_id: apartment.floor_id
                                                              })
                                                              setShowEditApartmentModal(true)
                                                            }}
                                                            className="bg-slate-400 hover:bg-slate-300 text-white border-slate-300 text-xs px-1 py-0 h-6"
                                                            title="Editar"
                                                          >
                                                            <Edit className="w-3 h-3" />
                                                          </Button>
                                                          <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                              e.stopPropagation()
                                                              setApartmentToDelete({ id: apartment.id, number: fullNumber })
                                                              setShowDeleteApartmentConfirm(true)
                                                            }}
                                                            className="bg-red-600 hover:bg-red-500 text-white border-red-500 text-xs px-1 py-0 h-6"
                                                            title="Eliminar"
                                                          >
                                                            <Trash2 className="w-3 h-3" />
                                                          </Button>
                                  </div>
                                                      )}
                                                      
                                                      {/* Botones para departamentos eliminados */}
                                                      {apartment.is_active === false && (
                                                        <div className="flex gap-1 mt-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                          <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                              e.stopPropagation()
                                                              handleRestoreApartment(apartment.id, fullNumber)
                                                            }}
                                                            className="bg-green-600 hover:bg-green-500 text-white border-green-500 text-xs px-1 py-0 h-6"
                                                            title="Restaurar"
                                                          >
                                                            <RotateCcw className="w-3 h-3" />
                                                          </Button>
                                                          <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                              e.stopPropagation()
                                                              setApartmentToHardDelete({ id: apartment.id, number: fullNumber })
                                                              setShowHardDeleteApartmentConfirm(true)
                                                            }}
                                                            className="bg-red-700 hover:bg-red-600 text-white border-red-600 text-xs px-1 py-0 h-6"
                                                            title="Eliminar Definitivamente"
                                                          >
                                                            <Trash2 className="w-3 h-3" />
                                                          </Button>
                                                        </div>
                                                      )}
                                  </div>
                                                  )
                                                })}
                                </div>
                              ) : (
                                            <div className="text-center py-4 text-slate-500 text-sm">
                                              No hay departamentos en este piso
                                </div>
                              )}
                            </div>
                              )}
                                    </div>
                                  )
                                })}
                            </div>
                            )}
                          </div>
                          )
                        })}
                    </div>
                    )}
                  </div>
                  )
                })
              })()}
        </div>
      )}

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

      {/* Modal de Tareas del Departamento */}
      {selectedApartmentForTasks && (
        <ApartmentTasksModal
          isOpen={!!selectedApartmentForTasks}
          onClose={() => setSelectedApartmentForTasks(null)}
          apartmentId={selectedApartmentForTasks.id}
          apartmentNumber={selectedApartmentForTasks.number}
        />
      )}

      {/* Modal de Agregar Departamentos */}
      {selectedFloorForApartments && (
        <AddApartmentsModal
          isOpen={showAddApartmentsModal}
          onClose={() => {
            setShowAddApartmentsModal(false)
            setSelectedFloorForApartments(null)
          }}
          floorId={selectedFloorForApartments.id}
          projectId={selectedFloorForApartments.projectId}
          onSuccess={() => {
            refresh()
            setShowAddApartmentsModal(false)
            setSelectedFloorForApartments(null)
          }}
        />
      )}

      {/* Modal de Agregar Tareas a Todos los Departamentos del Piso */}
      {selectedFloorForTasks && (
        <AddTasksToFloorsModal
          isOpen={showAddTasksToFloorModal}
          onClose={() => {
            setShowAddTasksToFloorModal(false)
            setSelectedFloorForTasks(null)
          }}
          projectId={selectedFloorForTasks.projectId}
          towerId={floors.find((f: any) => f.id === selectedFloorForTasks.id)?.tower_id}
          onSuccess={() => {
            refresh()
            setShowAddTasksToFloorModal(false)
            setSelectedFloorForTasks(null)
          }}
        />
      )}

      {/* Modal de Ver Todas las Tareas del Piso */}
      {selectedFloorForViewTasks && (
        <FloorTasksModal
          isOpen={showFloorTasksModal}
          onClose={() => {
            setShowFloorTasksModal(false)
            setSelectedFloorForViewTasks(null)
          }}
          floorId={selectedFloorForViewTasks.id}
          floorNumber={selectedFloorForViewTasks.floorNumber}
          projectId={selectedFloorForViewTasks.projectId}
          towerId={selectedFloorForViewTasks.towerId}
        />
      )}

      {/* Modal de Editar Departamento */}
      <Modal
        isOpen={showEditApartmentModal}
        onClose={() => {
          setShowEditApartmentModal(false)
          setSelectedApartmentForEdit(null)
        }}
        title="Editar Departamento"
        size="md"
      >
        {selectedApartmentForEdit && (
          <ApartmentForm
            apartment={selectedApartmentForEdit}
            floors={floors}
            projects={projects}
            onSubmit={async (data) => {
              try {
                await updateApartment(selectedApartmentForEdit.id, data)
                toast.success('Departamento actualizado exitosamente')
                setShowEditApartmentModal(false)
                setSelectedApartmentForEdit(null)
                refresh()
              } catch (err: any) {
                toast.error(err.message || 'Error al actualizar el departamento')
                throw err
              }
            }}
            onCancel={() => {
              setShowEditApartmentModal(false)
              setSelectedApartmentForEdit(null)
            }}
          />
        )}
      </Modal>

      {/* Modal de Confirmación de Eliminación de Departamento */}
      <Modal
        isOpen={showDeleteApartmentConfirm}
        onClose={() => {
          setShowDeleteApartmentConfirm(false)
          setApartmentToDelete(null)
        }}
        title="Confirmar Eliminación"
        size="md"
      >
        {apartmentToDelete && (
          <div className="space-y-4">
            <p className="text-slate-300">
              ¿Estás seguro de que deseas eliminar el departamento <strong>{apartmentToDelete.number}</strong>?
            </p>
            <p className="text-sm text-slate-400">
              Esta acción marcará el departamento como eliminado. Las tareas pendientes serán canceladas, pero las tareas completadas se mantendrán.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteApartmentConfirm(false)
                  setApartmentToDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={confirmDeleteApartment}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
              >
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Confirmación de Eliminación Definitiva de Departamento */}
      <Modal
        isOpen={showHardDeleteApartmentConfirm}
        onClose={() => {
          setShowHardDeleteApartmentConfirm(false)
          setApartmentToHardDelete(null)
        }}
        title="Confirmar Eliminación Definitiva"
        size="md"
      >
        {apartmentToHardDelete && (
          <div className="space-y-4">
            <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p className="text-red-300 font-semibold">¡Advertencia!</p>
              </div>
              <p className="text-slate-300 mb-2">
                Estás a punto de eliminar <strong>definitivamente</strong> el departamento <strong>{apartmentToHardDelete.number}</strong>.
              </p>
              <p className="text-sm text-slate-400">
                Esta acción es <strong>irreversible</strong> y tendrá las siguientes consecuencias:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-400 mt-2 space-y-1">
                <li>El departamento será eliminado permanentemente de la base de datos</li>
                <li>Las tareas no completadas serán eliminadas definitivamente</li>
                <li>Las tareas completadas se mantendrán, pero quedarán sin asignar a ningún departamento</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowHardDeleteApartmentConfirm(false)
                  setApartmentToHardDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={confirmHardDeleteApartment}
                className="bg-red-700 hover:bg-red-800 text-white border-red-700"
              >
                Eliminar Definitivamente
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
