import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusColor(status: string | null | undefined): string {
  if (!status) return 'bg-slate-600 text-slate-200'

  switch (status) {
    case 'completed':
      return 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
    case 'good':
      return 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
    case 'active':
      return 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
    case 'planning':
      return 'bg-slate-600 text-slate-200'
    case 'in-progress':
    case 'in_progress':
      return 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
    case 'warning':
      return 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/50'
    case 'danger':
      return 'bg-red-600 text-white shadow-lg shadow-red-900/50'
    case 'blocked':
      return 'bg-red-600 text-white shadow-lg shadow-red-900/50'
    case 'delayed':
      return 'bg-orange-600 text-white shadow-lg shadow-orange-900/50'
    case 'pending':
      return 'bg-slate-600 text-slate-200 shadow-md'
    default:
      return 'bg-gray-500 text-white'
  }
}

export function getStatusEmoji(status: string | null | undefined): string {
  if (!status) return '⚫'

  switch (status) {
    case 'completed': return '✅'
    case 'good': return '🟢'
    case 'active': return '🟢'
    case 'planning': return '⚪'
    case 'in-progress':
    case 'in_progress': return '🔵'
    case 'warning': return '🟡'
    case 'danger': return '🔴'
    case 'blocked': return '⛔'
    case 'delayed': return '🟠'
    case 'pending': return '⚪'
    default: return '⚫'
  }
}

export function getStatusText(status: string | null | undefined): string {
  if (!status) return 'Pendiente'

  switch (status) {
    case 'completed': return 'Completado'
    case 'good': return 'Bueno'
    case 'in-progress':
    case 'in_progress': return 'En Progreso'
    case 'warning': return 'Advertencia'
    case 'danger': return 'Peligro'
    case 'blocked': return 'Bloqueado'
    case 'pending': return 'Pendiente'
    case 'planning': return 'Planificación'
    case 'active': return 'Activo'
    case 'paused': return 'Pausado'
    default: return status
  }
}

export function formatDate(date: string | Date): string {
  if (!date) return 'Sin fecha'

  // Si es string, extraer solo la fecha sin hora
  const dateString = typeof date === 'string' ? date.split('T')[0] : date.toISOString().split('T')[0]

  // Crear fecha en zona local para evitar problemas UTC
  const [year, month, day] = dateString.split('-')
  const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))

  return localDate.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function calculateProgress(activities: any[]): number {
  if (!activities || activities.length === 0) return 0
  const totalProgress = activities.reduce((sum, activity) => sum + (activity.progress || 0), 0)
  return Math.round(totalProgress / activities.length)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Formatea el número de departamento concatenando código y número si existe código
 * @param apartment_code - Código del departamento (ej: "A1 D")
 * @param apartment_number - Número del departamento (ej: "104")
 * @returns String formateado (ej: "A1 D-104" o "104")
 */
export function formatApartmentNumber(apartment_code: string | null | undefined, apartment_number: string | number): string {
  if (apartment_code && apartment_code.trim()) {
    return `${apartment_code.trim()}-${apartment_number}`
  }
  return apartment_number.toString()
}
