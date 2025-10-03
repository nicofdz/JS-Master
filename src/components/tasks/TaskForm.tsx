'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ACTIVITY_STATUSES } from '@/lib/constants'
import toast from 'react-hot-toast'

interface TaskFormData {
  apartment_id: number
  task_name: string
  task_description?: string
  task_category: string
  status: string
  priority: string
  estimated_hours?: number
  worker_payment?: number
  assigned_to?: number | null
  start_date?: string
  end_date?: string
  completed_at?: string
  notes?: string
}

interface TaskFormProps {
  task?: any
  apartmentId?: number
  apartments?: any[]
  users?: any[]
  projects?: any[]
  floors?: any[]
  onSubmit: (data: TaskFormData) => Promise<void>
  onCancel: () => void
}

export function TaskForm({ task, apartmentId, apartments = [], users = [], projects = [], floors = [], onSubmit, onCancel }: TaskFormProps) {
  const [loading, setLoading] = useState(false)
  
  // Inicializar estados basándose en la tarea si existe
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    task?.project_id || null
  )
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(
    task?.floor_id || null
  )

  // Encontrar el apartamento seleccionado para pre-seleccionar datos
  const selectedApartment = apartments.find(apt => apt.id === (task?.apartment_id || apartmentId))
  const selectedFloor = selectedApartment ? floors.find(floor => floor.id === selectedApartment.floor_id) : null
  const selectedProject = selectedFloor ? projects.find(project => project.id === selectedFloor.project_id) : null

  // Debug logs
  console.log('🔍 TaskForm Debug:', {
    apartmentId,
    selectedApartment,
    selectedFloor,
    selectedProject,
    apartments: apartments.length,
    floors: floors.length,
    projects: projects.length
  })

  // Debug adicional para ver la estructura de los datos
  if (apartments.length > 0) {
    console.log('📊 Apartments sample:', apartments[0])
  }
  if (floors.length > 0) {
    console.log('🏢 Floors sample:', floors[0])
  }
  if (projects.length > 0) {
    console.log('🏗️ Projects sample:', projects[0])
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<TaskFormData>({
    defaultValues: task ? {
      apartment_id: task.apartment_id,
      task_name: task.task_name,
      task_description: task.task_description || '',
      task_category: task.task_category || 'Estructura',
      status: task.status,
      priority: task.priority,
      estimated_hours: task.estimated_hours || 0,
      worker_payment: task.worker_payment || 0,
      assigned_to: task.assigned_to || null,
      start_date: task.start_date || '',
      end_date: task.end_date || '',
      completed_at: task.completed_at ? new Date(task.completed_at).toISOString().split('T')[0] : '',
      notes: task.notes || ''
    } : {
      apartment_id: apartmentId || 0,
      status: 'pending',
      priority: 'medium',
      task_category: 'Estructura',
      estimated_hours: 0,
      worker_payment: 0,
      assigned_to: null,
      start_date: '',
      end_date: '',
      completed_at: ''
    }
  })

  const watchedApartmentId = watch('apartment_id')

  // Inicializar valores cuando se abre el formulario para crear una nueva tarea
  useEffect(() => {
    console.log('🔄 TaskForm useEffect:', {
      task: !!task,
      apartmentId,
      selectedApartment: !!selectedApartment,
      selectedFloor: !!selectedFloor,
      selectedProject: !!selectedProject
    })
    
    if (!task && apartmentId && selectedApartment && selectedFloor && selectedProject) {
      console.log('✅ Inicializando TaskForm con datos del apartamento')
      setSelectedProjectId(selectedProject.id)
      setSelectedFloorId(selectedFloor.id)
      reset({
        apartment_id: apartmentId,
        status: 'pending',
        priority: 'medium',
        task_category: 'Estructura',
        estimated_hours: 0,
        worker_payment: 0,
        assigned_to: null
      })
    }
  }, [task, apartmentId, selectedApartment, selectedFloor, selectedProject, reset])

  // Filtrar pisos por proyecto seleccionado
  const availableFloors = floors.filter(floor => 
    !selectedProjectId || floor.project_id === selectedProjectId
  )

  // Filtrar apartamentos por piso seleccionado
  const availableApartments = apartments.filter(apartment => 
    !selectedFloorId || apartment.floor_id === selectedFloorId
  )

  // Debug para verificar filtrado
  console.log('🔍 TaskForm Debug:', {
    task: task ? { 
      id: task.id, 
      apartment_id: task.apartment_id,
      floor_id: task.floor_id,
      project_id: task.project_id
    } : null,
    selectedProjectId,
    selectedFloorId,
    watchedApartmentId,
    availableFloors: availableFloors.map(f => ({ id: f.id, number: f.floor_number, project_id: f.project_id })),
    availableApartments: availableApartments.map(a => ({ id: a.id, number: a.apartment_number, floor_id: a.floor_id })),
    allApartments: apartments.map(a => ({ id: a.id, number: a.apartment_number, floor_id: a.floor_id })),
    allFloors: floors.map(f => ({ id: f.id, number: f.floor_number, project_id: f.project_id }))
  })

  useEffect(() => {
    if (task) {
      console.log('🏗️ Inicializando formulario para edición:', {
        task: {
          id: task.id,
          apartment_id: task.apartment_id,
          floor_id: task.floor_id,
          project_id: task.project_id
        },
        selectedProjectId,
        selectedFloorId,
        taskComplete: task
      })
      
      reset({
        apartment_id: task.apartment_id,
        task_name: task.task_name,
        task_description: task.task_description || '',
        task_category: task.task_category || 'Estructura',
        status: task.status,
        priority: task.priority,
        estimated_hours: task.estimated_hours || 0,
        worker_payment: task.worker_payment || 0,
        assigned_to: task.assigned_to || null,
        start_date: task.start_date || '',
        notes: task.notes || ''
      })
    }
  }, [task, reset])

  // Actualizar proyecto y piso cuando cambie el apartamento seleccionado
  useEffect(() => {
    if (watchedApartmentId && watchedApartmentId !== 0) {
      const selectedApartment = apartments.find(apt => apt.id === watchedApartmentId)
      if (selectedApartment) {
        const floor = floors.find(f => f.id === selectedApartment.floor_id)
        if (floor) {
          setSelectedProjectId(floor.project_id)
          setSelectedFloorId(selectedApartment.floor_id)
        }
      }
    }
  }, [watchedApartmentId, apartments, floors])

  const handleFormSubmit = async (data: TaskFormData) => {
    setLoading(true)
    try {
      console.log('📝 Datos del formulario de tarea:', {
        ...data,
        status: data.status,
        statusType: typeof data.status,
        statusLength: data.status?.length,
        statusValue: data.status
      })
      
      // Validaciones adicionales
      if (!data.apartment_id) {
        throw new Error('Debe seleccionar un apartamento')
      }
      if (!data.task_name || data.task_name.trim() === '') {
        throw new Error('El nombre de la tarea es obligatorio')
      }
      if (data.estimated_hours && data.estimated_hours < 0) {
        throw new Error('Las horas estimadas deben ser mayor a 0')
      }

      // Convertir strings vacíos a undefined para campos de fecha
      const cleanedData = {
        ...data,
        start_date: data.start_date && data.start_date.trim() !== '' ? data.start_date : undefined,
        end_date: data.end_date && data.end_date.trim() !== '' ? data.end_date : undefined,
        completed_at: data.completed_at && data.completed_at.trim() !== '' ? data.completed_at : undefined
      }

      await onSubmit(cleanedData)
      toast.success(`Tarea ${task ? 'actualizada' : 'creada'} exitosamente`)
      onCancel()
    } catch (err: any) {
      console.error('Error en el formulario de tarea:', err)
      toast.error(`Error al ${task ? 'actualizar' : 'crear'} tarea: ${err.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Proyecto */}
      <div>
        <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-2">
          Proyecto *
        </label>
        <select
          id="project_id"
          value={selectedProjectId || ''}
          onChange={(e) => {
            const projectId = e.target.value ? Number(e.target.value) : null
            setSelectedProjectId(projectId)
            setSelectedFloorId(null)
            // Resetear apartamento cuando cambie el proyecto
            reset({ ...watch(), apartment_id: 0 })
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        >
          <option value="">Seleccionar proyecto...</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Piso */}
      <div>
        <label htmlFor="floor_id" className="block text-sm font-medium text-gray-700 mb-2">
          Piso *
        </label>
        <select
          id="floor_id"
          value={selectedFloorId || ''}
          onChange={(e) => {
            const floorId = e.target.value ? Number(e.target.value) : null
            setSelectedFloorId(floorId)
            // Resetear apartamento cuando cambie el piso
            reset({ ...watch(), apartment_id: 0 })
          }}
          disabled={!selectedProjectId}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Seleccionar piso...</option>
          {availableFloors.map((floor) => (
            <option key={floor.id} value={floor.id}>
              Piso {floor.floor_number}
            </option>
          ))}
        </select>
      </div>

      {/* Apartamento */}
      <div>
        <label htmlFor="apartment_id" className="block text-sm font-medium text-gray-700 mb-2">
          Apartamento *
        </label>
        <select
          id="apartment_id"
          {...register('apartment_id', { required: 'El apartamento es obligatorio' })}
          disabled={!selectedFloorId}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Seleccionar apartamento...</option>
          {availableApartments.map((apartment) => (
            <option key={apartment.id} value={apartment.id}>
              {apartment.apartment_number}
            </option>
          ))}
        </select>
        {errors.apartment_id && (
          <p className="mt-1 text-sm text-red-600">{errors.apartment_id.message}</p>
        )}
      </div>

      {/* Nombre de la Tarea */}
      <div>
        <Input
          id="task_name"
          label="Nombre de la Tarea"
          type="text"
          placeholder="Ej: Instalación eléctrica"
          {...register('task_name', { required: 'El nombre de la tarea es obligatorio' })}
          error={errors.task_name?.message}
          required
        />
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="task_description" className="block text-sm font-medium text-gray-700 mb-2">
          Descripción
        </label>
        <textarea
          id="task_description"
          {...register('task_description')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
          placeholder="Descripción detallada de la tarea..."
        />
      </div>

      {/* Categoría */}
      <div>
        <label htmlFor="task_category" className="block text-sm font-medium text-gray-700 mb-2">
          Categoría *
        </label>
        <select
          id="task_category"
          {...register('task_category', { required: 'La categoría es obligatoria' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        >
          <option value="Estructura">Estructura</option>
          <option value="Instalaciones">Instalaciones</option>
          <option value="Acabados">Acabados</option>
          <option value="Pisos">Pisos</option>
          <option value="Carpintería">Carpintería</option>
          <option value="Terminaciones">Terminaciones</option>
        </select>
        {errors.task_category && (
          <p className="mt-1 text-sm text-red-600">{errors.task_category.message}</p>
        )}
      </div>

      {/* Estado y Prioridad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
            Estado *
          </label>
          <select
            id="status"
            {...register('status', { required: 'El estado es obligatorio' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
          >
            {Object.entries(ACTIVITY_STATUSES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
            Prioridad *
          </label>
          <select
            id="priority"
            {...register('priority', { required: 'La prioridad es obligatoria' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
          {errors.priority && (
            <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
          )}
        </div>
      </div>

      {/* Horas Estimadas y Pago a Trabajador */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <Input
            id="estimated_hours"
            label="Horas Estimadas"
            type="number"
            placeholder="Ej: 8"
            {...register('estimated_hours', { valueAsNumber: true, min: { value: 0, message: 'Las horas deben ser mayor a 0' } })}
            error={errors.estimated_hours?.message}
          />
        </div>


        <div className="flex flex-col">
          <Input
            id="worker_payment"
            label="Pago a Trabajador"
            type="number"
            step="0.01"
            min="0"
            placeholder="Ej: 50000"
            {...register('worker_payment', { 
              valueAsNumber: true, 
              min: { value: 0, message: 'El pago debe ser mayor a 0' } 
            })}
            error={errors.worker_payment?.message}
          />
          <p className="mt-1 text-xs text-gray-500">
            Pago al trabajador asignado (CLP)
          </p>
        </div>
      </div>

      {/* Asignado a */}
      <div>
        <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-2">
          Asignado a
        </label>
        <select
          id="assigned_to"
          {...register('assigned_to', { valueAsNumber: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        >
          <option value="">Sin asignar</option>
          {users.map((user) => {
            // Manejo robusto del tipo de contrato
            let contractType = 'A Trato' // Por defecto A Trato
            if (user.contract_type === 'por_dia') {
              contractType = 'Por Día'
            } else if (user.contract_type === 'a_trato') {
              contractType = 'A Trato'
            }
            return (
              <option key={user.id} value={user.id}>
                {user.full_name} - {contractType}
              </option>
            )
          })}
        </select>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            id="start_date"
            label="Fecha de Inicio"
            type="date"
            {...register('start_date')}
            error={errors.start_date?.message}
          />
          <p className="text-xs text-slate-400 mt-1">Si no se especifica, se usa la fecha actual</p>
        </div>

        {task && (
          <div>
            <Input
              id="completed_at"
              label="Fecha de Terminación"
              type="date"
              {...register('completed_at')}
              error={errors.completed_at?.message}
            />
            <p className="text-xs text-slate-400 mt-1">Fecha real en que se completó</p>
          </div>
        )}
      </div>


      {/* Notas */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Notas
        </label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder:text-gray-400"
          placeholder="Notas adicionales sobre la tarea..."
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : (task ? 'Actualizar Tarea' : 'Crear Tarea')}
        </Button>
      </div>
    </form>
  )
}
