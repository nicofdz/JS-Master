'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { X, Download, Eye, FileText, Calendar, User, ZoomIn } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { PlanImageZoom } from './PlanImageZoom'

interface PlanViewerModalProps {
  isOpen: boolean
  onClose: () => void
  project: {
    id: number
    name: string
    plan_pdf?: string | null
    plan_image_url?: string | null
    plan_uploaded_at?: string | null
  }
}

export function PlanViewerModal({ isOpen, onClose, project }: PlanViewerModalProps) {
  const [imageError, setImageError] = useState(false)
  const [showZoom, setShowZoom] = useState(false)

  if (!isOpen || !project) return null

  const hasPlan = project.plan_pdf || project.plan_image_url

  const handleDownload = async () => {
    if (project.plan_pdf) {
      try {
        // Crear un enlace temporal para descargar
        const link = document.createElement('a')
        link.href = project.plan_pdf
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        
        // Intentar descargar directamente
        const response = await fetch(project.plan_pdf)
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          link.href = url
          link.download = `plano-${project.name.replace(/\s+/g, '-').toLowerCase()}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        } else {
          // Si falla, abrir en nueva pestaña
          window.open(project.plan_pdf, '_blank')
        }
      } catch (error) {
        console.error('Error downloading PDF:', error)
        // Fallback: abrir en nueva pestaña
        window.open(project.plan_pdf, '_blank')
      }
    }
  }

  const handleImageError = () => {
    setImageError(true)
  }

  const handleImageClick = () => {
    if (project.plan_image_url && !imageError) {
      setShowZoom(true)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <FileText className="w-5 h-5" />
            <span>Plano del Proyecto: {project.name}</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-900 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="overflow-y-auto max-h-[70vh]">
          {!hasPlan ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay plano disponible
              </h3>
              <p className="text-gray-500">
                Este proyecto no tiene un plano asociado.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Información del plano */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Proyecto:</span>
                    <span className="text-gray-900">{project.name}</span>
                  </div>
                  {project.plan_uploaded_at && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-700">Subido:</span>
                      <span className="text-gray-900">{formatDate(project.plan_uploaded_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vista previa del plano */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Eye className="w-4 h-4 mr-2" />
                    Vista Previa del Plano
                  </h4>
                </div>
                
                <div className="p-4">
                  {project.plan_image_url && !imageError ? (
                    <div className="text-center">
                      <div className="relative inline-block">
                        <img
                          src={project.plan_image_url}
                          alt={`Plano de ${project.name}`}
                          className="max-w-full h-auto mx-auto rounded-lg shadow-lg cursor-zoom-in hover:shadow-xl transition-shadow duration-200"
                          onError={handleImageError}
                          onClick={handleImageClick}
                          style={{ maxHeight: '500px' }}
                        />
                        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                          <ZoomIn className="w-3 h-3 inline mr-1" />
                          Click para ampliar
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Vista previa del plano (primera página) - Haz clic para ampliar
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 mb-4">
                        {imageError ? 'Error al cargar la imagen' : 'Vista previa no disponible'}
                      </p>
                      {project.plan_pdf && (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-400">
                            Haz clic en "Descargar PDF" para ver el plano completo
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(project.plan_pdf, '_blank')}
                            className="mt-2"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Abrir PDF en Nueva Pestaña
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-center space-x-4">
                {project.plan_pdf && (
                  <Button
                    onClick={handleDownload}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar PDF
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={onClose}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Zoom */}
      <PlanImageZoom
        isOpen={showZoom}
        onClose={() => setShowZoom(false)}
        imageUrl={project.plan_image_url || ''}
        projectName={project.name}
        pdfUrl={project.plan_pdf || undefined}
      />
    </div>
  )
}
