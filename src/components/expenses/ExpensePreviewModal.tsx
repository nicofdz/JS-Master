'use client'

import { X, CheckCircle, FileText, Calendar, DollarSign, Package, Building, Calculator } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface ExpensePreviewData {
  name: string
  type: 'materiales' | 'servicios' | 'epp' | 'combustible' | 'herramientas' | 'otros'
  quantity?: number | null
  date: string
  total_amount: number
  document_type: 'boleta' | 'factura'
  iva_percentage: number
  iva_amount: number
  net_amount: number
  supplier: string
  project_id?: number | null
  description?: string
}

interface ExpensePreviewModalProps {
  expense: ExpensePreviewData
  receiptFile?: File
  onConfirm: (receiptFile?: File) => void
  onCancel: () => void
}

export function ExpensePreviewModal({ expense, receiptFile, onConfirm, onCancel }: ExpensePreviewModalProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'materiales': return <Package className="w-4 h-4" />
      case 'servicios': return <FileText className="w-4 h-4" />
      case 'epp': return <Package className="w-4 h-4" />
      case 'combustible': return <Package className="w-4 h-4" />
      case 'herramientas': return <Package className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'materiales': return 'bg-blue-100 text-blue-800'
      case 'servicios': return 'bg-green-100 text-green-800'
      case 'epp': return 'bg-yellow-100 text-yellow-800'
      case 'combustible': return 'bg-orange-100 text-orange-800'
      case 'herramientas': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
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

  return (
    <Modal isOpen={true} onClose={onCancel}>
      <div className="p-6 max-w-md mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Vista Previa del Gasto
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-3 mb-4">
            <h3 className="text-lg font-medium text-gray-900">{expense.name}</h3>
            <Badge className={getTypeColor(expense.type)}>
              <span className="flex items-center space-x-1">
                {getTypeIcon(expense.type)}
                <span>{getTypeLabel(expense.type)}</span>
              </span>
            </Badge>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Fecha</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(expense.date)}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <FileText className="w-4 h-4 text-gray-400 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Documento</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{expense.document_type}</p>
              </div>
            </div>
          </div>

          {/* Proveedor */}
          <div className="flex items-center">
            <Building className="w-4 h-4 text-gray-400 mr-2" />
            <div>
              <p className="text-xs text-gray-500">Proveedor</p>
              <p className="text-sm font-medium text-gray-900">{expense.supplier}</p>
            </div>
          </div>

          {/* Cantidad si aplica */}
          {(expense.quantity || (expense.type === 'materiales' && expense.quantity === null)) && (
            <div className="flex items-center">
              <Package className="w-4 h-4 text-gray-400 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Cantidad</p>
                <p className="text-sm font-medium text-gray-900">
                  {expense.type === 'materiales' && expense.quantity === null 
                    ? 'revisar catálogo de materiales' 
                    : `${expense.quantity} unidades`}
                </p>
              </div>
            </div>
          )}

          {/* Desglose financiero */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-3">
              <Calculator className="w-4 h-4 text-gray-600 mr-2" />
              <h4 className="text-sm font-medium text-gray-700">Desglose Financiero</h4>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Monto Neto:</span>
                <span className="text-sm font-medium text-gray-900">{formatPrice(expense.net_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">IVA ({expense.iva_percentage}%):</span>
                <span className="text-sm font-medium text-gray-900">{formatPrice(expense.iva_amount)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="text-sm font-semibold text-gray-900">Total:</span>
                <span className="text-sm font-semibold text-gray-900">{formatPrice(expense.total_amount)}</span>
              </div>
            </div>

            {/* Indicador de IVA recuperable */}
            {expense.document_type === 'factura' && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-xs text-green-800">
                    IVA recuperable: {formatPrice(expense.iva_amount)}
                  </span>
                </div>
              </div>
            )}
            
            {expense.document_type === 'boleta' && (
              <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded">
                <span className="text-xs text-gray-600">
                  IVA no recuperable
                </span>
              </div>
            )}
          </div>

          {/* Descripción si existe */}
          {expense.description && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Descripción</p>
              <p className="text-sm text-gray-900">{expense.description}</p>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200">
          <Button
            onClick={onCancel}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(receiptFile)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Confirmar Gasto
          </Button>
        </div>
      </div>
    </Modal>
  )
}
