'use client'

import { useState, useEffect } from 'react'
import { ModalV2 } from '@/components/tasks-v2/ModalV2'
import { Button } from '@/components/ui/Button'
import { InvoiceIncome } from '@/hooks/useInvoices'
import { formatCurrency } from '@/lib/utils'
import { AlertCircle, FileText, Calendar, Building, DollarSign } from 'lucide-react'

interface InvoiceVerificationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (data: Partial<InvoiceIncome>) => void
    data: Partial<InvoiceIncome> | null
    loading?: boolean
}

export function InvoiceVerificationModal({
    isOpen,
    onClose,
    onConfirm,
    data,
    loading = false
}: InvoiceVerificationModalProps) {
    const [formData, setFormData] = useState<Partial<InvoiceIncome>>({})

    // Inicializar estado cuando cambia la data
    useState(() => {
        if (data) {
            setFormData(data)
        }
    })

    // Actualizar formData cuando cambia la prop data
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Actualizar formData cuando cambia la prop data
    useEffect(() => {
        if (data) {
            const initialData = { ...data }

            // Si el total es 0 o no viene, calcularlo automáticamente
            if (!initialData.total_amount) {
                const net = initialData.net_amount || 0
                const iva = initialData.iva_amount || 0
                const tax = initialData.additional_tax || 0
                initialData.total_amount = net + iva + tax
            }

            setFormData(initialData)
        }
    }, [data, isOpen])

    if (!data) return null

    const handleChange = (field: keyof InvoiceIncome, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const handleAmountChange = (field: keyof InvoiceIncome, value: string) => {
        const numericValue = parseFloat(value) || 0
        handleChange(field, numericValue)

        // Recalcular total automáticamente si cambian neto o IVA
        if (field === 'net_amount' || field === 'iva_amount' || field === 'additional_tax') {
            setFormData(prev => {
                const net = field === 'net_amount' ? numericValue : (prev.net_amount || 0)
                const iva = field === 'iva_amount' ? numericValue : (prev.iva_amount || 0)
                const tax = field === 'additional_tax' ? numericValue : (prev.additional_tax || 0)
                return {
                    ...prev,
                    [field]: numericValue,
                    total_amount: net + iva + tax
                }
            })
        }
    }

    const handleSubmit = () => {
        onConfirm(formData)
    }

    return (
        <ModalV2
            isOpen={isOpen}
            onClose={onClose}
            title="Verificar Datos de Factura"
            size="2xl"
        >
            <p className="text-slate-400 mb-6">Revisa y corrige los datos extraídos antes de guardar.</p>
            <div className="space-y-6">
                {/* PDF Preview Link */}
                {data.pdf_url && (
                    <div className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center border border-slate-600">
                        <div className="flex items-center gap-2 text-slate-300">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">Documento PDF Original</span>
                        </div>
                        <a
                            href={data.pdf_url}
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
                            <input
                                type="text"
                                value={formData.issuer_name || ''}
                                onChange={(e) => handleChange('issuer_name', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">RUT Emisor</label>
                            <input
                                type="text"
                                value={formData.issuer_rut || ''}
                                onChange={(e) => handleChange('issuer_rut', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Nombre Receptor</label>
                            <input
                                type="text"
                                value={formData.client_name || ''}
                                onChange={(e) => handleChange('client_name', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                            />
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
                                <input
                                    type="text"
                                    value={formData.invoice_number || ''}
                                    onChange={(e) => handleChange('invoice_number', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Fecha Emisión</label>
                                <input
                                    type="date"
                                    value={formData.issue_date || ''}
                                    onChange={(e) => handleChange('issue_date', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Descripción / Glosa</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                            />
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
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-500">$</span>
                                <input
                                    type="number"
                                    value={formData.net_amount || 0}
                                    onChange={(e) => handleAmountChange('net_amount', e.target.value)}
                                    className="w-full pl-6 pr-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">IVA (19%)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-500">$</span>
                                <input
                                    type="number"
                                    value={formData.iva_amount || 0}
                                    onChange={(e) => handleAmountChange('iva_amount', e.target.value)}
                                    className="w-full pl-6 pr-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Impuesto Adic.</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-500">$</span>
                                <input
                                    type="number"
                                    value={formData.additional_tax || 0}
                                    onChange={(e) => handleAmountChange('additional_tax', e.target.value)}
                                    className="w-full pl-6 pr-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
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

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 sticky bottom-0 bg-slate-800 pb-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white"
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px]"
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Confirmar y Guardar'}
                    </Button>
                </div>
            </div>
        </ModalV2>
    )
}
