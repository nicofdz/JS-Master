'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loader2, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePaymentsV2 } from '@/hooks/usePaymentsV2'
import { supabase } from '@/lib/supabase'

interface EditPaymentDateModalProps {
    isOpen: boolean
    onClose: () => void
    payment: {
        id: number
        payment_date: string
        worker_name: string
        total_amount: number
    } | null
    onUpdate: () => void
}

export function EditPaymentDateModal({
    isOpen,
    onClose,
    payment,
    onUpdate
}: EditPaymentDateModalProps) {
    const [date, setDate] = useState('')
    const [loading, setLoading] = useState(false)
    const { updatePaymentDate } = usePaymentsV2()

    useEffect(() => {
        if (isOpen && payment) {
            // Set initial date from payment
            const d = new Date(payment.payment_date)
            setDate(d.toISOString().split('T')[0])
        }
    }, [isOpen, payment])

    const handleUpdate = async () => {
        if (!payment || !date) return

        try {
            setLoading(true)
            const newDate = new Date(date)

            // Call the RPC via hook
            await updatePaymentDate(payment.id, newDate)

            toast.success('Fecha de pago actualizada')
            onUpdate()
            onClose()
        } catch (error: any) {
            console.error('Error updating payment date:', error)
            toast.error(error.message || 'Error al actualizar la fecha')
        } finally {
            setLoading(false)
        }
    }

    if (!payment) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Editar Fecha de Pago"
            size="md"
        >
            <div className="space-y-4">
                <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                    <p className="text-sm text-slate-400 mb-1">Trabajador</p>
                    <p className="font-semibold text-slate-100 mb-2">{payment.worker_name}</p>
                    <p className="text-sm text-slate-400 mb-1">Monto del Pago</p>
                    <p className="font-semibold text-blue-400">
                        {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(payment.total_amount)}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Nueva Fecha de Pago
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        className="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleUpdate}
                        disabled={loading || !date}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Actualizando...
                            </>
                        ) : (
                            'Guardar Cambios'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
