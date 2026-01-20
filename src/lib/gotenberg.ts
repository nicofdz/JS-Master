export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
    const gotenbergUrl = process.env.GOTENBERG_API_URL

    if (!gotenbergUrl) {
        throw new Error('GOTENBERG_API_URL environment variable is not defined')
    }

    // Crear el body multipart
    const formData = new FormData()

    // Archivo a convertir
    const blob = new Blob([new Uint8Array(docxBuffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    formData.append('files', blob, 'index.docx')

    console.log(`Sending request to Gotenberg at: ${gotenbergUrl}/forms/libreoffice/convert`)

    try {
        const response = await fetch(`${gotenbergUrl}/forms/libreoffice/convert`, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            throw new Error(`Gotenberg API error: ${response.status} ${response.statusText}`)
        }

        const pdfArrayBuffer = await response.arrayBuffer()
        return Buffer.from(pdfArrayBuffer)
    } catch (error) {
        console.error('Error converting DOCX to PDF:', error)
        throw error
    }
}
