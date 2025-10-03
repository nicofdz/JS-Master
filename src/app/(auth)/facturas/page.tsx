'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { InvoiceUpload } from '@/components/invoices/InvoiceUpload'
import { InvoiceList } from '@/components/invoices/InvoiceList'
import { InvoiceStats } from '@/components/invoices/InvoiceStats'
import { InvoiceEditModal } from '@/components/invoices/InvoiceEditModal'
import { useInvoices } from '@/hooks/useInvoices'
import { InvoiceIncome } from '@/hooks/useInvoices'
import { useIncomeTracking } from '@/hooks/useIncomeTracking'
import toast from 'react-hot-toast'

export default function FacturasPage() {
  const [showUpload, setShowUpload] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceIncome | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
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
  const stats = getInvoiceStats()

  // Filtrar facturas procesadas del mes seleccionado
  const getMonthlyIncome = () => {
    const monthlyInvoices = invoices.filter(inv => {
      if (inv.status !== 'processed' || !inv.issue_date) return false
      
      const invoiceDate = new Date(inv.issue_date)
      return invoiceDate.getMonth() + 1 === selectedMonth && 
             invoiceDate.getFullYear() === selectedYear
    })

    // Calcular totales usando la fórmula: (Neto - 6%) - IVA
    let totalRealIncome = 0
    let totalNet = 0
    let totalIva = 0
    
    monthlyInvoices.forEach(inv => {
      const netAmount = inv.net_amount || 0
      const ivaAmount = inv.iva_amount || 0
      
      // Neto con descuento del 6%
      const netAfterDiscount = netAmount * 0.94
      
      // Total real = (Neto - 6%) - IVA
      const realIncome = netAfterDiscount - ivaAmount
      
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
    const processedInvoices = invoices.filter(inv => inv.status === 'processed')
    
    let totalRealIncome = 0
    
    processedInvoices.forEach(inv => {
      const netAmount = inv.net_amount || 0
      const ivaAmount = inv.iva_amount || 0
      
      // Neto con descuento del 6%
      const netAfterDiscount = netAmount * 0.94
      
      // Total real = (Neto - 6%) - IVA
      const realIncome = netAfterDiscount - ivaAmount
      
      totalRealIncome += realIncome
    })
    
    return totalRealIncome
  }

  const totalRealIncome = getTotalRealIncome()

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


  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-300">Cargando facturas...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
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
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
                Gestión de Facturas
              </h1>
              <p className="text-slate-300">
                Administra las facturas de ingresos y calcula pagos a trabajadores
              </p>
            </div>
            <Button
              onClick={() => setShowUpload(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              + Nueva Factura
            </Button>
          </div>
        </div>

        {/* Selector de Mes/Año */}
        <div className="mb-6 bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 text-sm font-medium">Período:</span>
            </div>
            <div className="flex gap-4">
              <div>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1).toLocaleDateString('es-CL', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="mb-8">
          <InvoiceStats 
            stats={stats} 
            incomeData={monthlyIncome}
            incomeLoading={false}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            totalRealIncome={totalRealIncome}
          />
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


        {/* Lista de Facturas */}
        <InvoiceList
          invoices={invoices}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewPDF={handleViewPDF}
          onStatusChange={handleStatusChange}
        />

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
    </div>
  )
}
