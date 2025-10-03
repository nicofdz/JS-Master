'use client'

import { useState } from 'react'
import { WorkerPaymentSummary } from '@/components/workers/WorkerPaymentSummary'
import { DailyPaymentSummary } from '@/components/workers/DailyPaymentSummary'
import { useInvoices } from '@/hooks/useInvoices'

export default function PagosPage() {
  const [paymentType, setPaymentType] = useState<'trato' | 'dia'>('trato')
  const { invoices } = useInvoices()

  // Calcular el ingreso total real de TODAS las facturas procesadas
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

  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Resumen de Pagos</h1>
        <p className="text-slate-300">
          Seguimiento de pagos pendientes y completados por trabajador
        </p>
      </div>

      {/* Toggle Tipo de Pago */}
      <div className="mb-6 flex gap-2 bg-slate-700/30 p-1 rounded-lg w-fit">
        <button
          onClick={() => setPaymentType('trato')}
          className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${
            paymentType === 'trato'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Pago a Trato
        </button>
        <button
          onClick={() => setPaymentType('dia')}
          className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${
            paymentType === 'dia'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Pago por Día
        </button>
      </div>

      {/* Contenido según el tipo de pago */}
      {paymentType === 'trato' ? (
        <WorkerPaymentSummary totalRealIncome={totalRealIncome} />
      ) : (
        <DailyPaymentSummary totalRealIncome={totalRealIncome} />
      )}
    </div>
  )
}
