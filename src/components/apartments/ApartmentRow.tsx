'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Trash2, Lock, Unlock, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { formatDate, getStatusColor, getStatusEmoji } from '@/lib/utils'
import { APARTMENT_STATUSES } from '@/lib/constants'
import { useApartments } from '@/hooks/useApartments'
import toast from 'react-hot-toast'

interface ApartmentRowProps {
  apartment: any
  onDelete: (apartmentId: number) => void
  onBlock: (apartmentId: number, currentStatus: string) => void
}

export function ApartmentRow({ apartment, onDelete, onBlock }: ApartmentRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { updateApartmentStatusFromTasks } = useApartments()

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateApartmentStatusFromTasks(apartment.id)
      toast.success(`Apartamento ${apartment.apartment_number} actualizado`)
    } catch (error) {
      toast.error('Error al actualizar apartamento')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'blocked':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado'
      case 'in-progress':
        return 'En Progreso'
      case 'blocked':
        return 'Bloqueado'
      default:
        return 'Pendiente'
    }
  }


  return (
    <div className="border-l-4 border-blue-200 bg-blue-50 ml-4 mb-2">
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(apartment.status)}
              <span className="font-medium text-gray-900">
                Apartamento {apartment.apartment_number}
              </span>
            </div>
            <Badge className={getStatusColor(apartment.status)}>
              {getStatusText(apartment.status)}
            </Badge>
            {apartment.tasks_count > 0 && (
              <span className="text-sm text-gray-500">
                {apartment.tasks_count} tarea{apartment.tasks_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('ApartmentRow - Status actual:', apartment.status)
                onBlock(apartment.id, apartment.status)
              }}
              className="flex items-center space-x-1"
            >
              {apartment.status === 'blocked' ? (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Desbloquear</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Bloquear</span>
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(apartment.id)}
              className="flex items-center space-x-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </Button>
          </div>
        </div>
        
        {apartment.tasks_count > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Progreso: {apartment.progress_percentage || 0}%</span>
              <span>Creado: {formatDate(apartment.created_at)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
