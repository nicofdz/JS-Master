import { supabase } from './supabase'

export interface PlanUploadResult {
  planPdfUrl: string
  planImageUrl: string
}

/**
 * Sube un archivo PDF de plano y genera una imagen de vista previa
 */
export async function uploadProjectPlan(
  projectId: number,
  file: File
): Promise<PlanUploadResult> {
  try {
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

    // Subir PDF a storage
    const { error: uploadError } = await supabase.storage
      .from('project-plans')
      .upload(filePath, file)

    if (uploadError) {
      throw new Error(`Error al subir el archivo: ${uploadError.message}`)
    }

    // Obtener URL pública del PDF
    const { data: { publicUrl: planPdfUrl } } = supabase.storage
      .from('project-plans')
      .getPublicUrl(filePath)

    // Generar imagen de vista previa (primera página del PDF)
    const planImageUrl = await generatePlanImage(planPdfUrl, projectId)

    return {
      planPdfUrl,
      planImageUrl
    }
  } catch (error) {
    console.error('Error uploading project plan:', error)
    throw error
  }
}

/**
 * Genera una imagen de vista previa del PDF usando pdfjs-dist
 */
async function generatePlanImage(pdfUrl: string, projectId: number): Promise<string> {
  try {
    // Importar pdfjs-dist dinámicamente
    const pdfjsLib = await import('pdfjs-dist')
    
    // Configurar worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    
    // Cargar el PDF
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise
    
    // Obtener la primera página
    const page = await pdf.getPage(1)
    
    // Configurar el canvas
    const scale = 1.5
    const viewport = page.getViewport({ scale })
    
    // Crear canvas temporal
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context) {
      throw new Error('No se pudo obtener el contexto del canvas')
    }
    
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    // Renderizar la página en el canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    }
    
    await page.render(renderContext).promise
    
    // Convertir canvas a blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('No se pudo generar el blob'))
          return
        }
        
        try {
          // Subir la imagen generada
          const imageFileName = `plan-image-${projectId}-${Date.now()}.png`
          const imagePath = `images/${imageFileName}`
          
          const { error: uploadError } = await supabase.storage
            .from('project-plan-images')
            .upload(imagePath, blob)
          
          if (uploadError) {
            throw uploadError
          }
          
          // Obtener URL pública de la imagen
          const { data: { publicUrl } } = supabase.storage
            .from('project-plan-images')
            .getPublicUrl(imagePath)
          
          resolve(publicUrl)
        } catch (error) {
          console.error('Error uploading generated image:', error)
          // Fallback: usar la URL del PDF
          resolve(pdfUrl)
        }
      }, 'image/png', 0.8)
    })
    
  } catch (error) {
    console.error('Error generating plan image:', error)
    // Fallback: usar la URL del PDF
    return pdfUrl
  }
}

/**
 * Elimina un plano de proyecto
 */
export async function deleteProjectPlan(projectId: number): Promise<void> {
  try {
    // Obtener información del proyecto para encontrar el archivo
    const { data: project } = await supabase
      .from('projects')
      .select('plan_pdf, plan_image_url')
      .eq('id', projectId)
      .single()

    if (!project) {
      throw new Error('Proyecto no encontrado')
    }

    // Eliminar archivos del storage
    const filesToDelete = []
    
    if (project.plan_pdf) {
      const pdfPath = project.plan_pdf.split('/').pop()
      if (pdfPath) {
        filesToDelete.push(`plans/${pdfPath}`)
      }
    }
    
    if (project.plan_image_url && project.plan_image_url !== project.plan_pdf) {
      const imagePath = project.plan_image_url.split('/').pop()
      if (imagePath) {
        filesToDelete.push(`images/${imagePath}`)
      }
    }

    // Eliminar archivos del storage
    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('project-plans')
        .remove(filesToDelete)

      if (deleteError) {
        console.error('Error deleting plan files:', deleteError)
      }
    }

    // Limpiar campos en la base de datos
    await supabase
      .from('projects')
      .update({
        plan_pdf: null,
        plan_image_url: null,
        plan_uploaded_at: null
      })
      .eq('id', projectId)

  } catch (error) {
    console.error('Error deleting project plan:', error)
    throw error
  }
}
