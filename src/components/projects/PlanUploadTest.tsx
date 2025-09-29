'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useProjects } from '@/hooks/useProjects'
import { supabase } from '@/lib/supabase'

export function PlanUploadTest() {
  const { uploadPlan } = useProjects()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setResult('')

    try {
      console.log('📁 Archivo seleccionado:', file.name, file.size, file.type)
      
      // Validar archivo
      if (!file.type.includes('pdf')) {
        throw new Error('El archivo debe ser un PDF')
      }
      
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('El archivo no puede ser mayor a 50MB')
      }
      
      // Usar un ID de proyecto existente para la prueba
      const projectId = 25 // ID del proyecto existente
      
      console.log('🚀 Iniciando subida para proyecto:', projectId)
      
      // Verificar que el proyecto existe
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single()
      
      if (projectError || !project) {
        throw new Error(`Proyecto con ID ${projectId} no encontrado. Crea un proyecto primero.`)
      }
      
      console.log('✅ Proyecto encontrado:', project.name)
      
      const result = await uploadPlan(projectId, file)
      
      console.log('✅ Subida exitosa:', result)
      setResult(`✅ Subida exitosa! PDF: ${result.plan_pdf}, Imagen: ${result.plan_image_url}`)
      
    } catch (error: any) {
      console.error('❌ Error en subida:', error)
      setResult(`❌ Error: ${error.message || error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        🧪 Prueba de Subida de Planos
      </h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="test-file" className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar archivo PDF:
          </label>
          <input
            id="test-file"
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {loading && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Subiendo archivo...</span>
          </div>
        )}

        {result && (
          <div className={`p-3 rounded-md text-sm ${
            result.startsWith('✅') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {result}
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p><strong>Nota:</strong> Esta prueba usa el proyecto con ID 25. Asegúrate de que exista en tu base de datos.</p>
          <p><strong>Revisa la consola del navegador</strong> para ver los logs detallados.</p>
        </div>
      </div>
    </div>
  )
}