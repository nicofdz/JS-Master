'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ChevronDown, ChevronRight, Building2, Maximize2, Minimize2 } from 'lucide-react'
import { useTowers, useFloors, useApartments } from '@/hooks'
import { ApartmentTasksModal } from './ApartmentTasksModal'
import { supabase } from '@/lib/supabase'
import { formatApartmentNumber } from '@/lib/utils'

interface StructureViewModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: number
  projectName: string
}

export function StructureViewModal({ isOpen, onClose, projectId, projectName }: StructureViewModalProps) {
  const { towers, loading: loadingTowers } = useTowers(projectId)
  const { floors, loading: loadingFloors } = useFloors()
  const { apartments, loading: loadingApartments } = useApartments()

  const [expandedTowers, setExpandedTowers] = useState<Set<number>>(new Set())
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set())
  const [showTasksModal, setShowTasksModal] = useState(false)
  const [selectedApartment, setSelectedApartment] = useState<{ id: number; number: string } | null>(null)
  const [taskCounts, setTaskCounts] = useState<Record<number, { completed: number; total: number }>>({})

  // Filtrar pisos y departamentos por el proyecto actual
  const projectFloors = floors.filter(f => f.project_id === projectId)
  const projectApartments = apartments.filter(a => {
    const floor = projectFloors.find(f => f.id === a.floor_id)
    return !!floor
  })

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

      // Agrupar por apartment_id y contar
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

  const expandAll = () => {
    setExpandedTowers(new Set(towers.map(t => t.id)))
    setExpandedFloors(new Set(projectFloors.map(f => f.id)))
  }

  const collapseAll = () => {
    setExpandedTowers(new Set())
    setExpandedFloors(new Set())
  }

  // Extraer número del código de departamento para ordenar (ahora solo números)
  const extractNumber = (apartmentNumber: string): number => {
    // Ahora apartment_number solo contiene números, así que extraemos directamente
    const anyNumber = apartmentNumber.match(/(\d+)/)
    return anyNumber ? parseInt(anyNumber[1], 10) : 0
  }

  // Ordenar departamentos numéricamente
  const sortApartments = (apartments: typeof projectApartments) => {
    return [...apartments].sort((a, b) => {
      const numA = extractNumber(a.apartment_number)
      const numB = extractNumber(b.apartment_number)
      return numA - numB
    })
  }

  // Abrir modal de tareas
  const handleApartmentClick = (apartmentId: number, apartmentNumber: string) => {
    setSelectedApartment({ id: apartmentId, number: apartmentNumber })
    setShowTasksModal(true)
  }

  // Obtener color por estado de departamento
  const getApartmentColor = (apartmentNumber: string) => {
    const apartment = projectApartments.find(a => formatApartmentNumber(a.apartment_code, a.apartment_number) === apartmentNumber)
    if (!apartment) return 'bg-slate-500 text-gray-300'
    
    // Aquí puedes agregar lógica para determinar el estado
    // Por ahora retorno un color base
    return 'bg-slate-500 text-white hover:bg-slate-400'
  }

  // Obtener badge de tareas
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

  if (!isOpen) return null

  return (
    <>
      <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Estructura del Proyecto: ${projectName}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Botones de control */}
        <div className="flex justify-end gap-2 pb-2 border-b border-slate-600">
          <Button
            size="sm"
            variant="outline"
            onClick={expandAll}
            className="flex items-center gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            Expandir Todo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={collapseAll}
            className="flex items-center gap-2"
          >
            <Minimize2 className="w-4 h-4" />
            Colapsar Todo
          </Button>
        </div>

        {/* Contenedor con scroll */}
        <div className="max-h-[600px] overflow-y-auto pr-2">
          {loadingTowers || loadingFloors || loadingApartments ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : towers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No hay torres en este proyecto</p>
            </div>
          ) : (
            <div className="space-y-3">
              {towers.map(tower => {
                const towerFloors = projectFloors.filter(f => f.tower_id === tower.id)
                const isExpanded = expandedTowers.has(tower.id)

                return (
                  <div key={tower.id} className="space-y-2">
                    {/* Torre */}
                    <button
                      onClick={() => toggleTower(tower.id)}
                      className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg border border-blue-500/30 hover:border-blue-500/50 p-4 transition-all duration-200 flex items-center gap-3"
                    >
                      {isExpanded ? (
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

                    {/* Pisos de la torre */}
                    {isExpanded && (
                      <div className="ml-8 space-y-2">
                        {towerFloors
                          .sort((a, b) => a.floor_number - b.floor_number)
                          .map(floor => {
                            const floorApartments = projectApartments.filter(
                              a => a.floor_id === floor.id
                            )
                            const isFloorExpanded = expandedFloors.has(floor.id)

                            return (
                              <div key={floor.id} className="space-y-2">
                                {/* Piso */}
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

                                {/* Departamentos del piso */}
                                {isFloorExpanded && floorApartments.length > 0 && (
                                  <div className="ml-8">
                                    <div className="grid grid-cols-8 gap-2">
                                      {sortApartments(floorApartments)
                                        .map(apartment => (
                                          <button
                                            key={apartment.id}
                                            onClick={() => handleApartmentClick(apartment.id, formatApartmentNumber(apartment.apartment_code, apartment.apartment_number))}
                                            className={`${getApartmentColor(formatApartmentNumber(apartment.apartment_code, apartment.apartment_number))} rounded-lg border border-green-500/30 p-3 flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-lg relative`}
                                            title={`Departamento ${formatApartmentNumber(apartment.apartment_code, apartment.apartment_number)} - Click para ver tareas`}
                                          >
                                            <span className="text-sm font-bold">
                                              {formatApartmentNumber(apartment.apartment_code, apartment.apartment_number)}
                                            </span>
                                            {getTaskBadge(apartment.id)}
                                          </button>
                                        ))}
                                    </div>
                                  </div>
                                )}

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

        {/* Botón de cerrar */}
        <div className="flex justify-end pt-4 border-t border-slate-600">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>

      {/* Modal de tareas del departamento */}
      {selectedApartment && (
        <ApartmentTasksModal
          isOpen={showTasksModal}
          onClose={() => {
            setShowTasksModal(false)
            setSelectedApartment(null)
          }}
          apartmentId={selectedApartment.id}
          apartmentNumber={selectedApartment.number}
        />
      )}
    </>
  )
}

