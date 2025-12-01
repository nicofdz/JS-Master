'use client'

import { X } from 'lucide-react'

interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function ExpenseModal({ isOpen, onClose, children }: ExpenseModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h3 className="text-xl font-semibold text-slate-100">Gestión de Gastos</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  )
}
