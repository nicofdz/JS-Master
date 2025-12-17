'use client'

import { useState, useEffect } from 'react'
import { ModalV2 } from '@/components/tasks-v2/ModalV2'
import { FileText, History, User, Briefcase, Calendar, DollarSign, Activity } from 'lucide-react'
import { ContractHistoryContent } from './ContractHistoryContent'
import { formatDateToChilean } from '@/lib/contracts'

interface ContractDetailModalProps {
    isOpen: boolean
    onClose: () => void
    contract?: any
    initialTab?: 'details' | 'history'
    onEdit?: () => void
}

type TabType = 'details' | 'history'

export function ContractDetailModal({
    isOpen,
    onClose,
    contract,
    initialTab = 'details',
    onEdit
}: ContractDetailModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>(initialTab)

    // Actualizar tab cuando cambia initialTab o se abre el modal
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab)
        }
    }, [isOpen, initialTab])

    // Reset tab cuando se cierra el modal
    const handleClose = () => {
        setActiveTab('details')
        onClose()
    }

    const tabs = [
        { id: 'details' as TabType, label: 'Detalles', icon: FileText },
        { id: 'history' as TabType, label: 'Historial', icon: History }
    ]

    if (!contract) return null

    const getStatusBadge = (status: string, isActive: boolean = true) => {
        if (!isActive && status !== 'cancelado') {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Cancelado (Eliminado)
                </span>
            )
        }

        switch (status) {
            case 'activo':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Activo
                    </span>
                )
            case 'finalizado':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Finalizado
                    </span>
                )
            case 'cancelado':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Cancelado
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {status}
                    </span>
                )
        }
    }

    return (
        <ModalV2
            isOpen={isOpen}
            onClose={handleClose}
            title="Detalles de Contrato"
            size="xl"
        >
            {/* Tabs Navigation */}
            <div className="border-b border-slate-700 mb-6">
                <div className="flex gap-2 overflow-x-auto pb-[-1px] scrollbar-none snap-x">
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap snap-start flex-shrink-0 border-b-2 ${isActive
                                    ? 'bg-slate-700/50 text-blue-400 border-blue-500'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 border-transparent'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="h-[calc(80vh-200px)] overflow-y-auto pr-2">
                {activeTab === 'details' && (
                    <div className="space-y-6">
                        {/* Información General */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                <Briefcase className="w-4 h-4" />
                                Información del Contrato
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                                    <label className="block text-xs text-slate-400 mb-1">Número de Contrato</label>
                                    <p className="text-sm font-medium text-slate-200">{contract.contract_number || '-'}</p>
                                </div>
                                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                                    <label className="block text-xs text-slate-400 mb-1">Estado</label>
                                    {getStatusBadge(contract.status, contract.is_active)}
                                </div>
                                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                                    <label className="block text-xs text-slate-400 mb-1">Tipo de Contrato</label>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${contract.contract_type === 'por_dia' ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'bg-orange-900/30 text-orange-400 border border-orange-500/30'
                                        }`}>
                                        {contract.contract_type === 'por_dia' ? 'Por día' : 'A trato'}
                                    </span>
                                </div>
                                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                                    <label className="block text-xs text-slate-400 mb-1">Categoría</label>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${contract.is_renovacion ? 'bg-purple-900/30 text-purple-400 border border-purple-500/30' : 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/30'
                                        }`}>
                                        {contract.is_renovacion ? 'Renovación' : 'Nuevo Contrato'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Fechas y Pagos */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Período y Pagos
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                                    <label className="block text-xs text-slate-400 mb-1">Fecha Inicio</label>
                                    <p className="text-sm font-medium text-slate-200">{formatDateToChilean(contract.fecha_inicio)}</p>
                                </div>
                                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                                    <label className="block text-xs text-slate-400 mb-1">Fecha Término</label>
                                    <p className="text-sm font-medium text-slate-200">
                                        {contract.fecha_termino ? formatDateToChilean(contract.fecha_termino) : 'Indefinido'}
                                    </p>
                                </div>
                                {contract.contract_type === 'por_dia' && (
                                    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                                        <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" />
                                            Tarifa Diaria
                                        </label>
                                        <p className="text-sm font-medium text-slate-200">${(contract.daily_rate || 0).toLocaleString('es-CL')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Participantes */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Participantes
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                                    <label className="block text-xs text-slate-400 mb-1">Trabajador</label>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 text-xs font-bold border border-blue-500/30">
                                            {contract.worker_name?.charAt(0) || 'T'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">{contract.worker_name}</p>
                                            <p className="text-xs text-slate-400">{contract.worker_rut}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                                    <label className="block text-xs text-slate-400 mb-1">Proyecto</label>
                                    <p className="text-sm font-medium text-slate-200">{contract.project_name}</p>
                                </div>
                            </div>
                        </div>

                        {/* Notas */}
                        {contract.notes && (
                            <div>
                                <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Notas
                                </h4>
                                <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
                                    <p className="text-sm text-slate-300">{contract.notes}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <ContractHistoryContent contract={contract} />
                )}
            </div>

        </ModalV2>
    )
}
