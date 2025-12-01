'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { InvoiceIncome } from '@/hooks/useInvoices'

interface InvoiceStatusButtonsProps {
  invoice: InvoiceIncome
  onStatusChange: (invoiceId: number, newStatus: string) => Promise<void>
}

export function InvoiceStatusButtons({ invoice, onStatusChange }: InvoiceStatusButtonsProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsLoading(true)
      await onStatusChange(invoice.id, newStatus)
    } catch (error) {
      console.error('Error changing status:', error)
      alert('Error al cambiar el estado')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string, isProcessed: boolean) => {
    if (isProcessed) return 'bg-green-100 text-green-800'
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800'
    if (status === 'processed') return 'bg-blue-100 text-blue-800'
    if (status === 'paid') return 'bg-green-100 text-green-800'
    if (status === 'cancelled') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string, isProcessed: boolean) => {
    if (isProcessed) return 'Procesada'
    if (status === 'pending') return 'Pendiente'
    if (status === 'processed') return 'Procesada'
    if (status === 'paid') return 'Pagada'
    if (status === 'cancelled') return 'Cancelada'
    return 'Sin procesar'
  }

  const getAvailableStatuses = (currentStatus: string, isProcessed: boolean) => {
    const statuses = []
    
    if (currentStatus === 'pending') {
      statuses.push({ value: 'processed', label: 'Marcar como Procesada', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' })
      statuses.push({ value: 'cancelled', label: 'Cancelar', color: 'bg-red-50 hover:bg-red-100 text-red-700' })
    }
    
    if (currentStatus === 'processed') {
      statuses.push({ value: 'paid', label: 'Marcar como Pagada', color: 'bg-green-50 hover:bg-green-100 text-green-700' })
      statuses.push({ value: 'pending', label: 'Volver a Pendiente', color: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700' })
    }
    
    if (currentStatus === 'paid') {
      statuses.push({ value: 'processed', label: 'Volver a Procesada', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' })
    }
    
    if (currentStatus === 'cancelled') {
      statuses.push({ value: 'pending', label: 'Reactivar', color: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700' })
    }
    
    return statuses
  }

  const availableStatuses = getAvailableStatuses(invoice.status, invoice.is_processed)

  return (
    <div className="space-y-4">
      {/* Estado Actual */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Estado actual:</span>
        <Badge className={getStatusColor(invoice.status, invoice.is_processed)}>
          {getStatusText(invoice.status, invoice.is_processed)}
        </Badge>
      </div>

      {/* Botones de Cambio de Estado */}
      {availableStatuses.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-gray-600">Cambiar estado:</span>
          <div className="flex flex-wrap gap-2">
            {availableStatuses.map((status) => (
              <Button
                key={status.value}
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(status.value)}
                disabled={isLoading}
                className={status.color}
              >
                {isLoading ? 'Cambiando...' : status.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Información adicional */}
      {invoice.status === 'paid' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            ✅ Esta factura ha sido marcada como pagada
          </p>
        </div>
      )}

      {invoice.status === 'cancelled' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">
            ❌ Esta factura ha sido cancelada
          </p>
        </div>
      )}
    </div>
  )
}











