'use client'

import { useState, useEffect } from 'react'
import { ModalV2 } from '@/components/tasks-v2/ModalV2'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useApartments, useFloors } from '@/hooks'
import { useApartmentTemplates } from '@/hooks/useApartmentTemplates'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface ApartmentRow {
  id: string
  apartment_code: string
  apartment_number: string
  apartment_type: string
  area: string
  floor_area: string
  balcony_area: string
  bedrooms: string
  bathrooms: string
  notes: string
}

interface AddApartmentsModalProps {
  isOpen: boolean
  onClose: () => void
  floorId: number
  projectId: number
  onSuccess?: () => void
}

export function AddApartmentsModal({
  isOpen,
  onClose,
  floorId,
  projectId,
  onSuccess
}: AddApartmentsModalProps) {
  const { createApartment, getNextApartmentNumber } = useApartments(floorId)
  const { floors } = useFloors(projectId)
  const { templates } = useApartmentTemplates(projectId)
  const [rows, setRows] = useState<ApartmentRow[]>([{
    id: '1',
    apartment_code: '',
    apartment_number: '',
    apartment_type: 'Departamento',
    area: '0',
    floor_area: '',
    balcony_area: '',
    bedrooms: '',
    bathrooms: '',
    notes: ''
  }])
  const [submitting, setSubmitting] = useState(false)
  const [nextNumber, setNextNumber] = useState<string | null>(null)
  const [customQuantity, setCustomQuantity] = useState<number | ''>('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

  useEffect(() => {
    if (isOpen && floorId) {
      loadNextNumber()
      // Inicializar con un número sugerido
      setRows([{
        id: '1',
        apartment_code: '',
        apartment_number: '',
        apartment_type: 'Departamento',
        area: '0',
        floor_area: '',
        balcony_area: '',
        bedrooms: '',
        bathrooms: '',
        notes: ''
      }])
      setSelectedTemplateId('')
    }
  }, [isOpen, floorId])

  const loadNextNumber = async () => {
    try {
      const number = await getNextApartmentNumber(floorId)
      setNextNumber(number)
      // Si solo hay una fila vacía, sugerir el número
      if (rows.length === 1 && !rows[0].apartment_number) {
        setRows([{
          ...rows[0],
          apartment_number: number
        }])
      }
    } catch (err) {
      console.error('Error loading next apartment number:', err)
    }
  }

  const addRow = () => {
    const newId = Date.now().toString()
    const lastRow = rows[rows.length - 1]
    const lastNumber = lastRow.apartment_number

    // Intentar incrementar el número del último departamento
    let nextNum = nextNumber || '1'
    if (lastNumber) {
      const match = lastNumber.match(/(\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        nextNum = (num + 1).toString()
      }
    }

    setRows([...rows, {
      id: newId,
      apartment_code: lastRow.apartment_code || '',
      apartment_number: nextNum,
      apartment_type: lastRow.apartment_type || 'Departamento',
      area: lastRow.area || '0',
      floor_area: lastRow.floor_area || '',
      balcony_area: lastRow.balcony_area || '',
      bedrooms: lastRow.bedrooms || '',
      bathrooms: lastRow.bathrooms || '',
      notes: lastRow.notes || ''
    }])
  }

  const generateRows = (quantity: number) => {
    if (!nextNumber) {
      toast.error('Esperando calcular el siguiente número de departamento...')
      return
    }

    // Determinar el número base: usar el último número de las filas existentes o el nextNumber
    let baseNumber = parseInt(nextNumber, 10)
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1]
      const lastNumber = lastRow.apartment_number
      if (lastNumber) {
        const match = lastNumber.match(/(\d+)/)
        if (match) {
          const num = parseInt(match[1], 10)
          baseNumber = num + 1 // Continuar desde el último número + 1
        }
      }
    }

    const newRows: ApartmentRow[] = []
    const lastRow = rows.length > 0 ? rows[rows.length - 1] : null

    for (let i = 0; i < quantity; i++) {
      const apartmentNum = (baseNumber + i).toString()
      newRows.push({
        id: Date.now().toString() + i,
        apartment_code: lastRow?.apartment_code || '',
        apartment_number: apartmentNum,
        apartment_type: lastRow?.apartment_type || 'Departamento',
        area: lastRow?.area || '0',
        floor_area: lastRow?.floor_area || '',
        balcony_area: lastRow?.balcony_area || '',
        bedrooms: lastRow?.bedrooms || '',
        bathrooms: lastRow?.bathrooms || '',
        notes: lastRow?.notes || ''
      })
    }

    setRows([...rows, ...newRows])
  }

  const handleQuickAdd = (quantity: number) => {
    generateRows(quantity)
    toast.success(`${quantity} ${quantity === 1 ? 'Departamento agregado' : 'Departamentos agregados'}`)
  }

  const handleCustomAdd = () => {
    const qty = customQuantity === '' ? 0 : customQuantity
    if (qty < 1 || qty > 100) {
      toast.error('La cantidad debe estar entre 1 y 100')
      return
    }
    generateRows(qty)
    toast.success(`${qty} ${qty === 1 ? 'Departamento agregado' : 'Departamentos agregados'}`)
  }

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id))
    }
  }

  const updateRow = (id: string, field: keyof ApartmentRow, value: string) => {
    setRows(rows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ))
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)

    if (!templateId) {
      return
    }

    const template = templates.find(t => t.id === parseInt(templateId))
    if (!template) return

    // Aplicar plantilla a todas las filas
    setRows(rows.map(row => ({
      ...row,
      apartment_code: (template as any).apartment_code || '',
      apartment_type: template.apartment_type || 'Departamento',
      area: template.area?.toString() || '0',
      floor_area: template.floor_area?.toString() || '',
      balcony_area: template.balcony_area?.toString() || '',
      bedrooms: template.bedrooms?.toString() || '',
      bathrooms: template.bathrooms?.toString() || '',
      notes: template.notes || ''
    })))

    toast.success('Plantilla aplicada a todas las filas')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar que todos los números estén llenos
    const invalidRows = rows.filter(r => !r.apartment_number.trim())
    if (invalidRows.length > 0) {
      toast.error('Por favor, complete el número de Departamento en todas las filas.')
      return
    }

    try {
      setSubmitting(true)

      // Crear todos los departamentos
      for (const row of rows) {
        await createApartment({
          floor_id: floorId,
          apartment_code: row.apartment_code.trim() || null,
          apartment_number: row.apartment_number.trim(),
          apartment_type: row.apartment_type.trim() || 'Departamento',
          area: row.area ? parseFloat(row.area) : 0,
          floor_area: row.floor_area ? parseFloat(row.floor_area) : null,
          balcony_area: row.balcony_area ? parseFloat(row.balcony_area) : null,
          bedrooms: row.bedrooms ? parseInt(row.bedrooms, 10) : null,
          bathrooms: row.bathrooms ? parseInt(row.bathrooms, 10) : null,
          notes: row.notes.trim() || null,
          status: 'pending'
        })
      }

      onSuccess?.()
      onClose()
      setRows([{
        id: '1',
        apartment_code: '',
        apartment_number: '',
        apartment_type: 'Departamento',
        area: '0',
        floor_area: '',
        balcony_area: '',
        bedrooms: '',
        bathrooms: '',
        notes: ''
      }])
      setSelectedTemplateId('')
    } catch (err) {
      console.error('Error creating apartments:', err)
      toast.error('Error al crear Departamentos. Verifique que los números no estén duplicados.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title="Agregar Departamentos"
      size="xl"
      headerRight={
        <div className="flex items-center gap-2">
          <Select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="w-48 bg-slate-700 text-slate-100 border-slate-600"
          >
            <option value="">Seleccionar plantilla</option>
            {templates.map(template => (
              <option key={template.id} value={template.id.toString()}>
                {template.name}
              </option>
            ))}
          </Select>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            Puede agregar múltiples departamentos a la vez. Use los botones rápidos o el botón &quot;+ Agregar Fila&quot; para agregar más.
            {templates.length > 0 && ' Seleccione una plantilla para aplicar valores predeterminados.'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-700/50 border-b border-slate-600">
                <th className="p-2 text-left text-sm font-medium text-slate-200">Código</th>
                <th className="p-2 text-left text-sm font-medium text-slate-200">Número *</th>
                <th className="p-2 text-left text-sm font-medium text-slate-200">Tipo</th>
                <th className="p-2 text-left text-sm font-medium text-slate-200">Área (m²)</th>
                <th className="p-2 text-left text-sm font-medium text-slate-200">Área Piso</th>
                <th className="p-2 text-left text-sm font-medium text-slate-200">Área Balcón</th>
                <th className="p-2 text-left text-sm font-medium text-slate-200">Dorm.</th>
                <th className="p-2 text-left text-sm font-medium text-slate-200">Baños</th>
                <th className="p-2 text-left text-sm font-medium text-slate-200 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-b border-slate-600 hover:bg-slate-700/30">
                  <td className="p-2">
                    <Input
                      type="text"
                      value={row.apartment_code}
                      onChange={(e) => updateRow(row.id, 'apartment_code', e.target.value)}
                      placeholder="Ej: A1 D"
                      className="w-full bg-slate-700 text-slate-100 border-slate-600"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="text"
                      value={row.apartment_number}
                      onChange={(e) => updateRow(row.id, 'apartment_number', e.target.value.replace(/\D/g, ''))}
                      placeholder={index === 0 && nextNumber ? nextNumber : "Ej: 101"}
                      required
                      className="w-full bg-slate-700 text-slate-100 border-slate-600"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="text"
                      value={row.apartment_type}
                      onChange={(e) => updateRow(row.id, 'apartment_type', e.target.value)}
                      placeholder="Departamento"
                      className="w-full bg-slate-700 text-slate-100 border-slate-600"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.area}
                      onChange={(e) => updateRow(row.id, 'area', e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-700 text-slate-100 border-slate-600"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.floor_area}
                      onChange={(e) => updateRow(row.id, 'floor_area', e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-700 text-slate-100 border-slate-600"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.balcony_area}
                      onChange={(e) => updateRow(row.id, 'balcony_area', e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-700 text-slate-100 border-slate-600"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0"
                      value={row.bedrooms}
                      onChange={(e) => updateRow(row.id, 'bedrooms', e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-700 text-slate-100 border-slate-600"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0"
                      value={row.bathrooms}
                      onChange={(e) => updateRow(row.id, 'bathrooms', e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-700 text-slate-100 border-slate-600"
                    />
                  </td>
                  <td className="p-2">
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={addRow}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Fila
            </Button>

            {/* Campo personalizado */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={100}
                value={customQuantity}
                onChange={(e) => {
                  if (e.target.value === '') {
                    setCustomQuantity('')
                    return
                  }
                  const value = parseInt(e.target.value)
                  if (!isNaN(value) && value > 0 && value <= 100) {
                    setCustomQuantity(value)
                  }
                }}
                className="w-20 bg-slate-700 text-slate-100 border-slate-600"
                placeholder="Cantidad"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCustomAdd}
                disabled={!nextNumber || submitting}
                className="bg-white hover:bg-gray-50"
              >
                Agregar
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
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
              {submitting ? 'Creando...' : `Crear ${rows.length} Departamento${rows.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </form>
    </ModalV2>
  )
}

