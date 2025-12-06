import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { ModalV2 } from '../tasks-v2/ModalV2'
import { useState } from 'react'

interface ConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'warning' | 'info'
    showReasonInput?: boolean
    reason?: string
    onReasonChange?: (reason: string) => void
    isLoading?: boolean
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger',
    showReasonInput = false,
    reason = '',
    onReasonChange,
    isLoading = false
}: ConfirmationModalProps) {
    const [showInput, setShowInput] = useState(false)

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <AlertCircle className="w-8 h-8 text-red-500" />
            case 'warning':
                return <AlertTriangle className="w-8 h-8 text-yellow-500" />
            case 'info':
                return <Info className="w-8 h-8 text-blue-500" />
        }
    }

    const getConfirmButtonColor = () => {
        switch (type) {
            case 'danger':
                return 'bg-red-600 hover:bg-red-700'
            case 'warning':
                return 'bg-yellow-600 hover:bg-yellow-700'
            case 'info':
                return 'bg-blue-600 hover:bg-blue-700'
        }
    }

    return (
        <ModalV2
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="md"
        >
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        {getIcon()}
                    </div>
                    <div className="flex-1">
                        <p className="text-slate-200">
                            {message}
                        </p>

                        {showReasonInput && onReasonChange && (
                            <div className="mt-4 space-y-3">
                                <button
                                    type="button"
                                    onClick={() => setShowInput(!showInput)}
                                    className="text-sm text-slate-400 hover:text-slate-200 underline"
                                >
                                    {showInput ? 'Ocultar' : 'Agregar'} razón (opcional)
                                </button>
                                {showInput && (
                                    <textarea
                                        value={reason}
                                        onChange={(e) => onReasonChange(e.target.value)}
                                        placeholder="Ingresa una razón..."
                                        className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        rows={3}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-6 py-2 text-sm font-medium text-slate-100 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-6 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-2 ${getConfirmButtonColor()}`}
                    >
                        {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                        {confirmText}
                    </button>
                </div>
            </div>
        </ModalV2>
    )
}
