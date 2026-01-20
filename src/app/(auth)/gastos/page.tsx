'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Filter, Calendar, DollarSign, Package, Wrench, Shield, Fuel, FileText, X, Calculator, XCircle, Trash2, Briefcase, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ExpenseForm } from '@/components/expenses/ExpenseForm'
import { ReceiptModal } from '@/components/expenses/ReceiptModal'
import { ExpensePreviewModal } from '@/components/expenses/ExpensePreviewModal'
import { ExpenseChart } from '@/components/expenses/ExpenseChart'
import { ExpenseFiltersSidebar } from '@/components/expenses/ExpenseFiltersSidebar'
import { ExpenseDetailModal } from '@/components/expenses/ExpenseDetailModal'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
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
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false)

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
  } = useExpenses() // Fetch all expenses initially
  const { projects } = useProjects()
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewReceiptFile, setPreviewReceiptFile] = useState<File | null>(null)
  const [ivaFilter, setIvaFilter] = useState(false)
  const [showChart, setShowChart] = useState(true)
  const [confirmDeleteExpenseState, setConfirmDeleteExpenseState] = useState<{ isOpen: boolean, expenseId: number | null }>({ isOpen: false, expenseId: null })
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedExpenseForDetail, setSelectedExpenseForDetail] = useState<Expense | null>(null)

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

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
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

      // Filtro por proyecto (Client-side)
      let matchesProject = true
      if (projectFilter !== 'all') {
        matchesProject = expense.project_id === parseInt(projectFilter)
      }

      return matchesSearch && matchesType && matchesDate && matchesIva && matchesDocumentType && matchesProject
    })
  }, [expenses, searchTerm, ivaFilter, typeFilter, yearFilter, monthFilter, documentTypeFilter, projectFilter])

  // Calcular estadísticas en el cliente basado en los gastos filtrados
  const clientStats = useMemo(() => {
    const initialStats = {
      total_amount: 0,
      recoverable_iva: 0,
      materiales_amount: 0,
      servicios_amount: 0,
      epp_amount: 0,
      combustible_amount: 0,
      herramientas_amount: 0,
      otros_amount: 0
    }

    return filteredExpenses.reduce((acc, expense) => {
      // Solo sumar montos de gastos activos (no anulados)
      if (expense.status === 'active') {
        acc.total_amount += expense.total_amount

        // Sumar IVA recuperable si es factura
        if (expense.document_type === 'factura') {
          acc.recoverable_iva += expense.iva_amount
        }

        // Sumar por categoría
        switch (expense.type) {
          case 'materiales':
            acc.materiales_amount += expense.total_amount
            break
          case 'servicios':
            acc.servicios_amount += expense.total_amount
            break
          case 'epp':
            acc.epp_amount += expense.total_amount
            break
          case 'combustible':
            acc.combustible_amount += expense.total_amount
            break
          case 'herramientas':
            acc.herramientas_amount += expense.total_amount
            break
          case 'otros':
            acc.otros_amount += expense.total_amount
            break
        }
      }
      return acc
    }, initialStats)
  }, [filteredExpenses])

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
                is_active: true,
                project_id: previewData.project_id || null
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
            is_active: true,
            project_id: previewData.project_id || null
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

  const handleCancelExpense = (expenseId: number) => {
    setConfirmDeleteExpenseState({ isOpen: true, expenseId })
  }

  const executeCancelExpense = async () => {
    if (!confirmDeleteExpenseState.expenseId) return

    try {
      await cancelExpense(confirmDeleteExpenseState.expenseId)
      toast.success('Gasto anulado exitosamente')
      setConfirmDeleteExpenseState({ isOpen: false, expenseId: null })
      // Actualizar gráficos
      setRefreshKey((k) => k + 1)
    } catch (error) {
      console.error('Error cancelling expense:', error)
      toast.error('Error al anular el gasto')
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

  const handleViewDetail = (expense: Expense) => {
    setSelectedExpenseForDetail(expense)
    setShowDetailModal(true)
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
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-yellow-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Gestión de Gastos</h1>
              <p className="text-slate-400">Administra los gastos de la empresa por categorías</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">


            <Button
              variant="outline"
              onClick={() => setIsFilterSidebarOpen(true)}
              className="flex items-center gap-2 border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors flex-1 sm:flex-none justify-center"
            >
              <Filter className="w-5 h-5" />
              Filtros
              {(projectFilter !== 'all' || monthFilter !== 'all' || yearFilter !== 'all' || typeFilter !== 'all' || documentTypeFilter !== 'all' || ivaFilter) && (
                <span className="ml-1 bg-blue-500/20 text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-500/30">
                  !
                </span>
              )}
            </Button>

            {(projectFilter !== 'all' || monthFilter !== 'all' || yearFilter !== 'all' || typeFilter !== 'all' || documentTypeFilter !== 'all' || ivaFilter) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setProjectFilter('all')
                  setMonthFilter('all')
                  setYearFilter('all')
                  setTypeFilter('all')
                  setDocumentTypeFilter('all')
                  setIvaFilter(false)
                }}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
                title="Limpiar filtros"
              >
                <XCircle className="w-5 h-5" />
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChart(!showChart)}
              className={`text-xs ${showChart ? 'bg-slate-700' : ''} flex-1 sm:flex-none justify-center`}
            >
              {showChart ? 'Ocultar' : 'Gráfico'}
            </Button>

            <Button
              onClick={() => setShowExpenseForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </div>
        </div>

        {/* Chart */}
        {showChart && (
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
        )}

        {/* Stats */}
        <div className="space-y-4 mb-6">
          {/* Total Gastos dividido en dos mitades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mitad izquierda - Total Gastos */}
            <Card
              className={`transition-all duration-200 border-2 cursor-pointer ${typeFilter === 'all' && !ivaFilter
                ? 'bg-emerald-900/30 border-emerald-500 shadow-lg'
                : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                }`}
              onClick={() => handleCardClick('all')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${typeFilter === 'all' && !ivaFilter ? 'text-emerald-400' : 'text-slate-300'
                      }`}>
                      Total Gastos
                    </p>
                    <p className={`text-2xl font-bold ${typeFilter === 'all' && !ivaFilter ? 'text-emerald-400' : 'text-slate-100'
                      }`}>
                      {formatPrice(clientStats.total_amount)}
                    </p>
                  </div>
                  <DollarSign className={`w-12 h-12 ${typeFilter === 'all' && !ivaFilter ? 'text-emerald-400' : 'text-slate-400'
                    }`} />
                </div>
              </CardContent>
            </Card>

            {/* Mitad derecha - IVA Recuperable */}
            <Card
              className={`transition-all duration-200 border-2 cursor-pointer ${ivaFilter
                ? 'bg-emerald-900/30 border-emerald-500 shadow-lg'
                : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                }`}
              onClick={handleIvaCardClick}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${ivaFilter ? 'text-emerald-400' : 'text-slate-300'
                      }`}>
                      IVA Recuperable
                    </p>
                    <p className={`text-2xl font-bold ${ivaFilter ? 'text-emerald-400' : 'text-slate-100'
                      }`}>
                      {formatPrice(clientStats.recoverable_iva)}
                    </p>
                  </div>
                  <Calculator className={`w-12 h-12 ${ivaFilter ? 'text-emerald-400' : 'text-slate-400'
                    }`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Categorías - Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card
              className={`transition-all duration-200 border-2 cursor-pointer ${typeFilter === 'materiales'
                ? 'bg-blue-900/30 border-blue-500 shadow-lg'
                : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                }`}
              onClick={() => handleCardClick('materiales')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${typeFilter === 'materiales' ? 'text-blue-400' : 'text-slate-300'
                      }`}>
                      Materiales
                    </p>
                    <p className={`${(stats?.materiales_amount || 0) >= 1000000 ? 'text-lg' : 'text-xl'} font-bold ${typeFilter === 'materiales' ? 'text-blue-400' : 'text-slate-100'
                      }`}>
                      {formatPrice(clientStats.materiales_amount)}
                    </p>
                  </div>
                  <Package className={`w-8 h-8 ${typeFilter === 'materiales' ? 'text-blue-400' : 'text-slate-400'
                    }`} />
                </div>
              </CardContent>
            </Card>

            <Card
              className={`transition-all duration-200 border-2 cursor-pointer ${typeFilter === 'servicios'
                ? 'bg-emerald-900/30 border-emerald-500 shadow-lg'
                : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                }`}
              onClick={() => handleCardClick('servicios')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${typeFilter === 'servicios' ? 'text-emerald-400' : 'text-slate-300'
                      }`}>
                      Servicios
                    </p>
                    <p className={`${(stats?.servicios_amount || 0) >= 1000000 ? 'text-lg' : 'text-xl'} font-bold ${typeFilter === 'servicios' ? 'text-emerald-400' : 'text-slate-100'
                      }`}>
                      {formatPrice(clientStats.servicios_amount)}
                    </p>
                  </div>
                  <Wrench className={`w-8 h-8 ${typeFilter === 'servicios' ? 'text-emerald-400' : 'text-slate-400'
                    }`} />
                </div>
              </CardContent>
            </Card>

            <Card
              className={`transition-all duration-200 border-2 cursor-pointer ${typeFilter === 'epp'
                ? 'bg-yellow-900/30 border-yellow-500 shadow-lg'
                : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                }`}
              onClick={() => handleCardClick('epp')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${typeFilter === 'epp' ? 'text-yellow-400' : 'text-slate-300'
                      }`}>
                      EPP
                    </p>
                    <p className={`${(stats?.epp_amount || 0) >= 1000000 ? 'text-lg' : 'text-xl'} font-bold ${typeFilter === 'epp' ? 'text-yellow-400' : 'text-slate-100'
                      }`}>
                      {formatPrice(clientStats.epp_amount)}
                    </p>
                  </div>
                  <Shield className={`w-8 h-8 ${typeFilter === 'epp' ? 'text-yellow-400' : 'text-slate-400'
                    }`} />
                </div>
              </CardContent>
            </Card>

            <Card
              className={`transition-all duration-200 border-2 cursor-pointer ${typeFilter === 'combustible'
                ? 'bg-orange-900/30 border-orange-500 shadow-lg'
                : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                }`}
              onClick={() => handleCardClick('combustible')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${typeFilter === 'combustible' ? 'text-orange-400' : 'text-slate-300'
                      }`}>
                      Combustible
                    </p>
                    <p className={`${(stats?.combustible_amount || 0) >= 1000000 ? 'text-lg' : 'text-xl'} font-bold ${typeFilter === 'combustible' ? 'text-orange-400' : 'text-slate-100'
                      }`}>
                      {formatPrice(clientStats.combustible_amount)}
                    </p>
                  </div>
                  <Fuel className={`w-8 h-8 ${typeFilter === 'combustible' ? 'text-orange-400' : 'text-slate-400'
                    }`} />
                </div>
              </CardContent>
            </Card>

            <Card
              className={`transition-all duration-200 border-2 cursor-pointer ${typeFilter === 'herramientas'
                ? 'bg-purple-900/30 border-purple-500 shadow-lg'
                : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                }`}
              onClick={() => handleCardClick('herramientas')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${typeFilter === 'herramientas' ? 'text-purple-400' : 'text-slate-300'
                      }`}>
                      Herramientas
                    </p>
                    <p className={`${(stats?.herramientas_amount || 0) >= 1000000 ? 'text-lg' : 'text-xl'} font-bold ${typeFilter === 'herramientas' ? 'text-purple-400' : 'text-slate-100'
                      }`}>
                      {formatPrice(clientStats.herramientas_amount)}
                    </p>
                  </div>
                  <Wrench className={`w-8 h-8 ${typeFilter === 'herramientas' ? 'text-purple-400' : 'text-slate-400'
                    }`} />
                </div>
              </CardContent>
            </Card>

            <Card
              className={`transition-all duration-200 border-2 cursor-pointer ${typeFilter === 'otros'
                ? 'bg-slate-600/30 border-slate-500 shadow-lg'
                : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                }`}
              onClick={() => handleCardClick('otros')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${typeFilter === 'otros' ? 'text-slate-300' : 'text-slate-300'
                      }`}>
                      Otros
                    </p>
                    <p className={`${(stats?.otros_amount || 0) >= 1000000 ? 'text-lg' : 'text-xl'} font-bold ${typeFilter === 'otros' ? 'text-slate-300' : 'text-slate-100'
                      }`}>
                      {formatPrice(clientStats.otros_amount)}
                    </p>
                  </div>
                  <FileText className={`w-8 h-8 ${typeFilter === 'otros' ? 'text-slate-300' : 'text-slate-400'
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
              <Card key={expense.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all hover:shadow-md group">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    {/* Left Column: Main Info */}
                    <div className="flex-1 min-w-0 space-y-1 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-white truncate pr-2">{expense.name}</h3>
                        <div className="flex flex-wrap gap-1.5 shrink-0">
                          <Badge className={`${getTypeColor(expense.type)} text-[10px] px-2 py-0 border-0`}>
                            <span className="flex items-center gap-1">
                              {getTypeIcon(expense.type)}
                              <span>{getTypeLabel(expense.type)}</span>
                            </span>
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0 capitalize ${expense.document_type === 'factura'
                              ? 'text-blue-400 border-blue-500/50 bg-blue-500/10'
                              : 'text-slate-400 border-slate-600'
                              }`}
                          >
                            {expense.document_type}
                          </Badge>
                          {expense.project_id && (
                            <Badge variant="outline" className="text-slate-400 border-slate-600 text-[10px] px-2 py-0 bg-slate-700/50 flex items-center gap-1 max-w-[150px]">
                              <Briefcase className="w-3 h-3" />
                              <span className="truncate">
                                {projects.find(p => p.id === expense.project_id)?.name}
                              </span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(expense.date)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[200px]" title={expense.supplier}>
                            {expense.supplier}
                          </span>
                        </span>
                        {(expense.quantity || (expense.type === 'materiales' && expense.quantity === null)) && (
                          <span className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5" />
                            {expense.type === 'materiales' && expense.quantity === null
                              ? 'Catálogo'
                              : `${expense.quantity} u.`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Amount & Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-2 md:mt-0 pl-0 md:pl-4 border-t md:border-t-0 border-slate-700 pt-3 md:pt-0">
                      <div className="text-left md:text-right">
                        <p className="text-sm text-slate-400">Total</p>
                        <p className="text-lg font-bold text-white tracking-tight">{formatPrice(expense.total_amount)}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(expense)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                          title="Ver Detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(expense)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10"
                          title="Editar"
                        >
                          <Wrench className="w-4 h-4" />
                        </Button>
                        {expense.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelExpense(expense.id)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                            title="Anular"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
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

      {showDetailModal && selectedExpenseForDetail && (
        <ExpenseDetailModal
          expense={selectedExpenseForDetail}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedExpenseForDetail(null)
          }}
        />
      )}

      <ExpenseFiltersSidebar
        isOpen={isFilterSidebarOpen}
        onClose={() => setIsFilterSidebarOpen(false)}
        projectFilter={projectFilter}
        onProjectChange={setProjectFilter}
        monthFilter={monthFilter}
        onMonthChange={setMonthFilter}
        yearFilter={yearFilter}
        onYearChange={setYearFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        documentTypeFilter={documentTypeFilter}
        onDocumentTypeChange={setDocumentTypeFilter}
        ivaFilter={ivaFilter}
        onIvaChange={setIvaFilter}
        projects={projects}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDeleteExpenseState.isOpen}
        onClose={() => setConfirmDeleteExpenseState({ isOpen: false, expenseId: null })}
        onConfirm={executeCancelExpense}
        title="Anular Gasto"
        message="¿Estás seguro de que quieres anular este gasto?"
        confirmText="Anular"
        type="danger"
      />
    </div>
  )
}