import { NextRequest, NextResponse } from 'next/server'

// Función para extraer datos específicos del texto
const extractSpecificData = (text: string) => {
  const data: any = {}
  
  // Dividir el texto en líneas para procesar secuencialmente
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  // Buscar datos secuencialmente
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // issuer_name: Buscar "Giro:"
    if (line.includes('Giro:')) {
      data.issuerName = line.replace('Giro:', '').trim()
    }
    
    // issuer_rut: Buscar "R.U.T.:" (primer RUT)
    if (line.includes('R.U.T.:') && !data.issuerRut) {
      data.issuerRut = line.replace('R.U.T.:', '').trim()
    }
    
    // issuer_address: Buscar "PASAJE"
    if (line.includes('PASAJE')) {
      data.issuerAddress = line
    }
    
    // issuer_email: Buscar "eMail"
    if (line.includes('eMail')) {
      data.issuerEmail = line.replace('eMail', '').replace(':', '').trim()
    }
    
    // client_name: Buscar "SEÑOR(ES):"
    if (line.includes('SEÑOR(ES):')) {
      data.clientName = line.replace('SEÑOR(ES):', '').trim()
    }
    
    // client_rut: Buscar "R.U.T.:" (segundo RUT, después de SEÑOR(ES))
    if (line.includes('R.U.T.:') && data.issuerRut && !data.clientRut) {
      data.clientRut = line.replace('R.U.T.:', '').trim()
    }
    
    // client_address: Buscar "DIRECCION:"
    if (line.includes('DIRECCION:')) {
      data.clientAddress = line.replace('DIRECCION:', '').trim()
    }
    
    // client_city: Buscar "CIUDAD:"
    if (line.includes('CIUDAD:')) {
      data.clientCity = line.replace('CIUDAD:', '').trim()
    }
    
    // invoice_number: Buscar "FACTURA ELECTRONICA Nº"
    if (line.includes('FACTURA ELECTRONICA Nº')) {
      data.invoiceNumber = line.replace('FACTURA ELECTRONICA Nº', '').trim()
    }
    
    // issue_date: Buscar "Fecha Emision:"
    if (line.includes('Fecha Emision:')) {
      data.issueDate = line.replace('Fecha Emision:', '').trim()
    }
    
    // description: Buscar "Estado de pago"
    if (line.includes('Estado de pago')) {
      data.description = line
    }
    
    // contract_number: Buscar "Contrato N°"
    if (line.includes('Contrato N°')) {
      data.contractNumber = line
    }
    
    // payment_method: Buscar "Forma de Pago:"
    if (line.includes('Forma de Pago:')) {
      data.paymentMethod = line.replace('Forma de Pago:', '').trim()
    }
    
    // net_amount: Buscar "MONTO NETO$"
    if (line.includes('MONTO NETO$')) {
      data.netAmount = line.replace('MONTO NETO$', '').trim()
    }
    
    // iva_amount: Buscar "I.V.A. 19%$"
    if (line.includes('I.V.A. 19%$')) {
      data.ivaAmount = line.replace('I.V.A. 19%$', '').trim()
    }
    
    // additional_tax: Buscar "IMPUESTO ADICIONAL$"
    if (line.includes('IMPUESTO ADICIONAL$')) {
      data.additionalTax = line.replace('IMPUESTO ADICIONAL$', '').trim()
    }
    
    // total_amount: Buscar "TOTAL$"
    if (line.includes('TOTAL$')) {
      data.totalAmount = line.replace('TOTAL$', '').trim()
    }
  }

  return data
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }

    console.log('=== PRUEBA EXTRACT: pdf-text-extract ===')
    
    // Convertir archivo a buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('Buffer size:', buffer.length)

    try {
      // Usar pdf-text-extract - CORREGIDO para usar archivo temporal
      const fs = require('fs')
      const path = require('path')
      const os = require('os')
      
      // Crear archivo temporal
      const tempDir = os.tmpdir()
      const tempFileName = `temp_pdf_${Date.now()}.pdf`
      const tempFilePath = path.join(tempDir, tempFileName)
      
      console.log('Creando archivo temporal:', tempFilePath)
      
      // Escribir buffer a archivo temporal
      fs.writeFileSync(tempFilePath, buffer)
      console.log('Archivo temporal creado exitosamente')
      
      const pdfTextExtract = require('pdf-text-extract')
      
      const extractedText = await new Promise((resolve, reject) => {
        pdfTextExtract(tempFilePath, (err: any, text: string) => {
          // Limpiar archivo temporal
          try {
            fs.unlinkSync(tempFilePath)
            console.log('Archivo temporal eliminado')
          } catch (cleanupError) {
            console.warn('Error al eliminar archivo temporal:', cleanupError)
          }
          
          if (err) {
            console.error('Error en pdf-text-extract:', err)
            reject(err)
          } else {
            console.log('pdf-text-extract exitoso')
            resolve(text)
          }
        })
      })
      
      // Validar que extractedText sea un string
      console.log('Tipo de extractedText:', typeof extractedText)
      console.log('Valor de extractedText:', extractedText)
      
      const textString = typeof extractedText === 'string' ? extractedText : String(extractedText || '')
      console.log('Texto extraído (primeros 200 chars):', textString.substring(0, 200))
      
      // Extraer datos específicos del texto
      const extractedData = extractSpecificData(textString)
      console.log('Datos extraídos:', extractedData)
      
      return NextResponse.json({
        success: true,
        text: textString,
        method: 'pdf-text-extract-fixed',
        extractedData: extractedData,
        message: 'PDF PROCESADO EXITOSAMENTE - Archivo temporal corregido'
      })
      
    } catch (error) {
      console.error('Error con pdf-text-extract:', error)
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        method: 'pdf-text-extract'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
