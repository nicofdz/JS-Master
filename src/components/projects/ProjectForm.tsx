'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PROJECT_STATUSES } from '@/lib/constants'
import toast from 'react-hot-toast'

interface ProjectFormData {
  name: string
  address?: string
  total_floors?: number
  start_date?: string
  estimated_completion?: string
  status: string
  budget?: number
  plan_pdf?: FileList
}

interface ProjectFormProps {
  project?: any
  onSubmit: (data: ProjectFormData) => Promise<void>
  onCancel: () => void
}

export function ProjectForm({ project, onSubmit, onCancel }: ProjectFormProps) {
  const [loading, setLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ProjectFormData>({
    defaultValues: project ? {
      name: project.name,
      address: project.address || '',
      total_floors: project.total_floors || undefined,
      start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
      estimated_completion: project.estimated_completion ? new Date(project.estimated_completion).toISOString().split('T')[0] : '',
      status: project.status,
      budget: project.budget || undefined
    } : {
      status: 'active'
    }
  })

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        address: project.address || '',
        total_floors: project.total_floors || undefined,
        start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
        estimated_completion: project.estimated_completion ? new Date(project.estimated_completion).toISOString().split('T')[0] : '',
        status: project.status,
        budget: project.budget || undefined
      })
    }
  }, [project, reset])

  const handleFormSubmit = async (data: ProjectFormData) => {
    setLoading(true)
    try {
      // Separar el archivo del resto de los datos
      const { plan_pdf, ...projectData } = data
      
      // Si hay un archivo, lo agregamos a los datos
      if (plan_pdf && plan_pdf.length > 0) {
        (projectData as any).plan_pdf = plan_pdf[0]
      }
      
      await onSubmit(projectData)
      toast.success(project ? 'Proyecto actualizado exitosamente' : 'Proyecto creado exitosamente')
      onCancel()
    } catch (error) {
      toast.error('Error al guardar el proyecto')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Nombre del proyecto */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Nombre del Proyecto *
        </label>
        <Input
          id="name"
          {...register('name', { 
            required: 'El nombre del proyecto es obligatorio',
            minLength: { value: 3, message: 'El nombre debe tener al menos 3 caracteres' }
          })}
          placeholder="Ej: Edificio Residencial Las Torres"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Dirección */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
          Dirección
        </label>
        <Input
          id="address"
          {...register('address')}
          placeholder="Ej: Av. Principal 123, Ciudad"
        />
      </div>

      {/* Pisos y Departamentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="total_floors" className="block text-sm font-medium text-gray-700 mb-2">
            Total de Pisos
          </label>
          <Input
            id="total_floors"
            type="number"
            min="1"
            {...register('total_floors', {
              min: { value: 1, message: 'Debe tener al menos 1 piso' }
            })}
            placeholder="Ej: 15"
            className={errors.total_floors ? 'border-red-500' : ''}
          />
          {errors.total_floors && (
            <p className="mt-1 text-sm text-red-600">{errors.total_floors.message}</p>
          )}
        </div>

      </div>

      {/* Fechas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Inicio
          </label>
          <Input
            id="start_date"
            type="date"
            {...register('start_date')}
          />
        </div>

        <div>
          <label htmlFor="estimated_completion" className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Finalización Estimada
          </label>
          <Input
            id="estimated_completion"
            type="date"
            {...register('estimated_completion')}
          />
        </div>
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
          {Object.entries(PROJECT_STATUSES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {errors.status && (
          <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
        )}
      </div>

      {/* Plano del Proyecto */}
      <div>
        <label htmlFor="plan_pdf" className="block text-sm font-medium text-gray-700 mb-2">
          Plano del Proyecto (Opcional)
        </label>
        <input
          id="plan_pdf"
          type="file"
          accept=".pdf"
          {...register('plan_pdf')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        />
        <p className="mt-1 text-xs text-gray-500">
          Sube un archivo PDF con los planos del proyecto (máximo 50MB)
        </p>
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
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {project ? 'Actualizando...' : 'Creando...'}
            </>
          ) : (
            project ? 'Actualizar Proyecto' : 'Crear Proyecto'
          )}
        </Button>
      </div>
    </form>
  )
}
