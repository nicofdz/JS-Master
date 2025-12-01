'use client'

import { useState } from 'react'
import { TaskRowV2 } from './TaskRowV2'
import type { TaskV2 } from '@/hooks/useTasks_v2'

type Task = TaskV2

interface TaskTableV2Props {
  tasks: Task[]
}

export function TaskTableV2({ tasks }: TaskTableV2Props) {
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null)

  const toggleExpand = (taskId: number) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId)
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">📋</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron tareas</h3>
        <p className="text-gray-500">Intenta ajustar los filtros de búsqueda</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header de la tabla */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm font-semibold text-gray-700">
          <div className="col-span-3">Tarea</div>
          <div className="col-span-2">Ubicación</div>
          <div className="col-span-2">Trabajadores</div>
          <div className="col-span-1 text-right">Presupuesto</div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-2">Fechas</div>
          <div className="col-span-1 text-center">Acciones</div>
        </div>
      </div>

      {/* Filas de tareas */}
      <div className="divide-y divide-gray-200">
        {tasks.map((task) => (
          <TaskRowV2
            key={task.id}
            task={task}
            isExpanded={expandedTaskId === task.id}
            onToggleExpand={() => toggleExpand(task.id)}
          />
        ))}
      </div>
    </div>
  )
}

