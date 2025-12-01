'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PROJECT_STATUSES } from '@/lib/constants'
import { validateRut, formatRut } from '@/lib/rut'
import toast from 'react-hot-toast'

interface ProjectFormData {
  name: string
  address?: string
  city?: string
  start_date?: string
  estimated_completion?: string
  status: string
  initial_budget?: number
  plan_pdf?: FileList
  // Datos de la Empresa Cliente
  client_company_name?: string
  client_company_rut?: string
  client_company_contact?: string
  client_company_phone?: string
  // Datos del Administrador de Obra
  site_admin_name?: string
  site_admin_rut?: string
  site_admin_phone?: string
  site_admin_email?: string
  // Datos del Contrato
  contract_date?: string
  contract_type?: string
  contract_amount?: number
  contract_pdf?: FileList
  specifications_pdf?: FileList
}

interface ProjectFormProps {
  project?: any
  onSubmit: (data: ProjectFormData) => Promise<void>
  onCancel: () => void
}

export function ProjectForm({ project, onSubmit, onCancel }: ProjectFormProps) {
  const [loading, setLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    clientCompany: false,
    siteAdmin: false,
    files: false
  })
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ProjectFormData>({
    defaultValues: project ? {
      name: project.name,
      address: project.address || '',
      city: project.city || '',
      start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
      estimated_completion: project.estimated_completion ? new Date(project.estimated_completion).toISOString().split('T')[0] : '',
      status: project.status,
      initial_budget: project.initial_budget || undefined,
      // Datos de la Empresa Cliente
      client_company_name: project.client_company_name || '',
      client_company_rut: project.client_company_rut || '',
      client_company_contact: project.client_company_contact || '',
      client_company_phone: project.client_company_phone || '',
      // Datos del Administrador de Obra
      site_admin_name: project.site_admin_name || '',
      site_admin_rut: project.site_admin_rut || '',
      site_admin_phone: project.site_admin_phone || '',
      site_admin_email: project.site_admin_email || '',
      // Datos del Contrato
      contract_date: project.contract_date ? new Date(project.contract_date).toISOString().split('T')[0] : '',
      contract_type: project.contract_type || '',
      contract_amount: project.contract_amount || undefined
    } : {
      status: 'active'
    }
  })

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        address: project.address || '',
        city: project.city || '',
        start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
        estimated_completion: project.estimated_completion ? new Date(project.estimated_completion).toISOString().split('T')[0] : '',
        status: project.status,
        initial_budget: project.initial_budget || undefined,
        // Datos de la Empresa Cliente
        client_company_name: project.client_company_name || '',
        client_company_rut: project.client_company_rut || '',
        client_company_contact: project.client_company_contact || '',
        client_company_phone: project.client_company_phone || '',
        // Datos del Administrador de Obra
        site_admin_name: project.site_admin_name || '',
        site_admin_rut: project.site_admin_rut || '',
        site_admin_phone: project.site_admin_phone || '',
        site_admin_email: project.site_admin_email || '',
        // Datos del Contrato
        contract_date: project.contract_date ? new Date(project.contract_date).toISOString().split('T')[0] : '',
        contract_type: project.contract_type || '',
        contract_amount: project.contract_amount || undefined
      })
    }
  }, [project, reset])

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleFormSubmit = async (data: ProjectFormData) => {
    setLoading(true)
    try {
      // Separar los archivos del resto de los datos
      const { plan_pdf, contract_pdf, specifications_pdf, ...projectData } = data
      
      // Limpiar campos numéricos: convertir null/undefined a undefined
      if (projectData.initial_budget === null || projectData.initial_budget === undefined) {
        projectData.initial_budget = undefined
      }
      
      if (projectData.contract_amount === null || projectData.contract_amount === undefined) {
        projectData.contract_amount = undefined
      }
      
      // Limpiar campos de texto opcionales: convertir cadenas vacías a null
      const optionalTextFields: (keyof ProjectFormData)[] = [
        'address', 'city', 'client_company_name', 'client_company_rut',
        'client_company_contact', 'client_company_phone', 'site_admin_name',
        'site_admin_rut', 'site_admin_phone', 'site_admin_email',
        'contract_type'
      ]
      
      optionalTextFields.forEach(field => {
        if (field in projectData && (projectData as any)[field] === '') {
          (projectData as any)[field] = null
        }
      })
      
      // Si hay archivos, los agregamos a los datos
      if (plan_pdf && plan_pdf.length > 0) {
        (projectData as any).plan_pdf = plan_pdf[0]
      }
      if (contract_pdf && contract_pdf.length > 0) {
        (projectData as any).contract_pdf = contract_pdf[0]
      }
      if (specifications_pdf && specifications_pdf.length > 0) {
        (projectData as any).specifications_pdf = specifications_pdf[0]
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

      {/* Dirección y Ciudad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Dirección
          </label>
          <Input
            id="address"
            {...register('address')}
            placeholder="Ej: Av. Principal 123"
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
            Ciudad
          </label>
          <Input
            id="city"
            {...register('city')}
            placeholder="Ej: Valdivia"
          />
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

      {/* Presupuesto Inicial */}
      <div>
        <label htmlFor="initial_budget" className="block text-sm font-medium text-gray-700 mb-2">
          Presupuesto Inicial
        </label>
        <Input
          id="initial_budget"
          type="number"
          min="0"
          step="0.01"
          {...register('initial_budget', {
            min: { value: 0, message: 'El presupuesto no puede ser negativo' }
          })}
          placeholder="Ej: 1500000"
          className={errors.initial_budget ? 'border-red-500' : ''}
        />
        {errors.initial_budget && (
          <p className="mt-1 text-sm text-red-600">{errors.initial_budget.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Presupuesto estimado para el proyecto completo
        </p>
      </div>

      {/* Separador - Datos del Cliente */}
      <div className="border-t pt-6">
        <button
          type="button"
          onClick={() => toggleSection('clientCompany')}
          className="w-full flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-2 -m-2"
        >
          <h3 className="text-lg font-semibold text-gray-900">Datos de la Empresa Cliente</h3>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.clientCompany ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {expandedSections.clientCompany && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="client_company_name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Empresa
              </label>
              <Input
                id="client_company_name"
                type="text"
                {...register('client_company_name')}
                placeholder="Ej: Constructora ABC S.A."
              />
            </div>

            <div>
              <label htmlFor="client_company_rut" className="block text-sm font-medium text-gray-700 mb-2">
                RUT de la Empresa
              </label>
              <Input
                id="client_company_rut"
                type="text"
                {...register('client_company_rut', {
                  validate: (value) => !value || validateRut(value) || 'RUT inválido'
                })}
                placeholder="Ej: 76.123.456-7"
                onChange={(e) => {
                  const formatted = formatRut(e.target.value)
                  e.target.value = formatted
                }}
                className={errors.client_company_rut ? 'border-red-500' : ''}
              />
              {errors.client_company_rut && (
                <p className="mt-1 text-sm text-red-600">{errors.client_company_rut.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="client_company_contact" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Contacto
              </label>
              <Input
                id="client_company_contact"
                type="text"
                {...register('client_company_contact')}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <label htmlFor="client_company_phone" className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono de la Empresa
              </label>
              <Input
                id="client_company_phone"
                type="tel"
                {...register('client_company_phone')}
                placeholder="Ej: +56 9 1234 5678"
              />
            </div>
          </div>
        )}
      </div>

      {/* Separador - Datos del Administrador */}
      <div className="border-t pt-6">
        <button
          type="button"
          onClick={() => toggleSection('siteAdmin')}
          className="w-full flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-2 -m-2"
        >
          <h3 className="text-lg font-semibold text-gray-900">Datos del Administrador de Obra</h3>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.siteAdmin ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {expandedSections.siteAdmin && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="site_admin_name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Administrador
              </label>
              <Input
                id="site_admin_name"
                type="text"
                {...register('site_admin_name')}
                placeholder="Ej: María González"
              />
            </div>

            <div>
              <label htmlFor="site_admin_rut" className="block text-sm font-medium text-gray-700 mb-2">
                RUT del Administrador
              </label>
              <Input
                id="site_admin_rut"
                type="text"
                {...register('site_admin_rut', {
                  validate: (value) => !value || validateRut(value) || 'RUT inválido'
                })}
                placeholder="Ej: 12.345.678-9"
                onChange={(e) => {
                  const formatted = formatRut(e.target.value)
                  e.target.value = formatted
                }}
                className={errors.site_admin_rut ? 'border-red-500' : ''}
              />
              {errors.site_admin_rut && (
                <p className="mt-1 text-sm text-red-600">{errors.site_admin_rut.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="site_admin_phone" className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono del Administrador
              </label>
              <Input
                id="site_admin_phone"
                type="tel"
                {...register('site_admin_phone')}
                placeholder="Ej: +56 9 8765 4321"
              />
            </div>

            <div>
              <label htmlFor="site_admin_email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo del Administrador
              </label>
              <Input
                id="site_admin_email"
                type="email"
                {...register('site_admin_email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Correo electrónico inválido'
                  }
                })}
                placeholder="Ej: admin@empresa.cl"
                className={errors.site_admin_email ? 'border-red-500' : ''}
              />
              {errors.site_admin_email && (
                <p className="mt-1 text-sm text-red-600">{errors.site_admin_email.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Separador - Datos del Contrato y Archivos */}
      <div className="border-t pt-6">
        <button
          type="button"
          onClick={() => toggleSection('files')}
          className="w-full flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-2 -m-2"
        >
          <h3 className="text-lg font-semibold text-gray-900">Datos del Contrato y Subida de Archivos</h3>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.files ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {expandedSections.files && (
          <div className="mt-4 space-y-6">
            {/* Datos del Contrato */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contract_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha del Contrato
                </label>
                <Input
                  id="contract_date"
                  type="date"
                  {...register('contract_date')}
                />
              </div>

              <div>
                <label htmlFor="contract_amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Monto del Contrato
                </label>
                <Input
                  id="contract_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('contract_amount', {
                    min: { value: 0, message: 'El monto no puede ser negativo' }
                  })}
                  placeholder="Ej: 5000000"
                  className={errors.contract_amount ? 'border-red-500' : ''}
                />
                {errors.contract_amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.contract_amount.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="contract_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Contrato
                </label>
                <Input
                  id="contract_type"
                  type="text"
                  {...register('contract_type')}
                  placeholder="Ej: Suma Alzada, Administración Delegada, etc."
                />
              </div>
            </div>

            {/* Archivos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <label htmlFor="contract_pdf" className="block text-sm font-medium text-gray-700 mb-2">
                  Contrato PDF (Opcional)
                </label>
                <input
                  id="contract_pdf"
                  type="file"
                  accept=".pdf"
                  {...register('contract_pdf')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                />
                {project?.contract_pdf_url && (
                  <p className="mt-1 text-xs text-green-600">
                    ✓ Contrato actual: <a href={project.contract_pdf_url} target="_blank" rel="noopener noreferrer" className="underline">Ver archivo</a>
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Sube el PDF del contrato firmado
                </p>
              </div>

              <div>
                <label htmlFor="specifications_pdf" className="block text-sm font-medium text-gray-700 mb-2">
                  Especificaciones PDF (Opcional)
                </label>
                <input
                  id="specifications_pdf"
                  type="file"
                  accept=".pdf"
                  {...register('specifications_pdf')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                />
                {project?.specifications_pdf_url && (
                  <p className="mt-1 text-xs text-green-600">
                    ✓ Especificaciones actuales: <a href={project.specifications_pdf_url} target="_blank" rel="noopener noreferrer" className="underline">Ver archivo</a>
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Sube el PDF de las especificaciones técnicas
                </p>
              </div>
            </div>
          </div>
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
