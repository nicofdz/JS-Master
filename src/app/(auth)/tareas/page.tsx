'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus, Search, Building2, User } from 'lucide-react'
import { StatusFilterCards } from '@/components/common/StatusFilterCards'
import { TaskHierarchyV2 } from '@/components/tasks-v2/TaskHierarchyV2'
import { TaskFormModalV2 } from '@/components/tasks-v2/TaskFormModalV2'
import { DeletedTasksList } from '@/components/tasks-v2/DeletedTasksList'
import { TaskTemplatesModal } from '@/components/tasks-v2/TaskTemplatesModal'
import { Clock, Play, CheckCircle, Lock, AlertCircle, Layers, Trash2, CheckSquare, FileText, Filter, XCircle } from 'lucide-react'
import { TaskFiltersSidebar } from '@/components/tasks-v2/TaskFiltersSidebar'
import { useTasksV2 } from '@/hooks'
import { useProjectFilter } from '@/hooks/useProjectFilter'
import { formatApartmentNumber } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function TareasPage() {
  const {
    tasks,
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
    hardDeleteTask
  } = useTasksV2()

  const { selectedProjectId, setSelectedProjectId } = useProjectFilter()

  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [workerFilter, setWorkerFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled' | 'on_hold' | 'delayed'>('all')
  const [towerFilter, setTowerFilter] = useState<string>('all')
  const [floorFilter, setFloorFilter] = useState<string>('all')
  const [apartmentFilter, setApartmentFilter] = useState<string>('all')
  const [projectWorkers, setProjectWorkers] = useState<any[]>([])
  const [loadingWorkers, setLoadingWorkers] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [deletedTasks, setDeletedTasks] = useState<any[]>([])
  const [loadingDeleted, setLoadingDeleted] = useState(false)
  const [deletedTasksCount, setDeletedTasksCount] = useState(0)
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false)
  const [initialTaskData, setInitialTaskData] = useState<{ projectId: number; towerId: number; floorId: number; apartmentId: number } | null>(null)
  const [massCreateData, setMassCreateData] = useState<{ projectId: number; towerId: number } | null>(null)

  // Cargar conteo de tareas eliminadas al iniciar
  useEffect(() => {
    loadDeletedTasksCount()
  }, [])

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

  const handleAddTask = (projectId: number, towerId: number, floorId: number, apartmentId: number) => {
    setInitialTaskData({ projectId, towerId, floorId, apartmentId })
    setShowCreateModal(true)
  }

  const handleMassAddTask = (projectId: number, towerId: number) => {
    setMassCreateData({ projectId, towerId })
    setShowCreateModal(true)
  }

  // Cargar filtros desde localStorage al iniciar
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem('tareas-filters')
      if (savedFilters) {
        const filters = JSON.parse(savedFilters)
        if (filters.selectedProjectId) setSelectedProjectId(filters.selectedProjectId)
        if (filters.workerFilter) setWorkerFilter(filters.workerFilter)
        if (filters.statusFilter) setStatusFilter(filters.statusFilter)
        if (filters.towerFilter) setTowerFilter(filters.towerFilter)
        if (filters.floorFilter) setFloorFilter(filters.floorFilter)
        if (filters.apartmentFilter) setApartmentFilter(filters.apartmentFilter)
        if (filters.searchTerm) setSearchTerm(filters.searchTerm)
        if (filters.activeTab) setActiveTab(filters.activeTab)
      }
    } catch (error) {
      console.error('Error loading filters from localStorage:', error)
    }
  }, []) // Solo al montar el componente

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
        searchTerm
      }
      localStorage.setItem('tareas-filters', JSON.stringify(filters))
    } catch (error) {
      console.error('Error saving filters to localStorage:', error)
    }
  }, [selectedProjectId, workerFilter, statusFilter, towerFilter, floorFilter, apartmentFilter, searchTerm])

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

  // Reset cascada de filtros
  useEffect(() => {
    setTowerFilter('all')
    setFloorFilter('all')
    setApartmentFilter('all')
    setWorkerFilter('all')
  }, [selectedProjectId])

  useEffect(() => {
    setFloorFilter('all')
    setApartmentFilter('all')
  }, [towerFilter])

  useEffect(() => {
    setApartmentFilter('all')
  }, [floorFilter])

  // Obtener torres únicas del proyecto seleccionado (desde las tareas que ya tienen tower_id y tower_number)
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
        ? task.is_delayed === true
        : task.status === statusFilter.replace('-', '_')

    return matchesSearch && matchesProject && matchesTower && matchesFloor && matchesApartment && matchesWorker && matchesStatus
  })

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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Tareas</h1>
        <p className="text-gray-600">Sistema avanzado de tareas con múltiples trabajadores</p>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Listado de Tareas</h2>
        {activeTab === 'active' && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Tarea
            </Button>
            <Button
              onClick={() => setShowTemplatesModal(true)}
              variant="outline"
              className="flex items-center"
            >
              <FileText className="w-5 h-5 mr-2" />
              Plantillas de Tareas
            </Button>
          </div>
        )}
      </div>

      {/* Filtros - Solo mostrar en tab activo */}
      {activeTab === 'active' && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
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
              {(selectedProjectId !== 'all' && selectedProjectId) || workerFilter !== 'all' || towerFilter !== 'all' || floorFilter !== 'all' || apartmentFilter !== 'all' || statusFilter !== 'all' ? (
                <span className="ml-1 bg-blue-500/20 text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-500/30">
                  !
                </span>
              ) : null}
            </Button>

            {((selectedProjectId !== 'all' && selectedProjectId) || workerFilter !== 'all' || towerFilter !== 'all' || floorFilter !== 'all' || apartmentFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedProjectId(null)
                  setWorkerFilter('all')
                  setTowerFilter('all')
                  setFloorFilter('all')
                  setApartmentFilter('all')
                  setStatusFilter('all')
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
        currentProjectFilter={selectedProjectId || 'all'}
        onProjectFilterChange={(val) => setSelectedProjectId(val === 'all' ? null : val)}
        currentWorkerFilter={workerFilter}
        onWorkerFilterChange={setWorkerFilter}
        currentTowerFilter={towerFilter}
        onTowerFilterChange={setTowerFilter}
        currentFloorFilter={floorFilter}
        onFloorFilterChange={setFloorFilter}
        currentApartmentFilter={apartmentFilter}
        onApartmentFilterChange={setApartmentFilter}

        projects={projects}
        workers={availableWorkers}
        towers={availableTowers}
        floors={availableFloors}
        apartments={availableApartments}

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
                count: taskStats.delayed,
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
            />
          </div>
        </>
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
          onRefresh={loadDeletedTasks}
        />
      )}

      {/* Modal de Crear Tarea */}
      <TaskFormModalV2
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setInitialTaskData(null)
          setMassCreateData(null)
        }}
        mode="create"
        initialProjectId={initialTaskData?.projectId || massCreateData?.projectId}
        initialTowerId={initialTaskData?.towerId || massCreateData?.towerId}
        initialFloorId={initialTaskData?.floorId}
        initialApartmentId={initialTaskData?.apartmentId}
        isMassCreate={!!massCreateData}
        massCreateData={massCreateData || undefined}
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

      {/* Modal de Gestión de Plantillas */}
      <TaskTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
      />
    </div>
  )
}
