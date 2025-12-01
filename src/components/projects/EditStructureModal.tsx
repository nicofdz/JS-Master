'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ChevronDown, ChevronRight, Building2, Plus, Edit, Trash2, LayoutGrid, ClipboardList, RotateCcw } from 'lucide-react'
import { useTowers, useFloors, useApartments } from '@/hooks'
import { AddTowerModal } from './AddTowerModal'
import { AddFloorModal } from './AddFloorModal'
import { AddApartmentsModal } from './AddApartmentsModal'
import { AddApartmentsToAllFloorsModal } from './AddApartmentsToAllFloorsModal'
import { AddTasksToFloorsModal } from './AddTasksToFloorsModal'
import { EditTowerModal } from './EditTowerModal'
import { EditApartmentModal } from './EditApartmentModal'
import { ApartmentTasksModal } from './ApartmentTasksModal'
import { supabase } from '@/lib/supabase'
import { formatApartmentNumber } from '@/lib/utils'
import toast from 'react-hot-toast'

interface EditStructureModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: number
  projectName: string
}

export function EditStructureModal({ isOpen, onClose, projectId, projectName }: EditStructureModalProps) {
  const { towers, loading: loadingTowers, refresh: refreshTowers, softDeleteTower } = useTowers(projectId)
  const { floors, loading: loadingFloors, refresh: refreshFloors, softDeleteFloor } = useFloors(projectId)
  const { apartments, loading: loadingApartments, refresh: refreshApartments, fetchAllApartments, softDeleteApartment, hardDeleteApartment, restoreApartment } = useApartments()

  const [expandedTowers, setExpandedTowers] = useState<Set<number>>(new Set())
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set())
  const [taskCounts, setTaskCounts] = useState<Record<number, { completed: number; total: number }>>({})

  // Estados para modales
  const [showAddTowerModal, setShowAddTowerModal] = useState(false)
  const [showAddFloorModal, setShowAddFloorModal] = useState(false)
  const [showAddApartmentsModal, setShowAddApartmentsModal] = useState(false)
  const [showAddApartmentsToAllFloorsModal, setShowAddApartmentsToAllFloorsModal] = useState(false)
  const [showAddTasksModal, setShowAddTasksModal] = useState(false)
  const [showEditTowerModal, setShowEditTowerModal] = useState(false)
  const [showEditApartmentModal, setShowEditApartmentModal] = useState(false)
  const [showTasksModal, setShowTasksModal] = useState(false)
  const [showDeleteApartmentConfirm, setShowDeleteApartmentConfirm] = useState(false)
  const [apartmentToDelete, setApartmentToDelete] = useState<{ id: number; number: string } | null>(null)
  const [showHardDeleteApartmentConfirm, setShowHardDeleteApartmentConfirm] = useState(false)
  const [apartmentToHardDelete, setApartmentToHardDelete] = useState<{ id: number; number: string } | null>(null)

  // Estados para elementos seleccionados
  const [selectedTowerForFloor, setSelectedTowerForFloor] = useState<number | null>(null)
  const [selectedTowerForAllApartments, setSelectedTowerForAllApartments] = useState<number | null>(null)
  const [selectedFloorForApartment, setSelectedFloorForApartment] = useState<number | null>(null)
  const [selectedFloorForTasks, setSelectedFloorForTasks] = useState<number | null>(null)
  const [selectedTowerForEdit, setSelectedTowerForEdit] = useState<{ id: number; name?: string } | null>(null)
  const [selectedApartmentForEdit, setSelectedApartmentForEdit] = useState<{
    id: number
    apartment_number: string
    apartment_type?: string | null
    area?: number | null
    bedrooms?: number | null
    bathrooms?: number | null
  } | null>(null)
  const [selectedApartmentForTasks, setSelectedApartmentForTasks] = useState<{ id: number; number: string } | null>(null)

  // Filtrar pisos y departamentos por el proyecto actual
  const projectFloors = floors.filter(f => f.project_id === projectId)
  const projectApartments = apartments.filter(a => {
    const floor = projectFloors.find(f => f.id === a.floor_id)
    return !!floor
  })

  // Cargar todos los departamentos (incluyendo eliminados) cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      fetchAllApartments(true) // Incluir inactivos
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Cargar conteo de tareas cuando se abre el modal
  useEffect(() => {
    if (isOpen && projectApartments.length > 0) {
      fetchTaskCounts()
    }
  }, [isOpen, projectApartments.length])

  const fetchTaskCounts = async () => {
    try {
      const apartmentIds = projectApartments.map(a => a.id)
      
      // Consultar tasks V2 en lugar de apartment_tasks
      const { data, error } = await supabase
        .from('tasks')
        .select('apartment_id, status')
        .in('apartment_id', apartmentIds)
        .eq('is_deleted', false) // Excluir tareas eliminadas (soft delete)

      if (error) throw error

      const counts: Record<number, { completed: number; total: number }> = {}
      
      data?.forEach(task => {
        if (!counts[task.apartment_id]) {
          counts[task.apartment_id] = { completed: 0, total: 0 }
        }
        counts[task.apartment_id].total++
        if (task.status === 'completed') {
          counts[task.apartment_id].completed++
        }
      })

      setTaskCounts(counts)
    } catch (err) {
      console.error('Error fetching task counts:', err)
    }
  }

  const toggleTower = (towerId: number) => {
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

  const toggleFloor = (floorId: number) => {
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

  const handleAddTower = () => {
    setShowAddTowerModal(true)
  }

  const handleAddFloor = (towerId: number) => {
    setSelectedTowerForFloor(towerId)
    setShowAddFloorModal(true)
  }

  const handleAddApartmentsToAllFloors = (towerId: number) => {
    setSelectedTowerForAllApartments(towerId)
    setShowAddApartmentsToAllFloorsModal(true)
  }

  const handleAddApartments = (floorId: number) => {
    setSelectedFloorForApartment(floorId)
    setShowAddApartmentsModal(true)
  }

  const handleAddTasks = (floorId: number) => {
    setSelectedFloorForTasks(floorId)
    setShowAddTasksModal(true)
  }

  const handleEditTower = (towerId: number, towerName?: string) => {
    setSelectedTowerForEdit({ id: towerId, name: towerName })
    setShowEditTowerModal(true)
  }

  const handleEditApartment = (apartment: typeof selectedApartmentForEdit) => {
    setSelectedApartmentForEdit(apartment)
    setShowEditApartmentModal(true)
  }

  const handleDeleteTower = async (towerId: number) => {
    if (!confirm('¿Está seguro de que desea eliminar esta torre? Todos sus pisos y departamentos también serán eliminados.')) {
      return
    }

    try {
      await softDeleteTower(towerId)
      toast.success('Torre eliminada exitosamente')
      refreshTowers()
      refreshFloors()
      refreshApartments()
    } catch (err) {
      toast.error('Error al eliminar la torre')
      console.error(err)
    }
  }

  const handleDeleteFloor = async (floorId: number) => {
    if (!confirm('¿Está seguro de que desea eliminar este piso? Todos sus departamentos también serán eliminados.')) {
      return
    }

    try {
      await softDeleteFloor(floorId)
      toast.success('Piso eliminado exitosamente')
      refreshFloors()
      refreshApartments()
    } catch (err) {
      toast.error('Error al eliminar el piso')
      console.error(err)
    }
  }

  const handleDeleteApartment = (apartmentId: number, apartmentNumber: string) => {
    setApartmentToDelete({ id: apartmentId, number: apartmentNumber })
    setShowDeleteApartmentConfirm(true)
  }

  const confirmDeleteApartment = async () => {
    if (!apartmentToDelete) return

    try {
      await softDeleteApartment(apartmentToDelete.id)
      toast.success('Departamento eliminado exitosamente')
      refreshApartments()
      fetchTaskCounts()
      setShowDeleteApartmentConfirm(false)
      setApartmentToDelete(null)
    } catch (err: any) {
      console.error('Error completo al eliminar departamento:', err)
      const errorMessage = err?.message || 'Error desconocido al eliminar el departamento'
      toast.error(`Error al eliminar el departamento: ${errorMessage}`)
    }
  }

  const handleApartmentClick = (apartmentId: number, apartmentNumber: string) => {
    setSelectedApartmentForTasks({ id: apartmentId, number: apartmentNumber })
    setShowTasksModal(true)
  }

  const handleRefresh = () => {
    refreshTowers()
    refreshFloors()
    fetchAllApartments(true) // Incluir inactivos
    fetchTaskCounts()
  }

  const handleRestoreApartment = async (apartmentId: number, apartmentNumber: string) => {
    try {
      await restoreApartment(apartmentId)
      toast.success(`Departamento ${apartmentNumber.replace('[ELIMINADO] ', '')} restaurado exitosamente`)
      fetchAllApartments(true) // Recargar incluyendo inactivos
      fetchTaskCounts()
    } catch (err: any) {
      console.error('Error completo al restaurar departamento:', err)
      const errorMessage = err?.message || 'Error desconocido al restaurar el departamento'
      toast.error(`Error al restaurar el departamento: ${errorMessage}`)
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
      toast.success('Departamento eliminado definitivamente. Las tareas completadas se mantienen en el sistema.')
      fetchAllApartments(true) // Recargar incluyendo inactivos
      fetchTaskCounts()
      setShowHardDeleteApartmentConfirm(false)
      setApartmentToHardDelete(null)
    } catch (err: any) {
      console.error('Error completo al eliminar definitivamente departamento:', err)
      const errorMessage = err?.message || 'Error desconocido al eliminar definitivamente el departamento'
      toast.error(`Error al eliminar definitivamente el departamento: ${errorMessage}`)
    }
  }

  // Extraer número del código de departamento para ordenar (ahora solo números)
  const extractNumber = (apartmentNumber: string): number => {
    const anyNumber = apartmentNumber.match(/(\d+)/)
    return anyNumber ? parseInt(anyNumber[1], 10) : 0
  }

  const sortApartments = (apartments: typeof projectApartments) => {
    return [...apartments].sort((a, b) => {
      const numA = extractNumber(a.apartment_number)
      const numB = extractNumber(b.apartment_number)
      return numA - numB
    })
  }

  const getTaskBadge = (apartmentId: number) => {
    const count = taskCounts[apartmentId]
    if (!count || count.total === 0) return null

    const isComplete = count.completed === count.total
    const bgColor = isComplete ? 'bg-green-500' : 'bg-yellow-500'
    
    return (
      <div className={`absolute -top-1 -right-1 ${bgColor} text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[28px] text-center shadow-lg`}>
        {count.completed}/{count.total}
      </div>
    )
  }

  // Agrupar pisos por torre
  const floorsByTower = projectFloors.reduce((acc, floor) => {
    const towerId = floor.tower_id
    if (towerId && !acc[towerId]) {
      acc[towerId] = []
    }
    if (towerId) {
      acc[towerId].push(floor)
    }
    return acc
  }, {} as Record<number, typeof projectFloors>)

  // Agrupar departamentos por piso
  const apartmentsByFloor = projectApartments.reduce((acc, apartment) => {
    if (!acc[apartment.floor_id]) {
      acc[apartment.floor_id] = []
    }
    acc[apartment.floor_id].push(apartment)
    return acc
  }, {} as Record<number, typeof projectApartments>)

  const loading = loadingTowers || loadingFloors || loadingApartments

  if (!isOpen) return null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Editar Estructura: ${projectName}`}
        size="xl"
      >
        <div className="space-y-4">
          {/* Botón para agregar torre */}
          <div className="flex justify-between items-center mb-4">
            <Button
              onClick={handleAddTower}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Torre
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              size="sm"
            >
              Actualizar
            </Button>
          </div>

          {loading && <p className="text-center text-blue-400">Cargando estructura...</p>}

          {!loading && towers.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No hay torres definidas para este proyecto.</p>
              <Button onClick={handleAddTower} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primera Torre
              </Button>
            </div>
          )}

          {!loading && towers.length > 0 && (
            <div className="space-y-3">
              {towers.sort((a, b) => a.tower_number - b.tower_number).map(tower => {
                const isTowerExpanded = expandedTowers.has(tower.id)
                const towerFloors = (tower.id && floorsByTower[tower.id]) || []

                return (
                  <div key={tower.id} className="space-y-2">
                    {/* Torre */}
                    <div className="relative group">
                      <button
                        onClick={() => toggleTower(tower.id)}
                        className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg border border-blue-500/30 hover:border-blue-500/50 p-4 transition-all duration-200 flex items-center gap-3"
                      >
                        {isTowerExpanded ? (
                          <ChevronDown className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        )}
                        <Building2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="text-lg font-semibold text-white">
                            {tower.name || `Torre ${tower.tower_number}`}
                          </div>
                          <div className="text-sm text-gray-400">
                            {towerFloors.length} {towerFloors.length === 1 ? 'piso' : 'pisos'}
                          </div>
                        </div>
                      </button>
                      
                      {/* Botones de acción de Torre */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddApartmentsToAllFloors(tower.id)
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white border-blue-500 text-xs px-2"
                          title="Agregar Departamentos a Todos los Pisos"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Departamentos
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddFloor(tower.id)
                          }}
                          className="bg-green-600 hover:bg-green-500 text-white border-green-500 text-xs px-2"
                          title="Agregar Piso"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Piso
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditTower(tower.id, tower.name)
                          }}
                          className="bg-slate-600 hover:bg-slate-500 text-white border-slate-500"
                          title="Editar Torre"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTower(tower.id)
                          }}
                          className="bg-red-600 hover:bg-red-500 text-white border-red-500"
                          title="Eliminar Torre"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Pisos de la Torre */}
                    {isTowerExpanded && (
                      <div className="ml-8 space-y-2">
                        {(Array.isArray(towerFloors) ? towerFloors : []).sort((a, b) => a.floor_number - b.floor_number).map(floor => {
                          const isFloorExpanded = expandedFloors.has(floor.id)
                          const floorApartments = apartmentsByFloor[floor.id] || []

                          return (
                            <div key={floor.id} className="space-y-2">
                              {/* Piso */}
                              <div className="relative group">
                                <button
                                  onClick={() => toggleFloor(floor.id)}
                                  className="w-full bg-slate-600 hover:bg-slate-550 rounded-lg border border-purple-500/30 hover:border-purple-500/50 p-3 transition-all duration-200 flex items-center gap-3"
                                >
                                  {isFloorExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 text-left">
                                    <div className="text-base font-semibold text-white">
                                      Piso {floor.floor_number}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {floorApartments.length} {floorApartments.length === 1 ? 'departamento' : 'departamentos'}
                                    </div>
                                  </div>
                                </button>

                                {/* Botones de acción de Piso */}
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleAddApartments(floor.id)
                                    }}
                                    className="bg-green-600 hover:bg-green-500 text-white border-green-500 text-xs px-2"
                                    title="Agregar Departamentos"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Departamentos
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleAddTasks(floor.id)
                                    }}
                                    className="bg-slate-500 hover:bg-slate-400 text-white border-slate-400 text-xs px-2"
                                    title="Agregar Tareas"
                                  >
                                    <ClipboardList className="w-3 h-3 mr-1" />
                                    Tareas
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteFloor(floor.id)
                                    }}
                                    className="bg-red-600 hover:bg-red-500 text-white border-red-500 text-xs px-2"
                                    title="Eliminar Piso"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Departamentos del Piso */}
                              {isFloorExpanded && floorApartments.length > 0 && (() => {
                                const activeApartments = floorApartments.filter((a: any) => a.is_active)
                                const deletedApartments = floorApartments.filter((a: any) => !a.is_active)
                                
                                return (
                                  <div className="ml-8 space-y-4">
                                    {/* Departamentos Activos */}
                                    {activeApartments.length > 0 && (
                                      <div>
                                        <div className="grid grid-cols-8 gap-2">
                                          {sortApartments(activeApartments).map(apartment => (
                                            <div key={apartment.id} className="relative">
                                              <button
                                                onClick={() => handleApartmentClick(apartment.id, formatApartmentNumber(apartment.apartment_code, apartment.apartment_number))}
                                                className="bg-slate-500 text-white hover:bg-slate-400 rounded-lg border border-green-500/30 p-3 flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-lg relative w-full"
                                                title={`Departamento ${formatApartmentNumber(apartment.apartment_code, apartment.apartment_number)} - Click para ver tareas`}
                                              >
                                                <span className="text-sm font-bold">{formatApartmentNumber(apartment.apartment_code, apartment.apartment_number)}</span>
                                                {getTaskBadge(apartment.id)}
                                              </button>
                                              
                                              {/* Botones de acción del Departamento */}
                                              <div className="flex gap-1 mt-1 justify-center">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => handleEditApartment({
                                                    id: apartment.id,
                                                    apartment_number: formatApartmentNumber(apartment.apartment_code, apartment.apartment_number),
                                                    apartment_type: apartment.apartment_type,
                                                    area: apartment.area,
                                                    bedrooms: apartment.bedrooms,
                                                    bathrooms: apartment.bathrooms
                                                  })}
                                                  className="bg-slate-400 hover:bg-slate-300 text-white border-slate-300 text-xs px-1 py-0 h-6"
                                                  title="Editar"
                                                >
                                                  <Edit className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => handleDeleteApartment(apartment.id, formatApartmentNumber(apartment.apartment_code, apartment.apartment_number))}
                                                  className="bg-red-600 hover:bg-red-500 text-white border-red-500 text-xs px-1 py-0 h-6"
                                                  title="Eliminar"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Departamentos Eliminados */}
                                    {deletedApartments.length > 0 && (
                                      <div>
                                        <div className="text-xs text-gray-400 mb-2 font-semibold">
                                          Departamentos Eliminados
                                        </div>
                                        <div className="grid grid-cols-8 gap-2">
                                          {sortApartments(deletedApartments).map(apartment => {
                                            const fullNumber = formatApartmentNumber(apartment.apartment_code, apartment.apartment_number)
                                            const displayNumber = fullNumber.replace('[ELIMINADO] ', '')
                                            return (
                                              <div key={apartment.id} className="relative">
                                                <button
                                                  onClick={() => handleApartmentClick(apartment.id, fullNumber)}
                                                  className="bg-slate-700/50 text-gray-400 hover:bg-slate-700/70 rounded-lg border-2 border-red-500/50 p-3 flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-lg relative w-full opacity-60"
                                                  title={`Departamento ${displayNumber} (Eliminado) - Click para ver tareas`}
                                                >
                                                  <span className="text-sm font-bold line-through">{displayNumber}</span>
                                                  {getTaskBadge(apartment.id)}
                                                </button>
                                                
                                                {/* Botones de acción del Departamento Eliminado */}
                                                <div className="flex gap-1 mt-1 justify-center">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleRestoreApartment(apartment.id, formatApartmentNumber(apartment.apartment_code, apartment.apartment_number))}
                                                    className="bg-green-600 hover:bg-green-500 text-white border-green-500 text-xs px-1 py-0 h-6"
                                                    title="Restaurar"
                                                  >
                                                    <RotateCcw className="w-3 h-3" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleHardDeleteApartment(apartment.id, formatApartmentNumber(apartment.apartment_code, apartment.apartment_number))}
                                                    className="bg-red-700 hover:bg-red-600 text-white border-red-600 text-xs px-1 py-0 h-6"
                                                    title="Eliminar Definitivamente"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}

                              {isFloorExpanded && floorApartments.length === 0 && (
                                <div className="ml-8 text-center py-4 text-gray-400 text-sm">
                                  No hay departamentos en este piso
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
      </Modal>

      {/* Modales */}
      <AddTowerModal
        isOpen={showAddTowerModal}
        onClose={() => setShowAddTowerModal(false)}
        projectId={projectId}
        onSuccess={handleRefresh}
      />

      {selectedTowerForFloor && (
        <AddFloorModal
          isOpen={showAddFloorModal}
          onClose={() => {
            setShowAddFloorModal(false)
            setSelectedTowerForFloor(null)
          }}
          towerId={selectedTowerForFloor}
          projectId={projectId}
          onSuccess={handleRefresh}
        />
      )}

      {selectedTowerForAllApartments && (
        <AddApartmentsToAllFloorsModal
          isOpen={showAddApartmentsToAllFloorsModal}
          onClose={() => {
            setShowAddApartmentsToAllFloorsModal(false)
            setSelectedTowerForAllApartments(null)
          }}
          towerId={selectedTowerForAllApartments}
          projectId={projectId}
          onSuccess={handleRefresh}
        />
      )}

      {selectedFloorForApartment && (
        <AddApartmentsModal
          isOpen={showAddApartmentsModal}
          onClose={() => {
            setShowAddApartmentsModal(false)
            setSelectedFloorForApartment(null)
          }}
          floorId={selectedFloorForApartment}
          projectId={projectId}
          onSuccess={handleRefresh}
        />
      )}

      {selectedFloorForTasks && (
        <AddTasksToFloorsModal
          isOpen={showAddTasksModal}
          onClose={() => {
            setShowAddTasksModal(false)
            setSelectedFloorForTasks(null)
          }}
          projectId={projectId}
          towerId={towers.find(t => floorsByTower[t.id]?.some((f: any) => f.id === selectedFloorForTasks))?.id}
          onSuccess={handleRefresh}
        />
      )}

      {selectedTowerForEdit && (
        <EditTowerModal
          isOpen={showEditTowerModal}
          onClose={() => {
            setShowEditTowerModal(false)
            setSelectedTowerForEdit(null)
          }}
          towerId={selectedTowerForEdit.id}
          currentName={selectedTowerForEdit.name}
          onSuccess={handleRefresh}
        />
      )}

      {selectedApartmentForEdit && (
        <EditApartmentModal
          isOpen={showEditApartmentModal}
          onClose={() => {
            setShowEditApartmentModal(false)
            setSelectedApartmentForEdit(null)
          }}
          apartmentId={selectedApartmentForEdit.id}
          currentData={selectedApartmentForEdit}
          onSuccess={handleRefresh}
        />
      )}

      {selectedApartmentForTasks && (
        <ApartmentTasksModal
          isOpen={showTasksModal}
          onClose={() => {
            setShowTasksModal(false)
            setSelectedApartmentForTasks(null)
          }}
          apartmentId={selectedApartmentForTasks.id}
          apartmentNumber={selectedApartmentForTasks.number}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        isOpen={showDeleteApartmentConfirm}
        onClose={() => {
          setShowDeleteApartmentConfirm(false)
          setApartmentToDelete(null)
        }}
        title="Confirmar Eliminación"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            ¿Está seguro de que desea eliminar el departamento <strong className="text-white">{apartmentToDelete?.number}</strong>?
          </p>
          <p className="text-sm text-slate-400">
            Esta acción marcará el departamento como eliminado. Podrá restaurarlo más tarde si es necesario.
          </p>
          <div className="flex justify-end gap-2 pt-4">
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
              onClick={confirmDeleteApartment}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmación de Eliminación Definitiva */}
      <Modal
        isOpen={showHardDeleteApartmentConfirm}
        onClose={() => {
          setShowHardDeleteApartmentConfirm(false)
          setApartmentToHardDelete(null)
        }}
        title="Confirmar Eliminación Definitiva"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            ¿Está seguro de que desea eliminar <strong className="text-white">definitivamente</strong> el departamento <strong className="text-white">{apartmentToHardDelete?.number.replace('[ELIMINADO] ', '')}</strong>?
          </p>
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 space-y-2">
            <p className="text-sm text-red-300 font-semibold">
              ⚠️ Esta acción es irreversible
            </p>
            <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
              <li>El departamento será eliminado permanentemente de la base de datos</li>
              <li>Las tareas <strong className="text-white">no completadas</strong> serán eliminadas definitivamente</li>
              <li>Las tareas <strong className="text-white">completadas</strong> se mantendrán pero quedarán sin departamento asignado</li>
              <li>No podrá restaurar este departamento después de esta acción</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2 pt-4">
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
              onClick={confirmHardDeleteApartment}
              className="bg-red-700 hover:bg-red-800 text-white"
            >
              Eliminar Definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

