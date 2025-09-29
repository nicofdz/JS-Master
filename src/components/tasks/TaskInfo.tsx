import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { X, Building2, Home, Layers, FileText, StickyNote, Calendar, User, Clock } from 'lucide-react'
import { formatDate, getStatusColor, getStatusEmoji } from '@/lib/utils'

interface TaskInfoProps {
  task: any
  isOpen: boolean
  onClose: () => void
}

export function TaskInfo({ task, isOpen, onClose }: TaskInfoProps) {
  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <FileText className="w-5 h-5" />
            <span>Información de la Tarea</span>
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
          <div className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Tarea:</span>
                  <span className="text-gray-900">{task.task_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Proyecto:</span>
                  <span className="text-gray-900">{task.project_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Piso:</span>
                  <span className="text-gray-900">{task.floor_number}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Home className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Apartamento:</span>
                  <span className="text-gray-900">{task.apartment_number}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Estado:</span>
                  <Badge className={getStatusColor(task.status)}>
                    {getStatusEmoji(task.status)} {task.status}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Creada:</span>
                  <span className="text-gray-900">{formatDate(task.created_at)}</span>
                </div>
                {task.assigned_to && (
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Asignada a:</span>
                    <span className="text-gray-900">{task.assigned_to}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Descripción */}
            {task.task_description && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Descripción
                </h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {task.task_description}
                </p>
              </div>
            )}

            {/* Notas */}
            {task.notes && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <StickyNote className="w-4 h-4 mr-2" />
                  Notas de la Tarea
                </h4>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                  <p className="text-gray-900 whitespace-pre-wrap">{task.notes}</p>
                </div>
              </div>
            )}

            {/* Categoría y Prioridad */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {task.task_category && (
                  <div>
                    <span className="font-medium text-gray-700">Categoría:</span>
                    <Badge variant="outline" className="ml-2">
                      {task.task_category}
                    </Badge>
                  </div>
                )}
                {task.priority && (
                  <div>
                    <span className="font-medium text-gray-700">Prioridad:</span>
                    <Badge 
                      variant="outline" 
                      className={`ml-2 ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-800 border-red-200' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-green-100 text-green-800 border-green-200'
                      }`}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  )
}
