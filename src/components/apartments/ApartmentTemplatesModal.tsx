'use client'

import { useState, useEffect, useMemo } from 'react'
import { ModalV2 } from '@/components/tasks-v2/ModalV2'
import { useApartmentTemplates } from '@/hooks/useApartmentTemplates'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { supabase } from '@/lib/supabase'
import { formatApartmentNumber } from '@/lib/utils'
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface ApartmentTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  projectId?: number
}

export function ApartmentTemplatesModal({ isOpen, onClose, projectId }: ApartmentTemplatesModalProps) {
  // Cargar todas las plantillas si no hay projectId, o solo las del proyecto si hay
  const { templates: allTemplates, loading, refresh, createTemplate, updateTemplate, deleteTemplate } = useApartmentTemplates()
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(projectId)
  const [activeProjectTab, setActiveProjectTab] = useState<number | 'all'>(projectId || 'all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [existingApartmentTypes, setExistingApartmentTypes] = useState<string[]>([])
  
  // Filtrar plantillas por proyecto activo
  const templates = useMemo(() => {
    if (activeProjectTab === 'all') {
      return allTemplates
    }
    return allTemplates.filter(t => t.project_id === activeProjectTab)
  }, [allTemplates, activeProjectTab])
  
  // Obtener proyectos únicos de las plantillas
  const templateProjects = useMemo(() => {
    const projectIds = new Set(allTemplates.map(t => t.project_id))
    return projects.filter(p => projectIds.has(p.id))
  }, [allTemplates, projects])
  const [formData, setFormData] = useState({
    project_id: projectId || '',
    name: '',
    apartment_code: '',
    apartment_type: 'Departamento',
    status: 'pending',
    area: '',
    floor_area: '',
    balcony_area: '',
    bedrooms: '0',
    bathrooms: '0',
    notes: ''
  })

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

  // Actualizar selectedProjectId y activeProjectTab cuando cambia projectId prop
  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId)
      setActiveProjectTab(projectId)
      setFormData(prev => ({ ...prev, project_id: projectId.toString() }))
    } else {
      setActiveProjectTab('all')
    }
  }, [projectId])

  const statusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'in-progress', label: 'En Progreso' },
    { value: 'completed', label: 'Completado' },
    { value: 'blocked', label: 'Bloqueado' }
  ]

  const apartmentTypeOptions = [
    { value: 'Departamento', label: 'Departamento' },
    { value: 'Local Comercial', label: 'Local Comercial' },
    { value: 'Estacionamiento', label: 'Estacionamiento' },
    { value: 'Bodega', label: 'Bodega' },
    { value: 'Otro', label: 'Otro' }
  ]

  const handleEdit = (template: any) => {
    setEditingId(template.id)
    setFormData({
      project_id: template.project_id.toString(),
      name: template.name || '',
      apartment_code: (template as any).apartment_code || '',
      apartment_type: template.apartment_type || 'Departamento',
      status: template.status || 'pending',
      area: template.area?.toString() || '',
      floor_area: template.floor_area?.toString() || '',
      balcony_area: template.balcony_area?.toString() || '',
      bedrooms: template.bedrooms?.toString() || '0',
      bathrooms: template.bathrooms?.toString() || '0',
      notes: template.notes || ''
    })
    setSelectedProjectId(template.project_id)
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({
      project_id: projectId?.toString() || '',
      name: '',
      apartment_code: '',
      apartment_type: 'Departamento',
      status: 'pending',
      area: '',
      floor_area: '',
      balcony_area: '',
      bedrooms: '0',
      bathrooms: '0',
      notes: ''
    })
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.project_id) {
      toast.error('Por favor, complete nombre y proyecto')
      return
    }

    try {
      const templateData = {
        project_id: parseInt(String(formData.project_id)),
        name: formData.name.trim(),
        apartment_code: formData.apartment_code.trim() || null,
        apartment_type: formData.apartment_type,
        status: formData.status,
        area: formData.area ? parseFloat(formData.area) : null,
        floor_area: formData.floor_area ? parseFloat(formData.floor_area) : null,
        balcony_area: formData.balcony_area ? parseFloat(formData.balcony_area) : null,
        bedrooms: parseInt(formData.bedrooms) || 0,
        bathrooms: parseInt(formData.bathrooms) || 0,
        notes: formData.notes.trim() || null
      }

      if (editingId) {
        await updateTemplate(editingId, templateData)
        toast.success('Plantilla actualizada exitosamente')
      } else {
        await createTemplate(templateData)
        toast.success('Plantilla creada exitosamente')
      }
      handleCancel()
      refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la plantilla')
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Está seguro de eliminar la plantilla "${name}"?`)) {
      return
    }

    try {
      await deleteTemplate(id)
      toast.success('Plantilla eliminada exitosamente')
      refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar la plantilla')
    }
  }

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión de Plantillas de Departamentos"
      size="lg"
    >
      <div className="space-y-4">
        {/* Formulario de creación/edición */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Proyecto <span className="text-red-400">*</span>
                </label>
                <Select
                  value={formData.project_id}
                  onChange={(e) => {
                    setFormData({ ...formData, project_id: e.target.value })
                    setSelectedProjectId(e.target.value ? parseInt(e.target.value) : undefined)
                  }}
                  disabled={!!projectId}
                >
                  <option value="">Seleccionar proyecto</option>
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                  ))}
                </Select>
              </div>
              <Input
                label="Nombre de la Plantilla"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Departamento Estándar, Local Comercial..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Código de Departamento (Opcional)
                </label>
                <Input
                  type="text"
                  value={formData.apartment_code}
                  onChange={(e) => setFormData({ ...formData, apartment_code: e.target.value })}
                  placeholder="Ej: A1 D, B0 D, F3X D"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Código que se mostrará antes del número (sin guion)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tipo de Departamento
                </label>
                <Input
                  type="text"
                  value={formData.apartment_type}
                  onChange={(e) => setFormData({ ...formData, apartment_type: e.target.value })}
                  placeholder="Ej: Departamento, Local Comercial..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Estado por Defecto
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Área Total (m²)"
                type="number"
                step="0.01"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="0"
              />
              <Input
                label="Área de Piso (m²)"
                type="number"
                step="0.01"
                value={formData.floor_area}
                onChange={(e) => setFormData({ ...formData, floor_area: e.target.value })}
                placeholder="0"
              />
              <Input
                label="Área de Balcón (m²)"
                type="number"
                step="0.01"
                value={formData.balcony_area}
                onChange={(e) => setFormData({ ...formData, balcony_area: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Habitaciones"
                type="number"
                min="0"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              />
              <Input
                label="Baños"
                type="number"
                min="0"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
              />
            </div>
            <div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {editingId && (
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || !formData.project_id}
            >
              <Save className="w-4 h-4 mr-2" />
              {editingId ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </div>

        {/* Lista de plantillas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Plantillas Existentes</h3>
            {/* Tabs por proyecto */}
            {!projectId && templateProjects.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setActiveProjectTab('all')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    activeProjectTab === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Todos ({allTemplates.length})
                </button>
                {templateProjects.map(proj => {
                  const count = allTemplates.filter(t => t.project_id === proj.id).length
                  return (
                    <button
                      key={proj.id}
                      onClick={() => setActiveProjectTab(proj.id)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        activeProjectTab === proj.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {proj.name} ({count})
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-400">Cargando plantillas...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              {projectId ? 'No hay plantillas para este proyecto' : activeProjectTab === 'all' ? 'No hay plantillas creadas' : 'No hay plantillas para este proyecto'}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {templates.map(template => {
                const project = projects.find(p => p.id === template.project_id)
                return (
                  <div
                    key={template.id}
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    {editingId === template.id ? (
                      null
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h4 className="font-semibold text-white">{template.name}</h4>
                            {!projectId && project && (
                              <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                {project.name}
                              </span>
                            )}
                            {(template as any).apartment_code && (
                              <span className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                Código: {(template as any).apartment_code}
                              </span>
                            )}
                            <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {template.apartment_type}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300 border border-green-500/30">
                              {template.status}
                            </span>
                            {template.area && (
                              <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                {template.area}m²
                              </span>
                            )}
                            {(template.bedrooms > 0 || template.bathrooms > 0) && (
                              <span className="text-xs px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {template.bedrooms} hab. / {template.bathrooms} baños
                              </span>
                            )}
                          </div>
                          {template.notes && (
                            <p className="text-sm text-slate-400 mb-2">{template.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(template.id, template.name)}
                            className="bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </ModalV2>
  )
}

