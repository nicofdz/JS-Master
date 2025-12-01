'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { X, Save, Plus, Trash2 } from 'lucide-react'
import { useTaskTemplates } from '@/hooks/useTaskTemplates'
import toast from 'react-hot-toast'

interface ApartmentFormProps {
  apartment?: any
  onSubmit: (data: any) => void
  onCancel: () => void
  floors: any[]
  projects: any[]
}

interface SelectedTask {
  id: string // ID temporal para el componente
  templateId: number
  name: string
  category: string
  estimated_hours: number
}

export function ApartmentForm({ apartment, onSubmit, onCancel, floors, projects }: ApartmentFormProps) {
  const [formData, setFormData] = useState({
    apartment_number: '',
    apartment_type: '',
    area: '',
    notes: '',
    floor_id: 0
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedTasks, setSelectedTasks] = useState<SelectedTask[]>([])
  const { templates, loading: templatesLoading } = useTaskTemplates()

  useEffect(() => {
    if (apartment) {
      setFormData({
        apartment_number: apartment.apartment_number || '',
        apartment_type: apartment.apartment_type || '',
        area: apartment.area || '',
        notes: apartment.notes || '',
        floor_id: apartment.floor_id || 0
      })
    }
  }, [apartment])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.apartment_number.trim()) {
      newErrors.apartment_number = 'El nombre del apartamento es requerido'
    }

    if (!formData.apartment_type.trim()) {
      newErrors.apartment_type = 'El tipo de apartamento es requerido'
    }

    if (!formData.area.trim()) {
      newErrors.area = 'El área es requerida'
    }

    // El proyecto se valida a través del piso seleccionado

    if (!formData.floor_id) {
      newErrors.floor_id = 'El piso es requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario')
      return
    }

    // Incluir las tareas seleccionadas en los datos del formulario
    onSubmit({
      ...formData,
      selectedTasks: selectedTasks
    })
  }

  const handleAddTask = () => {
    // Agregar una tarea vacía para seleccionar
    const newTask: SelectedTask = {
      id: Date.now().toString(),
      templateId: 0,
      name: '',
      category: '',
      estimated_hours: 0
    }
    setSelectedTasks([...selectedTasks, newTask])
  }

  const handleSelectTask = (taskId: string, templateId: number) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    setSelectedTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? {
              ...task,
              templateId: template.id,
              name: template.name,
              category: template.category,
              estimated_hours: template.estimated_hours
            }
          : task
      )
    )
  }

  const handleRemoveTask = (taskId: string) => {
    setSelectedTasks(prev => prev.filter(task => task.id !== taskId))
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Filtrar pisos por proyecto seleccionado (usando el estado local)
  const [selectedProjectId, setSelectedProjectId] = useState<number>(0)
  
  const availableFloors = floors.filter(floor => 
    selectedProjectId === 0 || floor.project_id === selectedProjectId
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>{apartment ? 'Editar Apartamento' : 'Crear Nuevo Apartamento'}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proyecto
              </label>
              <Select
                value={selectedProjectId}
                onChange={(e) => {
                  const projectId = parseInt(e.target.value)
                  setSelectedProjectId(projectId)
                  setFormData(prev => ({ ...prev, floor_id: 0 })) // Reset floor when project changes
                }}
              >
                <option value={0}>Seleccionar proyecto</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Piso
              </label>
              <Select
                value={formData.floor_id}
                onChange={(e) => handleInputChange('floor_id', parseInt(e.target.value))}
                className={errors.floor_id ? 'border-red-500' : ''}
                disabled={selectedProjectId === 0}
              >
                <option value={0}>
                  {selectedProjectId === 0 ? 'Selecciona un proyecto primero' : 'Seleccionar piso'}
                </option>
                {availableFloors.map(floor => (
                  <option key={floor.id} value={floor.id}>
                    Piso {floor.floor_number}
                  </option>
                ))}
              </Select>
              {errors.floor_id && (
                <p className="text-red-500 text-xs mt-1">{errors.floor_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Apartamento
              </label>
              <Input
                type="text"
                value={formData.apartment_number}
                onChange={(e) => handleInputChange('apartment_number', e.target.value)}
                className={errors.apartment_number ? 'border-red-500' : ''}
                placeholder="Ej: B1, B4, A1, etc."
              />
              {errors.apartment_number && (
                <p className="text-red-500 text-xs mt-1">{errors.apartment_number}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Apartamento
              </label>
              <Input
                type="text"
                value={formData.apartment_type}
                onChange={(e) => handleInputChange('apartment_type', e.target.value)}
                className={errors.apartment_type ? 'border-red-500' : ''}
                placeholder="Ej: 2 dormitorios, 3 dormitorios, etc."
              />
              {errors.apartment_type && (
                <p className="text-red-500 text-xs mt-1">{errors.apartment_type}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área (m²)
              </label>
              <Input
                type="number"
                value={formData.area}
                onChange={(e) => handleInputChange('area', e.target.value)}
                className={errors.area ? 'border-red-500' : ''}
                placeholder="Ej: 85, 120, etc."
              />
              {errors.area && (
                <p className="text-red-500 text-xs mt-1">{errors.area}</p>
              )}
            </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Notas adicionales sobre el apartamento..."
                rows={3}
              />
            </div>

            {/* Sección de Tareas */}
            {!apartment && (
              <div className="border-t border-slate-600 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-slate-300">
                    Tareas a generar (opcional)
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTask}
                    disabled={templatesLoading}
                    className="flex items-center gap-1 bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 border border-blue-600"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Tarea
                  </Button>
                </div>

                {selectedTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No se agregarán tareas automáticamente. Puedes agregar tareas después de crear el apartamento.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex gap-2 items-center bg-slate-700/50 p-2 rounded border border-slate-600"
                      >
                        <Select
                          value={task.templateId}
                          onChange={(e) => handleSelectTask(task.id, parseInt(e.target.value))}
                          className="flex-1 text-sm"
                        >
                          <option value={0}>Seleccionar tarea...</option>
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name} ({template.category})
                            </option>
                          ))}
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTask(task.id)}
                          className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {selectedTasks.length > 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    {selectedTasks.filter(t => t.templateId > 0).length} tarea(s) seleccionada(s)
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Guardar</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}