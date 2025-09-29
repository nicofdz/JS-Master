'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { MessageSquare, Send, User, Clock, Plus, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface TaskCommentsProps {
  taskId: number
  isOpen: boolean
  onClose: () => void
}

interface Comment {
  id: number
  task_id: number
  user_id: string
  comment_text: string
  created_at: string
  updated_at: string
  user_name?: string
}

export function TaskComments({ taskId, isOpen, onClose }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && taskId) {
      fetchComments()
    }
  }, [isOpen, taskId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      console.log('🔍 Fetching comments for task:', taskId)
      
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      console.log('📊 Comments query result:', { data, error })

      if (error) {
        console.error('❌ Supabase error:', error)
        throw error
      }

      // Obtener nombres de usuarios por separado
      const processedComments = await Promise.all(
        (data || []).map(async (comment) => {
          try {
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('full_name')
              .eq('id', comment.user_id)
              .single()

            return {
              ...comment,
              user_name: userProfile?.full_name || 'Usuario'
            }
          } catch (err) {
            console.error('Error fetching user profile for comment:', err)
            return {
              ...comment,
              user_name: 'Usuario'
            }
          }
        })
      )

      console.log('✅ Processed comments:', processedComments)
      setComments(processedComments)
    } catch (error) {
      console.error('💥 Error fetching comments:', error)
      toast.error(`Error al cargar comentarios: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim()) {
      toast.error('El comentario no puede estar vacío')
      return
    }

    try {
      setSubmitting(true)
      
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Debes estar autenticado para comentar')
        return
      }

      // Obtener el nombre del usuario actual
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          comment_text: newComment.trim()
        })
        .select('*')
        .single()

      if (error) throw error

      const newCommentData = {
        ...data,
        user_name: userProfile?.full_name || 'Usuario'
      }

      setComments(prev => [...prev, newCommentData])
      setNewComment('')
      toast.success('Comentario agregado exitosamente')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Error al agregar comentario')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) return

    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      setComments(prev => prev.filter(comment => comment.id !== commentId))
      toast.success('Comentario eliminado')
    } catch (error: any) {
      console.error('Error deleting comment:', error)
      toast.error('Error al eliminar comentario')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <MessageSquare className="w-5 h-5" />
            <span>Comentarios de la Tarea</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-900 hover:text-gray-700"
          >
            ×
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Cargando comentarios...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay comentarios aún</p>
              <p className="text-sm">Sé el primero en comentar</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 mb-3">Comentarios ({comments.length})</h4>
              {comments.map((comment) => (
                <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">{comment.user_name}</span>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(comment.created_at)}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.comment_text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Formulario para nuevo comentario */}
          <form onSubmit={handleSubmitComment} className="mt-6 border-t pt-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Agregar comentario
              </label>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe tu comentario aquí..."
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="flex items-center space-x-2"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{submitting ? 'Enviando...' : 'Enviar'}</span>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
