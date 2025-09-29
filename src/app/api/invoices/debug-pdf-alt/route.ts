import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }

    console.log('=== PRUEBA ALTERNATIVA: pdfjs-dist ===')
    
    // Convertir archivo a buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('Buffer size:', buffer.length)

    try {
      // Usar pdfjs-dist con configuración específica
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')
      
      // Configurar worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`
      
      const loadingTask = pdfjsLib.getDocument({ 
        data: buffer,
        verbosity: 0
      })
      
      const pdf = await loadingTask.promise
      console.log('PDF cargado exitosamente, páginas:', pdf.numPages)
      
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        fullText += pageText + '\n'
        console.log(`Página ${i} extraída:`, pageText.substring(0, 100))
      }
      
      return NextResponse.json({
        success: true,
        text: fullText,
        pages: pdf.numPages,
        method: 'pdfjs-dist'
      })
      
    } catch (error) {
      console.error('Error con pdfjs-dist:', error)
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        method: 'pdfjs-dist'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}




