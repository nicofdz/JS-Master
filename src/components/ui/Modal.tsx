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
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-[1200px]'
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className={`modal glass-panel premium-gradient premium-border rounded-xl premium-shadow w-full ${className || sizeClasses[size]} max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200`}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-transparent">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-white/10 p-1 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {children}
        </div>
      </div>
    </div>
  )
}
