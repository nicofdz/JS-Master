import React from 'react'
import { AlertTriangle, Clock } from 'lucide-react'

interface TaskDelayIndicatorProps {
  isDelayed: boolean
  delayReason?: string
  className?: string
}

export function TaskDelayIndicator({ isDelayed, delayReason, className = '' }: TaskDelayIndicatorProps) {
  if (!isDelayed) return null

  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-red-500" />
      <span className="text-red-600 text-sm font-medium">
        Retrasada: No iniciada después de la fecha programada
      </span>
    </div>
  )
}
