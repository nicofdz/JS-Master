'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FLOOR_STATUSES } from '@/lib/constants'
import { useTowers } from '@/hooks/useTowers'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface FloorFormData {
  project_id: number
  tower_id: number
  floor_number: number
  status: string
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
  const [existingFloors, setExistingFloors] = useState<number[]>([])
  const [loadingFloors, setLoadingFloors] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setError,
    clearErrors
  } = useForm<FloorFormData>({
    defaultValues: floor ? {
      project_id: floor.project_id,
      tower_id: floor.tower_id,
      floor_number: floor.floor_number,
      status: floor.status,
      description: floor.description || ''
    } : {
      project_id: projectId || 0,
      tower_id: 0,
      status: 'pending'
    }
  })

  // Obtener el proyecto seleccionado y sus torres
  const selectedProjectId = watch('project_id')
  const selectedTowerId = watch('tower_id')
  const floorNumber = watch('floor_number')
  const { towers } = useTowers(selectedProjectId ? parseInt(selectedProjectId?.toString()) : undefined)
  const selectedProject = projects.find(p => p.id === parseInt(selectedProjectId?.toString() || '0'))
  
  // Filtrar solo proyectos activos
  const activeProjects = projects.filter(p => p.status === 'active')

  useEffect(() => {
    if (floor) {
      reset({
        project_id: floor.project_id,
        tower_id: floor.tower_id,
        floor_number: floor.floor_number,
        status: floor.status,
        description: floor.description || ''
      })
    }
  }, [floor, reset])

  // Cargar pisos existentes cuando se selecciona una torre
  useEffect(() => {
    const loadExistingFloors = async () => {
      if (!selectedTowerId || floor) {
        setExistingFloors([])
        return
      }

      setLoadingFloors(true)
      try {
        const { data, error } = await supabase
          .from('floors')
          .select('floor_number')
          .eq('tower_id', selectedTowerId)
          .eq('is_active', true)
          .order('floor_number', { ascending: true })

        if (error) throw error

        const floorNumbers = (data || []).map(f => f.floor_number)
        setExistingFloors(floorNumbers)
      } catch (error) {
        console.error('Error loading existing floors:', error)
        setExistingFloors([])
      } finally {
        setLoadingFloors(false)
      }
    }

    loadExistingFloors()
  }, [selectedTowerId, floor])

  // Validar que el número de piso no esté duplicado
  useEffect(() => {
    if (floorNumber !== undefined && floorNumber !== null && !isNaN(floorNumber) && selectedTowerId) {
      if (existingFloors.includes(floorNumber)) {
        setError('floor_number', {
          type: 'manual',
          message: `El piso ${floorNumber} ya existe en esta torre`
        })
      } else {
        clearErrors('floor_number')
      }
    }
  }, [floorNumber, existingFloors, selectedTowerId, setError, clearErrors])

  const handleFormSubmit = async (data: FloorFormData) => {
    setLoading(true)
    try {
      console.log('📝 Datos del formulario:', data)
      console.log('🔍 Validando datos...')
      
      // Validaciones adicionales
      if (!data.project_id) {
        throw new Error('Debe seleccionar un proyecto')
      }
      if (!data.tower_id) {
        throw new Error('Debe seleccionar una torre')
      }
      if (!data.floor_number || data.floor_number < 1) {
        throw new Error('El número de piso debe ser mayor a 0')
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
          {activeProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {errors.project_id && (
          <p className="mt-1 text-sm text-red-600">{errors.project_id.message}</p>
        )}
      </div>

      {/* Seleccionar Torre */}
      <div>
        <label htmlFor="tower_id" className="block text-sm font-medium text-gray-700 mb-2">
          Torre *
        </label>
        <select
          id="tower_id"
          {...register('tower_id', { 
            required: 'La torre es obligatoria',
            validate: (value) => value > 0 || 'Debe seleccionar una torre'
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
          disabled={!selectedProjectId || towers.length === 0}
        >
          <option value="">
            {!selectedProjectId 
              ? 'Primero selecciona un proyecto...' 
              : towers.length === 0 
                ? 'No hay torres disponibles'
                : 'Seleccionar torre...'}
          </option>
          {towers.map((tower) => (
            <option key={tower.id} value={tower.id}>
              {tower.name || `Torre ${tower.tower_number}`}
            </option>
          ))}
        </select>
        {errors.tower_id && (
          <p className="mt-1 text-sm text-red-600">{errors.tower_id.message}</p>
        )}
        {selectedProject && towers.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            El proyecto tiene {towers.length} torre(s) disponible(s)
          </p>
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
          {...register('floor_number', { 
            required: 'El número de piso es obligatorio',
            valueAsNumber: true,
            validate: (value) => {
              if (value === null || value === undefined || isNaN(value)) {
                return 'El número de piso es obligatorio'
              }
              if (!Number.isInteger(value)) {
                return 'El número de piso debe ser un número entero'
              }
              if (selectedTowerId && existingFloors.includes(value)) {
                return `El piso ${value} ya existe en esta torre`
              }
              return true
            }
          })}
          placeholder="Ej: -2, -1, 0, 1, 2, 3..."
          className={errors.floor_number ? 'border-red-500' : ''}
        />
        {errors.floor_number && (
          <p className="mt-1 text-sm text-red-600">{errors.floor_number.message}</p>
        )}
        {selectedTowerId && !loadingFloors && existingFloors.length > 0 && (
          <p className="mt-1 text-xs text-gray-600">
            Pisos ya creados en esta torre: <strong>{existingFloors.join(', ')}</strong>
          </p>
        )}
        {selectedTowerId && !loadingFloors && existingFloors.length === 0 && (
          <p className="mt-1 text-xs text-gray-500">
            No hay pisos creados en esta torre aún
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Usa números negativos para pisos subterráneos (ej: -1, -2) y positivos para pisos normales
        </p>
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
