'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useAuth } from './useAuth'

export interface Notification {
  id: number
  user_id: string
  type: string
  title: string
  message: string
  link: string | null
  metadata: Record<string, any>
  is_read: boolean
  related_table: string | null
  related_id: number | null
  created_at: string
}

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtener todas las notificaciones del usuario
  const fetchNotifications = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError

      setNotifications(data || [])
      
      // Calcular no leídas
      const unread = (data || []).filter((n) => !n.is_read).length
      setUnreadCount(unread)

      return data
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching notifications:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  // Marcar una notificación como leída
  const markAsRead = async (notificationId: number) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (updateError) throw updateError

      // Actualizar estado local
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      return true
    } catch (err: any) {
      console.error('Error marking notification as read:', err)
      toast.error('Error al marcar notificación como leída')
      return false
    }
  }

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    if (!user) return false

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (updateError) throw updateError

      // Actualizar estado local
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)

      toast.success('Todas las notificaciones marcadas como leídas')
      return true
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err)
      toast.error('Error al marcar todas como leídas')
      return false
    }
  }

  // Eliminar una notificación
  const deleteNotification = async (notificationId: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (deleteError) throw deleteError

      // Actualizar estado local
      const notification = notifications.find((n) => n.id === notificationId)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }

      return true
    } catch (err: any) {
      console.error('Error deleting notification:', err)
      toast.error('Error al eliminar notificación')
      return false
    }
  }

  // Crear una notificación (útil para testing o notificaciones manuales)
  const createNotification = async (notification: Omit<Notification, 'id' | 'user_id' | 'is_read' | 'created_at'>) => {
    if (!user) return null

    try {
      const { data, error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          ...notification
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Agregar a estado local
      setNotifications((prev) => [data, ...prev])
      setUnreadCount((prev) => prev + 1)

      return data
    } catch (err: any) {
      console.error('Error creating notification:', err)
      toast.error('Error al crear notificación')
      return null
    }
  }

  // Suscribirse a nuevas notificaciones en tiempo real
  useEffect(() => {
    if (!user) return

    // Fetch inicial
    fetchNotifications()

    // Suscripción en tiempo real
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)
          
          // Mostrar toast opcional
          toast.success(`Nueva notificación: ${newNotification.title}`, {
            duration: 4000
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as Notification
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          )
          
          // Recalcular unread count
          setUnreadCount((prev) => {
            const current = notifications.filter((n) => !n.is_read).length
            return current
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const deletedId = (payload.old as any).id
          setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification
  }
}

