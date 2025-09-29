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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando facturas...</p>
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <span className="text-red-500 mr-2">⚠️</span>
              <div>
                <h3 className="text-red-800 font-medium">Error al cargar facturas</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Gestión de Facturas
              </h1>
              <p className="text-gray-600">
                Administra las facturas de ingresos y calcula pagos a trabajadores
              </p>
            </div>
            <Button
              onClick={() => setShowUpload(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              + Nueva Factura
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="mb-8">
          <InvoiceStats 
            stats={stats} 
            incomeData={incomeData}
            incomeLoading={false}
          />
        </div>


        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Subir Nueva Factura</h2>
                  <Button
                    variant="outline"
                    onClick={() => setShowUpload(false)}
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
