'use client'

import { useState } from 'react'
import { X, Hand, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'

interface Tool {
  id: number
  name: string
  brand: string
  status: string
  value: number
  location: string
  details: string
  image_url?: string | null
}

interface LoanModalProps {
  tool: Tool
  workers: Array<{ id: number; full_name: string }>
  users: Array<{ id: string; full_name: string }>
  projects: Array<{ id: number; name: string }>
  currentUserId: string
  onClose: () => void
  onLoan: (borrowerId: number, lenderId: string, projectId?: number) => void
  onReturn?: (loanId: number, returnDetails: string) => void | Promise<void>
  activeLoanId?: number
}

export function LoanModal({ tool, workers, users, projects, currentUserId, onClose, onLoan, onReturn, activeLoanId }: LoanModalProps) {
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<number | ''>('')
  const [selectedLenderId, setSelectedLenderId] = useState<string>(currentUserId)
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('')
  const [returnDetails, setReturnDetails] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isLoaned = tool.status === 'prestada'

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!isLoaned) {
      if (!selectedBorrowerId) {
        newErrors.borrowerId = 'Debe seleccionar un trabajador'
      }
      if (!selectedLenderId) {
        newErrors.lenderId = 'Debe seleccionar un prestador'
      }
    } else {
      if (!returnDetails.trim()) {
        newErrors.returnDetails = 'Los detalles de devolución son requeridos'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      if (isLoaned && activeLoanId) {
        onReturn?.(activeLoanId, returnDetails)
      } else {
        const projectId = selectedProjectId === '' ? undefined : selectedProjectId as number
        onLoan(selectedBorrowerId as number, selectedLenderId, projectId)
      }
    }
  }

  const handleChange = (field: string, value: string | number) => {
    if (field === 'borrowerId') setSelectedBorrowerId(value as number)
    if (field === 'lenderId') setSelectedLenderId(value as string)
    if (field === 'projectId') setSelectedProjectId(value as number)
    if (field === 'returnDetails') setReturnDetails(value as string)

    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isLoaned ? 'Devolver Herramienta' : 'Prestar Herramienta'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Información de la herramienta */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 flex gap-4">
            {/* Tool Image */}
            <div className="w-20 h-20 bg-white rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
              {tool.image_url ? (
                <img
                  src={tool.image_url}
                  alt={tool.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Hand className="w-8 h-8 opacity-20" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-2">{tool.name}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Marca:</span> {tool.brand}
                </div>
                <div>
                  <span className="font-medium">Valor:</span> ${tool.value.toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Estado:</span>
                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${tool.status === 'prestada'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-green-100 text-green-800'
                    }`}>
                    {tool.status === 'prestada' ? 'Prestada' : 'Disponible'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Ubicación:</span> {tool.location}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoaned ? (
              // Formulario para prestar
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    A quien se le presta *
                  </label>
                  <Select
                    value={selectedBorrowerId}
                    onChange={(e) => handleChange('borrowerId', parseInt(e.target.value))}
                    className={errors.borrowerId ? 'border-red-500' : ''}
                  >
                    <option value="">Seleccionar trabajador...</option>
                    {workers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.full_name}
                      </option>
                    ))}
                  </Select>
                  {errors.borrowerId && (
                    <p className="mt-1 text-sm text-red-600">{errors.borrowerId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quien presta la herramienta *
                  </label>
                  <Select
                    value={selectedLenderId}
                    onChange={(e) => handleChange('lenderId', e.target.value)}
                    className={errors.lenderId ? 'border-red-500' : ''}
                  >
                    <option value="">Seleccionar usuario...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </Select>
                  {errors.lenderId && (
                    <p className="mt-1 text-sm text-red-600">{errors.lenderId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proyecto/Obra (Opcional)
                  </label>
                  <Select
                    value={selectedProjectId}
                    onChange={(e) => handleChange('projectId', e.target.value === '' ? '' : parseInt(e.target.value))}
                  >
                    <option value="">Sin proyecto específico</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            ) : (
              // Formulario para devolver
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Hand className="w-5 h-5 text-orange-600 mr-2" />
                    <p className="text-sm text-orange-800">
                      Esta herramienta está actualmente prestada. Completa los detalles de devolución.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detalles de Devolución *
                  </label>
                  <Textarea
                    value={returnDetails}
                    onChange={(e) => handleChange('returnDetails', e.target.value)}
                    placeholder="Describe el estado de la herramienta al devolverla, cualquier daño, accesorios faltantes, etc."
                    rows={3}
                    className={errors.returnDetails ? 'border-red-500' : ''}
                  />
                  {errors.returnDetails && (
                    <p className="mt-1 text-sm text-red-600">{errors.returnDetails}</p>
                  )}
                </div>
              </>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className={`px-4 py-2 text-white ${isLoaned
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                {isLoaned ? (
                  <>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Devolver
                  </>
                ) : (
                  <>
                    <Hand className="w-4 h-4 mr-2" />
                    Prestar
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  )
}
