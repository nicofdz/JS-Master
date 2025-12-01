import { X } from 'lucide-react'
import { Button } from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Modal({ isOpen, onClose, title, children, size = 'md', className }: ModalProps) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className={`modal bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full ${className || sizeClasses[size]} max-h-[90vh] overflow-hidden`}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  )
}
