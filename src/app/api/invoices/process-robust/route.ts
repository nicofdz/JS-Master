import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string

    if (!file || !projectId) {
      return NextResponse.json({ error: 'Archivo y proyecto son requeridos' }, { status: 400 })
    }

    console.log('=== PROCESANDO FACTURA CON PDF-PARSE ===')
    console.log('Archivo:', file.name)
    console.log('Proyecto:', projectId)

    // Convertir archivo a buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('Buffer size:', buffer.length)

    let rawText = ''

    try {
      // Usar pdf2json que es más confiable
      const PDFParser = require('pdf2json')
      
      console.log('🔄 Iniciando extracción con pdf2json...')
      const startTime = Date.now()
      
      const pdfParser = new PDFParser()
      
      rawText = await new Promise<string>((resolve, reject) => {
        pdfParser.on('pdfParser_dataError', (errData: any) => {
          reject(new Error(errData.parserError))
        })
        
        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
          // Extraer texto de todas las páginas
          let text = ''
          if (pdfData.Pages) {
            pdfData.Pages.forEach((page: any) => {
              if (page.Texts) {
                page.Texts.forEach((textObj: any) => {
                  if (textObj.R) {
                    textObj.R.forEach((r: any) => {
                      if (r.T) {
                        text += decodeURIComponent(r.T) + ' '
                      }
                    })
                  }
                })
                text += '\n'
              }
            })
          }
          resolve(text)
        })
        
        // Parsear el buffer
        pdfParser.parseBuffer(buffer)
      })
      
      const endTime = Date.now()
      console.log(`✅ PDF parseado exitosamente en ${endTime - startTime}ms`)
      console.log(`📏 Longitud del texto: ${rawText.length} caracteres`)
      console.log(`📄 Primeros 500 caracteres del texto extraído:`)
      console.log(rawText.substring(0, 500))
      console.log('='  .repeat(80))
      
      // Buscar líneas con MONTO NETO, IVA, TOTAL
      const lines = rawText.split('\n')
      console.log('🔍 Buscando líneas con valores...')
      lines.forEach((line, index) => {
        if (line.includes('MONTO NETO') || line.includes('I.V.A.') || line.includes('TOTAL')) {
          console.log(`Línea ${index + 1}: "${line}"`)
        }
      })
      
      // Si no se extrajo texto, retornar error
      if (!rawText || rawText.trim().length === 0) {
        console.error('❌ No se extrajo texto del PDF')
        return NextResponse.json({ 
          error: 'No se pudo extraer texto del PDF' 
        }, { status: 400 })
      }
      
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
      
      // Limpiar el monto
      const cleaned = amount.replace(/[$]/g, '').trim()
      
      // Convertir a número para validar
      let numericValue = 0
      
      if (cleaned.includes('.')) {
        const parts = cleaned.split('.')
        if (parts.length > 2) {
          // Separadores de miles
          numericValue = parseFloat(parts.join(''))
        } else if (parts.length === 2) {
          if (parts[1].length === 2) {
            // Decimal
            numericValue = parseFloat(cleaned)
          } else {
            // Separador de miles
            numericValue = parseFloat(parts.join(''))
          }
        }
      } else {
        numericValue = parseFloat(cleaned)
      }
      
      // Validar que sea un número válido y razonable
      if (isNaN(numericValue) || !isFinite(numericValue)) {
        return false
      }
      
      // Límite razonable: máximo 100 millones (100,000,000) - suficiente para facturas grandes
      const maxReasonable = 100000000
      
      if (numericValue > maxReasonable) {
        console.log(`⚠️ Monto excesivo detectado: ${amount} (${numericValue})`)
        return false
      }
      
      if (numericValue < 0) {
        console.log(`⚠️ Monto negativo detectado: ${amount}`)
        return false
      }
      
      return true
    }

    // Función para convertir fechas en español a formato ISO
    const convertSpanishDate = (dateText: string): string => {
      if (!dateText) return new Date().toISOString().split('T')[0]
      
      try {
        // Mapeo de meses en español
        const monthMap: { [key: string]: string } = {
          'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
          'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
          'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        }
        
        // Buscar patrón "DD de MES del YYYY"
        const match = dateText.match(/(\d{1,2})\s+de\s+(\w+)\s+del\s+(\d{4})/)
        if (match) {
          const day = match[1].padStart(2, '0')
          const monthName = match[2].toLowerCase()
          const year = match[3]
          
          if (monthMap[monthName]) {
            const isoDate = `${year}-${monthMap[monthName]}-${day}`
            console.log(`✅ Fecha convertida: "${dateText}" -> "${isoDate}"`)
            return isoDate
          }
        }
        
        // Si no se puede convertir, usar fecha actual
        console.log(`⚠️ No se pudo convertir fecha: "${dateText}"`)
        return new Date().toISOString().split('T')[0]
      } catch (error) {
        console.log(`⚠️ Error convirtiendo fecha: "${dateText}"`, error)
        return new Date().toISOString().split('T')[0]
      }
    }

    // Función para extraer datos usando texto del PDF
    const extractInvoiceData = (text: string) => {
      console.log('=== EXTRAYENDO DATOS DEL TEXTO ===')
      console.log('Texto completo:', text.substring(0, 500) + '...')
      
      const data: any = {}
      
      // iva_percentage: Siempre 19.00 (fijo)
      data.ivaPercentage = 19.00
      
      // Dividir el texto en líneas para procesar secuencialmente
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      
      // Buscar líneas específicas para debug
      console.log('🔍 Líneas que contienen SEÑOR(ES):')
      lines.forEach((line, index) => {
        if (line.includes('SEÑOR(ES)')) {
          console.log(`Línea ${index + 1}: "${line}"`)
        }
      })
      
      console.log('🔍 Líneas que contienen R.U.T.:')
      lines.forEach((line, index) => {
        if (line.includes('R.U.T.:')) {
          console.log(`Línea ${index + 1}: "${line}"`)
          // Buscar todos los RUTs en esta línea
          const rutMatches = line.match(/R\.U\.T\.:\s*([\d.-kK]+)/g)
          if (rutMatches) {
            console.log(`  RUTs encontrados: ${rutMatches.join(', ')}`)
          }
        }
      })
      
      console.log('🔍 Líneas que contienen FACTURA ELECTRONICA:')
      lines.forEach((line, index) => {
        if (line.includes('FACTURA ELECTRONICA')) {
          console.log(`Línea ${index + 1}: "${line}"`)
        }
      })
      console.log('Líneas del PDF:', lines.length)
      
      // Buscar datos secuencialmente
      let foundSeñores = false
      let foundClientSection = false
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        // issuer_name: Buscar "Giro:"
        if (line.includes('Giro:')) {
          data.issuerName = line.replace('Giro:', '').trim()
          console.log('issuerName encontrado:', data.issuerName)
        }
        
        // issuer_rut: Buscar "R.U.T.:" en la caja roja superior (FACTURA ELECTRONICA)
        if (line.includes('R.U.T.:') && line.includes('FACTURA ELECTRONICA')) {
          const match = line.match(/R\.U\.T\.:\s*([\d.-kK]+)/)
          if (match && match[1]) {
            data.issuerRut = match[1]
            console.log('issuerRut encontrado:', data.issuerRut)
          }
        }
        
        // issuer_address: Buscar "PASAJE"
        if (line.includes('PASAJE')) {
          const addressMatch = line.match(/PASAJE[^-]+/)
          if (addressMatch) {
            data.issuerAddress = addressMatch[0].trim()
          } else {
            data.issuerAddress = line
          }
          console.log('issuerAddress encontrado:', data.issuerAddress)
        }
        
        // issuer_email: Buscar "eMail"
        if (line.includes('eMail')) {
          data.issuerEmail = line.replace('eMail', '').replace(':', '').trim()
          console.log('issuerEmail encontrado:', data.issuerEmail)
        }
        
        // client_name: Buscar "SEÑOR(ES):" con patrones más flexibles
        if (line.includes('SEÑOR(ES):')) {
          const clientMatch = line.match(/SEÑOR\(ES\):\s*(.+?)(?:\s+R\.U\.T\.:|$)/)
          if (clientMatch && clientMatch[1]) {
            data.clientName = clientMatch[1].trim()
            foundSeñores = true
            foundClientSection = true
            console.log('clientName encontrado:', data.clientName)
          }
        }
        
        // client_rut: Buscar RUT del cliente específicamente después de SEÑOR(ES)
        if (line.includes('R.U.T.') && !line.includes('FACTURA ELECTRONICA') && !data.clientRut) {
          console.log('🔍 Buscando RUT del cliente en línea:', line.substring(0, 200) + '...')
          
          // Buscar el RUT del cliente que está después de SEÑOR(ES)
          const clientRutMatch = line.match(/SEÑOR\(ES\):[^R]*R\.U\.T\.:\s*([\d.-kK]+)/)
          if (clientRutMatch && clientRutMatch[1]) {
            data.clientRut = clientRutMatch[1].trim()
            console.log('✅ clientRut encontrado después de SEÑOR(ES):', data.clientRut)
          } else {
            // Buscar todos los RUTs en la línea
            const allRutMatches = line.match(/R\.U\.T\.:\s*([\d.-kK]+)/g)
            console.log('🔍 Todos los RUTs encontrados:', allRutMatches)
            
            if (allRutMatches && allRutMatches.length >= 2) {
              // El primer RUT después de SEÑOR(ES) es del cliente
              const firstRut = allRutMatches[0].replace('R.U.T.:', '').trim()
              const secondRut = allRutMatches[1].replace('R.U.T.:', '').trim()
              
              console.log('🔍 Primer RUT:', firstRut)
              console.log('🔍 Segundo RUT:', secondRut)
              
              // El RUT del cliente es el que NO es 77.567.635-3
              if (firstRut && !firstRut.includes('77.567.635')) {
                data.clientRut = firstRut
                console.log('✅ clientRut encontrado (primer RUT):', data.clientRut)
              } else if (secondRut && !secondRut.includes('77.567.635')) {
                data.clientRut = secondRut
                console.log('✅ clientRut encontrado (segundo RUT):', data.clientRut)
              }
            }
          }
        }
        
        // client_address: Buscar "DIRECCION:"
        if (line.includes('DIRECCION:')) {
          data.clientAddress = line.replace('DIRECCION:', '').trim()
          console.log('clientAddress encontrado:', data.clientAddress)
        }
        
        // client_city: Buscar "CIUDAD:"
        if (line.includes('CIUDAD:')) {
          data.clientCity = line.replace('CIUDAD:', '').trim()
          console.log('clientCity encontrado:', data.clientCity)
        }
        
        // invoice_number: Buscar varios patrones de número de factura
        if (line.includes('FACTURA ELECTRONICA')) {
          const invoiceMatch = line.match(/FACTURA ELECTRONICA\s*Nº?\s*(\d+)/)
          if (invoiceMatch && invoiceMatch[1]) {
            data.invoiceNumber = invoiceMatch[1].trim()
            console.log('invoiceNumber encontrado:', data.invoiceNumber)
          }
        } else if (line.match(/Nº\s*(\d+)/)) {
          const match = line.match(/Nº\s*(\d+)/)
          if (match && match[1]) {
            data.invoiceNumber = match[1]
            console.log('invoiceNumber encontrado (patrón 2):', data.invoiceNumber)
          }
        }
        
        // issue_date: Buscar "Fecha Emision:"
        if (line.includes('Fecha Emision:')) {
          const fechaMatch = line.match(/Fecha Emision:\s*(.+)$/)
          if (fechaMatch && fechaMatch[1]) {
            const dateText = fechaMatch[1].trim()
            if (dateText && (dateText.includes('de') || dateText.includes('/') || dateText.includes('-') || /\d/.test(dateText))) {
              data.issueDate = dateText
              console.log('issueDate encontrado:', data.issueDate)
            }
          }
        }
        
        // description: Buscar "Estado de pago"
        if (line.includes('Estado de pago')) {
          data.description = line
          console.log('description encontrado:', data.description)
        }
        
        // contract_number: Buscar "Contrato N°"
        if (line.includes('Contrato N°')) {
          data.contractNumber = line
          console.log('contractNumber encontrado:', data.contractNumber)
        }
        
        // payment_method: Buscar "Forma de Pago:"
        if (line.includes('Forma de Pago:')) {
          data.paymentMethod = line.replace('Forma de Pago:', '').trim()
          console.log('paymentMethod encontrado:', data.paymentMethod)
        }
        
        // net_amount: Buscar "MONTO NETO" con patrones más flexibles
        if (line.includes('MONTO NETO')) {
          // Patrones más flexibles para capturar montos
          const patterns = [
            /MONTO NETO\s*\$?\s*([\d.,]+)/,
            /MONTO NETO\s*\$?\s*([\d\s.,]+)/,
            /MONTO NETO\s*\$?\s*([\d.]+)/,
            /MONTO NETO\s*\$?\s*([\d,]+)/
          ]
          
          for (const pattern of patterns) {
            const match = line.match(pattern)
            if (match && match[1]) {
              const amount = match[1].trim()
              console.log('🔍 Intentando extraer netAmount:', amount)
              if (isReasonableAmount(amount)) {
                data.netAmount = amount
                console.log('✅ netAmount encontrado:', data.netAmount)
                break
              } else {
                console.log('⚠️ netAmount muy grande, intentando siguiente patrón:', amount)
              }
            }
          }
        }
        
        // iva_amount: Buscar "I.V.A. 19%" con patrones flexibles
        if (line.includes('I.V.A. 19%')) {
          const patterns = [
            /I\.V\.A\.\s*19%\s*\$?\s*([\d.,]+)/,
            /I\.V\.A\.\s*19%\s*\$?\s*([\d\s.,]+)/,
            /I\.V\.A\.\s*19%\s*\$?\s*([\d.]+)/,
            /I\.V\.A\.\s*19%\s*\$?\s*([\d,]+)/
          ]
          
          for (const pattern of patterns) {
            const match = line.match(pattern)
            if (match && match[1]) {
              const amount = match[1].trim()
              console.log('🔍 Intentando extraer ivaAmount:', amount)
              if (isReasonableAmount(amount)) {
                data.ivaAmount = amount
                console.log('✅ ivaAmount encontrado:', data.ivaAmount)
                break
              } else {
                console.log('⚠️ ivaAmount muy grande, intentando siguiente patrón:', amount)
              }
            }
          }
        }
        
        // additional_tax: Buscar "IMPUESTO ADICIONAL"
        if (line.includes('IMPUESTO ADICIONAL')) {
          const patterns = [
            /IMPUESTO ADICIONAL\s*\$?\s*([\d.,]+)/,
            /IMPUESTO ADICIONAL\s*\$?\s*([\d\s.,]+)/,
            /IMPUESTO ADICIONAL\s*\$?\s*([\d.]+)/,
            /IMPUESTO ADICIONAL\s*\$?\s*([\d,]+)/
          ]
          
          for (const pattern of patterns) {
            const match = line.match(pattern)
            if (match && match[1]) {
              const amount = match[1].trim()
              if (isReasonableAmount(amount)) {
                data.additionalTax = amount
                console.log('✅ additionalTax encontrado:', data.additionalTax)
                break
              }
            }
          }
        }
        
        // total_amount: Buscar "TOTAL" con patrones flexibles
        if (line.includes('TOTAL') && !line.includes('NETO') && !line.includes('IVA') && !line.includes('ADICIONAL')) {
          const patterns = [
            /TOTAL\s*\$?\s*([\d.,]+)/,
            /TOTAL\s*\$?\s*([\d\s.,]+)/,
            /TOTAL\s*\$?\s*([\d.]+)/,
            /TOTAL\s*\$?\s*([\d,]+)/
          ]
          
          for (const pattern of patterns) {
            const match = line.match(pattern)
            if (match && match[1]) {
              const amount = match[1].trim()
              console.log('🔍 Intentando extraer totalAmount:', amount)
              if (isReasonableAmount(amount)) {
                data.totalAmount = amount
                console.log('✅ totalAmount encontrado:', data.totalAmount)
                break
              } else {
                console.log('⚠️ totalAmount muy grande, intentando siguiente patrón:', amount)
              }
            }
          }
        }
      }

      return data
    }

    // Extraer datos del texto
    console.log('=== INICIANDO EXTRACCIÓN DE DATOS ===')
    console.log('Texto completo a procesar:', rawText.substring(0, 500) + '...')
    console.log('Longitud del texto:', rawText.length)
    
    const extractedData = extractInvoiceData(rawText)
    console.log('=== DATOS EXTRAÍDOS ===')
    console.log('Datos extraídos:', extractedData)
    console.log('Neto extraído:', extractedData.netAmount)
    console.log('IVA extraído:', extractedData.ivaAmount)
    console.log('Total extraído:', extractedData.totalAmount)

    // Función para limitar texto
    const limitText = (text: string, maxLength: number): string => {
      if (!text) return ''
      return text.length > maxLength ? text.substring(0, maxLength) : text
    }

    // Función para convertir montos con límites seguros
    const convertAmount = (amount: string): number => {
      if (!amount) return 0
      
      const cleaned = amount.replace(/[$]/g, '').trim()
      
      let result = 0
      
      if (cleaned.includes('.')) {
        const parts = cleaned.split('.')
        
        if (parts.length > 2) {
          // Separadores de miles (formato chileno)
          result = parseFloat(parts.join(''))
        } else if (parts.length === 2) {
          if (parts[1].length === 2) {
            // Decimal
            result = parseFloat(cleaned)
          } else {
            // Separador de miles
            result = parseFloat(parts.join(''))
          }
        }
      } else {
        result = parseFloat(cleaned)
      }
      
      // Validar que el resultado esté dentro de los límites de DECIMAL(12,2)
      // Máximo: 9,999,999,999.99 (menor que 10^10)
      const maxValue = 9999999999.99
      const minValue = 0
      
      if (isNaN(result)) {
        console.warn('⚠️ Valor no numérico detectado:', amount)
        return 0
      }
      
      if (result > maxValue) {
        console.warn('⚠️ Valor excede máximo permitido:', result, '-> limitado a', maxValue)
        return maxValue
      }
      
      if (result < minValue) {
        console.warn('⚠️ Valor negativo detectado:', result, '-> limitado a', minValue)
        return minValue
      }
      
      // Redondear a 2 decimales
      return Math.round(result * 100) / 100
    }
    
    const netAmount = convertAmount(extractedData.netAmount)
    const ivaAmount = convertAmount(extractedData.ivaAmount)
    const totalAmount = convertAmount(extractedData.totalAmount)
    const additionalTax = convertAmount(extractedData.additionalTax || '0')
    
    console.log('Montos convertidos:', { netAmount, ivaAmount, totalAmount, additionalTax })
    
    // Validación final de montos antes de guardar
    const validateAmount = (value: number, fieldName: string): number => {
      if (isNaN(value) || !isFinite(value)) {
        console.warn(`⚠️ ${fieldName} no es un número válido:`, value)
        return 0
      }
      
      if (value > 9999999999.99) {
        console.warn(`⚠️ ${fieldName} excede el máximo permitido:`, value)
        return 9999999999.99
      }
      
      if (value < 0) {
        console.warn(`⚠️ ${fieldName} es negativo:`, value)
        return 0
      }
      
      return Math.round(value * 100) / 100
    }
    
    const safeNetAmount = validateAmount(netAmount, 'netAmount')
    const safeIvaAmount = validateAmount(ivaAmount, 'ivaAmount')
    const safeTotalAmount = validateAmount(totalAmount, 'totalAmount')
    const safeAdditionalTax = validateAmount(additionalTax, 'additionalTax')
    
    console.log('Montos validados:', { 
      safeNetAmount, 
      safeIvaAmount, 
      safeTotalAmount, 
      safeAdditionalTax 
    })
    
    // Subir PDF a Supabase Storage
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
    
    const invoiceData = {
      project_id: projectId,
      issuer_name: limitText(extractedData.issuerName || '', 200),
      issuer_rut: '77.567.635-3', // RUT fijo del emisor
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
      net_amount: safeNetAmount,
      iva_percentage: extractedData.ivaPercentage || 19.00,
      iva_amount: safeIvaAmount,
      additional_tax: safeAdditionalTax,
      total_amount: safeTotalAmount,
      pdf_url: pdfUrl,
      raw_text: limitText(rawText, 5000),
      parsed_data: extractedData,
      status: 'pending',
      is_processed: false
    }

    console.log('=== GUARDANDO EN BASE DE DATOS ===')
    console.log('Datos procesados:', invoiceData)

    // Guardar en la base de datos
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
