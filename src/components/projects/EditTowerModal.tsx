'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useTowers } from '@/hooks'

interface EditTowerModalProps {
  isOpen: boolean
  onClose: () => void
  towerId: number
  currentName?: string
  onSuccess?: () => void
}

export function EditTowerModal({ isOpen, onClose, towerId, currentName = '', onSuccess }: EditTowerModalProps) {
  const { updateTower, loading } = useTowers()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName(currentName)
    }
  }, [isOpen, currentName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      await updateTower(towerId, {
        name: name.trim() || undefined
      })
      
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error updating tower:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Torre"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la Torre
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Torre Norte, Torre A"
            maxLength={255}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

