import { supabase } from './supabase'

export interface PlanUploadResult {
  planPdfUrl: string
  planImageUrl: string
}

/**
 * Sube un archivo PDF de plano (versión alternativa sin pdfjs-dist)
 */
export async function uploadProjectPlanAlternative(
  projectId: number,
  file: File
): Promise<PlanUploadResult> {
  try {
    console.log('🚀 Iniciando subida de plano (versión alternativa):', { projectId, fileName: file.name, fileSize: file.size })

    // Validar archivo
    if (!file.type.includes('pdf')) {
      throw new Error('El archivo debe ser un PDF')
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB
      throw new Error('El archivo no puede ser mayor a 50MB')
    }

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop()
    const fileName = `project-${projectId}-${Date.now()}.${fileExt}`
    const filePath = `plans/${fileName}`

    console.log('📁 Subiendo archivo:', { filePath, bucket: 'project-plans' })

    // Subir PDF a storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-plans')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Error al subir archivo:', uploadError)
      throw new Error(`Error al subir el archivo: ${uploadError.message}`)
    }

    console.log('✅ Archivo subido exitosamente:', uploadData)

    // Obtener URL pública del PDF
    const { data: { publicUrl: planPdfUrl } } = supabase.storage
      .from('project-plans')
      .getPublicUrl(filePath)

    console.log('🔗 URL del PDF generada:', planPdfUrl)

    // Verificar que la URL es válida
    if (!planPdfUrl || planPdfUrl.includes('undefined') || planPdfUrl.includes('%7B')) {
      throw new Error('Error al generar URL pública del archivo')
    }

    // Para esta versión alternativa, usaremos un servicio externo para generar la imagen
    console.log('🖼️ Generando imagen usando servicio externo...')
    const planImageUrl = await generatePlanImageExternal(planPdfUrl, projectId)

    console.log('✅ Subida completada:', { planPdfUrl, planImageUrl })

    return {
      planPdfUrl,
      planImageUrl
    }
  } catch (error) {
    console.error('❌ Error uploading project plan:', error)
    throw error
  }
}

/**
 * Genera una imagen de vista previa usando un servicio externo
 */
async function generatePlanImageExternal(pdfUrl: string, projectId: number): Promise<string> {
  try {
    console.log('🖼️ Generando imagen externa para:', pdfUrl)
    
    // Usar un servicio externo para convertir PDF a imagen
    // Opción 1: Usar PDF.js CDN directamente
    const imageUrl = await generateImageWithPDFJS(pdfUrl, projectId)
    
    if (imageUrl && imageUrl !== pdfUrl) {
      console.log('✅ Imagen generada con servicio externo:', imageUrl)
      return imageUrl
    }
    
    // Fallback: usar la URL del PDF
    console.log('⚠️ Usando PDF como fallback')
    return pdfUrl
    
  } catch (error) {
    console.error('❌ Error generando imagen externa:', error)
    return pdfUrl
  }
}

/**
 * Genera imagen usando PDF.js desde CDN
 */
async function generateImageWithPDFJS(pdfUrl: string, projectId: number): Promise<string> {
  try {
    console.log('🌐 Cargando PDF.js desde CDN...')
    
    // Cargar PDF.js desde CDN
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true
    
    return new Promise((resolve, reject) => {
      script.onload = async () => {
        try {
          // @ts-ignore - PDF.js se carga globalmente
          const pdfjsLib = window.pdfjsLib
          
          if (!pdfjsLib) {
            throw new Error('PDF.js no se cargó correctamente')
          }
          
          console.log('📚 PDF.js cargado desde CDN')
          
          // Configurar worker
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          
          // Cargar PDF
          const pdf = await pdfjsLib.getDocument(pdfUrl).promise
          console.log('📄 PDF cargado, páginas:', pdf.numPages)
          
          // Obtener primera página
          const page = await pdf.getPage(1)
          console.log('📄 Página 1 obtenida')
          
          // Configurar canvas
          const scale = 0.5
          const viewport = page.getViewport({ scale })
          
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          
          if (!context) {
            throw new Error('No se pudo obtener contexto del canvas')
          }
          
          canvas.height = viewport.height
          canvas.width = viewport.width
          
          console.log('🎨 Canvas configurado:', { width: canvas.width, height: canvas.height })
          
          // Renderizar página
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          }
          
          await page.render(renderContext).promise
          console.log('🎨 Página renderizada')
          
          // Convertir a blob y subir
          canvas.toBlob(async (blob) => {
            if (!blob) {
              console.log('⚠️ No se pudo generar blob')
              resolve(pdfUrl)
              return
            }
            
            try {
              console.log('💾 Blob generado, tamaño:', blob.size)
              
              // Subir imagen
              const imageFileName = `plan-image-${projectId}-${Date.now()}.png`
              const imagePath = `images/${imageFileName}`
              
              const { error: uploadError } = await supabase.storage
                .from('project-plan-images')
                .upload(imagePath, blob, {
                  cacheControl: '3600',
                  upsert: false
                })
              
              if (uploadError) {
                console.error('❌ Error subiendo imagen:', uploadError)
                resolve(pdfUrl)
                return
              }
              
              // Obtener URL pública
              const { data: { publicUrl } } = supabase.storage
                .from('project-plan-images')
                .getPublicUrl(imagePath)
              
              console.log('🔗 URL de imagen generada:', publicUrl)
              resolve(publicUrl)
              
            } catch (error) {
              console.error('❌ Error subiendo imagen:', error)
              resolve(pdfUrl)
            }
          }, 'image/png', 0.8)
          
        } catch (error) {
          console.error('❌ Error en generación con PDF.js:', error)
          resolve(pdfUrl)
        }
      }
      
      script.onerror = () => {
        console.error('❌ Error cargando PDF.js desde CDN')
        resolve(pdfUrl)
      }
      
      document.head.appendChild(script)
    })
    
  } catch (error) {
    console.error('❌ Error en generateImageWithPDFJS:', error)
    return pdfUrl
  }
}

/**
 * Elimina un plano de proyecto
 */
export async function deleteProjectPlanAlternative(projectId: number): Promise<void> {
  try {
    console.log('🗑️ Eliminando plano del proyecto:', projectId)

    // Obtener información del proyecto
    const { data: project } = await supabase
      .from('projects')
      .select('plan_pdf, plan_image_url')
      .eq('id', projectId)
      .single()

    if (!project) {
      throw new Error('Proyecto no encontrado')
    }

    // Extraer nombre del archivo de la URL
    const extractFileName = (url: string) => {
      try {
        const urlObj = new URL(url)
        const pathParts = urlObj.pathname.split('/')
        return pathParts[pathParts.length - 1]
      } catch {
        return null
      }
    }

    // Eliminar archivos del storage
    const filesToDelete = []
    
    if (project.plan_pdf) {
      const pdfFileName = extractFileName(project.plan_pdf)
      if (pdfFileName) {
        filesToDelete.push(`plans/${pdfFileName}`)
      }
    }
    
    if (project.plan_image_url && project.plan_image_url !== project.plan_pdf) {
      const imageFileName = extractFileName(project.plan_image_url)
      if (imageFileName) {
        filesToDelete.push(`images/${imageFileName}`)
      }
    }

    console.log('🗑️ Archivos a eliminar:', filesToDelete)

    // Eliminar archivos del storage
    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('project-plans')
        .remove(filesToDelete)

      if (deleteError) {
        console.error('❌ Error eliminando archivos:', deleteError)
      } else {
        console.log('✅ Archivos eliminados del storage')
      }
    }

    // Limpiar campos en la base de datos
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        plan_pdf: null,
        plan_image_url: null,
        plan_uploaded_at: null
      })
      .eq('id', projectId)

    if (updateError) {
      throw updateError
    }

    console.log('✅ Campos de plano eliminados de la base de datos')

  } catch (error) {
    console.error('❌ Error deleting project plan:', error)
    throw error
  }
}














