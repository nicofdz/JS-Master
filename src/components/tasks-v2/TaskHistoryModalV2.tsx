'use client'

import { ModalV2 } from './ModalV2'
import { TaskHistoryContent } from './TaskHistoryContent'

interface TaskHistoryModalV2Props {
  isOpen: boolean
  onClose: () => void
  task?: any // TaskV2 type - placeholder
}

export function TaskHistoryModalV2({ isOpen, onClose, task }: TaskHistoryModalV2Props) {
  if (!isOpen) return null

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title="Historial de la Tarea"
      size="xl"
    >
      <TaskHistoryContent task={task} />
    </ModalV2>
  )
}

