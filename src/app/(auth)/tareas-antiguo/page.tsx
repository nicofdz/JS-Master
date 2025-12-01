'use client'

import { useState, useEffect } from 'react'
import { useTasks } from '@/hooks'
import { useProjectFilter } from '@/hooks/useProjectFilter'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskInfo } from '@/components/tasks/TaskInfo'
import { Plus, Search, Filter, Edit, Trash2, Clock, User, AlertCircle, CheckCircle, XCircle, Building2, ListTodo, Play, Lock, Home, Layers } from 'lucide-react'
import { StatusFilterCards } from '@/components/common/StatusFilterCards'
import { formatDate, getStatusColor, getStatusEmoji } from '@/lib/utils'
import { ACTIVITY_STATUSES } from '@/lib/constants'
import toast from 'react-hot-toast'

export default function TareasPage() {
  const { tasks, apartments, users, projects, floors, loading, error, taskStats, refreshStats, createTask, updateTask, deleteTask, updateApartmentStatusFromTasks, getAvailableWorkersForProject } = useTasks()
  const { selectedProjectId, setSelectedProjectId } = useProjectFilter()
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [floorFilter, setFloorFilter] = useState<string>('all')
  const [apartmentFilter, setApartmentFilter] = useState<string>('all')
  const [workerFilter, setWorkerFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'blocked' | 'delayed'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedTaskData, setSelectedTaskData] = useState<any>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [selectedTaskForInfo, setSelectedTaskForInfo] = useState<any>(null)

  // Debug inicial
  console.log('🔍 Debug inicial:', {
    tasks: tasks.map(t => ({ id: t.id, name: t.task_name, project: t.project_name, apartment: t.apartment_number, floor: t.floor_number })),
    projects: projects.map(p => ({ id: p.id, name: p.name })),
    floors: floors.map(f => ({ id: f.id, number: f.floor_number, project: f.projects?.name })),
    selectedProjectId,
    floorFilter
  })

  // Actualizar estadísticas cuando cambie el filtro de proyecto
  useEffect(() => {
    if (refreshStats) {
      const projectId = selectedProjectId !== 'all' ? Number(selectedProjectId) : undefined
      refreshStats(projectId)
    }
  }, [selectedProjectId, refreshStats])

  // Resetear filtro de piso cuando cambie el proyecto
  useEffect(() => {
    setFloorFilter('all')
    setApartmentFilter('all')
  }, [selectedProjectId])

  // Resetear filtro de apartamento cuando cambie el piso
  useEffect(() => {
    setApartmentFilter('all')
  }, [floorFilter])

  // Filtrar tareas por piso
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.task_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
    // Filtro por estado (usando el filtro de tarjetas)
    let matchesStatus = true
    if (statusFilter === 'all') {
      matchesStatus = true
    } else if (statusFilter === 'delayed') {
      matchesStatus = task.is_delayed === true
    } else {
      matchesStatus = task.status === statusFilter
    }
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
    
    // Filtro por proyecto
    const selectedProject = projects.find(p => p.id.toString() === selectedProjectId?.toString())
    const selectedProjectName = selectedProject?.name
    const matchesProject = selectedProjectId === null || selectedProjectId === 'all' || task.project_name === selectedProjectName
    
    // Filtro por piso
    const selectedFloor = floors.find(f => f.id.toString() === floorFilter)
    const selectedFloorNumber = selectedFloor?.floor_number
    const matchesFloor = floorFilter === 'all' || task.floor_number === selectedFloorNumber
    
    // Filtro por apartamento
    const selectedApartment = apartments.find(a => a.id.toString() === apartmentFilter)
    const matchesApartment = apartmentFilter === 'all' || task.apartment_id?.toString() === apartmentFilter
    
    // matchesDelayed ya está incluido en matchesStatus cuando statusFilter === 'delayed'
    
    // Filtro por trabajador
    const selectedWorker = users.find(u => u.id.toString() === workerFilter)
    const matchesWorker = workerFilter === 'all' || task.assigned_to?.toString() === workerFilter
    
    console.log('🔍 Filtrando tarea:', {
      taskName: task.task_name,
      taskProject: task.project_name,
      taskFloor: task.floor_number,
      taskWorker: task.assigned_user_name,
      taskAssignedTo: task.assigned_to,
      selectedProjectId,
      selectedProjectName,
      floorFilter,
      selectedFloorNumber,
      workerFilter,
      selectedWorker: selectedWorker?.full_name,
      matchesProject,
      matchesFloor,
      matchesWorker,
      isDelayed: task.is_delayed,
      statusFilter
    })
    
    return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesFloor && matchesApartment && matchesWorker
  })

  // Filtrar pisos por proyecto seleccionado
  const availableFloors = floors.filter(floor => 
    !selectedProjectId || selectedProjectId === 'all' || floor.project_id.toString() === selectedProjectId?.toString()
  )

  // Filtrar apartamentos por piso seleccionado
  const availableApartments = apartments.filter(apartment => 
    floorFilter === 'all' || apartment.floor_id?.toString() === floorFilter
  )

  // Contar tareas por estado (se calculan más abajo basadas en filteredTasks)

  const handleDelete = async (taskId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer.')) {
      return
    }
    try {
      // Encontrar el apartamento de la tarea antes de eliminarla
      const task = tasks.find(t => t.id === taskId)
      const apartmentId = task?.apartment_id
      
      await deleteTask(taskId)
      toast.success('Tarea eliminada exitosamente')
      
      // Actualizar el estado del apartamento después de eliminar la tarea
      if (apartmentId) {
        await updateApartmentStatusFromTasks(apartmentId)
      }
      
      // Refrescar estadísticas después de eliminar
      if (refreshStats) {
        const projectId = selectedProjectId !== 'all' ? Number(selectedProjectId) : undefined
        refreshStats(projectId)
      }
    } catch (err: any) {
      toast.error(`Error al eliminar tarea: ${err.message || 'Error desconocido'}`)
    }
  }

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await updateTask(taskId, { status: newStatus })
      
      // Encontrar el apartamento de la tarea para actualizar su estado
      const task = tasks.find(t => t.id === taskId)
      if (task && task.apartment_id) {
        // Actualizar el estado del apartamento basado en sus tareas
        await updateApartmentStatusFromTasks(task.apartment_id)
      }
      
      // Refrescar estadísticas después de cambiar estado
      if (refreshStats) {
        const projectId = selectedProjectId !== 'all' ? Number(selectedProjectId) : undefined
        refreshStats(projectId)
      }
    } catch (err: any) {
      throw new Error(err.message || 'Error al actualizar estado de la tarea')
    }
  }

  const handleCreateTask = async (data: any) => {
    try {
      await createTask(data)
      setShowCreateModal(false)
      setFormError(null)
      
      // Actualizar el estado del apartamento si se especificó
      if (data.apartment_id) {
        await updateApartmentStatusFromTasks(data.apartment_id)
      }
      
      // Refrescar estadísticas después de crear
      if (refreshStats) {
        const projectId = selectedProjectId !== 'all' ? Number(selectedProjectId) : undefined
        refreshStats(projectId)
      }
    } catch (err: any) {
      setFormError(err.message || 'Error desconocido al crear tarea.')
    }
  }

  const handleUpdateTask = async (data: any) => {
    if (!editingTask) return
    try {
      await updateTask(editingTask.id, data)
      setEditingTask(null)
      setFormError(null)
      // Refrescar estadísticas después de actualizar
      if (refreshStats) {
        const projectId = selectedProjectId !== 'all' ? Number(selectedProjectId) : undefined
        refreshStats(projectId)
      }
    } catch (err: any) {
      setFormError(err.message || 'Error desconocido al actualizar tarea.')
    }
  }


  const handleOpenInfo = (task: any) => {
    setSelectedTaskForInfo(task)
    setShowInfoModal(true)
  }





  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-3 h-3" />
      case 'high': return <AlertCircle className="w-3 h-3" />
      case 'medium': return <Clock className="w-3 h-3" />
      case 'low': return <CheckCircle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-600" />
      case 'blocked': return <XCircle className="w-4 h-4 text-red-600" />
      default: return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

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

  // Usar las estadísticas de la base de datos
  const totalTasks = taskStats.total
  const pendingTasks = taskStats.pending
  const inProgressTasks = taskStats.inProgress
  const completedTasks = taskStats.completed
  const blockedTasks = taskStats.blocked

  // Debug: Log para verificar los datos
  console.log('🔍 Debug Tareas:', {
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    blockedTasks,
    filteredTasksLength: filteredTasks.length,
    tasksLength: tasks.length
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Gestión de Tareas</h1>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Listado de Tareas</h2>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Nueva Tarea
        </Button>
      </div>

      {/* Filtros y Búsqueda */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros y Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, descripción o apartamento..."
                className="pl-9 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className="pl-9 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white text-gray-900"
                value={selectedProjectId || 'all'}
                onChange={(e) => setSelectedProjectId(e.target.value === 'all' ? null : e.target.value)}
              >
                <option value="all">Todos los proyectos</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id.toString()}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className="pl-9 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">Todas las prioridades</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className="pl-9 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                disabled={!selectedProjectId || selectedProjectId === 'all'}
              >
                <option value="all">
                  {!selectedProjectId || selectedProjectId === 'all' 
                    ? 'Selecciona un proyecto primero' 
                    : 'Todos los pisos'
                  }
                </option>
                {availableFloors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    Piso {floor.floor_number}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className="pl-9 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                value={apartmentFilter}
                onChange={(e) => setApartmentFilter(e.target.value)}
                disabled={floorFilter === 'all'}
              >
                <option value="all">
                  {floorFilter === 'all'
                    ? 'Selecciona un piso primero' 
                    : 'Todos los apartamentos'
                  }
                </option>
                {availableApartments.map((apartment) => (
                  <option key={apartment.id} value={apartment.id}>
                    Depto {apartment.apartment_number}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className="pl-9 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white text-gray-900"
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
              >
                <option value="all">Todos los trabajadores</option>
                {users.map(worker => (
                  <option key={worker.id} value={worker.id.toString()}>
                    {worker.full_name} - {worker.contract_type === 'por_dia' ? 'Al día' : 'A trato'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas rápidas */}
      <StatusFilterCards
        selectedValue={statusFilter}
        onSelect={(value) => setStatusFilter(value as 'all' | 'pending' | 'in-progress' | 'completed' | 'blocked' | 'delayed')}
        defaultOption={{
          value: 'all',
          label: 'Todos',
          icon: Layers,
          count: totalTasks,
          activeColor: 'blue-400',
          activeBg: 'blue-900/30',
          activeBorder: 'blue-500'
        }}
        options={[
          {
            value: 'pending',
            label: 'Pendientes',
            icon: Clock,
            count: pendingTasks,
            activeColor: 'yellow-400',
            activeBg: 'yellow-900/30',
            activeBorder: 'yellow-500'
          },
          {
            value: 'in-progress',
            label: 'En Progreso',
            icon: Play,
            count: inProgressTasks,
            activeColor: 'blue-400',
            activeBg: 'blue-900/30',
            activeBorder: 'blue-500'
          },
          {
            value: 'completed',
            label: 'Completadas',
            icon: CheckCircle,
            count: completedTasks,
            activeColor: 'emerald-400',
            activeBg: 'emerald-900/30',
            activeBorder: 'emerald-500'
          },
          {
            value: 'blocked',
            label: 'Bloqueadas',
            icon: Lock,
            count: blockedTasks,
            activeColor: 'red-400',
            activeBg: 'red-900/30',
            activeBorder: 'red-500'
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

      {/* Lista de Tareas */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron tareas</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || priorityFilter !== 'all' || floorFilter !== 'all' || apartmentFilter !== 'all' || workerFilter !== 'all' || statusFilter !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza creando tu primera tarea'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onEdit={setEditingTask}
              onDelete={handleDelete}
              onInfo={handleOpenInfo}
            />
          ))}
        </div>
      )}

      {/* Modal de Creación */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setFormError(null)
        }}
        title="Crear Nueva Tarea"
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
        <TaskForm
          apartments={apartments}
          users={users}
          projects={projects}
          floors={floors}
          onSubmit={handleCreateTask}
          onCancel={() => {
            setShowCreateModal(false)
            setFormError(null)
          }}
          getAvailableWorkersForProject={getAvailableWorkersForProject}
        />
        
        {/* Debug de datos que llegan al TaskForm */}
        {(() => {
          console.log('🔍 Datos para TaskForm:', {
            apartments: apartments.map(a => ({ id: a.id, number: a.apartment_number, floor_id: a.floor_id })),
            floors: floors.map(f => ({ id: f.id, number: f.floor_number, project_id: f.project_id })),
            projects: projects.map(p => ({ id: p.id, name: p.name }))
          })
          return null
        })()}
      </Modal>

      {/* Modal de Edición */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Editar Tarea"
        size="md"
      >
        {editingTask && (
          <TaskForm
            task={editingTask}
            apartments={apartments}
            users={users}
            projects={projects}
            floors={floors}
            onSubmit={handleUpdateTask}
            onCancel={() => setEditingTask(null)}
            getAvailableWorkersForProject={getAvailableWorkersForProject}
          />
        )}
      </Modal>


      {/* Modal de Información */}
      {showInfoModal && selectedTaskForInfo && (
        <TaskInfo
          task={selectedTaskForInfo}
          isOpen={showInfoModal}
          onClose={() => {
            setShowInfoModal(false)
            setSelectedTaskForInfo(null)
          }}
        />
      )}



    </div>
  )
}

