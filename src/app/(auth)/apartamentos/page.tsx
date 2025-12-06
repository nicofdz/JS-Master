'use client'

import { useState, useEffect } from 'react'
import { useApartments } from '@/hooks'
import { useTowers } from '@/hooks/useTowers'
import { useTasksV2 } from '@/hooks/useTasks_v2'
import { useProjectFilter } from '@/hooks/useProjectFilter'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { ApartmentFormModalV2 } from '@/components/apartments/ApartmentFormModalV2'
import { ApartmentTasksModal } from '@/components/projects/ApartmentTasksModal'
import { ApartmentDetailsModal } from '@/components/apartments/ApartmentDetailsModal' // Added import
import { ApartmentTemplatesModal } from '@/components/apartments/ApartmentTemplatesModal'
import { Plus, Search, Filter, Edit, Trash2, Home, Building2, Clock, CheckCircle, ChevronDown, ChevronRight, Play, AlertCircle, Users, Building, Lock, Unlock, Layers, Eye, Circle, CheckCircle2, AlertTriangle, XCircle, FileText, RotateCcw } from 'lucide-react'
import { StatusFilterCards } from '@/components/common/StatusFilterCards'
import { formatDate, getStatusColor, getStatusEmoji, getStatusText, formatApartmentNumber } from '@/lib/utils'
import { APARTMENT_STATUSES } from '@/lib/constants'
import toast from 'react-hot-toast'
import { ApartmentFiltersSidebar } from '@/components/apartments/ApartmentFiltersSidebar'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'

// Función para obtener icono de estado en lugar de emoji
const getStatusIcon = (status: string | null | undefined) => {
  if (!status) return <Circle className="w-3 h-3" />

  switch (status) {
    case 'completed': return <CheckCircle2 className="w-3 h-3" />
    case 'good': return <CheckCircle2 className="w-3 h-3" />
    case 'active': return <CheckCircle2 className="w-3 h-3" />
    case 'in-progress':
    case 'in_progress': return <Clock className="w-3 h-3" />
    case 'warning': return <AlertTriangle className="w-3 h-3" />
    case 'danger': return <XCircle className="w-3 h-3" />
    case 'blocked': return <XCircle className="w-3 h-3" />
    case 'delayed': return <AlertCircle className="w-3 h-3" />
    case 'pending': return <Circle className="w-3 h-3" />
    default: return <Circle className="w-3 h-3" />
  }
}

export default function ApartamentosPage() {
  const { apartments, floors, projects, loading, error, createApartment, updateApartment, deleteApartment, hardDeleteApartment, restoreApartment, refresh } = useApartments()
  const { restoreTower } = useTowers()
  const { tasks, loading: tasksLoading, createTask } = useTasksV2()
  const { selectedProjectId, setSelectedProjectId } = useProjectFilter()
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [towerFilter, setTowerFilter] = useState<string>('all')
  const [floorFilter, setFloorFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'blocked'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [editingApartment, setEditingApartment] = useState<any>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedFloorForApartment, setSelectedFloorForApartment] = useState<{ floorId: number; towerId: number; projectId: number } | null>(null)
  const [expandedApartments, setExpandedApartments] = useState<Set<number>>(new Set())
  const [selectedApartmentForTasks, setSelectedApartmentForTasks] = useState<any>(null)
  const [selectedApartmentForDetails, setSelectedApartmentForDetails] = useState<any>(null) // Added state
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())
  const [expandedTowers, setExpandedTowers] = useState<Set<number>>(new Set())
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set())
  const [showTrash, setShowTrash] = useState(false)
  useEffect(() => {
    refresh(showTrash)
  }, [showTrash])
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false)
  const [showHardDeleteApartmentConfirm, setShowHardDeleteApartmentConfirm] = useState(false)
  const [apartmentToHardDelete, setApartmentToHardDelete] = useState<{ id: number; number: string } | null>(null)
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false)

  // Estados para modales de confirmación
  const [confirmDeleteState, setConfirmDeleteState] = useState<{ isOpen: boolean; apartmentId: number | null }>({ isOpen: false, apartmentId: null })
  const [confirmBlockState, setConfirmBlockState] = useState<{ isOpen: boolean; apartmentId: number | null; action: 'block' | 'unblock'; currentStatus: string | null }>({ isOpen: false, apartmentId: null, action: 'block', currentStatus: null })
  const [confirmRestoreApartmentState, setConfirmRestoreApartmentState] = useState<{ isOpen: boolean; apartmentId: number | null }>({ isOpen: false, apartmentId: null })
  const [confirmRestoreTowerState, setConfirmRestoreTowerState] = useState<{ isOpen: boolean; towerId: number | null; towerName: string }>({ isOpen: false, towerId: null, towerName: '' })

  // Resetear filtros dependientes
  useEffect(() => {
    setTowerFilter('all')
    setFloorFilter('all')
  }, [projectFilter])

  useEffect(() => {
    setFloorFilter('all')
  }, [towerFilter])

  // Auto-expansión basada en filtros
  useEffect(() => {
    if (projectFilter !== 'all') {
      const projectId = parseInt(projectFilter)
      if (!isNaN(projectId)) {
        setExpandedProjects(prev => new Set(prev).add(projectId))
      }
    }

    if (towerFilter !== 'all') {
      const towerId = parseInt(towerFilter)
      if (!isNaN(towerId)) {
        setExpandedTowers(prev => new Set(prev).add(towerId))
      }
    }

    if (floorFilter !== 'all') {
      const floorId = parseInt(floorFilter)
      if (!isNaN(floorId)) {
        setExpandedFloors(prev => new Set(prev).add(floorId))
      }
    }
  }, [projectFilter, towerFilter, floorFilter])

  // Cargar estado expandido desde localStorage
  useEffect(() => {
    try {
      const savedProjects = localStorage.getItem('apartamentos_expanded_projects')
      const savedTowers = localStorage.getItem('apartamentos_expanded_towers')
      const savedFloors = localStorage.getItem('apartamentos_expanded_floors')

      if (savedProjects) {
        setExpandedProjects(new Set(JSON.parse(savedProjects)))
      } else {
        // Por defecto, expandir todos los proyectos
        const allProjectIds = new Set(apartments.map(apt => apt.project_id || 0).filter(id => id > 0))
        setExpandedProjects(allProjectIds)
      }

      if (savedTowers) {
        setExpandedTowers(new Set(JSON.parse(savedTowers)))
      } else {
        // Por defecto, expandir todas las torres
        const allTowerIds = new Set(apartments.map(apt => (apt as any).tower_id || 0).filter(id => id > 0))
        setExpandedTowers(allTowerIds)
      }

      if (savedFloors) {
        setExpandedFloors(new Set(JSON.parse(savedFloors)))
      }

      setHasLoadedFromStorage(true)
    } catch (err) {
      console.error('Error loading expanded state from localStorage:', err)
      setHasLoadedFromStorage(true)
    }
  }, [apartments.length]) // Solo cuando cambia la cantidad de apartamentos

  // Guardar estado expandido en localStorage
  useEffect(() => {
    if (!hasLoadedFromStorage) return

    try {
      localStorage.setItem('apartamentos_expanded_projects', JSON.stringify(Array.from(expandedProjects)))
      localStorage.setItem('apartamentos_expanded_towers', JSON.stringify(Array.from(expandedTowers)))
      localStorage.setItem('apartamentos_expanded_floors', JSON.stringify(Array.from(expandedFloors)))
    } catch (err) {
      console.error('Error saving expanded state to localStorage:', err)
    }
  }, [expandedProjects, expandedTowers, expandedFloors, hasLoadedFromStorage])


  // Filtrar apartamentos (igual que en pisos)
  const filteredApartments = apartments.filter(apartment => {
    const fullNumber = formatApartmentNumber(apartment.apartment_code, apartment.apartment_number)
    const matchesSearch = fullNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.apartment_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.apartment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.apartment_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      // Búsqueda por torre
      (apartment as any).tower_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apartment as any).tower_number?.toString().includes(searchTerm.toLowerCase()) ||
      // Búsqueda por piso
      apartment.floor_number?.toString().includes(searchTerm.toLowerCase())

    // Filtro por estado (usando el filtro de tarjetas)
    const matchesStatus = statusFilter === 'all' || apartment.status === statusFilter

    // Si hay un filtro local de proyecto, usarlo; si no, usar el filtro global
    const projectToMatch = projectFilter !== 'all' ? projectFilter : (selectedProjectId ? selectedProjectId.toString() : null)
    const matchesProject = !projectToMatch || (apartment.project_id && apartment.project_id.toString() === projectToMatch)
    const matchesTower = towerFilter === 'all' || ((apartment as any).tower_id && (apartment as any).tower_id.toString() === towerFilter)
    const matchesFloor = floorFilter === 'all' || (apartment.floor_id && apartment.floor_id.toString() === floorFilter)

    // Filtro de papelera (torres eliminadas)
    // Filtro de papelera
    const matchesTrash = showTrash
      ? (apartment as any).is_active === false
      : (apartment as any).is_active !== false

    return matchesSearch && matchesStatus && matchesProject && matchesTower && matchesFloor && matchesTrash
  })

  // Obtener proyectos únicos para el filtro (igual que en pisos)
  const uniqueProjects = Array.from(
    new Map(apartments.map(apartment => [apartment.project_id || 0, { id: apartment.project_id || 0, name: apartment.project_name || 'Sin proyecto' }])).values()
  )

  // Obtener torres únicas para el filtro (solo del proyecto seleccionado)
  const uniqueTowers = projectFilter === 'all'
    ? [] // No mostrar torres si no hay proyecto seleccionado
    : Array.from(
      new Map(apartments
        .filter(apartment => apartment.project_id && apartment.project_id.toString() === projectFilter)
        .map(apartment => [(apartment as any).tower_id || 0, { id: (apartment as any).tower_id || 0, number: (apartment as any).tower_number || 0, name: (apartment as any).tower_name || 'Sin torre' }])
      ).values()
    ).sort((a, b) => a.number - b.number)

  // Obtener pisos únicos para el filtro (solo de la torre seleccionada)
  const uniqueFloors = towerFilter === 'all'
    ? []
    : Array.from(
      new Map(apartments
        .filter(apartment => (apartment as any).tower_id && (apartment as any).tower_id.toString() === towerFilter)
        .map(apartment => [apartment.floor_id || 0, { id: apartment.floor_id || 0, floor_number: apartment.floor_number || 0 }])
      ).values()
    ).sort((a, b) => a.floor_number - b.floor_number)

  // Obtener tareas por apartamento
  const getTasksForApartment = (apartmentId: number) => {
    return tasks.filter(task => task.apartment_id === apartmentId)
  }

  // Obtener trabajadores únicos que trabajaron en un departamento
  const getWorkersForApartment = (apartmentId: number) => {
    const apartmentTasks = getTasksForApartment(apartmentId)
    const workersSet = new Set<string>()
    const workersMap = new Map<number, { id: number; full_name: string }>()

    apartmentTasks.forEach(task => {
      if (task.workers && Array.isArray(task.workers)) {
        task.workers.forEach((worker: any) => {
          if (worker.id && worker.full_name && !workersSet.has(`${worker.id}`)) {
            workersSet.add(`${worker.id}`)
            workersMap.set(worker.id, {
              id: worker.id,
              full_name: worker.full_name
            })
          }
        })
      }
    })

    return Array.from(workersMap.values())
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

  // Toggles para jerarquía
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

  const handleDelete = (apartmentId: number) => {
    setConfirmDeleteState({ isOpen: true, apartmentId })
  }

  const executeDelete = async () => {
    if (!confirmDeleteState.apartmentId) return
    try {
      await deleteApartment(confirmDeleteState.apartmentId)
      toast.success('Apartamento eliminado exitosamente')
      setConfirmDeleteState({ isOpen: false, apartmentId: null })
    } catch (err: any) {
      toast.error(`Error al eliminar apartamento: ${err.message || 'Error desconocido'}`)
    }
  }

  const handleBlockApartment = (apartmentId: number, currentStatus: string) => {
    const action = currentStatus === 'blocked' ? 'unblock' : 'block'
    setConfirmBlockState({ isOpen: true, apartmentId, action, currentStatus })
  }

  const executeBlock = async () => {
    const { apartmentId, currentStatus, action } = confirmBlockState
    if (!apartmentId || !currentStatus) return

    let updateData: any = {}

    if (action === 'unblock') {
      const apartment = apartments.find(a => a.id === apartmentId)
      const previousStatus = (apartment as any)?.previous_status || 'pending'

      updateData = {
        status: previousStatus,
        previous_status: null
      }
    } else {
      updateData = {
        status: 'blocked',
        previous_status: currentStatus
      }
    }

    try {
      await updateApartment(apartmentId, updateData)
      toast.success(`Apartamento ${action === 'block' ? 'bloqueado' : 'desbloqueado'} exitosamente`)
      setConfirmBlockState({ isOpen: false, apartmentId: null, action: 'block', currentStatus: null })
    } catch (err: any) {
      toast.error(`Error al ${action === 'block' ? 'bloquear' : 'desbloquear'} apartamento: ${err.message || 'Error desconocido'}`)
    }
  }

  const handleRestoreTower = (towerId: number, towerName: string) => {
    setConfirmRestoreTowerState({ isOpen: true, towerId, towerName })
  }

  const executeRestoreTower = async () => {
    if (!confirmRestoreTowerState.towerId) return
    try {
      await restoreTower(confirmRestoreTowerState.towerId)
      toast.success('Torre restaurada exitosamente')
      refresh(showTrash)
      setConfirmRestoreTowerState({ isOpen: false, towerId: null, towerName: '' })
    } catch (error) {
      console.error('Error al restaurar torre:', error)
      toast.error('Error al restaurar torre')
    }
  }

  const handleRestoreApartment = (apartmentId: number) => {
    setConfirmRestoreApartmentState({ isOpen: true, apartmentId })
  }

  const executeRestoreApartment = async () => {
    if (!confirmRestoreApartmentState.apartmentId) return
    try {
      await restoreApartment(confirmRestoreApartmentState.apartmentId)
      toast.success('Apartamento restaurado exitosamente')
      refresh(showTrash)
      setConfirmRestoreApartmentState({ isOpen: false, apartmentId: null })
    } catch (error) {
      console.error('Error al restaurar apartamento:', error)
      toast.error('Error al restaurar apartamento')
    }
  }

  const handleHardDeleteApartment = (apartmentId: number, apartmentNumber: string) => {
    setApartmentToHardDelete({ id: apartmentId, number: apartmentNumber })
    setShowHardDeleteApartmentConfirm(true)
  }

  const confirmHardDeleteApartment = async () => {
    if (!apartmentToHardDelete) return

    try {
      await hardDeleteApartment(apartmentToHardDelete.id)
      toast.success('Apartamento eliminado definitivamente. Las tareas completadas se mantienen en el sistema.')
      refresh(showTrash)
      setShowHardDeleteApartmentConfirm(false)
      setApartmentToHardDelete(null)
    } catch (err: any) {
      console.error('Error completo al eliminar apartamento definitivamente:', err)
      const errorMessage = err?.message || 'Error desconocido al eliminar el apartamento'
      toast.error(`Error al eliminar el apartamento: ${errorMessage}`)
    }
  }

  const handleCreateApartment = async (data: any) => {
    try {
      console.log('ðŸ“ Creando apartamento con tareas:', data)

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
    const fullNumber = formatApartmentNumber(apartment.apartment_code, apartment.apartment_number)
    const matchesSearch = fullNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.apartment_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.apartment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.apartment_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apartment.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      // BÃºsqueda por torre
      (apartment as any).tower_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apartment as any).tower_number?.toString().includes(searchTerm.toLowerCase()) ||
      // BÃºsqueda por piso
      apartment.floor_number?.toString().includes(searchTerm.toLowerCase())
    // Si hay un filtro local de proyecto, usarlo; si no, usar el filtro global
    const projectToMatch = projectFilter !== 'all' ? projectFilter : (selectedProjectId ? selectedProjectId.toString() : null)
    const matchesProject = !projectToMatch || (apartment.project_id && apartment.project_id.toString() === projectToMatch)

    return matchesSearch && matchesProject
  })

  const totalApartments = apartmentsForStats.length
  const pendingApartments = apartmentsForStats.filter(a => a.status === 'pending').length
  const inProgressApartments = apartmentsForStats.filter(a => a.status === 'in-progress').length
  const completedApartments = apartmentsForStats.filter(a => a.status === 'completed').length
  const blockedApartments = apartmentsForStats.filter(a => a.status === 'blocked').length

  const statusOptions = [
    {
      value: 'pending',
      label: 'Pendientes',
      icon: Clock,
      count: pendingApartments,
      activeColor: 'yellow-400',
      activeBg: 'yellow-900/30',
      activeBorder: 'yellow-500'
    },
    {
      value: 'in-progress',
      label: 'En Progreso',
      icon: Play,
      count: inProgressApartments,
      activeColor: 'emerald-400',
      activeBg: 'emerald-900/30',
      activeBorder: 'emerald-500'
    },
    {
      value: 'completed',
      label: 'Completados',
      icon: CheckCircle,
      count: completedApartments,
      activeColor: 'emerald-400',
      activeBg: 'emerald-900/30',
      activeBorder: 'emerald-500'
    },
    {
      value: 'blocked',
      label: 'Bloqueados',
      icon: Lock,
      count: blockedApartments,
      activeColor: 'red-400',
      activeBg: 'red-900/30',
      activeBorder: 'red-500'
    }
  ]

  return (
    <div className="w-full py-8 px-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Gestión de Apartamentos</h1>

      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número, tipo o proyecto..."
              className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg w-full text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsFilterSidebarOpen(true)}
            className="flex items-center gap-2 border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filtros
            {(statusFilter !== 'all' || projectFilter !== 'all' || towerFilter !== 'all' || floorFilter !== 'all') && (
              <span className="ml-1 bg-blue-500/20 text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-500/30">
                !
              </span>
            )}
          </Button>

          {(statusFilter !== 'all' || projectFilter !== 'all' || towerFilter !== 'all' || floorFilter !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => {
                setStatusFilter('all')
                setProjectFilter('all')
                setTowerFilter('all')
                setFloorFilter('all')
              }}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
              title="Limpiar filtros"
            >
              <XCircle className="w-5 h-5" />
            </Button>
          )}

          <Button onClick={() => setShowTemplatesModal(true)} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Plantillas
          </Button>
          <Button
            variant={showTrash ? "secondary" : "outline"}
            onClick={() => setShowTrash(!showTrash)}
            className={`flex items-center gap-2 ${showTrash ? 'bg-red-900/30 text-red-400 border-red-500/50' : 'border-slate-600 text-slate-200 hover:text-white hover:border-slate-500'}`}
            title={showTrash ? "Ver activos" : "Ver papelera"}
          >
            <Trash2 className="w-4 h-4" />
            {showTrash ? 'Salir de la papelera' : 'Papelera'}
          </Button>
          <Button onClick={() => {
            setSelectedFloorForApartment(null)
            setShowCreateModal(true)
          }} className="flex items-center bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo
          </Button>
        </div>
      </div>

      <ApartmentFiltersSidebar
        isOpen={isFilterSidebarOpen}
        onClose={() => setIsFilterSidebarOpen(false)}
        currentStatusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        currentProjectFilter={projectFilter}
        onProjectFilterChange={setProjectFilter}
        currentTowerFilter={towerFilter}
        onTowerFilterChange={setTowerFilter}
        currentFloorFilter={floorFilter}
        onFloorFilterChange={setFloorFilter}
        projects={uniqueProjects}
        towers={uniqueTowers}
        floors={uniqueFloors}
        counts={{
          all: totalApartments,
          pending: pendingApartments,
          in_progress: inProgressApartments,
          completed: completedApartments,
          blocked: blockedApartments
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
            count: totalApartments,
            activeColor: 'blue-400',
            activeBg: 'blue-900/30',
            activeBorder: 'blue-500'
          }}
        />
      </div>

      {/* Vista Jerárquica de Departamentos */}
      {filteredApartments.length === 0 ? (
        <div className="text-center py-12">
          <Home className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-400 text-lg">No se encontraron departamentos.</p>
          {(towerFilter !== 'all' || projectFilter !== 'all' || statusFilter !== 'all') && (
            <p className="text-slate-500 text-sm mt-2">
              Intenta seleccionar otro filtro o proyecto
            </p>
          )}
        </div>
      ) : (
        <div id="apartments-list" className="space-y-6">
          {(() => {
            // Agrupar departamentos por proyecto > torre > piso
            const apartmentsByProject = filteredApartments.reduce((acc, apartment) => {
              const projectId = apartment.project_id || 0
              const towerId = (apartment as any).tower_id || 0
              const floorId = apartment.floor_id || 0

              if (!acc[projectId]) {
                acc[projectId] = {
                  projectId,
                  projectName: apartment.project_name || 'Proyecto Desconocido',
                  towers: {} as Record<number, {
                    towerId: number
                    towerNumber: number
                    towerName: string
                    floors: Record<number, {
                      floorId: number
                      floorNumber: number
                      apartments: typeof filteredApartments
                    }>
                  }>
                }
              }

              if (!acc[projectId].towers[towerId]) {
                acc[projectId].towers[towerId] = {
                  towerId,
                  towerNumber: (apartment as any).tower_number || 0,
                  towerName: (apartment as any).tower_name || `Torre ${(apartment as any).tower_number || 0}`,
                  floors: {}
                }
              }

              if (!acc[projectId].towers[towerId].floors[floorId]) {
                acc[projectId].towers[towerId].floors[floorId] = {
                  floorId,
                  floorNumber: apartment.floor_number || 0,
                  apartments: []
                }
              }

              acc[projectId].towers[towerId].floors[floorId].apartments.push(apartment)
              return acc
            }, {} as Record<number, {
              projectId: number
              projectName: string
              towers: Record<number, {
                towerId: number
                towerNumber: number
                towerName: string
                floors: Record<number, {
                  floorId: number
                  floorNumber: number
                  apartments: typeof filteredApartments
                }>
              }>
            }>)

            // Función para extraer el número del código del departamento
            const extractApartmentNumber = (apartmentNumber: string): number => {
              // Extraer todos los números del string
              const numbers = apartmentNumber.match(/\d+/g)
              if (!numbers || numbers.length === 0) return 0
              // Usar el último número encontrado (generalmente el más relevante, ej: "A1 D-104" -> 104)
              return parseInt(numbers[numbers.length - 1]) || 0
            }

            // Ordenar departamentos por número en cada piso
            (Object.values(apartmentsByProject) as Array<{
              projectId: number
              projectName: string
              towers: Record<number, {
                towerId: number
                towerNumber: number
                towerName: string
                floors: Record<number, {
                  floorId: number
                  floorNumber: number
                  apartments: typeof filteredApartments
                }>
              }>
            }>).forEach(project => {
              Object.values(project.towers).forEach(tower => {
                Object.values(tower.floors).forEach(floor => {
                  floor.apartments.sort((a: any, b: any) => {
                    const numA = extractApartmentNumber(a.apartment_number)
                    const numB = extractApartmentNumber(b.apartment_number)
                    return numA - numB
                  })
                })
              })
            })

            return (Object.values(apartmentsByProject) as Array<{
              projectId: number
              projectName: string
              towers: Record<number, {
                towerId: number
                towerNumber: number
                towerName: string
                floors: Record<number, {
                  floorId: number
                  floorNumber: number
                  apartments: typeof filteredApartments
                }>
              }>
            }>).map((projectGroup, projectIndex) => {
              const isProjectExpanded = expandedProjects.has(projectGroup.projectId)

              // Calcular estadísticas del proyecto
              const allProjectApartments = Object.values(projectGroup.towers)
                .flatMap(tower => Object.values(tower.floors).flatMap(floor => floor.apartments))

              const totalApartments = allProjectApartments.length
              const totalTasks = allProjectApartments.reduce((sum, apt) => sum + (apt.tasks_count || 0), 0)
              const completedTasks = allProjectApartments.reduce((sum, apt) => {
                const aptTasks = getTasksForApartment(apt.id)
                return sum + aptTasks.filter(t => t.status === 'completed').length
              }, 0)
              const averageProgress = totalApartments > 0
                ? Math.round(allProjectApartments.reduce((sum, apt) => sum + (apt.progress_percentage || 0), 0) / totalApartments)
                : 0

              return (
                <div key={projectGroup.projectId} className={`space-y-4 ${projectIndex > 0 ? 'mt-8 pt-6 border-t-2 border-slate-600' : ''}`}>
                  {/* Header de Proyecto - Colapsable */}
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
                          <span className="text-slate-400">Deptos:</span>
                          <span className="text-slate-300 font-medium">{totalApartments}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Torres del Proyecto */}
                  {isProjectExpanded && (
                    <div className="space-y-4 ml-4">
                      {Object.values(projectGroup.towers)
                        .sort((a, b) => a.towerNumber - b.towerNumber)
                        .map((towerGroup) => {
                          const isTowerExpanded = expandedTowers.has(towerGroup.towerId)

                          // Calcular estadísticas de la torre
                          const allTowerApartments = Object.values(towerGroup.floors)
                            .flatMap(floor => floor.apartments)
                          const towerTotalTasks = allTowerApartments.reduce((sum, apt) => sum + (apt.tasks_count || 0), 0)
                          const towerCompletedTasks = allTowerApartments.reduce((sum, apt) => {
                            const aptTasks = getTasksForApartment(apt.id)
                            return sum + aptTasks.filter(t => t.status === 'completed').length
                          }, 0)
                          const towerAverageProgress = allTowerApartments.length > 0
                            ? Math.round(allTowerApartments.reduce((sum, apt) => sum + (apt.progress_percentage || 0), 0) / allTowerApartments.length)
                            : 0

                          return (
                            <div key={towerGroup.towerId} className="space-y-3">
                              {/* Header de Torre - Colapsable */}
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
                                    {showTrash && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleRestoreTower(towerGroup.towerId, towerGroup.towerName)
                                        }}
                                        className="h-6 px-2 text-green-400 hover:text-green-300 hover:bg-green-900/30 ml-2"
                                        title="Restaurar Torre"
                                      >
                                        <RotateCcw className="w-3 h-3 mr-1" />
                                        Restaurar
                                      </Button>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400">Progreso:</span>
                                      <span className="text-slate-300 font-medium">{towerAverageProgress}%</span>
                                    </div>
                                    {towerTotalTasks > 0 && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-400">Tareas:</span>
                                        <span className="text-slate-300 font-medium">{towerCompletedTasks}/{towerTotalTasks}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400">Deptos:</span>
                                      <span className="text-slate-300 font-medium">{allTowerApartments.length}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Pisos de la Torre */}
                              {isTowerExpanded && (
                                <div className="space-y-3 ml-4">
                                  {Object.values(towerGroup.floors)
                                    .sort((a, b) => a.floorNumber - b.floorNumber)
                                    .map((floorGroup) => {
                                      const isFloorExpanded = expandedFloors.has(floorGroup.floorId)

                                      // Calcular estadísticas del piso
                                      const floorTotalTasks = floorGroup.apartments.reduce((sum, apt) => sum + (apt.tasks_count || 0), 0)
                                      const floorCompletedTasks = floorGroup.apartments.reduce((sum, apt) => {
                                        const aptTasks = getTasksForApartment(apt.id)
                                        return sum + aptTasks.filter(t => t.status === 'completed').length
                                      }, 0)
                                      const floorAverageProgress = floorGroup.apartments.length > 0
                                        ? Math.round(floorGroup.apartments.reduce((sum, apt) => sum + (apt.progress_percentage || 0), 0) / floorGroup.apartments.length)
                                        : 0

                                      return (
                                        <div key={floorGroup.floorId} className="space-y-3">
                                          {/* Header de Piso - Colapsable */}
                                          <div
                                            className="bg-slate-700/30 rounded-lg border border-slate-600 px-3 py-2 cursor-pointer hover:bg-slate-700/50 transition-colors"
                                            onClick={() => toggleFloorExpansion(floorGroup.floorId)}
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
                                                  Piso {floorGroup.floorNumber}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-3 text-xs">
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-slate-400">Progreso:</span>
                                                    <span className="text-slate-300 font-medium">{floorAverageProgress}%</span>
                                                  </div>
                                                  {floorTotalTasks > 0 && (
                                                    <div className="flex items-center gap-1">
                                                      <span className="text-slate-400">Tareas:</span>
                                                      <span className="text-slate-300 font-medium">{floorCompletedTasks}/{floorTotalTasks}</span>
                                                    </div>
                                                  )}
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-slate-400">Deptos:</span>
                                                    <span className="text-slate-300 font-medium">{floorGroup.apartments.length}</span>
                                                  </div>
                                                </div>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedFloorForApartment({
                                                      floorId: floorGroup.floorId,
                                                      towerId: towerGroup.towerId,
                                                      projectId: projectGroup.projectId
                                                    })
                                                    setShowCreateModal(true)
                                                  }}
                                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                                                  title="Agregar Departamento"
                                                >
                                                  <Plus className="w-4 h-4 mr-1" />
                                                  Agregar
                                                </Button>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Departamentos del Piso - FILAS SIMPLES */}
                                          {isFloorExpanded && (
                                            <div className="space-y-2 ml-4">
                                              {floorGroup.apartments.map((apartment) => {
                                                const apartmentTasks = getTasksForApartment(apartment.id)
                                                const completedTasks = apartmentTasks.filter(t => t.status === 'completed').length
                                                const apartmentWorkers = getWorkersForApartment(apartment.id)

                                                // Función para abreviar nombres
                                                const abbreviateName = (fullName: string): string => {
                                                  const parts = fullName.trim().split(' ')
                                                  if (parts.length >= 2) {
                                                    return `${parts[0]} ${parts[1][0]}.`
                                                  }
                                                  return fullName
                                                }

                                                return (
                                                  <div
                                                    key={apartment.id}
                                                    className="bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800/70 hover:border-slate-600 transition-all cursor-pointer"
                                                    onClick={() => setSelectedApartmentForTasks(apartment)}
                                                  >
                                                    <div className="p-4">
                                                      <div className="flex items-center justify-between">
                                                        {/* Información Principal */}
                                                        <div className="flex items-center gap-4 flex-1">
                                                          <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                              <Home className="w-4 h-4 text-blue-400" />
                                                            </div>
                                                            <div>
                                                              <h3 className="text-base font-semibold text-slate-100">
                                                                {formatApartmentNumber(apartment.apartment_code, apartment.apartment_number)}
                                                              </h3>
                                                              <p className="text-xs text-slate-400">
                                                                {apartment.apartment_type || 'Sin tipo'} {apartment.area ? `• ${apartment.area} m²` : ''}
                                                              </p>
                                                            </div>
                                                          </div>

                                                          {/* Estado */}
                                                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(apartment.status)
                                                            }`}>
                                                            {getStatusIcon(apartment.status)}
                                                            {getStatusText(apartment.status)}
                                                          </span>

                                                          {/* Progreso */}
                                                          <div className="flex items-center gap-2 flex-1 max-w-xs">
                                                            <div className="flex-1 bg-slate-700 rounded-full h-2">
                                                              <div
                                                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                                style={{ width: `${apartment.progress_percentage || 0}%` }}
                                                              ></div>
                                                            </div>
                                                            <span className="text-xs text-slate-300 font-medium w-10 text-right">
                                                              {apartment.progress_percentage || 0}%
                                                            </span>
                                                          </div>

                                                          {/* Tareas */}
                                                          <div className="flex items-center gap-2 text-sm">
                                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                                            <span className="text-slate-300 font-medium">
                                                              {completedTasks}/{apartmentTasks.length}
                                                            </span>
                                                          </div>

                                                          {/* Trabajadores */}
                                                          <div className="flex items-center gap-2 text-sm">
                                                            <Users className="w-4 h-4 text-blue-400" />
                                                            {apartmentWorkers.length > 0 ? (
                                                              <div className="flex items-center gap-1 flex-wrap">
                                                                {apartmentWorkers.slice(0, 3).map((worker) => (
                                                                  <span
                                                                    key={worker.id}
                                                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                                    title={worker.full_name}
                                                                  >
                                                                    {abbreviateName(worker.full_name)}
                                                                  </span>
                                                                ))}
                                                                {apartmentWorkers.length > 3 && (
                                                                  <span className="text-xs text-slate-400">
                                                                    +{apartmentWorkers.length - 3}
                                                                  </span>
                                                                )}
                                                              </div>
                                                            ) : (
                                                              <span className="text-xs text-slate-400">No hay nadie</span>
                                                            )}
                                                          </div>
                                                        </div>

                                                        {/* Acciones */}
                                                        <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                                                          {showTrash ? (
                                                            <>
                                                              <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRestoreApartment(apartment.id)}
                                                                className="text-green-400 hover:text-green-300 hover:bg-green-900/30"
                                                                title="Restaurar"
                                                              >
                                                                <RotateCcw className="w-4 h-4" />
                                                              </Button>
                                                              <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleHardDeleteApartment(apartment.id, formatApartmentNumber(apartment.apartment_code, apartment.apartment_number))}
                                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                                                title="Eliminar Definitivamente"
                                                              >
                                                                <Trash2 className="w-4 h-4" />
                                                              </Button>
                                                            </>
                                                          ) : (
                                                            <>
                                                              <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setEditingApartment(apartment)}
                                                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                                                                title="Editar"
                                                              >
                                                                <Edit className="w-4 h-4" />
                                                              </Button>
                                                              <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleBlockApartment(apartment.id, apartment.status)}
                                                                className={`${apartment.status === 'blocked'
                                                                  ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30'
                                                                  : 'text-orange-400 hover:text-orange-300 hover:bg-orange-900/30'
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
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(apartment.id)}
                                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                                                title="Eliminar"
                                                              >
                                                                <Trash2 className="w-4 h-4" />
                                                              </Button>
                                                              <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                  e.stopPropagation()
                                                                  setSelectedApartmentForDetails(apartment)
                                                                }}
                                                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                                                                title="Ver detalles del departamento"
                                                              >
                                                                <Eye className="w-4 h-4" />
                                                              </Button>
                                                            </>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
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
                        })}
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      )}

      {/* Modal de Creación de Departamento */}
      <ApartmentFormModalV2
        isOpen={showCreateModal || !!editingApartment}
        onClose={() => {
          setShowCreateModal(false)
          setEditingApartment(null)
          setSelectedFloorForApartment(null)
        }}
        onSuccess={() => {
          // Refrescar la lista de apartamentos
          window.location.reload() // Temporal, luego usar refresh del hook
        }}
        initialFloorId={selectedFloorForApartment?.floorId}
        initialTowerId={selectedFloorForApartment?.towerId}
        initialProjectId={selectedFloorForApartment?.projectId}
        apartmentToEdit={editingApartment}
      />

      {/* Modal de Tareas del Apartamento */}
      {selectedApartmentForTasks && (
        <ApartmentTasksModal
          isOpen={!!selectedApartmentForTasks}
          onClose={() => setSelectedApartmentForTasks(null)}
          apartmentId={selectedApartmentForTasks.id}
          apartmentNumber={formatApartmentNumber(selectedApartmentForTasks.apartment_code, selectedApartmentForTasks.apartment_number)}
        />
      )}

      {/* Modal de Detalles del Apartamento */}
      {selectedApartmentForDetails && (
        <ApartmentDetailsModal
          isOpen={!!selectedApartmentForDetails}
          onClose={() => setSelectedApartmentForDetails(null)}
          apartment={selectedApartmentForDetails}
          onViewTasks={() => {
            const apt = selectedApartmentForDetails
            setSelectedApartmentForDetails(null)
            // Pequeño timeout para que la transición sea suave
            setTimeout(() => {
              setSelectedApartmentForTasks(apt)
            }, 100)
          }}
          workers={getWorkersForApartment(selectedApartmentForDetails.id)}
        />
      )}

      {/* Modal de Plantillas de Departamentos */}
      <ApartmentTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
      />

      {/* Modal de confirmación para eliminación definitiva de apartamento */}
      <Modal
        isOpen={showHardDeleteApartmentConfirm}
        onClose={() => {
          setShowHardDeleteApartmentConfirm(false)
          setApartmentToHardDelete(null)
        }}
        title="Confirmar Eliminación Definitiva de Apartamento"
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
                Estás a punto de eliminar <strong>definitivamente</strong> el apartamento <strong>{apartmentToHardDelete.number}</strong>.
              </p>
              <p className="text-sm text-slate-400">
                Esta acción es <strong>irreversible</strong> y tendrá las siguientes consecuencias:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-400 mt-2 space-y-1">
                <li>El apartamento será eliminado permanentemente de la base de datos</li>
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

      {/* Modales de Confirmación Reutilizables */}

      {/* Confirmación de Eliminar */}
      <ConfirmationModal
        isOpen={confirmDeleteState.isOpen}
        onClose={() => setConfirmDeleteState({ isOpen: false, apartmentId: null })}
        onConfirm={executeDelete}
        title="Eliminar Apartamento"
        message="¿Estás seguro de que quieres eliminar este apartamento? Esta acción lo moverá a la papelera."
        confirmText="Eliminar"
        type="danger"
      />

      {/* Confirmación de Bloquear/Desbloquear */}
      <ConfirmationModal
        isOpen={confirmBlockState.isOpen}
        onClose={() => setConfirmBlockState({ isOpen: false, apartmentId: null, action: 'block', currentStatus: null })}
        onConfirm={executeBlock}
        title={confirmBlockState.action === 'block' ? "Bloquear Apartamento" : "Desbloquear Apartamento"}
        message={confirmBlockState.action === 'block'
          ? "¿Estás seguro de que quieres bloquear este apartamento?"
          : "¿Estás seguro de que quieres desbloquear este apartamento?"}
        confirmText={confirmBlockState.action === 'block' ? "Bloquear" : "Desbloquear"}
        type={confirmBlockState.action === 'block' ? "warning" : "info"}
      />

      {/* Confirmación de Restaurar Torre */}
      <ConfirmationModal
        isOpen={confirmRestoreTowerState.isOpen}
        onClose={() => setConfirmRestoreTowerState({ isOpen: false, towerId: null, towerName: '' })}
        onConfirm={executeRestoreTower}
        title="Restaurar Torre"
        message={`¿Estás seguro de que quieres restaurar la ${confirmRestoreTowerState.towerName}?`}
        confirmText="Restaurar"
        type="info"
      />

      {/* Confirmación de Restaurar Apartamento */}
      <ConfirmationModal
        isOpen={confirmRestoreApartmentState.isOpen}
        onClose={() => setConfirmRestoreApartmentState({ isOpen: false, apartmentId: null })}
        onConfirm={executeRestoreApartment}
        title="Restaurar Apartamento"
        message="¿Estás seguro de que quieres restaurar este apartamento?"
        confirmText="Restaurar"
        type="info"
      />
    </div>
  )
}
