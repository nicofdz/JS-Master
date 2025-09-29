'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoiceIncome } from '@/hooks/useInvoices'

interface InvoiceListProps {
  invoices: InvoiceIncome[]
  onEdit?: (invoice: InvoiceIncome) => void
  onDelete?: (id: number) => void
  onViewPDF?: (url: string) => void
  onStatusChange?: (invoiceId: number, newStatus: string) => Promise<void>
}

export function InvoiceList({ invoices, onEdit, onDelete, onViewPDF, onStatusChange }: InvoiceListProps) {
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processed' | 'blocked'>('all')

  const getStatusColor = (status: string, isProcessed: boolean) => {
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800'
    if (status === 'processed') return 'bg-green-100 text-green-800'
    if (status === 'blocked') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string, isProcessed: boolean) => {
    if (status === 'pending') return 'Pendiente'
    if (status === 'processed') return 'Procesada'
    if (status === 'blocked') return 'Bloqueada'
    return 'Sin procesar'
  }

  const getAvailableStatusActions = (invoice: InvoiceIncome) => {
    const actions = []
    
    if (invoice.status === 'pending') {
      actions.push({ 
        value: 'processed', 
        label: 'Procesar', 
        color: 'bg-green-50 hover:bg-green-100 text-green-700',
        icon: '✅'
      })
      actions.push({ 
        value: 'blocked', 
        label: 'Bloquear', 
        color: 'bg-red-50 hover:bg-red-100 text-red-700',
        icon: '🚫'
      })
    }
    
    if (invoice.status === 'processed') {
      actions.push({ 
        value: 'pending', 
        label: 'Pendiente', 
        color: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700',
        icon: '⏳'
      })
      actions.push({ 
        value: 'blocked', 
        label: 'Bloquear', 
        color: 'bg-red-50 hover:bg-red-100 text-red-700',
        icon: '🚫'
      })
    }
    
    if (invoice.status === 'blocked') {
      actions.push({ 
        value: 'pending', 
        label: 'Desbloquear', 
        color: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700',
        icon: '🔓'
      })
    }
    
    return actions
  }

  const sortedAndFilteredInvoices = invoices
    .filter(invoice => {
      if (filterStatus === 'all') return true
      if (filterStatus === 'processed') return invoice.status === 'processed'
      if (filterStatus === 'pending') return invoice.status === 'pending'
      if (filterStatus === 'blocked') return invoice.status === 'blocked'
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'amount':
          return (b.total_amount || 0) - (a.total_amount || 0)
        case 'status':
          return a.is_processed === b.is_processed ? 0 : a.is_processed ? 1 : -1
        default:
          return 0
      }
    })

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Lista de Facturas</CardTitle>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="date">Ordenar por fecha</option>
              <option value="amount">Ordenar por monto</option>
              <option value="status">Ordenar por estado</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'processed' | 'blocked')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendientes</option>
              <option value="processed">Procesadas</option>
              <option value="blocked">Bloqueadas</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedAndFilteredInvoices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay facturas registradas
          </div>
        ) : (
          <div className="space-y-4">
            {sortedAndFilteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        Factura #{invoice.invoice_number || 'Sin número'}
                      </h3>
                      <Badge className={getStatusColor(invoice.status, invoice.is_processed)}>
                        {getStatusText(invoice.status, invoice.is_processed)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Empresa:</span>
                        <span className="ml-2 font-medium text-black">{invoice.client_name || 'No identificada'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Proyecto:</span>
                        <span className="ml-2 font-medium text-black">{invoice.project_name || 'Sin proyecto'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Fecha:</span>
                        <span className="ml-2 text-black">{invoice.issue_date ? formatDate(invoice.issue_date) : 'Sin fecha'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">RUT Cliente:</span>
                        <span className="ml-2 font-mono text-black">{invoice.client_rut || 'No identificado'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">
                      Neto: <span className="text-black font-medium">{formatCurrency(invoice.net_amount || 0)}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      IVA 19%: <span className="text-black font-medium">{formatCurrency(invoice.iva_amount || 0)}</span>
                    </div>
                    <div className="text-lg font-bold text-black border-t pt-1">
                      Total: {formatCurrency(invoice.total_amount || 0)}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewPDF?.(invoice.pdf_url!)}
                    className="bg-green-50 hover:bg-green-100 text-green-700"
                    disabled={!invoice.pdf_url}
                  >
                    📄 Ver Factura
                    {!invoice.pdf_url && <span className="ml-1 text-xs">(Sin PDF)</span>}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(invoice)}
                  >
                    ✏️ Editar
                  </Button>
                  
                  {/* Botones de Estado */}
                  {onStatusChange && getAvailableStatusActions(invoice).map((action) => (
                    <Button
                      key={action.value}
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange(invoice.id, action.value)}
                      className={action.color}
                    >
                      {action.icon} {action.label}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete?.(invoice.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    🗑️ Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
