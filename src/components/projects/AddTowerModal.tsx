'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useTowers } from '@/hooks'

interface AddTowerModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: number
  onSuccess?: () => void
}

export function AddTowerModal({ isOpen, onClose, projectId, onSuccess }: AddTowerModalProps) {
  const { createTower, getNextTowerNumber, loading } = useTowers(projectId)
  const [name, setName] = useState('')
  const [nextNumber, setNextNumber] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && projectId) {
      loadNextNumber()
      setName('')
    }
  }, [isOpen, projectId])

  const loadNextNumber = async () => {
    try {
      const number = await getNextTowerNumber(projectId)
      setNextNumber(number)
    } catch (err) {
      console.error('Error loading next tower number:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nextNumber) {
      return
    }

    try {
      setSubmitting(true)
      await createTower({
        project_id: projectId,
        tower_number: nextNumber,
        name: name.trim() || undefined
      })
      
      onSuccess?.()
      onClose()
      setName('')
    } catch (err) {
      console.error('Error creating tower:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agregar Torre"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de Torre
          </label>
          <Input
            type="text"
            value={nextNumber !== null ? nextNumber.toString() : 'Calculando...'}
            disabled
            className="bg-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            Número automático basado en las torres existentes
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la Torre <span className="text-gray-400">(opcional)</span>
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
            disabled={submitting || nextNumber === null}
          >
            {submitting ? 'Creando...' : 'Crear Torre'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

