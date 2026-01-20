'use client'

import { X, CheckCircle, FileText, Calendar, DollarSign, Package, Building, Calculator, Download } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Expense } from '@/hooks/useExpenses'

interface ExpenseDetailModalProps {
    expense: Expense
    onClose: () => void
}

export function ExpenseDetailModal({ expense, onClose }: ExpenseDetailModalProps) {
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
            case 'materiales': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            case 'servicios': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            case 'epp': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            case 'combustible': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            case 'herramientas': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
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
        <Modal isOpen={true} onClose={onClose} className="max-w-[380px]">
            <div className="p-4">
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-white">
                            Detalle del Gasto
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-medium text-white break-all leading-tight">{expense.name}</h3>
                        <div className="flex">
                            <Badge className={`${getTypeColor(expense.type)} px-2 py-0.5 text-[10px] h-5`}>
                                <span className="flex items-center gap-1">
                                    {getTypeIcon(expense.type)}
                                    <span>{getTypeLabel(expense.type)}</span>
                                </span>
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 mb-4">
                    {/* Información básica */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                        <div className="flex items-start">
                            <Calendar className="w-3.5 h-3.5 text-slate-500 mr-2 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Fecha</p>
                                <p className="text-xs font-medium text-slate-300">{formatDate(expense.date)}</p>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <FileText className="w-3.5 h-3.5 text-slate-500 mr-2 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Documento</p>
                                <p className="text-xs font-medium text-slate-300 capitalize">{expense.document_type}</p>
                            </div>
                        </div>

                        <div className="flex items-start col-span-2">
                            <Building className="w-3.5 h-3.5 text-slate-500 mr-2 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Proveedor</p>
                                <p className="text-xs font-medium text-slate-300 truncate" title={expense.supplier}>{expense.supplier}</p>
                            </div>
                        </div>

                        {/* Cantidad si aplica (Conditional) */}
                        {(expense.quantity || (expense.type === 'materiales' && expense.quantity === null)) && (
                            <div className="flex items-start col-span-2">
                                <Package className="w-3.5 h-3.5 text-slate-500 mr-2 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Cantidad</p>
                                    <p className="text-xs font-medium text-slate-300">
                                        {expense.type === 'materiales' && expense.quantity === null
                                            ? 'Ver catálogo de materiales'
                                            : `${expense.quantity} unidades`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Desglose financiero */}
                    <div className="bg-slate-800/40 p-3 rounded border border-slate-700/40">
                        <div className="flex items-center mb-2">
                            <Calculator className="w-3 h-3 text-slate-500 mr-1.5" />
                            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Desglose</h4>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] text-slate-500">Neto</span>
                                <span className="text-xs font-medium text-slate-400">{formatPrice(expense.net_amount)}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] text-slate-500">IVA ({expense.iva_percentage}%)</span>
                                <span className="text-xs font-medium text-slate-400">{formatPrice(expense.iva_amount)}</span>
                            </div>
                            <div className="border-t border-slate-700/40 pt-1.5 flex justify-between items-baseline mt-1.5">
                                <span className="text-xs font-semibold text-slate-200">Total</span>
                                <span className="text-sm font-bold text-white">{formatPrice(expense.total_amount)}</span>
                            </div>
                        </div>

                        {/* Indicador de IVA recuperable */}
                        {expense.document_type === 'factura' && (
                            <div className="mt-2.5 p-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded flex justify-between items-center">
                                <div className="flex items-center">
                                    <CheckCircle className="w-3 h-3 text-emerald-500/80 mr-1.5" />
                                    <span className="text-[10px] text-emerald-500/80 font-medium">
                                        IVA Recuperable
                                    </span>
                                </div>
                                <span className="text-[10px] text-emerald-500 font-bold">
                                    {formatPrice(expense.iva_amount)}
                                </span>
                            </div>
                        )}

                        {expense.document_type === 'boleta' && (
                            <div className="mt-2.5 p-1.5 bg-slate-700/30 border border-slate-600/30 rounded text-center">
                                <span className="text-[10px] text-slate-400">
                                    IVA no recuperable
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Descripción si existe */}
                    {expense.description && (
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-medium">Descripción</p>
                            <p className="text-xs text-slate-300 bg-slate-800/30 p-2 rounded border border-slate-700/30 leading-relaxed">{expense.description}</p>
                        </div>
                    )}

                    {/* Comprobante */}
                    {expense.receipt_url && (
                        <div className="mt-3 pt-3 border-t border-slate-700/40">
                            <a
                                href={expense.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center p-2 bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/40 hover:border-slate-600/60 rounded transition-all group"
                            >
                                <div className="bg-blue-500/10 p-1.5 rounded mr-2.5 text-blue-400">
                                    <FileText className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-300 truncate group-hover:text-blue-300 transition-colors">
                                        {expense.receipt_filename || 'Ver Comprobante'}
                                    </p>
                                    <p className="text-[10px] text-slate-500 leading-none mt-0.5">PDF / Imagen</p>
                                </div>
                                <Download className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                            </a>
                        </div>
                    )}
                </div>

                <div className="pt-3 border-t border-slate-700/40">
                    <Button
                        onClick={onClose}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-all h-8 text-xs font-medium"
                    >
                        Cerrar
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
