'use client'

import { useState, useEffect } from 'react'
import { ModalV2 } from './ModalV2'
import { useTaskTemplates } from '@/hooks/useTaskTemplates'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface TaskTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TaskTemplatesModal({ isOpen, onClose }: TaskTemplatesModalProps) {
  const { templates, loading, refresh, createTemplate, updateTemplate, deleteTemplate } = useTaskTemplates()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    estimated_hours: 8,
    priority: 'medium' as string,
    description: ''
  })
  const [taskCategories, setTaskCategories] = useState<{ id: number; name: string }[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)

  // Cargar categorías de tareas
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
    { value: 'urgent', label: 'Urgente' },
    { value: 'high', label: 'Alta' },
    { value: 'medium', label: 'Media' },
    { value: 'low', label: 'Baja' }
  ]

  const handleEdit = (template: any) => {
    setEditingId(template.id)
    setFormData({
      name: template.name || '',
      category: template.category || '',
      estimated_hours: template.estimated_hours || 8,
      priority: template.priority || 'medium',
      description: template.description || ''
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({
      name: '',
      category: '',
      estimated_hours: 8,
      priority: 'medium',
      description: ''
    })
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.category.trim()) {
      toast.error('Por favor, complete nombre y categoría')
      return
    }

    try {
      if (editingId) {
        await updateTemplate(editingId, formData)
        toast.success('Plantilla actualizada exitosamente')
      } else {
        await createTemplate(formData)
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

  // CRUD de Categorías
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Por favor, ingrese un nombre para la categoría')
      return
    }

    // Verificar si ya existe
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
    if (!newCategoryName.trim() || !editingCategoryId) {
      toast.error('Por favor, ingrese un nombre para la categoría')
      return
    }

    // Verificar si ya existe (excluyendo la actual)
    if (taskCategories.some(cat => 
      cat.id !== editingCategoryId && 
      cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    )) {
      toast.error('Esta categoría ya existe')
      return
    }

    try {
      setAddingCategory(true)
      const { error } = await supabase
        .from('task_categories')
        .update({ name: newCategoryName.trim() })
        .eq('id', editingCategoryId)

      if (error) throw error

      toast.success('Categoría actualizada exitosamente')
      setNewCategoryName('')
      setEditingCategoryId(null)
      setShowNewCategoryInput(false)
      await loadCategories()
    } catch (err: any) {
      console.error('Error updating category:', err)
      toast.error(err.message || 'Error al actualizar la categoría')
    } finally {
      setAddingCategory(false)
    }
  }

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`¿Está seguro de eliminar la categoría "${name}"? Esto no eliminará las plantillas que la usan.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('task_categories')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Categoría eliminada exitosamente')
      await loadCategories()
    } catch (err: any) {
      console.error('Error deleting category:', err)
      toast.error(err.message || 'Error al eliminar la categoría')
    }
  }

  const handleCancelCategory = () => {
    setNewCategoryName('')
    setEditingCategoryId(null)
    setShowNewCategoryInput(false)
  }

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión de Plantillas de Tareas"
      size="lg"
    >
      <div className="space-y-4">
        {/* Formulario de creación/edición */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre de la Tarea"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Tabiques, Instalación de puertas..."
            />
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Categoría *
              </label>
              <div className="flex items-center gap-2">
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={loadingCategories}
                  className="flex-1"
                >
                  <option value="">{loadingCategories ? 'Cargando...' : 'Seleccionar categoría'}</option>
                  {taskCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategoryInput(!showNewCategoryInput)
                    if (!showNewCategoryInput) {
                      setEditingCategoryId(null)
                      setNewCategoryName('')
                    }
                  }}
                  className="p-2 rounded-md border border-slate-600 text-slate-200 hover:text-white hover:border-blue-500"
                  title="Gestionar categorías"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {showNewCategoryInput && (
                <div className="mt-2 p-3 bg-slate-700 rounded-md border border-slate-600">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder={editingCategoryId ? "Editar nombre de categoría" : "Nombre de la categoría"}
                      className="flex-1 px-3 py-2 border border-slate-600 bg-slate-800 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={editingCategoryId ? handleUpdateCategory : handleAddCategory}
                      disabled={addingCategory || !newCategoryName.trim()}
                    >
                      {addingCategory ? 'Guardando...' : editingCategoryId ? 'Actualizar' : 'Crear'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCancelCategory}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {taskCategories.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-600">
                      <p className="text-xs text-slate-400 mb-2">Categorías existentes:</p>
                      <div className="flex flex-wrap gap-2">
                        {taskCategories.map(cat => (
                          <div
                            key={cat.id}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded border border-slate-600"
                          >
                            <span className="text-xs text-slate-300">{cat.name}</span>
                            <button
                              type="button"
                              onClick={() => handleEditCategory(cat)}
                              className="text-blue-400 hover:text-blue-300"
                              title="Editar"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="text-red-400 hover:text-red-300"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Prioridad
              </label>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                {priorityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <Input
              label="Horas Estimadas"
              type="number"
              min="1"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: parseInt(e.target.value) || 8 })}
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Descripción de la tarea..."
              />
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
              disabled={!formData.name.trim() || !formData.category.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              {editingId ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </div>

        {/* Lista de plantillas */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Plantillas Existentes</h3>
          {loading ? (
            <div className="text-center py-8 text-slate-400">Cargando plantillas...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No hay plantillas creadas</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  {editingId === template.id ? (
                    // Vista de edición (ya está en el formulario arriba)
                    null
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-white">{template.name}</h4>
                          <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {template.category}
                          </span>
                          {template.priority && (
                            <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {priorityOptions.find(p => p.value === template.priority)?.label || template.priority}
                            </span>
                          )}
                          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300 border border-green-500/30">
                            {template.estimated_hours}h
                          </span>
                        </div>
                        {template.description && (
                          <p className="text-sm text-slate-400 mb-2">{template.description}</p>
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
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalV2>
  )
}

