'use client'

import { Calendar, CheckCircle, DollarSign, UserPlus, FileText, UserMinus, RotateCcw, Image, Package, Edit } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface TaskHistoryContentProps {
  task?: any
}

interface HistoryItem {
  id: number | string
  date: string
  type: 'created' | 'completed' | 'payment' | 'assignment' | 'removed' | 'reactivated' | 'change' | 'photo' | 'material' | 'budget'
  title: string
  user: string
  details?: any
}

export function TaskHistoryContent({ task }: TaskHistoryContentProps) {
  const [filter, setFilter] = useState<'all' | 'changes' | 'payments' | 'assignments'>('all')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (task?.id) {
      loadHistory()
    } else {
      setLoading(false)
    }
  }, [task?.id])

  const loadHistory = async () => {
    if (!task?.id) return

    setLoading(true)
    try {
      const historyItems: HistoryItem[] = []

      // 1. Obtener cambios en payment_distribution_history
      const { data: paymentHistory, error: paymentError } = await supabase
        .from('payment_distribution_history')
        .select(`
          id,
          old_distribution,
          new_distribution,
          change_reason,
          changed_at,
          changed_by
        `)
        .eq('task_id', task.id)
        .order('changed_at', { ascending: false })

      if (paymentError) throw paymentError

      // Obtener nombres de usuarios si hay registros
      let userIds: string[] = []
      if (paymentHistory && paymentHistory.length > 0) {
        userIds = paymentHistory
          .map(item => item.changed_by)
          .filter((id): id is string => id !== null && id !== undefined)
      }

      // Obtener nombres de usuarios
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

      if (paymentHistory) {
        paymentHistory.forEach(item => {
          historyItems.push({
            id: item.id,
            date: item.changed_at,
            type: 'payment',
            title: 'Distribución de pagos ajustada',
            user: item.changed_by ? (userNamesMap[item.changed_by] || 'Sistema') : 'Sistema',
            details: {
              old: item.old_distribution,
              new: item.new_distribution,
              reason: item.change_reason
            }
          })
        })
      }

      // 2. Obtener cambios en audit_log relacionados con tasks
      const { data: auditLog, error: auditError } = await supabase
        .from('audit_log')
        .select(`
          id,
          table_name,
          action,
          old_values,
          new_values,
          created_at,
          user_id
        `)
        .eq('table_name', 'tasks')
        .eq('record_id', task.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (auditError) throw auditError

      // Obtener nombres de usuarios del audit_log
      let auditUserIds: string[] = []
      if (auditLog && auditLog.length > 0) {
        auditUserIds = auditLog
          .map(item => item.user_id)
          .filter((id): id is string => id !== null && id !== undefined)
      }

      // Obtener nombres de usuarios del audit_log
      let auditUserNamesMap: Record<string, string> = {}
      if (auditUserIds.length > 0) {
        const { data: auditUserProfiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', auditUserIds)

        if (auditUserProfiles) {
          auditUserProfiles.forEach(profile => {
            auditUserNamesMap[profile.id] = profile.full_name || 'Usuario desconocido'
          })
        }
      }

      if (auditLog) {
        auditLog.forEach(item => {
          const userName = item.user_id ? (auditUserNamesMap[item.user_id] || 'Sistema') : 'Sistema'
          
          if (item.action === 'INSERT') {
            historyItems.push({
              id: `task-created-${item.id}`,
              date: item.created_at,
              type: 'created',
              title: 'Tarea creada',
              user: userName,
              details: {
                action: item.action,
                new_values: item.new_values
              }
            })
          } else if (item.action === 'UPDATE') {
            const newStatus = item.new_values?.status
            const oldStatus = item.old_values?.status
            const newBudget = item.new_values?.total_budget
            const oldBudget = item.old_values?.total_budget
            const newPriority = item.new_values?.priority
            const oldPriority = item.old_values?.priority
            
            if (newStatus === 'completed' && oldStatus !== 'completed') {
              historyItems.push({
                id: `task-completed-${item.id}`,
                date: item.created_at,
                type: 'completed',
                title: 'Tarea completada',
                user: userName,
                details: {
                  action: item.action,
                  old_values: item.old_values,
                  new_values: item.new_values
                }
              })
            } else if (newBudget !== undefined && oldBudget !== undefined && newBudget !== oldBudget) {
              historyItems.push({
                id: `task-budget-${item.id}`,
                date: item.created_at,
                type: 'budget',
                title: `Presupuesto actualizado: $${oldBudget?.toLocaleString('es-CL')} → $${newBudget?.toLocaleString('es-CL')}`,
                user: userName,
                details: {
                  action: item.action,
                  old_budget: oldBudget,
                  new_budget: newBudget
                }
              })
            } else if (newPriority !== oldPriority) {
              historyItems.push({
                id: `task-priority-${item.id}`,
                date: item.created_at,
                type: 'change',
                title: `Prioridad cambiada: ${oldPriority || 'N/A'} → ${newPriority || 'N/A'}`,
                user: userName,
                details: {
                  action: item.action,
                  old_priority: oldPriority,
                  new_priority: newPriority
                }
              })
            } else {
              historyItems.push({
                id: `task-update-${item.id}`,
                date: item.created_at,
                type: 'change',
                title: 'Tarea actualizada',
                user: userName,
                details: {
                  action: item.action,
                  old_values: item.old_values,
                  new_values: item.new_values
                }
              })
            }
          }
        })
      }

      // 3. Obtener historial de asignaciones desde task_assignment_history
      const { data: assignmentHistory, error: assignmentHistoryError } = await supabase
        .from('task_assignment_history')
        .select(`
          id,
          task_assignment_id,
          task_id,
          worker_id,
          action,
          action_date,
          action_by,
          reason,
          old_status,
          new_status,
          old_percentage,
          new_percentage,
          workers!worker_id(
            full_name
          ),
          user_profiles!action_by(
            full_name
          )
        `)
        .eq('task_id', task.id)
        .order('action_date', { ascending: false })

      if (assignmentHistoryError) throw assignmentHistoryError

      if (assignmentHistory) {
        assignmentHistory.forEach(historyItem => {
          const workerName = (Array.isArray(historyItem.workers) && historyItem.workers.length > 0 ? (historyItem.workers[0] as any)?.full_name : (historyItem.workers as any)?.full_name) || 'Trabajador desconocido'
          const userName = (Array.isArray(historyItem.user_profiles) && historyItem.user_profiles.length > 0 ? (historyItem.user_profiles[0] as any)?.full_name : (historyItem.user_profiles as any)?.full_name) || 'Sistema'
          
          if (historyItem.action === 'assigned') {
            historyItems.push({
              id: `assignment-created-${historyItem.id}`,
              date: historyItem.action_date,
              type: 'assignment',
              title: `${workerName} asignado a la tarea`,
              user: userName,
              details: {
                worker_id: historyItem.worker_id,
                worker_name: workerName
              }
            })
          } else if (historyItem.action === 'removed') {
            historyItems.push({
              id: `assignment-removed-${historyItem.id}`,
              date: historyItem.action_date,
              type: 'removed',
              title: `${workerName} removido de la tarea`,
              user: userName,
              details: {
                worker_id: historyItem.worker_id,
                worker_name: workerName,
                reason: historyItem.reason
              }
            })
          } else if (historyItem.action === 'reactivated') {
            historyItems.push({
              id: `assignment-reactivated-${historyItem.id}`,
              date: historyItem.action_date,
              type: 'reactivated',
              title: `${workerName} reactivado en la tarea`,
              user: userName,
              details: {
                worker_id: historyItem.worker_id,
                worker_name: workerName
              }
            })
          }
        })
      }

      // 4. Detectar cambios en fotos (comparar progress_photos)
      if (task.progress_photos && Array.isArray(task.progress_photos) && task.progress_photos.length > 0) {
        // Obtener el historial de cambios en progress_photos desde audit_log
        const { data: photoChanges } = await supabase
          .from('audit_log')
          .select(`
            id,
            old_values,
            new_values,
            created_at,
            user_id
          `)
          .eq('table_name', 'tasks')
          .eq('record_id', task.id)
          .not('old_values->progress_photos', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10)

        if (photoChanges) {
          photoChanges.forEach(change => {
            const oldPhotos = change.old_values?.progress_photos || []
            const newPhotos = change.new_values?.progress_photos || []
            
            if (newPhotos.length > oldPhotos.length) {
              const addedCount = newPhotos.length - oldPhotos.length
              const photoUserName = change.user_id ? (auditUserNamesMap[change.user_id] || 'Sistema') : 'Sistema'
              historyItems.push({
                id: `photo-added-${change.id}`,
                date: change.created_at,
                type: 'photo',
                title: `${addedCount} foto${addedCount > 1 ? 's' : ''} agregada${addedCount > 1 ? 's' : ''}`,
                user: photoUserName,
                details: {
                  old_count: oldPhotos.length,
                  new_count: newPhotos.length
                }
              })
            }
          })
        }
      }

      // 5. Ordenar por fecha (más reciente primero)
      historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setHistory(historyItems)
    } catch (err: any) {
      console.error('Error loading history:', err)
      toast.error(`Error al cargar historial: ${err.message}`)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Sin fecha'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'payment':
        return <DollarSign className="w-4 h-4 text-blue-600" />
      case 'assignment':
        return <UserPlus className="w-4 h-4 text-purple-600" />
      case 'removed':
        return <UserMinus className="w-4 h-4 text-red-600" />
      case 'reactivated':
        return <RotateCcw className="w-4 h-4 text-blue-600" />
      case 'created':
        return <FileText className="w-4 h-4 text-gray-600" />
      case 'photo':
        return <Image className="w-4 h-4 text-purple-600" />
      case 'material':
        return <Package className="w-4 h-4 text-orange-600" />
      case 'budget':
        return <DollarSign className="w-4 h-4 text-green-600" />
      case 'change':
        return <Edit className="w-4 h-4 text-gray-600" />
      default:
        return <Calendar className="w-4 h-4 text-gray-600" />
    }
  }

  const filteredHistory = filter === 'all' 
    ? history 
    : history.filter((item) => {
        if (filter === 'changes') return item.type === 'created' || item.type === 'completed' || item.type === 'change' || item.type === 'budget' || item.type === 'photo' || item.type === 'material'
        if (filter === 'payments') return item.type === 'payment' || item.type === 'budget'
        if (filter === 'assignments') return item.type === 'assignment' || item.type === 'removed' || item.type === 'reactivated'
        return true
      })

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Cargando historial...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-300 mb-4">
          Tarea: <span className="font-medium text-slate-100">{task?.task_name || 'Sin nombre'}</span>
        </p>
        
        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('changes')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'changes'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Cambios
          </button>
          <button
            onClick={() => setFilter('payments')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'payments'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Pagos
          </button>
          <button
            onClick={() => setFilter('assignments')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'assignments'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Asignaciones
          </button>
        </div>
      </div>

      {/* Historial Completo */}
      <div>
        <h4 className="text-sm font-semibold text-slate-200 mb-4">Historial Completo</h4>
        {filteredHistory.length > 0 ? (
          <div className="space-y-4">
            {filteredHistory.map((item) => (
              <div key={item.id} className="border-l-2 border-slate-600 pl-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(item.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-100">{item.title}</p>
                      <span className="text-xs text-slate-400">{formatDate(item.date)}</span>
                    </div>
                    
                    {/* Detalles específicos */}
                    {item.details && (
                      <div className="mt-2 space-y-1">
                        {/* Distribución de pagos */}
                        {item.details.new && Array.isArray(item.details.new) && (
                          <div className="bg-slate-700 rounded-md p-2 text-xs border border-slate-600">
                            <p className="font-medium text-slate-200 mb-1">Nueva distribución:</p>
                            {item.details.new.map((change: any, idx: number) => (
                              <p key={idx} className="text-slate-300">
                                <span className="font-medium">{change.worker_name || `Trabajador ${change.worker_id}`}:</span> {change.percentage}% (${(change.amount || 0).toLocaleString('es-CL')})
                              </p>
                            ))}
                            {item.details.reason && (
                              <p className="text-slate-400 mt-1 italic">Razón: {item.details.reason}</p>
                            )}
                          </div>
                        )}
                        {/* Trabajador asignado/removido/reactivado */}
                        {item.details.worker_name && (
                          <p className="text-xs text-slate-400">
                            {item.type === 'removed' && item.details.reason && (
                              <>Razón: <span className="italic text-slate-300">{item.details.reason}</span></>
                            )}
                            {item.type === 'assignment' && (
                              <><span className="text-slate-300">{item.details.worker_name}</span> asignado</>
                            )}
                          </p>
                        )}
                        {/* Cambio de presupuesto */}
                        {item.details.old_budget !== undefined && item.details.new_budget !== undefined && (
                          <div className="bg-slate-700 rounded-md p-2 text-xs border border-slate-600">
                            <p className="text-slate-300">
                              <span className="font-medium">Anterior:</span> ${item.details.old_budget.toLocaleString('es-CL')}
                            </p>
                            <p className="text-slate-300">
                              <span className="font-medium">Nuevo:</span> ${item.details.new_budget.toLocaleString('es-CL')}
                            </p>
                          </div>
                        )}
                        {/* Cambio de prioridad */}
                        {item.details.old_priority !== undefined && item.details.new_priority !== undefined && (
                          <p className="text-xs text-slate-400">
                            Prioridad: <span className="font-medium text-slate-300">{item.details.old_priority}</span> → <span className="font-medium text-slate-300">{item.details.new_priority}</span>
                          </p>
                        )}
                        {/* Fotos agregadas */}
                        {item.details.old_count !== undefined && item.details.new_count !== undefined && (
                          <p className="text-xs text-slate-400">
                            Fotos: <span className="text-slate-300">{item.details.old_count}</span> → <span className="text-slate-300">{item.details.new_count}</span>
                          </p>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-400 mt-1">Por: <span className="text-slate-300">{item.user}</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-700 rounded-lg border border-slate-600">
            <p className="text-slate-400">No hay historial disponible para esta tarea</p>
          </div>
        )}
      </div>
    </div>
  )
}
