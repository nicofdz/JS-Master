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
        return 'bg-emerald-900/30 text-emerald-400 border border-emerald-600/50'
      case 'prestada':
        return 'bg-orange-900/30 text-orange-400 border border-orange-600/50'
      case 'mantenimiento':
        return 'bg-yellow-900/30 text-yellow-400 border border-yellow-600/50'
      case 'perdida':
        return 'bg-red-900/30 text-red-400 border border-red-600/50'
      default:
        return 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
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
    return isActive
      ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-600/50'
      : 'bg-red-900/30 text-red-400 border border-red-600/50'
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
        <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <Hand className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-200 mb-2">No hay herramientas</h3>
        <p className="text-slate-400">Comienza agregando una nueva herramienta al inventario.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tools.map((tool) => (
        <Card key={tool.id} className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800/80 transition-all duration-200 ${!tool.is_active ? 'opacity-60' : ''}`}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-slate-100 mr-2">
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
                    <p className="text-sm font-medium text-slate-400">Marca</p>
                    <p className="text-sm text-slate-200">{tool.brand}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-400">Valor</p>
                    <p className="text-sm text-slate-200 font-semibold">
                      {formatCurrency(tool.value)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-400">Ubicación</p>
                    <p className="text-sm text-slate-200">{tool.location}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-400 mb-1">Detalles</p>
                  <p className="text-sm text-slate-300 line-clamp-2">
                    {tool.details}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 sm:mt-0 sm:ml-4 sm:flex-nowrap justify-end w-full sm:w-auto">
                <Button
                  onClick={() => onEdit(tool)}
                  size="sm"
                  className="bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 border border-blue-800/50 flex-1 sm:flex-none"
                >
                  <Edit className="w-4 h-4 sm:mr-1" />
                  <span className="sm:hidden">Editar</span>
                </Button>

                {tool.is_active ? (
                  <Button
                    onClick={() => onDelete(tool.id)}
                    size="sm"
                    className="bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-800/50 flex-1 sm:flex-none"
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
