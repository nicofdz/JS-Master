'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { FileText, Download } from 'lucide-react'

interface DocumentFormatModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (format: 'docx' | 'pdf') => void
    title?: string
    description?: string
    isGenerating?: boolean
}

export function DocumentFormatModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Seleccionar Formato",
    description = "Elige el formato en el que deseas descargar los documentos.",
    isGenerating = false
}: DocumentFormatModalProps) {
    const [format, setFormat] = useState<'docx' | 'pdf'>('docx')

    const handleConfirm = () => {
        onConfirm(format)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            className="max-w-md"
        >
            <div className="space-y-6">
                <p className="text-sm text-gray-500">{description}</p>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-purple-600" />
                            Formato de Salida
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setFormat('docx')}
                                className={`flex-1 p-4 rounded-lg border-2 transition-all ${format === 'docx'
                                        ? 'border-blue-500 bg-blue-900/20 text-blue-400'
                                        : 'border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                <div className="font-semibold text-center">Word (.docx)</div>
                                <div className="text-xs text-center text-slate-500 mt-1">Editable</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormat('pdf')}
                                className={`flex-1 p-4 rounded-lg border-2 transition-all ${format === 'pdf'
                                        ? 'border-red-500 bg-red-900/20 text-red-400'
                                        : 'border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                <div className="font-semibold text-center">PDF (.pdf)</div>
                                <div className="text-xs text-center text-slate-500 mt-1">Solo lectura</div>
                            </button>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isGenerating}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isGenerating}
                        className="flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        {isGenerating ? 'Generando...' : 'Descargar'}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
