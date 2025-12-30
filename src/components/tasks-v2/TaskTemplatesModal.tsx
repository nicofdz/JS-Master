'use client'

import { useState, useEffect } from 'react'
import { ModalV2 } from './ModalV2'
import { useTaskTemplates } from '@/hooks/useTaskTemplates'
import { useProjects } from '@/hooks/useProjects'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Search,
  Tag,
  Clock,
  AlertTriangle,
  FileText,
  Filter,
  Building2
} from 'lucide-react'
import toast from 'react-hot-toast'

interface TaskTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  projectId?: number
}

export function TaskTemplatesModal({ isOpen, onClose, projectId: propProjectId }: TaskTemplatesModalProps) {
  const { projects } = useProjects()

  // Internal state for selected project if prop is not provided. Default to 'all' if no prop.
  const [internalProjectId, setInternalProjectId] = useState<number | 'all' | undefined>(propProjectId || 'all')

  // Update internal project ID when prop changes
  useEffect(() => {
    if (propProjectId) {
      setInternalProjectId(propProjectId)
    }
  }, [propProjectId])

  const effectiveProjectId = propProjectId || internalProjectId

  const { templates, loading, refresh, createTemplate, updateTemplate, deleteTemplate } = useTaskTemplates(effectiveProjectId)

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    category: string
    estimated_hours: number | string
    total_budget: number | string
    priority: string
    description: string
  }>({
    name: '',
    category: '',
    estimated_hours: '',
    total_budget: '',
    priority: 'medium',
    description: ''
  })

  // Category State
  const [taskCategories, setTaskCategories] = useState<{ id: number; name: string }[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)

  // Search/Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  // Load Categories
  const loadCategories = async () => {
    try {
      setLoadingCategories(true)
      const { data, error } = await supabase
        .from('task_categories')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) throw error
      setTaskCategories(data || [])
    } catch (err) {
      console.error('Error loading categories:', err)
      toast.error('Error al cargar categorías')
    } finally {
      setLoadingCategories(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const priorityOptions = [
    { value: 'urgent', label: 'Urgente', color: 'text-red-400 border-red-400/30 bg-red-400/10' },
    { value: 'high', label: 'Alta', color: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
    { value: 'medium', label: 'Media', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
    { value: 'low', label: 'Baja', color: 'text-green-400 border-green-400/30 bg-green-400/10' }
  ]

  const handleEdit = (template: any) => {
    setEditingId(template.id)
    setFormData({
      name: template.name || '',
      category: template.category || '',
      estimated_hours: template.estimated_hours || 8,
      total_budget: template.total_budget || '',
      priority: template.priority || 'medium',
      description: template.description || ''
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({
      name: '',
      category: '',
      estimated_hours: '',
      total_budget: '',
      priority: 'medium',
      description: ''
    })
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.category.trim()) {
      toast.error('Por favor, complete nombre y categoría')
      return
    }

    const payload = {
      ...formData,
      estimated_hours: formData.estimated_hours === '' ? 0 : Number(formData.estimated_hours),
      total_budget: formData.total_budget === '' ? 0 : Number(formData.total_budget)
    }

    try {
      if (editingId) {
        await updateTemplate(editingId, payload)
        toast.success('Plantilla actualizada exitosamente')
      } else {
        await createTemplate(payload)
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

  // Category CRUD logic (unchanged)
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Por favor, ingrese un nombre para la categoría')
      return
    }

    if (taskCategories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      toast.error('Esta categoría ya existe')
      return
    }

    try {
      setAddingCategory(true)
      const { data, error } = await supabase
        .from('task_categories')
        .insert({ name: newCategoryName.trim() })
        .select()
        .single()

      if (error) throw error

      toast.success('Categoría creada exitosamente')
      setNewCategoryName('')
      setShowNewCategoryInput(false)
      await loadCategories()
    } catch (err: any) {
      console.error('Error creating category:', err)
      toast.error(err.message || 'Error al crear la categoría')
    } finally {
      setAddingCategory(false)
    }
  }

  const handleEditCategory = (category: { id: number; name: string }) => {
    setEditingCategoryId(category.id)
    setNewCategoryName(category.name)
    setShowNewCategoryInput(true)
  }

  const handleUpdateCategory = async () => {
    if (!newCategoryName.trim() || !editingCategoryId) return

    try {
      setAddingCategory(true)
      const { error } = await supabase
        .from('task_categories')
        .update({ name: newCategoryName.trim() })
        .eq('id', editingCategoryId)

      if (error) throw error

      toast.success('Categoría actualizada')
      setNewCategoryName('')
      setEditingCategoryId(null)
      setShowNewCategoryInput(false)
      await loadCategories()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAddingCategory(false)
    }
  }

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar categoría "${name}"?`)) return

    try {
      const { error } = await supabase.from('task_categories').delete().eq('id', id)
      if (error) throw error
      toast.success('Categoría eliminada')
      await loadCategories()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleCancelCategory = () => {
    setNewCategoryName('')
    setEditingCategoryId(null)
    setShowNewCategoryInput(false)
  }

  // Filtering
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión de Plantillas"
      size="2xl"
    >
      <div className="flex flex-col h-full space-y-6">

        {/* Top Section: Form */}
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Tag className="w-32 h-32 text-blue-500" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {editingId ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-green-400" />}
                {editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </h3>
              {editingId && (
                <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">ID: {editingId}</span>
              )}
            </div>

            {/* Project Selector if not provided by prop */}
            {!propProjectId && (
              <div className="mb-6 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Seleccionar Proyecto
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-slate-400" />
                  </div>
                  <select
                    value={internalProjectId === 'all' ? 'all' : (internalProjectId || '')}
                    onChange={(e) => {
                      const val = e.target.value
                      setInternalProjectId(val === 'all' ? 'all' : Number(val))
                    }}
                    className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
                  >
                    <option value="all">Todos los Proyectos</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                {internalProjectId === 'all' && (
                  <p className="text-xs text-blue-400 mt-2 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Visualizando plantillas de todos los proyectos. Seleccione un proyecto específico para crear nuevas plantillas.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <Input
                  label="Nombre de la Tarea"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Instalación de Piso Flotante"
                  className="bg-slate-800 border-slate-600 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  Categoría
                </label>
                <div className="flex gap-2">
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    disabled={loadingCategories}
                    className="bg-slate-800 border-slate-600 focus:border-purple-500 flex-1"
                  >
                    <option value="">Seleccionar...</option>
                    {taskCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                    className="px-2 border-slate-600 hover:bg-slate-800 text-slate-300"
                    title="Administrar Categorías"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Category Management Popover/Inline */}
                {showNewCategoryInput && (
                  <div className="mt-2 p-3 bg-slate-800 rounded-lg border border-slate-600 animate-in fade-in slide-in-from-top-2">
                    <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                      {editingCategoryId ? 'Editar Categoría' : 'Nueva Categoría'}
                    </div>
                    <div className="flex gap-2 mb-3">
                      <input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nombre..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                      <Button size="sm" onClick={editingCategoryId ? handleUpdateCategory : handleAddCategory} disabled={addingCategory}>
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelCategory}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                      {taskCategories.map(cat => (
                        <div key={cat.id} className="text-xs flex items-center bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 group">
                          <span className="text-slate-300 mr-1">{cat.name}</span>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditCategory(cat)} className="text-blue-400 hover:text-blue-300"><Edit2 className="w-2.5 h-2.5" /></button>
                            <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-red-400 hover:text-red-300"><Trash2 className="w-2.5 h-2.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Horas Est.
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                    className="bg-slate-800 border-slate-600 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <span className="text-green-400 font-bold">$</span>
                    Presupuesto
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">$</span>
                    <Input
                      type="number"
                      min="0"
                      value={formData.total_budget}
                      onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                      className="bg-slate-800 border-slate-600 focus:border-green-500 pl-6"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    Prioridad
                  </label>
                  <Select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="bg-slate-800 border-slate-600 focus:border-orange-500"
                  >
                    {priorityOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                  placeholder="Detalles adicionales, materiales requeridos, notas..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700/50">
              {editingId && (
                <Button variant="outline" onClick={handleCancel} className="border-slate-600 text-slate-300 hover:text-white">
                  Cancelar Edición
                </Button>
              )}
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Guardar Cambios' : 'Crear Plantilla'}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section: List */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex items-center gap-2 text-slate-200 font-medium">
              <Filter className="w-4 h-4 text-slate-400" />
              Plantillas ({filteredTemplates.length})
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-40 bg-slate-900 border-slate-600 text-sm py-1.5"
              >
                <option value="ALL">Todas las Cat.</option>
                {taskCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading ? (
              <div className="text-center py-10 text-slate-500">Cargando plantillas...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-10 text-slate-500 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                No se encontraron plantillas.{!effectiveProjectId && " Seleccione un proyecto arriba."}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredTemplates.map(template => {
                  const priorityConfig = priorityOptions.find(p => p.value === template.priority) || priorityOptions[2]

                  return (
                    <div key={template.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700 hover:border-slate-500 hover:bg-slate-700/50 transition-all group flex gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-200">{template.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-2">
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {template.category}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {template.estimated_hours}h
                          </div>
                          {(template.total_budget || 0) > 0 && (
                            <div className="flex items-center gap-1 text-green-400">
                              <span className="font-bold">$</span>
                              {Number(template.total_budget).toLocaleString('es-CL')}
                            </div>
                          )}
                        </div>

                        {template.description && (
                          <p className="text-sm text-slate-500 line-clamp-1 group-hover:line-clamp-none transition-all">{template.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity self-center">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(template)} className="h-8 w-8 p-0 border-slate-600 hover:bg-blue-900/30 hover:text-blue-400 hover:border-blue-500">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(template.id, template.name)} className="h-8 w-8 p-0 border-slate-600 hover:bg-red-900/30 hover:text-red-400 hover:border-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalV2 >
  )
}
