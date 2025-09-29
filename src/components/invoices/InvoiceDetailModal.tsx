'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { InvoiceIncome } from '@/hooks/useInvoices'
import { formatCurrency, formatDate } from '@/lib/utils'

interface InvoiceDetailModalProps {
  invoice: InvoiceIncome | null
  isOpen: boolean
  onClose: () => void
}

export function InvoiceDetailModal({ invoice, isOpen, onClose }: InvoiceDetailModalProps) {
  if (!isOpen || !invoice) return null

  const getStatusColor = (status: string, isProcessed: boolean) => {
    if (isProcessed) return 'bg-green-100 text-green-800'
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string, isProcessed: boolean) => {
    if (isProcessed) return 'Procesada'
    if (status === 'pending') return 'Pendiente'
    return 'Sin procesar'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-black">Detalles de la Factura #{invoice.invoice_number}</h2>
            <Button variant="outline" onClick={onClose}>
              ✕
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Datos del Emisor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-black">Datos del Emisor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Empresa:</span>
                  <p className="text-black">{invoice.issuer_name || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">RUT:</span>
                  <p className="text-black font-mono">{invoice.issuer_rut || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Dirección:</span>
                  <p className="text-black">{invoice.issuer_address || 'No especificada'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Email:</span>
                  <p className="text-black">{invoice.issuer_email || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Teléfono:</span>
                  <p className="text-black">{invoice.issuer_phone || 'No especificado'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Datos del Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-black">Datos del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Empresa:</span>
                  <p className="text-black">{invoice.client_name || 'No especificada'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">RUT:</span>
                  <p className="text-black font-mono">{invoice.client_rut || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Dirección:</span>
                  <p className="text-black">{invoice.client_address || 'No especificada'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Ciudad:</span>
                  <p className="text-black">{invoice.client_city || 'No especificada'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Datos de la Factura */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-black">Datos de la Factura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Número:</span>
                  <p className="text-black font-semibold">{invoice.invoice_number || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Fecha de Emisión:</span>
                  <p className="text-black">{invoice.issue_date ? formatDate(invoice.issue_date) : 'No especificada'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Oficina SII:</span>
                  <p className="text-black">{invoice.sii_office || 'No especificada'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Estado:</span>
                  <div className="mt-1">
                    <Badge className={getStatusColor(invoice.status, invoice.is_processed)}>
                      {getStatusText(invoice.status, invoice.is_processed)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Montos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-black">Montos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Neto:</span>
                  <span className="text-black font-semibold">{formatCurrency(invoice.net_amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">IVA 19%:</span>
                  <span className="text-black font-semibold">{formatCurrency(invoice.iva_amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Impuesto Adicional:</span>
                  <span className="text-black font-semibold">{formatCurrency(invoice.additional_tax || 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-bold text-gray-800">Total:</span>
                  <span className="text-black font-bold text-lg">{formatCurrency(invoice.total_amount || 0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Detalles del Servicio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-black">Detalles del Servicio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Descripción:</span>
                  <p className="text-black mt-1">{invoice.description || 'No especificada'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Contrato:</span>
                  <p className="text-black">{invoice.contract_number || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Fecha del Contrato:</span>
                  <p className="text-black">{invoice.contract_date ? formatDate(invoice.contract_date) : 'No especificada'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Forma de Pago:</span>
                  <p className="text-black">{invoice.payment_method || 'No especificada'}</p>
                </div>
                {invoice.pdf_url && (
                  <div className="pt-3 border-t">
                    <Button
                      variant="outline"
                      onClick={() => invoice.pdf_url && window.open(invoice.pdf_url, '_blank')}
                      className="w-full"
                    >
                      📄 Ver PDF Original
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Botón de Cerrar */}
          <div className="flex justify-end mt-6 pt-6 border-t">
            <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
