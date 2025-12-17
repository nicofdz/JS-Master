'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { InvoiceIncome } from '@/hooks/useInvoices'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

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
        issuer_name: invoice.issuer_name || '',
        issuer_rut: invoice.issuer_rut || '',
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
      toast.error('Error al guardar la factura')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !invoice) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-100">Editar Factura #{invoice.invoice_number}</h2>
            <Button variant="outline" onClick={onClose} className="text-slate-300 hover:text-slate-100">
              ✕
            </Button>
          </div>

          <div className="space-y-6">
            {/* PDF Original (si existe) */}
            {invoice.pdf_url && (
              <div className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center border border-slate-600">
                <div className="flex items-center gap-2 text-slate-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm">Documento PDF Original</span>
                </div>
                <a
                  href={invoice.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Ver PDF
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Emisor y Receptor */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-200 border-b border-slate-700 pb-2">
                  📋 Emisor y Receptor
                </h4>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nombre Emisor</label>
                  <Textarea
                    value={formData.issuer_name || ''}
                    onChange={(e) => handleInputChange('issuer_name', e.target.value)}
                    placeholder="Nombre del emisor"
                    rows={2}
                    className="bg-slate-700 border-slate-600 text-slate-200 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">RUT Emisor</label>
                  <Input
                    value={formData.issuer_rut || ''}
                    onChange={(e) => handleInputChange('issuer_rut', e.target.value)}
                    placeholder="RUT del emisor"
                    className="bg-slate-700 border-slate-600 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nombre Receptor</label>
                  <Input
                    value={formData.client_name || ''}
                    onChange={(e) => handleInputChange('client_name', e.target.value)}
                    placeholder="Nombre del receptor"
                    className="bg-slate-700 border-slate-600 text-slate-200"
                  />
                </div>
              </div>

              {/* Detalles */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-200 border-b border-slate-700 pb-2">
                  📅 Detalles
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">N° Factura</label>
                    <Input
                      value={formData.invoice_number || ''}
                      onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                      placeholder="N° Factura"
                      className="bg-slate-700 border-slate-600 text-slate-200 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha Emisión</label>
                    <Input
                      type="date"
                      value={formData.issue_date || ''}
                      onChange={(e) => handleInputChange('issue_date', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Descripción / Glosa</label>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descripción del servicio"
                    rows={3}
                    className="bg-slate-700 border-slate-600 text-slate-200 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Montos */}
            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-semibold text-slate-200 border-b border-slate-700 pb-2">
                💵 Montos
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Monto Neto</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500">$</span>
                    <Input
                      type="number"
                      value={formData.net_amount || 0}
                      onChange={(e) => handleInputChange('net_amount', parseFloat(e.target.value) || 0)}
                      className="bg-slate-700 border-slate-600 text-slate-200 pl-6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">IVA (19%)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500">$</span>
                    <Input
                      type="number"
                      value={formData.iva_amount || 0}
                      onChange={(e) => handleInputChange('iva_amount', parseFloat(e.target.value) || 0)}
                      className="bg-slate-700 border-slate-600 text-slate-200 pl-6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Impuesto Adic.</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500">$</span>
                    <Input
                      type="number"
                      value={formData.additional_tax || 0}
                      onChange={(e) => handleInputChange('additional_tax', parseFloat(e.target.value) || 0)}
                      className="bg-slate-700 border-slate-600 text-slate-200 pl-6"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 min-w-[200px]">
                  <label className="block text-xs text-slate-400 mb-1 text-right">Total Factura</label>
                  <p className="text-xl font-bold text-emerald-400 text-right">
                    {formatCurrency(formData.total_amount || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-700">
            <Button variant="outline" onClick={onClose} className="text-slate-400 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
            >
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
