'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface PaymentSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  workerId: number
  workerName: string
  availableTasks: any[]
  onProcessPayment: (paymentData: PaymentData) => Promise<void>
}

interface PaymentData {
  amount: number
  selectedTasks: number[]
  notes?: string
  paymentType: 'full' | 'partial' | 'by_days'
  daysRange?: {
    start: string
    end: string
  }
}

export function PaymentSelectionModal({
  isOpen,
  onClose,
  workerId,
  workerName,
  availableTasks,
  onProcessPayment
}: PaymentSelectionModalProps) {
  const [paymentType, setPaymentType] = useState<'full' | 'partial' | 'by_days'>('full')
  const [selectedTasks, setSelectedTasks] = useState<number[]>([])
  const [customAmount, setCustomAmount] = useState<number>(0)
  const [daysRange, setDaysRange] = useState({ start: '', end: '' })
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const totalAvailable = availableTasks.reduce((sum, task) => sum + task.worker_payment, 0)
  const selectedAmount = selectedTasks.reduce((sum, taskId) => {
    const task = availableTasks.find(t => t.id === taskId)
    return sum + (task?.worker_payment || 0)
  }, 0)

  useEffect(() => {
    if (paymentType === 'full') {
      setSelectedTasks(availableTasks.map(task => task.id))
    } else if (paymentType === 'by_days' && daysRange.start && daysRange.end) {
      const filteredTasks = availableTasks.filter(task => {
        const taskDate = new Date(task.start_date)
        const startDate = new Date(daysRange.start)
        const endDate = new Date(daysRange.end)
        return taskDate >= startDate && taskDate <= endDate
      })
      setSelectedTasks(filteredTasks.map(task => task.id))
    }
  }, [paymentType, daysRange, availableTasks])

  const handleTaskToggle = (taskId: number) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const handleProcessPayment = async () => {
    if (selectedTasks.length === 0) {
      alert('Debe seleccionar al menos una tarea')
      return
    }

    setLoading(true)
    try {
      const paymentData: PaymentData = {
        amount: selectedAmount,
        selectedTasks,
        notes,
        paymentType,
        daysRange: paymentType === 'by_days' ? daysRange : undefined
      }

      await onProcessPayment(paymentData)
      onClose()
    } catch (error) {
      console.error('Error processing payment:', error)
      alert('Error al procesar el pago')
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = paymentType === 'by_days' && daysRange.start && daysRange.end
    ? availableTasks.filter(task => {
        const taskDate = new Date(task.start_date)
        const startDate = new Date(daysRange.start)
        const endDate = new Date(daysRange.end)
        return taskDate >= startDate && taskDate <= endDate
      })
    : availableTasks

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Seleccionar Pago - ${workerName}`}>
      <div className="space-y-6">
        {/* Tipo de Pago */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de Pago
          </label>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={paymentType === 'full' ? 'default' : 'outline'}
              onClick={() => setPaymentType('full')}
              className="flex items-center gap-2 text-black"
            >
              <CheckCircle className="h-4 w-4" />
              Pago Completo
            </Button>
            <Button
              variant={paymentType === 'partial' ? 'default' : 'outline'}
              onClick={() => setPaymentType('partial')}
              className="flex items-center gap-2 text-black"
            >
              <DollarSign className="h-4 w-4" />
              Pago Parcial
            </Button>
            <Button
              variant={paymentType === 'by_days' ? 'default' : 'outline'}
              onClick={() => setPaymentType('by_days')}
              className="flex items-center gap-2 text-black"
            >
              <Calendar className="h-4 w-4" />
              Por Días
            </Button>
          </div>
        </div>

        {/* Rango de Días */}
        {paymentType === 'by_days' && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha Inicio"
              type="date"
              value={daysRange.start}
              onChange={(e) => setDaysRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <Input
              label="Fecha Fin"
              type="date"
              value={daysRange.end}
              onChange={(e) => setDaysRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
        )}

        {/* Resumen de Pago */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-black">Resumen del Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Disponible:</span>
                <span className="ml-2 font-semibold">{formatCurrency(totalAvailable)}</span>
              </div>
              <div>
                <span className="text-gray-500">Seleccionado:</span>
                <span className="ml-2 font-semibold text-green-600">{formatCurrency(selectedAmount)}</span>
              </div>
              <div>
                <span className="text-gray-500">Tareas Seleccionadas:</span>
                <span className="ml-2 font-semibold">{selectedTasks.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Días Trabajados:</span>
                <span className="ml-2 font-semibold">
                  {Math.round(selectedTasks.reduce((sum, taskId) => {
                    const task = availableTasks.find(t => t.id === taskId)
                    return sum + (task?.estimated_hours || 0)
                  }, 0) / 8)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Tareas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tareas Disponibles ({filteredTasks.length})
          </label>
          <div className="max-h-60 overflow-y-auto border rounded-lg">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedTasks.includes(task.id) ? 'bg-green-50 border-green-200' : ''
                }`}
                onClick={() => handleTaskToggle(task.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(task.id)}
                        onChange={() => handleTaskToggle(task.id)}
                        className="rounded"
                      />
                      <span className="font-medium text-black">{task.task_name}</span>
                    </div>
                    <div className="text-sm text-black mt-1">
                      {formatDate(task.start_date)} • {task.estimated_hours}h • {formatCurrency(task.worker_payment)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(task.worker_payment)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notas */}
        <Textarea
          label="Notas del Pago"
          placeholder="Ej: Pago de tareas del mes de enero..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleProcessPayment}
            disabled={selectedTasks.length === 0 || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Procesando...' : `Procesar Pago ${formatCurrency(selectedAmount)}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}




