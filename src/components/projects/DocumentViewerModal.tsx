'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { X, Download, Eye, FileText, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface DocumentViewerModalProps {
  isOpen: boolean
  onClose: () => void
  project: {
    id: number
    name: string
  }
  documentUrl?: string | null
  documentType: 'contract' | 'specifications'
  title: string
}

export function DocumentViewerModal({ 
  isOpen, 
  onClose, 
  project, 
  documentUrl, 
  documentType,
  title 
}: DocumentViewerModalProps) {
  const [pdfError, setPdfError] = useState(false)

  if (!isOpen || !project) return null

  const hasDocument = !!documentUrl

  const handleDownload = async () => {
    if (documentUrl) {
      try {
        const link = document.createElement('a')
        link.href = documentUrl
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        
        // Intentar descargar directamente
        const response = await fetch(documentUrl)
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          link.href = url
          const fileName = `${documentType}-${project.name.replace(/\s+/g, '-').toLowerCase()}.pdf`
          link.download = fileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        } else {
          // Si falla, abrir en nueva pestaña
          window.open(documentUrl, '_blank')
        }
      } catch (error) {
        console.error('Error downloading PDF:', error)
        // Fallback: abrir en nueva pestaña
        window.open(documentUrl, '_blank')
      }
    }
  }

  const getIcon = () => {
    if (documentType === 'contract') {
      return '📄'
    }
    return '📋'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <FileText className="w-5 h-5" />
            <span>{title}: {project.name}</span>
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
          {!hasDocument ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay documento disponible
              </h3>
              <p className="text-gray-500">
                Este proyecto no tiene {documentType === 'contract' ? 'un contrato' : 'especificaciones técnicas'} asociado.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Información del documento */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Proyecto:</span>
                    <span className="text-gray-900">{project.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Tipo:</span>
                    <span className="text-gray-900">
                      {documentType === 'contract' ? 'Contrato' : 'Especificaciones Técnicas'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vista previa del PDF */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Eye className="w-4 h-4 mr-2" />
                    Vista Previa del Documento
                  </h4>
                </div>
                
                <div className="p-4">
                  {!pdfError ? (
                    <div className="text-center">
                      <div className="relative inline-block w-full">
                        <iframe
                          src={`${documentUrl}#toolbar=0`}
                          className="w-full rounded-lg shadow-lg border"
                          style={{ height: '500px' }}
                          title={`Vista previa ${title}`}
                          onError={() => setPdfError(true)}
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Vista previa del documento PDF
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 mb-4">
                        Vista previa no disponible para este navegador
                      </p>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">
                          Haz clic en &quot;Descargar PDF&quot; para ver el documento completo
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(documentUrl, '_blank')}
                          className="mt-2"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Abrir PDF en Nueva Pestaña
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={handleDownload}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
                
                <Button
                  onClick={() => window.open(documentUrl, '_blank')}
                  variant="outline"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Abrir en Nueva Pestaña
                </Button>
                
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
    </div>
  )
}

