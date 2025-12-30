'use client'

import { useState, useEffect, useMemo } from 'react'
import { ModalV2 } from '@/components/tasks-v2/ModalV2'
import { Button } from '@/components/ui/Button'
import { useTaskTemplates } from '@/hooks'
import { useFloors, useApartments } from '@/hooks'
import { supabase } from '@/lib/supabase'
import {
  CheckCircle,
  Plus,
  Search,
  Layers,
  Home,
  ArrowRight,
  LayoutGrid,
  Settings,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { TaskTemplatesModal } from '@/components/tasks-v2/TaskTemplatesModal'

interface AddTasksToFloorsModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: number
  towerId?: number
  onSuccess?: () => void
}

export function AddTasksToFloorsModal({
  isOpen,
  onClose,
  projectId,
  towerId,
  onSuccess
}: AddTasksToFloorsModalProps) {
  const { templates, loading: templatesLoading, refresh: refreshTemplates } = useTaskTemplates(projectId)
  const { floors, loading: floorsLoading } = useFloors(projectId)
  const { apartments } = useApartments()

  // States
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(new Set())
  const [applyMode, setApplyMode] = useState<'specific' | 'all'>('specific')
  const [selectedFloors, setSelectedFloors] = useState<Set<number>>(new Set())
  const [apartmentApplyMode, setApartmentApplyMode] = useState<'all' | 'specific'>('all')
  const [selectedApartments, setSelectedApartments] = useState<Set<number>>(new Set())
  const [availableApartments, setAvailableApartments] = useState<Array<{
    id: number;
    apartment_number: string;
    floor_id: number;
    floor_number?: number;
    tower_name?: string;
    existing_tasks?: string[]
  }>>([])
  const [loadingApartments, setLoadingApartments] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showManageTemplates, setShowManageTemplates] = useState(false)

  // Filter and sort floors
  const availableFloors = useMemo(() => {
    const filtered = towerId
      ? floors.filter(f => f.tower_id === towerId)
      : floors

    return [...filtered].sort((a, b) => {
      const numA = Number(a.floor_number) || 0
      const numB = Number(b.floor_number) || 0
      if (numA !== numB) return numA - numB
      return a.id - b.id
    })
  }, [floors, towerId])

  const availableFloorIds = useMemo(() => availableFloors.map(f => f.id), [availableFloors])

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplates(new Set())
      setSelectedFloors(new Set())
      setSelectedApartments(new Set())
      setApplyMode('specific')
      setApartmentApplyMode('all')
      setAvailableApartments([])
      setSearchTerm('')
    }
  }, [isOpen])

  // Load apartments logic (copied from original with tweaks)
  useEffect(() => {
    const loadApartments = async () => {
      if (selectedFloors.size === 0 && applyMode === 'all') {
        if (availableFloorIds.length === 0) {
          setAvailableApartments([])
          setLoadingApartments(false)
          return
        }

        setLoadingApartments(true)
        try {
          const { data, error } = await supabase
            .from('apartments')
            .select(`
              id,
              apartment_number,
              floor_id,
              floors!inner (
                floor_number,
                towers!inner (
                  name,
                  tower_number
                )
              )
            `)
            .in('floor_id', availableFloorIds)
            .eq('is_active', true)
            .order('apartment_number', { ascending: true })

          if (error) throw error

          const apartmentIds = (data || []).map((apt: any) => apt.id)

          const { data: tasksData } = await supabase
            .from('tasks')
            .select('apartment_id, task_name')
            .in('apartment_id', apartmentIds)
            .eq('is_deleted', false)

          const tasksByApartment: Record<number, string[]> = {}
          if (tasksData) {
            tasksData.forEach((task: any) => {
              if (!tasksByApartment[task.apartment_id]) tasksByApartment[task.apartment_id] = []
              tasksByApartment[task.apartment_id].push(task.task_name)
            })
          }

          const processed = (data || []).map((apt: any) => ({
            id: apt.id,
            apartment_number: apt.apartment_number,
            floor_id: apt.floor_id,
            floor_number: apt.floors?.floor_number,
            tower_name: apt.floors?.towers?.name || `Torre ${apt.floors?.towers?.tower_number || ''}`,
            existing_tasks: tasksByApartment[apt.id] || []
          }))

          setAvailableApartments(sortApartments(processed))
        } catch (err) {
          console.error('Error loading apartments:', err)
          setAvailableApartments([])
        } finally {
          setLoadingApartments(false)
        }
      } else if (selectedFloors.size > 0) {
        setLoadingApartments(true)
        try {
          const { data, error } = await supabase
            .from('apartments')
            .select(`
              id,
              apartment_number,
              floor_id,
              floors!inner (
                floor_number,
                towers!inner (
                  name,
                  tower_number
                )
              )
            `)
            .in('floor_id', Array.from(selectedFloors))
            .eq('is_active', true)
            .order('apartment_number', { ascending: true })

          if (error) throw error

          const apartmentIds = (data || []).map((apt: any) => apt.id)

          const { data: tasksData } = await supabase
            .from('tasks')
            .select('apartment_id, task_name')
            .in('apartment_id', apartmentIds)
            .eq('is_deleted', false)

          const tasksByApartment: Record<number, string[]> = {}
          if (tasksData) {
            tasksData.forEach((task: any) => {
              if (!tasksByApartment[task.apartment_id]) tasksByApartment[task.apartment_id] = []
              tasksByApartment[task.apartment_id].push(task.task_name)
            })
          }

          const processed = (data || []).map((apt: any) => ({
            id: apt.id,
            apartment_number: apt.apartment_number,
            floor_id: apt.floor_id,
            floor_number: apt.floors?.floor_number,
            tower_name: apt.floors?.towers?.name || `Torre ${apt.floors?.towers?.tower_number || ''}`,
            existing_tasks: tasksByApartment[apt.id] || []
          }))

          setAvailableApartments(sortApartments(processed))
        } catch (err) {
          console.error('Error loading apartments:', err)
          setAvailableApartments([])
        } finally {
          setLoadingApartments(false)
        }
      } else {
        setAvailableApartments([])
      }
    }

    if (applyMode === 'all' || selectedFloors.size > 0) {
      loadApartments()
    } else {
      setAvailableApartments([])
      setLoadingApartments(false)
    }
  }, [selectedFloors, applyMode, availableFloorIds])

  const sortApartments = (list: any[]) => {
    return list.sort((a, b) => {
      const extractNumber = (str: string): number => {
        const numbers = str.match(/\d+/g)
        if (!numbers || numbers.length === 0) return 0
        return parseInt(numbers[numbers.length - 1]) || 0
      }
      const numA = extractNumber(a.apartment_number)
      const numB = extractNumber(b.apartment_number)
      if (numA !== numB) return numA - numB
      return a.apartment_number.localeCompare(b.apartment_number)
    })
  }

  const toggleTemplate = (templateId: number) => {
    setSelectedTemplates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(templateId)) newSet.delete(templateId)
      else newSet.add(templateId)
      return newSet
    })
  }

  const toggleFloor = (floorId: number) => {
    setSelectedFloors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(floorId)) newSet.delete(floorId)
      else newSet.add(floorId)
      return newSet
    })
    setSelectedApartments(new Set())
  }

  const toggleApartment = (apartmentId: number) => {
    setSelectedApartments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(apartmentId)) newSet.delete(apartmentId)
      else newSet.add(apartmentId)
      return newSet
    })
  }

  const selectAllFilteredTemplates = () => {
    const ids = filteredTemplates.map(t => t.id)
    setSelectedTemplates(prev => {
      const newSet = new Set(prev)
      ids.forEach(id => newSet.add(id))
      return newSet
    })
  }

  const deselectAllFilteredTemplates = () => {
    const ids = filteredTemplates.map(t => t.id)
    setSelectedTemplates(prev => {
      const newSet = new Set(prev)
      ids.forEach(id => newSet.delete(id))
      return newSet
    })
  }

  const handleSubmit = async () => {
    if (selectedTemplates.size === 0) {
      toast.error('Por favor, seleccione al menos una tarea.')
      return
    }

    if (applyMode === 'specific' && selectedFloors.size === 0) {
      toast.error('Por favor, seleccione al menos un piso.')
      return
    }

    if (apartmentApplyMode === 'specific' && selectedApartments.size === 0) {
      toast.error('Por favor, seleccione al menos un departamento.')
      return
    }

    try {
      setSubmitting(true)

      let apartmentsToUse: Array<{ id: number }>

      if (apartmentApplyMode === 'specific') {
        apartmentsToUse = Array.from(selectedApartments).map(id => ({ id }))
      } else {
        const floorsToUse = applyMode === 'all'
          ? availableFloors.map(f => f.id)
          : Array.from(selectedFloors)

        const { data: allApartments, error: apartmentsError } = await supabase
          .from('apartments')
          .select('id')
          .in('floor_id', floorsToUse)
          .eq('is_active', true)

        if (apartmentsError) throw apartmentsError

        if (!allApartments || allApartments.length === 0) {
          toast.error('No hay departamentos en los pisos seleccionados.')
          return
        }

        apartmentsToUse = allApartments
      }

      const tasksToCreate = []
      for (const apartment of apartmentsToUse) {
        for (const templateId of selectedTemplates) {
          const template = templates.find(t => t.id === templateId)
          if (template) {
            tasksToCreate.push({
              apartment_id: apartment.id,
              task_name: template.name,
              task_description: null,
              task_category: template.category,
              status: 'pending',
              priority: template.priority || 'medium',
              total_budget: 0,
              estimated_hours: template.estimated_hours || 8
            })
          }
        }
      }

      if (tasksToCreate.length > 0) {
        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToCreate)

        if (tasksError) throw tasksError
      }

      const totalTasks = tasksToCreate.length
      const totalApartments = apartmentsToUse.length
      const floorsToUse = applyMode === 'all'
        ? availableFloors.map(f => f.id)
        : Array.from(selectedFloors)
      const totalFloors = floorsToUse.length

      toast.success(`✅ Se crearon ${totalTasks} tareas en ${totalApartments} departamento(s) de ${totalFloors} piso(s).`)

      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error creating tasks:', err)
      toast.error('Error al crear las tareas. Por favor, intente nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const activeTemplates = templates.filter(t => t.is_active)
  const filteredTemplates = activeTemplates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleTemplateModalClose = () => {
    setShowManageTemplates(false)
    refreshTemplates()
  }

  return (
    <>
      <ModalV2
        isOpen={isOpen}
        onClose={onClose}
        title="Asignación Masiva de Tareas"
        size="2xl"
        headerRight={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowManageTemplates(true)}
            className="flex items-center gap-2 text-xs border-slate-600 text-slate-300 hover:text-white hover:border-blue-500"
          >
            <Settings className="w-3.5 h-3.5" />
            Gestionar Plantillas
          </Button>
        }
      >
        <div className="flex flex-col h-full bg-slate-900 rounded-lg">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden min-h-[500px]">
            {/* Panel Izquierdo: Selección de Plantillas */}
            <div className="lg:col-span-5 border-r border-slate-700 bg-slate-800/50 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-white font-medium flex items-center gap-2 mb-3">
                  <LayoutGrid className="w-4 h-4 text-blue-400" />
                  Seleccionar Tareas
                  <span className="ml-auto text-xs font-normal text-slate-400">
                    {selectedTemplates.size} selec.
                  </span>
                </h3>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar plantillas..."
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 text-xs">
                  <button onClick={selectAllFilteredTemplates} className="text-blue-400 hover:text-blue-300">
                    Todas
                  </button>
                  <span className="text-slate-600">|</span>
                  <button onClick={deselectAllFilteredTemplates} className="text-slate-400 hover:text-slate-300">
                    Ninguna
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {templatesLoading ? (
                  <div className="p-4 text-center text-slate-500 text-sm">Cargando...</div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">No se encontraron tareas</div>
                ) : (
                  filteredTemplates.map(template => {
                    const isSelected = selectedTemplates.has(template.id)
                    return (
                      <div
                        key={template.id}
                        onClick={() => toggleTemplate(template.id)}
                        className={`
                          p-3 rounded-lg cursor-pointer border transition-all duration-200 group
                          ${isSelected
                            ? 'bg-blue-600/10 border-blue-500/50 shadow-sm'
                            : 'bg-slate-800 border-slate-700 hover:border-slate-600 hover:bg-slate-700/50'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-500 group-hover:border-slate-400'
                            }`}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <div className={`text-sm font-medium transition-colors ${isSelected ? 'text-blue-200' : 'text-slate-200'}`}>
                              {template.name}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">
                                {template.category}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">
                                {template.estimated_hours}h
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Panel Derecho: Configuración de Destino */}
            <div className="lg:col-span-7 flex flex-col overflow-hidden bg-slate-900">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Definir Ubicación
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {/* Selección de Pisos */}
                <section>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">
                    1. Selección de Pisos
                  </label>
                  <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 mb-4 inline-flex">
                    <button
                      onClick={() => setApplyMode('specific')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${applyMode === 'specific' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      Seleccionar Específicos
                    </button>
                    <button
                      onClick={() => {
                        setApplyMode('all')
                        setSelectedFloors(new Set())
                        setSelectedApartments(new Set())
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${applyMode === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      Todos los Pisos
                    </button>
                  </div>

                  {applyMode === 'specific' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                      {availableFloors.map(floor => {
                        const isSelected = selectedFloors.has(floor.id)
                        return (
                          <div
                            key={floor.id}
                            onClick={() => toggleFloor(floor.id)}
                            className={`
                              p-2 rounded-md border text-center cursor-pointer transition-all text-sm
                              ${isSelected
                                ? 'bg-blue-900/30 border-blue-500/50 text-blue-200'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                              }
                            `}
                          >
                            Piso {floor.floor_number}
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {floor.apartments_count || 0} depts
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {applyMode === 'all' && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-slate-300 text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Se aplicará a <strong>{availableFloors.length} pisos</strong> del proyecto.
                    </div>
                  )}
                </section>

                <div className="border-t border-slate-800" />

                {/* Selección de Departamentos */}
                <section className={!(applyMode === 'all' || selectedFloors.size > 0) ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">
                    2. Selección de Departamentos
                  </label>

                  <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 mb-4 inline-flex">
                    <button
                      onClick={() => {
                        setApartmentApplyMode('all')
                        setSelectedApartments(new Set())
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${apartmentApplyMode === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      Todos en los pisos
                    </button>
                    <button
                      onClick={() => setApartmentApplyMode('specific')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${apartmentApplyMode === 'specific' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      Específicos
                    </button>
                  </div>

                  {loadingApartments ? (
                    <div className="py-8 text-center text-slate-500 text-sm animate-pulse">Cargando departamentos...</div>
                  ) : apartmentApplyMode === 'specific' ? (
                    availableApartments.length === 0 ? (
                      <div className="p-3 border border-dashed border-slate-700 rounded-lg text-slate-500 text-sm text-center">
                        Selecciona un piso primero
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {availableApartments.map(apt => {
                          const isSelected = selectedApartments.has(apt.id)
                          return (
                            <div
                              key={apt.id}
                              onClick={() => toggleApartment(apt.id)}
                              className={`
                                p-2 rounded-md border text-left cursor-pointer transition-all text-sm relative group
                                ${isSelected
                                  ? 'bg-purple-900/30 border-purple-500/50 text-purple-200'
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                                }
                              `}
                            >
                              <div className="font-medium">{apt.apartment_number}</div>
                              <div className="text-[10px] text-slate-500">Piso {apt.floor_number}</div>
                              {apt.existing_tasks && apt.existing_tasks.length > 0 && (
                                <div className="absolute top-2 right-2 flex gap-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Tiene tareas"></div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  ) : (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-slate-300 text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Se aplicará a <strong>{availableApartments.length} departamentos</strong> encontrados.
                    </div>
                  )}
                </section>
              </div>

              {/* Footer dentro del panel derecho */}
              <div className="p-4 border-t border-slate-700 bg-slate-800/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs text-slate-400">
                    <div>Resumen de asignación:</div>
                    <div className="text-slate-200 font-medium">
                      {selectedTemplates.size} tareas &rarr; {
                        apartmentApplyMode === 'all'
                          ? `${availableApartments.length} deptos`
                          : `${selectedApartments.size} deptos`
                      }
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={
                        submitting ||
                        selectedTemplates.size === 0 ||
                        (applyMode === 'specific' && selectedFloors.size === 0) ||
                        (apartmentApplyMode === 'specific' && selectedApartments.size === 0)
                      }
                      className="bg-blue-600 hover:bg-blue-500 text-white min-w-[120px]"
                    >
                      {submitting ? 'Asignando...' : 'Confirmar Asignación'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalV2>

      {/* Modal separado para gestionar plantillas */}
      <TaskTemplatesModal
        isOpen={showManageTemplates}
        onClose={handleTemplateModalClose}
        projectId={projectId}
      />
    </>
  )
}
