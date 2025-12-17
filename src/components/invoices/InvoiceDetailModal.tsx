'use client'

import { ModalV2 } from '@/components/tasks-v2/ModalV2'
import { Button } from '@/components/ui/Button'
import { InvoiceIncome } from '@/hooks/useInvoices'
import { formatCurrency } from '@/lib/utils'
import { FileText, Calendar, Building, DollarSign } from 'lucide-react'

interface InvoiceDetailModalProps {
  invoice: InvoiceIncome | null
  isOpen: boolean
  onClose: () => void
}

export function InvoiceDetailModal({ invoice, isOpen, onClose }: InvoiceDetailModalProps) {
  if (!invoice) return null

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title={`Factura #${invoice.invoice_number}`}
      size="2xl"
    >
      <div className="space-y-6">
        {/* PDF Preview Link */}
        {invoice.pdf_url && (
          <div className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center border border-slate-600">
            <div className="flex items-center gap-2 text-slate-300">
              <FileText className="w-4 h-4" />
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
            <h4 className="text-sm font-semibold text-slate-200 border-b border-slate-700 pb-2 flex items-center gap-2">
              <Building className="w-4 h-4" /> Emisor y Receptor
            </h4>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre Emisor</label>
              <div className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300">
                {invoice.issuer_name || 'No especificado'}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">RUT Emisor</label>
              <div className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300 font-mono">
                {invoice.issuer_rut || 'No especificado'}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre Receptor</label>
              <div className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300">
                {invoice.client_name || 'No especificado'}
              </div>
            </div>
          </div>

          {/* Detalles de Factura */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-200 border-b border-slate-700 pb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Detalles
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">N° Factura</label>
                <div className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300 font-medium">
                  {invoice.invoice_number || 'No especificado'}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Fecha Emisión</label>
                <div className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300">
                  {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('es-CL') : 'No especificada'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Descripción / Glosa</label>
              <div className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300 min-h-[76px]">
                {invoice.description || 'No especificada'}
              </div>
            </div>
          </div>
        </div>

        {/* Montos */}
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-semibold text-slate-200 border-b border-slate-700 pb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Montos
          </h4>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Monto Neto</label>
              <div className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300">
                {formatCurrency(invoice.net_amount || 0)}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">IVA (19%)</label>
              <div className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300">
                {formatCurrency(invoice.iva_amount || 0)}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Impuesto Adic.</label>
              <div className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300">
                {formatCurrency(invoice.additional_tax || 0)}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 min-w-[200px]">
              <label className="block text-xs text-slate-400 mb-1 text-right">Total Factura</label>
              <p className="text-xl font-bold text-emerald-400 text-right">
                {formatCurrency(invoice.total_amount || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end pt-4 border-t border-slate-700">
          <Button
            onClick={onClose}
            className="bg-slate-600 hover:bg-slate-700 text-white"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </ModalV2>
  )
}
