'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus, Search, Building2, User } from 'lucide-react'
import { StatusFilterCards } from '@/components/common/StatusFilterCards'
import { TaskHierarchyV2 } from '@/components/tasks-v2/TaskHierarchyV2'
import { TaskFormModalV2 } from '@/components/tasks-v2/TaskFormModalV2'
import { AddTasksToFloorsModal } from '@/components/projects/AddTasksToFloorsModal'
import { DeletedTasksList } from '@/components/tasks-v2/DeletedTasksList'
import { TaskTemplatesModal } from '@/components/tasks-v2/TaskTemplatesModal'
import { Clock, Play, CheckCircle, Lock, AlertCircle, Layers, Trash2, CheckSquare, FileText, Filter, XCircle } from 'lucide-react'
import { TaskFiltersSidebar } from '@/components/tasks-v2/TaskFiltersSidebar'
// import { RecentTasksModal } from '@/components/tasks-v2/RecentTasksModal' // Removing Modal import
import { RecentTasksList } from '@/components/tasks-v2/RecentTasksList'
import { TaskDetailModalV2 } from '@/components/tasks-v2/TaskDetailModalV2'
import { useTasksV2 } from '@/hooks'
import { useProjectFilter } from '@/hooks/useProjectFilter'
import { formatApartmentNumber } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function TareasPage() {
  const { selectedProjectId, setSelectedProjectId } = useProjectFilter()
  const searchParams = useSearchParams()

  const {
    tasks,
    apartments,
    projects,
    users,
    floors,
    loading,
    error,
    taskStats,
    refreshStats,
    getWorkersForProject,
    refreshTasks,
    fetchDeletedTasks,
    getDeletedTasksCount,
    restoreTask,
    hardDeleteTask,
    emptyTrash
  } = useTasksV2({ projectId: selectedProjectId })

  const [activeTab, setActiveTab] = useState<'active' | 'trash' | 'recent'>('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [recentTasksProjectFilter, setRecentTasksProjectFilter] = useState<string | null>(null) // Filtro aislado para tab reciente
  const [workerFilter, setWorkerFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled' | 'on_hold' | 'delayed'>('all')
  const [towerFilter, setTowerFilter] = useState<string>('all')
  const [floorFilter, setFloorFilter] = useState<string>('all')

  const [apartmentFilter, setApartmentFilter] = useState<string>('all')

  // Date Filters
  const [dateFilterType, setDateFilterType] = useState<'all' | 'specific' | 'range' | 'month' | 'year'>('all')
  const [dateStart, setDateStart] = useState<string>('')
  const [dateEnd, setDateEnd] = useState<string>('')

  const [projectWorkers, setProjectWorkers] = useState<any[]>([])
  const [loadingWorkers, setLoadingWorkers] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)

  // Resolve numeric project ID for templates modal
  const templatesProjectId = selectedProjectId && selectedProjectId !== 'all'
    ? Number(selectedProjectId)
    : undefined
  const [deletedTasks, setDeletedTasks] = useState<any[]>([])
  const [loadingDeleted, setLoadingDeleted] = useState(false)
  const [deletedTasksCount, setDeletedTasksCount] = useState(0)
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false)
  const [initialTaskData, setInitialTaskData] = useState<{ projectId: number; towerId: number; floorId: number; apartmentId: number | null } | null>(null)
  const [showMassCreateModal, setShowMassCreateModal] = useState(false)
  const [massCreateData, setMassCreateData] = useState<{ projectId: number, towerId: number } | null>(null)
  // const [showRecentTasksModal, setShowRecentTasksModal] = useState(false) // Removed
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<any | null>(null)

  // Cargar conteo de tareas eliminadas cuando cambia la función de conteo (ej: al cargar rol)
  useEffect(() => {
    loadDeletedTasksCount()
  }, [getDeletedTasksCount])

  // Cargar tareas eliminadas cuando se cambia al tab de papelera
  useEffect(() => {
    if (activeTab === 'trash' && !loadingDeleted) {
      loadDeletedTasks()
    }
  }, [activeTab])

  const loadDeletedTasksCount = async () => {
    try {
      const count = await getDeletedTasksCount()
      setDeletedTasksCount(count)
    } catch (error) {
      console.error('Error loading deleted tasks count:', error)
    }
  }

  const loadDeletedTasks = async () => {
    setLoadingDeleted(true)
    try {
      const deleted = await fetchDeletedTasks()
      setDeletedTasks(deleted)
    } catch (error) {
      console.error('Error loading deleted tasks:', error)
    } finally {
      setLoadingDeleted(false)
    }
  }

  const handleRestoreTask = async (taskId: number) => {
    try {
      await restoreTask(taskId)
      await loadDeletedTasks() // Recargar lista de eliminadas
      await loadDeletedTasksCount() // Actualizar conteo
      toast.success('Tarea restaurada exitosamente')
    } catch (error: any) {
      toast.error(`Error al restaurar tarea: ${error.message}`)
    }
  }

  const handleTaskDeleted = async () => {
    // Actualizar conteo cuando se elimina una tarea
    await loadDeletedTasksCount()
    // Si estamos en el tab de papelera, recargar la lista
    if (activeTab === 'trash') {
      await loadDeletedTasks()
    }
  }

  const handleAddTask = (projectId: number, towerId: number, floorId: number, apartmentId: number | null) => {
    setInitialTaskData({ projectId, towerId, floorId, apartmentId })
    setShowCreateModal(true)
  }

  const handleMassAddTask = (projectId: number, towerId: number) => {
    setMassCreateData({ projectId, towerId })
    setShowMassCreateModal(true)
  }

  const handleMassCreateSuccess = async () => {
    await refreshTasks()
    await refreshStats()
    setShowMassCreateModal(false)
    setMassCreateData(null)
  }

  // Cargar filtros desde localStorage al iniciar Y leer URL params
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem('tareas-filters')
      if (savedFilters) {
        const filters = JSON.parse(savedFilters)
        if (filters.workerFilter) setWorkerFilter(filters.workerFilter)

        // Priorizar URL param sobre localStorage si existe
        const urlStatus = searchParams.get('status')
        if (urlStatus && ['all', 'pending', 'in_progress', 'completed', 'blocked', 'cancelled', 'on_hold', 'delayed'].includes(urlStatus)) {
          setStatusFilter(urlStatus as any)
        } else if (filters.statusFilter) {
          setStatusFilter(filters.statusFilter)
        }

        const urlProject = searchParams.get('project')
        if (urlProject) {
          setSelectedProjectId(urlProject)
        } else if (filters.selectedProjectId) {
          setSelectedProjectId(filters.selectedProjectId)
        }

        if (filters.towerFilter) setTowerFilter(filters.towerFilter)
        if (filters.floorFilter) setFloorFilter(filters.floorFilter)
        if (filters.apartmentFilter) setApartmentFilter(filters.apartmentFilter)
        if (filters.searchTerm) setSearchTerm(filters.searchTerm)
        if (filters.activeTab) setActiveTab(filters.activeTab)

        // Date filters
        if (filters.dateFilterType) setDateFilterType(filters.dateFilterType)
        if (filters.dateStart) setDateStart(filters.dateStart)
        if (filters.dateEnd) setDateEnd(filters.dateEnd)
      } else {
        // Si no hay localStorage, check URL param anyway
        const urlStatus = searchParams.get('status')
        if (urlStatus && ['all', 'pending', 'in_progress', 'completed', 'blocked', 'cancelled', 'on_hold', 'delayed'].includes(urlStatus)) {
          setStatusFilter(urlStatus as any)
        }

        const urlProject = searchParams.get('project')
        if (urlProject) {
          setSelectedProjectId(urlProject)
        }
      }
    } catch (error) {
      console.error('Error loading filters from localStorage:', error)
    }
  }, [searchParams]) // Add searchParams dependency

  // Guardar filtros en localStorage cuando cambian
  useEffect(() => {
    try {
      const filters = {
        selectedProjectId,
        workerFilter,
        statusFilter,
        towerFilter,
        floorFilter,
        apartmentFilter,

        searchTerm,
        dateFilterType,
        dateStart,
        dateEnd
      }
      localStorage.setItem('tareas-filters', JSON.stringify(filters))
    } catch (error) {
      console.error('Error saving filters to localStorage:', error)
    }
  }, [selectedProjectId, workerFilter, statusFilter, towerFilter, floorFilter, apartmentFilter, searchTerm, dateFilterType, dateStart, dateEnd])

  // Actualizar estadísticas cuando cambia el proyecto
  useEffect(() => {
    if (refreshStats) {
      const projectId = selectedProjectId && selectedProjectId !== 'all' ? Number(selectedProjectId) : undefined
      refreshStats(projectId)
    }
  }, [selectedProjectId, refreshStats])

  // Cargar trabajadores del proyecto seleccionado (con cancelación de requests)
  useEffect(() => {
    // Limpiar trabajadores inmediatamente al cambiar de proyecto
    setProjectWorkers([])
    setLoadingWorkers(true)

    // Flag para ignorar respuestas de proyectos anteriores
    let currentProjectId = selectedProjectId
    let isCancelled = false

    const loadProjectWorkers = async () => {
      if (!selectedProjectId || selectedProjectId === 'all' || !getWorkersForProject) {
        setProjectWorkers([])
        setLoadingWorkers(false)
        return
      }

      try {
        const workers = await getWorkersForProject(Number(selectedProjectId))

        // Solo actualizar si este proyecto sigue siendo el seleccionado
        if (!isCancelled && currentProjectId === selectedProjectId) {
          setProjectWorkers(workers || [])
        }
      } catch (err) {
        console.error('Error loading workers:', err)
        if (!isCancelled && currentProjectId === selectedProjectId) {
          setProjectWorkers([])
        }
      } finally {
        if (!isCancelled && currentProjectId === selectedProjectId) {
          setLoadingWorkers(false)
        }
      }
    }

    loadProjectWorkers()

    // Cleanup: marcar como cancelado cuando cambia el proyecto
    return () => {
      isCancelled = true
    }
  }, [selectedProjectId]) // Removido getWorkersForProject de dependencias



  const availableTowers = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === 'all') return []

    // Obtener torres únicas desde las tareas del proyecto
    const projectTasks = tasks.filter(t => t.project_id?.toString() === selectedProjectId)
    const uniqueTowersMap = new Map<number, { id: number; number: number }>()

    projectTasks.forEach(task => {
      if (task.tower_id && task.tower_number) {
        if (!uniqueTowersMap.has(task.tower_id)) {
          uniqueTowersMap.set(task.tower_id, {
            id: task.tower_id,
            number: task.tower_number
          })
        }
      }
    })

    return Array.from(uniqueTowersMap.values()).sort((a, b) => a.number - b.number)
  }, [tasks, selectedProjectId])

  // Obtener pisos de la torre seleccionada
  const availableFloors = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === 'all') return []
    if (towerFilter === 'all') return []

    return floors.filter(f =>
      f.project_id?.toString() === selectedProjectId &&
      f.tower_id?.toString() === towerFilter
    ).sort((a, b) => a.floor_number - b.floor_number)
  }, [floors, selectedProjectId, towerFilter])

  // Función auxiliar para extraer número del departamento para ordenamiento numérico
  const extractApartmentNumber = (aptNumber: string): number => {
    // Extraer el último número del string (ej: "A1 D-101" -> 101, "B0 D-108" -> 108)
    const match = aptNumber.match(/(\d+)(?!.*\d)/)
    return match ? parseInt(match[1], 10) : 0
  }

  // Obtener apartamentos del piso seleccionado
  const availableApartments = useMemo(() => {
    if (floorFilter === 'all') return []

    return tasks
      .filter(t => t.floor_id?.toString() === floorFilter)
      .map(t => ({
        id: t.apartment_id,
        number: formatApartmentNumber(t.apartment_code, t.apartment_number || ''),
        code: t.apartment_code,
        num: t.apartment_number
      }))
      .filter((apt, index, self) =>
        index === self.findIndex(a => a.id === apt.id)
      )
      .sort((a, b) => {
        const numA = extractApartmentNumber(a.number || '')
        const numB = extractApartmentNumber(b.number || '')
        return numA - numB
      })
  }, [tasks, floorFilter])

  // Obtener trabajadores del proyecto seleccionado (con contratos activos)
  const availableWorkers = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === 'all') {
      return users
    }

    // Si está cargando, retornar array vacío para evitar mostrar trabajadores viejos
    if (loadingWorkers) {
      return []
    }

    // Usar trabajadores cargados con contratos activos
    return projectWorkers
  }, [projectWorkers, users, selectedProjectId, loadingWorkers])

  // Filtrar tareas
  const filteredTasks = tasks.filter(task => {
    const fullApartmentNumber = formatApartmentNumber(task.apartment_code, task.apartment_number || '')
    const matchesSearch = task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullApartmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.apartment_code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (task.apartment_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (task.project_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      // Búsqueda por torre (número)
      (task.tower_number?.toString() || '').includes(searchTerm.toLowerCase()) ||
      // Búsqueda por piso (número)
      (task.floor_number?.toString() || '').includes(searchTerm.toLowerCase())

    const matchesProject = !selectedProjectId || selectedProjectId === 'all' ||
      task.project_id?.toString() === selectedProjectId

    const matchesTower = towerFilter === 'all' ||
      task.tower_id?.toString() === towerFilter

    const matchesFloor = floorFilter === 'all' || task.floor_id?.toString() === floorFilter

    const matchesApartment = apartmentFilter === 'all' || task.apartment_id?.toString() === apartmentFilter

    const matchesWorker = workerFilter === 'all' ||
      task.workers.some(w => w.id.toString() === workerFilter)

    const matchesStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'delayed'
        ? (task.is_delayed === true || (task.end_date && new Date(task.end_date) < new Date(new Date().setHours(0, 0, 0, 0)) && task.status !== 'completed' && task.status !== 'cancelled' && task.status !== 'blocked'))
        : task.status === statusFilter.replace('-', '_')

    // Filter by Date
    let matchesDate = true
    if (dateFilterType !== 'all') {
      const taskDate = task.start_date ? new Date(task.start_date) : null

      if (!task.start_date) {
        matchesDate = false
      } else {
        // Ajustar zona horaria local para comparación de strings YYYY-MM-DD
        // task.start_date viene como ISO string
        const taksDateString = task.start_date.split('T')[0] // YYYY-MM-DD

        if (dateFilterType === 'specific') {
          matchesDate = taksDateString === dateStart
        } else if (dateFilterType === 'range') {
          matchesDate = (!dateStart || taksDateString >= dateStart) &&
            (!dateEnd || taksDateString <= dateEnd)
        } else if (dateFilterType === 'month') {
          // dateStart is YYYY-MM
          matchesDate = taksDateString.startsWith(dateStart)
        } else if (dateFilterType === 'year') {
          // dateStart is YYYY
          matchesDate = taksDateString.startsWith(dateStart)
        }
      }
    }

    return matchesSearch && matchesProject && matchesTower && matchesFloor && matchesApartment && matchesWorker && matchesStatus && matchesDate
  })

  // Filtrar apartamentos para mostrar en la jerarquía (incluso vacíos)
  const filteredApartments = useMemo(() => {
    // 1. Filtrar por estructura (Proyecto, Torre, Piso, ID Apartamento)
    let result = apartments.filter(apt => {
      // Verificar estructura (usando la jerarquía anidada en apt.floors)
      const floor = apt.floors
      if (!floor) return false

      const project = floor.projects
      const tower = floor.towers // Ahora existe gracias al cambio en useTasksV2

      if (!project || !tower) return false

      const projectId = project.id.toString()
      const towerId = tower.id.toString()
      const floorId = floor.id.toString()
      const apartmentId = apt.id.toString()

      const matchesProject = !selectedProjectId || selectedProjectId === 'all' || projectId === selectedProjectId
      const matchesTower = towerFilter === 'all' || towerId === towerFilter
      const matchesFloor = floorFilter === 'all' || floorId === floorFilter
      const matchesApartment = apartmentFilter === 'all' || apartmentId === apartmentFilter

      return matchesProject && matchesTower && matchesFloor && matchesApartment
    })

    // 2. Si hay búsqueda, filtrar adicionalmente
    if (searchTerm) {
      // Queremos mostrar el apartamento SI:
      // a) Su código/número coincide con la búsqueda
      // b) Contiene alguna tarea visible (filteredTasks)
      // NOTA: Si filtramos por STATUS o WORKER (que afectan a tasks), 
      // solo deberíamos mostrar apartamentos VACIOS si NO hay filtros de tarea activos?
      // El usuario pidió "ver todos los departamentos", asumimos prioridad estructural.
      // Pero con search es distinto.

      const visibleTaskAptIds = new Set(filteredTasks.map(t => t.apartment_id))

      result = result.filter(apt => {
        const fullNumber = formatApartmentNumber(apt.apartment_code, apt.apartment_number).toLowerCase()
        const code = (apt.apartment_code || '').toLowerCase()
        const num = (apt.apartment_number || '').toLowerCase()
        const term = searchTerm.toLowerCase()

        const matchesName = fullNumber.includes(term) || code.includes(term) || num.includes(term)
        const hasVisibleTask = visibleTaskAptIds.has(apt.id)

        return matchesName || hasVisibleTask
      })
    } else {
      // Sin búsqueda:
      // Si hay filtros de tarea específicos (Worker, Status), ¿ocultamos apartamentos vacíos?
      // El usuario quiere ver "incluso los que no tienen tareas".
      // Entonces, si filtro por "Pendientes", ¿veo un depto sin tareas? 
      // Técnicamente no tiene tareas pendientes.
      // Pero si el usuario dice "ver todos los deptos", probablemente quiere ver la estructura completa 
      // para, por ejemplo, agregar una tarea a un depto vacío.
      // Mantendremos la visualización estructural por defecto.

      // Pero si filtro por WORKER?
      // Si busco "Juan", ¿quiero ver el Depto 101 que no tiene a Juan?
      // Probablemente NO.
      // Si hay filtros de TAREA activos (Worker, Status), tal vez deberíamos restringir a los que tienen tareas match.

      const hasTaskFilters = workerFilter !== 'all' || statusFilter !== 'all' || dateFilterType !== 'all'

      if (hasTaskFilters) {
        const visibleTaskAptIds = new Set(filteredTasks.map(t => t.apartment_id))
        result = result.filter(apt => visibleTaskAptIds.has(apt.id))
      }
    }

    return result
  }, [apartments, selectedProjectId, towerFilter, floorFilter, apartmentFilter, searchTerm, filteredTasks, workerFilter, statusFilter, dateFilterType])

  // Calculate delayed count client-side to match the dynamic filter logic
  const derivedDelayedCount = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return tasks.filter(task => {
      // Logic must match exactly the filter logic above and dashboard logic
      const isOverdue = task.end_date && new Date(task.end_date) < today &&
        task.status !== 'completed' &&
        task.status !== 'finished' &&
        task.status !== 'cancelled' &&
        task.status !== 'blocked'

      return task.is_delayed === true || isOverdue
    }).length
  }, [tasks])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tareas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-4 rounded-md bg-white shadow-md">
          <p className="text-red-600 font-semibold">Error al cargar tareas:</p>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    )
  }



  return (
    <div className="w-full px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-600/20">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Tareas</h1>
            <p className="text-gray-500">Sistema avanzado de tareas con múltiples trabajadores</p>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
        {/* Título eliminado */}
        {activeTab === 'active' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Tarea
            </Button>
            <Button
              onClick={() => setShowTemplatesModal(true)}
              variant="outline"
              className="flex items-center justify-center"
            >
              <FileText className="w-5 h-5 mr-2" />
              Plantillas
            </Button>
          </div>
        )}
      </div>

      {/* Filtros - Mostrar en tab activo y recientes */}
      {(activeTab === 'active' || activeTab === 'recent') && (
        <div className="mb-6 flex flex-col xl:flex-row gap-4 justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            {/* Búsqueda */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, apartamento..."
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
              {(activeTab === 'recent' && recentTasksProjectFilter && recentTasksProjectFilter !== 'all') ||
                (activeTab !== 'recent' && ((selectedProjectId !== 'all' && selectedProjectId) || workerFilter !== 'all' || towerFilter !== 'all' || floorFilter !== 'all' || apartmentFilter !== 'all' || statusFilter !== 'all' || dateFilterType !== 'all')) ? (
                <span className="ml-1 bg-blue-500/20 text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-500/30">
                  !
                </span>
              ) : null}
            </Button>

            {((activeTab === 'recent' && recentTasksProjectFilter && recentTasksProjectFilter !== 'all') ||
              (activeTab !== 'recent' && ((selectedProjectId !== 'all' && selectedProjectId) || workerFilter !== 'all' || towerFilter !== 'all' || floorFilter !== 'all' || apartmentFilter !== 'all' || statusFilter !== 'all' || dateFilterType !== 'all'))) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (activeTab === 'recent') {
                      setRecentTasksProjectFilter(null)
                    } else {
                      setSelectedProjectId(null)
                      setWorkerFilter('all')
                      setTowerFilter('all')
                      setFloorFilter('all')
                      setApartmentFilter('all')

                      setStatusFilter('all')
                      setDateFilterType('all')
                      setDateStart('')
                      setDateEnd('')
                    }
                  }}
                  className="text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Limpiar filtros"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              )}


          </div>
        </div>
      )}

      <TaskFiltersSidebar
        isOpen={isFilterSidebarOpen}
        onClose={() => setIsFilterSidebarOpen(false)}
        currentProjectFilter={activeTab === 'recent' ? (recentTasksProjectFilter || 'all') : (selectedProjectId || 'all')}
        onProjectFilterChange={(val) => {
          if (activeTab === 'recent') {
            setRecentTasksProjectFilter(val === 'all' ? null : val)
          } else {
            setSelectedProjectId(val === 'all' ? null : val)
            setTowerFilter('all')
            setFloorFilter('all')
            setApartmentFilter('all')
            setWorkerFilter('all')
          }
        }}
        currentWorkerFilter={workerFilter}
        onWorkerFilterChange={setWorkerFilter}
        currentTowerFilter={towerFilter}
        onTowerFilterChange={(val) => {
          setTowerFilter(val)
          setFloorFilter('all')
          setApartmentFilter('all')
        }}
        currentFloorFilter={floorFilter}
        onFloorFilterChange={(val) => {
          setFloorFilter(val)
          setApartmentFilter('all')
        }}
        currentApartmentFilter={apartmentFilter}
        onApartmentFilterChange={setApartmentFilter}

        projects={projects}
        workers={availableWorkers}
        towers={availableTowers}
        floors={availableFloors}
        apartments={availableApartments}

        dateFilterType={dateFilterType}
        onDateFilterTypeChange={setDateFilterType}
        dateStart={dateStart}
        onDateStartChange={setDateStart}
        dateEnd={dateEnd}
        onDateEndChange={setDateEnd}

        showOnlyProject={activeTab === 'recent'}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('active')
              const savedFilters = JSON.parse(localStorage.getItem('tareas-filters') || '{}')
              localStorage.setItem('tareas-filters', JSON.stringify({ ...savedFilters, activeTab: 'active' }))
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'active'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <CheckSquare className="w-4 h-4" />
            Tareas Activas
          </button>

          <button
            onClick={() => {
              setActiveTab('recent')
              // No persistimos 'recent' en localStorage para volver siempre a 'active' por defecto, o sí? Dejémoslo sin persistir por ahora o igual que los otros.
              const savedFilters = JSON.parse(localStorage.getItem('tareas-filters') || '{}')
              localStorage.setItem('tareas-filters', JSON.stringify({ ...savedFilters, activeTab: 'recent' }))
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'recent'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Clock className="w-4 h-4" />
            Últimas Creadas
          </button>

          <button
            onClick={() => {
              setActiveTab('trash')
              const savedFilters = JSON.parse(localStorage.getItem('tareas-filters') || '{}')
              localStorage.setItem('tareas-filters', JSON.stringify({ ...savedFilters, activeTab: 'trash' }))
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'trash'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Trash2 className="w-4 h-4" />
            Papelera ({activeTab === 'trash' ? deletedTasks.length : deletedTasksCount})
          </button>
        </nav>
      </div>

      {/* Contenido según tab activo */}
      {activeTab === 'active' ? (
        <>
          {/* Tarjetas de estado (filtros rápidos clickeables) */}
          <StatusFilterCards
            selectedValue={statusFilter}
            onSelect={(value) => setStatusFilter(value as typeof statusFilter)}
            scrollTargetId="tasks-list"
            defaultOption={{
              value: 'all',
              label: 'Todas',
              icon: Layers,
              count: taskStats.total,
              activeColor: 'blue-400',
              activeBg: 'blue-900/30',
              activeBorder: 'blue-500'
            }}
            options={[
              {
                value: 'pending',
                label: 'Pendientes',
                icon: Clock,
                count: taskStats.pending,
                activeColor: 'yellow-400',
                activeBg: 'yellow-900/30',
                activeBorder: 'yellow-500'
              },
              {
                value: 'in_progress',
                label: 'En Progreso',
                icon: Play,
                count: taskStats.inProgress,
                activeColor: 'blue-400',
                activeBg: 'blue-900/30',
                activeBorder: 'blue-500'
              },
              {
                value: 'completed',
                label: 'Completadas',
                icon: CheckCircle,
                count: taskStats.completed,
                activeColor: 'emerald-400',
                activeBg: 'emerald-900/30',
                activeBorder: 'emerald-500'
              },
              {
                value: 'delayed',
                label: 'Atrasadas',
                icon: AlertCircle,
                count: derivedDelayedCount,
                activeColor: 'orange-400',
                activeBg: 'orange-900/30',
                activeBorder: 'orange-500'
              }
            ]}
          />

          {/* Jerarquía de tareas */}
          <div id="tasks-list">
            <TaskHierarchyV2
              tasks={filteredTasks}
              apartments={filteredApartments}
              floors={floors}
              onTaskUpdate={async () => {
                if (refreshTasks) {
                  refreshTasks()
                }
                if (refreshStats) {
                  const projectId = selectedProjectId && selectedProjectId !== 'all' ? Number(selectedProjectId) : undefined
                  refreshStats(projectId)
                }
                // Actualizar conteo de tareas eliminadas
                await handleTaskDeleted()
              }}
              onAddTask={handleAddTask}
              onAddMassTask={handleMassAddTask}
              areFiltersActive={
                (selectedProjectId !== 'all' && selectedProjectId !== null) ||
                workerFilter !== 'all' ||
                towerFilter !== 'all' ||
                floorFilter !== 'all' ||
                apartmentFilter !== 'all' ||
                statusFilter !== 'all' ||
                dateFilterType !== 'all' ||
                searchTerm !== ''
              }
            />
          </div>
        </>
      ) : activeTab === 'recent' ? (
        <RecentTasksList
          tasks={tasks}
          onTaskSelect={(taskId) => {
            const task = tasks.find(t => t.id === taskId)
            if (task) {
              setSelectedTaskForDetail(task)
            }
          }}
          onGoToLocation={(task) => {
            // 1. Set filters based on task location
            if (task.project_id) setSelectedProjectId(task.project_id.toString())
            if (task.tower_id) setTowerFilter(task.tower_id.toString())
            if (task.floor_id) setFloorFilter(task.floor_id.toString())
            if (task.apartment_id) setApartmentFilter(task.apartment_id.toString())

            // 2. Switch to 'active' tab
            setActiveTab('active')

            // 3. Clear searching to ensure specific location is visible
            setSearchTerm('')
          }}
          selectedProjectId={recentTasksProjectFilter && recentTasksProjectFilter !== 'all' ? Number(recentTasksProjectFilter) : undefined}
        />
      ) : (
        <DeletedTasksList
          deletedTasks={deletedTasks}
          loading={loadingDeleted}
          onRestore={handleRestoreTask}
          onHardDelete={async (taskId) => {
            await hardDeleteTask(taskId)
            await loadDeletedTasks() // Recargar lista
            await loadDeletedTasksCount() // Actualizar conteo
          }}
          onEmptyTrash={async () => {
            await emptyTrash()
            await loadDeletedTasks()
            await loadDeletedTasksCount()
          }}
          onRefresh={loadDeletedTasks}
        />
      )}

      {/* Modal de Crear Tarea */}
      <TaskFormModalV2
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setInitialTaskData(null)
        }}
        mode="create"
        initialProjectId={initialTaskData?.projectId}
        initialTowerId={initialTaskData?.towerId}
        initialFloorId={initialTaskData?.floorId}
        initialApartmentId={initialTaskData?.apartmentId}
        isMassCreate={false}
        onSuccess={() => {
          if (refreshTasks) {
            refreshTasks()
          }
          if (refreshStats) {
            const projectId = selectedProjectId && selectedProjectId !== 'all' ? Number(selectedProjectId) : undefined
            refreshStats(projectId)
          }
        }}
      />

      {massCreateData && (
        <AddTasksToFloorsModal
          isOpen={showMassCreateModal}
          onClose={() => {
            setShowMassCreateModal(false)
            setMassCreateData(null)
          }}
          projectId={massCreateData.projectId}
          towerId={massCreateData.towerId}
          onSuccess={handleMassCreateSuccess}
        />
      )}

      {/* Modal de Gestión de Plantillas */}
      <TaskTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        projectId={templatesProjectId}
      />

      {/* Modal de Tareas Recientes REMOVED */}

      {/* Modal de Detalle de Tarea (para navegación desde recientes) */}
      {selectedTaskForDetail && (
        <TaskDetailModalV2
          isOpen={true}
          task={selectedTaskForDetail}
          onClose={() => setSelectedTaskForDetail(null)}
          onEdit={() => {
            setSelectedTaskForDetail(null)
          }}
        />
      )}
    </div>
  )
}
