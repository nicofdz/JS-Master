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
// ... existing code ...

/**
 * Calcula la duración en milisegundos considerando solo horas laborales (08:00 - 17:00)
 * @param start - Fecha de inicio
 * @param end - Fecha de término
 * @returns Duración en milisegundos
 */
export function calculateBusinessDuration(start: Date | string, end: Date | string): number {
  if (!start || !end) return 0

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (startDate > endDate) return 0

  // Constantes de horario laboral
  const WORK_START_HOUR = 8
  const WORK_END_HOUR = 17
  const MS_PER_HOUR = 1000 * 60 * 60

  // Normalizar fechas
  let current = new Date(startDate)
  const target = new Date(endDate)
  let totalMs = 0

  // Si es el mismo día
  if (current.toDateString() === target.toDateString()) {
    const startHour = Math.max(current.getHours(), WORK_START_HOUR)
    const endHour = Math.min(target.getHours(), WORK_END_HOUR)

    // Si la hora de fin es menor a la de inicio después de ajustar (ej: trabajo fuera de horario), retornar 0
    if (endHour <= startHour) return 0

    // Ajustar minutos
    const startMs = new Date(current).setHours(startHour, current.getMinutes(), 0, 0)
    let endMs = new Date(target).setHours(endHour, target.getMinutes(), 0, 0)

    // Si la hora original estaba fuera del rango laboral, ajustar
    if (current.getHours() < WORK_START_HOUR) {
      // Si empezó antes de las 8, cuenta desde las 8
      // startMs ya está ajustado arriba por startHour
    }

    // Caso especial: si terminó después de las 17:00, ajustar a 17:00
    if (target.getHours() >= WORK_END_HOUR) {
      endMs = new Date(target).setHours(WORK_END_HOUR, 0, 0, 0)
    }

    return Math.max(0, endMs - startMs)
  }

  // Si son días diferentes
  while (current <= target) {
    const isStartDay = current.toDateString() === startDate.toDateString()
    const isEndDay = current.toDateString() === target.toDateString()

    if (isStartDay) {
      // Calcular tiempo restante del primer día (hasta las 17:00)
      let hours = current.getHours()
      if (hours < WORK_END_HOUR) {
        const effectiveStartHour = Math.max(hours, WORK_START_HOUR)
        const startMs = new Date(current).setHours(effectiveStartHour, current.getMinutes(), 0, 0)
        const endMs = new Date(current).setHours(WORK_END_HOUR, 0, 0, 0)
        totalMs += Math.max(0, endMs - startMs)
      }
    } else if (isEndDay) {
      // Calcular tiempo transcurrido del último día (desde las 08:00)
      let hours = target.getHours()
      if (hours >= WORK_START_HOUR) {
        const effectiveEndHour = Math.min(hours, WORK_END_HOUR)
        const startMs = new Date(target).setHours(WORK_START_HOUR, 0, 0, 0)
        // Si termina después de las 17:00, cortar ahí
        let endMs
        if (hours >= WORK_END_HOUR) {
          endMs = new Date(target).setHours(WORK_END_HOUR, 0, 0, 0)
        } else {
          endMs = new Date(target).setHours(effectiveEndHour, target.getMinutes(), 0, 0)
        }
        totalMs += Math.max(0, endMs - startMs)
      }
    } else {
      // Días intermedios completos (9 horas)
      totalMs += (WORK_END_HOUR - WORK_START_HOUR) * MS_PER_HOUR
    }

    // Avanzar al siguiente día
    current.setDate(current.getDate() + 1)
    current.setHours(WORK_START_HOUR, 0, 0, 0)
  }

  return totalMs
}
