'use client'

import { X, Wrench, MapPin, Tag, Archive, Calendar, User, Clock, CheckCircle, History } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import clsx from 'clsx'
import { useState } from 'react'

interface Tool {
    id: number
    name: string
    brand: string
    status: string
    value: number
    location: string
    details: string
    image_url: string | null
    is_active: boolean
    project_id?: number | null
    project_name?: string
}

interface Loan {
    id: number
    tool_id: number
    borrower_id: number
    lender_id: string
    loan_date: string
    return_date: string | null
    return_details: string | null
    project_id?: number | null
}

interface Worker {
    id: number
    full_name: string
}

interface User {
    id: string
    full_name: string
}

interface Project {
    id: number
    name: string
}

interface ToolDetailsModalProps {
    tool: Tool
    loans?: Loan[]
    workers?: Worker[]
    users?: User[]
    projects?: Project[]
    onClose: () => void
}

export function ToolDetailsModal({ tool, loans = [], workers = [], users = [], projects = [], onClose }: ToolDetailsModalProps) {
    const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(value)
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'disponible':
                return 'bg-emerald-900/30 text-emerald-400 border border-emerald-600/50'
            case 'prestada':
                return 'bg-orange-900/30 text-orange-400 border border-orange-600/50'
            case 'mantenimiento':
                return 'bg-yellow-900/30 text-yellow-400 border border-yellow-600/50'
            case 'perdida':
                return 'bg-red-900/30 text-red-400 border border-red-600/50'
            default:
                return 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'disponible': return 'Disponible'
            case 'prestada': return 'Prestada'
            case 'mantenimiento': return 'En Mantenimiento'
            case 'perdida': return 'Perdida'
            default: return status
        }
    }

    // Get active loan if tool is loaned
    const activeLoan = tool.status === 'prestada'
        ? loans.find(l => l.tool_id === tool.id && !l.return_date)
        : null

    // Get history (finished loans)
    const history = loans
        .filter(l => l.tool_id === tool.id && l.return_date)
        .sort((a, b) => new Date(b.loan_date).getTime() - new Date(a.loan_date).getTime())

    // Helpers to get names
    const getWorkerName = (id: number) => workers.find(w => w.id === id)?.full_name || 'Desconocido'
    const getUserName = (id: string) => users.find(u => u.id === id)?.full_name || 'Desconocido'
    const getProjectName = (id?: number | null) => id ? projects.find(p => p.id === id)?.name : 'Sin proyecto'

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-xl shadow-2xl shadow-black/50 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-800 animate-in zoom-in-95 duration-200 text-slate-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden">
                            {tool.image_url ? (
                                <img src={tool.image_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <Wrench className="w-6 h-6 text-slate-500" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-tight">{tool.name}</h2>
                            <p className="text-blue-400 text-sm font-medium">{tool.brand}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-900/50">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details'
                            ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
                    >
                        Detalles y Estado
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
                            ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
                    >
                        Historial de Préstamos
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-900">

                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left: Image & Basic Info */}
                            <div className="space-y-6">
                                <div className="aspect-video bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center relative group">
                                    {tool.image_url ? (
                                        <img src={tool.image_url} alt={tool.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-slate-600">
                                            <Wrench className="w-16 h-16 opacity-20" />
                                            <span className="text-sm opacity-50">Sin imagen disponible</span>
                                        </div>
                                    )}
                                    <Badge className={`absolute top-4 left-4 ${getStatusColor(tool.status)} shadow-lg`}>
                                        {getStatusText(tool.status)}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Valor</p>
                                        <p className="text-xl font-bold text-slate-200">{formatCurrency(tool.value)}</p>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Ubicación Base</p>
                                        <p className="text-sm font-medium text-slate-200 mt-1">{tool.location}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
                                    <p className="text-xs text-slate-500 uppercase font-semibold mb-2 flex items-center gap-2">
                                        <Tag className="w-3 h-3" /> Descripción
                                    </p>
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        {tool.details || 'Sin descripción detallada.'}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Status & Active Loan */}
                            <div className="space-y-6">
                                {tool.status === 'prestada' && activeLoan ? (
                                    <div className="bg-orange-900/10 border border-orange-500/20 rounded-xl p-5 space-y-4">
                                        <div className="flex items-center gap-3 text-orange-400 mb-2">
                                            <div className="p-2 bg-orange-500/20 rounded-full"><Clock className="w-5 h-5" /></div>
                                            <h3 className="font-bold text-lg">Préstamo Activo</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-orange-500/70 uppercase font-semibold mb-1">Trabajador</p>
                                                    <div className="flex items-center gap-2 text-slate-200">
                                                        <User className="w-4 h-4 text-orange-400" />
                                                        <span className="font-medium">{getWorkerName(activeLoan.borrower_id)}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-orange-500/70 uppercase font-semibold mb-1">Prestado Por</p>
                                                    <div className="flex items-center gap-2 text-slate-200">
                                                        <User className="w-4 h-4 text-slate-500" />
                                                        <span className="text-sm">{getUserName(activeLoan.lender_id)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs text-orange-500/70 uppercase font-semibold mb-1">Fecha de Préstamo</p>
                                                <p className="text-slate-200 text-sm">{formatDate(activeLoan.loan_date)}</p>
                                            </div>

                                            {activeLoan.project_id && (
                                                <div>
                                                    <p className="text-xs text-orange-500/70 uppercase font-semibold mb-1">Obra / Proyecto</p>
                                                    <div className="bg-slate-900/50 px-3 py-2 rounded border border-slate-800 inline-flex items-center gap-2">
                                                        <MapPin className="w-3 h-3 text-blue-400" />
                                                        <span className="text-sm text-slate-300">{getProjectName(activeLoan.project_id)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center h-48">
                                        <div className="p-3 bg-emerald-500/20 rounded-full mb-3 text-emerald-400">
                                            <CheckCircle className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-lg font-bold text-emerald-400">Disponible</h3>
                                        <p className="text-emerald-500/70 text-sm mt-1">Esta herramienta está en bodega lista para ser usada.</p>
                                    </div>
                                )}

                                {/* Last Activity Summary could go here */}
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            <h3 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-4">Historial de Devoluciones</h3>

                            {history.length > 0 ? (
                                <div className="rounded-lg border border-slate-700 overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-800 text-slate-400 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Fecha Préstamo</th>
                                                <th className="px-4 py-3">Trabajador</th>
                                                <th className="px-4 py-3">Devuelto</th>
                                                <th className="px-4 py-3">Estado/Notas</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                                            {history.map((loan) => (
                                                <tr key={loan.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-4 py-3 text-slate-300">
                                                        {new Date(loan.loan_date).toLocaleDateString()}
                                                        <div className="text-xs text-slate-500">{new Date(loan.loan_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-200">
                                                        {getWorkerName(loan.borrower_id)}
                                                        <div className="text-xs text-slate-500">Autoriza: {getUserName(loan.lender_id)}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-300">
                                                        {loan.return_date ? new Date(loan.return_date).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400 italic">
                                                        {loan.return_details || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500 border border-slate-800 rounded-lg border-dashed">
                                    <History className="w-12 h-12 mx-auto opacity-20 mb-2" />
                                    <p>No hay historial de préstamos finalizados para esta herramienta.</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
