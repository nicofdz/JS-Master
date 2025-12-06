'use client'

import { Edit, Trash2, Hand, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Tool {
  id: number
  name: string
  brand: string
  status: string
  value: number
  location: string
  details: string
  is_active: boolean
}

interface ToolListProps {
  tools: Tool[]
  onEdit: (tool: Tool) => void
  onDelete: (toolId: number) => void
  onReactivate: (toolId: number) => void
  onLoan: (toolId: number) => void
}

export function ToolList({ tools, onEdit, onDelete, onReactivate, onLoan }: ToolListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponible':
        return 'bg-green-100 text-green-800'
      case 'prestada':
        return 'bg-orange-100 text-orange-800'
      case 'mantenimiento':
        return 'bg-yellow-100 text-yellow-800'
      case 'perdida':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'disponible':
        return 'Disponible'
      case 'prestada':
        return 'Prestada'
      case 'mantenimiento':
        return 'En Mantenimiento'
      case 'perdida':
        return 'Perdida'
      default:
        return status
    }
  }

  const getActiveStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const getActiveStatusText = (isActive: boolean) => {
    return isActive ? 'Activa' : 'Inactiva'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value)
  }

  if (tools.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Hand className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay herramientas</h3>
        <p className="text-gray-500">Comienza agregando una nueva herramienta al inventario.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tools.map((tool) => (
        <Card key={tool.id} className={`hover:shadow-md transition-shadow ${!tool.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {tool.name}
                  </h3>
                  <Badge className={getStatusColor(tool.status)}>
                    {getStatusText(tool.status)}
                  </Badge>
                  <Badge className={getActiveStatusColor(tool.is_active)}>
                    {getActiveStatusText(tool.is_active)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Marca</p>
                    <p className="text-sm text-gray-900">{tool.brand}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">Valor</p>
                    <p className="text-sm text-gray-900 font-semibold">
                      {formatCurrency(tool.value)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">Ubicación</p>
                    <p className="text-sm text-gray-900">{tool.location}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Detalles</p>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {tool.details}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 sm:mt-0 sm:ml-4 sm:flex-nowrap justify-end w-full sm:w-auto">
                <Button
                  onClick={() => onEdit(tool)}
                  size="sm"
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 flex-1 sm:flex-none"
                >
                  <Edit className="w-4 h-4 sm:mr-1" />
                  <span className="sm:hidden">Editar</span>
                </Button>

                {tool.is_active ? (
                  <Button
                    onClick={() => onDelete(tool.id)}
                    size="sm"
                    className="bg-red-100 hover:bg-red-200 text-red-700 flex-1 sm:flex-none"
                    title="Deshabilitar herramienta"
                  >
                    <Trash2 className="w-4 h-4 sm:mr-1" />
                    <span className="sm:hidden">Borrar</span>
                  </Button>
                ) : (
                  <Button
                    onClick={() => onReactivate(tool.id)}
                    size="sm"
                    className="bg-green-100 hover:bg-green-200 text-green-700 flex-1 sm:flex-none"
                    title="Reactivar herramienta"
                  >
                    <Eye className="w-4 h-4 sm:mr-1" />
                    <span className="sm:hidden">Reactivar</span>
                  </Button>
                )}

                {tool.status === 'disponible' && tool.is_active && (
                  <Button
                    onClick={() => onLoan(tool.id)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  >
                    <Hand className="w-4 h-4 mr-1" />
                    Prestar
                  </Button>
                )}

                {tool.status === 'prestada' && (
                  <Button
                    onClick={() => onLoan(tool.id)}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver Préstamo
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
