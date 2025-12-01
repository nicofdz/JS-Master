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
  externalStatusFilter?: 'all' | 'processed' | 'pending'
}

export function InvoiceList({ invoices, onEdit, onDelete, onViewPDF, onStatusChange, externalStatusFilter }: InvoiceListProps) {
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processed' | 'blocked'>('all')
  
  // Usar el filtro externo si está disponible, sino usar el interno
  const activeFilter = externalStatusFilter !== undefined ? externalStatusFilter : filterStatus

  const getStatusColor = (status: string, isProcessed: boolean) => {
    if (status === 'pending') return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
    if (status === 'processed') return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    if (status === 'blocked') return 'bg-red-500/20 text-red-400 border border-red-500/30'
    return 'bg-slate-700 text-slate-300 border border-slate-600'
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
        color: 'bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-400 border border-emerald-600',
        icon: '✅'
      })
      actions.push({ 
        value: 'blocked', 
        label: 'Bloquear', 
        color: 'bg-red-900/30 hover:bg-red-800/40 text-red-400 border border-red-600',
        icon: '🚫'
      })
    }
    
    if (invoice.status === 'processed') {
      actions.push({ 
        value: 'pending', 
        label: 'Pendiente', 
        color: 'bg-yellow-900/30 hover:bg-yellow-800/40 text-yellow-400 border border-yellow-600',
        icon: '⏳'
      })
      actions.push({ 
        value: 'blocked', 
        label: 'Bloquear', 
        color: 'bg-red-900/30 hover:bg-red-800/40 text-red-400 border border-red-600',
        icon: '🚫'
      })
    }
    
    if (invoice.status === 'blocked') {
      actions.push({ 
        value: 'pending', 
        label: 'Desbloquear', 
        color: 'bg-yellow-900/30 hover:bg-yellow-800/40 text-yellow-400 border border-yellow-600',
        icon: '🔓'
      })
    }
    
    return actions
  }

  const sortedAndFilteredInvoices = invoices
    .filter(invoice => {
      if (activeFilter === 'all') return true
      if (activeFilter === 'processed') return invoice.status === 'processed'
      if (activeFilter === 'pending') return invoice.status === 'pending'
      if (activeFilter === 'blocked') return invoice.status === 'blocked'
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
              className="px-3 py-1 border border-slate-600 bg-slate-700 text-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Ordenar por fecha</option>
              <option value="amount">Ordenar por monto</option>
              <option value="status">Ordenar por estado</option>
            </select>
            {externalStatusFilter === undefined && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'processed' | 'blocked')}
                className="px-3 py-1 border border-slate-600 bg-slate-700 text-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas</option>
                <option value="pending">Pendientes</option>
                <option value="processed">Procesadas</option>
                <option value="blocked">Bloqueadas</option>
              </select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedAndFilteredInvoices.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No hay facturas registradas
          </div>
        ) : (
          <div className="space-y-4">
            {sortedAndFilteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="border border-slate-600 rounded-lg p-4 hover:bg-slate-700/50 transition-colors bg-slate-800/50"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-100">
                        Factura #{invoice.invoice_number || 'Sin número'}
                      </h3>
                      <Badge className={getStatusColor(invoice.status, invoice.is_processed)}>
                        {getStatusText(invoice.status, invoice.is_processed)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Empresa:</span>
                        <span className="ml-2 font-medium text-slate-100">{invoice.client_name || 'No identificada'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Proyecto:</span>
                        <span className="ml-2 font-medium text-slate-100">{invoice.project_name || 'Sin proyecto'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Fecha:</span>
                        <span className="ml-2 text-slate-200">{invoice.issue_date ? formatDate(invoice.issue_date) : 'Sin fecha'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {(() => {
                      const netAmount = invoice.net_amount || 0
                      const ivaAmount = invoice.iva_amount || 0
<<<<<<< HEAD
                      
                      // Total factura = Neto + IVA
                      const totalFactura = netAmount + ivaAmount
                      
                      // PPM = Total factura * 0.06
                      const ppm = totalFactura * 0.06
                      
                      // Total final = Neto - PPM
                      const totalFinal = netAmount - ppm
=======
                      const totalPDF = invoice.total_amount || 0
                      
                      // Neto con descuento del 6%
                      const netAfterDiscount = netAmount * 0.94
                      
                      // Total real = (Neto - 6%) - IVA
                      const totalReal = netAfterDiscount - ivaAmount
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
                      
                      return (
                        <>
                          <div className="text-xs text-slate-400 mb-1">
                            Neto: <span className="text-slate-100 font-medium">{formatCurrency(netAmount)}</span>
                          </div>
<<<<<<< HEAD
                          <div className="text-xs text-slate-400 mb-1">
                            IVA 19%: <span className="text-slate-100 font-medium">{formatCurrency(ivaAmount)}</span>
                          </div>
                          <div className="text-xs text-slate-400 mb-2">
                            Total factura: <span className="text-slate-100 font-medium">{formatCurrency(totalFactura)}</span>
                          </div>
                          <div className="text-lg font-bold text-slate-100 border-t border-slate-600 pt-2">
                            Total: {formatCurrency(totalFinal)}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                            <div>PPM: <span className="text-red-400">-{formatCurrency(ppm)}</span></div>
=======
                          <div className="text-xs text-slate-400 mb-2">
                            IVA 19%: <span className="text-slate-100 font-medium">{formatCurrency(ivaAmount)}</span>
                          </div>
                          <div className="text-lg font-bold text-slate-100 border-t border-slate-600 pt-2">
                            Total: {formatCurrency(totalReal)}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                            <div>Neto - 6%: <span className="text-slate-300">{formatCurrency(netAfterDiscount)}</span></div>
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
                            <div>IVA: <span className="text-red-400">-{formatCurrency(ivaAmount)}</span></div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-600">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewPDF?.(invoice.pdf_url!)}
                    className="bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-400 border border-emerald-600"
                    disabled={!invoice.pdf_url}
                  >
                    📄 Ver Factura
                    {!invoice.pdf_url && <span className="ml-1 text-xs">(Sin PDF)</span>}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(invoice)}
                    className="bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 border border-blue-600"
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
                    className="bg-red-900/30 hover:bg-red-800/40 text-red-400 border border-red-600"
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
