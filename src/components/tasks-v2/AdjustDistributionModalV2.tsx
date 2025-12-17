'use client'

import { useState, useEffect } from 'react'
import { ModalV2 } from './ModalV2'
import { AlertCircle } from 'lucide-react'
import { useTasksV2 } from '@/hooks/useTasks_v2'
import toast from 'react-hot-toast'

interface AdjustDistributionModalV2Props {
  isOpen: boolean
  onClose: () => void
  task?: any // TaskV2 type
  onSuccess?: () => void
}

export function AdjustDistributionModalV2({ isOpen, onClose, task, onSuccess }: AdjustDistributionModalV2Props) {
  const { adjustPaymentDistributionByAmount } = useTasksV2()
  const [distributions, setDistributions] = useState<Array<{ worker_id: number; percentage: number; amount: number }>>([])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  // Inicializar distribuciones desde la tarea al abrir el modal
  useEffect(() => {
    if (isOpen && task && task.workers && task.total_budget) {
      const activeWorkers = task.workers.filter((worker: any) =>
        worker.assignment_status !== 'removed' &&
        worker.contract_type !== 'por_dia'
      )

      const initialDistributions = activeWorkers.map((worker: any) => {
        const percentage = Number(worker.payment_share_percentage || 0)
        // Usar worker_payment si existe, si no calcularlo del porcentaje
        let amount = Number(worker.worker_payment || 0)
        if (amount === 0 && percentage > 0) {
          amount = (task.total_budget * percentage) / 100
        }

        return {
          worker_id: worker.id,
          percentage: percentage,
          amount: amount
        }
      })
      setDistributions(initialDistributions)
      setReason('') // Limpiar razón al abrir
    }
  }, [task, isOpen])

  const handlePercentageChange = (workerId: number, newPercentage: number) => {
    if (!task) return

    // Clamp new percentage between 0 and 100
    const clampedPercentage = Math.max(0, Math.min(100, newPercentage))
    const calculatedAmount = (task.total_budget * clampedPercentage) / 100

    setDistributions(prev => {
      // Si hay exactamente 2 trabajadores, el otro se ajusta automáticamente
      if (prev.length === 2) {
        return prev.map(d => {
          if (d.worker_id === workerId) {
            return { ...d, percentage: clampedPercentage, amount: calculatedAmount }
          } else {
            // El "otro" trabajador toma el restante
            const remainingPercentage = Math.max(0, 100 - clampedPercentage)
            const remainingAmount = (task.total_budget * remainingPercentage) / 100
            return { ...d, percentage: remainingPercentage, amount: remainingAmount }
          }
        })
      }

      // Si no son 2, comportamiento estándar (solo actualiza el modificado)
      return prev.map(d => {
        if (d.worker_id === workerId) {
          return { ...d, percentage: clampedPercentage, amount: calculatedAmount }
        }
        return d
      })
    })
  }

  const totalAmount = distributions.reduce((sum, d) => sum + d.amount, 0)
  const totalPercentage = distributions.reduce((sum, d) => sum + d.percentage, 0)

  // Validation: Percentages must sum to 100% (allowing tolerance)
  const isValid = Math.abs(totalPercentage - 100) < 0.05

  const handleSave = async () => {
    if (!task || !isValid) return

    setLoading(true)
    try {
      const payload = distributions.map(d => ({
        worker_id: d.worker_id,
        amount: d.amount
      }))

      await adjustPaymentDistributionByAmount(task.id, payload, task.total_budget, reason || undefined)

      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err: any) {
      toast.error(`Error al ajustar distribución: ${err.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!task) return null

  const taskData = task

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title="Ajustar Distribución de Pagos"
      size="xl"
    >
      <div className="space-y-6">
        {/* Información de la Tarea */}
        <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tarea</label>
              <p className="text-sm font-medium text-slate-100">{taskData.task_name}</p>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Presupuesto Total</label>
              <p className="text-sm font-medium text-slate-100">
                ${(taskData.total_budget).toLocaleString('es-CL')}
              </p>
            </div>
          </div>
        </div>

        {/* Mensaje informativo */}
        {taskData.workers?.some((w: any) => w.contract_type === 'por_dia' && w.assignment_status !== 'removed') && (
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-400 mb-1">
                  Trabajadores "Por Día" en esta tarea
                </p>
                <p className="text-xs text-yellow-300/80">
                  Los trabajadores "Por Día" no aparecen en esta distribución ya que no reciben pago por tarea.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Distribución Actual - Grid 3 Columnas */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-semibold text-slate-200">Distribución de Pagos</h4>
            <span className="text-xs text-slate-400">Edita los porcentajes (%)</span>
          </div>

          {distributions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No hay trabajadores "A Trato" disponibles.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {taskData.workers
                ?.filter((worker: any) =>
                  worker.assignment_status !== 'removed' &&
                  worker.contract_type !== 'por_dia'
                )
                ?.map((worker: any) => {
                  const distribution = distributions.find(d => d.worker_id === worker.id)
                  const amount = distribution?.amount || 0
                  const percentage = distribution?.percentage || 0

                  return (
                    <div key={worker.id} className="border border-slate-600 bg-slate-700 rounded-lg p-4">
                      <div className="mb-3">
                        <label className="block text-xs text-slate-400 mb-1">Trabajador</label>
                        <p className="text-sm font-medium text-slate-100 truncate" title={worker.full_name}>
                          {worker.full_name}
                        </p>
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs text-slate-400 mb-1">Porcentaje (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          onFocus={(e) => e.target.select()}
                          value={percentage}
                          onChange={(e) => handlePercentageChange(worker.id, parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-slate-600 bg-slate-800 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                        />
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="w-full">
                          <label className="block text-xs text-slate-500 mb-1">Monto (Calculado)</label>
                          <p className="text-sm font-medium text-green-400">
                            ${amount.toLocaleString('es-CL')}
                          </p>
                        </div>
                      </div>

                      {/* Barra de progreso visual */}
                      <div className="mt-3 w-full bg-slate-600 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Total y Validación */}
        <div className={`border rounded-lg p-4 transition-colors ${isValid ? 'bg-slate-700 border-slate-600' : 'bg-red-900/10 border-red-500/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-200">Total Porcentaje:</span>
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                {totalPercentage.toFixed(2)}%
              </span>
              <span className="text-sm text-slate-400">
                / 100%
              </span>
            </div>
          </div>
          {!isValid && (
            <div className="flex items-center gap-2 text-sm text-red-400 mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>
                {totalPercentage < 100
                  ? `Falta asignar ${(100 - totalPercentage).toFixed(2)}%`
                  : `Te pasaste por ${(totalPercentage - 100).toFixed(2)}%`
                }
              </span>
            </div>
          )}
          <div className="mt-2 text-xs text-slate-400 flex justify-between border-t border-slate-600 pt-2">
            <span>Monto Total Asignado:</span>
            <span className={Math.abs(totalAmount - (taskData.total_budget || 0)) < 10 ? 'text-green-400' : 'text-yellow-400'}>
              ${totalAmount.toLocaleString('es-CL')} / ${(taskData.total_budget || 0).toLocaleString('es-CL')}
            </span>
          </div>
        </div>

        {/* Razón del Ajuste */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Razón del Ajuste (Opcional)
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
            placeholder="Ej: Ajuste por cambio de alcance, error en porcentaje inicial, etc."
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : 'Guardar Distribución'}
          </button>
        </div>
      </div>
    </ModalV2>
  )
}
