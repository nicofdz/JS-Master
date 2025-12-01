'use client'

import { useState } from 'react'

export default function DebugPdfPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/invoices/debug-pdf', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
      setResult({ error: 'Error procesando archivo' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug PDF Extraction</h1>
      
      <div className="mb-4">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {loading && (
        <div className="text-blue-600">Procesando PDF...</div>
      )}

      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Resultado:</h2>
          
          <div className="bg-gray-100 p-4 rounded mb-4">
            <h3 className="font-semibold">Información General:</h3>
            <p><strong>Método de extracción:</strong> {result.extractionMethod}</p>
            <p><strong>Longitud del texto:</strong> {result.textLength} caracteres</p>
          </div>

          <div className="bg-gray-100 p-4 rounded mb-4">
            <h3 className="font-semibold">Primeros 500 caracteres:</h3>
            <pre className="whitespace-pre-wrap text-sm">{result.first500Chars}</pre>
          </div>

          {result.relevantLines && result.relevantLines.length > 0 && (
            <div className="bg-gray-100 p-4 rounded mb-4">
              <h3 className="font-semibold">Líneas relevantes encontradas:</h3>
              {result.relevantLines.map((line: string, index: number) => (
                <div key={index} className="text-sm">
                  {index + 1}: &quot;{line}&quot;
                </div>
              ))}
            </div>
          )}

          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold">Texto completo:</h3>
            <textarea 
              value={result.fullText} 
              readOnly 
              className="w-full h-64 text-xs font-mono"
            />
          </div>
        </div>
      )}
    </div>
  )
}
