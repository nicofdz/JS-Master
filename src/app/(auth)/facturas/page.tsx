'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { InvoiceUpload } from '@/components/invoices/InvoiceUpload'
import { InvoiceList } from '@/components/invoices/InvoiceList'
import { InvoiceStats } from '@/components/invoices/InvoiceStats'
import { InvoiceChart } from '@/components/invoices/InvoiceChart'
import { InvoiceEditModal } from '@/components/invoices/InvoiceEditModal'
import { useProjects } from '@/hooks/useProjects'
import { useInvoices } from '@/hooks/useInvoices'
import { InvoiceIncome } from '@/hooks/useInvoices'
import { useIncomeTracking } from '@/hooks/useIncomeTracking'
import toast from 'react-hot-toast'

export default function FacturasPage() {
  const [showUpload, setShowUpload] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceIncome | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all')
  const [selectedYear, setSelectedYear] = useState(0) // 0 = Todos los años
  const [projectFilter, setProjectFilter] = useState('all')
  const [chartYear, setChartYear] = useState(0)
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'processed' | 'pending'>('all')

  const {
    invoices,
    loading,
    error,
    getInvoiceStats,
    deleteInvoice,
    updateInvoice,
    fetchInvoices
  } = useInvoices()

  const { refreshIncomeTracking, incomeData } = useIncomeTracking()
  const { projects } = useProjects()
  const stats = getInvoiceStats()

  // Sincronizar el año del gráfico con el año seleccionado
  useEffect(() => {
    setChartYear(selectedYear)
  }, [selectedYear])

  // Filtrar facturas procesadas del mes seleccionado
  const getMonthlyIncome = () => {
    console.log('📊 Calculando ingresos mensuales:', { selectedMonth, selectedYear, projectFilter })

    const monthlyInvoices = invoices.filter(inv => {
      if (inv.status !== 'processed' || !inv.issue_date) return false

      // Filtro por proyecto
      const projectId = projectFilter !== 'all' ? parseInt(projectFilter) : null
      if (projectId && inv.project_id !== projectId) return false

      const invoiceDate = new Date(inv.issue_date)

      // Si se selecciona "all" en meses, mostrar todos los meses del año
      if (selectedMonth === 'all') {
        // Si también es "todos los años", mostrar todo
        if (selectedYear === 0) {
          console.log('✅ Incluyendo factura (todos los meses, todos los años):', inv.invoice_number)
          return true
        }
        const yearMatch = invoiceDate.getFullYear() === selectedYear
        console.log(`🔍 Factura ${inv.invoice_number} - Año ${invoiceDate.getFullYear()} vs ${selectedYear}: ${yearMatch}`)
        return yearMatch
      }

      // Si no, usar el filtro de mes normal
      if (selectedYear === 0) {
        // Si es "todos los años", solo filtrar por mes
        const monthMatch = invoiceDate.getMonth() + 1 === selectedMonth
        console.log(`🔍 Factura ${inv.invoice_number} - Mes ${invoiceDate.getMonth() + 1} vs ${selectedMonth}: ${monthMatch}`)
        return monthMatch
      }

      const monthMatch = invoiceDate.getMonth() + 1 === selectedMonth
      const yearMatch = invoiceDate.getFullYear() === selectedYear
      console.log(`🔍 Factura ${inv.invoice_number} - Mes ${invoiceDate.getMonth() + 1} vs ${selectedMonth}, Año ${invoiceDate.getFullYear()} vs ${selectedYear}: ${monthMatch && yearMatch}`)
      return monthMatch && yearMatch
    })

    console.log(`📈 Facturas filtradas: ${monthlyInvoices.length} de ${invoices.length}`)

    // Calcular totales usando las nuevas fórmulas
    let totalRealIncome = 0
    let totalNet = 0
    let totalIva = 0

    monthlyInvoices.forEach(inv => {
      const netAmount = inv.net_amount || 0
      const ivaAmount = inv.iva_amount || 0

      // Total factura = Neto + IVA
      const totalFactura = netAmount + ivaAmount

      // PPM = Total factura * 0.06
      const ppm = totalFactura * 0.06

      // Total real = Neto - PPM
      const realIncome = netAmount - ppm

      totalRealIncome += realIncome
      totalNet += netAmount
      totalIva += ivaAmount
    })

    const count = monthlyInvoices.length

    return {
      total_income: totalRealIncome,
      total_net: totalNet,
      total_iva: totalIva,
      processed_invoices_count: count,
      total_spent_on_payments: 0 // No se usa en el componente
    }
  }

  const monthlyIncome = getMonthlyIncome()

  // Calcular el ingreso total real de TODAS las facturas procesadas (para dinero disponible)
  const getTotalRealIncome = () => {
    const processedInvoices = invoices.filter(inv => {
      if (inv.status !== 'processed') return false

      // Filtro por proyecto
      const projectId = projectFilter !== 'all' ? parseInt(projectFilter) : null
      if (projectId && inv.project_id !== projectId) return false

      return true
    })

    let totalRealIncome = 0

    processedInvoices.forEach(inv => {
      const netAmount = inv.net_amount || 0
      const ivaAmount = inv.iva_amount || 0

      // Total factura = Neto + IVA
      const totalFactura = netAmount + ivaAmount

      // PPM = Total factura * 0.06
      const ppm = totalFactura * 0.06

      // Total real = Neto - PPM
      const realIncome = netAmount - ppm

      totalRealIncome += realIncome
    })

    return totalRealIncome
  }

  const totalRealIncome = getTotalRealIncome()

  // Filtrar facturas por mes y año para la lista
  const getFilteredInvoices = () => {
    return invoices.filter(inv => {
      if (!inv.issue_date) return false

      // Filtro por proyecto
      const projectId = projectFilter !== 'all' ? parseInt(projectFilter) : null
      if (projectId && inv.project_id !== projectId) return false

      const invoiceDate = new Date(inv.issue_date)

      // Si se selecciona "all" en meses, mostrar todos los meses del año
      if (selectedMonth === 'all') {
        // Si también es "todos los años", mostrar todo
        if (selectedYear === 0) {
          return true
        }
        return invoiceDate.getFullYear() === selectedYear
      }

      // Si no, usar el filtro de mes normal
      if (selectedYear === 0) {
        // Si es "todos los años", solo filtrar por mes
        return invoiceDate.getMonth() + 1 === selectedMonth
      }

      return invoiceDate.getMonth() + 1 === selectedMonth &&
        invoiceDate.getFullYear() === selectedYear
    })
  }

  const filteredInvoices = getFilteredInvoices()

  // Calcular estadísticas basadas en las facturas filtradas (por mes/año/proyecto)
  const getFilteredStats = () => {
    const total = filteredInvoices.length
    const processed = filteredInvoices.filter(inv => inv.status === 'processed').length
    const pending = filteredInvoices.filter(inv => inv.status === 'pending').length
    const blocked = filteredInvoices.filter(inv => inv.status === 'blocked').length

    // Ingresos reales (solo facturas procesadas del filtro)
    const processedInvoices = filteredInvoices.filter(inv => inv.status === 'processed')
    const realIncomeAmount = processedInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const realIncomeNet = processedInvoices.reduce((sum, inv) => sum + (inv.net_amount || 0), 0)
    const realIncomeIva = processedInvoices.reduce((sum, inv) => sum + (inv.iva_amount || 0), 0)

    // Total de todas las facturas filtradas (para referencia)
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const totalNet = filteredInvoices.reduce((sum, inv) => sum + (inv.net_amount || 0), 0)
    const totalIva = filteredInvoices.reduce((sum, inv) => sum + (inv.iva_amount || 0), 0)

    return {
      total,
      processed,
      pending,
      blocked,
      totalAmount,
      totalNet,
      totalIva,
      realIncomeAmount,
      realIncomeNet,
      realIncomeIva
    }
  }

  const filteredStats = getFilteredStats()

  const handleUploadSuccess = async () => {
    setShowUpload(false)
    await fetchInvoices()
    await refreshIncomeTracking()
  }


  const handleEdit = (invoice: InvoiceIncome) => {
    setSelectedInvoice(invoice)
    setShowEditModal(true)
  }


  const handleStatusChange = async (invoiceId: number, newStatus: string) => {
    try {
      await updateInvoice(invoiceId, {
        status: newStatus,
        is_processed: newStatus === 'processed',
        processed_at: newStatus === 'processed' ? new Date().toISOString() : null
      })

      // Refrescar el tracking de ingresos cuando cambia el estado
      await refreshIncomeTracking()

      // Mostrar notificación según el estado
      const statusMessages = {
        'pending': 'Factura marcada como pendiente',
        'processed': 'Factura procesada exitosamente',
        'blocked': 'Factura bloqueada'
      }

      toast.success(statusMessages[newStatus as keyof typeof statusMessages] || 'Estado actualizado')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Error al actualizar el estado')
    }
  }

  const handleSaveEdit = async (updatedData: Partial<InvoiceIncome>) => {
    if (!selectedInvoice) return

    try {
      await updateInvoice(selectedInvoice.id, updatedData)
      await refreshIncomeTracking()
      toast.success('Factura actualizada exitosamente')
      setShowEditModal(false)
      setSelectedInvoice(null)
    } catch (error) {
      console.error('Error updating invoice:', error)
      toast.error('Error al actualizar la factura')
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta factura?')) {
      try {
        await deleteInvoice(id)
        await refreshIncomeTracking()
        toast.success('Factura eliminada exitosamente')
      } catch (error) {
        toast.error('Error al eliminar la factura')
      }
    }
  }

  const handleViewPDF = (url: string) => {
    window.open(url, '_blank')
  }

  const handleMonthClick = (month: number) => {
    console.log('🖱️ Click en mes del gráfico:', month)
    setSelectedMonth(month)
    // Sincronizar el año del gráfico con el año seleccionado
    setChartYear(selectedYear)
    scrollToFilters()
  }

  const handleYearChange = (year: number) => {
    setSelectedYear(year)
    setSelectedMonth('all')  // Resetear a "Todos los meses" al cambiar el año
  }

  const scrollToFilters = () => {
    const filtersSection = document.querySelector('[data-filters-section]')
    if (filtersSection) {
      filtersSection.scrollIntoView({ behavior: 'smooth' })
    }
  }


  const [showFilters, setShowFilters] = useState(true)
  const [showChart, setShowChart] = useState(true)

  if (loading) {
    return (
      <div className="p-4 sm:p-6 w-full">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Cargando facturas...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 w-full">
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
          <div className="flex">
            <span className="text-red-400 mr-2">⚠️</span>
            <div>
              <h3 className="text-red-300 font-medium">Error al cargar facturas</h3>
              <p className="text-red-400 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 w-full h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-100">
            Gestión de Facturas
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`text-xs ${showFilters ? 'bg-slate-700' : ''}`}
            >
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChart(!showChart)}
              className={`text-xs ${showChart ? 'bg-slate-700' : ''}`}
            >
              {showChart ? 'Ocultar Gráfico' : 'Mostrar Gráfico'}
            </Button>
          </div>
        </div>
        <Button
          onClick={() => setShowUpload(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Nueva Factura
        </Button>
      </div>

      <div className="flex gap-4 h-full overflow-hidden">
        {/* Sidebar de Filtros */}
        <div className={`transition-all duration-300 ease-in-out ${showFilters ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'
          } shrink-0 flex flex-col gap-4`}>

          {/* Filtro de Proyecto */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <label className="text-slate-400 text-xs font-medium mb-2 block">Proyecto</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 text-slate-100 text-sm rounded focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos los proyectos</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id.toString()}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Período */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <label className="text-slate-400 text-xs font-medium mb-2 block">Período</label>
            <div className="space-y-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 text-slate-100 text-sm rounded focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Todos los meses</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleDateString('es-CL', { month: 'long' })}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 text-slate-100 text-sm rounded focus:ring-1 focus:ring-blue-500"
              >
                <option value={0}>Todos los años</option>
                {Array.from({ length: 4 }, (_, i) => 2023 + i).map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estadísticas Compactas Lateral (Opcional, si se quiere mover algo aquí) */}
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-w-0 pr-2">

          {/* Gráfico Desplegable */}
          {showChart && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-2 shrink-0">
              <InvoiceChart
                projectId={projectFilter !== 'all' ? parseInt(projectFilter) : undefined}
                onMonthClick={handleMonthClick}
                onYearChange={handleYearChange}
              />
            </div>
          )}

          {/* Estadísticas */}
          <div className="shrink-0">
            <InvoiceStats
              stats={filteredStats}
              incomeData={monthlyIncome}
              incomeLoading={false}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              totalRealIncome={totalRealIncome}
              showAllMonths={selectedMonth === 'all'}
              statusFilter={invoiceStatusFilter}
              onStatusFilterChange={setInvoiceStatusFilter}
            />
          </div>

          {/* Lista de Facturas */}
          <div className="flex-1 min-h-[400px]">
            <InvoiceList
              invoices={filteredInvoices}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewPDF={handleViewPDF}
              onStatusChange={handleStatusChange}
              externalStatusFilter={invoiceStatusFilter}
            />
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-100">Subir Nueva Factura</h2>
                <Button
                  variant="outline"
                  onClick={() => setShowUpload(false)}
                  className="text-slate-300 hover:text-slate-100"
                >
                  ✕
                </Button>
              </div>
              <InvoiceUpload onUploadSuccess={handleUploadSuccess} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      <InvoiceEditModal
        invoice={selectedInvoice}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedInvoice(null)
        }}
        onSave={handleSaveEdit}
      />
    </div>
  )
}
