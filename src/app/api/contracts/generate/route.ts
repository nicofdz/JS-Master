import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data: any = body
    const documentType = body.documentType || 'both' // 'both', 'contract', 'hours'
    const format = body.format || 'docx' // 'docx', 'pdf'

    // Validar datos requeridos
    if (!data.nombre_trabajador || !data.rut_trabajador || !data.nombre_obra) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    const JSZip = (await import('jszip')).default
    const { createReport } = await import('docx-templates')

    // Importar helper de conversión PDF si es necesario
    let convertDocxToPdf: (buffer: Buffer) => Promise<Buffer>;
    if (format === 'pdf') {
      const gotenbergModule = await import('@/lib/gotenberg');
      convertDocxToPdf = gotenbergModule.convertDocxToPdf;
    }

    // Initialize Supabase Client
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Helper para descargar plantilla desde Supabase
    const downloadTemplate = async (fileName: string): Promise<Buffer> => {
      console.log(`Descargando plantilla ${fileName} desde Supabase...`)
      const { data, error } = await supabase.storage
        .from('contracts')
        .download(`templates/${fileName}`)

      if (error) {
        throw new Error(`Error descargando ${fileName}: ${error.message}`)
      }

      // Convertir Blob a Buffer
      const arrayBuffer = await data.arrayBuffer()
      return Buffer.from(arrayBuffer)
    }

    // Datos para las plantillas
    const templateData = {
      // Datos del trabajador
      nombre_trabajador: data.nombre_trabajador,
      rut_trabajador: data.rut_trabajador,
      rut: data.rut_trabajador,
      direccion: data.direccion,
      telefono: data.telefono,
      email: data.email || data.correo,
      correo: data.correo || data.email,
      nacionalidad: data.nacionalidad,
      fecha_nacimiento: data.fecha_nacimiento,
      estado_civil: data.estado_civil || data.estado,
      estado: data.estado || data.estado_civil,
      ciudad: data.ciudad,
      cargo: data.cargo,
      prevision: data.prevision,
      salud: data.salud,
      // Datos de la obra
      nombre_obra: data.nombre_obra,
      obra: data.nombre_obra,
      direccion_obra: data.direccion_obra || '',
      ciudad_obra: data.ciudad_obra || '',
      fecha_inicio: data.fecha_inicio,
      fecha_termino: data.fecha_termino,
      fecha_entrada_empresa: data.fecha_entrada_empresa || data.fecha_inicio
    }

    const timestamp = Date.now()
    const sanitizeFileName = (name: string) => {
      return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, '-')
        .trim()
    }

    const workerName = sanitizeFileName(data.nombre_trabajador)

    // Generar documentos según el tipo solicitado
    if (documentType === 'hours') {
      const hoursTemplate = await downloadTemplate('HorasTemplate.docx')
      let hoursBuffer = await createReport({
        template: hoursTemplate,
        data: templateData,
        cmdDelimiter: ['{{', '}}']
      })

      if (format === 'pdf') {
        hoursBuffer = await convertDocxToPdf!(Buffer.from(hoursBuffer));
      }

      const fileExtension = format === 'pdf' ? 'pdf' : 'docx';
      const hoursFileName = `pacto-horas-${workerName}-${timestamp}.${fileExtension}`
      const contentType = format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      return new NextResponse(hoursBuffer as any, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${hoursFileName}"`,
          'Cache-Control': 'no-cache'
        }
      })
    } else if (documentType === 'contract') {
      const contractTemplate = await downloadTemplate('ContratoTemplate.docx')
      let contractBuffer = await createReport({
        template: contractTemplate,
        data: templateData,
        cmdDelimiter: ['{{', '}}']
      })

      if (format === 'pdf') {
        contractBuffer = await convertDocxToPdf!(Buffer.from(contractBuffer));
      }

      const fileExtension = format === 'pdf' ? 'pdf' : 'docx';
      const contractFileName = `contrato-${workerName}-${timestamp}.${fileExtension}`
      const contentType = format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      return new NextResponse(contractBuffer as any, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${contractFileName}"`,
          'Cache-Control': 'no-cache'
        }
      })
    } else {
      // Generar ambos
      const [contractTemplateRes, hoursTemplateRes] = await Promise.all([
        downloadTemplate('ContratoTemplate.docx'),
        downloadTemplate('HorasTemplate.docx')
      ])

      const [contractParams, hoursParams] = await Promise.all([
        createReport({
          template: contractTemplateRes,
          data: templateData,
          cmdDelimiter: ['{{', '}}']
        }),
        createReport({
          template: hoursTemplateRes,
          data: templateData,
          cmdDelimiter: ['{{', '}}']
        })
      ])

      let contractBuffer = Buffer.from(contractParams);
      let hoursBuffer = Buffer.from(hoursParams);

      if (format === 'pdf') {
        const [pdfContract, pdfHours] = await Promise.all([
          convertDocxToPdf!(contractBuffer as any),
          convertDocxToPdf!(hoursBuffer as any)
        ]);
        contractBuffer = pdfContract as any;
        hoursBuffer = pdfHours as any;
      }

      const fileExtension = format === 'pdf' ? 'pdf' : 'docx';
      const contractFileName = `contrato-${workerName}-${timestamp}.${fileExtension}`
      const hoursFileName = `pacto-horas-${workerName}-${timestamp}.${fileExtension}`

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
    console.error('=== ERROR EN API CONTRACTS GENERATE ===')
    console.error('Error generating contract (Stack Trace):', error)
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    return NextResponse.json(
      {
        error: 'Error interno del servidor al generar el contrato',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
