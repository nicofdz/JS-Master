import { NextRequest, NextResponse } from 'next/server'
import { WorkerContractData } from '@/lib/contracts'

// Configuración para Vercel
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Tiempo máximo de ejecución en segundos

export async function GET() {
  return NextResponse.json(
    { 
      message: 'API de generación de contratos',
      method: 'Use POST para generar contratos',
      endpoint: '/api/contracts/generate'
    }, 
    { status: 200 }
  )
}

export async function POST(request: NextRequest) {
  console.log('=== API CONTRACTS GENERATE POST INICIADO ===')
  console.log('Request method:', request.method)
  console.log('Request URL:', request.url)
  console.log('Request headers:', Object.fromEntries(request.headers.entries()))
  
  try {
<<<<<<< HEAD
    const body = await request.json()
    const data: WorkerContractData = body
    const documentType = body.documentType || 'both' // 'both', 'contract', 'hours'
=======
    const data: WorkerContractData = await request.json()
    console.log('Datos recibidos:', data)
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
    
    // Validar datos requeridos
    if (!data.nombre_trabajador || !data.rut_trabajador || !data.nombre_obra) {
      console.log('Faltan datos requeridos')
      return NextResponse.json(
        { error: 'Faltan datos requeridos' }, 
        { status: 400 }
      )
    }

    // Importar dinámicamente las dependencias que causan problemas
    console.log('Importando dependencias...')
    const fs = await import('fs')
    const path = await import('path')
    const JSZip = (await import('jszip')).default
    const { createReport } = await import('docx-templates')
    console.log('Dependencias importadas exitosamente')

    // Rutas a las plantillas (en .next/server/templates después del build)
    const contractTemplatePath = path.join(process.cwd(), '.next/server/templates/contracts/ContratoTemplate.docx')
    const hoursTemplatePath = path.join(process.cwd(), '.next/server/templates/contracts/HorasTemplate .docx')
    
    console.log('Buscando plantillas en:', {
      contractTemplatePath,
      hoursTemplatePath,
      cwd: process.cwd()
    })
    
<<<<<<< HEAD
    // Verificar que las plantillas necesarias existen
    if ((documentType === 'both' || documentType === 'contract') && !fs.existsSync(contractTemplatePath)) {
=======
    // Verificar que las plantillas existen
    if (!fs.existsSync(contractTemplatePath)) {
      console.error('Plantilla de contrato no encontrada en:', contractTemplatePath)
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
      return NextResponse.json(
        { error: 'Plantilla de contrato no encontrada' }, 
        { status: 404 }
      )
    }

<<<<<<< HEAD
    if ((documentType === 'both' || documentType === 'hours') && !fs.existsSync(hoursTemplatePath)) {
=======
    if (!fs.existsSync(hoursTemplatePath)) {
      console.error('Plantilla de horas no encontrada en:', hoursTemplatePath)
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
      return NextResponse.json(
        { error: 'Plantilla de horas no encontrada' }, 
        { status: 404 }
      )
    }

<<<<<<< HEAD
    // Datos para las plantillas
=======
    // Leer las plantillas
    console.log('Leyendo plantillas...')
    const contractTemplate = fs.readFileSync(contractTemplatePath)
    const hoursTemplate = fs.readFileSync(hoursTemplatePath)
    
    console.log('Plantillas leídas exitosamente:', {
      contractSize: contractTemplate.length,
      hoursSize: hoursTemplate.length
    })

    // Datos para ambas plantillas
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
    const templateData = {
      // Datos del trabajador
      nombre_trabajador: data.nombre_trabajador,
      rut_trabajador: data.rut_trabajador,
      direccion: data.direccion,
      telefono: data.telefono,
      correo: data.correo,
      ciudad: data.ciudad,
      nacionalidad: data.nacionalidad,
      estado: data.estado,
      fecha_nacimiento: data.fecha_nacimiento,
      prevision: data.prevision,
      salud: data.salud,
      
      // Datos del trabajo
      cargo: data.cargo,
      nombre_obra: data.nombre_obra,
      direccion_obra: data.direccion_obra,
      ciudad_obra: data.ciudad_obra,
      fecha_inicio: data.fecha_inicio,
      fecha_termino: data.fecha_termino,
      fecha_entrada_empresa: data.fecha_entrada_empresa
    }

<<<<<<< HEAD
    const timestamp = Date.now()
    const workerName = data.nombre_trabajador.replace(/\s+/g, '-')

    // Generar documentos según el tipo solicitado
    if (documentType === 'hours') {
      // Solo generar pacto de horas
      const hoursTemplate = fs.readFileSync(hoursTemplatePath)
      const hoursBuffer = await createReport({
=======
    // Generar ambos documentos
    console.log('Generando documentos...')
    const [contractBuffer, hoursBuffer] = await Promise.all([
      createReport({
        template: contractTemplate,
        data: templateData,
        cmdDelimiter: ['{{', '}}']
      }),
      createReport({
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
        template: hoursTemplate,
        data: templateData,
        cmdDelimiter: ['{{', '}}']
      })
<<<<<<< HEAD
      
      const hoursFileName = `pacto-horas-${workerName}-${timestamp}.docx`
      
      return new NextResponse(hoursBuffer as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${hoursFileName}"`,
          'Cache-Control': 'no-cache'
        }
      })
    } else if (documentType === 'contract') {
      // Solo generar contrato
      const contractTemplate = fs.readFileSync(contractTemplatePath)
      const contractBuffer = await createReport({
        template: contractTemplate,
        data: templateData,
        cmdDelimiter: ['{{', '}}']
      })
      
      const contractFileName = `contrato-${workerName}-${timestamp}.docx`
      
      return new NextResponse(contractBuffer as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${contractFileName}"`,
          'Cache-Control': 'no-cache'
        }
      })
    } else {
      // Generar ambos documentos (comportamiento por defecto)
      const contractTemplate = fs.readFileSync(contractTemplatePath)
      const hoursTemplate = fs.readFileSync(hoursTemplatePath)
      
      const [contractBuffer, hoursBuffer] = await Promise.all([
        createReport({
          template: contractTemplate,
          data: templateData,
          cmdDelimiter: ['{{', '}}']
        }),
        createReport({
          template: hoursTemplate,
          data: templateData,
          cmdDelimiter: ['{{', '}}']
        })
      ])
      
      const contractFileName = `contrato-${workerName}-${timestamp}.docx`
      const hoursFileName = `pacto-horas-${workerName}-${timestamp}.docx`
      
      // Crear un ZIP con ambos archivos
      const zip = new JSZip()
      zip.file(contractFileName, contractBuffer)
      zip.file(hoursFileName, hoursBuffer)
      
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
      const zipFileName = `documentos-${workerName}-${timestamp}.zip`
      
      return new NextResponse(zipBuffer as any, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${zipFileName}"`,
          'Cache-Control': 'no-cache'
        }
      })
    }
=======
    ])
    console.log('Documentos generados exitosamente')
    
    // Crear nombres de archivos
    const timestamp = Date.now()
    const workerName = data.nombre_trabajador.replace(/\s+/g, '-')
    const contractFileName = `contrato-${workerName}-${timestamp}.docx`
    const hoursFileName = `horas-${workerName}-${timestamp}.docx`
    
    // Crear un ZIP con ambos archivos
    console.log('Creando archivo ZIP...')
    const zip = new JSZip()
    
    zip.file(contractFileName, contractBuffer as any)
    zip.file(hoursFileName, hoursBuffer as any)
    
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const zipFileName = `documentos-${workerName}-${timestamp}.zip`
    console.log('ZIP creado exitosamente:', zipFileName)
    
    return new NextResponse(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
        'Cache-Control': 'no-cache'
      }
    })
>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
  } catch (error) {
    console.error('=== ERROR EN API CONTRACTS GENERATE ===')
    console.error('Error generating contract:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    })
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al generar el contrato',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}
