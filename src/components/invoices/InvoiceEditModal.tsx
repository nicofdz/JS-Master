'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { InvoiceIncome } from '@/hooks/useInvoices'
import { formatCurrency } from '@/lib/utils'

interface InvoiceEditModalProps {
  invoice: InvoiceIncome | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedInvoice: Partial<InvoiceIncome>) => Promise<void>
}

export function InvoiceEditModal({ invoice, isOpen, onClose, onSave }: InvoiceEditModalProps) {
  const [formData, setFormData] = useState<Partial<InvoiceIncome>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (invoice) {
      // Corregir la fecha para zona horaria chilena
      const formatDateForInput = (dateString: string) => {
        if (!dateString) return ''
        
        console.log('🔍 FECHA ORIGINAL:', dateString)
        
        // Si la fecha viene con hora, solo tomar la parte de la fecha
        const dateOnly = dateString.split('T')[0]
        console.log('🔍 FECHA SIN HORA:', dateOnly)
        
        // Crear fecha en zona horaria chilena (UTC-3)
        const [year, month, day] = dateOnly.split('-')
        const chileDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        
        // Ajustar a zona horaria chilena (UTC-3)
        const chileOffset = -3 * 60 // -3 horas en minutos
        const utc = chileDate.getTime() + (chileDate.getTimezoneOffset() * 60000)
        const chileTime = new Date(utc + (chileOffset * 60000))
        
        const formattedDate = chileTime.getFullYear() + '-' + 
          String(chileTime.getMonth() + 1).padStart(2, '0') + '-' + 
          String(chileTime.getDate()).padStart(2, '0')
        
        console.log('🔍 FECHA CHILENA:', formattedDate)
        return formattedDate
      }

      setFormData({
        client_name: invoice.client_name || '',
        client_rut: invoice.client_rut || '',
        client_address: invoice.client_address || '',
        client_city: invoice.client_city || '',
        invoice_number: invoice.invoice_number || '',
        issue_date: formatDateForInput(invoice.issue_date || ''),
        description: invoice.description || '',
        contract_number: invoice.contract_number || '',
        payment_method: invoice.payment_method || '',
        net_amount: invoice.net_amount || 0,
        iva_amount: invoice.iva_amount || 0,
        additional_tax: invoice.additional_tax || 0,
        total_amount: invoice.total_amount || 0,
        status: invoice.status || 'pending'
      })
    }
  }, [invoice])

  const handleInputChange = (field: keyof InvoiceIncome, value: string | number) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      }

      // Calcular total automáticamente si se cambian los montos
      if (field === 'net_amount' || field === 'iva_amount' || field === 'additional_tax') {
        const netAmount = field === 'net_amount' ? Number(value) : (newData.net_amount || 0)
        const ivaAmount = field === 'iva_amount' ? Number(value) : (newData.iva_amount || 0)
        const additionalTax = field === 'additional_tax' ? Number(value) : (newData.additional_tax || 0)
        
        newData.total_amount = netAmount + ivaAmount + additionalTax
      }

      return newData
    })
  }

  const handleSave = async () => {
    try {
      setIsLoading(true)
      
      console.log('💾 GUARDANDO FECHA:', formData.issue_date)
      
      // Convertir fecha a zona horaria chilena antes de guardar
      const dataToSave = {
        ...formData,
        issue_date: formData.issue_date ? 
          new Date(formData.issue_date + 'T00:00:00-03:00').toISOString().split('T')[0] : 
          formData.issue_date
      }
      
      console.log('💾 FECHA CONVERTIDA A CHILE:', dataToSave.issue_date)
      await onSave(dataToSave)
      onClose()
    } catch (error) {
      console.error('Error saving invoice:', error)
      alert('Error al guardar la factura')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !invoice) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-black">Editar Factura #{invoice.invoice_number}</h2>
            <Button variant="outline" onClick={onClose}>
              ✕
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Datos del Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-black">Datos del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa
                  </label>
                  <Input
                    value={formData.client_name || ''}
                    onChange={(e) => handleInputChange('client_name', e.target.value)}
                    placeholder="Nombre de la empresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUT
                  </label>
                  <Input
                    value={formData.client_rut || ''}
                    onChange={(e) => handleInputChange('client_rut', e.target.value)}
                    placeholder="12.345.678-9"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <Input
                    value={formData.client_address || ''}
                    onChange={(e) => handleInputChange('client_address', e.target.value)}
                    placeholder="Dirección del cliente"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <Input
                    value={formData.client_city || ''}
                    onChange={(e) => handleInputChange('client_city', e.target.value)}
                    placeholder="Ciudad"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Datos de la Factura */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-black">Datos de la Factura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Factura
                  </label>
                  <Input
                    value={formData.invoice_number || ''}
                    onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                    placeholder="Número de factura"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Emisión
                  </label>
                  <Input
                    type="date"
                    value={formData.issue_date || ''}
                    onChange={(e) => handleInputChange('issue_date', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contrato
                  </label>
                  <Input
                    value={formData.contract_number || ''}
                    onChange={(e) => handleInputChange('contract_number', e.target.value)}
                    placeholder="Número de contrato"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forma de Pago
                  </label>
                  <Input
                    value={formData.payment_method || ''}
                    onChange={(e) => handleInputChange('payment_method', e.target.value)}
                    placeholder="Crédito, Contado, etc."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Montos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-black">Montos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto Neto
                  </label>
                  <Input
                    type="number"
                    value={formData.net_amount || 0}
                    onChange={(e) => handleInputChange('net_amount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IVA 19%
                  </label>
                  <Input
                    type="number"
                    value={formData.iva_amount || 0}
                    onChange={(e) => handleInputChange('iva_amount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Impuesto Adicional
                  </label>
                  <Input
                    type="number"
                    value={formData.additional_tax || 0}
                    onChange={(e) => handleInputChange('additional_tax', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total
                  </label>
                  <Input
                    type="number"
                    value={formData.total_amount || 0}
                    onChange={(e) => handleInputChange('total_amount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="font-bold"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Descripción y Estado */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-black">Descripción y Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción del Servicio
                  </label>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descripción del servicio prestado"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <Select
                    value={formData.status || 'pending'}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="processed">Procesada</option>
                    <option value="paid">Pagada</option>
                    <option value="cancelled">Cancelada</option>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
