import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string
    const action = formData.get('action') as string // 'extract' or 'save' (default)

    if (!file || !projectId) {
      return NextResponse.json({ error: 'Archivo y proyecto son requeridos' }, { status: 400 })
    }

    console.log('=== PROCESANDO FACTURA CON PDF-PARSE ===')
    console.log('Archivo:', file.name)
    console.log('Proyecto:', projectId)
    console.log('Acción:', action || 'save (default)')

    // Subir PDF a Supabase Storage PRIMERO (necesitamos la URL para mostrar el PDF en el modal)
    let pdfUrl = null
    try {
      console.log('📤 Subiendo PDF a Supabase Storage...')
      const fileName = `invoice-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Error subiendo PDF:', uploadError)
        throw new Error(`Error subiendo archivo: ${uploadError.message}`)
      } else {
        // Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('invoices')
          .getPublicUrl(fileName)

        pdfUrl = publicUrl
        console.log('✅ PDF subido exitosamente:', pdfUrl)
      }
    } catch (storageError) {
      console.error('❌ Error en storage:', storageError)
      throw new Error(`Error crítico subiendo archivo: ${(storageError as Error).message}`)
    }

    // Convertir archivo a buffer para procesamiento
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('Buffer size:', buffer.length)

    let rawText = ''

    try {
      // INTENTO 1: Usar pdf-parse (Mejor para texto plano)
      console.log('🔄 Intentando extracción con pdf-parse...')
      try {
        const pdfParse = require('pdf-parse')
        const pdfData = await pdfParse(buffer)
        rawText = pdfData.text
        console.log('✅ Extracción exitosa con pdf-parse')
      } catch (pdfParseError) {
        console.warn('⚠️ Falló pdf-parse, intentando con pdf2json...', pdfParseError)

        // INTENTO 2: Fallback a pdf2json
        const PDFParser = require('pdf2json')
        const pdfParser = new PDFParser()

        rawText = await new Promise<string>((resolve, reject) => {
          pdfParser.on('pdfParser_dataError', (errData: any) => reject(new Error(errData.parserError)))
          pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            // Lógica simple de extracción para fallback
            let text = ''
            if (pdfData.Pages) {
              pdfData.Pages.forEach((page: any) => {
                if (page.Texts) {
                  // Ordenamiento simple
                  page.Texts.sort((a: any, b: any) => (a.y - b.y) || (a.x - b.x))
                  page.Texts.forEach((t: any) => {
                    if (t.R) t.R.forEach((r: any) => text += decodeURIComponent(r.T) + ' ')
                  })
                  text += '\n'
                }
              })
            }
            resolve(text)
          })
          pdfParser.parseBuffer(buffer)
        })
        console.log('✅ Extracción exitosa con pdf2json (fallback)')
      }

      console.log('=== DEBUG RAW TEXT (First 500 chars) ===')
      console.log(rawText.substring(0, 500))
      console.log('========================================')

    } catch (parseError) {
      console.error('=== ERROR AL PROCESAR PDF ===')
      console.error('Error parsing PDF:', parseError)

      return NextResponse.json({
        error: 'Error procesando PDF',
        details: parseError instanceof Error ? parseError.message : 'Error desconocido'
      }, { status: 500 })
    }

    // Función para validar si un monto es razonable
    const isReasonableAmount = (amount: string): boolean => {
      if (!amount) return false
      const cleaned = amount.replace(/[$]/g, '').trim()
      let numericValue = 0
      if (cleaned.includes('.')) {
        const parts = cleaned.split('.')
        if (parts.length > 2) numericValue = parseFloat(parts.join(''))
        else if (parts.length === 2) {
          if (parts[1].length === 2) numericValue = parseFloat(cleaned)
          else numericValue = parseFloat(parts.join(''))
        }
      } else numericValue = parseFloat(cleaned)

      if (isNaN(numericValue) || !isFinite(numericValue)) return false
      if (numericValue > 100000000 || numericValue < 0) return false
      return true
    }

    // Función para convertir fechas en español a formato ISO
    const convertSpanishDate = (dateText: string): string => {
      if (!dateText) return new Date().toISOString().split('T')[0]
      try {
        const monthMap: { [key: string]: string } = {
          'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
          'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
          'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        }
        const match = dateText.match(/(\d{1,2})\s+de\s+(\w+)\s+del\s+(\d{4})/)
        if (match) {
          const day = match[1].padStart(2, '0')
          const monthName = match[2].toLowerCase()
          const year = match[3]
          if (monthMap[monthName]) return `${year}-${monthMap[monthName]}-${day}`
        }
        return new Date().toISOString().split('T')[0]
      } catch (error) {
        return new Date().toISOString().split('T')[0]
      }
    }

    // Función para extraer datos usando texto del PDF
    const extractInvoiceData = (text: string) => {
      const data: any = {}
      data.ivaPercentage = 19.00
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

      let tableHeaderIndex = -1

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (line.includes('Giro:')) data.issuerName = line.replace('Giro:', '').trim()

        if (line.includes('R.U.T.:') && line.includes('FACTURA ELECTRONICA')) {
          const match = line.match(/R\.U\.T\.:\s*([\d.-kK]+)/)
          if (match) data.issuerRut = match[1]
        }

        if (line.includes('PASAJE')) {
          const addressMatch = line.match(/PASAJE[^-]+/)
          data.issuerAddress = addressMatch ? addressMatch[0].trim() : line
        }

        if (line.includes('eMail')) data.issuerEmail = line.replace('eMail', '').replace(':', '').trim()

        if (line.includes('SEÑOR(ES):')) {
          const clientMatch = line.match(/SEÑOR\(ES\):\s*(.+?)(?:\s+R\.U\.T\.:|$)/)
          if (clientMatch) data.clientName = clientMatch[1].trim()
        }

        if (line.includes('R.U.T.') && !line.includes('FACTURA ELECTRONICA') && !data.clientRut) {
          const clientRutMatch = line.match(/SEÑOR\(ES\):[^R]*R\.U\.T\.:\s*([\d.-kK]+)/)
          if (clientRutMatch) data.clientRut = clientRutMatch[1].trim()
          else {
            const allRutMatches = line.match(/R\.U\.T\.:\s*([\d.-kK]+)/g)
            if (allRutMatches && allRutMatches.length >= 2) {
              const firstRut = allRutMatches[0].replace('R.U.T.:', '').trim()
              const secondRut = allRutMatches[1].replace('R.U.T.:', '').trim()
              if (firstRut && !firstRut.includes('77.567.635')) data.clientRut = firstRut
              else if (secondRut && !secondRut.includes('77.567.635')) data.clientRut = secondRut
            }
          }
        }

        if (line.includes('DIRECCION:')) data.clientAddress = line.replace('DIRECCION:', '').trim()
        if (line.includes('CIUDAD:')) data.clientCity = line.replace('CIUDAD:', '').trim()

        if (line.includes('FACTURA ELECTRONICA')) {
          const invoiceMatch = line.match(/FACTURA ELECTRONICA\s*Nº?\s*(\d+)/)
          if (invoiceMatch) data.invoiceNumber = invoiceMatch[1].trim()
        } else if (line.match(/Nº\s*(\d+)/)) {
          const match = line.match(/Nº\s*(\d+)/)
          if (match) data.invoiceNumber = match[1]
        }

        if (line.includes('Fecha Emision:')) {
          const fechaMatch = line.match(/Fecha Emision:\s*(.+)$/)
          if (fechaMatch) data.issueDate = fechaMatch[1].trim()
        }

        // Find Table Header for fallback logic
        if (line.toLowerCase().includes('descripcion') && (line.toLowerCase().includes('codigo') || line.toLowerCase().includes('cantidad'))) {
          tableHeaderIndex = i
        }

        // IMPROVED DESCRIPTION LOGIC
        if (line.includes('Estado de pago')) {
          if (line.length < 150) {
            data.description = line
          }
        }

        if (line.includes('Contrato N°')) data.contractNumber = line
        if (line.includes('Forma de Pago:')) data.paymentMethod = line.replace('Forma de Pago:', '').trim()

        // Amounts
        if (line.includes('MONTO NETO')) {
          const match = line.match(/MONTO NETO\s*\$?\s*([\d.,]+)/) || line.match(/MONTO NETO\s*\$?\s*([\d\.]+)/)
          if (match && isReasonableAmount(match[1])) data.netAmount = match[1].trim()
        }
        if (line.includes('I.V.A. 19%')) {
          const match = line.match(/I\.V\.A\.\s*19%\s*\$?\s*([\d.,]+)/) || line.match(/I\.V\.A\.\s*19%\s*\$?\s*([\d\.]+)/)
          if (match && isReasonableAmount(match[1])) data.ivaAmount = match[1].trim()
        }
        if (line.includes('IMPUESTO ADICIONAL')) {
          const match = line.match(/IMPUESTO ADICIONAL\s*\$?\s*([\d.,]+)/)
          if (match && isReasonableAmount(match[1])) data.additionalTax = match[1].trim()
        }
        if (line.includes('TOTAL') && !line.includes('NETO')) {
          const match = line.match(/TOTAL\s*\$?\s*([\d.,]+)/)
          if (match && isReasonableAmount(match[1])) data.totalAmount = match[1].trim()
        }
      }

      // Fallback description strategy
      if ((!data.description || data.description.length > 200) && tableHeaderIndex !== -1 && tableHeaderIndex + 1 < lines.length) {
        const potentialDesc = lines[tableHeaderIndex + 1]
        if (potentialDesc.length > 5 && !potentialDesc.includes('Referencias')) {
          data.description = potentialDesc
        }
        // Try next line too if it appears to be part of description
        if (tableHeaderIndex + 2 < lines.length) {
          const nextLine = lines[tableHeaderIndex + 2]
          if (nextLine.includes('Estado de pago') || nextLine.length > 5) {
            // Avoid adding amounts or irrelevant lines
            if (!nextLine.includes('$') && !nextLine.includes('MONTO')) {
              data.description = (data.description ? data.description + ' ' : '') + nextLine
            }
          }
        }
      }

      return data
    }

    const extractedData = extractInvoiceData(rawText)

    // Función para limitar texto
    const limitText = (text: string, maxLength: number): string => {
      if (!text) return ''
      return text.length > maxLength ? text.substring(0, maxLength) : text
    }

    // Función para convertir montos
    const convertAmount = (amount: string): number => {
      if (!amount) return 0
      const cleaned = amount.replace(/[$]/g, '').trim()
      let result = 0
      if (cleaned.includes('.')) {
        const parts = cleaned.split('.')
        if (parts.length > 2) result = parseFloat(parts.join(''))
        else if (parts.length === 2) {
          if (parts[1].length === 2) result = parseFloat(cleaned)
          else result = parseFloat(parts.join(''))
        }
      } else result = parseFloat(cleaned)

      if (isNaN(result)) return 0
      if (result > 9999999999.99) return 9999999999.99
      if (result < 0) return 0
      return Math.round(result * 100) / 100
    }

    // Preparar objeto de datos
    const netAmount = convertAmount(extractedData.netAmount)
    const ivaAmount = convertAmount(extractedData.ivaAmount)
    const totalAmount = convertAmount(extractedData.totalAmount)
    const additionalTax = convertAmount(extractedData.additionalTax || '0')

    const invoiceData = {
      project_id: parseInt(projectId),
      issuer_name: limitText(extractedData.issuerName || '', 200),
      issuer_rut: '77.567.635-3',
      issuer_address: limitText(extractedData.issuerAddress || '', 200),
      issuer_email: limitText(extractedData.issuerEmail || '', 100),
      issuer_phone: null,
      client_name: limitText(extractedData.clientName || '', 200),
      client_rut: limitText(extractedData.clientRut || '', 50),
      client_address: limitText(extractedData.clientAddress || '', 200),
      client_city: limitText(extractedData.clientCity || '', 100),
      invoice_number: limitText(extractedData.invoiceNumber || '', 50),
      issue_date: extractedData.issueDate ? convertSpanishDate(extractedData.issueDate) : new Date().toISOString().split('T')[0],
      contract_date: new Date().toISOString().split('T')[0],
      invoice_type: null,
      description: limitText(extractedData.description || '', 500),
      contract_number: limitText(extractedData.contractNumber || '', 100),
      payment_method: limitText(extractedData.paymentMethod || '', 100),
      net_amount: netAmount,
      iva_percentage: extractedData.ivaPercentage || 19.00,
      iva_amount: ivaAmount,
      additional_tax: additionalTax,
      total_amount: totalAmount,
      pdf_url: pdfUrl,
      raw_text: limitText(rawText, 5000),
      parsed_data: extractedData,
      status: 'pending',
      is_processed: false
    }

    // SI LA ACCIÓN ES 'extract', RETORNAR DATOS SIN GUARDAR
    if (action === 'extract') {
      console.log('✅ Modo extracción: Retornando datos sin guardar')
      return NextResponse.json({
        success: true,
        data: invoiceData,
        extractedRaw: extractedData,
        pdfUrl: pdfUrl
      })
    }

    console.log('=== GUARDANDO EN BASE DE DATOS ===')
    // Guardar en la base de datos (comportamiento original)
    const { data: savedInvoice, error: dbError } = await supabase
      .from('invoice_income')
      .insert([invoiceData])
      .select()
      .single()

    if (dbError) {
      console.error('❌ Error saving to database:', dbError)
      return NextResponse.json({ error: `Error de base de datos: ${dbError.message}` }, { status: 500 })
    }

    console.log('✅ Factura guardada exitosamente:', savedInvoice.id)

    return NextResponse.json({
      success: true,
      invoice: savedInvoice,
      extractedData: extractedData
    })

  } catch (error) {
    console.error('❌ Error processing invoice:', error)
    return NextResponse.json({
      error: 'Error interno del servidor: ' + (error as Error).message
    }, { status: 500 })
  }
}
