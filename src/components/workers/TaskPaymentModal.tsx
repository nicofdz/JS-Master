'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'

interface Task {
  id: number
  task_name: string
  worker_payment: number
  status: string
  created_at: string
  apartments: {
    apartment_number: string
    floors: {
      floor_number: number
      projects: {
        name: string
      }
    }
  }
}

interface TaskPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  workerId: number
  workerName: string
  onPaymentProcessed: () => void
}

export function TaskPaymentModal({ 
  isOpen, 
  onClose, 
  workerId, 
  workerName, 
  onPaymentProcessed 
}: TaskPaymentModalProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTasks, setSelectedTasks] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [notes, setNotes] = useState('')

  // Cargar tareas completadas del trabajador
  useEffect(() => {
    if (isOpen && workerId) {
      fetchCompletedTasks()
    }
  }, [isOpen, workerId])

  const fetchCompletedTasks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('apartment_tasks')
        .select(`
          id,
          task_name,
          worker_payment,
          status,
          created_at,
          apartments!inner(
            apartment_number,
            floors!inner(
              floor_number,
              projects!inner(name)
            )
          )
        `)
        .eq('assigned_to', workerId)
        .eq('status', 'completed')
        .or('is_paid.is.null,is_paid.eq.false')
        .not('worker_payment', 'is', null)
        .gt('worker_payment', 0)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks((data || []) as any)
    } catch (err: any) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTaskToggle = (taskId: number) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(tasks.map(task => task.id))
    }
  }

  const calculateTotalAmount = () => {
    return selectedTasks.reduce((total, taskId) => {
      const task = tasks.find(t => t.id === taskId)
      return total + (task?.worker_payment || 0)
    }, 0)
  }

  const handleProcessPayment = async () => {
    if (selectedTasks.length === 0) {
      alert('Selecciona al menos una tarea para pagar')
      return
    }

    try {
      setProcessing(true)
      const totalAmount = calculateTotalAmount()

      const { data, error } = await supabase.rpc('process_partial_payment_simple', {
        p_worker_id: workerId,
        p_selected_tasks: selectedTasks,
        p_amount: totalAmount,
        p_notes: notes || null
      })

      if (error) throw error

      // Cerrar modal y refrescar datos
      onClose()
      onPaymentProcessed()
      
      // Resetear estado
      setSelectedTasks([])
      setNotes('')
      
      alert(`Pago procesado exitosamente por $${totalAmount.toLocaleString()}`)
    } catch (err: any) {
      console.error('Error processing payment:', err)
      alert('Error al procesar el pago: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL')
  }

  const getProjectInfo = (task: Task) => {
    return `${task.apartments.floors.projects.name} - Piso ${task.apartments.floors.floor_number} - Apt ${task.apartments.apartment_number}`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pagar Tareas - ${workerName}`}>
      <div className="space-y-4">
        {/* Resumen */}
        <Card className="p-4 bg-blue-50">
          <div className="flex justify-between items-center">
            <span className="font-medium">Tareas seleccionadas:</span>
            <span className="font-bold text-lg">
              {selectedTasks.length} de {tasks.length}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="font-medium">Total a pagar:</span>
            <span className="font-bold text-xl text-green-600">
              ${calculateTotalAmount().toLocaleString()}
            </span>
          </div>
        </Card>

        {/* Botón seleccionar todo */}
        <div className="flex justify-between items-center">
          <Button
            onClick={handleSelectAll}
            variant="outline"
            className="text-sm"
          >
            {selectedTasks.length === tasks.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
          </Button>
          <span className="text-sm text-gray-600">
            {tasks.length} tareas completadas disponibles
          </span>
        </div>

        {/* Lista de tareas */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center py-4">Cargando tareas...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No hay tareas completadas pendientes de pago
            </div>
          ) : (
            tasks.map(task => (
              <Card 
                key={task.id} 
                className={`p-3 cursor-pointer transition-colors ${
                  selectedTasks.includes(task.id) 
                    ? 'bg-blue-100 border-blue-300' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleTaskToggle(task.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(task.id)}
                        onChange={() => handleTaskToggle(task.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <h4 className="font-medium text-black">{task.task_name}</h4>
                        <p className="text-sm text-gray-600">{getProjectInfo(task)}</p>
                        <p className="text-xs text-gray-500">
                          Completada: {formatDate(task.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      ${task.worker_payment.toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agregar notas sobre el pago..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleProcessPayment}
            disabled={selectedTasks.length === 0 || processing}
            className="bg-green-600 hover:bg-green-700"
          >
            {processing ? 'Procesando...' : `Pagar $${calculateTotalAmount().toLocaleString()}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}


