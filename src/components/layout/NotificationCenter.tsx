'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/hooks'
import { 
  Bell, 
  Check, 
  CheckCheck, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  Clock
} from 'lucide-react'

export function NotificationCenter() {
  const router = useRouter()
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications()
  
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('unread')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Filtrar notificaciones
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications

  // Manejar clic en notificación
  const handleNotificationClick = async (notification: any) => {
    // Marcar como leída
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Navegar si tiene link
    if (notification.link) {
      router.push(notification.link)
      setIsOpen(false)
    }
  }

  // Obtener ícono según tipo
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error':
      case 'task_delayed':
      case 'contract_expired':
      case 'stock_critical':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      
      case 'warning':
      case 'contract_expiring':
      case 'stock_low':
      case 'tool_return_due':
      case 'payment_pending':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      
      case 'success':
      case 'task_assigned':
      case 'payment_completed':
      case 'invoice_approved':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      
      case 'info':
      case 'invoice_new':
      case 'tool_loan':
      case 'attendance_missing':
      default:
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  // Calcular tiempo transcurrido
  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Ahora'
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`
    if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)} días`
    return date.toLocaleDateString('es-CL')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-6 h-6" />
        
        {/* Badge de contador */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[20px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-100">
                Notificaciones
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('unread')}
                className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                No leídas ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Todas ({notifications.length})
              </button>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                <Bell className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">
                  {filter === 'unread' ? 'No tienes notificaciones sin leer' : 'No hay notificaciones'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 transition-colors cursor-pointer ${
                      !notification.is_read 
                        ? 'bg-slate-700/30 hover:bg-slate-700/50' 
                        : 'hover:bg-slate-700/20'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      {/* Ícono */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-medium ${
                            !notification.is_read ? 'text-slate-100' : 'text-slate-300'
                          }`}>
                            {notification.title}
                          </h4>
                          
                          {/* Indicador de no leída */}
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTimeAgo(notification.created_at)}
                          </span>

                          {/* Botón eliminar */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                            aria-label="Eliminar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Marcar todas como leídas */}
          {unreadCount > 0 && (
            <div className="p-3 border-t border-slate-700">
              <button
                onClick={async () => {
                  await markAllAsRead()
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors text-sm"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar todas como leídas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

