'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, Calendar, Clock, AlertCircle, Trash2 } from 'lucide-react'

interface EditPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  payment: any
  onUpdatePayment: (paymentId: number, updateData: any) => Promise<void>
  onDeletePayment: (paymentId: number) => Promise<void>
}

export function EditPaymentModal({
  isOpen,
  onClose,
  payment,
  onUpdatePayment,
  onDeletePayment
}: EditPaymentModalProps) {
  const [amount, setAmount] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (payment) {
      setAmount(payment.total_amount || 0)
      setNotes(payment.notes || '')
    }
  }, [payment])

  const handleUpdate = async () => {
    if (amount <= 0) {
      alert('El monto debe ser mayor a 0')
      return
    }

    setLoading(true)
    try {
      await onUpdatePayment(payment.id, {
        total_amount: amount,
        notes: notes
      })
      onClose()
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('Error al actualizar el pago')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Está seguro de que desea eliminar este pago? Esta acción no se puede deshacer.')) {
      return
    }

    setLoading(true)
    try {
      await onDeletePayment(payment.id)
      onClose()
    } catch (error) {
      console.error('Error deleting payment:', error)
      alert('Error al eliminar el pago')
    } finally {
      setLoading(false)
    }
  }

  if (!payment) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Editar Pago #${payment.id}`}>
      <div className="space-y-6">
        {/* Información del Pago */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información del Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Fecha:</span>
                <span className="ml-2 font-semibold">{formatDate(payment.payment_date)}</span>
              </div>
              <div>
                <span className="text-gray-500">Tareas:</span>
                <span className="ml-2 font-semibold">{payment.tasks_count}</span>
              </div>
              <div>
                <span className="text-gray-500">Días Trabajados:</span>
                <span className="ml-2 font-semibold">{payment.work_days}</span>
              </div>
              <div>
                <span className="text-gray-500">Estado:</span>
                <span className={`ml-2 font-semibold ${
                  payment.payment_status === 'completed' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {payment.payment_status === 'completed' ? 'Completado' : 'Pendiente'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editar Monto */}
        <div>
          <Input
            label="Monto del Pago"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            error={amount <= 0 ? 'El monto debe ser mayor a 0' : undefined}
          />
        </div>

        {/* Editar Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas del Pago
          </label>
          <Textarea
            placeholder="Ej: Pago de tareas del mes de enero..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Advertencia de Cambios */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Advertencia</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Los cambios en el monto del pago afectarán inmediatamente el resumen de pagos del trabajador.
                Asegúrese de que el nuevo monto sea correcto.
              </p>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-between">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Pago
            </Button>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={loading || amount <= 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Actualizando...' : 'Actualizar Pago'}
            </Button>
          </div>
        </div>

        {/* Confirmación de Eliminación */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
              </div>
              <p className="text-gray-600 mb-6">
                ¿Está seguro de que desea eliminar este pago? Esta acción no se puede deshacer y 
                afectará el resumen de pagos del trabajador.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}








