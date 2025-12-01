'use client'

import { Upload, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ConfirmModalV2 } from './ConfirmModalV2'

interface TaskPhotosContentProps {
  task?: any
  onPhotoUploaded?: () => void
}

export function TaskPhotosContent({ task, onPhotoUploaded }: TaskPhotosContentProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showDescriptionInput, setShowDescriptionInput] = useState(false)
  const [photoDescription, setPhotoDescription] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [photoToDelete, setPhotoToDelete] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Obtener fotos desde progress_photos (JSONB array)
  const photos = task?.progress_photos && Array.isArray(task.progress_photos) 
    ? task.progress_photos 
    : []

  const handlePhotoClick = (index: number) => {
    setSelectedPhotoIndex(index)
  }

  const handlePrevious = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1)
    }
  }

  const handleNext = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Sin fecha'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no puede ser mayor a 10MB')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Guardar archivo y mostrar input de descripción
    setPendingFile(file)
    setShowDescriptionInput(true)
    setPhotoDescription('')
  }

  const handlePhotoUpload = async () => {
    if (!pendingFile) return

    // Validar que la tarea existe
    if (!task?.id) {
      toast.error('No se puede subir foto: la tarea no tiene ID')
      setPendingFile(null)
      setShowDescriptionInput(false)
      return
    }

    setUploadingPhoto(true)

    try {
      // Generar nombre único
      const fileExt = pendingFile.name.split('.').pop()
      const fileName = `task-${task.id}-${Date.now()}.${fileExt}`
      const filePath = `${task.id}/${fileName}`

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-photos')
        .upload(filePath, pendingFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Error al subir foto: ${uploadError.message}`)
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('task-photos')
        .getPublicUrl(filePath)

      // Agregar foto a la lista
      const newPhoto = {
        url: publicUrl,
        description: photoDescription.trim() || undefined,
        uploaded_at: new Date().toISOString()
      }

      const updatedPhotos = [...photos, newPhoto]

      // Actualizar en la base de datos
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ progress_photos: updatedPhotos })
        .eq('id', task.id)

      if (updateError) {
        throw new Error(`Error al guardar foto: ${updateError.message}`)
      }

      // Limpiar formulario
      setPendingFile(null)
      setShowDescriptionInput(false)
      setPhotoDescription('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      toast.success('Foto subida exitosamente')
      
      // Llamar callback para refrescar la tarea
      if (onPhotoUploaded) {
        onPhotoUploaded()
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error)
      toast.error(error.message || 'Error al subir foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleCancelUpload = () => {
    setPendingFile(null)
    setShowDescriptionInput(false)
    setPhotoDescription('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleDeletePhotoClick = (index: number) => {
    setPhotoToDelete(index)
    setShowDeleteConfirm(true)
  }

  const handleDeletePhoto = async () => {
    if (!task?.id || photoToDelete === null) {
      toast.error('No se puede eliminar foto: la tarea no tiene ID')
      setShowDeleteConfirm(false)
      setPhotoToDelete(null)
      return
    }

    const index = photoToDelete

    try {
      const photo = photos[index]
      const updatedPhotos = photos.filter((_: any, i: number) => i !== index)

      // Actualizar en la base de datos
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ progress_photos: updatedPhotos })
        .eq('id', task.id)

      if (updateError) {
        throw new Error(`Error al eliminar foto: ${updateError.message}`)
      }

      // Intentar eliminar del storage (opcional, no crítico si falla)
      if (photo.url) {
        try {
          // Extraer el path del archivo desde la URL
          // La URL es algo como: https://xxx.supabase.co/storage/v1/object/public/task-photos/123/file.jpg
          // Necesitamos: 123/file.jpg
          const urlParts = photo.url.split('/')
          const taskIdIndex = urlParts.findIndex((part: string) => part === 'task-photos')
          if (taskIdIndex !== -1 && urlParts.length > taskIdIndex + 2) {
            const filePath = urlParts.slice(taskIdIndex + 1).join('/')
            await supabase.storage
              .from('task-photos')
              .remove([filePath])
          }
        } catch (storageError) {
          console.warn('No se pudo eliminar del storage:', storageError)
          // No es crítico, continuamos
        }
      }

      // Si la foto eliminada era la seleccionada, ajustar el índice
      if (selectedPhotoIndex !== null) {
        if (selectedPhotoIndex === index) {
          // Si eliminamos la foto seleccionada, seleccionar la anterior o cerrar
          if (updatedPhotos.length > 0) {
            setSelectedPhotoIndex(Math.min(selectedPhotoIndex, updatedPhotos.length - 1))
          } else {
            setSelectedPhotoIndex(null)
          }
        } else if (selectedPhotoIndex > index) {
          // Si eliminamos una foto antes de la seleccionada, ajustar el índice
          setSelectedPhotoIndex(selectedPhotoIndex - 1)
        }
      }

      toast.success('Foto eliminada exitosamente')
      
      // Cerrar modal de confirmación
      setShowDeleteConfirm(false)
      setPhotoToDelete(null)
      
      // Llamar callback para refrescar la tarea
      if (onPhotoUploaded) {
        onPhotoUploaded()
      }
    } catch (error: any) {
      console.error('Error deleting photo:', error)
      toast.error(error.message || 'Error al eliminar foto')
      setShowDeleteConfirm(false)
      setPhotoToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Tarea: <span className="font-medium">{task?.task_name || 'Sin nombre'}</span>
        </p>
        {/* Solo mostrar controles de subida en header si hay fotos */}
        {photos.length > 0 && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadingPhoto || showDescriptionInput}
            />
            {showDescriptionInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Descripción de la foto (opcional)"
                  value={photoDescription}
                  onChange={(e) => setPhotoDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePhotoUpload()
                    } else if (e.key === 'Escape') {
                      handleCancelUpload()
                    }
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  autoFocus
                />
                <button
                  onClick={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingPhoto ? 'Subiendo...' : 'Subir'}
                </button>
                <button
                  onClick={handleCancelUpload}
                  disabled={uploadingPhoto}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button 
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleUploadClick}
                disabled={uploadingPhoto}
              >
                <Upload className="w-4 h-4" />
                Subir Nueva Foto
              </button>
            )}
          </div>
        )}
      </div>

      {/* Galería de Fotos - Grid 3 Columnas */}
      {photos.length > 0 ? (
        <>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-4">
              Galería de Fotos ({photos.length})
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {photos.map((photo: any, index: number) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handlePhotoClick(index)}
                >
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={photo.description || `Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Si la imagen falla, mostrar placeholder
                          e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Imagen+no+disponible'
                        }}
                      />
                    ) : (
                      <span className="text-gray-400">Sin imagen</span>
                    )}
                  </div>
                  <div className="p-2 bg-white">
                    <p className="text-xs text-gray-500 truncate">
                      {photo.description || 'Sin descripción'}
                    </p>
                    {photo.uploaded_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(photo.uploaded_at)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vista Ampliada */}
          {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-center mb-4">
                  {photos[selectedPhotoIndex].url ? (
                    <img
                      src={photos[selectedPhotoIndex].url}
                      alt={photos[selectedPhotoIndex].description || `Foto ${selectedPhotoIndex + 1}`}
                      className="max-w-full max-h-96 rounded-lg shadow-lg"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Imagen+no+disponible'
                      }}
                    />
                  ) : (
                    <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400">Imagen no disponible</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {photos[selectedPhotoIndex].description || 'Sin descripción'}
                    </p>
                    {photos[selectedPhotoIndex].uploaded_at && (
                      <p className="text-xs text-gray-500">
                        Fecha: {formatDate(photos[selectedPhotoIndex].uploaded_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevious}
                      disabled={selectedPhotoIndex === 0}
                      className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                      {selectedPhotoIndex + 1} / {photos.length}
                    </span>
                    <button
                      onClick={handleNext}
                      disabled={selectedPhotoIndex === photos.length - 1}
                      className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button 
                      className="p-2 bg-red-50 border border-red-200 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePhotoClick(selectedPhotoIndex)
                      }}
                      title="Eliminar foto"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">No hay fotos de progreso para esta tarea</p>
          <div className="flex flex-col items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadingPhoto || showDescriptionInput}
            />
            {showDescriptionInput ? (
              <div className="flex flex-col items-center gap-2">
                <input
                  type="text"
                  placeholder="Descripción de la foto (opcional)"
                  value={photoDescription}
                  onChange={(e) => setPhotoDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePhotoUpload()
                    } else if (e.key === 'Escape') {
                      handleCancelUpload()
                    }
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingPhoto ? 'Subiendo...' : 'Subir'}
                  </button>
                  <button
                    onClick={handleCancelUpload}
                    disabled={uploadingPhoto}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button 
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleUploadClick}
                disabled={uploadingPhoto}
              >
                Subir Primera Foto
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModalV2
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setPhotoToDelete(null)
        }}
        onConfirm={handleDeletePhoto}
        title="Eliminar Foto"
        message="¿Estás seguro de que quieres eliminar esta foto? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={uploadingPhoto}
      />
    </div>
  )
}
