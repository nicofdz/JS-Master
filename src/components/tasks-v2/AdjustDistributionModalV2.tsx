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
  const { adjustPaymentDistribution } = useTasksV2()
  const [distributions, setDistributions] = useState<Array<{ worker_id: number; percentage: number }>>([])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  // Inicializar distribuciones desde la tarea (solo trabajadores activos, no removidos, y solo "a_trato")
  useEffect(() => {
    if (task && task.workers) {
      const activeWorkers = task.workers.filter((worker: any) => 
        worker.assignment_status !== 'removed' && 
        worker.contract_type !== 'por_dia' // Solo incluir trabajadores "a_trato"
      )
      const initialDistributions = activeWorkers.map((worker: any) => ({
        worker_id: worker.id,
        percentage: Number(worker.payment_share_percentage || 0)
      }))
      setDistributions(initialDistributions)
    }
  }, [task])

  const handlePercentageChange = (workerId: number, newPercentage: number) => {
    const clampedPercentage = Math.max(0, Math.min(100, newPercentage))
    
    setDistributions(prev => {
      const updated = prev.map(d => 
        d.worker_id === workerId 
          ? { ...d, percentage: clampedPercentage }
          : d
      )
      
      // Si hay más de un trabajador, ajustar automáticamente los otros
      if (updated.length > 1) {
        const otherWorkers = updated.filter(d => d.worker_id !== workerId)
        const remainingPercentage = 100 - clampedPercentage
        
        // Caso especial: si solo hay 2 trabajadores, asignar directamente el resto
        if (otherWorkers.length === 1) {
          return updated.map(d => 
            d.worker_id === workerId 
              ? d
              : { ...d, percentage: Math.max(0, Math.min(100, remainingPercentage)) }
          )
        }
        
        // Si hay más de 2 trabajadores, distribuir proporcionalmente
        const totalOthers = otherWorkers.reduce((sum, d) => sum + d.percentage, 0)
        
        if (remainingPercentage > 0 && totalOthers > 0) {
          // Distribuir proporcionalmente el porcentaje restante
          const ratio = remainingPercentage / totalOthers
          return updated.map(d => 
            d.worker_id === workerId 
              ? d
              : { ...d, percentage: Math.max(0, Math.min(100, d.percentage * ratio)) }
          )
        } else if (remainingPercentage > 0) {
          // Si los otros suman 0, distribuir equitativamente
          const perWorker = remainingPercentage / otherWorkers.length
          return updated.map(d => 
            d.worker_id === workerId 
              ? d
              : { ...d, percentage: Math.max(0, Math.min(100, perWorker)) }
          )
        } else {
          // Si no hay espacio, poner los otros en 0
          return updated.map(d => 
            d.worker_id === workerId 
              ? d
              : { ...d, percentage: 0 }
          )
        }
      }
      
      return updated
    })
  }

  const calculateAmount = (percentage: number) => {
    if (!task || !task.total_budget) return 0
    return (task.total_budget * percentage) / 100
  }

  const totalPercentage = distributions.reduce((sum, d) => sum + d.percentage, 0)
  const isValid = Math.abs(totalPercentage - 100) < 0.01

  const handleSave = async () => {
    if (!task || !isValid) return

    setLoading(true)
    try {
      await adjustPaymentDistribution(task.id, distributions, reason || undefined)
      // La función adjustPaymentDistribution ya refresca las tareas automáticamente
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
                ${(taskData.total_budget / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
        </div>

        {/* Mensaje informativo si hay trabajadores "por_dia" */}
        {taskData.workers?.some((w: any) => w.contract_type === 'por_dia' && w.assignment_status !== 'removed') && (
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-400 mb-1">
                  Trabajadores &quot;Por Día&quot; en esta tarea
                </p>
                <p className="text-xs text-yellow-300/80">
                  Los trabajadores &quot;Por Día&quot; no aparecen en esta distribución ya que no reciben pago por tarea y su distribución no es modificable.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Distribución Actual - Grid 3 Columnas */}
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-4">Distribución Actual</h4>
          {distributions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No hay trabajadores &quot;A Trato&quot; en esta tarea para ajustar la distribución.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {taskData.workers
                ?.filter((worker: any) => 
                  worker.assignment_status !== 'removed' && 
                  worker.contract_type !== 'por_dia' // Solo mostrar trabajadores "a_trato"
                )
                ?.map((worker: any) => {
                const distribution = distributions.find(d => d.worker_id === worker.id)
                const percentage = distribution?.percentage || 0
                const amount = calculateAmount(percentage)

                return (
                  <div key={worker.id} className="border border-slate-600 bg-slate-700 rounded-lg p-4">
                    <div className="mb-3">
                      <label className="block text-xs text-slate-400 mb-1">Trabajador</label>
                      <p className="text-sm font-medium text-slate-100">{worker.full_name}</p>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs text-slate-400 mb-1">Porcentaje (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={percentage}
                        onChange={(e) => handlePercentageChange(worker.id, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-600 bg-slate-800 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Monto ($)</label>
                      <p className="text-sm font-semibold text-green-400">
                        ${(amount / 1000).toFixed(0)}K
                      </p>
                    </div>
                    {/* Barra de progreso visual */}
                    <div className="mt-3 w-full bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Total y Validación */}
        <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-200">Total:</span>
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                {totalPercentage.toFixed(2)}%
              </span>
              <span className="text-lg font-bold text-slate-100">
                ${(taskData.total_budget / 1000).toFixed(0)}K
              </span>
            </div>
          </div>
          {!isValid && (
            <div className="flex items-center gap-2 text-sm text-red-400 mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>La suma debe ser exactamente 100% (actual: {totalPercentage.toFixed(2)}%)</span>
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
            placeholder="Ej: Ajuste por horas trabajadas, cambio de responsabilidades, etc."
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
