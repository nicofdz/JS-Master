/**
 * Utilidades para crear notificaciones en el sistema
 * Estas funciones pueden ser llamadas desde cualquier módulo para generar notificaciones
 */

import { supabase } from './supabase'

export type NotificationType = 
  | 'info'
  | 'warning'
  | 'error'
  | 'success'
  | 'task_delayed'
  | 'task_assigned'
  | 'contract_expiring'
  | 'contract_expired'
  | 'payment_pending'
  | 'payment_completed'
  | 'stock_low'
  | 'stock_critical'
  | 'invoice_new'
  | 'invoice_approved'
  | 'tool_loan'
  | 'tool_return_due'
  | 'attendance_missing'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  metadata?: Record<string, any>
  relatedTable?: string
  relatedId?: number
}

/**
 * Función genérica para crear una notificación
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        metadata: params.metadata || {},
        related_table: params.relatedTable || null,
        related_id: params.relatedId || null,
        is_read: false
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error creating notification:', error)
    return { success: false, error }
  }
}

/**
 * Notificar tarea atrasada
 */
export async function notifyTaskDelayed(params: {
  userId: string
  taskId: number
  taskName: string
  daysDelayed: number
}) {
  return createNotification({
    userId: params.userId,
    type: 'task_delayed',
    title: 'Tarea Atrasada',
    message: `La tarea "${params.taskName}" está atrasada ${params.daysDelayed} día${params.daysDelayed > 1 ? 's' : ''}`,
    link: `/tareas?id=${params.taskId}`,
    metadata: { task_id: params.taskId, days_delayed: params.daysDelayed },
    relatedTable: 'apartment_tasks',
    relatedId: params.taskId
  })
}

/**
 * Notificar nueva tarea asignada
 */
export async function notifyTaskAssigned(params: {
  userId: string
  taskId: number
  taskName: string
  apartmentNumber: string
}) {
  return createNotification({
    userId: params.userId,
    type: 'task_assigned',
    title: 'Nueva Tarea Asignada',
    message: `Se te ha asignado la tarea "${params.taskName}" en el apartamento ${params.apartmentNumber}`,
    link: `/tareas?id=${params.taskId}`,
    metadata: { task_id: params.taskId, apartment: params.apartmentNumber },
    relatedTable: 'apartment_tasks',
    relatedId: params.taskId
  })
}

/**
 * Notificar contrato por vencer
 */
export async function notifyContractExpiring(params: {
  userId: string
  contractId: number
  workerName: string
  daysUntilExpiry: number
}) {
  return createNotification({
    userId: params.userId,
    type: 'contract_expiring',
    title: 'Contrato por Vencer',
    message: `El contrato de ${params.workerName} vence en ${params.daysUntilExpiry} día${params.daysUntilExpiry > 1 ? 's' : ''}`,
    link: `/trabajadores?contract=${params.contractId}`,
    metadata: { contract_id: params.contractId, days_until_expiry: params.daysUntilExpiry },
    relatedTable: 'contract_history',
    relatedId: params.contractId
  })
}

/**
 * Notificar contrato expirado
 */
export async function notifyContractExpired(params: {
  userId: string
  contractId: number
  workerName: string
}) {
  return createNotification({
    userId: params.userId,
    type: 'contract_expired',
    title: 'Contrato Expirado',
    message: `El contrato de ${params.workerName} ha expirado`,
    link: `/trabajadores?contract=${params.contractId}`,
    metadata: { contract_id: params.contractId },
    relatedTable: 'contract_history',
    relatedId: params.contractId
  })
}

/**
 * Notificar stock bajo de material
 */
export async function notifyStockLow(params: {
  userId: string
  materialId: number
  materialName: string
  currentStock: number
  minStock: number
}) {
  return createNotification({
    userId: params.userId,
    type: 'stock_low',
    title: 'Stock Bajo',
    message: `El material "${params.materialName}" tiene stock bajo (${params.currentStock}/${params.minStock})`,
    link: `/materiales?id=${params.materialId}`,
    metadata: { 
      material_id: params.materialId, 
      current_stock: params.currentStock,
      min_stock: params.minStock 
    },
    relatedTable: 'materials',
    relatedId: params.materialId
  })
}

/**
 * Notificar stock crítico de material
 */
export async function notifyStockCritical(params: {
  userId: string
  materialId: number
  materialName: string
  currentStock: number
}) {
  return createNotification({
    userId: params.userId,
    type: 'stock_critical',
    title: 'Stock Crítico',
    message: `El material "${params.materialName}" tiene stock crítico (${params.currentStock} unidades)`,
    link: `/materiales?id=${params.materialId}`,
    metadata: { 
      material_id: params.materialId, 
      current_stock: params.currentStock
    },
    relatedTable: 'materials',
    relatedId: params.materialId
  })
}

/**
 * Notificar nueva factura
 */
export async function notifyInvoiceNew(params: {
  userId: string
  invoiceId: number
  invoiceNumber: string
  amount: number
}) {
  return createNotification({
    userId: params.userId,
    type: 'invoice_new',
    title: 'Nueva Factura',
    message: `Se ha subido la factura #${params.invoiceNumber} por $${params.amount.toLocaleString('es-CL')}`,
    link: `/facturas?id=${params.invoiceId}`,
    metadata: { invoice_id: params.invoiceId, amount: params.amount },
    relatedTable: 'invoice_income',
    relatedId: params.invoiceId
  })
}

/**
 * Notificar factura aprobada
 */
export async function notifyInvoiceApproved(params: {
  userId: string
  invoiceId: number
  invoiceNumber: string
}) {
  return createNotification({
    userId: params.userId,
    type: 'invoice_approved',
    title: 'Factura Aprobada',
    message: `La factura #${params.invoiceNumber} ha sido aprobada`,
    link: `/facturas?id=${params.invoiceId}`,
    metadata: { invoice_id: params.invoiceId },
    relatedTable: 'invoice_income',
    relatedId: params.invoiceId
  })
}

/**
 * Notificar pago pendiente
 */
export async function notifyPaymentPending(params: {
  userId: string
  paymentId: number
  workerName: string
  amount: number
}) {
  return createNotification({
    userId: params.userId,
    type: 'payment_pending',
    title: 'Pago Pendiente',
    message: `Pago pendiente a ${params.workerName} por $${params.amount.toLocaleString('es-CL')}`,
    link: `/pagos?id=${params.paymentId}`,
    metadata: { payment_id: params.paymentId, amount: params.amount },
    relatedTable: 'worker_payment_history',
    relatedId: params.paymentId
  })
}

/**
 * Notificar pago completado
 */
export async function notifyPaymentCompleted(params: {
  userId: string
  paymentId: number
  amount: number
}) {
  return createNotification({
    userId: params.userId,
    type: 'payment_completed',
    title: 'Pago Completado',
    message: `Se ha completado un pago por $${params.amount.toLocaleString('es-CL')}`,
    link: `/pagos?id=${params.paymentId}`,
    metadata: { payment_id: params.paymentId, amount: params.amount },
    relatedTable: 'worker_payment_history',
    relatedId: params.paymentId
  })
}

/**
 * Notificar préstamo de herramienta
 */
export async function notifyToolLoan(params: {
  userId: string
  loanId: number
  toolName: string
  borrowerName: string
}) {
  return createNotification({
    userId: params.userId,
    type: 'tool_loan',
    title: 'Préstamo de Herramienta',
    message: `${params.borrowerName} ha recibido: ${params.toolName}`,
    link: `/herramientas?loan=${params.loanId}`,
    metadata: { loan_id: params.loanId },
    relatedTable: 'tool_loans',
    relatedId: params.loanId
  })
}

/**
 * Notificar devolución de herramienta pendiente
 */
export async function notifyToolReturnDue(params: {
  userId: string
  loanId: number
  toolName: string
  borrowerName: string
  daysOverdue: number
}) {
  return createNotification({
    userId: params.userId,
    type: 'tool_return_due',
    title: 'Devolución Pendiente',
    message: `${params.borrowerName} debe devolver: ${params.toolName} (${params.daysOverdue} días de retraso)`,
    link: `/herramientas?loan=${params.loanId}`,
    metadata: { loan_id: params.loanId, days_overdue: params.daysOverdue },
    relatedTable: 'tool_loans',
    relatedId: params.loanId
  })
}

/**
 * Notificar asistencia no registrada
 */
export async function notifyAttendanceMissing(params: {
  userId: string
  workerName: string
  date: string
}) {
  return createNotification({
    userId: params.userId,
    type: 'attendance_missing',
    title: 'Asistencia Sin Registrar',
    message: `No se ha registrado asistencia para ${params.workerName} el ${params.date}`,
    link: `/asistencia`,
    metadata: { worker_name: params.workerName, date: params.date },
    relatedTable: 'worker_attendance',
    relatedId: undefined
  })
}

