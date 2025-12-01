'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useApartments } from '@/hooks'

interface EditApartmentModalProps {
  isOpen: boolean
  onClose: () => void
  apartmentId: number
  currentData: {
    apartment_number: string
    apartment_type?: string | null
    area?: number | null
    bedrooms?: number | null
    bathrooms?: number | null
  }
  onSuccess?: () => void
}

export function EditApartmentModal({ 
  isOpen, 
  onClose, 
  apartmentId, 
  currentData,
  onSuccess 
}: EditApartmentModalProps) {
  const { updateApartment, loading } = useApartments()
  const [apartmentNumber, setApartmentNumber] = useState('')
  const [apartmentType, setApartmentType] = useState('')
  const [area, setArea] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setApartmentNumber(currentData.apartment_number || '')
      setApartmentType(currentData.apartment_type || '')
      setArea(currentData.area?.toString() || '')
      setBedrooms(currentData.bedrooms?.toString() || '')
      setBathrooms(currentData.bathrooms?.toString() || '')
    }
  }, [isOpen, currentData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      await updateApartment(apartmentId, {
        apartment_number: apartmentNumber.trim(),
        apartment_type: apartmentType.trim() || null,
        area: area ? parseFloat(area) : null,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
        bathrooms: bathrooms ? parseInt(bathrooms, 10) : null
      })
      
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error updating apartment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Departamento"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de Departamento *
          </label>
          <Input
            type="text"
            value={apartmentNumber}
            onChange={(e) => setApartmentNumber(e.target.value)}
            required
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Departamento <span className="text-gray-400">(opcional)</span>
          </label>
          <Input
            type="text"
            value={apartmentType}
            onChange={(e) => setApartmentType(e.target.value)}
            placeholder="Ej: 3D+2B, departamento"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Área (m²) <span className="text-gray-400">(opcional)</span>
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dormitorios <span className="text-gray-400">(opcional)</span>
            </label>
            <Input
              type="number"
              min="0"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Baños <span className="text-gray-400">(opcional)</span>
            </label>
            <Input
              type="number"
              min="0"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              placeholder="0"
            />
          </div>
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

