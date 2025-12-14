
import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface TerminateContractModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (data: { date: string; type: string; reason: string }) => Promise<void>
    loading?: boolean
    startDate?: string
}

export const TerminateContractModal: React.FC<TerminateContractModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    loading = false,
    startDate
}) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [type, setType] = useState('Renuncia')
    const [reason, setReason] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (startDate && date < startDate) {
            setError(`La fecha de término no puede ser anterior a la fecha de inicio del contrato (${startDate})`)
            return
        }

        await onConfirm({ date, type, reason })
        // Reset form handled by parent or effect if needed, but here simple is fine
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Terminar Contrato Anticipadamente">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Término</label>
                    <Input
                        type="date"
                        value={date}
                        min={startDate}
                        onChange={(e) => {
                            setDate(e.target.value)
                            setError(null)
                        }}
                        required
                        className="mt-1"
                    />
                    {startDate && (
                        <p className="text-xs text-gray-500 mt-1">
                            La fecha debe ser posterior al inicio del contrato ({startDate})
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Término</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    >
                        <option value="Renuncia">Renuncia</option>
                        <option value="Despido">Despido</option>
                        <option value="Termino de Contrato">Término de Contrato</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Motivo / Razón</label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        rows={3}
                        required
                        placeholder="Explique la razón del término..."
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="danger" disabled={loading}>
                        {loading ? 'Procesando...' : 'Confirmar Término'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
