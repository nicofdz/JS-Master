'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useFloors } from '@/hooks'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface AddFloorModalProps {
  isOpen: boolean
  onClose: () => void
  towerId: number
  projectId: number
  onSuccess?: () => void
}

export function AddFloorModal({ isOpen, onClose, towerId, projectId, onSuccess }: AddFloorModalProps) {
  const { createFloor, getNextFloorNumber, loading } = useFloors(projectId)
  const [nextNumber, setNextNumber] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createMode, setCreateMode] = useState<'single' | 'multiple'>('single')
  const [floorType, setFloorType] = useState<'normal' | 'subterranean'>('normal')
  const [quantity, setQuantity] = useState<number>(1)

  useEffect(() => {
    if (isOpen && towerId) {
      setFloorType('normal')
      loadNextNumber('normal')
      setCreateMode('single')
      setQuantity(1)
    }
  }, [isOpen, towerId])

  useEffect(() => {
    // Recargar el siguiente número cuando cambia el tipo de piso
    if (isOpen && towerId) {
      loadNextNumber(floorType)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorType])

  const loadNextNumber = async (type: 'normal' | 'subterranean' = 'normal') => {
    try {
      const number = await getNextFloorNumber(towerId, type)
      setNextNumber(number)
    } catch (err) {
      console.error('Error loading next floor number:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (createMode === 'single') {
      if (!nextNumber) {
        return
      }

      try {
        setSubmitting(true)
        await createFloor({
          project_id: projectId,
          tower_id: towerId,
          floor_number: nextNumber,
          status: 'in-progress'
        })
        
        toast.success('Piso creado exitosamente')
        onSuccess?.()
        onClose()
      } catch (err) {
        console.error('Error creating floor:', err)
        toast.error('Error al crear el piso')
      } finally {
        setSubmitting(false)
      }
    } else {
      // Modo múltiple
      if (!nextNumber || quantity < 1) {
        toast.error('Debe especificar un número de inicio y una cantidad válida')
        return
      }

      try {
        setSubmitting(true)
        const floorsToCreate = []
        
        // Usar nextNumber como base (ya calculado según el tipo)
        if (!nextNumber) {
          toast.error('No se pudo determinar el número de inicio')
          return
        }

        for (let i = 0; i < quantity; i++) {
          // Para subterráneos, restamos (ej: -1, -2, -3)
          // Para normales, sumamos (ej: 1, 2, 3)
          const floorNumber = floorType === 'subterranean' 
            ? nextNumber - i 
            : nextNumber + i
          
          floorsToCreate.push({
            project_id: projectId,
            tower_id: towerId,
            floor_number: floorNumber,
            status: 'in-progress' as const
          })
        }

        // Crear todos los pisos en una sola operación batch
        const { data, error } = await supabase
          .from('floors')
          .insert(floorsToCreate)
          .select(`
            *,
            projects!inner(name),
            towers!inner(id, tower_number, name)
          `)

        if (error) {
          throw error
        }
        
        toast.success(`${quantity} ${quantity === 1 ? 'piso creado' : 'pisos creados'} exitosamente`)
        onSuccess?.()
        onClose()
      } catch (err: any) {
        console.error('Error creating floors:', err)
        toast.error(err?.message || 'Error al crear los pisos')
      } finally {
        setSubmitting(false)
      }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agregar Piso(s)"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selector de tipo de piso */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de piso
          </label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="floorType"
                value="normal"
                checked={floorType === 'normal'}
                onChange={(e) => setFloorType(e.target.value as 'normal')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Piso Normal</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="floorType"
                value="subterranean"
                checked={floorType === 'subterranean'}
                onChange={(e) => setFloorType(e.target.value as 'subterranean')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Subterráneo</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {floorType === 'normal' 
              ? 'Pisos sobre el nivel del suelo (1, 2, 3...)'
              : 'Pisos bajo el nivel del suelo (-1, -2, -3...)'}
          </p>
        </div>

        {/* Selector de modo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modo de creación
          </label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="createMode"
                value="single"
                checked={createMode === 'single'}
                onChange={(e) => setCreateMode(e.target.value as 'single')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Un solo piso</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="createMode"
                value="multiple"
                checked={createMode === 'multiple'}
                onChange={(e) => setCreateMode(e.target.value as 'multiple')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Múltiples pisos</span>
            </label>
          </div>
        </div>

        {createMode === 'single' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Piso
            </label>
            <Input
              type="text"
              value={nextNumber !== null ? nextNumber.toString() : 'Calculando...'}
              disabled
              className="bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Número automático basado en los pisos existentes de esta torre
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de inicio
              </label>
              <Input
                type="text"
                value={nextNumber !== null ? nextNumber.toString() : 'Calculando...'}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Número automático basado en los pisos existentes de esta torre
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad de pisos
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={quantity.toString()}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  if (!isNaN(value) && value > 0 && value <= 100) {
                    setQuantity(value)
                  } else if (e.target.value === '') {
                    setQuantity(1)
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Número de pisos consecutivos a crear (máximo 100)
              </p>
            </div>

            {nextNumber !== null && quantity > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Se crearán los pisos:</strong> {
                    Array.from({ length: quantity }, (_, i) => {
                      // Para subterráneos, restamos (ej: -1, -2, -3)
                      // Para normales, sumamos (ej: 1, 2, 3)
                      return floorType === 'subterranean' 
                        ? nextNumber - i 
                        : nextNumber + i
                    }).join(', ')
                  }
                </p>
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Estado:</strong> Los pisos se crearán con estado &quot;En Progreso&quot; por defecto.
          </p>
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
            disabled={submitting || nextNumber === null || (createMode === 'multiple' && quantity < 1)}
          >
            {submitting 
              ? (createMode === 'single' ? 'Creando...' : `Creando ${quantity} pisos...`) 
              : (createMode === 'single' ? 'Crear Piso' : `Crear ${quantity} ${quantity === 1 ? 'Piso' : 'Pisos'}`)
            }
          </Button>
        </div>
      </form>
    </Modal>
  )
}

