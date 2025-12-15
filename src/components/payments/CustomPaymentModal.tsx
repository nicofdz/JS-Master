import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Loader2, DollarSign, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

interface CustomPaymentModalProps {
    isOpen: boolean
    onClose: () => void
    onPaymentSuccess: () => void
    workers: { id: number; name: string; rut: string }[]
    projects: { id: number; name: string }[]
}

export function CustomPaymentModal({
    isOpen,
    onClose,
    onPaymentSuccess,
    workers,
    projects
}: CustomPaymentModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        workerId: '',
        projectId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    })

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            setFormData({
                workerId: '',
                projectId: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                notes: ''
            })
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.workerId || !formData.projectId || !formData.amount || !formData.date) {
            toast.error('Por favor completa todos los campos requeridos')
            return
        }

        const amount = parseInt(formData.amount.replace(/\./g, ''))
        if (isNaN(amount) || amount <= 0) {
            toast.error('El monto debe ser mayor a 0')
            return
        }

        try {
            setLoading(true)

            // Obtener el usuario actual para 'created_by'
            const { data: { user } } = await supabase.auth.getUser()

            const paymentData = {
                worker_id: parseInt(formData.workerId),
                project_id: parseInt(formData.projectId),
                contract_type: 'custom',
                payment_date: formData.date,
                total_amount: amount,
                notes: formData.notes || null,
                payment_status: 'completed',
                created_at: new Date().toISOString(),
                created_by: user?.id,
                tasks_count: 0,
                days_count: 0,
                work_days: 0,
                payment_month: new Date(formData.date).getMonth() + 1,
                payment_year: new Date(formData.date).getFullYear()
            }

            const { error } = await supabase
                .from('worker_payment_history')
                .insert(paymentData)

            if (error) throw error

            toast.success('Pago personalizado registrado correctamente')
            onPaymentSuccess()
            onClose()

        } catch (error: any) {
            console.error('Error registrando pago:', error)
            toast.error(error.message || 'Error al registrar el pago')
        } finally {
            setLoading(false)
        }
    }

    // Ordenar listas
    const sortedWorkers = [...workers].sort((a, b) => a.name.localeCompare(b.name))
    const sortedProjects = [...projects].sort((a, b) => a.name.localeCompare(b.name))

    const formatAmount = (value: string) => {
        const number = value.replace(/\D/g, '')
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Registrar Pago Personalizado"
        >
            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Trabajador */}
                <div className="space-y-2">
                    <label htmlFor="worker" className="text-sm font-medium text-slate-200">Trabajador</label>
                    <Select
                        id="worker"
                        value={formData.workerId}
                        onChange={(e) => setFormData(prev => ({ ...prev, workerId: e.target.value }))}
                        className="w-full"
                    >
                        <option value="">Seleccionar trabajador</option>
                        {sortedWorkers.map(worker => (
                            <option key={worker.id} value={worker.id.toString()}>
                                {worker.name} ({worker.rut})
                            </option>
                        ))}
                    </Select>
                </div>

                {/* Proyecto */}
                <div className="space-y-2">
                    <label htmlFor="project" className="text-sm font-medium text-slate-200">Proyecto</label>
                    <Select
                        id="project"
                        value={formData.projectId}
                        onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                        className="w-full"
                    >
                        <option value="">Seleccionar proyecto</option>
                        {sortedProjects.map(project => (
                            <option key={project.id} value={project.id.toString()}>
                                {project.name}
                            </option>
                        ))}
                    </Select>
                </div>

                {/* Monto y Fecha */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="amount" className="text-sm font-medium text-slate-200">Monto</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                            <Input
                                id="amount"
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: formatAmount(e.target.value) }))}
                                className="pl-9"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="date" className="text-sm font-medium text-slate-200">Fecha</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </div>

                {/* Notas */}
                <div className="space-y-2">
                    <label htmlFor="notes" className="text-sm font-medium text-slate-200">Notas / Descripción</label>
                    <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Detalle del pago (bono, adelanto, etc.)"
                        rows={3}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Registrando...
                            </>
                        ) : (
                            'Registrar Pago'
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
