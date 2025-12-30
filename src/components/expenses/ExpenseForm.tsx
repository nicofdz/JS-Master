'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Upload, FileText, Calendar, DollarSign, Package, Building, Plus, Trash2 } from 'lucide-react'
import { ExpenseModal } from './ExpenseModal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { WarehouseFormModal } from '@/components/materials/WarehouseFormModal'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Expense } from '@/hooks/useExpenses'
import { useProjects } from '@/hooks/useProjects'
import { useMaterials } from '@/hooks/useMaterials'
import { useWarehouses } from '@/hooks/useWarehouses'
import { Settings } from 'lucide-react'
import toast from 'react-hot-toast'

interface MaterialItem {
  id: string // ID temporal para identificar cada material en la lista
  name: string
  quantity: number
  unit_cost: number // Precio unitario
  category: string
  unit: string
  stock_min: number
  warehouse_id: number | null
  addToCatalog: boolean
  existingMaterialId?: number | null // ID del material existente si se selecciona uno
  existingStock?: number // Stock disponible del material existente
}

interface ExpenseFormData {
  name: string
  type: 'materiales' | 'servicios' | 'epp' | 'combustible' | 'herramientas' | 'otros' | ''
  quantity?: number | null
  date: string
  total_amount: number
  document_type: 'boleta' | 'factura'
  iva_percentage: number
  iva_amount: number
  net_amount: number
  supplier: string
  project_id?: number | null
  description?: string
  receipt_url?: string
  receipt_filename?: string
  // Checkbox para agregar a catálogo (solo cuando type === 'materiales')
  addToMaterials?: boolean
  // Lista de materiales (solo cuando type === 'materiales' && addToMaterials === true)
  materials?: MaterialItem[]
  // Campos legacy para compatibilidad (solo cuando type !== 'materiales')
  materialCategory?: string
  materialUnit?: string
  materialStockMin?: number
  materialWarehouseId?: number | null
}

interface ExpenseFormProps {
  expense?: Expense | null
  onSave: (expense: ExpenseFormData, receiptFile?: File) => void
  onClose: () => void
  onPreview?: (expense: ExpenseFormData, receiptFile?: File) => void
}

const expenseTypes = [
  { value: 'materiales', label: 'Materiales' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'epp', label: 'EPP' },
  { value: 'combustible', label: 'Combustible' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'otros', label: 'Otros' }
]

export function ExpenseForm({ expense, onSave, onClose, onPreview }: ExpenseFormProps) {
  const { projects, loading: projectsLoading, error: projectsError } = useProjects()
  const { warehouses, fetchWarehouses } = useWarehouses()
  const { materials: existingMaterials, getTotalStock, fetchMaterials, fetchStockForMaterials, getCategories } = useMaterials()
  const [formData, setFormData] = useState<ExpenseFormData>({
    name: '',
    type: '',
    quantity: null,
    date: new Date().toISOString().split('T')[0],
    total_amount: 0,
    document_type: 'boleta',
    iva_percentage: 19.00,
    iva_amount: 0,
    net_amount: 0,
    supplier: '',
    project_id: null,
    description: '',
    receipt_url: '',
    receipt_filename: '',
    materials: undefined,
    addToMaterials: false,
    materialCategory: '',
    materialUnit: 'unidad',
    materialStockMin: 0,
    materialWarehouseId: null
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [materialErrors, setMaterialErrors] = useState<Record<string, Record<string, string>>>({})
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string>('')
  const [categories, setCategories] = useState<string[]>([])
  const [categoryDropdowns, setCategoryDropdowns] = useState<Record<string, boolean>>({})
  const categoryInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const categoryDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [showWarehouseModal, setShowWarehouseModal] = useState(false)

  // Cargar almacenes, materiales y categorías al montar
  useEffect(() => {
    fetchWarehouses(true)
    fetchMaterials({ activeOnly: true })
    const loadCategories = async () => {
      const cats = await getCategories()
      setCategories(cats)
    }
    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Manejar clicks fuera de los dropdowns de categoría
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(categoryDropdowns).forEach((materialId) => {
        if (categoryDropdowns[materialId]) {
          const input = categoryInputRefs.current[materialId]
          const dropdown = categoryDropdownRefs.current[materialId]
          if (
            input &&
            dropdown &&
            !input.contains(event.target as Node) &&
            !dropdown.contains(event.target as Node)
          ) {
            setCategoryDropdowns(prev => ({ ...prev, [materialId]: false }))
          }
        }
      })
    }

    if (Object.values(categoryDropdowns).some(Boolean)) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [categoryDropdowns])

  // Cargar stock cuando se seleccionan materiales existentes
  useEffect(() => {
    if (formData.type === 'materiales' && formData.materials) {
      const existingIds = formData.materials
        .filter(m => m.existingMaterialId)
        .map(m => m.existingMaterialId!)

      if (existingIds.length > 0) {
        fetchStockForMaterials(existingIds)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.materials])

  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name,
        type: expense.type,
        quantity: expense.quantity,
        date: expense.date,
        total_amount: expense.total_amount,
        document_type: expense.document_type,
        iva_percentage: expense.iva_percentage,
        iva_amount: expense.iva_amount,
        net_amount: expense.net_amount,
        supplier: expense.supplier,
        project_id: expense.project_id,
        description: expense.description || '',
        receipt_url: expense.receipt_url || '',
        receipt_filename: expense.receipt_filename || ''
      })
      if (expense.receipt_url) {
        setReceiptPreview(expense.receipt_url)
      }
    }
  }, [expense])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'materiales': return <Package className="w-4 h-4" />
      case 'servicios': return <FileText className="w-4 h-4" />
      case 'epp': return <Package className="w-4 h-4" />
      case 'combustible': return <Package className="w-4 h-4" />
      case 'herramientas': return <Package className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'materiales': return 'bg-blue-100 text-blue-800'
      case 'servicios': return 'bg-green-100 text-green-800'
      case 'epp': return 'bg-yellow-100 text-yellow-800'
      case 'combustible': return 'bg-orange-100 text-orange-800'
      case 'herramientas': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    const newMaterialErrors: Record<string, Record<string, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del gasto es requerido'
    }

    if (!formData.type) {
      newErrors.type = 'El tipo de gasto es requerido'
    }

    if (!formData.supplier.trim()) {
      newErrors.supplier = 'El proveedor es requerido'
    }

    if (!formData.date) {
      newErrors.date = 'La fecha es requerida'
    }

    // Validación diferente para materiales con lista
    if (formData.type === 'materiales' && formData.materials) {
      // Validar que haya al menos un material
      if (formData.materials.length === 0) {
        newErrors.materials = 'Debe agregar al menos un material'
      }

      // Validar cada material
      formData.materials.forEach((material, index) => {
        const matErrors: Record<string, string> = {}

        // Si es material existente, solo validar cantidad, precio y almacén
        if (material.existingMaterialId) {
          if (!material.quantity || material.quantity <= 0) {
            matErrors.quantity = 'La cantidad debe ser mayor a 0'
          }

          if (!material.unit_cost || material.unit_cost <= 0) {
            matErrors.unit_cost = 'El precio unitario debe ser mayor a 0'
          }

          if (!material.warehouse_id) {
            matErrors.warehouse_id = 'Debe seleccionar un almacén para el ingreso'
          }
        } else {
          // Si es nuevo material, validar nombre
          if (!material.name.trim()) {
            matErrors.name = 'El nombre del material es requerido'
          }

          if (!material.quantity || material.quantity <= 0) {
            matErrors.quantity = 'La cantidad debe ser mayor a 0'
          }

          if (!material.unit_cost || material.unit_cost <= 0) {
            matErrors.unit_cost = 'El precio unitario debe ser mayor a 0'
          }

          // Validar campos para agregar a catálogo (siempre requeridos para materiales nuevos)
          if (!material.category.trim()) {
            matErrors.category = 'La categoría es requerida'
          }
          if (!material.unit) {
            matErrors.unit = 'La unidad es requerida'
          }
          if (material.stock_min === undefined || material.stock_min < 0) {
            matErrors.stock_min = 'El stock mínimo debe ser mayor o igual a 0'
          }
        }

        if (Object.keys(matErrors).length > 0) {
          newMaterialErrors[material.id] = matErrors
        }
      })

      // Validar total
      if (formData.total_amount <= 0) {
        newErrors.total_amount = 'El total debe ser mayor a 0'
      }
    } else {
      // Validación para otros tipos de gastos
      if (formData.total_amount <= 0) {
        newErrors.total_amount = 'El precio debe ser mayor a 0'
      }

      // Validar cantidad solo para ciertos tipos
      const typesWithQuantity = ['epp', 'herramientas', 'combustible']
      if (typesWithQuantity.includes(formData.type) && (!formData.quantity || formData.quantity <= 0)) {
        newErrors.quantity = 'La cantidad es requerida para este tipo de gasto'
      }

      // Validar campos de material legacy si se quiere agregar a catálogo
      if (formData.type === 'materiales' && formData.addToMaterials) {
        if (!formData.materialCategory?.trim()) {
          newErrors.materialCategory = 'La categoría es requerida para agregar a materiales'
        }
        if (!formData.materialUnit) {
          newErrors.materialUnit = 'La unidad es requerida para agregar a materiales'
        }
        if (formData.materialStockMin === undefined || formData.materialStockMin < 0) {
          newErrors.materialStockMin = 'El stock mínimo debe ser mayor o igual a 0'
        }
        if (!formData.quantity || formData.quantity <= 0) {
          newErrors.quantity = 'La cantidad es requerida para calcular el costo unitario'
        }
      }
    }

    setErrors(newErrors)
    setMaterialErrors(newMaterialErrors)
    return Object.keys(newErrors).length === 0 && Object.keys(newMaterialErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      const expenseData = {
        ...formData,
        quantity: formData.quantity || null,
        project_id: formData.project_id || null
      }

      if (onPreview) {
        onPreview(expenseData, receiptFile || undefined)
      } else {
        onSave(expenseData, receiptFile || undefined)
      }
    }
  }

  // Calcular IVA desde el total (para gastos que no son materiales)
  const calculateIVAFromTotal = (totalAmount: number) => {
    const netAmount = Math.round(totalAmount / 1.19)
    const ivaAmount = totalAmount - netAmount
    return { netAmount, ivaAmount }
  }

  // Calcular IVA desde el neto (para gastos de materiales)
  const calculateIVAFromNet = (netAmount: number) => {
    const ivaAmount = Math.round(netAmount * 0.19 * 100) / 100
    const totalAmount = netAmount + ivaAmount
    return { netAmount, ivaAmount, totalAmount }
  }

  const handleChange = (field: string, value: any) => {
    let newFormData = {
      ...formData,
      [field]: value
    }

    // Calcular IVA automáticamente cuando cambia el total_amount (solo para gastos que NO son materiales)
    if (field === 'total_amount' && value > 0 && newFormData.type !== 'materiales') {
      const { netAmount, ivaAmount } = calculateIVAFromTotal(value)
      newFormData.net_amount = netAmount
      newFormData.iva_amount = ivaAmount
    }

    // Si cambia el tipo a 'materiales', resetear checkbox y lista
    if (field === 'type') {
      if (value === 'materiales') {
        // Mantener checkbox pero limpiar lista hasta que se marque
        newFormData.materials = undefined
      } else if (value !== 'materiales') {
        newFormData.addToMaterials = false
        newFormData.materials = undefined
      }
    }

    // Si cambia el checkbox de agregar a catálogo
    if (field === 'addToMaterials') {
      if (value === true && formData.type === 'materiales' && !newFormData.materials) {
        // Inicializar lista cuando se marca el checkbox
        newFormData.materials = [{
          id: `material-${Date.now()}`,
          name: '',
          quantity: 0,
          unit_cost: 0,
          category: '',
          unit: 'unidad',
          stock_min: 0,
          warehouse_id: null,
          addToCatalog: true, // Siempre true para materiales nuevos
          existingMaterialId: null,
          existingStock: undefined
        }]
      } else if (value === false) {
        // Limpiar lista cuando se desmarca
        newFormData.materials = undefined
      }
    }

    setFormData(newFormData)

    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  // Funciones para manejar la lista de materiales
  const addMaterial = () => {
    const newMaterial: MaterialItem = {
      id: `material-${Date.now()}-${Math.random()}`,
      name: '',
      quantity: 0,
      unit_cost: 0,
      category: '',
      unit: 'unidad',
      stock_min: 0,
      warehouse_id: null,
      addToCatalog: true // Siempre true para materiales nuevos
    }
    setFormData({
      ...formData,
      materials: [...(formData.materials || []), newMaterial]
    })
  }

  const removeMaterial = (materialId: string) => {
    const updatedMaterials = formData.materials?.filter(m => m.id !== materialId) || []
    setFormData({
      ...formData,
      materials: updatedMaterials.length > 0 ? updatedMaterials : [{
        id: `material-${Date.now()}`,
        name: '',
        quantity: 0,
        unit_cost: 0,
        category: '',
        unit: 'unidad',
        stock_min: 0,
        warehouse_id: null,
        addToCatalog: true // Siempre true para materiales nuevos
      }]
    })
    // Limpiar errores del material eliminado
    setMaterialErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[materialId]
      return newErrors
    })
  }

  const updateMaterial = (materialId: string, field: keyof MaterialItem, value: any) => {
    const updatedMaterials = formData.materials?.map(m => {
      if (m.id === materialId) {
        const updated = { ...m, [field]: value }

        // Si se selecciona un material existente, actualizar nombre y stock
        if (field === 'existingMaterialId') {
          const existingMaterial = existingMaterials.find(mat => mat.id === value)
          if (existingMaterial) {
            updated.name = existingMaterial.name
            updated.existingMaterialId = existingMaterial.id
            updated.existingStock = getTotalStock(existingMaterial.id)
            updated.addToCatalog = false // Deshabilitar checkbox porque ya existe
          } else if (value === null || value === '') {
            // Si se selecciona "Nuevo material", limpiar
            updated.name = ''
            updated.existingMaterialId = null
            updated.existingStock = undefined
            updated.addToCatalog = true // Siempre true para materiales nuevos
          }
        }

        return updated
      }
      return m
    }) || []

    setFormData({
      ...formData,
      materials: updatedMaterials
    })

    // Limpiar error del campo
    if (materialErrors[materialId]?.[field]) {
      setMaterialErrors(prev => ({
        ...prev,
        [materialId]: {
          ...prev[materialId],
          [field]: ''
        }
      }))
    }

    // Recalcular totales si cambia cantidad o precio unitario
    if (field === 'quantity' || field === 'unit_cost') {
      recalculateTotals()
    }
  }

  // Recalcular totales basados en materiales
  const recalculateTotals = () => {
    if (formData.type === 'materiales' && formData.materials) {
      // El subtotal de materiales es el MONTO NETO (sin IVA)
      const netAmount = formData.materials.reduce((sum, m) => {
        return sum + (m.quantity * m.unit_cost)
      }, 0)

      // Redondear a 2 decimales para evitar problemas de precisión
      const roundedNetAmount = Math.round(netAmount * 100) / 100

      // Calcular IVA desde el neto y luego el total
      const { ivaAmount, totalAmount } = calculateIVAFromNet(roundedNetAmount)

      setFormData(prev => ({
        ...prev,
        net_amount: roundedNetAmount, // El subtotal de materiales es el neto
        iva_amount: ivaAmount,
        total_amount: totalAmount // Neto + IVA
      }))
    }
  }

  // Efecto para recalcular totales cuando cambian los materiales
  useEffect(() => {
    if (formData.type === 'materiales' && formData.materials) {
      recalculateTotals()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.materials])

  // Calcular costo unitario automáticamente
  const calculateUnitCost = () => {
    if (formData.quantity && formData.quantity > 0 && formData.net_amount > 0) {
      return Math.round(formData.net_amount / formData.quantity)
    }
    return 0
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReceiptFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const typesWithQuantity = ['materiales', 'epp', 'herramientas', 'combustible']

  const getQuantityLabel = (type: string) => {
    switch (type) {
      case 'combustible': return 'Cantidad (Litros)'
      case 'materiales': return 'Cantidad'
      case 'epp': return 'Cantidad'
      case 'herramientas': return 'Cantidad'
      default: return 'Cantidad'
    }
  }

  const getQuantityPlaceholder = (type: string) => {
    switch (type) {
      case 'combustible': return 'Ej: 50 L'
      case 'materiales': return 'Ej: 20'
      case 'epp': return 'Ej: 10'
      case 'herramientas': return 'Ej: 5'
      default: return 'Ej: 1'
    }
  }

  return (
    <>
      <ExpenseModal isOpen={true} onClose={onClose}>
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-100">
              {expense ? 'Editar Gasto' : 'Agregar Nuevo Gasto'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre del Gasto *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ej: Cemento Portland 50kg"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tipo de Gasto *
                </label>
                <Select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className={errors.type ? 'border-red-500' : ''}
                >
                  <option value="">Seleccione tipo de gasto</option>
                  {expenseTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-400">{errors.type}</p>
                )}
              </div>
            </div>

            {/* Cantidad (para tipos que requieren cantidad, incluyendo materiales cuando NO va al catálogo) */}
            {typesWithQuantity.includes(formData.type) && (
              formData.type !== 'materiales' || (formData.type === 'materiales' && !formData.addToMaterials)
            ) && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {getQuantityLabel(formData.type)} *
                  </label>
                  <Input
                    type="number"
                    value={formData.quantity || ''}
                    onChange={(e) => handleChange('quantity', parseInt(e.target.value) || null)}
                    placeholder={getQuantityPlaceholder(formData.type)}
                    className={errors.quantity ? 'border-red-500' : ''}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-400">{errors.quantity}</p>
                  )}
                </div>
              )}

            {/* Mensaje cuando materiales va al catálogo */}
            {formData.type === 'materiales' && formData.addToMaterials && (
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-sm text-slate-300">
                  <span className="font-medium">Cantidad:</span> revisar catálogo de materiales
                </p>
              </div>
            )}

            {/* Fecha y Tipo de Documento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Fecha del Gasto *
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className={errors.date ? 'border-red-500' : ''}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-400">{errors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tipo de Documento *
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center text-slate-300">
                    <input
                      type="radio"
                      name="document_type"
                      value="boleta"
                      checked={formData.document_type === 'boleta'}
                      onChange={(e) => handleChange('document_type', e.target.value)}
                      className="mr-2"
                    />
                    Boleta
                  </label>
                  <label className="flex items-center text-slate-300">
                    <input
                      type="radio"
                      name="document_type"
                      value="factura"
                      checked={formData.document_type === 'factura'}
                      onChange={(e) => handleChange('document_type', e.target.value)}
                      className="mr-2"
                    />
                    Factura
                  </label>
                </div>
              </div>
            </div>

            {/* Monto Total (solo editable si NO es tipo materiales) */}
            {formData.type !== 'materiales' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Total con IVA *
                </label>
                <Input
                  type="number"
                  value={formData.total_amount || ''}
                  onChange={(e) => handleChange('total_amount', parseInt(e.target.value) || 0)}
                  placeholder="Ej: 450000"
                  className={errors.total_amount ? 'border-red-500' : ''}
                />
                {errors.total_amount && (
                  <p className="mt-1 text-sm text-red-400">{errors.total_amount}</p>
                )}
              </div>
            )}

            {/* Cálculos de IVA */}
            {formData.total_amount > 0 && (
              <div className="bg-slate-700/30 border border-slate-600 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Desglose del IVA</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Monto Neto</label>
                    <div className="text-sm font-semibold text-slate-100">
                      ${formData.net_amount.toLocaleString('es-CL')}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">IVA (19%)</label>
                    <div className="text-sm font-semibold text-slate-100">
                      ${formData.iva_amount.toLocaleString('es-CL')}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Total</label>
                    <div className="text-sm font-semibold text-slate-100">
                      ${formData.total_amount.toLocaleString('es-CL')}
                    </div>
                  </div>
                </div>
                {formData.document_type === 'factura' && (
                  <div className="mt-2 text-xs text-green-400">
                    ✓ IVA recuperable: ${formData.iva_amount.toLocaleString('es-CL')}
                  </div>
                )}
                {formData.document_type === 'boleta' && (
                  <div className="mt-2 text-xs text-slate-400">
                    ℹ IVA no recuperable
                  </div>
                )}
              </div>
            )}

            {/* Proveedor y Proyecto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Proveedor *
                </label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => handleChange('supplier', e.target.value)}
                  placeholder="Ej: Distribuidora Construcción S.A."
                  className={errors.supplier ? 'border-red-500' : ''}
                />
                {errors.supplier && (
                  <p className="mt-1 text-sm text-red-400">{errors.supplier}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Proyecto (Opcional)
                </label>
                <Select
                  value={formData.project_id || ''}
                  onChange={(e) => handleChange('project_id', e.target.value ? parseInt(e.target.value) : null)}
                  disabled={projectsLoading}
                >
                  <option value="">Sin proyecto específico</option>
                  {projectsLoading ? (
                    <option disabled>Cargando proyectos...</option>
                  ) : projects.length === 0 ? (
                    <option disabled>No hay proyectos disponibles</option>
                  ) : (
                    projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))
                  )}
                </Select>
                {projectsLoading && (
                  <p className="mt-1 text-xs text-gray-500">Cargando proyectos...</p>
                )}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Descripción (Opcional)
              </label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Detalles adicionales del gasto..."
                rows={3}
              />
            </div>

            {/* Checkbox para agregar a catálogo (solo cuando type === 'materiales') */}
            {formData.type === 'materiales' && (
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="addToMaterials"
                    checked={formData.addToMaterials || false}
                    onChange={(e) => handleChange('addToMaterials', e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="addToMaterials" className="text-sm font-medium text-slate-200 cursor-pointer">
                    Agregar a catálogo de materiales
                  </label>
                </div>
              </div>
            )}

            {/* Lista dinámica de materiales */}
            {formData.type === 'materiales' && formData.addToMaterials && formData.materials && (
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-100">Materiales de la Factura</h3>
                  <button
                    type="button"
                    onClick={addMaterial}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Material
                  </button>
                </div>

                {errors.materials && (
                  <p className="mb-4 text-sm text-red-400">{errors.materials}</p>
                )}

                <div className="space-y-4">
                  {formData.materials.map((material, index) => (
                    <div key={material.id} className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-slate-200">Material #{index + 1}</h4>
                        {formData.materials && formData.materials.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMaterial(material.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Seleccionar Material *
                          </label>
                          <Select
                            value={material.existingMaterialId?.toString() || ''}
                            onChange={(e) => updateMaterial(material.id, 'existingMaterialId', e.target.value ? parseInt(e.target.value) : null)}
                            className={materialErrors[material.id]?.existingMaterialId ? 'border-red-500' : ''}
                          >
                            <option value="">➕ Nuevo material</option>
                            {existingMaterials.map((mat) => (
                              <option key={mat.id} value={mat.id.toString()}>
                                {mat.name} ({mat.category} - {mat.unit})
                              </option>
                            ))}
                          </Select>
                          {materialErrors[material.id]?.existingMaterialId && (
                            <p className="mt-1 text-sm text-red-400">{materialErrors[material.id].existingMaterialId}</p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Nombre del Material *
                          </label>
                          <Input
                            value={material.name}
                            onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
                            placeholder="Ej: Tornillo hilo fino #6x15/8''"
                            disabled={material.existingMaterialId !== null && material.existingMaterialId !== undefined}
                            className={materialErrors[material.id]?.name ? 'border-red-500' : ''}
                          />
                          {materialErrors[material.id]?.name && (
                            <p className="mt-1 text-sm text-red-400">{materialErrors[material.id].name}</p>
                          )}
                          {material.existingMaterialId && (
                            <p className="mt-1 text-xs text-slate-400">Nombre del material existente (no editable)</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Cantidad *
                          </label>
                          <Input
                            type="number"
                            value={material.quantity || ''}
                            onChange={(e) => updateMaterial(material.id, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                            placeholder="0"
                            className={materialErrors[material.id]?.quantity ? 'border-red-500' : ''}
                          />
                          {materialErrors[material.id]?.quantity && (
                            <p className="mt-1 text-sm text-red-400">{materialErrors[material.id].quantity}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Precio Unitario *
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            value={material.unit_cost || ''}
                            onChange={(e) => updateMaterial(material.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                            min="0"
                            placeholder="0.00"
                            className={materialErrors[material.id]?.unit_cost ? 'border-red-500' : ''}
                          />
                          {materialErrors[material.id]?.unit_cost && (
                            <p className="mt-1 text-sm text-red-400">{materialErrors[material.id].unit_cost}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Subtotal
                          </label>
                          <div className="bg-slate-700/50 p-2 rounded border border-slate-600 text-slate-100 font-medium">
                            ${((material.quantity || 0) * (material.unit_cost || 0)).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        {/* Almacén para ingreso (requerido para materiales existentes) */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Almacén para Ingreso {material.existingMaterialId ? '*' : '(Opcional)'}
                          </label>
                          <div className="flex gap-2">
                            <Select
                              value={material.warehouse_id?.toString() || ''}
                              onChange={(e) => updateMaterial(material.id, 'warehouse_id', e.target.value ? parseInt(e.target.value) : null)}
                              className={materialErrors[material.id]?.warehouse_id ? 'border-red-500' : ''}
                            >
                              <option value="">Selecciona almacén</option>
                              {warehouses.filter(w => w.is_active).map((wh) => (
                                <option key={wh.id} value={wh.id.toString()}>{wh.name}</option>
                              ))}
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              className="px-3 border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700"
                              onClick={() => setShowWarehouseModal(true)}
                              title="Administrar bodegas"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                          {materialErrors[material.id]?.warehouse_id && (
                            <p className="mt-1 text-sm text-red-400">{materialErrors[material.id].warehouse_id}</p>
                          )}
                        </div>
                      </div>

                      {/* Campos para agregar a catálogo (siempre visible para materiales nuevos) */}
                      {!material.existingMaterialId && (
                        <div className="mb-4 pt-4 border-t border-slate-600">
                          <div className="mb-3">
                            <span className="text-sm font-medium text-slate-200">Datos del nuevo material</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="relative">
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Categoría *
                              </label>
                              <Input
                                ref={(el) => {
                                  categoryInputRefs.current[material.id] = el
                                }}
                                value={material.category}
                                onChange={(e) => {
                                  updateMaterial(material.id, 'category', e.target.value)
                                  setCategoryDropdowns(prev => ({ ...prev, [material.id]: true }))
                                }}
                                onFocus={() => {
                                  setCategoryDropdowns(prev => ({ ...prev, [material.id]: true }))
                                }}
                                onBlur={() => {
                                  // Delay para permitir click en sugerencia
                                  setTimeout(() => {
                                    setCategoryDropdowns(prev => ({ ...prev, [material.id]: false }))
                                  }, 200)
                                }}
                                placeholder="Ej: Fijaciones, Adhesivos"
                                className={materialErrors[material.id]?.category ? 'border-red-500' : ''}
                              />
                              {categoryDropdowns[material.id] && (() => {
                                const filteredCategories = material.category
                                  ? categories.filter(cat =>
                                    cat.toLowerCase().includes(material.category.toLowerCase()) &&
                                    cat !== material.category
                                  )
                                  : categories
                                return filteredCategories.length > 0 ? (
                                  <div
                                    ref={(el) => {
                                      categoryDropdownRefs.current[material.id] = el
                                    }}
                                    className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-48 overflow-auto"
                                  >
                                    {filteredCategories.map((category) => (
                                      <button
                                        key={category}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault() // Prevenir blur antes del click
                                          updateMaterial(material.id, 'category', category)
                                          setCategoryDropdowns(prev => ({ ...prev, [material.id]: false }))
                                          categoryInputRefs.current[material.id]?.blur()
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:outline-none"
                                      >
                                        {category}
                                      </button>
                                    ))}
                                  </div>
                                ) : null
                              })()}
                              {materialErrors[material.id]?.category && (
                                <p className="mt-1 text-sm text-red-400">{materialErrors[material.id].category}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Unidad *
                              </label>
                              <Select
                                value={material.unit}
                                onChange={(e) => updateMaterial(material.id, 'unit', e.target.value)}
                                className={materialErrors[material.id]?.unit ? 'border-red-500' : ''}
                              >
                                <option value="unidad">Unidad</option>
                                <option value="caja">Caja</option>
                                <option value="kg">Kg</option>
                                <option value="mts">Mts</option>
                                <option value="m2">m²</option>
                                <option value="m3">m³</option>
                                <option value="lt">Litro</option>
                              </Select>
                              {materialErrors[material.id]?.unit && (
                                <p className="mt-1 text-sm text-red-400">{materialErrors[material.id].unit}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Stock Mínimo
                              </label>
                              <Input
                                type="number"
                                value={material.stock_min || 0}
                                onChange={(e) => updateMaterial(material.id, 'stock_min', parseInt(e.target.value) || 0)}
                                min="0"
                                className={materialErrors[material.id]?.stock_min ? 'border-red-500' : ''}
                              />
                              {materialErrors[material.id]?.stock_min && (
                                <p className="mt-1 text-sm text-red-400">{materialErrors[material.id].stock_min}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Resumen de totales */}
                {formData.total_amount > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <div className="bg-slate-800/50 p-3 rounded border border-slate-600">
                      <p className="text-xs text-slate-400 mb-1">Subtotal Materiales (Neto sin IVA)</p>
                      <p className="text-lg font-semibold text-slate-100">
                        ${formData.materials.reduce((sum, m) => sum + (m.quantity * m.unit_cost), 0).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Comprobante */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Comprobante (Opcional)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md hover:border-slate-500 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-slate-400" />
                  <div className="flex text-sm text-slate-300">
                    <label
                      htmlFor="receipt-upload"
                      className="relative cursor-pointer bg-slate-700 rounded-md font-medium text-blue-400 hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-2 py-1"
                    >
                      <span>Subir archivo</span>
                      <input
                        id="receipt-upload"
                        name="receipt-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">o arrastra y suelta</p>
                  </div>
                  <p className="text-xs text-slate-400">
                    PNG, JPG, PDF hasta 10MB
                  </p>
                </div>
              </div>

              {receiptPreview && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-300 mb-2">Vista previa:</p>
                  <div className="border border-slate-600 rounded-lg p-2 bg-slate-700/30">
                    <p className="text-sm text-slate-300">{receiptFile?.name || 'Archivo existente'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700">
              <Button
                type="button"
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {expense ? 'Actualizar Gasto' : 'Vista Previa'}
              </Button>
            </div>
          </form>
        </div>
      </ExpenseModal>

      {/* Modal de gestión de bodegas */}
      <WarehouseFormModal
        open={showWarehouseModal}
        onClose={() => setShowWarehouseModal(false)}
        onSuccess={() => fetchWarehouses(true)}
      />
    </>
  )
}
