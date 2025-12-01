'use client'

import { ModalV2 } from './ModalV2'
import { TaskMaterialsContent } from './TaskMaterialsContent'

interface TaskMaterialsModalV2Props {
  isOpen: boolean
  onClose: () => void
  task?: any // TaskV2 type - placeholder
}

export function TaskMaterialsModalV2({ isOpen, onClose, task }: TaskMaterialsModalV2Props) {
  if (!isOpen) return null

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title="Materiales de la Tarea"
      size="xl"
    >
      <TaskMaterialsContent task={task} />
    </ModalV2>
  )
}

