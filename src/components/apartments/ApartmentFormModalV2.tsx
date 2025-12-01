'use client'

import { useState, useEffect, useCallback } from 'react'
import { ModalV2 } from '@/components/tasks-v2/ModalV2'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useApartments } from '@/hooks/useApartments'
import { useTowers } from '@/hooks/useTowers'
import { useFloors } from '@/hooks/useFloors'
import { useApartmentTemplates } from '@/hooks/useApartmentTemplates'
import { ApartmentTemplatesModal } from './ApartmentTemplatesModal'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronRight, Home } from 'lucide-react'

interface ApartmentFormModalV2Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialFloorId?: number
  initialTowerId?: number
  initialProjectId?: number
}

export function ApartmentFormModalV2({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialFloorId,
  initialTowerId,
  initialProjectId
}: ApartmentFormModalV2Props) {
  const { createApartment, getNextApartmentNumber } = useApartments()
  const [projects, setProjects] = useState<any[]>([])
  const [towers, setTowers] = useState<any[]>([])
  const [floors, setFloors] = useState<any[]>([])
  const [existingApartments, setExistingApartments] = useState<any[]>([])
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [existingApartmentTypes, setExistingApartmentTypes] = useState<string[]>([])

  // Determinar si los campos están bloqueados (viene del botón del piso)
  const isFromFloorButton = !!initialFloorId && !!initialTowerId

  // Form states
  const [formData, setFormData] = useState({
    project_id: '',
    tower_id: '',
    floor_id: '',
    apartment_code: '',
    apartment_number: '',
    apartment_type: 'Departamento',
    status: 'pending',
    // Detalles
    area: '0',
    floor_area: '',
    balcony_area: '',
    bedrooms: '0',
    bathrooms: '0',
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Obtener plantillas filtradas por proyecto seleccionado
  const projectIdForTemplates = formData.project_id ? parseInt(formData.project_id) : undefined
  const { templates } = useApartmentTemplates(projectIdForTemplates)

  // Cargar proyectos y tipos de departamento existentes
  useEffect(() => {
    if (!isOpen) return
    
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, status')
          .eq('is_active', true)
          .eq('status', 'active')
          .order('name', { ascending: true })

        if (error) throw error
        setProjects(data || [])
      } catch (err) {
        console.error('Error fetching projects:', err)
      }
    }

    const fetchApartmentTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('apartments')
          .select('apartment_type')
          .eq('is_active', true)
          .not('apartment_type', 'is', null)

        if (error) throw error
        
        // Obtener tipos únicos y ordenarlos
        const uniqueTypes = Array.from(new Set((data || []).map((apt: any) => apt.apartment_type).filter(Boolean)))
          .sort() as string[]
        
        setExistingApartmentTypes(uniqueTypes)
      } catch (err) {
        console.error('Error fetching apartment types:', err)
      }
    }

    fetchProjects()
    fetchApartmentTypes()
  }, [isOpen])

  // Cargar torres cuando se selecciona un proyecto
  useEffect(() => {
    if (!isOpen || !formData.project_id) {
      setTowers([])
      setFloors([])
      return
    }

    const fetchTowers = async () => {
      try {
        const { data, error } = await supabase
          .from('towers')
          .select('id, tower_number, name, project_id')
          .eq('project_id', parseInt(formData.project_id))
          .eq('is_active', true)
          .order('tower_number', { ascending: true })

        if (error) throw error
        setTowers(data || [])
      } catch (err) {
        console.error('Error fetching towers:', err)
      }
    }

    fetchTowers()
  }, [formData.project_id, isOpen])

  // Cargar pisos cuando se selecciona una torre
  useEffect(() => {
    if (!isOpen || !formData.tower_id) {
      setFloors([])
      return
    }

    const fetchFloors = async () => {
      try {
        const { data, error } = await supabase
          .from('floors')
          .select('id, floor_number, tower_id, project_id')
          .eq('tower_id', parseInt(formData.tower_id))
          .eq('is_active', true)
          .order('floor_number', { ascending: true })

        if (error) throw error
        setFloors(data || [])
      } catch (err) {
        console.error('Error fetching floors:', err)
      }
    }

    fetchFloors()
  }, [formData.tower_id, isOpen])

  // Cargar departamentos existentes cuando se selecciona un piso
  useEffect(() => {
    if (!isOpen || !formData.floor_id) {
      setExistingApartments([])
      return
    }

    const fetchExistingApartments = async () => {
      try {
        const { data, error } = await supabase
          .from('apartments')
          .select('id, apartment_code, apartment_number, apartment_type, status')
          .eq('floor_id', parseInt(formData.floor_id))
          .eq('is_active', true)
          .order('apartment_number', { ascending: true })

        if (error) throw error
        setExistingApartments(data || [])
      } catch (err) {
        console.error('Error fetching existing apartments:', err)
      }
    }

    fetchExistingApartments()
  }, [formData.floor_id, isOpen])

  // Calcular siguiente número disponible cuando se selecciona un piso
  useEffect(() => {
    if (!isOpen || !formData.floor_id) return

    const calculateNextNumber = async () => {
      try {
        const nextNumber = await getNextApartmentNumber(parseInt(formData.floor_id))
        setFormData(prev => ({ ...prev, apartment_number: nextNumber }))
      } catch (err) {
        console.error('Error calculating next apartment number:', err)
      }
    }

    calculateNextNumber()
  }, [formData.floor_id, isOpen])

  // Inicializar valores cuando viene del botón del piso
  useEffect(() => {
    if (!isOpen) return

    if (isFromFloorButton && initialFloorId && initialTowerId && initialProjectId) {
      // Cargar datos del piso para obtener project_id y tower_id
      const loadInitialData = async () => {
        try {
          const { data: floorData, error: floorError } = await supabase
            .from('floors')
            .select('id, floor_number, tower_id, project_id, towers!inner(id, tower_number, name, project_id)')
            .eq('id', initialFloorId)
            .single()

          if (floorError) throw floorError

          const tower = (floorData as any).towers
          const projectId = tower?.project_id || initialProjectId

          setFormData(prev => ({
            ...prev,
            project_id: projectId.toString(),
            tower_id: initialTowerId.toString(),
            floor_id: initialFloorId.toString()
          }))

          // Cargar torres y pisos para que estén disponibles
          const { data: towersData } = await supabase
            .from('towers')
            .select('id, tower_number, name, project_id')
            .eq('project_id', projectId)
            .eq('is_active', true)
            .order('tower_number', { ascending: true })

          if (towersData) setTowers(towersData)

          const { data: floorsData } = await supabase
            .from('floors')
            .select('id, floor_number, tower_id, project_id')
            .eq('tower_id', initialTowerId)
            .eq('is_active', true)
            .order('floor_number', { ascending: true })

          if (floorsData) setFloors(floorsData)
        } catch (err) {
          console.error('Error loading initial data:', err)
        }
      }

      loadInitialData()
    } else {
      // Resetear formulario si no viene del botón
      setFormData({
        project_id: '',
        tower_id: '',
        floor_id: '',
        apartment_code: '',
        apartment_number: '',
        apartment_type: 'Departamento',
        status: 'pending',
        area: '0',
        floor_area: '',
        balcony_area: '',
        bedrooms: '0',
        bathrooms: '0',
        notes: ''
      })
      setExistingApartments([])
    }
  }, [isOpen, isFromFloorButton, initialFloorId, initialTowerId, initialProjectId])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.project_id) {
      newErrors.project_id = 'El proyecto es requerido'
    }

    if (!formData.tower_id) {
      newErrors.tower_id = 'La torre es requerida'
    }

    if (!formData.floor_id) {
      newErrors.floor_id = 'El piso es requerido'
    }

    if (!formData.apartment_number.trim()) {
      newErrors.apartment_number = 'El número de departamento es requerido'
    }

    if (!formData.apartment_type.trim()) {
      newErrors.apartment_type = 'El tipo de departamento es requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Por favor, completa todos los campos requeridos')
      return
    }

    setLoading(true)

    try {
      const apartmentData: any = {
        floor_id: parseInt(formData.floor_id),
        apartment_code: formData.apartment_code.trim() || null,
        apartment_number: formData.apartment_number.trim(),
        apartment_type: formData.apartment_type.trim(),
        status: formData.status,
        area: formData.area ? parseFloat(formData.area) : null,
        floor_area: formData.floor_area ? parseFloat(formData.floor_area) : null,
        balcony_area: formData.balcony_area ? parseFloat(formData.balcony_area) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        notes: formData.notes.trim() || null
      }

      await createApartment(apartmentData)
      toast.success('Departamento creado exitosamente')
      
      // Resetear formulario
      setFormData({
        project_id: '',
        tower_id: '',
        floor_id: '',
        apartment_code: '',
        apartment_number: '',
        apartment_type: 'Departamento',
        status: 'pending',
        area: '0',
        floor_area: '',
        balcony_area: '',
        bedrooms: '0',
        bathrooms: '0',
        notes: ''
      })
      setExistingApartments([])
      setErrors({})
      
      onSuccess?.()
      onClose()
    } catch (err: any) {
      console.error('Error creating apartment:', err)
      toast.error(err.message || 'Error al crear el departamento')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      project_id: '',
      tower_id: '',
      floor_id: '',
      apartment_code: '',
      apartment_number: '',
      apartment_type: 'Departamento',
      status: 'pending',
      area: '0',
      floor_area: '',
      balcony_area: '',
      bedrooms: '0',
      bathrooms: '0',
      notes: ''
    })
    setExistingApartments([])
    setErrors({})
    setShowDetails(false)
    onClose()
  }

  // Manejar selección de plantilla
  const handleTemplateSelect = (templateId: string) => {
    if (!templateId) {
      setSelectedTemplateId('')
      return
    }

    const template = templates.find(t => t.id.toString() === templateId)
    if (!template) {
      toast.error('Plantilla no encontrada')
      return
    }

    // Limpiar campos y aplicar plantilla
    setFormData(prev => ({
      ...prev,
      apartment_code: (template as any).apartment_code || '',
      apartment_type: template.apartment_type || 'Departamento',
      status: template.status || 'pending',
      area: template.area?.toString() || '0',
      floor_area: template.floor_area?.toString() || '',
      balcony_area: template.balcony_area?.toString() || '',
      bedrooms: template.bedrooms?.toString() || '0',
      bathrooms: template.bathrooms?.toString() || '0',
      notes: template.notes || ''
    }))
    setSelectedTemplateId(templateId)
    toast.success('Plantilla aplicada')
  }

  return (
    <>
    <ModalV2
      isOpen={isOpen}
      onClose={handleCancel}
      title="Crear Nuevo Departamento"
      size="lg"
        headerRight={
          <Select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            disabled={!formData.project_id || templates.length === 0}
            className="text-sm"
          >
            <option value="">{templates.length === 0 ? 'Sin plantillas' : 'Usar plantilla...'}</option>
            {templates.map(template => (
              <option key={template.id} value={template.id.toString()}>
                {template.name} - {template.apartment_type}
              </option>
            ))}
          </Select>
        }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ubicación */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Ubicación</h3>
          
          {/* Proyecto */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Proyecto <span className="text-red-400">*</span>
            </label>
            <Select
              value={formData.project_id}
              onChange={(e) => {
                setFormData(prev => ({ 
                  ...prev, 
                  project_id: e.target.value,
                  tower_id: '',
                  floor_id: '',
                  apartment_number: ''
                }))
              }}
              disabled={isFromFloorButton}
              className={errors.project_id ? 'border-red-500' : ''}
            >
              <option value="">Seleccionar proyecto</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            {errors.project_id && (
              <p className="text-red-400 text-xs mt-1">{errors.project_id}</p>
            )}
          </div>

          {/* Torre */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Torre <span className="text-red-400">*</span>
            </label>
            <Select
              value={formData.tower_id}
              onChange={(e) => {
                setFormData(prev => ({ 
                  ...prev, 
                  tower_id: e.target.value,
                  floor_id: '',
                  apartment_number: ''
                }))
              }}
              disabled={isFromFloorButton || !formData.project_id}
              className={errors.tower_id ? 'border-red-500' : ''}
            >
              <option value="">Seleccionar torre</option>
              {towers.map(tower => {
                // Si el nombre es igual al número, solo mostrar el número
                const displayName = tower.name === `Torre ${tower.tower_number}` || tower.name === `Torre${tower.tower_number}` || !tower.name
                  ? `Torre ${tower.tower_number}` 
                  : `Torre ${tower.tower_number} - ${tower.name}`
                return (
                  <option key={tower.id} value={tower.id}>
                    {displayName}
                  </option>
                )
              })}
            </Select>
            {errors.tower_id && (
              <p className="text-red-400 text-xs mt-1">{errors.tower_id}</p>
            )}
          </div>

          {/* Piso */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Piso <span className="text-red-400">*</span>
            </label>
            <Select
              value={formData.floor_id}
              onChange={(e) => {
                setFormData(prev => ({ 
                  ...prev, 
                  floor_id: e.target.value,
                  apartment_number: ''
                }))
              }}
              disabled={isFromFloorButton || !formData.tower_id}
              className={errors.floor_id ? 'border-red-500' : ''}
            >
              <option value="">Seleccionar piso</option>
              {floors.map(floor => (
                <option key={floor.id} value={floor.id}>
                  Piso {floor.floor_number}
                </option>
              ))}
            </Select>
            {errors.floor_id && (
              <p className="text-red-400 text-xs mt-1">{errors.floor_id}</p>
            )}
          </div>
        </div>

        {/* Información Básica */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Información Básica</h3>
          
          {/* Código de Departamento (Opcional) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Código de Departamento (Opcional)
            </label>
            <Input
              type="text"
              value={formData.apartment_code}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, apartment_code: e.target.value }))
              }}
              placeholder="Ej: A1 D, B0 D, F3X D"
              disabled={!formData.floor_id}
            />
            <p className="text-xs text-slate-400 mt-1">
              Código que se mostrará antes del número (sin guion)
            </p>
          </div>

          {/* Número de Departamento */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Número de Departamento <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              value={formData.apartment_number}
              onChange={(e) => {
                // Solo permitir números
                const value = e.target.value.replace(/\D/g, '')
                setFormData(prev => ({ ...prev, apartment_number: value }))
              }}
              placeholder="Ej: 101"
              disabled={!formData.floor_id}
              className={errors.apartment_number ? 'border-red-500' : ''}
            />
            {errors.apartment_number && (
              <p className="text-red-400 text-xs mt-1">{errors.apartment_number}</p>
            )}
            
            {/* Vista previa del número completo */}
            {formData.apartment_code && formData.apartment_number && (
              <p className="text-xs text-slate-400 mt-1">
                Se mostrará como: <span className="text-slate-200 font-medium">
                  {formData.apartment_code}-{formData.apartment_number}
                </span>
              </p>
            )}
            
            {/* Mostrar departamentos existentes */}
            {existingApartments.length > 0 && (
              <div className="mt-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-400 mb-2">Departamentos existentes en este piso:</p>
                <div className="flex flex-wrap gap-2">
                  {existingApartments.map(apt => {
                    const displayNumber = apt.apartment_code 
                      ? `${apt.apartment_code}-${apt.apartment_number}`
                      : apt.apartment_number
                    return (
                      <span
                        key={apt.id}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-slate-600 text-slate-300"
                      >
                        <Home className="w-3 h-3 mr-1" />
                        {displayNumber}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tipo de Departamento */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tipo de Departamento <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              value={formData.apartment_type}
              onChange={(e) => setFormData(prev => ({ ...prev, apartment_type: e.target.value }))}
              placeholder="Ej: Departamento, Local Comercial..."
              className={errors.apartment_type ? 'border-red-500' : ''}
            />
            {errors.apartment_type && (
              <p className="text-red-400 text-xs mt-1">{errors.apartment_type}</p>
            )}
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Estado <span className="text-red-400">*</span>
            </label>
            <Select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="pending">Pendiente</option>
              <option value="in-progress">En Progreso</option>
              <option value="completed">Completado</option>
              <option value="blocked">Bloqueado</option>
            </Select>
          </div>
        </div>

        {/* Tab Desplegable - Detalles */}
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700/70 transition-colors"
          >
            <span className="text-sm font-medium text-slate-200">Detalles</span>
            {showDetails ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </button>
          
          {showDetails && (
            <div className="p-4 space-y-4 bg-slate-800/50">
              {/* Área */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Área Total (m²)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.area}
                  onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                  placeholder="0"
                />
              </div>

              {/* Área del Piso */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Área del Piso (m²)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.floor_area}
                  onChange={(e) => setFormData(prev => ({ ...prev, floor_area: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>

              {/* Área de Balcón */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Área de Balcón (m²)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.balcony_area}
                  onChange={(e) => setFormData(prev => ({ ...prev, balcony_area: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>

              {/* Habitaciones */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Número de Habitaciones
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: e.target.value }))}
                  placeholder="0"
                />
              </div>

              {/* Baños */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Número de Baños
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: e.target.value }))}
                  placeholder="0"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notas
                </label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionales sobre el departamento..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Departamento'}
          </Button>
        </div>
      </form>
    </ModalV2>

    <ApartmentTemplatesModal
      isOpen={showTemplatesModal}
      onClose={() => {
        setShowTemplatesModal(false)
        // Refrescar plantillas si se creó/actualizó alguna
        if (projectIdForTemplates) {
          // El hook se refrescará automáticamente
        }
      }}
      projectId={projectIdForTemplates}
    />
    </>
  )
}

