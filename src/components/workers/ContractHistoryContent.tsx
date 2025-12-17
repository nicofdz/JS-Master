'use client'

import { Calendar, CheckCircle, UserPlus, FileText, UserMinus, RotateCcw, Edit, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateToChilean } from '@/lib/contracts'

interface ContractHistoryContentProps {
    contract: any
}

interface HistoryItem {
    id: number | string
    date: string
    type: 'created' | 'completed' | 'cancelled' | 'restored' | 'updated' | 'active'
    title: string
    user: string
    details?: any
}

export function ContractHistoryContent({ contract }: ContractHistoryContentProps) {
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (contract?.id) {
            loadHistory()
        } else {
            setLoading(false)
        }
    }, [contract?.id])

    const loadHistory = async () => {
        if (!contract?.id) return

        setLoading(true)
        try {
            const historyItems: HistoryItem[] = []

            // 1. Obtener creación del contrato (desde contract_history)
            // Necesitamos obtener el nombre del creador si existe
            let creatorName = 'Sistema'
            if (contract.created_by) {
                const { data: creatorProfile } = await supabase
                    .from('user_profiles')
                    .select('full_name')
                    .eq('id', contract.created_by)
                    .single()

                if (creatorProfile) creatorName = creatorProfile.full_name || 'Usuario desconocido'
            }

            historyItems.push({
                id: `created-${contract.id}`,
                date: contract.created_at,
                type: 'created',
                title: 'Contrato Creado',
                user: creatorName,
                details: {
                    initial_status: contract.status || 'activo'
                }
            })

            // 2. Obtener cambios en audit_log relacionados con contratos
            const { data: auditLog, error: auditError } = await supabase
                .from('audit_log')
                .select(`
          id,
          action,
          old_values,
          new_values,
          created_at,
          user_id
        `)
                .eq('table_name', 'contract_history')
                .eq('record_id', contract.id)
                .order('created_at', { ascending: false })

            if (auditError) throw auditError

            // Obtener nombres de usuarios
            let userIds: string[] = []
            if (auditLog && auditLog.length > 0) {
                userIds = auditLog
                    .map(item => item.user_id)
                    .filter((id): id is string => id !== null && id !== undefined)
            }

            let userNamesMap: Record<string, string> = {}
            if (userIds.length > 0) {
                const { data: userProfiles } = await supabase
                    .from('user_profiles')
                    .select('id, full_name')
                    .in('id', userIds)

                if (userProfiles) {
                    userProfiles.forEach(profile => {
                        userNamesMap[profile.id] = profile.full_name || 'Usuario desconocido'
                    })
                }
            }

            if (auditLog) {
                auditLog.forEach(log => {
                    let type: HistoryItem['type'] = 'updated'
                    let title = 'Contrato Actualizado'
                    let details = null

                    const oldData = log.old_values as any
                    const newData = log.new_values as any

                    if (log.action === 'UPDATE') {
                        // Detectar cambios específicos
                        if (oldData?.status === 'activo' && newData?.status === 'finalizado') {
                            type = 'completed'
                            title = 'Contrato Finalizado'
                        } else if (oldData?.status === 'activo' && newData?.status === 'cancelado') {
                            type = 'cancelled'
                            title = 'Contrato Cancelado'
                        } else if (oldData?.is_active === false && newData?.is_active === true) {
                            type = 'restored'
                            title = 'Contrato Restaurado'
                        } else if (oldData?.is_active === true && newData?.is_active === false) {
                            type = 'cancelled'
                            title = 'Contrato Eliminado (Papelera)'
                        } else {
                            // Cambio genérico de campos
                            const changes: string[] = []
                            if (oldData?.fecha_termino !== newData?.fecha_termino) changes.push('Fecha término')
                            if (oldData?.daily_rate !== newData?.daily_rate) changes.push('Tarifa')
                            if (oldData?.contract_type !== newData?.contract_type) changes.push('Tipo contrato')
                            if (oldData?.notes !== newData?.notes) changes.push('Notas')

                            if (changes.length > 0) {
                                details = { changes }
                            }
                        }
                    }

                    historyItems.push({
                        id: log.id,
                        date: log.created_at,
                        type,
                        title,
                        user: log.user_id ? (userNamesMap[log.user_id] || 'Sistema') : 'Sistema',
                        details
                    })
                })
            }

            // Ordenar por fecha descendente
            historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

            setHistory(historyItems)
        } catch (error) {
            console.error('Error loading contract history:', error)
        } finally {
            setLoading(false)
        }
    }

    const getIcon = (type: HistoryItem['type']) => {
        switch (type) {
            case 'created':
                return <UserPlus className="w-5 h-5 text-green-500" />
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-blue-500" />
            case 'cancelled':
                return <UserMinus className="w-5 h-5 text-red-500" />
            case 'restored':
                return <RotateCcw className="w-5 h-5 text-emerald-500" />
            case 'updated':
                return <Edit className="w-5 h-5 text-amber-500" />
            default:
                return <FileText className="w-5 h-5 text-gray-500" />
        }
    }

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString)
            return new Intl.DateTimeFormat('es-CL', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date)
        } catch (e) {
            return dateString
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400">
                No hay historial disponible para este contrato
            </div>
        )
    }

    return (
        <div className="relative pl-4 border-l-2 border-slate-700 space-y-8">
            {history.map((item) => (
                <div key={item.id} className="relative">
                    <div className="absolute -left-[25px] bg-slate-800 p-1 rounded-full border border-slate-700">
                        {getIcon(item.type)}
                    </div>
                    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="text-sm font-semibold text-slate-200">{item.title}</h4>
                            <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(item.date)}</span>
                        </div>

                        <p className="text-xs text-slate-400 mb-2">
                            Por <span className="font-medium text-slate-300">{item.user}</span>
                        </p>

                        {item.details?.changes && (
                            <div className="mt-2 text-xs bg-slate-800/50 p-2 rounded border border-slate-600">
                                <span className="text-slate-400 block mb-1">Campos actualizados:</span>
                                <div className="flex flex-wrap gap-1">
                                    {item.details.changes.map((field: string, idx: number) => (
                                        <span key={idx} className="bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                                            {field}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {item.details?.reason && (
                            <p className="text-xs text-slate-400 italic mt-1">"{item.details.reason}"</p>
                        )}

                        {item.type === 'created' && (
                            <div className="mt-2 text-xs text-slate-400">
                                Estado inicial: <span className="font-medium text-slate-300">{item.details?.initial_status}</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
