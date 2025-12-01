'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { FileText, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function PlanUploadDebug() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      addDebugInfo(`Archivo seleccionado: ${file.name} (${file.size} bytes, ${file.type})`)
      if (file.type !== 'application/pdf') {
        toast.error('Solo se permiten archivos PDF')
        addDebugInfo('Error: Tipo de archivo no válido')
        return
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error('El archivo no puede ser mayor a 50MB')
        addDebugInfo('Error: Archivo demasiado grande')
        return
      }
      setSelectedFile(file)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo PDF')
      return
    }

    setUploading(true)
    setDebugInfo([])
    
    try {
      addDebugInfo('Iniciando subida de archivo...')
      
      // Generar nombre único
      const fileName = `test-${Date.now()}.pdf`
      const filePath = `plans/${fileName}`
      
      addDebugInfo(`Ruta del archivo: ${filePath}`)
      addDebugInfo(`Bucket: project-plans`)

      // Verificar conexión a Supabase
      addDebugInfo('Verificando conexión a Supabase...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        throw new Error(`Error de autenticación: ${authError.message}`)
      }
      addDebugInfo(`Usuario autenticado: ${user?.id || 'Anónimo'}`)

      // Subir archivo
      addDebugInfo('Subiendo archivo a storage...')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-plans')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Error al subir: ${uploadError.message}`)
      }
      
      addDebugInfo(`Archivo subido exitosamente: ${JSON.stringify(uploadData)}`)

      // Obtener URL pública
      addDebugInfo('Generando URL pública...')
      const { data: { publicUrl } } = supabase.storage
        .from('project-plans')
        .getPublicUrl(filePath)

      addDebugInfo(`URL generada: ${publicUrl}`)

      // Verificar URL
      if (!publicUrl || publicUrl.includes('undefined') || publicUrl.includes('%7B')) {
        throw new Error('URL generada no es válida')
      }

      // Probar acceso a la URL
      addDebugInfo('Probando acceso a la URL...')
      const response = await fetch(publicUrl, { method: 'HEAD' })
      addDebugInfo(`Respuesta del servidor: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        throw new Error(`No se puede acceder al archivo: ${response.status}`)
      }

      setUploadResult({
        fileName,
        filePath,
        publicUrl,
        uploadData
      })

      toast.success('Archivo subido exitosamente')
      addDebugInfo('✅ Subida completada exitosamente')

    } catch (error: any) {
      console.error('Error uploading file:', error)
      toast.error(`Error: ${error.message}`)
      addDebugInfo(`❌ Error: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleTestUrl = () => {
    if (uploadResult?.publicUrl) {
      window.open(uploadResult.publicUrl, '_blank')
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Debug de Subida de Planos</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Selector de archivo */}
        <div>
          <label htmlFor="plan-file" className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar archivo PDF de prueba
          </label>
          <input
            id="plan-file"
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Información del archivo */}
        {selectedFile && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {selectedFile.name}
              </span>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              Tamaño: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB | Tipo: {selectedFile.type}
            </p>
          </div>
        )}

        {/* Botón de subida */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Subir Archivo de Prueba
            </>
          )}
        </Button>

        {/* Resultado */}
        {uploadResult && (
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">Archivo subido exitosamente</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Nombre del archivo:</span>
                <p className="text-gray-600">{uploadResult.fileName}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Ruta:</span>
                <p className="text-gray-600">{uploadResult.filePath}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">URL pública:</span>
                <p className="text-gray-600 break-all">{uploadResult.publicUrl}</p>
              </div>
            </div>

            <div className="flex space-x-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestUrl}
              >
                Probar URL
              </Button>
            </div>
          </div>
        )}

        {/* Debug info */}
        {debugInfo.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Log de Debug:</h4>
            <div className="space-y-1 text-xs font-mono text-gray-600 max-h-40 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index}>{info}</div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}














