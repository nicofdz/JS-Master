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

  // Inicializar distribuciones desde la tarea
  useEffect(() => {
    if (task && task.workers && task.total_budget) {
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
    }
  }, [task])

  const handleAmountChange = (workerId: number, newAmount: number) => {
    if (!task) return
    // Simple clamp purely for sanity, though budget overflow is checked at validation
    const clampedAmount = Math.max(0, newAmount)

    setDistributions(prev => prev.map(d => {
      if (d.worker_id === workerId) {
        // Recalcular porcentaje referencial
        const newPct = (clampedAmount / task.total_budget) * 100
        return { ...d, amount: clampedAmount, percentage: newPct }
      }
      return d
    }))
  }

  const totalAmount = distributions.reduce((sum, d) => sum + d.amount, 0)
  // Validation: Amount must match budget (allowing slight float tolerance for display checks, but backend will enforce)
  // User wants EXACT payment, so we compare directly logic mostly.
  const diff = Math.abs(totalAmount - (task?.total_budget || 0))
  const isValid = diff < 1 // Allow < 1 peso diff? Or strictly 0.01? Let's say < 1 for UI feedback, hook is 0.01.

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
                  Trabajadores &quot;Por Día&quot; en esta tarea
                </p>
                <p className="text-xs text-yellow-300/80">
                  Los trabajadores &quot;Por Día&quot; no aparecen en esta distribución ya que no reciben pago por tarea.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Distribución Actual - Grid 3 Columnas */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-semibold text-slate-200">Distribución de Montos</h4>
            <span className="text-xs text-slate-400">Edita los montos exactos ($)</span>
          </div>

          {distributions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No hay trabajadores &quot;A Trato&quot; disponibles.</p>
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
                        <label className="block text-xs text-slate-400 mb-1">Monto Exacto ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={amount}
                          onChange={(e) => handleAmountChange(worker.id, parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-slate-600 bg-slate-800 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                        />
                      </div>

                      <div className="flex justify-between items-end">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Porcentaje (Ref)</label>
                          <p className="text-xs text-slate-400">
                            {percentage.toFixed(2)}%
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
            <span className="text-sm font-medium text-slate-200">Total Asignado:</span>
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                ${totalAmount.toLocaleString('es-CL')}
              </span>
              <span className="text-sm text-slate-400">
                / ${(taskData.total_budget).toLocaleString('es-CL')}
              </span>
            </div>
          </div>
          {!isValid && (
            <div className="flex items-center gap-2 text-sm text-red-400 mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>
                {totalAmount < taskData.total_budget
                  ? `Faltan $${(taskData.total_budget - totalAmount).toLocaleString('es-CL')} por asignar`
                  : `Te pasaste por $${(totalAmount - taskData.total_budget).toLocaleString('es-CL')}`
                }
              </span>
            </div>
          )}
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
            placeholder="Ej: Ajuste por cambio de alcance, error en monto inicial, etc."
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
