import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }

    console.log('=== PRUEBA SIMPLE: pdf-parse ===')
    
    // Convertir archivo a buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('Buffer size:', buffer.length)

    try {
      // Usar pdf-parse con configuración simple
      const pdfParse = require('pdf-parse')
      
      const pdfData = await pdfParse(buffer, {
        max: 0, // Sin límite de páginas
        version: 'v1.10.100'
      })
      
      console.log('PDF parseado exitosamente')
      console.log('Páginas:', pdfData.numpages)
      console.log('Texto extraído (primeros 200 chars):', pdfData.text.substring(0, 200))
      
      return NextResponse.json({
        success: true,
        text: pdfData.text,
        pages: pdfData.numpages,
        info: pdfData.info,
        method: 'pdf-parse'
      })
      
    } catch (error) {
      console.error('Error con pdf-parse:', error)
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        method: 'pdf-parse'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}










<<<<<<< HEAD
=======

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
