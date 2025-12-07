'use client'

import { useState, useEffect } from 'react'
import { ModalV2 } from '@/components/tasks-v2/ModalV2'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useApartments, useFloors } from '@/hooks'
import { useApartmentTemplates } from '@/hooks/useApartmentTemplates'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface AddApartmentsToAllFloorsModalProps {
  isOpen: boolean
  onClose: () => void
  towerId: number
  projectId: number
  onSuccess?: () => void
}

interface FloorApartments {
  floorId: number
  apartmentNumbers: string[]
}

export function AddApartmentsToAllFloorsModal({
  isOpen,
  onClose,
  towerId,
  projectId,
  onSuccess
}: AddApartmentsToAllFloorsModalProps) {
  const { createApartment } = useApartments(undefined)
  const { floors } = useFloors(projectId)
  const { templates } = useApartmentTemplates(projectId)
  const [submitting, setSubmitting] = useState(false)
  const [quantity, setQuantity] = useState<number | ''>('')
  const [apartmentCode, setApartmentCode] = useState<string>('')
  const [apartmentType, setApartmentType] = useState<string>('Departamento')
  const [area, setArea] = useState<string>('0')
  const [floorArea, setFloorArea] = useState<string>('')
  const [balconyArea, setBalconyArea] = useState<string>('')
  const [bedrooms, setBedrooms] = useState<string>('')
  const [bathrooms, setBathrooms] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [existingApartments, setExistingApartments] = useState<FloorApartments[]>([])
  const [loadingApartments, setLoadingApartments] = useState(false)

  // Obtener todos los pisos de la torre
  const towerFloors = floors.filter(f => f.tower_id === towerId && f.is_active).sort((a, b) => a.floor_number - b.floor_number)

  // Cargar departamentos existentes por piso
  useEffect(() => {
    if (isOpen && towerId && towerFloors.length > 0) {
      loadExistingApartments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, towerId, towerFloors.length])

  useEffect(() => {
    if (isOpen && towerId) {
      setQuantity('')
      setApartmentCode('')
      setApartmentType('Departamento')
      setArea('0')
      setFloorArea('')
      setBalconyArea('')
      setBedrooms('')
      setBathrooms('')
      setNotes('')
      setSelectedTemplateId('')
    }
  }, [isOpen, towerId])

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)

    if (!templateId) {
      return
    }

    const template = templates.find(t => t.id === parseInt(templateId))
    if (!template) return

    // Aplicar plantilla a los campos comunes
    setApartmentCode((template as any).apartment_code || '')
    setApartmentType(template.apartment_type || 'Departamento')
    setArea(template.area?.toString() || '0')
    setFloorArea(template.floor_area?.toString() || '')
    setBalconyArea(template.balcony_area?.toString() || '')
    setBedrooms(template.bedrooms?.toString() || '')
    setBathrooms(template.bathrooms?.toString() || '')
    setNotes(template.notes || '')

    toast.success('Plantilla aplicada')
  }

  const loadExistingApartments = async () => {
    if (towerFloors.length === 0) return

    try {
      setLoadingApartments(true)
      const floorIds = towerFloors.map(f => f.id)

      const { data, error } = await supabase
        .from('apartments')
        .select('id, floor_id, apartment_number')
        .in('floor_id', floorIds)
        .eq('is_active', true)
        .order('apartment_number', { ascending: true })

      if (error) throw error

      // Agrupar por floor_id
      const grouped: Record<number, string[]> = {}
      towerFloors.forEach(floor => {
        grouped[floor.id] = []
      })

      if (data) {
        data.forEach(apt => {
          if (grouped[apt.floor_id]) {
            grouped[apt.floor_id].push(apt.apartment_number)
          }
        })
      }

      // Convertir a array
      const floorApartments: FloorApartments[] = towerFloors.map(floor => ({
        floorId: floor.id,
        apartmentNumbers: grouped[floor.id] || []
      }))

      setExistingApartments(floorApartments)
    } catch (err) {
      console.error('Error loading existing apartments:', err)
    } finally {
      setLoadingApartments(false)
    }
  }

  // Extraer el número de secuencia de un código de departamento
  // Maneja formatos como: "101", "F3X D-101", "A1 D-104", "BO D-108", "LC 120"
  // IMPORTANTE: Siempre extrae solo la parte de secuencia relativa al piso
  // - "101" en piso 1 → extrae 01 (no 101)
  // - "110" en piso 1 → extrae 10 (no 110)
  // - "A1 D-110" en piso 1 → extrae 10 (asumiendo que 110 = piso 1 + secuencia 10)
  const extractSequenceNumber = (apartmentNumber: string, floorNumber: number): number => {
    const floorPrefix = floorNumber < 0 ? `S${Math.abs(floorNumber)}` : String(floorNumber)
    const trimmed = apartmentNumber.trim()

    // Si el número empieza con el prefijo del piso (ej: "101" en piso 1, "110" en piso 1)
    if (trimmed.startsWith(floorPrefix)) {
      // Extraer solo la parte de secuencia después del prefijo
      const sequencePart = trimmed.substring(floorPrefix.length)
      const sequenceNum = parseInt(sequencePart, 10)
      if (!isNaN(sequenceNum)) {
        return sequenceNum // Retorna solo la parte de secuencia (01, 02, 10, etc.)
      }
    }

    // Si no empieza con el prefijo del piso, es un código personalizado
    // Busca el patrón de número después de un guión o espacio
    // Ejemplos: "F3X D-101" -> extrae 101, luego verifica si tiene prefijo del piso
    const match = trimmed.match(/[-\s](\d+)$/)
    if (match && match[1]) {
      const extractedNum = parseInt(match[1], 10)
      // Si el número extraído es >= 100, verificar si empieza con el prefijo del piso
      // Si es así, extraer solo la parte de secuencia
      const extractedStr = extractedNum.toString()
      if (extractedNum >= 100 && extractedStr.startsWith(floorPrefix)) {
        const sequencePart = extractedStr.substring(floorPrefix.length)
        const sequenceNum = parseInt(sequencePart, 10)
        return isNaN(sequenceNum) ? extractedNum : sequenceNum
      }
      // Si el número es < 100, usarlo directamente como secuencia
      // Si es >= 100 pero no empieza con el prefijo, también usarlo directamente
      return extractedNum
    }

    // Si no encuentra patrón con guión/espacio, intenta extraer el último número
    const numbers = trimmed.match(/\d+/g)
    if (numbers && numbers.length > 0) {
      const lastNum = parseInt(numbers[numbers.length - 1], 10)
      // Si el número es >= 100 y empieza con el prefijo del piso, extraer solo la secuencia
      const lastNumStr = lastNum.toString()
      if (lastNum >= 100 && lastNumStr.startsWith(floorPrefix)) {
        const sequencePart = lastNumStr.substring(floorPrefix.length)
        const sequenceNum = parseInt(sequencePart, 10)
        return isNaN(sequenceNum) ? lastNum : sequenceNum
      }
      // Si es < 100 o no empieza con el prefijo, usarlo directamente
      return lastNum
    }

    return 0
  }

  // Obtener el siguiente número disponible para un piso
  // Extrae la secuencia más alta y continúa con formato simple {piso}{número}
  const getNextApartmentNumber = (floorId: number, floorNumber: number): number => {
    const floorData = existingApartments.find(fa => fa.floorId === floorId)
    const existingNumbers = floorData?.apartmentNumbers || []

    if (existingNumbers.length === 0) {
      return 1 // Si no hay departamentos, empezar desde 1
    }

    // Buscar el número de secuencia más alto
    // Para números con prefijo del piso, extrae solo la parte de secuencia
    // Para números con código, extrae el número completo
    let maxSequence = 0
    existingNumbers.forEach(num => {
      const sequenceNum = extractSequenceNumber(num, floorNumber)
      if (sequenceNum > maxSequence) {
        maxSequence = sequenceNum
      }
    })

    return maxSequence + 1
  }

  // Generar números de departamentos, continuando la secuencia existente
  // Siempre usa formato simple {piso}{número}, sin importar el formato de los existentes
  const generateApartmentNumbers = (floorId: number, floorNumber: number, quantity: number): string[] => {
    const numbers: string[] = []
    const floorPrefix = floorNumber < 0 ? `S${Math.abs(floorNumber)}` : String(floorNumber)

    // Obtener el siguiente número disponible (extrae el número más alto de cualquier formato)
    const startNumber = getNextApartmentNumber(floorId, floorNumber)

    for (let i = 0; i < quantity; i++) {
      const sequenceNumber = startNumber + i
      // Formato simple: {piso}{número} (ej: 101, 102, 103 para piso 1 | S101, S102 para piso -1)
      const apartmentNumber = `${floorPrefix}${String(sequenceNumber).padStart(2, '0')}`
      numbers.push(apartmentNumber)
    }
    return numbers
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (towerFloors.length === 0) {
      toast.error('No hay pisos en esta torre')
      return
    }

    const qty = quantity === '' ? 0 : quantity
    if (qty < 1 || qty > 100) {
      toast.error('La cantidad debe estar entre 1 y 100')
      return
    }

    try {
      setSubmitting(true)

      // Crear departamentos en todos los pisos
      for (const floor of towerFloors) {
        // Generar números de departamentos para este piso, continuando la secuencia
        const apartmentNumbers = generateApartmentNumbers(floor.id, floor.floor_number, qty)

        for (const apartmentNumber of apartmentNumbers) {
          await createApartment({
            floor_id: floor.id,
            apartment_code: apartmentCode.trim() || null,
            apartment_number: apartmentNumber,
            apartment_type: apartmentType.trim() || 'Departamento',
            area: area ? parseFloat(area) : 0,
            floor_area: floorArea ? parseFloat(floorArea) : null,
            balcony_area: balconyArea ? parseFloat(balconyArea) : null,
            bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
            bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
            notes: notes.trim() || null,
            status: 'pending'
          })
        }
      }

      toast.success(`${qty} ${qty === 1 ? 'departamento' : 'departamentos'} agregados a ${towerFloors.length} ${towerFloors.length === 1 ? 'piso' : 'pisos'}`)
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error creating apartments:', err)
      toast.error('Error al crear departamentos. Verifique que los números no estén duplicados.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title="Agregar Departamentos a Todos los Pisos"
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
            Se crearán departamentos en todos los pisos de esta torre ({towerFloors.length} {towerFloors.length === 1 ? 'piso' : 'pisos'}).
            Los números se generarán automáticamente con el prefijo del piso (ej: Piso 1 → 101, 102, 103... | Piso 2 → 201, 202, 203...).
            {templates.length > 0 && ' Seleccione una plantilla para aplicar valores predeterminados.'}
          </p>
        </div>

        {/* Cantidad de departamentos por piso */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cantidad de Departamentos por piso *
          </label>
          <Input
            type="number"
            min={1}
            max={100}
            value={quantity}
            onChange={(e) => {
              if (e.target.value === '') {
                setQuantity('')
                return
              }
              const value = parseInt(e.target.value)
              if (!isNaN(value) && value > 0 && value <= 100) {
                setQuantity(value)
              }
            }}
            required
            className="bg-slate-700 text-slate-100 border-slate-600"
            placeholder="Ej: 3"
          />
          <p className="text-xs text-gray-500 mt-1">
            Número de Departamentos que se crearán en cada piso (1-100)
          </p>
        </div>

        {/* Configuración común para todos los departamentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Código de Departamento
            </label>
            <Input
              type="text"
              value={apartmentCode}
              onChange={(e) => setApartmentCode(e.target.value)}
              placeholder="Ej: A1 D"
              className="bg-slate-700 text-slate-100 border-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Tipo de Departamento
            </label>
            <Input
              type="text"
              value={apartmentType}
              onChange={(e) => setApartmentType(e.target.value)}
              placeholder="Departamento"
              className="bg-slate-700 text-slate-100 border-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Área (m²)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="0"
              className="bg-slate-700 text-slate-100 border-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Área del Piso (m²)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={floorArea}
              onChange={(e) => setFloorArea(e.target.value)}
              placeholder="0"
              className="bg-slate-700 text-slate-100 border-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Área del Balcón (m²)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={balconyArea}
              onChange={(e) => setBalconyArea(e.target.value)}
              placeholder="0"
              className="bg-slate-700 text-slate-100 border-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Dormitorios
            </label>
            <Input
              type="number"
              min="0"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              placeholder="0"
              className="bg-slate-700 text-slate-100 border-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Baños
            </label>
            <Input
              type="number"
              min="0"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              placeholder="0"
              className="bg-slate-700 text-slate-100 border-slate-600"
            />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Notas
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas adicionales..."
            rows={3}
            className="bg-slate-700 text-slate-100 border-slate-600"
          />
        </div>

        {/* Vista previa */}
        {towerFloors.length > 0 && typeof quantity === 'number' && quantity > 0 && (
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-200 mb-3">Vista previa de departamentos a crear:</h4>
            {loadingApartments ? (
              <p className="text-sm text-slate-400">Cargando departamentos existentes...</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {towerFloors.map(floor => {
                  const existing = existingApartments.find(fa => fa.floorId === floor.id)
                  const existingNumbers = existing?.apartmentNumbers || []
                  const newApartmentNumbers = generateApartmentNumbers(floor.id, floor.floor_number, quantity)

                  return (
                    <div key={floor.id} className="text-sm">
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-slate-300 min-w-[60px]">Piso {floor.floor_number}:</span>
                        <div className="flex-1">
                          {/* Departamentos existentes (sutil) */}
                          {existingNumbers.length > 0 && (
                            <div className="mb-1">
                              <span className="text-xs text-slate-500 italic">
                                Existentes: {existingNumbers.join(', ')}
                              </span>
                            </div>
                          )}
                          {/* Nuevos departamentos */}
                          <div>
                            <span className="text-slate-200 font-medium">
                              Nuevos: {newApartmentNumbers.join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-3">
              Total: {(typeof quantity === 'number' ? quantity : 0) * towerFloors.length} departamentos en {towerFloors.length} {towerFloors.length === 1 ? 'piso' : 'pisos'}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-600">
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
            disabled={submitting || towerFloors.length === 0 || quantity === '' || quantity < 1}
          >
            {submitting
              ? 'Creando...'
              : `Crear ${(typeof quantity === 'number' ? quantity : 0) * towerFloors.length} Departamento${(typeof quantity === 'number' ? quantity : 0) * towerFloors.length > 1 ? 's' : ''}`
            }
          </Button>
        </div>
      </form>
    </ModalV2>
  )
}

