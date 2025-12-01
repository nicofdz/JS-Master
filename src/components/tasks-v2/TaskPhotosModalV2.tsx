'use client'

import { ModalV2 } from './ModalV2'
import { TaskPhotosContent } from './TaskPhotosContent'

interface TaskPhotosModalV2Props {
  isOpen: boolean
  onClose: () => void
  task?: any // TaskV2 type - placeholder
}

export function TaskPhotosModalV2({ isOpen, onClose, task }: TaskPhotosModalV2Props) {
  if (!isOpen) return null

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title="Fotos de Progreso"
      size="xl"
    >
      <TaskPhotosContent task={task} />
    </ModalV2>
  )
}

