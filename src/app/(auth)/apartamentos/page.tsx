'use client'

import { useState, useEffect } from 'react'
import { useApartments } from '@/hooks'
import { useTasksV2 } from '@/hooks/useTasks_v2'
import { useProjectFilter } from '@/hooks/useProjectFilter'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { ApartmentFormModalV2 } from '@/components/apartments/ApartmentFormModalV2'
import { ApartmentTasksModal } from '@/components/projects/ApartmentTasksModal'
import { ApartmentTemplatesModal } from '@/components/apartments/ApartmentTemplatesModal'
import { Plus, Search, Filter, Edit, Trash2, Home, Building2, Clock, CheckCircle, ChevronDown, ChevronRight, Play, AlertCircle, Users, Building, Lock, Unlock, Layers, Eye, Circle, CheckCircle2, AlertTriangle, XCircle, FileText } from 'lucide-react'
import { StatusFilterCards } from '@/components/common/StatusFilterCards'
import { formatDate, getStatusColor, getStatusEmoji, getStatusText, formatApartmentNumber } from '@/lib/utils'

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
import { APARTMENT_STATUSES } from '@/lib/constants'
import toast from 'react-hot-toast'

export default function ApartamentosPage() {
  const { apartments, floors, projects, loading, error, createApartment, updateApartment, deleteApartment } = useApartments()
  const { tasks, loading: tasksLoading, createTask } = useTasksV2()
  const { selectedProjectId, setSelectedProjectId } = useProjectFilter()
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [towerFilter, setTowerFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'blocked'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [editingApartment, setEditingApartment] = useState<any>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedFloorForApartment, setSelectedFloorForApartment] = useState<{ floorId: number; towerId: number; projectId: number } | null>(null)
  const [expandedApartments, setExpandedApartments] = useState<Set<number>>(new Set())
  const [selectedApartmentForTasks, setSelectedApartmentForTasks] = useState<any>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())
  const [expandedTowers, setExpandedTowers] = useState<Set<number>>(new Set())
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set())
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false)

  // Resetear filtro de torre cuando cambie el proyecto
  useEffect(() => {
    setTowerFilter('all')
  }, [projectFilter])

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
                         apartment.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filtro por estado (usando el filtro de tarjetas)
    const matchesStatus = statusFilter === 'all' || apartment.status === statusFilter
    
    // Si hay un filtro local de proyecto, usarlo; si no, usar el filtro global
    const projectToMatch = projectFilter !== 'all' ? projectFilter : (selectedProjectId ? selectedProjectId.toString() : null)
    const matchesProject = !projectToMatch || (apartment.project_id && apartment.project_id.toString() === projectToMatch)
    const matchesTower = towerFilter === 'all' || ((apartment as any).tower_id && (apartment as any).tower_id.toString() === towerFilter)
    
    return matchesSearch && matchesStatus && matchesProject && matchesTower
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
                         apartment.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowTemplatesModal(true)} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Plantillas de Departamentos
          </Button>
          <Button onClick={() => {
            setSelectedFloorForApartment(null)
            setShowCreateModal(true)
          }} className="flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Apartamento
        </Button>
        </div>
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
                value={towerFilter}
                onChange={(e) => setTowerFilter(e.target.value)}
                disabled={projectFilter === 'all'}
              >
                <option value="all">
                  {projectFilter === 'all' ? 'Selecciona un proyecto primero' : 'Todas las torres'}
                </option>
                {uniqueTowers.map((tower) => {
                  // Si el nombre es igual al número, solo mostrar el número
                  const displayName = tower.name === `Torre ${tower.number}` || tower.name === `Torre ${tower.number}` || tower.name === `Torre${tower.number}` 
                    ? `Torre ${tower.number}` 
                    : `Torre ${tower.number} - ${tower.name}`
                  return (
                    <option key={tower.id} value={tower.id}>
                      {displayName}
                  </option>
                  )
                })}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
      

      {/* Estadísticas rápidas */}
      <StatusFilterCards
        selectedValue={statusFilter}
        onSelect={(value) => setStatusFilter(value as 'all' | 'pending' | 'in-progress' | 'completed' | 'blocked')}
        scrollTargetId="apartments-list"
        defaultOption={{
          value: 'all',
          label: 'Todos',
          icon: Layers,
          count: totalApartments,
          activeColor: 'blue-400',
          activeBg: 'blue-900/30',
          activeBorder: 'blue-500'
        }}
        options={[
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
        ]}
      />

      {/* Vista Jerárquica de Departamentos */}
      {filteredApartments.length === 0 ? (
        <div className="text-center py-12">
          <Home className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-400 text-lg">No se encontraron departamentos.</p>
          {(towerFilter !== 'all' || projectFilter !== 'all' || statusFilter !== 'all') && (
            <p className="text-slate-500 text-sm mt-2">
              Intenta seleccionar otro filtro o proyecto
=======
      {/* Grilla de Apartamentos */}
      {filteredApartments.length === 0 ? (
        <div className="text-center py-12">
          <Home className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-400 text-lg">No se encontraron apartamentos.</p>
          {floorFilter !== 'all' && (
            <p className="text-slate-500 text-sm mt-2">
              Intenta seleccionar otro piso o proyecto
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
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
=======
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
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
                    </div>
                  </div>

                  {/* Estado */}
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                      getStatusColor(apartment.status)
                    }`}>
                      {getStatusIcon(apartment.status)}
                      {getStatusText(apartment.status)}
                    </span>

                  {/* Progreso */}
                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
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
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
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
                    <Button
                                                            variant="ghost"
                      size="sm"
                      onClick={() => setEditingApartment(apartment)}
                                                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
=======
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
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBlockApartment(apartment.id, apartment.status)}
                      className={`${
                        apartment.status === 'blocked' 
                          ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30' 
                          : 'text-orange-400 hover:text-orange-300 hover:bg-orange-900/30'
                      className={`flex-1 ${
                        apartment.status === 'blocked' 
                          ? 'text-emerald-400 border-emerald-600 hover:bg-emerald-900/30' 
                          : 'text-orange-400 border-orange-600 hover:bg-orange-900/30'
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
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
                        setSelectedApartmentForTasks(apartment)
                      }}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                      title="Ver detalles del departamento"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
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
=======
                  </div>
                </CardContent>
              </Card>
            )
          })}
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
        </div>
      )}



      {/* Modal de Creación de Departamento */}
      <ApartmentFormModalV2
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setSelectedFloorForApartment(null)
        }}
        onSuccess={() => {
          // Refrescar la lista de apartamentos
          window.location.reload() // Temporal, luego usar refresh del hook
        }}
        initialFloorId={selectedFloorForApartment?.floorId}
        initialTowerId={selectedFloorForApartment?.towerId}
        initialProjectId={selectedFloorForApartment?.projectId}
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

      {/* Modal de Plantillas de Departamentos */}}
      <ApartmentTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
      />
=======
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
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
    </div>
  )
}