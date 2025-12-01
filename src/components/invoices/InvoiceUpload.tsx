'use client'

import { useState, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useProjects } from '@/hooks/useProjects'
import { useInvoices } from '@/hooks/useInvoices'
import { formatCurrency } from '@/lib/utils'

interface InvoiceUploadProps {
  onUploadSuccess?: () => void
}

export function InvoiceUpload({ onUploadSuccess }: InvoiceUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { projects } = useProjects()
  const { processInvoice } = useInvoices()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    } else {
      alert('Por favor selecciona un archivo PDF válido')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedProject) {
      alert('Por favor selecciona un archivo PDF y un proyecto')
      return
    }

    try {
      setIsUploading(true)
      
      // Agregar timeout para evitar que se quede colgado
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: La operación tardó demasiado')), 45000) // 45 segundos
      })
      
      const uploadPromise = processInvoice(selectedFile, parseInt(selectedProject))
      
      const result = await Promise.race([uploadPromise, timeoutPromise])
      
      // Reset form
      setSelectedFile(null)
      setSelectedProject('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      alert('Factura procesada exitosamente')
      onUploadSuccess?.()
    } catch (error) {
      console.error('Error uploading invoice:', error)
      
      // Mostrar mensaje de error más específico
      let errorMessage = 'Error al procesar la factura'
      if (error instanceof Error) {
        if (error.message.includes('Timeout')) {
          errorMessage = 'La operación tardó demasiado. Por favor, intenta de nuevo.'
        } else if (error.message.includes('Network')) {
          errorMessage = 'Error de conexión. Verifica tu internet e intenta de nuevo.'
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }
      
      alert(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir Nueva Factura</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Seleccionar Proyecto
          </label>
          <Select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">Selecciona un proyecto</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id.toString()}>
                {project.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Archivo PDF de Factura
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900/50 file:text-blue-300 hover:file:bg-blue-800/60 file:cursor-pointer"
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-slate-400">
              Archivo seleccionado: {selectedFile.name}
            </p>
          )}
        </div>

        <div className="bg-blue-900/30 border border-blue-600 p-4 rounded-lg">
          <h4 className="font-medium text-blue-300 mb-2">¿Qué hace el sistema?</h4>
          <ul className="text-sm text-blue-400 space-y-1">
            <li>• Extrae automáticamente los datos del PDF</li>
            <li>• Identifica número de factura, empresa, montos</li>
            <li>• Calcula IVA e impuestos automáticamente</li>
            <li>• Vincula la factura con el proyecto seleccionado</li>
          </ul>
        </div>

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !selectedProject || isUploading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Procesando...
            </div>
          ) : (
            'Subir y Procesar Factura'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}





