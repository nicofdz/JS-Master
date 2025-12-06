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
import { ApartmentFormModalV2 } from '@/components/apartments/ApartmentFormModalV2'
import { Plus, Search, Filter, Edit, Trash2, Building2, Building, AlertTriangle, CheckCircle, Clock, Home, ChevronDown, ChevronRight, Layers, Play, AlertCircle, RotateCcw, XCircle } from 'lucide-react'
import { formatDate, getStatusColor, getStatusEmoji, formatApartmentNumber } from '@/lib/utils'
import { FLOOR_STATUSES } from '@/lib/constants'
import toast from 'react-hot-toast'
import { FloorFiltersSidebar } from '@/components/floors/FloorFiltersSidebar'
import { StatusFilterCards } from '@/components/common/StatusFilterCards'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'

export default function PisosPage() {
  const { floors, setFloors, projects, loading, error, createFloor, updateFloor, deleteFloor, hardDeleteFloor, restoreFloor, refresh } = useFloors()
  const { updateApartment, deleteApartment, updateApartmentStatusFromTasks, hardDeleteApartment, restoreApartment } = useApartments()
  const { selectedProjectId, setSelectedProjectId } = useProjectFilter()
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [towerFilter, setTowerFilter] = useState<string>('all')
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

  const [selectedApartmentForEdit, setSelectedApartmentForEdit] = useState<any>(null)
  const [showDeleteApartmentConfirm, setShowDeleteApartmentConfirm] = useState(false)
  const [apartmentToDelete, setApartmentToDelete] = useState<{ id: number; number: string } | null>(null)
  const [showHardDeleteApartmentConfirm, setShowHardDeleteApartmentConfirm] = useState(false)
  const [apartmentToHardDelete, setApartmentToHardDelete] = useState<{ id: number; number: string } | null>(null)
  const [showHardDeleteFloorConfirm, setShowHardDeleteFloorConfirm] = useState(false)
  const [floorToHardDelete, setFloorToHardDelete] = useState<{ id: number; floorNumber: number } | null>(null)
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false)
  const [showTrash, setShowTrash] = useState(false)

  // Estados para modales de confirmación
  const [confirmDeleteFloorState, setConfirmDeleteFloorState] = useState<{ isOpen: boolean; floorId: number | null }>({ isOpen: false, floorId: null })
  const [confirmRestoreFloorState, setConfirmRestoreFloorState] = useState<{ isOpen: boolean; floorId: number | null }>({ isOpen: false, floorId: null })
  const [confirmRestoreApartmentState, setConfirmRestoreApartmentState] = useState<{ isOpen: boolean; apartmentId: number | null; apartmentNumber: string }>({ isOpen: false, apartmentId: null, apartmentNumber: '' })

  // Recargar pisos cuando cambia el modo papelera
  useEffect(() => {
    refresh(showTrash)
  }, [showTrash])

  // Obtener proyectos únicos para el filtro
  const uniqueProjects = Array.from(
    new Map(floors.map(floor => [floor.project_id, { id: floor.project_id, name: floor.project_name }])).values()
  )

  // Obtener torres únicas para el filtro (filtradas por proyecto seleccionado)
  const uniqueTowers = Array.from(
    new Map(
      floors
        .filter(floor => projectFilter === 'all' || floor.project_id.toString() === projectFilter)
        .map(floor => [
          floor.tower_id,
          {
            id: floor.tower_id,
            name: floor.tower_name || '',
            number: floor.tower_number || 0
          }
        ])
    ).values()
  ).sort((a, b) => a.number - b.number)

  // Resetear filtros dependientes
  useEffect(() => {
    setTowerFilter('all')
  }, [projectFilter])

  // Lógica de auto-expansión
  useEffect(() => {
    if (projectFilter !== 'all') {
      const projectId = parseInt(projectFilter)
      setExpandedProjects(prev => {
        const newSet = new Set(prev)
        newSet.add(projectId)
        return newSet
      })

      // Si también hay filtro de torre, expandir la torre
      if (towerFilter !== 'all') {
        const towerId = parseInt(towerFilter)
        setExpandedTowers(prev => {
          const newSet = new Set(prev)
          newSet.add(towerId)
          return newSet
        })
      }
    }
  }, [projectFilter, towerFilter])

  // Filtrar pisos
  const filteredFloors = floors.filter(floor => {
    const matchesSearch = floor.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      floor.floor_number.toString().includes(searchTerm) ||
      // Búsqueda por torre
      (floor as any).tower_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (floor as any).tower_number?.toString().includes(searchTerm)

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
    const matchesTower = towerFilter === 'all' || (floor.tower_id && floor.tower_id.toString() === towerFilter)

    // Filtro de papelera
    const matchesTrash = showTrash
      ? floor.is_active === false
      : floor.is_active !== false

    return matchesSearch && matchesStatus && matchesProject && matchesTower && matchesTrash
  })


  const handleDelete = (floorId: number) => {
    setConfirmDeleteFloorState({ isOpen: true, floorId })
  }

  const executeDeleteFloor = async () => {
    if (!confirmDeleteFloorState.floorId) return

    try {
      await deleteFloor(confirmDeleteFloorState.floorId)
      toast.success('Piso movido a la papelera')
      setConfirmDeleteFloorState({ isOpen: false, floorId: null })
    } catch (error) {
      toast.error('Error al eliminar el piso')
    }
  }

  const handleRestoreFloor = (floorId: number) => {
    setConfirmRestoreFloorState({ isOpen: true, floorId })
  }

  const executeRestoreFloor = async () => {
    if (!confirmRestoreFloorState.floorId) return

    try {
      await restoreFloor(confirmRestoreFloorState.floorId)
      toast.success('Piso restaurado exitosamente')
      setConfirmRestoreFloorState({ isOpen: false, floorId: null })
    } catch (error) {
      toast.error('Error al restaurar el piso')
    }
  }

  const handleRestoreApartment = (apartmentId: number, apartmentNumber: string) => {
    setConfirmRestoreApartmentState({ isOpen: true, apartmentId, apartmentNumber })
  }

  const executeRestoreApartment = async () => {
    const { apartmentId, apartmentNumber } = confirmRestoreApartmentState
    if (!apartmentId) return

    try {
      await restoreApartment(apartmentId)
      toast.success(`Departamento ${apartmentNumber.replace('[ELIMINADO] ', '')} restaurado exitosamente`)
      refresh()
      setConfirmRestoreApartmentState({ isOpen: false, apartmentId: null, apartmentNumber: '' })
    } catch (err: any) {
      console.error('Error completo al restaurar departamento:', err)
      const errorMessage = err?.message || 'Error desconocido al restaurar el departamento'
      toast.error(`Error al restaurar el departamento: ${errorMessage}`)
    }
  }

  const confirmDeleteApartment = async () => {
    if (!apartmentToDelete) return

    try {
      await deleteApartment(apartmentToDelete.id)
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

  const handleHardDeleteFloor = (floorId: number, floorNumber: number) => {
    setFloorToHardDelete({ id: floorId, floorNumber })
    setShowHardDeleteFloorConfirm(true)
  }

  const confirmHardDeleteFloor = async () => {
    if (!floorToHardDelete) return

    try {
      await hardDeleteFloor(floorToHardDelete.id)
      toast.success('Piso eliminado definitivamente. Las tareas completadas se mantienen en el sistema.')
      refresh(showTrash)
      setShowHardDeleteFloorConfirm(false)
      setFloorToHardDelete(null)
    } catch (err: any) {
      console.error('Error completo al eliminar piso definitivamente:', err)
      const errorMessage = err?.message || 'Error desconocido al eliminar el piso'
      toast.error(`Error al eliminar el piso: ${errorMessage}`)
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



  const statusOptions = [
    {
      value: 'pending',
      label: 'Pendientes',
      icon: Clock,
      count: pendingFloors,
      activeColor: 'yellow-400',
      activeBg: 'yellow-900/30',
      activeBorder: 'yellow-500'
    },
    {
      value: 'in-progress',
      label: 'En Progreso',
      icon: Play,
      count: inProgressFloors,
      activeColor: 'emerald-400',
      activeBg: 'emerald-900/30',
      activeBorder: 'emerald-500'
    },
    {
      value: 'completed',
      label: 'Completados',
      icon: CheckCircle,
      count: completedFloors,
      activeColor: 'emerald-400',
      activeBg: 'emerald-900/30',
      activeBorder: 'emerald-500'
    },
    {
      value: 'delayed',
      label: 'Atrasados',
      icon: AlertCircle,
      count: delayedFloors,
      activeColor: 'red-400',
      activeBg: 'red-900/30',
      activeBorder: 'red-500'
    }
  ]

  return (
    <div className="w-full py-8 px-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por proyecto o número..."
              className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg w-full text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsFilterSidebarOpen(true)}
            className="flex items-center gap-2 border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors flex-1 sm:flex-none justify-center"
          >
            <Filter className="w-5 h-5" />
            <span className="sm:inline">Filtros</span>
            {(statusFilter !== 'all' || projectFilter !== 'all' || towerFilter !== 'all') && (
              <span className="ml-1 bg-blue-500/20 text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-500/30">
                !
              </span>
            )}
          </Button>

          {(statusFilter !== 'all' || projectFilter !== 'all' || towerFilter !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => {
                setStatusFilter('all')
                setProjectFilter('all')
                setTowerFilter('all')
              }}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
              title="Limpiar filtros"
            >
              <XCircle className="w-5 h-5" />
            </Button>
          )}

          <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none justify-center">
            <Plus className="mr-2 h-4 w-4" />
            <span className="sm:inline">Nuevo</span>
          </Button>

          <Button
            variant={showTrash ? "secondary" : "outline"}
            onClick={() => setShowTrash(!showTrash)}
            className={`flex items-center gap-2 flex-1 sm:flex-none justify-center ${showTrash ? 'bg-red-900/30 text-red-400 border-red-500/50' : 'border-slate-600 text-slate-200 hover:text-white hover:border-slate-500'}`}
            title={showTrash ? "Ver activos" : "Ver papelera"}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{showTrash ? 'Salir' : 'Papelera'}</span>
          </Button>
        </div>
      </div>

      <FloorFiltersSidebar
        isOpen={isFilterSidebarOpen}
        onClose={() => setIsFilterSidebarOpen(false)}
        currentStatusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        currentProjectFilter={projectFilter}
        onProjectFilterChange={setProjectFilter}
        currentTowerFilter={towerFilter}
        onTowerFilterChange={setTowerFilter}
        projects={uniqueProjects}
        towers={uniqueTowers}
        counts={{
          all: floors.length,
          pending: floors.filter(f => f.status === 'pending').length,
          in_progress: floors.filter(f => f.status === 'in-progress').length,
          completed: floors.filter(f => f.status === 'completed').length,
          delayed: floors.filter(f => (f as any).delayed_tasks > 0).length
        }}
      />

      {/* Tarjetas de Estado */}
      <div className="mb-6">
        <StatusFilterCards
          options={statusOptions}
          selectedValue={statusFilter}
          onSelect={(value) => setStatusFilter(value as any)}
          defaultOption={{
            value: 'all',
            label: 'Todos',
            icon: Layers,
            count: totalFloors,
            activeColor: 'blue-400',
            activeBg: 'blue-900/30',
            activeBorder: 'blue-500'
          }}
        />
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
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
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
                                              <div className="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto ml-5 sm:ml-0">
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
                                                {showTrash ? (
                                                  <>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleRestoreFloor(floor.id)
                                                      }}
                                                      className="h-6 px-2 text-green-400 hover:text-green-300 hover:bg-green-900/30 ml-2"
                                                      title="Restaurar Piso"
                                                    >
                                                      <RotateCcw className="w-3 h-3 mr-1" />
                                                      Restaurar
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleHardDeleteFloor(floor.id, floor.floor_number)
                                                      }}
                                                      className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                                      title="Eliminar Definitivamente"
                                                    >
                                                      <Trash2 className="w-3 h-3 mr-1" />
                                                      Eliminar
                                                    </Button>
                                                  </>
                                                ) : (
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      handleDelete(floor.id)
                                                    }}
                                                    className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 ml-2"
                                                    title="Eliminar Piso"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Departamentos del Piso */}
                                          {isFloorExpanded && (
                                            <div className="ml-8 space-y-3">
                                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
                                                <h4 className="text-sm font-medium text-slate-300 mb-2 sm:mb-0">
                                                  Departamentos
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      setSelectedFloorForApartments({ id: floor.id, projectId: floor.project_id })
                                                      setShowAddApartmentsModal(true)
                                                    }}
                                                    className="text-xs bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 border border-blue-600 flex-1 sm:flex-none justify-center"
                                                  >
                                                    <Plus className="w-3 h-3 mr-1" />
                                                    Depto
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      setSelectedFloorForTasks({ id: floor.id, projectId: floor.project_id })
                                                      setShowAddTasksToFloorModal(true)
                                                    }}
                                                    className="text-xs bg-green-900/30 hover:bg-green-800/40 text-green-400 border border-green-600 flex-1 sm:flex-none justify-center"
                                                  >
                                                    <Plus className="w-3 h-3 mr-1" />
                                                    Tarea
                                                  </Button>
                                                  <div className="flex items-center space-x-2 flex-1 sm:flex-none">
                                                    <Filter className="w-4 h-4 text-slate-400" />
                                                    <select
                                                      className="text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                                      value={apartmentStatusFilter}
                                                      onChange={(e) => setApartmentStatusFilter(e.target.value)}
                                                      onClick={(e) => e.stopPropagation()}
                                                    >
                                                      <option value="all">Estado</option>
                                                      <option value="pending">Pendiente</option>
                                                      <option value="in-progress">Progreso</option>
                                                      <option value="completed">Listo</option>
                                                      <option value="blocked">Bloqueado</option>
                                                    </select>
                                                  </div>
                                                </div>
                                              </div>
                                              {sortedFloorApartments.length > 0 ? (
                                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2">
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
                                                              <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${allCompleted
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
                                                                    floor_id: apartment.floor_id,
                                                                    project_id: floor.project_id
                                                                  })
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
      <ApartmentFormModalV2
        isOpen={!!selectedApartmentForEdit}
        onClose={() => setSelectedApartmentForEdit(null)}
        onSuccess={() => {
          refresh()
          setSelectedApartmentForEdit(null)
        }}
        apartmentToEdit={selectedApartmentForEdit}
      />

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

      {/* Modal de confirmación para eliminación definitiva de piso */}
      <Modal
        isOpen={showHardDeleteFloorConfirm}
        onClose={() => {
          setShowHardDeleteFloorConfirm(false)
          setFloorToHardDelete(null)
        }}
        title="Confirmar Eliminación Definitiva de Piso"
        size="md"
      >
        {floorToHardDelete && (
          <div className="space-y-4">
            <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p className="text-red-300 font-semibold">¡Advertencia!</p>
              </div>
              <p className="text-slate-300 mb-2">
                Estás a punto de eliminar <strong>definitivamente</strong> el Piso <strong>{floorToHardDelete.floorNumber}</strong>.
              </p>
              <p className="text-sm text-slate-400">
                Esta acción es <strong>irreversible</strong> y tendrá las siguientes consecuencias:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-400 mt-2 space-y-1">
                <li>El piso será eliminado permanentemente de la base de datos</li>
                <li>Todos los <strong>departamentos</strong> del piso serán eliminados</li>
                <li>Las tareas no completadas serán eliminadas definitivamente</li>
                <li>Las tareas completadas se mantendrán, pero quedarán sin asignar a ningún departamento</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowHardDeleteFloorConfirm(false)
                  setFloorToHardDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={confirmHardDeleteFloor}
                className="bg-red-700 hover:bg-red-800 text-white border-red-700"
              >
                Eliminar Definitivamente
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modales de Confirmación Reutilizables */}

      {/* Confirmación de Eliminar Piso */}
      <ConfirmationModal
        isOpen={confirmDeleteFloorState.isOpen}
        onClose={() => setConfirmDeleteFloorState({ isOpen: false, floorId: null })}
        onConfirm={executeDeleteFloor}
        title="Eliminar Piso"
        message="¿Estás seguro de que quieres eliminar este piso? Se moverá a la papelera."
        confirmText="Eliminar"
        type="danger"
      />

      {/* Confirmación de Restaurar Piso */}
      <ConfirmationModal
        isOpen={confirmRestoreFloorState.isOpen}
        onClose={() => setConfirmRestoreFloorState({ isOpen: false, floorId: null })}
        onConfirm={executeRestoreFloor}
        title="Restaurar Piso"
        message="¿Estás seguro de que quieres restaurar este piso?"
        confirmText="Restaurar"
        type="info"
      />

      {/* Confirmación de Restaurar Apartamento */}
      <ConfirmationModal
        isOpen={confirmRestoreApartmentState.isOpen}
        onClose={() => setConfirmRestoreApartmentState({ isOpen: false, apartmentId: null, apartmentNumber: '' })}
        onConfirm={executeRestoreApartment}
        title="Restaurar Departamento"
        message={`¿Estás seguro de que quieres restaurar el departamento ${confirmRestoreApartmentState.apartmentNumber.replace('[ELIMINADO] ', '')}?`}
        confirmText="Restaurar"
        type="info"
      />

    </div >
  )
}
