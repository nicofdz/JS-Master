'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FLOOR_STATUSES } from '@/lib/constants'
import toast from 'react-hot-toast'

interface FloorFormData {
  project_id: number
  floor_number: number
  status: string
  total_apartments: number
  description?: string
}

interface FloorFormProps {
  floor?: any
  projectId?: number
  projects?: any[]
  onSubmit: (data: FloorFormData) => Promise<void>
  onCancel: () => void
}

export function FloorForm({ floor, projectId, projects = [], onSubmit, onCancel }: FloorFormProps) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FloorFormData>({
    defaultValues: floor ? {
      project_id: floor.project_id,
      floor_number: floor.floor_number,
      status: floor.status,
      total_apartments: floor.total_apartments || 0,
      description: floor.description || ''
    } : {
      project_id: projectId || 0,
      status: 'pending',
      total_apartments: 0
    }
  })

  useEffect(() => {
    if (floor) {
      reset({
        project_id: floor.project_id,
        floor_number: floor.floor_number,
        status: floor.status,
        total_apartments: floor.total_apartments || 0,
        description: floor.description || ''
      })
    }
  }, [floor, reset])

  const handleFormSubmit = async (data: FloorFormData) => {
    setLoading(true)
    try {
      console.log('📝 Datos del formulario:', data)
      console.log('🔍 Validando datos...')
      
      // Validaciones adicionales
      if (!data.project_id) {
        throw new Error('Debe seleccionar un proyecto')
      }
      if (!data.floor_number || data.floor_number < 1) {
        throw new Error('El número de piso debe ser mayor a 0')
      }
      if (!data.total_apartments || data.total_apartments < 1) {
        throw new Error('Debe especificar al menos 1 departamento')
      }
      
      console.log('✅ Datos válidos, enviando...')
      await onSubmit(data)
      console.log('🎉 Piso creado exitosamente')
    } catch (error) {
      console.error('💥 Error en el formulario:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Proyecto */}
      <div>
        <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-2">
          Proyecto *
        </label>
        <select
          id="project_id"
          {...register('project_id', { required: 'El proyecto es obligatorio' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        >
          <option value="">Seleccionar proyecto...</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} ({project.status})
            </option>
          ))}
        </select>
        {errors.project_id && (
          <p className="mt-1 text-sm text-red-600">{errors.project_id.message}</p>
        )}
      </div>

      {/* Número de Piso */}
      <div>
        <label htmlFor="floor_number" className="block text-sm font-medium text-gray-700 mb-2">
          Número de Piso *
        </label>
        <Input
          id="floor_number"
          type="number"
          min="1"
          {...register('floor_number', { 
            required: 'El número de piso es obligatorio',
            min: { value: 1, message: 'El número de piso debe ser mayor a 0' }
          })}
          placeholder="Ej: 1, 2, 3..."
          className={errors.floor_number ? 'border-red-500' : ''}
        />
        {errors.floor_number && (
          <p className="mt-1 text-sm text-red-600">{errors.floor_number.message}</p>
        )}
      </div>

      {/* Cantidad de Departamentos */}
      <div>
        <label htmlFor="total_apartments" className="block text-sm font-medium text-gray-700 mb-2">
          Cantidad de Departamentos *
        </label>
        <Input
          id="total_apartments"
          type="number"
          min="1"
          {...register('total_apartments', { 
            required: 'La cantidad de departamentos es obligatoria',
            min: { value: 1, message: 'Debe tener al menos 1 departamento' }
          })}
          placeholder="Ej: 4, 6, 8..."
          className={errors.total_apartments ? 'border-red-500' : ''}
        />
        {errors.total_apartments && (
          <p className="mt-1 text-sm text-red-600">{errors.total_apartments.message}</p>
        )}
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Descripción del Piso
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
          placeholder="Ej: Piso residencial con 4 departamentos de 3 habitaciones..."
        />
      </div>

      {/* Estado */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
          Estado *
        </label>
        <select
          id="status"
          {...register('status', { required: 'El estado es obligatorio' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        >
          {Object.entries(FLOOR_STATUSES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {errors.status && (
          <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
        )}
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Guardando...' : (floor ? 'Actualizar Piso' : 'Crear Piso')}
        </Button>
      </div>
    </form>
  )
}
