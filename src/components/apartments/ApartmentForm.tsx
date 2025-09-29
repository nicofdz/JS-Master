'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { X, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface ApartmentFormProps {
  apartment?: any
  onSubmit: (data: any) => void
  onCancel: () => void
  floors: any[]
  projects: any[]
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

    onSubmit(formData)
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
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Editar Apartamento</CardTitle>
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