import { NextRequest, NextResponse } from 'next/server'
import { createReport } from 'docx-templates'
import { WorkerContractData } from '@/lib/contracts'
import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

export async function POST(request: NextRequest) {
  try {
    const data: WorkerContractData = await request.json()
    
    // Validar datos requeridos
    if (!data.nombre_trabajador || !data.rut_trabajador || !data.nombre_obra) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' }, 
        { status: 400 }
      )
    }

    // Rutas a las plantillas
    const contractTemplatePath = path.join(process.cwd(), 'src/templates/contracts/ContratoTemplate.docx')
    const hoursTemplatePath = path.join(process.cwd(), 'src/templates/contracts/HorasTemplate .docx')
    
    // Verificar que las plantillas existen
    if (!fs.existsSync(contractTemplatePath)) {
      return NextResponse.json(
        { error: 'Plantilla de contrato no encontrada' }, 
        { status: 404 }
      )
    }

    if (!fs.existsSync(hoursTemplatePath)) {
      return NextResponse.json(
        { error: 'Plantilla de horas no encontrada' }, 
        { status: 404 }
      )
    }

    // Leer las plantillas
    const contractTemplate = fs.readFileSync(contractTemplatePath)
    const hoursTemplate = fs.readFileSync(hoursTemplatePath)

    // Datos para ambas plantillas
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
      fecha_inicio: data.fecha_inicio,
      fecha_termino: data.fecha_termino
    }

    // Generar ambos documentos
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
    
    // Crear nombres de archivos
    const timestamp = Date.now()
    const workerName = data.nombre_trabajador.replace(/\s+/g, '-')
    const contractFileName = `contrato-${workerName}-${timestamp}.docx`
    const hoursFileName = `horas-${workerName}-${timestamp}.docx`
    
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
  } catch (error) {
    console.error('Error generating contract:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor al generar el contrato' }, 
      { status: 500 }
    )
  }
}
