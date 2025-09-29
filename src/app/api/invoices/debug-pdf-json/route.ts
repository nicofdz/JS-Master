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

    console.log('=== PRUEBA JSON: pdf2json ===')
    
    // Convertir archivo a buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('Buffer size:', buffer.length)

    try {
      // Usar pdf2json
      const PDFParser = require('pdf2json')
      const pdfParser = new PDFParser()
      
      const pdfData = await new Promise((resolve, reject) => {
        pdfParser.on('pdfParser_dataError', (errData: any) => {
          console.error('Error parsing PDF:', errData.parserError)
          reject(errData.parserError)
        })
        
        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
          console.log('PDF parseado exitosamente')
          resolve(pdfData)
        })
        
        // Parsear el buffer
        pdfParser.parseBuffer(buffer)
      })
      
      // Extraer texto de todas las páginas
      let fullText = ''
      if (pdfData.Pages) {
        console.log('Páginas encontradas:', pdfData.Pages.length)
        
        pdfData.Pages.forEach((page: any, pageIndex: number) => {
          console.log(`Procesando página ${pageIndex + 1}`)
          
          if (page.Texts) {
            page.Texts.forEach((textObj: any) => {
              if (textObj.R) {
                textObj.R.forEach((r: any) => {
                  if (r.T) {
                    const text = decodeURIComponent(r.T)
                    fullText += text + ' '
                    console.log('Texto extraído:', text)
                  }
                })
              }
            })
          }
        })
      }
      
      console.log('Texto completo extraído:', fullText.substring(0, 200))
      
      // Extraer datos específicos del texto
      const extractedData = extractSpecificData(fullText)
      console.log('Datos extraídos:', extractedData)
      
      return NextResponse.json({
        success: true,
        text: fullText,
        pages: pdfData.Pages ? pdfData.Pages.length : 0,
        rawData: pdfData,
        method: 'pdf2json',
        extractedData: extractedData
      })
      
    } catch (error) {
      console.error('Error con pdf2json:', error)
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        method: 'pdf2json'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
