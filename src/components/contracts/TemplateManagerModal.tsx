'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { FileText, Download, Upload, Loader2, RefreshCw, AlertCircle, FileType } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface TemplateManagerModalProps {
    isOpen: boolean
    onClose: () => void
}

interface TemplateFile {
    id: string
    name: string
    label: string
    description: string
    fileName: string
}

const TEMPLATES: TemplateFile[] = [
    {
        id: 'contract',
        name: 'Plantilla de Contrato',
        label: 'Contrato de Trabajo',
        description: 'Utilizada para generar nuevos contratos de trabajo.',
        fileName: 'ContratoTemplate.docx'
    },
    {
        id: 'hours',
        name: 'Plantilla de Pacto de Horas',
        label: 'Pacto de Horas',
        description: 'Utilizada para generar documentos de pacto de horas extra.',
        fileName: 'HorasTemplate.docx'
    }
]

export function TemplateManagerModal({ isOpen, onClose }: TemplateManagerModalProps) {
    const [loading, setLoading] = useState<string | null>(null) // ID of the template being processed
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

    const handleDownload = async (template: TemplateFile) => {
        try {
            setLoading(template.id)

            const { data, error } = await supabase.storage
                .from('contracts')
                .download(`templates/${template.fileName}`)

            if (error) throw error

            const url = window.URL.createObjectURL(data)
            const link = document.createElement('a')
            link.href = url
            link.download = template.fileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)

            toast.success(`Plantilla descargada: ${template.name}`)
        } catch (error: any) {
            console.error('Error downloading template:', error)
            toast.error('Error al descargar la plantilla')
        } finally {
            setLoading(null)
        }
    }

    const handleUploadClick = (templateId: string) => {
        setSelectedTemplateId(templateId)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
            fileInputRef.current.click()
        }
    }

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !selectedTemplateId) return

        // Validar extensión
        if (!file.name.endsWith('.docx')) {
            toast.error('Solo se permiten archivos .docx')
            return
        }

        const template = TEMPLATES.find(t => t.id === selectedTemplateId)
        if (!template) return

        try {
            setLoading(template.id)

            // Subir archivo (sobrescribir)
            const { error } = await supabase.storage
                .from('contracts')
                .upload(`templates/${template.fileName}`, file, {
                    upsert: true,
                    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                })

            if (error) throw error

            toast.success(`Plantilla actualizada correctamente: ${template.name}`)
        } catch (error: any) {
            console.error('Error uploading template:', error)
            toast.error('Error al actualizar la plantilla')
        } finally {
            setLoading(null)
            setSelectedTemplateId(null)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Gestión de Plantillas"
            className="max-w-2xl"
        >
            <div className="space-y-6">
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-md p-4 flex gap-3 text-blue-400">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="text-sm">
                        Aquí puedes gestionar las plantillas base utilizadas para generar los documentos.
                        Al actualizar una plantilla, los futuros documentos se generarán con la nueva versión inmediatamente.
                    </p>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".docx"
                    onChange={handleFileSelected}
                />

                <div className="grid gap-4">
                    {TEMPLATES.map((template) => (
                        <Card key={template.id} className="border-slate-700 bg-slate-800 hover:border-slate-600 transition-colors">
                            <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                                        <FileText className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-100">{template.label}</h3>
                                        <p className="text-sm text-slate-400 mt-1">{template.description}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs bg-slate-900/50 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">
                                                {template.fileName}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownload(template)}
                                        disabled={!!loading}
                                        className="w-32 justify-start gap-2 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                                    >
                                        {loading === template.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4" />
                                        )}
                                        Descargar
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUploadClick(template.id)}
                                        disabled={!!loading}
                                        className="w-32 justify-start gap-2 border-blue-500/30 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                                    >
                                        {loading === template.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}
                                        Actualizar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-700">
                    <Button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white">
                        Cerrar
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
