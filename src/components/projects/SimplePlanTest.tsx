'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { FileText, Upload, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function SimplePlanTest() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log('📁 Archivo seleccionado:', {
        name: file.name,
        size: file.size,
        type: file.type
      })
      setSelectedFile(file)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo')
      return
    }

    setUploading(true)
    
    try {
      console.log('🚀 Iniciando subida...')
      
      // Verificar autenticación
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('👤 Usuario:', user?.id, 'Error:', authError)
      
      if (authError) {
        throw new Error(`Error de autenticación: ${authError.message}`)
      }

      // Generar nombre único
      const fileName = `test-${Date.now()}.pdf`
      const filePath = `test/${fileName}`
      
      console.log('📤 Subiendo a:', { bucket: 'project-plans', path: filePath })

      // Subir archivo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-plans')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      console.log('📤 Resultado de subida:', { uploadData, uploadError })

      if (uploadError) {
        throw new Error(`Error al subir: ${uploadError.message}`)
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('project-plans')
        .getPublicUrl(filePath)

      console.log('🔗 URL generada:', publicUrl)

      // Verificar URL
      if (!publicUrl || publicUrl.includes('undefined') || publicUrl.includes('%7B')) {
        throw new Error('URL generada no es válida')
      }

      // Probar acceso
      console.log('🔍 Probando acceso a la URL...')
      const response = await fetch(publicUrl, { method: 'HEAD' })
      console.log('📡 Respuesta:', response.status, response.statusText)

      if (!response.ok) {
        throw new Error(`No se puede acceder al archivo: ${response.status}`)
      }

      setResult({
        fileName,
        filePath,
        publicUrl,
        uploadData
      })

      toast.success('Archivo subido exitosamente')
      console.log('✅ Subida completada exitosamente')

    } catch (error: any) {
      console.error('❌ Error:', error)
      toast.error(`Error: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleTestUrl = () => {
    if (result?.publicUrl) {
      console.log('🔗 Abriendo URL:', result.publicUrl)
      window.open(result.publicUrl, '_blank')
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Prueba Simple de Subida</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Selector de archivo */}
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar archivo PDF
          </label>
          <input
            id="file"
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
              Tamaño: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
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
              Subir Archivo
            </>
          )}
        </Button>

        {/* Resultado */}
        {result && (
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">Archivo subido exitosamente</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">URL:</span>
                <p className="text-gray-600 break-all text-xs">{result.publicUrl}</p>
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

        {/* Instrucciones */}
        <div className="bg-yellow-50 p-3 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Instrucciones:</strong>
          </p>
          <ul className="text-xs text-yellow-700 mt-1 space-y-1">
            <li>1. Selecciona un archivo PDF pequeño (&lt; 1MB)</li>
            <li>2. Haz clic en "Subir Archivo"</li>
            <li>3. Revisa la consola del navegador para ver los logs</li>
            <li>4. Si funciona, haz clic en "Probar URL"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}








