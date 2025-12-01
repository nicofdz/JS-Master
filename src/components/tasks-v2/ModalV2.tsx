'use client'

import { X } from 'lucide-react'

interface ModalV2Props {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  headerRight?: React.ReactNode
}

export function ModalV2({ isOpen, onClose, title, children, size = 'xl', headerRight }: ModalV2Props) {
  if (!isOpen) return null

  const sizeClasses = {
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-6xl',
    '3xl': 'max-w-7xl',
    '4xl': 'max-w-5xl'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[100]">
      <div className={`bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
            <div className="flex items-center gap-3">
              {headerRight}
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-800">
          {children}
        </div>
      </div>
    </div>
  )
}

