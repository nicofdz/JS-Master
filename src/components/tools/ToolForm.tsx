'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Upload, Image as ImageIcon, Trash } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useTools } from '@/hooks/useTools'
import toast from 'react-hot-toast'

interface Tool {
  id?: number
  name: string
  brand: string
  status: string
  value: number
  location: string
  details: string
  image_url?: string | null
}

interface ToolFormProps {
  tool?: Tool | null
  onSave: (tool: Tool) => void
  onClose: () => void
}

export function ToolForm({ tool, onSave, onClose }: ToolFormProps) {
  const { uploadToolImage } = useTools()
  const [formData, setFormData] = useState<Tool>({
    name: '',
    brand: '',
    status: 'disponible',
    value: 0,
    location: 'Almacén Principal',
    details: '',
    image_url: null
  })

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
        image_url: null
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

    if (formData.value <= 0) {
      newErrors.value = 'El valor debe ser mayor a 0'
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

  const handleChange = (field: keyof Tool, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {tool ? 'Editar Herramienta' : 'Nueva Herramienta'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Imagen de la herramienta */}
          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative w-full h-48 sm:h-64 rounded-md overflow-hidden group">
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="w-full h-full object-contain bg-gray-100"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="bg-white/90 border-white text-gray-900 hover:bg-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Cambiar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRemoveImage}
                    variant="danger"
                    className="bg-red-500/90 hover:bg-red-600 text-white border-none"
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Quitar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                <div className="bg-gray-200 p-4 rounded-full mb-3">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-medium text-sm mb-1">Cargar foto de la herramienta</p>
                <p className="text-xs text-gray-400 mb-4">PNG, JPG o WebP hasta 5MB</p>
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar archivo
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Herramienta *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Taladro Percutor"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca *
              </label>
              <Input
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="Ej: Bosch, DeWalt, Makita"
                className={errors.brand ? 'border-red-500' : ''}
              />
              {errors.brand && (
                <p className="mt-1 text-sm text-red-600">{errors.brand}</p>
              )}
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <Select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="disponible">Disponible</option>
                <option value="prestada">Prestada</option>
                <option value="mantenimiento">En Mantenimiento</option>
                <option value="perdida">Perdida</option>
              </Select>
            </div>

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor ($) *
              </label>
              <Input
                type="number"
                value={formData.value}
                onChange={(e) => handleChange('value', parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
                className={errors.value ? 'border-red-500' : ''}
              />
              {errors.value && (
                <p className="mt-1 text-sm text-red-600">{errors.value}</p>
              )}
            </div>

            {/* Ubicación */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ubicación
              </label>
              <Input
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Ej: Almacén Principal, Prestada a Juan Pérez"
              />
            </div>

            {/* Detalles */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detalles *
              </label>
              <Textarea
                value={formData.details}
                onChange={(e) => handleChange('details', e.target.value)}
                placeholder="Describe las características específicas de la herramienta, accesorios incluidos, estado, etc."
                rows={4}
                className={errors.details ? 'border-red-500' : ''}
              />
              {errors.details && (
                <p className="mt-1 text-sm text-red-600">{errors.details}</p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200"
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isUploading}
            >
              {isUploading ? 'Subiendo...' : (tool ? 'Actualizar' : 'Crear') + ' Herramienta'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
