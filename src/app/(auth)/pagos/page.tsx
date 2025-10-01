'use client'

import { WorkerPaymentSummary } from '@/components/workers/WorkerPaymentSummary'

export default function PagosPage() {
  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Resumen de Pagos</h1>
        <p className="text-slate-300">
          Seguimiento de pagos pendientes y completados por trabajador
        </p>
      </div>

      <WorkerPaymentSummary />
    </div>
  )
}
