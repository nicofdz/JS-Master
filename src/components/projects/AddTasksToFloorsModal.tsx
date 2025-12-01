'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useTaskTemplates } from '@/hooks'
import { useFloors, useApartments } from '@/hooks'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

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
  const { templates, loading: templatesLoading, refresh: refreshTemplates, createTemplate, updateTemplate, deleteTemplate } = useTaskTemplates()
  const { floors, loading: floorsLoading } = useFloors(projectId)
  const { apartments } = useApartments()
  
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(new Set())
  const [applyMode, setApplyMode] = useState<'specific' | 'all'>('specific')
  const [selectedFloors, setSelectedFloors] = useState<Set<number>>(new Set())
  const [apartmentApplyMode, setApartmentApplyMode] = useState<'all' | 'specific'>('all')
  const [selectedApartments, setSelectedApartments] = useState<Set<number>>(new Set())
  const [availableApartments, setAvailableApartments] = useState<Array<{ id: number; apartment_number: string; floor_id: number; floor_number?: number; tower_name?: string; existing_tasks?: string[] }>>([])
  const [loadingApartments, setLoadingApartments] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Estados para el modal de crear/editar template
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<{ id: number; name: string; category: string; estimated_hours: number } | null>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: '',
    estimated_hours: 8
  })

  // Filtrar y ordenar pisos por torre si se especifica (memoizado para evitar re-renders infinitos)
  const availableFloors = useMemo(() => {
    const filtered = towerId 
      ? floors.filter(f => f.tower_id === towerId)
      : floors
    
    // Ordenar numéricamente por floor_number
    // Asegurarse de que floor_number sea tratado como número
    return [...filtered].sort((a, b) => {
      // floor_number debería ser siempre un número según el schema, pero por seguridad
      const numA = Number(a.floor_number) || 0
      const numB = Number(b.floor_number) || 0
      
      if (numA !== numB) {
        return numA - numB
      }
      
      // Si los números son iguales, ordenar por ID como fallback
      return a.id - b.id
    })
  }, [floors, towerId])

  // IDs de pisos disponibles (memoizado para usar en dependencias)
  const availableFloorIds = useMemo(() => {
    return availableFloors.map(f => f.id)
  }, [availableFloors])

  useEffect(() => {
    if (isOpen) {
      setSelectedTemplates(new Set())
      setSelectedFloors(new Set())
      setSelectedApartments(new Set())
      setApplyMode('specific')
      setApartmentApplyMode('all')
      setAvailableApartments([])
    }
  }, [isOpen])

  // Cargar departamentos cuando cambien los pisos seleccionados
  useEffect(() => {
    const loadApartments = async () => {
      if (selectedFloors.size === 0 && applyMode === 'all') {
        // Si es "todos los pisos", cargar todos los departamentos
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

          // Obtener IDs de departamentos para cargar tareas
          const apartmentIds = (data || []).map((apt: any) => apt.id)
          
          // Cargar tareas existentes de todos los departamentos (tasks V2)
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('apartment_id, task_name')
            .in('apartment_id', apartmentIds)
            .eq('is_deleted', false) // Excluir tareas eliminadas

          if (tasksError) {
            console.error('Error loading tasks:', tasksError)
          }

          // Agrupar tareas por departamento
          const tasksByApartment: Record<number, string[]> = {}
          if (tasksData) {
            tasksData.forEach((task: any) => {
              if (!tasksByApartment[task.apartment_id]) {
                tasksByApartment[task.apartment_id] = []
              }
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

          // Ordenar numéricamente por apartment_number (extraer número del string)
          const sorted = processed.sort((a, b) => {
            // Extraer números del apartment_number (ej: "A1 D-104" -> 104, "10" -> 10)
            const extractNumber = (str: string): number => {
              const numbers = str.match(/\d+/g)
              if (!numbers || numbers.length === 0) return 0
              // Usar el último número encontrado (generalmente el más relevante)
              return parseInt(numbers[numbers.length - 1]) || 0
            }
            
            const numA = extractNumber(a.apartment_number)
            const numB = extractNumber(b.apartment_number)
            
            if (numA !== numB) {
              return numA - numB
            }
            
            // Si los números son iguales, ordenar alfabéticamente
            return a.apartment_number.localeCompare(b.apartment_number)
          })

          setAvailableApartments(sorted)
        } catch (err) {
          console.error('Error loading apartments:', err)
          setAvailableApartments([])
        } finally {
          setLoadingApartments(false)
        }
      } else if (selectedFloors.size > 0) {
        // Si hay pisos específicos seleccionados
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

          // Obtener IDs de departamentos para cargar tareas
          const apartmentIds = (data || []).map((apt: any) => apt.id)
          
          // Cargar tareas existentes de todos los departamentos (tasks V2)
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('apartment_id, task_name')
            .in('apartment_id', apartmentIds)
            .eq('is_deleted', false) // Excluir tareas eliminadas

          if (tasksError) {
            console.error('Error loading tasks:', tasksError)
          }

          // Agrupar tareas por departamento
          const tasksByApartment: Record<number, string[]> = {}
          if (tasksData) {
            tasksData.forEach((task: any) => {
              if (!tasksByApartment[task.apartment_id]) {
                tasksByApartment[task.apartment_id] = []
              }
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

          // Ordenar numéricamente por apartment_number (extraer número del string)
          const sorted = processed.sort((a, b) => {
            // Extraer números del apartment_number (ej: "A1 D-104" -> 104, "10" -> 10)
            const extractNumber = (str: string): number => {
              const numbers = str.match(/\d+/g)
              if (!numbers || numbers.length === 0) return 0
              // Usar el último número encontrado (generalmente el más relevante)
              return parseInt(numbers[numbers.length - 1]) || 0
            }
            
            const numA = extractNumber(a.apartment_number)
            const numB = extractNumber(b.apartment_number)
            
            if (numA !== numB) {
              return numA - numB
            }
            
            // Si los números son iguales, ordenar alfabéticamente
            return a.apartment_number.localeCompare(b.apartment_number)
          })

          setAvailableApartments(sorted)
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

    // Solo cargar si hay condiciones válidas
    if (applyMode === 'all' || selectedFloors.size > 0) {
      loadApartments()
    } else {
      setAvailableApartments([])
      setLoadingApartments(false)
    }
  }, [selectedFloors, applyMode, availableFloorIds])

  // Categorías disponibles para las plantillas
  const categories = ['Estructura', 'Carpintería', 'Pisos', 'Terminaciones', 'Instalaciones', 'Acabados', 'Otros']

  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null)
    setTemplateForm({ name: '', category: '', estimated_hours: 8 })
    setShowTemplateModal(true)
  }

  const handleOpenEditTemplate = (template: { id: number; name: string; category: string; estimated_hours: number }) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      category: template.category,
      estimated_hours: template.estimated_hours
    })
    setShowTemplateModal(true)
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!templateForm.name.trim() || !templateForm.category.trim()) {
      toast.error('Por favor, complete todos los campos requeridos')
      return
    }

    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateForm)
        toast.success('Plantilla actualizada exitosamente')
      } else {
        await createTemplate(templateForm)
        toast.success('Plantilla creada exitosamente')
      }
      
      await refreshTemplates()
      setShowTemplateModal(false)
      setEditingTemplate(null)
      setTemplateForm({ name: '', category: '', estimated_hours: 8 })
    } catch (err: any) {
      console.error('Error saving template:', err)
      toast.error(err.message || 'Error al guardar la plantilla')
    }
  }

  const handleDeleteTemplate = async (templateId: number, templateName: string) => {
    if (!confirm(`¿Está seguro de eliminar la plantilla "${templateName}"?`)) {
      return
    }

    try {
      await deleteTemplate(templateId)
      toast.success('Plantilla eliminada exitosamente')
      await refreshTemplates()
      // Remover de seleccionados si estaba seleccionada
      setSelectedTemplates(prev => {
        const newSet = new Set(prev)
        newSet.delete(templateId)
        return newSet
      })
    } catch (err: any) {
      console.error('Error deleting template:', err)
      toast.error(err.message || 'Error al eliminar la plantilla')
    }
  }

  const toggleTemplate = (templateId: number) => {
    setSelectedTemplates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(templateId)) {
        newSet.delete(templateId)
      } else {
        newSet.add(templateId)
      }
      return newSet
    })
  }

  const toggleFloor = (floorId: number) => {
    setSelectedFloors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(floorId)) {
        newSet.delete(floorId)
      } else {
        newSet.add(floorId)
      }
      return newSet
    })
    // Limpiar selección de departamentos cuando cambian los pisos
    setSelectedApartments(new Set())
  }

  const toggleApartment = (apartmentId: number) => {
    setSelectedApartments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(apartmentId)) {
        newSet.delete(apartmentId)
      } else {
        newSet.add(apartmentId)
      }
      return newSet
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

      // Determinar qué departamentos usar
      let apartmentsToUse: Array<{ id: number }>
      
      if (apartmentApplyMode === 'specific') {
        // Usar solo los departamentos seleccionados
        apartmentsToUse = Array.from(selectedApartments).map(id => ({ id }))
      } else {
        // Usar todos los departamentos de los pisos seleccionados
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

      // Crear tareas para cada departamento (tasks V2)
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
              priority: 'medium',
              total_budget: 0, // Sin trabajadores asignados inicialmente
              estimated_hours: template.estimated_hours || 8
            })
          }
        }
      }

      // Insertar todas las tareas en batch (tasks V2)
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agregar Tareas a Pisos"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selección de Tareas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Seleccionar Tareas *
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenCreateTemplate}
              className="flex items-center gap-1 text-xs"
            >
              <Plus className="w-3 h-3" />
              Nueva Plantilla
            </Button>
          </div>
          <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
            {templatesLoading ? (
              <p className="text-gray-500 text-center py-4">Cargando tareas...</p>
            ) : activeTemplates.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay tareas disponibles</p>
            ) : (
              activeTemplates.map(template => (
                <div
                  key={template.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded group"
                >
                  <input
                    type="checkbox"
                    checked={selectedTemplates.has(template.id)}
                    onChange={() => toggleTemplate(template.id)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-sm text-gray-500">
                      {template.category} • {template.estimated_hours || 8} horas estimadas
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenEditTemplate(template)
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Editar plantilla"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTemplate(template.id, template.name)
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar plantilla"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {selectedTemplates.size > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              {selectedTemplates.size} tarea(s) seleccionada(s)
            </p>
          )}
        </div>

        {/* Modo de Aplicación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Aplicar a:
          </label>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="applyMode"
                value="specific"
                checked={applyMode === 'specific'}
                onChange={() => {
                  setApplyMode('specific')
                  // Limpiar selección de departamentos cuando cambia el modo de pisos
                  setSelectedApartments(new Set())
                }}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-medium text-gray-900">Pisos específicos</div>
                <div className="text-sm text-gray-500">Seleccione los pisos donde aplicar las tareas</div>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="applyMode"
                value="all"
                checked={applyMode === 'all'}
                onChange={() => {
                  setApplyMode('all')
                  // Limpiar selección de pisos cuando se cambia a "Todos los pisos"
                  setSelectedFloors(new Set())
                  // También limpiar selección de departamentos
                  setSelectedApartments(new Set())
                }}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-medium text-gray-900">Todos los pisos</div>
                <div className="text-sm text-gray-500">
                  Aplicar a todos los pisos {towerId ? 'de esta torre' : 'del proyecto'} ({availableFloors.length} piso(s))
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Selección de Pisos (solo si modo específico) */}
        {applyMode === 'specific' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Seleccionar Pisos *
            </label>
            {floorsLoading ? (
              <p className="text-gray-500 text-center py-4">Cargando pisos...</p>
            ) : availableFloors.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay pisos disponibles</p>
            ) : (
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                {availableFloors.map(floor => (
                  <label
                    key={floor.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFloors.has(floor.id)}
                      onChange={() => toggleFloor(floor.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        Piso {floor.floor_number} {floor.tower_name ? `- ${floor.tower_name}` : ''}
                      </div>
                      <div className="text-sm text-gray-500">
                        {floor.apartments_count || 0} departamento(s)
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {selectedFloors.size > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                {selectedFloors.size} piso(s) seleccionado(s)
              </p>
            )}
          </div>
        )}

        {/* Modo de Aplicación de Departamentos */}
        {(applyMode === 'all' || selectedFloors.size > 0) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Aplicar a Departamentos:
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="apartmentApplyMode"
                  value="all"
                  checked={apartmentApplyMode === 'all'}
                  onChange={() => {
                    setApartmentApplyMode('all')
                    setSelectedApartments(new Set())
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-900">Todos los departamentos</div>
                  <div className="text-sm text-gray-500">
                    Aplicar a todos los departamentos de los pisos seleccionados ({availableApartments.length} departamento(s))
                  </div>
                </div>
              </label>

              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="apartmentApplyMode"
                  value="specific"
                  checked={apartmentApplyMode === 'specific'}
                  onChange={() => {
                    setApartmentApplyMode('specific')
                    // No limpiar selectedApartments aquí, permitir que el usuario seleccione
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-900">Departamentos específicos</div>
                  <div className="text-sm text-gray-500">Seleccione los departamentos donde aplicar las tareas</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Selección de Departamentos (solo si modo específico) */}
        {apartmentApplyMode === 'specific' && (applyMode === 'all' || selectedFloors.size > 0) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Seleccionar Departamentos *
            </label>
            {loadingApartments ? (
              <p className="text-gray-500 text-center py-4">Cargando departamentos...</p>
            ) : availableApartments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay departamentos disponibles en los pisos seleccionados</p>
            ) : (
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                {availableApartments.map(apartment => (
                  <label
                    key={apartment.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedApartments.has(apartment.id)}
                      onChange={() => toggleApartment(apartment.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        Dpto. {apartment.apartment_number}
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        Piso {apartment.floor_number} {apartment.tower_name ? `- ${apartment.tower_name}` : ''}
                      </div>
                      {apartment.existing_tasks && apartment.existing_tasks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {apartment.existing_tasks.map((taskName, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                            >
                              {taskName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {selectedApartments.size > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                {selectedApartments.size} departamento(s) seleccionado(s)
              </p>
            )}
          </div>
        )}

        {/* Resumen */}
        {selectedTemplates.size > 0 && (
          <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-slate-100 mb-1">Resumen</div>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>• {selectedTemplates.size} tarea(s) seleccionada(s)</p>
                  <p>• Se aplicarán a {applyMode === 'all' ? `todos los ${availableFloors.length} piso(s)` : `${selectedFloors.size} piso(s) seleccionado(s)`}</p>
                  <p>• Departamentos: {apartmentApplyMode === 'all' ? `todos los departamentos (${availableApartments.length})` : `${selectedApartments.size} departamento(s) seleccionado(s)`}</p>
                  <p>• Las tareas se crearán con estado &quot;Pendiente&quot;</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting || selectedTemplates.size === 0 || (applyMode === 'specific' && selectedFloors.size === 0) || (apartmentApplyMode === 'specific' && selectedApartments.size === 0)}
          >
            {submitting ? 'Creando Tareas...' : 'Aplicar Tareas'}
          </Button>
        </div>
      </form>

      {/* Modal para crear/editar plantilla */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false)
          setEditingTemplate(null)
          setTemplateForm({ name: '', category: '', estimated_hours: 8 })
        }}
        title={editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
        size="md"
      >
        <form onSubmit={handleSaveTemplate} className="space-y-4">
          <Input
            label="Nombre de la Tarea"
            value={templateForm.name}
            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
            required
            placeholder="Ej: Tabiques, Instalación de puertas..."
          />

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Categoría *
            </label>
            <Select
              value={templateForm.category}
              onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
              required
            >
              <option value="">Seleccionar categoría</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>

          <Input
            label="Horas Estimadas"
            type="number"
            min="1"
            value={templateForm.estimated_hours}
            onChange={(e) => setTemplateForm({ ...templateForm, estimated_hours: parseInt(e.target.value) || 8 })}
            required
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTemplateModal(false)
                setEditingTemplate(null)
                setTemplateForm({ name: '', category: '', estimated_hours: 8 })
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingTemplate ? 'Actualizar' : 'Crear'} Plantilla
            </Button>
          </div>
        </form>
      </Modal>
    </Modal>
  )
}

