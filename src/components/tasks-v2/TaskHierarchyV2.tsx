'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronDown, ChevronRight, Building, Layers, Building2, Home, Plus } from 'lucide-react'
import { TaskRowV2 } from './TaskRowV2'
import { formatApartmentNumber } from '@/lib/utils'
import type { TaskV2 } from '@/hooks/useTasks_v2'

type Task = TaskV2

interface Apartment {
  id: number
  apartment_number: string
  apartment_code: string
  floors: {
    id: number
    floor_number: number
    project_id: number
    tower_id: number
    projects: {
      id: number
      name: string
      is_active?: boolean
    }
    towers: {
      id: number
      tower_number: number
      name: string
    }
  }
}

interface TaskHierarchyV2Props {
  tasks: Task[]
  apartments: Apartment[] // List of apartments to render (already filtered)
  floors: any[] // Kept for legacy compatibility if needed, but likely unused now
  onTaskUpdate?: () => void
  onAddTask?: (projectId: number, towerId: number, floorId: number, apartmentId: number | null) => void
  onAddMassTask?: (projectId: number, towerId: number) => void
}

export function TaskHierarchyV2({ tasks, apartments, floors, onTaskUpdate, onAddTask, onAddMassTask }: TaskHierarchyV2Props) {
  // Inicializar estado expandido desde localStorage (solo una vez)
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('tareas-expanded')
      if (saved) {
        const expanded = JSON.parse(saved)
        return new Set<number>(expanded.projects || [])
      }
    } catch (error) {
      console.error('Error loading expanded projects from localStorage:', error)
    }
    return new Set<number>()
  })

  const [expandedTowers, setExpandedTowers] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('tareas-expanded')
      if (saved) {
        const expanded = JSON.parse(saved)
        return new Set<number>(expanded.towers || [])
      }
    } catch (error) {
      console.error('Error loading expanded towers from localStorage:', error)
    }
    return new Set<number>()
  })

  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('tareas-expanded')
      if (saved) {
        const expanded = JSON.parse(saved)
        return new Set<number>(expanded.floors || [])
      }
    } catch (error) {
      console.error('Error loading expanded floors from localStorage:', error)
    }
    return new Set<number>()
  })

  const [expandedApartments, setExpandedApartments] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('tareas-expanded')
      if (saved) {
        const expanded = JSON.parse(saved)
        return new Set<number>(expanded.apartments || [])
      }
    } catch (error) {
      console.error('Error loading expanded apartments from localStorage:', error)
    }
    return new Set<number>()
  })

  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('tareas-expanded')
      if (saved) {
        const expanded = JSON.parse(saved)
        return new Set<number>(expanded.tasks || [])
      }
    } catch (error) {
      console.error('Error loading expanded tasks from localStorage:', error)
    }
    return new Set<number>()
  })

  // Estado para controlar visibilidad de tareas de piso separadas
  const [expandedFloorTasks, setExpandedFloorTasks] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('tareas-expanded')
      if (saved) {
        const expanded = JSON.parse(saved)
        return new Set<number>(expanded.floorTasks || [])
      }
    } catch (error) {
      console.error('Error loading expanded floor tasks from localStorage:', error)
    }
    return new Set<number>()
  })

  // Guardar estado expandido en localStorage cuando cambia
  useEffect(() => {
    try {
      const expanded = {
        projects: Array.from(expandedProjects),
        towers: Array.from(expandedTowers),
        floors: Array.from(expandedFloors),
        apartments: Array.from(expandedApartments),
        tasks: Array.from(expandedTasks),
        floorTasks: Array.from(expandedFloorTasks)
      }
      localStorage.setItem('tareas-expanded', JSON.stringify(expanded))
    } catch (error) {
      console.error('Error saving expanded state to localStorage:', error)
    }
  }, [expandedProjects, expandedTowers, expandedFloors, expandedApartments, expandedTasks, expandedFloorTasks])

  // Agrupar tareas por proyecto → torre → piso → apartamento
  const hierarchy = useMemo(() => {
    const grouped: {
      [projectId: number]: {
        project: { id: number; name: string; is_active?: boolean }
        towers: {
          [towerId: number]: {
            tower: { id: number; number: number; name: string }
            floors: {
              [floorId: number]: {
                floor_number: number
                // Tareas del piso (Áreas comunes)
                tasks: Task[]
                apartments: {
                  [apartmentId: number]: {
                    id: number
                    number: string
                    originalNumber: string
                    tasks: Task[]
                  }
                }
              }
            }
          }
        }
      }
    } = {}

    // 1. Build Structure from Apartments
    apartments.forEach(apt => {
      const floor = apt.floors
      if (!floor) return

      const project = floor.projects
      const tower = floor.towers

      const projectId = project.id
      const towerId = tower.id
      const floorId = floor.id
      const apartmentId = apt.id

      // Initialize Project
      if (!grouped[projectId]) {
        grouped[projectId] = {
          project: { id: projectId, name: project.name, is_active: project.is_active },
          towers: {}
        }
      }

      // Initialize Tower
      if (!grouped[projectId].towers[towerId]) {
        grouped[projectId].towers[towerId] = {
          tower: { id: towerId, number: tower.tower_number, name: tower.name },
          floors: {}
        }
      }

      // Initialize Floor
      if (!grouped[projectId].towers[towerId].floors[floorId]) {
        grouped[projectId].towers[towerId].floors[floorId] = {
          floor_number: floor.floor_number,
          tasks: [], // Inicializar array de tareas de piso
          apartments: {}
        }
      }

      // Initialize Apartment
      if (!grouped[projectId].towers[towerId].floors[floorId].apartments[apartmentId]) {
        grouped[projectId].towers[towerId].floors[floorId].apartments[apartmentId] = {
          id: apartmentId,
          number: formatApartmentNumber(apt.apartment_code, apt.apartment_number),
          originalNumber: apt.apartment_number || '0',
          tasks: []
        }
      }
    })

    // 2. Populate Tasks
    // Iterate over tasks and place them into the structure. 
    // IF the apartment exists in the structure (it should if 'apartments' prop is consistent), add it.
    // If not (maybe a task belongs to an apartment not in the filtered apartments list?), deciding whether to show it.
    // Logic: The 'tasks' prop is also filtered. We should show tasks that match filters.
    // If a task matches filters but its apartment was filtered out (e.g. mismatch), what happens?
    // In TareasPage we will ensure that 'apartments' list INCLUDES apartments of filtered tasks.

    tasks.forEach(task => {
      // Validar IDs
      if (!task.project_id || !task.tower_id || !task.floor_id) return

      const pId = task.project_id
      const tId = task.tower_id
      const fId = task.floor_id
      const aId = task.apartment_id

      // Asegurar que la estructura existe (especialmente para tareas de piso sin depto)
      // Nota: Si el piso no existe en 'apartments' (porque no tiene deptos), esta tarea podría quedar huérfana
      // a menos que iteremos 'floors' también. Por seguridad, verificamos existencia.

      // Initialize Project if not exists (for tasks whose apartment might not be in the initial 'apartments' list)
      if (!grouped[pId]) {
        grouped[pId] = {
          project: { id: pId, name: task.project_name || 'Desconocido', is_active: task.project_is_active },
          towers: {}
        }
      }
      // Initialize Tower if not exists
      if (!grouped[pId].towers[tId]) {
        grouped[pId].towers[tId] = {
          tower: { id: tId, number: task.tower_number || 0, name: task.tower_name || '' },
          floors: {}
        }
      }
      // Initialize Floor if not exists
      if (!grouped[pId].towers[tId].floors[fId]) {
        grouped[pId].towers[tId].floors[fId] = {
          floor_number: task.floor_number || 0,
          tasks: [], // Initialize floor tasks
          apartments: {}
        }
      }

      const projectGroup = grouped[pId]
      const towerGroup = projectGroup.towers[tId]
      const floorGroup = towerGroup.floors[fId]

      // Si tiene apartment_id, va al depto. Si no, va al piso.
      if (aId) {
        // Initialize Apartment if not exists
        if (!floorGroup.apartments[aId]) {
          floorGroup.apartments[aId] = {
            id: aId,
            number: formatApartmentNumber(task.apartment_code, task.apartment_number || ''),
            originalNumber: task.apartment_number || '0',
            tasks: []
          }
        }
        floorGroup.apartments[aId].tasks.push(task)
      } else {
        // Tarea de área común (Piso)
        floorGroup.tasks.push(task)
      }
    })

    // 3. Filter empty entities for Inactive Projects (Contextual Visibility)
    Object.keys(grouped).forEach(projectIdStr => {
      const projectId = parseInt(projectIdStr)
      const group = grouped[projectId]

      // Only apply strict filtering for inactive projects
      if (group.project.is_active === false) {
        Object.keys(group.towers).forEach(towerIdStr => {
          const towerId = parseInt(towerIdStr)
          const tower = group.towers[towerId]

          Object.keys(tower.floors).forEach(floorIdStr => {
            const floorId = parseInt(floorIdStr)
            const floor = tower.floors[floorId]

            Object.keys(floor.apartments).forEach(aptIdStr => {
              const aptId = parseInt(aptIdStr)
              const apt = floor.apartments[aptId]

              // Remove apartment if it has no tasks
              // User request: "muestre solo lo necesario" -> for deleted projects, implies having associated history (tasks)
              if (apt.tasks.length === 0) {
                delete floor.apartments[aptId]
              }
            })

            // Remove floor if it has no apartments AND no floor-level tasks
            if (Object.keys(floor.apartments).length === 0 && floor.tasks.length === 0) {
              delete tower.floors[floorId]
            }
          })

          // Remove tower if it has no floors
          if (Object.keys(tower.floors).length === 0) {
            delete group.towers[towerId]
          }
        })

        // Remove project if it has no towers
        if (Object.keys(group.towers).length === 0) {
          delete grouped[projectId]
        }
      }
    })

    return grouped
  }, [apartments, tasks])

  const toggleProject = (projectId: number) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const toggleTower = (towerId: number) => {
    setExpandedTowers(prev => {
      const next = new Set(prev)
      if (next.has(towerId)) {
        next.delete(towerId)
      } else {
        next.add(towerId)
      }
      return next
    })
  }

  const toggleFloor = (floorId: number) => {
    setExpandedFloors(prev => {
      const next = new Set(prev)
      if (next.has(floorId)) {
        next.delete(floorId)
      } else {
        next.add(floorId)
      }
      return next
    })
  }

  const toggleApartment = (apartmentId: number) => {
    setExpandedApartments(prev => {
      const next = new Set(prev)
      if (next.has(apartmentId)) {
        next.delete(apartmentId)
      } else {
        next.add(apartmentId)
      }
      return next
    })
  }

  const toggleTask = (taskId: number) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const toggleFloorTasks = (floorId: number) => {
    setExpandedFloorTasks(prev => {
      const next = new Set(prev)
      if (next.has(floorId)) {
        next.delete(floorId)
      } else {
        next.add(floorId)
      }
      return next
    })
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">📋</span>
        </div>
        <h3 className="text-lg font-medium text-slate-200 mb-2">No se encontraron tareas</h3>
        <p className="text-slate-400">Intenta ajustar los filtros de búsqueda</p>
      </div>
    )
  }

  const projectIds = Object.keys(hierarchy).map(Number).sort((a, b) => {
    const projectA = hierarchy[a].project.name
    const projectB = hierarchy[b].project.name
    return projectA.localeCompare(projectB)
  })

  return (
    <div className="space-y-6">
      {projectIds.map((projectId, projectIndex) => {
        const projectData = hierarchy[projectId]
        const project = projectData.project
        const isProjectExpanded = expandedProjects.has(projectId)

        // Calcular total de tareas del proyecto
        const totalProjectTasks = Object.values(projectData.towers).reduce((sum, towerData) =>
          sum + Object.values(towerData.floors).reduce((floorSum, floorData) =>
            floorSum + floorData.tasks.length + Object.values(floorData.apartments).reduce((aptSum, apt) => aptSum + apt.tasks.length, 0)
            , 0)
          , 0)

        // Calcular tareas completadas del proyecto
        const completedProjectTasks = Object.values(projectData.towers).reduce((sum, towerData) =>
          sum + Object.values(towerData.floors).reduce((floorSum, floorData) =>
            floorSum + floorData.tasks.filter(t => t.status === 'completed').length + Object.values(floorData.apartments).reduce((aptSum, apt) =>
              aptSum + apt.tasks.filter(t => t.status === 'completed').length, 0)
            , 0)
          , 0)

        const projectProgress = totalProjectTasks > 0
          ? Math.round((completedProjectTasks / totalProjectTasks) * 100)
          : 0

        return (
          <div key={projectId} className={`space-y-4 ${projectIndex > 0 ? 'mt-8 pt-6 border-t-2 border-slate-600' : ''}`}>
            {/* Proyecto Header */}
            <div
              className={`rounded-lg border px-4 py-3 cursor-pointer transition-colors ${project.is_active === false
                ? 'bg-red-900/10 border-red-500/30 hover:bg-red-900/20'
                : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700/70'
                }`}
              onClick={() => toggleProject(projectId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isProjectExpanded ? (
                    <ChevronDown className={`w-4 h-4 ${project.is_active === false ? 'text-red-400' : 'text-slate-300'}`} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 ${project.is_active === false ? 'text-red-400' : 'text-slate-300'}`} />
                  )}
                  <Building2 className={`w-4 h-4 ${project.is_active === false ? 'text-red-400' : 'text-blue-400'}`} />
                  <p className={`text-sm font-medium ${project.is_active === false ? 'text-red-200' : 'text-slate-200'}`}>
                    {project.name}
                  </p>
                  {project.is_active === false && (
                    <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded border border-red-500/30 font-medium">
                      Eliminado ({completedProjectTasks} tareas completadas)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={project.is_active === false ? 'text-red-300/70' : 'text-slate-400'}>Progreso:</span>
                    <div className="flex items-center gap-1">
                      <div className={`w-16 rounded-full h-1.5 ${project.is_active === false ? 'bg-red-900/40' : 'bg-slate-800'}`}>
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${project.is_active === false ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ width: `${projectProgress}%` }}
                        />
                      </div>
                      <span className={`font-medium w-8 ${project.is_active === false ? 'text-red-300' : 'text-slate-300'}`}>{projectProgress}%</span>
                    </div>
                  </div>
                  {totalProjectTasks > 0 && (
                    <div className="flex items-center gap-1">
                      <span className={project.is_active === false ? 'text-red-300/70' : 'text-slate-400'}>Tareas:</span>
                      <span className={`font-medium ${project.is_active === false ? 'text-red-300' : 'text-slate-300'}`}>{completedProjectTasks}/{totalProjectTasks}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Proyecto Content - Torres */}
            {isProjectExpanded && (
              <div className="space-y-4 ml-2 md:ml-4">
                {Object.keys(projectData.towers).map(Number).sort((a, b) => {
                  const towerA = projectData.towers[a].tower.number
                  const towerB = projectData.towers[b].tower.number
                  return towerA - towerB
                }).map(towerId => {
                  const towerData = projectData.towers[towerId]
                  const tower = towerData.tower
                  const isTowerExpanded = expandedTowers.has(towerId)

                  const totalTasks = Object.values(towerData.floors).reduce((sum, floorData) =>
                    sum + floorData.tasks.length + Object.values(floorData.apartments).reduce((aptSum, apt) => aptSum + apt.tasks.length, 0)
                    , 0)

                  const completedTasks = Object.values(towerData.floors).reduce((sum, floorData) =>
                    sum + floorData.tasks.filter(t => t.status === 'completed').length + Object.values(floorData.apartments).reduce((aptSum, apt) =>
                      aptSum + apt.tasks.filter(t => t.status === 'completed').length, 0)
                    , 0)

                  const towerProgress = totalTasks > 0
                    ? Math.round((completedTasks / totalTasks) * 100)
                    : 0

                  return (
                    <div key={towerId} className="space-y-3">
                      {/* Torre Header */}
                      <div
                        className="bg-slate-700/40 rounded-lg border border-slate-600 px-4 py-2 cursor-pointer hover:bg-slate-700/60 transition-colors"
                        onClick={() => toggleTower(towerId)}
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
                              {tower.name || `Torre ${tower.number}`}
                            </p>
                            {onAddMassTask && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onAddMassTask(projectId, towerId)
                                }}
                                className="ml-2 p-1 hover:bg-slate-600 rounded-full text-purple-400 hover:text-purple-300 transition-colors border border-transparent hover:border-slate-500"
                                title="Agregar Tarea Masiva a Torre"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">Progreso:</span>
                              <span className="text-slate-300 font-medium">{towerProgress}%</span>
                            </div>
                            {totalTasks > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">Tareas:</span>
                                <span className="text-slate-300 font-medium">{completedTasks}/{totalTasks}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Torre Content */}
                      {isTowerExpanded && (
                        <div className="space-y-3 ml-2 md:ml-4">
                          {Object.keys(towerData.floors).map(Number).sort((a, b) => {
                            const floorA = towerData.floors[a].floor_number
                            const floorB = towerData.floors[b].floor_number
                            return floorA - floorB
                          }).map(floorId => {
                            const floorData = towerData.floors[floorId]
                            const isFloorExpanded = expandedFloors.has(floorId)

                            const floorTaskCount = floorData.tasks.length + Object.values(floorData.apartments).reduce((sum, apt) => sum + apt.tasks.length, 0)
                            const floorCompletedTasks = floorData.tasks.filter(t => t.status === 'completed').length + Object.values(floorData.apartments).reduce((sum, apt) =>
                              sum + apt.tasks.filter(t => t.status === 'completed').length, 0)

                            const floorProgress = floorTaskCount > 0
                              ? Math.round((floorCompletedTasks / floorTaskCount) * 100)
                              : 0

                            return (
                              <div key={floorId} className="space-y-3">
                                {/* Piso Header */}
                                <div
                                  className="bg-slate-700/30 rounded-lg border border-slate-600 px-3 py-2 cursor-pointer hover:bg-slate-700/50 transition-colors"
                                  onClick={() => toggleFloor(floorId)}
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
                                        Piso {floorData.floor_number}
                                      </p>
                                      {onAddTask && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onAddTask(projectId, towerId, floorId, null)
                                          }}
                                          className="ml-2 p-1 hover:bg-slate-600 rounded-full text-green-400 hover:text-green-300 transition-colors border border-transparent hover:border-slate-500"
                                          title="Agregar Tarea al Piso"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-400">Progreso:</span>
                                        <span className="text-slate-300 font-medium">{floorProgress}%</span>
                                      </div>
                                      {floorTaskCount > 0 && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-slate-400">Tareas:</span>
                                          <span className="text-slate-300 font-medium">{floorCompletedTasks}/{floorTaskCount}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-400">Deptos:</span>
                                        <span className="text-slate-300 font-medium">{Object.keys(floorData.apartments).length}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Piso Content - Apartamentos */}
                                {isFloorExpanded && (
                                  <div className="space-y-2 ml-2 md:ml-4">
                                    {/* Tareas de Piso (Áreas Comunes) */}
                                    {floorData.tasks.length > 0 && (
                                      <div className="mb-4">
                                        <button
                                          onClick={() => toggleFloorTasks(floorId)}
                                          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors mb-2 border ${expandedFloorTasks.has(floorId)
                                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                            : 'bg-slate-700/30 text-slate-400 border-slate-600 hover:bg-slate-700/50 hover:text-slate-300'
                                            }`}
                                        >
                                          {expandedFloorTasks.has(floorId) ? (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          ) : (
                                            <ChevronRight className="w-3.5 h-3.5" />
                                          )}
                                          <Layers className="w-3.5 h-3.5" />
                                          Ver Tareas de Piso ({floorData.tasks.length})
                                        </button>

                                        {expandedFloorTasks.has(floorId) && (
                                          <div className="pl-4 border-l-2 border-indigo-500/30">
                                            <div className="bg-slate-800/50 rounded-lg p-2 space-y-2">
                                              {floorData.tasks.map(task => (
                                                <TaskRowV2
                                                  key={task.id}
                                                  task={task}
                                                  isExpanded={expandedTasks.has(task.id)}
                                                  onToggleExpand={() => toggleTask(task.id)}
                                                  onTaskUpdate={onTaskUpdate}
                                                />
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Departamentos */}
                                    {Object.keys(floorData.apartments).map(Number).sort((a, b) => {
                                      // Ordenar por el número original del departamento (extraer número del string)
                                      const aptA = floorData.apartments[a]
                                      const aptB = floorData.apartments[b]

                                      const extractNumber = (str: string): number => {
                                        if (!str) return 0
                                        const numbers = str.match(/\d+/g)
                                        if (!numbers || numbers.length === 0) return 0
                                        // Usar el último número encontrado
                                        return parseInt(numbers[numbers.length - 1], 10) || 0
                                      }

                                      const numA = extractNumber(aptA.originalNumber || '')
                                      const numB = extractNumber(aptB.originalNumber || '')
                                      return numA - numB
                                    }).map(apartmentId => {
                                      const apartment = floorData.apartments[apartmentId]
                                      const isApartmentExpanded = expandedApartments.has(apartmentId)

                                      const completedApartmentTasks = apartment.tasks.filter(t => t.status === 'completed').length
                                      const apartmentProgress = apartment.tasks.length > 0
                                        ? Math.round((completedApartmentTasks / apartment.tasks.length) * 100)
                                        : 0

                                      return (
                                        <div key={apartmentId} className="bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800/70 hover:border-slate-600 transition-all">
                                          {/* Apartamento Header */}
                                          <div
                                            className="px-3 py-2 cursor-pointer"
                                            onClick={() => toggleApartment(apartmentId)}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  {isApartmentExpanded ? (
                                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                                  ) : (
                                                    <ChevronRight className="w-3 h-3 text-slate-400" />
                                                  )}
                                                  <Home className="w-3 h-3 text-blue-400" />
                                                  <span className="text-xs font-medium text-slate-300">Depto {apartment.number}</span>
                                                  {onAddTask && (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        onAddTask(projectId, towerId, floorId, apartmentId)
                                                      }}
                                                      className="p-1 hover:bg-slate-700/80 rounded-full text-blue-400 hover:text-blue-300 transition-colors border border-transparent hover:border-slate-600 ml-1"
                                                      title="Agregar Tarea"
                                                    >
                                                      <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-slate-400">Tareas:</span>
                                                    <span className="text-slate-300 font-medium">{completedApartmentTasks}/{apartment.tasks.length}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Apartamento Content - Tareas */}
                                          {isApartmentExpanded && (
                                            <div className="px-3 pb-3 space-y-2">
                                              {apartment.tasks.map(task => (
                                                <TaskRowV2
                                                  key={task.id}
                                                  task={task}
                                                  isExpanded={expandedTasks.has(task.id)}
                                                  onToggleExpand={() => toggleTask(task.id)}
                                                  onTaskUpdate={onTaskUpdate}
                                                />
                                              ))}
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
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

