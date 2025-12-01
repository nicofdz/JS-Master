'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useWorkerPayments } from '@/hooks/useWorkerPayments'
import { useInvoices } from '@/hooks/useInvoices'
import { useIncomeTracking } from '@/hooks/useIncomeTracking'
import { WorkerPaymentHistory } from './WorkerPaymentHistory'
import { PaymentSelectionModal } from './PaymentSelectionModal'
import { EditPaymentModal } from './EditPaymentModal'
import { TaskPaymentModal } from './TaskPaymentModal'
import { DollarSign, Users, CheckCircle, Clock, Eye, Download, History, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface WorkerPaymentDetailsProps {
  workerId: number
  workerName: string
  onClose: () => void
}

function WorkerPaymentDetails({ workerId, workerName, onClose }: WorkerPaymentDetailsProps) {
  const [details, setDetails] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { getWorkerPaymentDetails } = useWorkerPayments()

  // Función para formatear fechas sin problemas de zona horaria
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    
    // Extraer solo la parte de la fecha (YYYY-MM-DD) ignorando la hora y zona horaria
    const datePart = dateString.split('T')[0]
    const [year, month, day] = datePart.split('-')
    
    // Crear fecha con hora local para evitar conversión UTC
    return new Date(`${year}-${month}-${day}T00:00:00`).toLocaleDateString('es-CL')
  }

  const fetchDetails = async () => {
    try {
      setLoading(true)
      const data = await getWorkerPaymentDetails(workerId)
      setDetails(data)
    } catch (error) {
      console.error('Error fetching details:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetails()
  }, [workerId])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-7xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Detalles de Pagos - {workerName}</h3>
          <Button variant="outline" onClick={onClose} className="text-slate-300 hover:text-slate-100">
            Cerrar
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-300">Cargando detalles...</div>
        ) : (
          <div className="space-y-4">
            {details.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No hay tareas con pagos asignados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-600">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Tarea
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Proyecto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Apartamento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Pago
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Fecha Inicio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Fecha Terminación
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800/50 divide-y divide-slate-600">
                    {details.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-700/30">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">
                          {task.task_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                          {task.apartments?.floors?.projects?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                          {task.apartments?.apartment_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                            task.status === 'completed' 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : task.status === 'in-progress'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }`}>
                            {task.status === 'completed' ? 'Completada' : 
                             task.status === 'in-progress' ? 'En Progreso' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-400">
                          {formatCurrency(task.worker_payment)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {formatDate(task.start_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {formatDate(task.completed_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface WorkerPaymentSummaryProps {
  totalRealIncome?: number
}

export function WorkerPaymentSummary({ totalRealIncome = 0 }: WorkerPaymentSummaryProps) {
  const { 
    payments, 
    loading, 
    refreshing,
    error, 
    getTotalPendingPayments, 
    getTotalCompletedPayments, 
    getTotalPaymentDue, 
    processPayment,
    processPartialPayment,
    updatePayment,
    deletePayment,
    getAvailableTasksForPayment,
    refresh: fetchWorkerPayments
  } = useWorkerPayments()
  
  const { getInvoiceStats, getAvailableIncome, invoices, fetchInvoices } = useInvoices()
  const { incomeData, loading: incomeLoading, refreshIncomeTracking, fetchIncomeTracking } = useIncomeTracking()
  // Estado de modales - solo uno puede estar abierto a la vez
  const [activeModal, setActiveModal] = useState<'none' | 'payment' | 'history' | 'partial' | 'edit' | 'details' | 'task-payment'>('none')
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null)
  const [selectedWorkerName, setSelectedWorkerName] = useState<string>('')
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [availableTasks, setAvailableTasks] = useState<any[]>([])
  const [paymentNotes, setPaymentNotes] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')


  // Filtrar trabajadores por nombre o RUT y solo mostrar trabajadores "a trato"
  const filteredPayments = payments.filter(worker => {
    // Excluir al jefe por RUT
    if (worker.rut === '13.161.546-9') return false
    
    // Filtrar solo trabajadores con contrato "a trato"
    const isTratoWorker = !worker.contract_type || worker.contract_type === 'a_trato'
    if (!isTratoWorker) return false
    
    if (!searchFilter) return true
    
    const searchTerm = searchFilter.toLowerCase()
    const fullName = worker.full_name?.toLowerCase() || ''
    const rut = worker.rut?.toLowerCase() || ''
    
    return fullName.includes(searchTerm) || rut.includes(searchTerm)
  })

  // Función única para abrir modales
  const openModal = (modalType: 'payment' | 'history' | 'partial' | 'edit' | 'details' | 'task-payment', workerId: number, workerName: string) => {
    setActiveModal(modalType)
    setSelectedWorker(workerId)
    setSelectedWorkerName(workerName)
  }

  // Función para cerrar todos los modales
  const closeAllModals = () => {
    setActiveModal('none')
    setSelectedWorker(null)
    setSelectedWorkerName('')
    setSelectedPayment(null)
    setPaymentNotes('')
  }

  // Funciones específicas para cada botón
  const handleViewDetails = (workerId: number, workerName: string) => {
    openModal('details', workerId, workerName)
  }

  const handleViewHistory = (workerId: number, workerName: string) => {
    openModal('history', workerId, workerName)
  }

  const handleProcessPayment = async (workerId: number, workerName: string) => {
    openModal('payment', workerId, workerName)
  }

  const handleTaskPayment = async (workerId: number, workerName: string) => {
    openModal('task-payment', workerId, workerName)
  }

  const handleAdvancedPayment = async (workerId: number, workerName: string) => {
    try {
      const tasks = await getAvailableTasksForPayment(workerId)
      setAvailableTasks(tasks)
      openModal('partial', workerId, workerName)
    } catch (error) {
      console.error('Error fetching available tasks:', error)
      alert('Error al cargar las tareas disponibles')
    }
  }

  const handleProcessPartialPayment = async (paymentData: any) => {
    if (!selectedWorker) return
    
    setProcessingPayment(true)
    try {
      await processPartialPayment(
        selectedWorker,
        paymentData.selectedTasks,
        paymentData.amount,
        paymentData.notes
      )
      
      // Refresh manual de los datos de pagos
      await fetchWorkerPayments()
      
      // Actualizar el tracking de ingresos
      await refreshIncomeTracking()
      await fetchIncomeTracking() // Forzar actualización del componente
      
      closeAllModals()
    } catch (error) {
      console.error('Error processing partial payment:', error)
      alert('Error al procesar el pago')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleEditPayment = (payment: any) => {
    setSelectedPayment(payment)
    setActiveModal('edit')
  }

  const handleUpdatePayment = async (paymentId: number, updateData: any) => {
    try {
      await updatePayment(paymentId, updateData.total_amount, updateData.notes)
      
      // Refresh manual de los datos de pagos
      await fetchWorkerPayments()
      
      // Actualizar el tracking de ingresos
      await refreshIncomeTracking()
      await fetchIncomeTracking() // Forzar actualización del componente
      closeAllModals()
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('Error al actualizar el pago')
    }
  }

  const handleDeletePayment = async (paymentId: number) => {
    try {
      console.log('🗑️ Iniciando eliminación de pago:', paymentId)
      
      await deletePayment(paymentId)
      
      // Refresh manual adicional de los datos de pagos
      console.log('🔄 Refresh manual después de eliminación...')
      await fetchWorkerPayments()
      
      // Actualizar el tracking de ingresos para que se refleje en "Dinero Disponible"
      console.log('🔄 Actualizando tracking de ingresos...')
      await refreshIncomeTracking()
      await fetchIncomeTracking() // Forzar actualización del componente
      
      console.log('✅ Eliminación completada y datos actualizados')
      closeAllModals()
    } catch (error) {
      console.error('Error deleting payment:', error)
      alert('Error al eliminar el pago')
    }
  }

  const handleConfirmPayment = async () => {
    if (!selectedWorker) return

    try {
      setProcessingPayment(true)
      await processPayment(selectedWorker, paymentNotes)
      
      // Refresh manual de los datos de pagos
      await fetchWorkerPayments()
      
      // Actualizar el tracking de ingresos
      await refreshIncomeTracking()
      await fetchIncomeTracking() // Forzar actualización del componente
      
      closeAllModals()
    } catch (error) {
      console.error('Error processing payment:', error)
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleClosePaymentModal = () => {
    closeAllModals()
  }

  const handleCloseHistory = () => {
    closeAllModals()
  }

  const handleCloseDetails = () => {
    closeAllModals()
  }

  const handleTaskPaymentProcessed = async () => {
    console.log('🔄 Actualizando datos después del pago...')
    
    // Refrescar los datos después del pago (sin mostrar loading)
    await fetchWorkerPayments()
    
    // Actualizar el tracking de ingresos
    await refreshIncomeTracking()
    await fetchIncomeTracking() // Forzar actualización del componente
    
    console.log('✅ Datos actualizados correctamente')
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-300">Cargando resumen de pagos...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-400">Error: {error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Indicador de actualización */}
      {refreshing && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className="text-sm font-medium">Actualizando datos...</span>
        </div>
      )}
      
      <div className="space-y-6 w-full">
        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-orange-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-400">Por pagar</p>
                  <p className="text-2xl font-bold text-slate-100">
                    {formatCurrency(filteredPayments.reduce((total, worker) => total + worker.pending_payment, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-400">Total Pagado</p>
                  <p className="text-2xl font-bold text-slate-100">
                    {formatCurrency(filteredPayments.reduce((total, worker) => total + worker.total_paid, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-400">Trabajadores a Trato</p>
                  <p className="text-2xl font-bold text-slate-100">{filteredPayments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-emerald-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-400">Dinero Disponible</p>
                  <p className="text-2xl font-bold text-slate-100">
                    {incomeLoading ? (
                      <div className="animate-pulse bg-slate-700 h-8 w-24 rounded"></div>
                    ) : (
                      formatCurrency(totalRealIncome - (incomeData?.total_spent_on_payments || 0))
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {incomeData?.processed_invoices_count || 0} facturas procesadas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-red-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-400">Dinero Gastado en Pagos</p>
                  <p className="text-2xl font-bold text-slate-100">
                    {incomeLoading ? (
                      <div className="animate-pulse bg-slate-700 h-8 w-24 rounded"></div>
                    ) : (
                      formatCurrency(incomeData?.total_spent_on_payments || 0)
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    Total gastado en trabajadores
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Trabajadores */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <DollarSign className="h-5 w-5" />
                Resumen de Pagos por Trabajador
              </CardTitle>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Buscar por nombre o RUT..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="px-2 py-1 text-sm text-slate-400 hover:text-slate-200"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                {searchFilter ? 'No se encontraron trabajadores con ese criterio de búsqueda' : 'No hay trabajadores con pagos asignados'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-600">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Trabajador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Cargo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Tareas Completadas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Costos Pendientes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Por Pagar
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Total Pagado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800/50 divide-y divide-slate-600">
                    {filteredPayments.map((worker) => (
                      <tr key={worker.worker_id} className="hover:bg-slate-700/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-slate-100">
                              {worker.full_name}
                            </div>
                            <div className="text-sm text-slate-400">{worker.rut}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {worker.cargo || 'No especificado'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400">{worker.completed_tasks}</span>
                            <span className="text-slate-500">/</span>
                            <span className="text-slate-300">{worker.total_tasks}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-400">
                          {formatCurrency(worker.pending_payment)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-400">
                          {formatCurrency(worker.uncompleted_payment)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-400">
                          {formatCurrency(worker.total_paid)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(worker.worker_id, worker.full_name)}
                              className="flex items-center gap-1 bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 border border-blue-600"
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewHistory(worker.worker_id, worker.full_name)}
                              className="flex items-center gap-1 bg-purple-900/30 hover:bg-purple-800/40 text-purple-400 border border-purple-600"
                            >
                              <History className="h-4 w-4" />
                              Historial
                            </Button>
                            {worker.uncompleted_payment > 0 && (
                              <Button
                                size="sm"
                                onClick={() => handleTaskPayment(worker.worker_id, worker.full_name)}
                                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <DollarSign className="h-4 w-4" />
                                Pagar Tareas
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalles */}
      {activeModal === 'details' && selectedWorker && (
        <WorkerPaymentDetails
          workerId={selectedWorker}
          workerName={selectedWorkerName}
          onClose={handleCloseDetails}
        />
      )}

      {/* Modal de Confirmación de Pago */}
      {activeModal === 'payment' && selectedWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-100">Confirmar Pago</h3>
              <Button variant="outline" onClick={handleClosePaymentModal} className="text-slate-300 hover:text-slate-100">
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-2">
                  Trabajador: <span className="font-medium text-slate-200">{selectedWorkerName}</span>
                </p>
                <p className="text-sm text-slate-400">
                  Monto a pagar: <span className="font-bold text-emerald-400">
                    {formatCurrency(payments.find(w => w.worker_id === selectedWorker)?.pending_payment || 0)}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notas del pago (opcional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                  placeholder="Notas adicionales sobre el pago..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleClosePaymentModal}
                  disabled={processingPayment}
                  className="text-slate-300 hover:text-slate-100"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={processingPayment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {processingPayment ? 'Procesando...' : 'Confirmar Pago'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial de Pagos */}
      {activeModal === 'history' && selectedWorker && (
        <WorkerPaymentHistory
          workerId={selectedWorker}
          workerName={selectedWorkerName}
          onClose={handleCloseHistory}
          onPaymentChanged={async () => {
            console.log('🔄 Historial notificó cambio de pago, refrescando datos...')
            // Refrescar los datos de pagos
            await fetchWorkerPayments()
            // Actualizar el tracking de ingresos
            await refreshIncomeTracking()
            await fetchIncomeTracking()
            console.log('✅ Datos actualizados después de cambio en historial')
          }}
        />
      )}

      {/* Modal de Selección de Pago */}
      {activeModal === 'partial' && selectedWorker && (
        <PaymentSelectionModal
          isOpen={activeModal === 'partial'}
          onClose={closeAllModals}
          workerId={selectedWorker}
          workerName={selectedWorkerName}
          availableTasks={availableTasks}
          onProcessPayment={handleProcessPartialPayment}
        />
      )}

      {/* Modal de Edición de Pago */}
      {activeModal === 'edit' && selectedPayment && (
        <EditPaymentModal
          isOpen={activeModal === 'edit'}
          onClose={closeAllModals}
          payment={selectedPayment}
          onUpdatePayment={handleUpdatePayment}
          onDeletePayment={handleDeletePayment}
        />
      )}

      {/* Modal de Pago de Tareas */}
      {activeModal === 'task-payment' && selectedWorker && (
        <TaskPaymentModal
          isOpen={activeModal === 'task-payment'}
          onClose={closeAllModals}
          workerId={selectedWorker}
          workerName={selectedWorkerName}
          onPaymentProcessed={handleTaskPaymentProcessed}
        />
      )}
    </>
  )
}
