'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Calendar, DollarSign, Package, Wrench, Shield, Fuel, FileText, X, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ExpenseForm } from '@/components/expenses/ExpenseForm'
import { ReceiptModal } from '@/components/expenses/ReceiptModal'
import { ExpensePreviewModal } from '@/components/expenses/ExpensePreviewModal'
import { ExpenseChart } from '@/components/expenses/ExpenseChart'
import { useExpenses, Expense } from '@/hooks/useExpenses'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/hooks/useAuth'
import { useMaterials } from '@/hooks/useMaterials'
import { useMaterialMovements } from '@/hooks/useMaterialMovements'
import toast from 'react-hot-toast'

const expenseTypes = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'materiales', label: 'Materiales' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'epp', label: 'EPP' },
  { value: 'combustible', label: 'Combustible' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'otros', label: 'Otros' },
  { value: 'cancelled', label: 'Gastos Anulados' }
]

const documentTypes = [
  { value: 'all', label: 'Boleta / Factura' },
  { value: 'boleta', label: 'Boleta' },
  { value: 'factura', label: 'Factura' }
]

const months = [
  { value: 'all', label: 'Todos los meses' },
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
]

const years = [
  { value: 'all', label: 'Todos los años' },
  { value: '2023', label: '2023' },
  { value: '2024', label: '2024' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' }
]

export default function GastosPage() {
  const { user } = useAuth()
  const { createMaterial } = useMaterials()
  const { registerAdjustment } = useMaterialMovements()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all')
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Convertir filtros de fecha a números para el hook
  const yearFilterNum = yearFilter !== 'all' ? parseInt(yearFilter) : undefined
  const monthFilterNum = monthFilter !== 'all' ? parseInt(monthFilter) : undefined
  const documentTypeFilterValue = documentTypeFilter !== 'all' ? documentTypeFilter as 'boleta' | 'factura' : undefined
  const projectFilterValue = projectFilter !== 'all' ? parseInt(projectFilter) : undefined
  
  const { 
    expenses, 
    stats, 
    loading, 
    error, 
    addExpense, 
    updateExpense, 
    cancelExpense, 
    uploadReceipt 
  } = useExpenses(yearFilterNum, monthFilterNum, documentTypeFilterValue, projectFilterValue)
  const { projects } = useProjects()
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewReceiptFile, setPreviewReceiptFile] = useState<File | null>(null)
  const [ivaFilter, setIvaFilter] = useState(false)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'materiales': return <Package className="w-4 h-4" />
      case 'servicios': return <Wrench className="w-4 h-4" />
      case 'epp': return <Shield className="w-4 h-4" />
      case 'combustible': return <Fuel className="w-4 h-4" />
      case 'herramientas': return <Wrench className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'materiales': return 'bg-blue-500 text-white'
      case 'servicios': return 'bg-green-500 text-white'
      case 'epp': return 'bg-yellow-500 text-white'
      case 'combustible': return 'bg-orange-500 text-white'
      case 'herramientas': return 'bg-purple-500 text-white'
      case 'cancelled': return 'bg-red-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'materiales': 'Materiales',
      'servicios': 'Servicios',
      'epp': 'EPP',
      'combustible': 'Combustible',
      'herramientas': 'Herramientas',
      'otros': 'Otros'
    }
    return typeMap[type] || type
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL')
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filtro por IVA recuperable
    let matchesIva = true
    if (ivaFilter) {
      matchesIva = expense.document_type === 'factura' && expense.status === 'active'
    }
    
    // Filtro por tipo
    let matchesType = true
    if (typeFilter === 'all') {
      matchesType = expense.status === 'active'
    } else if (typeFilter === 'cancelled') {
      matchesType = expense.status === 'cancelled'
    } else {
      matchesType = expense.type === typeFilter && expense.status === 'active'
    }
    
    // Filtro por fecha
    let matchesDate = true
    if (yearFilter === 'all') {
      // Todos los años
      if (monthFilter === 'all') {
        // Todos los meses de todos los años
        matchesDate = true
      } else {
        // Mes específico de cualquier año
        const expenseMonth = expense.date.substring(5, 7)
        matchesDate = expenseMonth === monthFilter
      }
    } else {
      // Año específico
      if (monthFilter === 'all') {
        // Todos los meses del año seleccionado
        matchesDate = expense.date.startsWith(yearFilter)
      } else {
        // Mes específico del año seleccionado
        matchesDate = expense.date.startsWith(`${yearFilter}-${monthFilter}`)
      }
    }
    
    // Filtro por tipo de documento
    let matchesDocumentType = true
    if (documentTypeFilter !== 'all') {
      matchesDocumentType = expense.document_type === documentTypeFilter
    }
    
    return matchesSearch && matchesType && matchesDate && matchesIva && matchesDocumentType
  })

  const handlePreviewExpense = (expenseData: any, receiptFile?: File) => {
    setPreviewData(expenseData)
    setPreviewReceiptFile(receiptFile || null)
    setShowPreviewModal(true)
  }

  const handleConfirmExpense = async (expenseData?: any, receiptFile?: File) => {
    try {
      // Filtrar campos que no pertenecen a la tabla expenses
      const { addToMaterials, materialCategory, materialUnit, materialStockMin, materialWarehouseId, materials, ...expenseData } = previewData
      
      // Si es tipo materiales y tiene array de materiales (van al catálogo), quantity debe ser null
      // Si es tipo materiales pero NO tiene array (no va al catálogo), mantener quantity
      const finalExpenseData = {
        ...expenseData,
        created_by: user?.id || null,
        // Si hay materiales en el array, quantity es null (las cantidades están en cada material)
        quantity: (previewData.type === 'materiales' && previewData.materials && previewData.materials.length > 0) 
          ? null 
          : expenseData.quantity
      }
      
      const newExpense = finalExpenseData
      
      const createdExpense = await addExpense(newExpense)
      
      // Subir comprobante si existe
      if (receiptFile) {
        await uploadReceipt(receiptFile, createdExpense.id)
      }

      // Procesar materiales si es tipo materiales
      if (previewData.type === 'materiales' && previewData.materials && previewData.materials.length > 0) {
        let successCount = 0
        let errorCount = 0

        for (const material of previewData.materials) {
          // Si es material existente, solo registrar ingreso
          if (material.existingMaterialId) {
            if (material.quantity && material.quantity > 0) {
              const warehouseId = material.warehouse_id
              
              if (warehouseId) {
                try {
                  await registerAdjustment({
                    material_id: material.existingMaterialId,
                    warehouse_id: warehouseId,
                    movement_type: 'ingreso',
                    quantity: material.quantity,
                    reason: `Ingreso desde gasto #${createdExpense.id}`,
                    notes: `Gasto registrado el ${previewData.date}. Proveedor: ${previewData.supplier}`
                  })
                  successCount++
                } catch (stockError: any) {
                  console.error(`Error registering stock entry for existing material ${material.name}:`, stockError)
                  errorCount++
                  toast.error(`Error al registrar ingreso de "${material.name}": ${stockError.message || 'Error desconocido'}`)
                }
              } else {
                errorCount++
                toast(`No se registró el ingreso de "${material.name}" (no se seleccionó almacén)`, { icon: '⚠️' })
              }
            }
          } 
          // Si es nuevo material y está marcado para agregar a catálogo
          else if (material.addToCatalog) {
            try {
              // Crear el material (redondear unit_cost a 2 decimales)
              const newMaterial = await createMaterial({
                name: material.name,
                category: material.category || '',
                unit: material.unit || 'unidad',
                unit_cost: Math.round((material.unit_cost || 0) * 100) / 100, // Redondear a 2 decimales
                supplier: previewData.supplier || null,
                stock_min: material.stock_min || 0,
                default_warehouse_id: material.warehouse_id || null,
                notes: `Gasto #${createdExpense.id} - ${previewData.description || ''}`,
                is_active: true
              })

              // Registrar el ingreso de stock si hay cantidad y almacén
              if (material.quantity && material.quantity > 0) {
                const warehouseId = material.warehouse_id || newMaterial.default_warehouse_id
                
                if (warehouseId) {
                  try {
                    await registerAdjustment({
                      material_id: newMaterial.id,
                      warehouse_id: warehouseId,
                      movement_type: 'ingreso',
                      quantity: material.quantity,
                      reason: `Ingreso desde gasto #${createdExpense.id}`,
                      notes: `Gasto registrado el ${previewData.date}. Proveedor: ${previewData.supplier}`
                    })
                    successCount++
                  } catch (stockError: any) {
                    console.error(`Error registering stock entry for material ${material.name}:`, stockError)
                    errorCount++
                    toast.error(`Material "${material.name}" creado, pero error al registrar stock: ${stockError.message || 'Error desconocido'}`)
                  }
                } else {
                  errorCount++
                  toast(`Material "${material.name}" creado, pero no se registró el stock (no se seleccionó almacén)`, { icon: '⚠️' })
                }
              } else {
                successCount++
                toast.success(`Material "${material.name}" creado exitosamente`)
              }
            } catch (materialError: any) {
              console.error(`Error creating material ${material.name}:`, materialError)
              errorCount++
              toast.error(`Error al crear material "${material.name}": ${materialError.message || 'Error desconocido'}`)
            }
          }
        }

        if (successCount > 0 && errorCount === 0) {
          toast.success(`Gasto agregado y ${successCount} material(es) procesado(s) exitosamente`)
        } else if (successCount > 0 && errorCount > 0) {
          toast.success(`Gasto agregado. ${successCount} material(es) procesado(s), ${errorCount} con errores`)
        } else if (previewData.materials && previewData.materials.length > 0) {
          toast.success('Gasto agregado exitosamente')
        } else {
          toast.success('Gasto agregado exitosamente')
        }
      } else if (previewData.type === 'materiales' && previewData.addToMaterials) {
        // Procesar material legacy (compatibilidad con versión anterior)
        try {
          const unitCost = previewData.quantity && previewData.quantity > 0 && previewData.net_amount > 0
            ? Math.round(previewData.net_amount / previewData.quantity)
            : 0

          const newMaterial = await createMaterial({
            name: previewData.name,
            category: previewData.materialCategory || '',
            unit: previewData.materialUnit || 'unidad',
            unit_cost: unitCost,
            supplier: previewData.supplier || null,
            stock_min: previewData.materialStockMin || 0,
            default_warehouse_id: previewData.materialWarehouseId || null,
            notes: previewData.description || null,
            is_active: true
          })

          if (previewData.quantity && previewData.quantity > 0) {
            const warehouseId = previewData.materialWarehouseId || newMaterial.default_warehouse_id
            
            if (warehouseId) {
              try {
                await registerAdjustment({
                  material_id: newMaterial.id,
                  warehouse_id: warehouseId,
                  movement_type: 'ingreso',
                  quantity: previewData.quantity,
                  reason: `Ingreso desde gasto #${createdExpense.id}`,
                  notes: `Gasto registrado el ${previewData.date}. Proveedor: ${previewData.supplier}`
                })
              } catch (stockError: any) {
                console.error('Error registering stock entry:', stockError)
                toast.error('Material creado, pero error al registrar el ingreso de stock: ' + (stockError.message || 'Error desconocido'))
              }
            } else {
              toast.success('Material creado, pero no se registró el stock (no se seleccionó almacén)')
            }
          }
          
          toast.success('Gasto agregado y material creado exitosamente')
        } catch (materialError: any) {
          console.error('Error creating material:', materialError)
          toast.error('Gasto agregado, pero error al crear el material: ' + (materialError.message || 'Error desconocido'))
        }
      } else {
        toast.success('Gasto agregado exitosamente')
      }
      
      setShowPreviewModal(false)
      setShowExpenseForm(false)
      setPreviewData(null)
      setPreviewReceiptFile(null)
      // Actualizar gráficos
      setRefreshKey((k) => k + 1)
    } catch (error) {
      console.error('Error adding expense:', error)
      toast.error('Error al agregar el gasto')
    }
  }

  const handleEditExpense = async (expenseData: any, receiptFile?: File) => {
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData)
        
        // Si hay un archivo de comprobante, subirlo
        if (receiptFile) {
          const receiptUrl = await uploadReceipt(receiptFile, editingExpense.id)
          // Actualizar el gasto con la URL del comprobante
          if (receiptUrl) {
            await updateExpense(editingExpense.id, {
              receipt_url: receiptUrl,
              receipt_filename: receiptFile.name
            })
          }
        }
        
        toast.success('Gasto actualizado exitosamente')
        setShowExpenseForm(false)
        setEditingExpense(null)
        // Actualizar gráficos
        setRefreshKey((k) => k + 1)
      }
    } catch (error) {
      console.error('Error updating expense:', error)
      toast.error('Error al actualizar el gasto')
    }
  }

  const handleCancelExpense = async (expenseId: number) => {
    if (confirm('¿Estás seguro de que quieres anular este gasto?')) {
      try {
        await cancelExpense(expenseId)
        toast.success('Gasto anulado exitosamente')
        // Actualizar gráficos
        setRefreshKey((k) => k + 1)
      } catch (error) {
        console.error('Error cancelling expense:', error)
        toast.error('Error al anular el gasto')
      }
    }
  }

  const handleViewReceipt = (expense: Expense) => {
    setSelectedExpense(expense)
    setShowReceiptModal(true)
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setShowExpenseForm(true)
  }

  const handleCardClick = (type: string) => {
    // Si ya está seleccionado, deseleccionar (mostrar todos)
    if (typeFilter === type) {
      setTypeFilter('all')
      setIvaFilter(false)
    } else {
      setTypeFilter(type)
      setIvaFilter(false)
    }
  }

  const handleIvaCardClick = () => {
    if (ivaFilter) {
      setIvaFilter(false)
      setTypeFilter('all')
    } else {
      setIvaFilter(true)
      setTypeFilter('all')
    }
  }

  const handleMonthClick = (month: number) => {
    // Convertir número de mes a string con padding (01, 02, etc.)
    const monthString = month.toString().padStart(2, '0')
    setMonthFilter(monthString)
    // Resetear filtro de categoría al filtrar por mes
    setTypeFilter('all')
    setIvaFilter(false)
    
    // Scroll suave hacia los filtros
    setTimeout(() => {
      const filtersElement = document.querySelector('[data-filters-section]')
      if (filtersElement) {
        filtersElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }
    }, 100)
  }

  const handleViewModeChange = (viewMode: 'document' | 'category') => {
    // Resetear todos los filtros al cambiar vista
    setTypeFilter('all')
    setMonthFilter('all')
    setIvaFilter(false)
    setDocumentTypeFilter('all')
  }

  const handleYearChangeWithReset = (year: number) => {
    if (year === 0) {
      setYearFilter('all')
    } else {
      setYearFilter(year.toString())
    }
    // Resetear todos los filtros al cambiar año
    setTypeFilter('all')
    setMonthFilter('all')
    setIvaFilter(false)
    setDocumentTypeFilter('all')
  }

  const handleCategoryClick = (category: string) => {
    setTypeFilter(category)
    setIvaFilter(false)
    setDocumentTypeFilter('all')
    // Resetear filtro de mes al filtrar por categoría
    setMonthFilter('all')
    
    // Scroll suave hacia los filtros
    setTimeout(() => {
      const filtersElement = document.querySelector('[data-filters-section]')
      if (filtersElement) {
        filtersElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }
    }, 100)
  }

  const handleMonthAndCategoryClick = (month: number, category: string) => {
    // Convertir número de mes a string con padding (01, 02, etc.)
    const monthString = month.toString().padStart(2, '0')
    setMonthFilter(monthString)
    setTypeFilter(category)
    setIvaFilter(false)
    setDocumentTypeFilter('all')
    
    // Scroll suave hacia los filtros
    setTimeout(() => {
      const filtersElement = document.querySelector('[data-filters-section]')
      if (filtersElement) {
        filtersElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }
    }, 100)
  }

  const handleDocumentTypeClick = (documentType: string) => {
    setDocumentTypeFilter(documentType)
    setMonthFilter('all')
    scrollToFilters()
  }

  const handleMonthAndDocumentTypeClick = (month: number, documentType: string) => {
    const monthString = month.toString().padStart(2, '0')
    setMonthFilter(monthString)
    setDocumentTypeFilter(documentType)
    scrollToFilters()
  }

  const scrollToFilters = () => {
    setTimeout(() => {
      const filtersElement = document.querySelector('[data-filters-section]')
      if (filtersElement) {
        filtersElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }
    }, 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-lg">Cargando gastos...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-red-400 text-lg">Error: {error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Gestión de Gastos</h1>
            <p className="text-slate-400">Administra los gastos de la empresa por categorías</p>
          </div>
          <Button
            onClick={() => setShowExpenseForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Gasto
          </Button>
        </div>

        {/* Project Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <label className="text-white font-medium">Proyecto:</label>
            <Select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white w-64"
            >
              <option value="all">Todos los proyectos</option>
              {projects.map(project => (
                <option key={project.id} value={project.id.toString()}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Chart */}
        <ExpenseChart 
          year={yearFilter === 'all' ? 0 : parseInt(yearFilter)} 
          projectId={projectFilterValue}
          refreshToken={refreshKey}
          onMonthClick={handleMonthClick} 
          onYearChange={handleYearChangeWithReset}
          onCategoryClick={handleCategoryClick}
          onMonthAndCategoryClick={handleMonthAndCategoryClick}
          onDocumentTypeClick={handleDocumentTypeClick}
          onMonthAndDocumentTypeClick={handleMonthAndDocumentTypeClick}
          onViewModeChange={handleViewModeChange}
        />

        {/* Stats */}
        <div className="space-y-4 mb-6">
          {/* Total Gastos dividido en dos mitades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mitad izquierda - Total Gastos */}
            <Card 
              className={`transition-all duration-200 border-2 cursor-pointer ${
                typeFilter === 'all' && !ivaFilter
                  ? 'bg-emerald-900/30 border-emerald-500 shadow-lg'
                  : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
              }`}
              onClick={() => handleCardClick('all')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      typeFilter === 'all' && !ivaFilter ? 'text-emerald-400' : 'text-slate-300'
                    }`}>
                      Total Gastos
                    </p>
                    <p className={`text-2xl font-bold ${
                      typeFilter === 'all' && !ivaFilter ? 'text-emerald-400' : 'text-slate-100'
                    }`}>
                      {stats ? formatPrice(stats.total_amount) : '$0'}
                    </p>
                  </div>
                  <DollarSign className={`w-12 h-12 ${
                    typeFilter === 'all' && !ivaFilter ? 'text-emerald-400' : 'text-slate-400'
                  }`} />
                </div>
              </CardContent>
            </Card>
            
            {/* Mitad derecha - IVA Recuperable */}
            <Card 
              className={`transition-all duration-200 border-2 cursor-pointer ${
                ivaFilter
                  ? 'bg-emerald-900/30 border-emerald-500 shadow-lg'
                  : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
              }`}
              onClick={handleIvaCardClick}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      ivaFilter ? 'text-emerald-400' : 'text-slate-300'
                    }`}>
                      IVA Recuperable
                    </p>
                    <p className={`text-2xl font-bold ${
                      ivaFilter ? 'text-emerald-400' : 'text-slate-100'
                    }`}>
                      {stats ? formatPrice(stats.recoverable_iva || 0) : '$0'}
                    </p>
                  </div>
                  <Calculator className={`w-12 h-12 ${
                    ivaFilter ? 'text-emerald-400' : 'text-slate-400'
                  }`} />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Categorías - Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card 
              className={`transition-all duration-200 border-2 cursor-pointer ${
                typeFilter === 'materiales'
                  ? 'bg-blue-900/30 border-blue-500 shadow-lg'
                  : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
              }`}
              onClick={() => handleCardClick('materiales')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      typeFilter === 'materiales' ? 'text-blue-400' : 'text-slate-300'
                    }`}>
                      Materiales
                    </p>
                    <p className={`${(stats?.materiales_amount || 0) >= 1000000 ? 'text-lg' : 'text-xl'} font-bold ${
                      typeFilter === 'materiales' ? 'text-blue-400' : 'text-slate-100'
                    }`}>
                      {stats ? formatPrice(stats.materiales_amount) : '$0'}
                    </p>
                  </div>
                  <Package className={`w-8 h-8 ${
                    typeFilter === 'materiales' ? 'text-blue-400' : 'text-slate-400'
                  }`} />
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className={`transition-all duration-200 border-2 cursor-pointer ${
                typeFilter === 'servicios'
                  ? 'bg-emerald-900/30 border-emerald-500 shadow-lg'
                  : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
              }`}
              onClick={() => handleCardClick('servicios')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      typeFilter === 'servicios' ? 'text-emerald-400' : 'text-slate-300'
                    }`}>
                      Servicios
                    </p>
                    <p className={`${(stats?.servicios_amount || 0) >= 1000000 ? 'text-lg' : 'text-xl'} font-bold ${
                      typeFilter === 'servicios' ? 'text-emerald-400' : 'text-slate-100'
                    }`}>
                      {stats ? formatPrice(stats.servicios_amount) : '$0'}
                    </p>
                  </div>
                  <Wrench className={`w-8 h-8 ${
                    typeFilter === 'servicios' ? 'text-emerald-400' : 'text-slate-400'
                  }`} />
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className={`transition-all duration-200 border-2 cursor-pointer ${
                typeFilter === 'epp'
                  ? 'bg-yellow-900/30 border-yellow-500 shadow-lg'
                  : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
              }`}
              onClick={() => handleCardClick('epp')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      typeFilter === 'epp' ? 'text-yellow-400' : 'text-slate-300'
                    }`}>
                      EPP
                    </p>
                    <p className={`${(stats?.epp_amount || 0) >= 1000000 ? 'text-lg' : 'text-xl'} font-bold ${
                      typeFilter === 'epp' ? 'text-yellow-400' : 'text-slate-100'
                    }`}>
                      {stats ? formatPrice(stats.epp_amount) : '$0'}
                    </p>
                  </div>
                  <Shield className={`w-8 h-8 ${
                    typeFilter === 'epp' ? 'text-yellow-400' : 'text-slate-400'
                  }`} />
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className={`transition-all duration-200 border-2 cursor-pointer ${
                typeFilter === 'combustible'
                  ? 'bg-orange-900/30 border-orange-500 shadow-lg'
                  : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
              }`}
              onClick={() => handleCardClick('combustible')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      typeFilter === 'combustible' ? 'text-orange-400' : 'text-slate-300'
                    }`}>
                      Combustible
                    </p>
                    <p className={`${(stats?.combustible_amount || 0) >= 1000000 ? 'text-lg' : 'text-xl'} font-bold ${
                      typeFilter === 'combustible' ? 'text-orange-400' : 'text-slate-100'
                    }`}>
                      {stats ? formatPrice(stats.combustible_amount) : '$0'}
                    </p>
                  </div>
                  <Fuel className={`w-8 h-8 ${
                    typeFilter === 'combustible' ? 'text-orange-400' : 'text-slate-400'
                  }`} />
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className={`transition-all duration-200 border-2 cursor-pointer ${
                typeFilter === 'herramientas'
                  ? 'bg-purple-900/30 border-purple-500 shadow-lg'
                  : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
              }`}
              onClick={() => handleCardClick('herramientas')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      typeFilter === 'herramientas' ? 'text-purple-400' : 'text-slate-300'
                    }`}>
                      Herramientas
                    </p>
                    <p className={`${(stats?.herramientas_amount || 0) >= 1000000 ? 'text-lg' : 'text-xl'} font-bold ${
                      typeFilter === 'herramientas' ? 'text-purple-400' : 'text-slate-100'
                    }`}>
                      {stats ? formatPrice(stats.herramientas_amount) : '$0'}
                    </p>
                  </div>
                  <Wrench className={`w-8 h-8 ${
                    typeFilter === 'herramientas' ? 'text-purple-400' : 'text-slate-400'
                  }`} />
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className={`transition-all duration-200 border-2 cursor-pointer ${
                typeFilter === 'otros'
                  ? 'bg-slate-600/30 border-slate-500 shadow-lg'
                  : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
              }`}
              onClick={() => handleCardClick('otros')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      typeFilter === 'otros' ? 'text-slate-300' : 'text-slate-300'
                    }`}>
                      Otros
                    </p>
                    <p className={`${(stats?.otros_amount || 0) >= 1000000 ? 'text-lg' : 'text-xl'} font-bold ${
                      typeFilter === 'otros' ? 'text-slate-300' : 'text-slate-100'
                    }`}>
                      {stats ? formatPrice(stats.otros_amount) : '$0'}
                    </p>
                  </div>
                  <FileText className={`w-8 h-8 ${
                    typeFilter === 'otros' ? 'text-slate-300' : 'text-slate-400'
                  }`} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col xl:flex-row gap-4 mb-6" data-filters-section>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nombre o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-600 text-white w-full"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap xl:flex-nowrap gap-3 xl:ml-4">
            <Select
              value={documentTypeFilter}
              onChange={(e) => setDocumentTypeFilter(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white w-44"
            >
              {documentTypes.map(docType => (
                <option key={docType.value} value={docType.value}>
                  {docType.label}
                </option>
              ))}
            </Select>
            
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white w-40"
            >
              {expenseTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
            
            <Select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white w-44"
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </Select>
            
            <Select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white w-32"
            >
              {years.map(year => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-4">
          {filteredExpenses.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No hay gastos</h3>
                <p className="text-slate-400 mb-4">No se encontraron gastos para los filtros seleccionados</p>
                <Button
                  onClick={() => setShowExpenseForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primer Gasto
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredExpenses.map((expense) => (
              <Card key={expense.id} className="bg-slate-800 border-slate-700 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <h3 className="text-xl font-semibold text-white">{expense.name}</h3>
                        <Badge className={getTypeColor(expense.type)}>
                          <span className="flex items-center space-x-1">
                            {getTypeIcon(expense.type)}
                            <span>{getTypeLabel(expense.type)}</span>
                          </span>
                        </Badge>
                        <Badge 
                          className={`text-white capitalize ${
                            expense.document_type === 'factura' 
                              ? 'bg-blue-500 text-white border-blue-500' 
                              : 'bg-gray-500 text-white border-gray-500'
                          }`}
                        >
                          {expense.document_type}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-slate-400">Fecha</p>
                            <p className="text-sm text-white">{formatDate(expense.date)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 text-slate-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-slate-400">Total</p>
                            <p className="text-sm text-white font-semibold">{formatPrice(expense.total_amount)}</p>
                          </div>
                        </div>
                        
                        {(expense.quantity || (expense.type === 'materiales' && expense.quantity === null)) && (
                          <div className="flex items-center">
                            <Package className="w-4 h-4 text-slate-400 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-slate-400">Cantidad</p>
                              <p className="text-sm text-white">
                                {expense.type === 'materiales' && expense.quantity === null 
                                  ? 'revisar catálogo de materiales' 
                                  : `${expense.quantity} unidades`}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-slate-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-slate-400">Proveedor</p>
                            <p className="text-sm text-white">{expense.supplier}</p>
                          </div>
                        </div>
                      </div>
                      
                      {expense.description && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-slate-400 mb-1">Descripción</p>
                          <p className="text-sm text-white">{expense.description}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      {expense.receipt_url && (
                        <Button
                          onClick={() => handleViewReceipt(expense)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2"
                          title="Ver Comprobante"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        onClick={() => handleEdit(expense)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white p-2"
                        title="Editar"
                      >
                        <Wrench className="w-4 h-4" />
                      </Button>
                      {expense.status === 'active' && (
                        <Button
                          onClick={() => handleCancelExpense(expense.id)}
                          className="bg-red-600 hover:bg-red-700 text-white p-2"
                          title="Anular"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {showExpenseForm && (
        <ExpenseForm
          expense={editingExpense}
          onSave={editingExpense ? handleEditExpense : handleConfirmExpense}
          onPreview={editingExpense ? undefined : handlePreviewExpense}
          onClose={() => {
            setShowExpenseForm(false)
            setEditingExpense(null)
          }}
        />
      )}

      {showPreviewModal && previewData && (
        <ExpensePreviewModal
          expense={previewData}
          receiptFile={previewReceiptFile || undefined}
          onConfirm={handleConfirmExpense}
          onCancel={() => {
            setShowPreviewModal(false)
            setPreviewData(null)
            setPreviewReceiptFile(null)
          }}
        />
      )}

      {showReceiptModal && selectedExpense && (
        <ReceiptModal
          expense={selectedExpense}
          onClose={() => {
            setShowReceiptModal(false)
            setSelectedExpense(null)
          }}
        />
      )}
    </div>
  )
}