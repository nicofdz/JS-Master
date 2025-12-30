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
import { Copy, Trash2, Settings } from 'lucide-react'
import { ApartmentTemplatesModal } from '@/components/apartments/ApartmentTemplatesModal'

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

interface VerticalConfig {
  id: number
  suffix: string
  templateId: string
  apartmentCode: string
  apartmentType: string
  area: string
  floorArea: string
  balconyArea: string
  bedrooms: string
  bathrooms: string
  notes: string
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
  const { templates, refresh: refreshTemplates } = useApartmentTemplates(projectId)
  const [submitting, setSubmitting] = useState(false)
  const [quantity, setQuantity] = useState<number | ''>('')

  // Estado para la configuración de cada vertical/columna
  const [verticals, setVerticals] = useState<VerticalConfig[]>([])
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)

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
      setVerticals([])
      refreshTemplates() // Refresh templates when opening modal
    }
  }, [isOpen, towerId])

  // Actualizar verticales cuando cambia la cantidad
  useEffect(() => {
    if (quantity === '' || quantity === 0) {
      setVerticals([])
      return
    }

    setVerticals(prev => {
      const newVerticals: VerticalConfig[] = []
      for (let i = 0; i < quantity; i++) {
        // Mantener configuración existente si existe, o crear nueva
        if (prev[i]) {
          newVerticals.push(prev[i])
        } else {
          const params = {
            id: i,
            suffix: (i + 1).toString().padStart(2, '0'), // 01, 02, 03...
            templateId: '',
            apartmentCode: '',
            apartmentType: 'Departamento',
            area: '',
            floorArea: '',
            balconyArea: '',
            bedrooms: '',
            bathrooms: '',
            notes: ''
          }
          newVerticals.push(params)
        }
      }
      return newVerticals
    })
  }, [quantity])

  const handleVerticalChange = (index: number, field: keyof VerticalConfig, value: string) => {
    setVerticals(prev => {
      const newVerts = [...prev]
      newVerts[index] = { ...newVerts[index], [field]: value }
      return newVerts
    })
  }

  const handleTemplateSelect = (index: number, templateId: string) => {
    if (!templateId) {
      handleVerticalChange(index, 'templateId', '')
      return
    }

    const template = templates.find(t => t.id === parseInt(templateId))
    if (!template) return

    setVerticals(prev => {
      const newVerts = [...prev]
      newVerts[index] = {
        ...newVerts[index],
        templateId,
        // Si la plantilla tiene un código base, asumimos que puede querer usarlo
        // pero generalmente el código depende del piso.
        // Si el template tiene "TYPE-A-{piso}", lo usamos tal cual.
        apartmentCode: (template as any).apartment_code || '',
        apartmentType: template.apartment_type || 'Departamento',
        area: template.area?.toString() || '',
        floorArea: template.floor_area?.toString() || '',
        balconyArea: template.balcony_area?.toString() || '',
        bedrooms: template.bedrooms?.toString() || '',
        bathrooms: template.bathrooms?.toString() || '',
        notes: template.notes || ''
      }
      return newVerts
    })
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

  const duplicateVertical = (index: number) => {
    // Copiar la configuración de la vertical anterior a todas las siguientes
    const source = verticals[index]
    setVerticals(prev => prev.map((v, i) => {
      if (i <= index) return v
      return {
        ...v,
        templateId: source.templateId,
        apartmentCode: source.apartmentCode,
        apartmentType: source.apartmentType,
        area: source.area,
        floorArea: source.floorArea,
        balconyArea: source.balconyArea,
        bedrooms: source.bedrooms,
        bathrooms: source.bathrooms,
        notes: source.notes
      }
    }))
    toast.success('Configuración copiada a las siguientes columnas')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (towerFloors.length === 0) {
      toast.error('No hay pisos en esta torre')
      return
    }

    if (verticals.length === 0) {
      toast.error('Debe configurar al menos un departamento por piso')
      return
    }

    try {
      setSubmitting(true)

      // Crear departamentos en todos los pisos
      for (const floor of towerFloors) {
        const floorPrefix = floor.floor_number < 0 ? `S${Math.abs(floor.floor_number)}` : String(floor.floor_number)

        // Iterar sobre cada configuración vertical
        for (const vertical of verticals) {
          // Generar número: prefijo piso + sufijo configurado
          // Ej: Piso 1 + Sufijo 01 -> 101
          const apartmentNumber = `${floorPrefix}${vertical.suffix}`

          // Generar código: reemplazar {piso} por número de piso
          let finalCode = null
          if (vertical.apartmentCode && vertical.apartmentCode.trim() !== '') {
            finalCode = vertical.apartmentCode
              .replace(/{piso}/gi, String(floor.floor_number))
              .replace(/{torre}/gi, String(towerId)) // Opcional, si queremos soportar torre
          }

          await createApartment({
            floor_id: floor.id,
            apartment_code: finalCode,
            apartment_number: apartmentNumber,
            apartment_type: vertical.apartmentType.trim() || 'Departamento',
            area: vertical.area ? parseFloat(vertical.area) : 0,
            floor_area: vertical.floorArea ? parseFloat(vertical.floorArea) : null,
            balcony_area: vertical.balconyArea ? parseFloat(vertical.balconyArea) : null,
            bedrooms: vertical.bedrooms ? parseInt(vertical.bedrooms, 10) : null,
            bathrooms: vertical.bathrooms ? parseInt(vertical.bathrooms, 10) : null,
            notes: vertical.notes.trim() || null,
            status: 'pending'
          })
        }
      }

      const totalCreated = verticals.length * towerFloors.length
      toast.success(`${totalCreated} departamentos creados exitosamente`)
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
    <>
      <ModalV2
        isOpen={isOpen}
        onClose={onClose}
        title="Configuración Avanzada de Departamentos"
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-200">
              Configure las columnas ("verticales") de su edificio.
              Se crearán <strong>{towerFloors.length} pisos</strong> con la configuración que defina aquí.
            </p>
          </div>

          {/* Cantidad de departamentos por piso */}
          <div className="flex items-center gap-4">
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Deptos. por piso
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={quantity}
                onChange={(e) => {
                  if (e.target.value === '') {
                    setQuantity('')
                    return
                  }
                  const value = parseInt(e.target.value)
                  if (!isNaN(value) && value > 0 && value <= 20) {
                    setQuantity(value)
                  }
                }}
                required
                className="bg-slate-800 text-slate-100 border-slate-600"
                placeholder="Ej: 4"
              />
            </div>
            <div className="flex-1 flex justify-between items-end">
              <div className="text-sm text-gray-400 mb-2">
                Ingresa cuántos departamentos hay en cada planta.
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTemplatesModal(true)}
                className="text-blue-400 hover:text-blue-300 border-blue-500/30 hover:bg-blue-500/10"
              >
                <Settings className="w-4 h-4 mr-2" />
                Gestionar Plantillas
              </Button>
            </div>
          </div>

          {/* Grilla de configuración */}
          {verticals.length > 0 && (
            <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden flex flex-col max-h-[60vh]">
              {/* Header Fijo */}
              <div className="bg-slate-800 p-3 grid grid-cols-[40px_80px_1fr_1fr] gap-3 font-semibold text-sm text-slate-300 border-b border-slate-700 sticky top-0 z-10 shadow-md">
                <div className="text-center">#</div>
                <div>Sufijo</div>
                <div>Plantilla</div>
                <div>Detalles</div>
              </div>

              {/* Cuerpo con Scroll */}
              <div className="overflow-y-auto p-2 space-y-3 bg-slate-900/50">
                {verticals.map((vertical, index) => (
                  <div key={vertical.id} className="bg-slate-800 border border-slate-700 p-3 rounded-md grid grid-cols-[40px_80px_1fr_1fr] gap-3 items-start hover:border-blue-500/50 transition-colors">
                    {/* # */}
                    <div className="flex items-center justify-center h-9 font-bold text-slate-500">
                      {index + 1}
                    </div>

                    {/* Sufijo */}
                    <div>
                      <Input
                        value={vertical.suffix}
                        onChange={(e) => handleVerticalChange(index, 'suffix', e.target.value)}
                        className="bg-slate-900 border-slate-600 font-mono text-center px-1"
                        placeholder="01"
                        title="Terminación del número (ej: 101, 201)"
                      />
                    </div>

                    {/* Plantilla y Copiar */}
                    <div className="space-y-2">
                      <Select
                        value={vertical.templateId}
                        onChange={(e) => handleTemplateSelect(index, e.target.value)}
                        className="bg-slate-900 border-slate-600 text-xs h-9"
                      >
                        <option value="">-- Sin plantilla --</option>
                        {templates.map(template => (
                          <option key={template.id} value={template.id.toString()}>
                            {template.name}
                          </option>
                        ))}
                      </Select>

                      <button
                        type="button"
                        onClick={() => duplicateVertical(index)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                        title="Copiar configuración a las siguientes filas"
                      >
                        <Copy className="w-3 h-3" />
                        Copiar a siguientes
                      </button>
                    </div>

                    {/* Detalles */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Input
                          value={vertical.apartmentCode}
                          onChange={(e) => handleVerticalChange(index, 'apartmentCode', e.target.value)}
                          className="bg-slate-900 border-slate-600 text-xs h-8"
                          placeholder="Cód: T1-P{piso}-01"
                          title="Código del departamento. Use {piso} para insertar el número de piso automáticamente."
                        />
                      </div>
                      <div>
                        <Input
                          value={vertical.apartmentType}
                          onChange={(e) => handleVerticalChange(index, 'apartmentType', e.target.value)}
                          className="bg-slate-900 border-slate-600 text-xs h-8"
                          placeholder="Tipo"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={vertical.area}
                          onChange={(e) => handleVerticalChange(index, 'area', e.target.value)}
                          className="bg-slate-900 border-slate-600 text-xs h-8"
                          placeholder="m²"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={vertical.bedrooms}
                          onChange={(e) => handleVerticalChange(index, 'bedrooms', e.target.value)}
                          className="bg-slate-900 border-slate-600 text-xs h-8"
                          placeholder="Dorm"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={vertical.bathrooms}
                          onChange={(e) => handleVerticalChange(index, 'bathrooms', e.target.value)}
                          className="bg-slate-900 border-slate-600 text-xs h-8"
                          placeholder="Baños"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vista Previa Resumida */}
          {verticals.length > 0 && (
            <div className="text-xs text-gray-500 mt-2 px-1">
              <h4 className="font-semibold mb-1 text-gray-400">Ejemplo de resultado (Piso 1):</h4>
              <div className="flex flex-wrap gap-2">
                {verticals.map(v => (
                  <span key={v.id} className="bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    1{v.suffix} <span className="text-slate-500">({v.apartmentType})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
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
              disabled={submitting || verticals.length === 0}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {submitting
                ? 'Creando...'
                : `Crear Todos (${(typeof quantity === 'number' ? quantity : 0) * towerFloors.length})`
              }
            </Button>
          </div>
        </form>
      </ModalV2>

      <ApartmentTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => {
          setShowTemplatesModal(false)
          refreshTemplates()
        }}
        projectId={projectId}
      />
    </>
  )
}
