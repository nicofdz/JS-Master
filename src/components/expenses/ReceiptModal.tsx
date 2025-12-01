'use client'

import { X, Download, FileText, Image, File } from 'lucide-react'
import { ExpenseModal } from './ExpenseModal'
import { Button } from '@/components/ui/Button'
import { Expense } from '@/hooks/useExpenses'
import { useProjects } from '@/hooks/useProjects'

interface ReceiptModalProps {
  expense: Expense
  onClose: () => void
}

export function ReceiptModal({ expense, onClose }: ReceiptModalProps) {
  const { projects } = useProjects()
  const isImage = expense.receipt_url?.match(/\.(jpg|jpeg|png|gif)$/i)
  const isPdf = expense.receipt_url?.match(/\.pdf$/i)
  
  // Debug: mostrar la URL del comprobante
  console.log('Receipt URL:', expense.receipt_url)
  console.log('Receipt filename:', expense.receipt_filename)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL')
  }

  const handleDownload = () => {
    if (expense.receipt_url) {
      const link = document.createElement('a')
      link.href = expense.receipt_url
      link.download = expense.receipt_filename || `comprobante-${expense.name.replace(/\s+/g, '-').toLowerCase()}`
      link.target = '_blank'
      link.click()
    }
  }

  const getTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'materiales': 'Materiales',
      'servicios': 'Servicios',
      'epp': 'EPP',
      'combustible': 'Combustible',
      'herramientas': 'Herramientas',
      'otros': 'Otros'
    }
    return typeMap[type] || type
  }

  const getProjectName = (projectId: number | null) => {
    if (!projectId) return null
    const project = projects.find(p => p.id === projectId)
    return project?.name || `Proyecto ID: ${projectId}`
  }

  return (
    <ExpenseModal isOpen={true} onClose={onClose}>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Comprobante de Gasto
          </h2>
          <p className="text-lg text-gray-600 mt-1">{expense.name}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Información del gasto */}
          <div className="lg:w-1/3 p-6 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Detalles del Gasto
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tipo</p>
                    <p className="text-sm text-gray-900">{getTypeLabel(expense.type)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Fecha</p>
                    <p className="text-sm text-gray-900">{formatDate(expense.date)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Precio</p>
                    <p className="text-sm text-gray-900 font-semibold">{formatPrice((expense as any).price || expense.total_amount)}</p>
                  </div>
                  
                  {(expense.quantity || (expense.type === 'materiales' && expense.quantity === null)) && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Cantidad</p>
                      <p className="text-sm text-gray-900">
                        {expense.type === 'materiales' && expense.quantity === null 
                          ? 'revisar catálogo de materiales' 
                          : `${expense.quantity} unidades`}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Proveedor</p>
                    <p className="text-sm text-gray-900">{expense.supplier}</p>
                  </div>
                  
                  {expense.project_id && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Proyecto</p>
                      <p className="text-sm text-gray-900">{getProjectName(expense.project_id)}</p>
                    </div>
                  )}
                  
                  {expense.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Descripción</p>
                      <p className="text-sm text-gray-900">{expense.description}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <Button
                  onClick={handleDownload}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Comprobante
                </Button>
              </div>
            </div>
          </div>

          {/* Visualizador del comprobante */}
          <div className="lg:w-2/3 p-6 bg-white border border-gray-200 rounded-lg">
            {expense.receipt_url ? (
              <div className="h-full flex items-center justify-center">
                {isImage ? (
                  <div className="max-w-full max-h-full">
                    <img
                      src={expense.receipt_url}
                      alt={`Comprobante de ${expense.name}`}
                      className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                      onError={(e) => {
                        console.error('Error loading image:', e)
                        e.currentTarget.style.display = 'none'
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully')
                      }}
                    />
                  </div>
                ) : isPdf ? (
                  <div className="w-full h-[60vh] border rounded-lg bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Vista previa de PDF no disponible</p>
                      <Button
                        onClick={handleDownload}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Abrir PDF
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-[60vh] border rounded-lg bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                      <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Archivo adjunto</p>
                      <Button
                        onClick={handleDownload}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar Archivo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Sin Comprobante
                  </h3>
                  <p className="text-gray-600">
                    Este gasto no tiene un comprobante adjunto.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ExpenseModal>
  )
}
