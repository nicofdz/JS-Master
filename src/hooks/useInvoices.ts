'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface InvoiceIncome {
  id: number
  project_id: number
  issuer_name: string | null
  issuer_rut: string | null
  issuer_address: string | null
  issuer_email: string | null
  issuer_phone: string | null
  client_name: string | null
  client_rut: string | null
  client_address: string | null
  client_city: string | null
  invoice_number: string | null
  issue_date: string | null
  sii_office: string | null
  invoice_type: string | null
  description: string | null
  contract_number: string | null
  contract_date: string | null
  payment_method: string | null
  net_amount: number | null
  iva_percentage: number | null
  iva_amount: number | null
  additional_tax: number | null
  total_amount: number | null
  pdf_url: string | null
  image_url: string | null
  raw_text: string | null
  parsed_data: any
  status: string
  is_processed: boolean
  processed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Datos relacionados
  project_name?: string
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<InvoiceIncome[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('invoice_income')
        .select(`
          *,
          projects!inner(
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = data?.map(invoice => ({
        ...invoice,
        project_name: invoice.projects?.name
      })) || []

      setInvoices(formattedData)
    } catch (err) {
      console.error('Error fetching invoices:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar facturas')
    } finally {
      setLoading(false)
    }
  }

  const processInvoice = async (file: File, projectId: number) => {
    try {
      setLoading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId.toString())

      const response = await fetch('/api/invoices/process-extract', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al procesar factura')
      }

      const result = await response.json()
      
      // Recargar la lista de facturas
      await fetchInvoices()
      
      return result
    } catch (err) {
      console.error('Error processing invoice:', err)
      setError(err instanceof Error ? err.message : 'Error al procesar factura')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateInvoice = async (id: number, updates: Partial<InvoiceIncome>) => {
    try {
      const { data, error } = await supabase
        .from('invoice_income')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Actualizar la lista local
      setInvoices(prev => 
        prev.map(invoice => 
          invoice.id === id ? { ...invoice, ...updates } : invoice
        )
      )

      return data
    } catch (err) {
      console.error('Error updating invoice:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar factura')
      throw err
    }
  }

  const deleteInvoice = async (id: number) => {
    try {
      console.log('🗑️ Eliminando factura:', id)
      
      // Primero obtener la factura para saber qué archivos eliminar
      const { data: invoice, error: fetchError } = await supabase
        .from('invoice_income')
        .select('pdf_url')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error obteniendo factura para eliminar:', fetchError)
        // Continuar con eliminación de BD aunque no podamos obtener URLs
      }

      // Eliminar PDF del storage si existe
      if (invoice && invoice.pdf_url) {
        try {
          console.log('🔍 Procesando eliminación de PDF:', invoice.pdf_url)
          
          // Extraer el path del archivo de la URL
          const pdfPath = extractFilePathFromUrl(invoice.pdf_url, 'invoices')
          console.log('📁 Path extraído para PDF:', pdfPath)
          
          if (pdfPath) {
            console.log('🗑️ Intentando eliminar PDF del bucket invoices:', pdfPath)
            
            const { error: pdfDeleteError } = await supabase.storage
              .from('invoices')
              .remove([pdfPath])
            
            if (pdfDeleteError) {
              console.error('❌ Error eliminando PDF:', pdfDeleteError)
            } else {
              console.log('✅ PDF eliminado exitosamente:', pdfPath)
            }
          } else {
            console.warn('⚠️ No se pudo extraer path del PDF URL:', invoice.pdf_url)
          }
        } catch (pdfError) {
          console.error('❌ Error procesando eliminación de PDF:', pdfError)
        }
      } else {
        console.log('📝 No hay PDF para eliminar (pdf_url es null)')
      }

      // Eliminar registro de la base de datos
      const { error: deleteError } = await supabase
        .from('invoice_income')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      console.log('✅ Factura eliminada completamente de BD y storage')

      // Remover de la lista local
      setInvoices(prev => prev.filter(invoice => invoice.id !== id))
    } catch (err) {
      console.error('❌ Error eliminando factura:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar factura')
      throw err
    }
  }

  // Función auxiliar para extraer el path del archivo de una URL de Supabase
  const extractFilePathFromUrl = (url: string, bucket: string): string | null => {
    try {
      if (!url || typeof url !== 'string') {
        console.log('❌ URL inválida para extracción:', { url, type: typeof url })
        return null
      }
      
      console.log(`🔍 Extrayendo path de URL para bucket "${bucket}":`, url)
      
      // URL formato: https://xxx.supabase.co/storage/v1/object/public/BUCKET/PATH
      const bucketPattern = `/storage/v1/object/public/${bucket}/`
      const bucketIndex = url.indexOf(bucketPattern)
      
      if (bucketIndex === -1) {
        console.log(`❌ Patrón de bucket "${bucket}" no encontrado en URL:`, url)
        console.log('🔍 Buscando patrón:', bucketPattern)
        return null
      }
      
      const path = url.substring(bucketIndex + bucketPattern.length)
      console.log(`✅ Path extraído para bucket "${bucket}":`, path)
      
      return path || null
    } catch (error) {
      console.error('❌ Error extrayendo path de URL:', error)
      return null
    }
  }


  const getInvoiceStats = () => {
    const total = invoices.length
    const processed = invoices.filter(inv => inv.status === 'processed').length
    const pending = invoices.filter(inv => inv.status === 'pending').length
    const blocked = invoices.filter(inv => inv.status === 'blocked').length
    
    // Ingresos reales (solo facturas procesadas)
    const processedInvoices = invoices.filter(inv => inv.status === 'processed')
    const realIncomeAmount = processedInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const realIncomeNet = processedInvoices.reduce((sum, inv) => sum + (inv.net_amount || 0), 0)
    const realIncomeIva = processedInvoices.reduce((sum, inv) => sum + (inv.iva_amount || 0), 0)
    
    // Total de todas las facturas (para referencia)
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const totalNet = invoices.reduce((sum, inv) => sum + (inv.net_amount || 0), 0)
    const totalIva = invoices.reduce((sum, inv) => sum + (inv.iva_amount || 0), 0)

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

  const getAvailableIncome = async () => {
    // Ingresos reales (solo facturas procesadas)
    const processedInvoices = invoices.filter(inv => inv.status === 'processed')
    const realIncomeAmount = processedInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    
    // Obtener pagos totales realizados a trabajadores
    let totalPaidToWorkers = 0
    try {
      const { data: payments } = await supabase
        .from('worker_payments')
        .select('amount')
        .eq('is_paid', true)
      
      totalPaidToWorkers = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
    } catch (error) {
      console.error('Error fetching worker payments:', error)
    }
    
    // Ingresos disponibles (ingresos - pagos realizados)
    const availableIncome = Math.max(0, realIncomeAmount - totalPaidToWorkers)
    
    return {
      realIncomeAmount,
      totalPaidToWorkers,
      availableIncome
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    processInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceStats,
    getAvailableIncome
  }
}
