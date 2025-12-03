'use client'

import { Button } from '@/components/ui/Button'

interface ConfirmDialogProps {
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel: () => void
    variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    variant = 'danger'
}: ConfirmDialogProps) {
    if (!isOpen) return null

    const variantStyles = {
        danger: {
            bg: 'bg-red-900/20',
            border: 'border-red-700',
            button: 'bg-red-600 hover:bg-red-700'
        },
        warning: {
            bg: 'bg-yellow-900/20',
            border: 'border-yellow-700',
            button: 'bg-yellow-600 hover:bg-yellow-700'
        },
        info: {
            bg: 'bg-blue-900/20',
            border: 'border-blue-700',
            button: 'bg-blue-600 hover:bg-blue-700'
        }
    }

    const styles = variantStyles[variant]

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className={`bg-slate-800 border ${styles.border} rounded-lg max-w-md w-full shadow-2xl`}>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">{title}</h3>
                    <p className="text-slate-300 mb-6">{message}</p>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={onCancel}
                            className="text-slate-300 hover:text-slate-100 border-slate-600"
                        >
                            {cancelText}
                        </Button>
                        <Button
                            onClick={onConfirm}
                            className={`${styles.button} text-white`}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
