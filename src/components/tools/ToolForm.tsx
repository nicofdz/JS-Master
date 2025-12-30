'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Upload, Image as ImageIcon, Trash, Save, Wrench, Briefcase, DollarSign, MapPin, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { useTools } from '@/hooks/useTools'
import toast from 'react-hot-toast'
import clsx from 'clsx'


interface Tool {
  id?: number
  name: string
  brand: string
  status: string
  value: number
  location: string
  details: string
  image_url?: string | null
  project_id: number | null
}

interface ToolFormProps {
  tool?: Tool | null
  onSave: (tool: Tool) => void
  onClose: () => void
}

export function ToolForm({ tool, onSave, onClose }: ToolFormProps) {
  const { uploadToolImage, projects } = useTools()
  const isEditing = !!tool

  const [formData, setFormData] = useState<Tool>({
    name: '',
    brand: '',
    status: 'disponible',
    value: 0,
    location: 'Almacén Principal',
    details: '',
    image_url: null,
    project_id: null
  })

  // State initialization handled by useEffect below

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (tool) {
      setFormData(tool)
      if (tool.image_url) {
        setPreviewUrl(tool.image_url)
      }
    } else {
      setFormData({
        name: '',
        brand: '',
        status: 'disponible',
        value: 0,
        location: 'Almacén Principal',
        details: '',
        image_url: null,
        project_id: null
      })
      setPreviewUrl(null)
    }
  }, [tool])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }

    if (!formData.brand.trim()) {
      newErrors.brand = 'La marca es requerida'
    }

    if (formData.value < 0) {
      newErrors.value = 'El valor no puede ser negativo'
    }

    if (!formData.details.trim()) {
      newErrors.details = 'Los detalles son requeridos'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('La imagen no debe superar los 5MB')
        return
      }
      setSelectedImage(file)
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setPreviewUrl(null)
    setFormData(prev => ({ ...prev, image_url: null }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      try {
        let imageUrl = formData.image_url

        if (selectedImage) {
          setIsUploading(true)
          try {
            imageUrl = await uploadToolImage(selectedImage)
          } catch (error) {
            toast.error('Error al subir la imagen')
            setIsUploading(false)
            return
          }
          setIsUploading(false)
        }

        onSave({ ...formData, image_url: imageUrl })
      } catch (error) {
        console.error('Error submitting form:', error)
        setIsUploading(false)
      }
    }
  }

  const handleChange = (field: keyof Tool, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl shadow-2xl shadow-black/50 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col sm:flex-row border border-slate-800 animate-in zoom-in-95 duration-200 text-slate-200">

        {/* Left Side - Image Upload */}
        <div className="w-full sm:w-1/3 bg-slate-800/50 border-r border-slate-800 flex flex-col">
          <div className="p-6 flex-1 flex flex-col justify-center items-center">
            <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Imagen de Herramienta</h3>

            <div
              className={clsx(
                "relative w-full aspect-square rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden cursor-pointer group",
                previewUrl ? "border-slate-600 bg-slate-800" : "border-slate-700 hover:border-blue-500 bg-slate-800/50 hover:bg-slate-800"
              )}
              onClick={() => !previewUrl && fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />

              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                    <Button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                      variant="outline"
                      className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 w-32"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Cambiar
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveImage() }}
                      variant="danger"
                      className="bg-red-500/80 hover:bg-red-600 text-white border-none w-32"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Quitar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center p-6 text-center">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-blue-400" />
                  </div>
                  <p className="text-slate-300 font-medium mb-1">Subir imagen</p>
                  <p className="text-xs text-slate-500">Click para explorar</p>
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                Formatos soportados: JPG, PNG, WebP<br />Tamaño máximo: 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Form Details */}
        <div className="flex-1 flex flex-col max-h-[90vh] bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-500" />
                {isEditing ? 'Editar Herramienta' : 'Nueva Herramienta'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">Completa los detalles del equipo</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            <form id="tool-form" onSubmit={handleSubmit} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-500" />
                    Nombre del Equipo *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ej: Taladro Percutor 18V"
                    className={clsx(
                      "bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500",
                      errors.name && "border-red-500 focus:ring-red-500 focus:border-red-500"
                    )}
                  />
                  {errors.name && <p className="text-xs text-red-400 font-medium">{errors.name}</p>}
                </div>

                {/* Marca */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-500" />
                    Marca / Modelo *
                  </label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    placeholder="Ej: Makita / DHP482"
                    className={clsx(
                      "bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500",
                      errors.brand && "border-red-500 focus:ring-red-500 focus:border-red-500"
                    )}
                  />
                  {errors.brand && <p className="text-xs text-red-400 font-medium">{errors.brand}</p>}
                </div>

                {/* Estado - Solo visible si es edición */}
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Estado Actual</label>
                    <Select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="bg-slate-800/50 border-slate-700 text-slate-200 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="disponible">✅ Disponible</option>
                      <option value="prestada">⏳ Prestada</option>
                      <option value="mantenimiento">🛠️ En Mantenimiento</option>
                      <option value="perdida">❌ Perdida</option>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2 opacity-60">
                    <label className="text-sm font-medium text-slate-400">Estado Inicial</label>
                    <div className="w-full px-3 py-2 bg-slate-800/30 border border-slate-700 rounded-md text-slate-400 text-sm flex items-center gap-2 cursor-not-allowed">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Disponible
                    </div>
                  </div>
                )}

                {/* Valor */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-500" />
                    Valor Estimado
                  </label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => handleChange('value', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    className={clsx(
                      "bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500",
                      errors.value && "border-red-500 focus:ring-red-500 focus:border-red-500"
                    )}
                  />
                  {errors.value && <p className="text-xs text-red-400 font-medium">{errors.value}</p>}
                </div>

                {/* Proyecto Asignado */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    Proyecto Asignado (Opcional)
                  </label>
                  <Select
                    value={formData.project_id || ''}
                    onChange={(e) => handleChange('project_id', e.target.value ? Number(e.target.value) : null)}
                    className="bg-slate-800/50 border-slate-700 text-slate-200 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Sin proyecto asignado (En bodega central) --</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        🏢 {project.name}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-slate-500">
                    Si se selecciona un proyecto, la herramienta se considerará parte del inventario de esa obra.
                  </p>
                </div>

                {/* Ubicación */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    Ubicación Física
                  </label>
                  <Input
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="Ej: Bodega Central, Pañol Obra X, Estante 3"
                    className="bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Detalles */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-400">Detalles y Observaciones *</label>
                  <Textarea
                    value={formData.details}
                    onChange={(e) => handleChange('details', e.target.value)}
                    placeholder="Describe el estado de la herramienta, números de serie, accesorios incluidos..."
                    rows={4}
                    className={clsx(
                      "bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600 resize-none focus:ring-blue-500 focus:border-blue-500",
                      errors.details && "border-red-500 focus:ring-red-500 focus:border-red-500"
                    )}
                  />
                  {errors.details && <p className="text-xs text-red-400 font-medium">{errors.details}</p>}
                </div>
              </div>
            </form>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3 sticky bottom-0">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="tool-form"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-lg shadow-blue-500/20"
              disabled={isUploading}
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Guardar Cambios' : 'Crear Herramienta'}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
