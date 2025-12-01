'use client'

import { AlertTriangle } from 'lucide-react'
import { ModalV2 } from './ModalV2'

interface ConfirmModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
  children?: React.ReactNode
}

export function ConfirmModalV2({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar Acción',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
  children
}: ConfirmModalV2Props) {
  const variantStyles = {
    danger: {
      icon: 'text-red-500',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      icon: 'text-yellow-500',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    info: {
      icon: 'text-blue-500',
      button: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  const styles = variantStyles[variant]

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <p className="text-slate-200">
              {message}
            </p>
            {children && (
              <div className="mt-4">
                {children}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-slate-100 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.button}`}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </ModalV2>
  )
}

