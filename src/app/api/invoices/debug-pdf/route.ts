import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    console.log('=== DEBUG PDF EXTRACTION ===')
    console.log('Archivo:', file.name)
    console.log('Tamaño:', file.size, 'bytes')
    console.log('Tipo:', file.type)

    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('Buffer size:', buffer.length)

    let rawText = ''
    let extractionMethod = ''

    try {
      // Intentar con pdf-parse
      const pdfParse = require('pdf-parse')
      
      console.log('🔄 Intentando con pdf-parse...')
      const startTime = Date.now()
      
      const pdfData = await pdfParse(buffer)
      rawText = pdfData.text
      
      const endTime = Date.now()
      console.log(`✅ pdf-parse exitoso en ${endTime - startTime}ms`)
      console.log('Texto extraído (primeros 500 caracteres):')
      console.log(rawText.substring(0, 500))
      console.log('📏 Longitud total:', rawText.length)
      
      extractionMethod = 'pdf-parse'
      
      // Si no se extrajo texto, intentar con pdf-text-extract
      if (!rawText || rawText.trim().length === 0) {
        console.log('⚠️ pdf-parse no extrajo texto, intentando pdf-text-extract...')
        
        const fs = require('fs')
        const path = require('path')
        const os = require('os')
        
        const tempDir = os.tmpdir()
        const tempFileName = `debug_pdf_${Date.now()}.pdf`
        const tempFilePath = path.join(tempDir, tempFileName)
        
        fs.writeFileSync(tempFilePath, buffer)
        
        const pdfTextExtract = require('pdf-text-extract')
        
        rawText = await new Promise((resolve, reject) => {
          pdfTextExtract(tempFilePath, (err: any, text: string) => {
            try {
              fs.unlinkSync(tempFilePath)
            } catch (cleanupError) {
              console.warn('Error al eliminar archivo temporal:', cleanupError)
            }
            
            if (err) {
              reject(err)
            } else {
              resolve(text)
            }
          })
        })
        
        console.log('✅ pdf-text-extract exitoso')
        console.log('Texto extraído (primeros 500 caracteres):')
        console.log(rawText.substring(0, 500))
        console.log('📏 Longitud total:', rawText.length)
        
        extractionMethod = 'pdf-text-extract'
      }
      
    } catch (parseError) {
      console.error('❌ Error con pdf-parse:', parseError)
      
      // Intentar con pdf-text-extract
      try {
        console.log('🔄 Intentando con pdf-text-extract...')
        
        const fs = require('fs')
        const path = require('path')
        const os = require('os')
        
        const tempDir = os.tmpdir()
        const tempFileName = `debug_pdf_${Date.now()}.pdf`
        const tempFilePath = path.join(tempDir, tempFileName)
        
        fs.writeFileSync(tempFilePath, buffer)
        
        const pdfTextExtract = require('pdf-text-extract')
        
        rawText = await new Promise((resolve, reject) => {
          pdfTextExtract(tempFilePath, (err: any, text: string) => {
            try {
              fs.unlinkSync(tempFilePath)
            } catch (cleanupError) {
              console.warn('Error al eliminar archivo temporal:', cleanupError)
            }
            
            if (err) {
              reject(err)
            } else {
              resolve(text)
            }
          })
        })
        
        console.log('✅ pdf-text-extract exitoso')
        console.log('Texto extraído (primeros 500 caracteres):')
        console.log(rawText.substring(0, 500))
        console.log('📏 Longitud total:', rawText.length)
        
        extractionMethod = 'pdf-text-extract'
        
      } catch (extractError) {
        console.error('❌ pdf-text-extract también falló:', extractError)
        extractionMethod = 'failed'
        rawText = 'ERROR: No se pudo extraer texto del PDF'
      }
    }

    // Buscar líneas específicas
    const lines = rawText.split('\n')
    const relevantLines = lines.filter(line => 
      line.includes('MONTO NETO') || 
      line.includes('I.V.A.') || 
      line.includes('TOTAL') ||
      line.includes('NETO') ||
      line.includes('IVA') ||
      line.includes('TOTAL')
    )

    console.log('🔍 Líneas relevantes encontradas:')
    relevantLines.forEach((line, index) => {
      console.log(`${index + 1}: "${line}"`)
    })

    return NextResponse.json({
      success: true,
      extractionMethod,
      textLength: rawText.length,
      first500Chars: rawText.substring(0, 500),
      relevantLines,
      fullText: rawText
    })

  } catch (error) {
    console.error('Error en debug PDF:', error)
    return NextResponse.json({ 
      error: 'Error procesando PDF', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
