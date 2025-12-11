import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('=== API CONTRACTS GENERATE POST INICIADO ===')
  console.log('Request method:', request.method)
  console.log('Request URL:', request.url)
  console.log('Request headers:', Object.fromEntries(request.headers.entries()))

  try {
    const body = await request.json()
    const data: any = body
    const documentType = body.documentType || 'both' // 'both', 'contract', 'hours'

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

    // Rutas a las plantillas (en public/templates - accesible en Vercel)
    const contractTemplatePath = path.join(process.cwd(), 'public/templates/contracts/ContratoTemplate.docx')
    const hoursTemplatePath = path.join(process.cwd(), 'public/templates/contracts/HorasTemplate .docx')

    console.log('Buscando plantillas en:', {
      contractTemplatePath,
      hoursTemplatePath,
      cwd: process.cwd()
    })

    // Debug: Listar archivos en directorios clave para diagnóstico en Vercel
    try {
      const publicTemplatesPath = path.join(process.cwd(), 'public', 'templates')
      if (fs.existsSync(publicTemplatesPath)) {
        console.log('Contenido de public/templates:', fs.readdirSync(publicTemplatesPath))
        const contractsPath = path.join(publicTemplatesPath, 'contracts')
        if (fs.existsSync(contractsPath)) {
          console.log('Contenido de public/templates/contracts:', fs.readdirSync(contractsPath))
        } else {
          console.log('Directorio public/templates/contracts no existe')
        }
      } else {
        console.log('Directorio public/templates no existe')
      }
    } catch (e) {
      console.error('Error listando directorios:', e)
    }

    // Verificar que las plantillas necesarias existen
    if ((documentType === 'both' || documentType === 'contract') && !fs.existsSync(contractTemplatePath)) {
      console.error('Plantilla de contrato no encontrada en:', contractTemplatePath)
      return NextResponse.json(
        { error: 'Plantilla de contrato no encontrada' },
        { status: 404 }
      )
    }

    if ((documentType === 'both' || documentType === 'hours') && !fs.existsSync(hoursTemplatePath)) {
      console.error('Plantilla de horas no encontrada en:', hoursTemplatePath)
      return NextResponse.json(
        { error: 'Plantilla de horas no encontrada' },
        { status: 404 }
      )
    }

    // Datos para las plantillas
    const templateData = {
      // Datos del trabajador
      nombre_trabajador: data.nombre_trabajador,
      rut_trabajador: data.rut_trabajador,
      rut: data.rut_trabajador, // Alias por si la plantilla usa 'rut'
      direccion: data.direccion,
      telefono: data.telefono,
      email: data.email || data.correo,
      correo: data.correo || data.email, // La plantilla usa 'correo'
      nacionalidad: data.nacionalidad,
      fecha_nacimiento: data.fecha_nacimiento,
      estado_civil: data.estado_civil || data.estado,
      estado: data.estado || data.estado_civil, // La plantilla usa 'estado'
      ciudad: data.ciudad,
      cargo: data.cargo,
      prevision: data.prevision,
      salud: data.salud,
      // Datos de la obra
      nombre_obra: data.nombre_obra,
      obra: data.nombre_obra, // Alias común
      direccion_obra: data.direccion_obra || '',
      ciudad_obra: data.ciudad_obra || '',
      fecha_inicio: data.fecha_inicio,
      fecha_termino: data.fecha_termino,
      fecha_entrada_empresa: data.fecha_entrada_empresa || data.fecha_inicio
    }

    const timestamp = Date.now()
    // Función para sanitizar el nombre del archivo (eliminar tildes y caracteres especiales)
    const sanitizeFileName = (name: string) => {
      return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Eliminar diacríticos
        .replace(/[^a-zA-Z0-9\s-]/g, "") // Eliminar caracteres no alfanuméricos (excepto espacios y guiones)
        .replace(/\s+/g, '-') // Reemplazar espacios con guiones
        .trim()
    }

    const workerName = sanitizeFileName(data.nombre_trabajador)

    // Generar documentos según el tipo solicitado
    if (documentType === 'hours') {
      // Solo generar pacto de horas
      const hoursTemplate = fs.readFileSync(hoursTemplatePath)
      const hoursBuffer = await createReport({
        template: hoursTemplate,
        data: templateData,
        cmdDelimiter: ['{{', '}}']
      })

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
