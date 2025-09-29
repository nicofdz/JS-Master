'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react'

interface PlanImageZoomProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  projectName: string
  pdfUrl?: string
}

export function PlanImageZoom({ isOpen, onClose, imageUrl, projectName, pdfUrl }: PlanImageZoomProps) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Resetear valores al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setScale(1)
      setRotation(0)
      setPosition({ x: 0, y: 0 })
    }
  }, [isOpen])

  // Manejar tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 5))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.1))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleReset = () => {
    setScale(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.max(0.1, Math.min(5, prev * delta)))
  }

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a')
      link.href = pdfUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.download = `plano-${projectName.replace(/\s+/g, '-').toLowerCase()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="w-full h-full flex flex-col">
        {/* Header con controles */}
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold">Plano: {projectName}</h3>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomOut}
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2 py-1 bg-gray-700 rounded">
                {Math.round(scale * 100)}%
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleZoomIn}
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRotate}
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                Reset
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {pdfUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Área de imagen */}
        <div 
          className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <img
              src={imageUrl}
              alt={`Plano de ${projectName}`}
              className="max-w-none max-h-none select-none"
              draggable={false}
              style={{
                maxWidth: 'none',
                maxHeight: 'none',
                width: 'auto',
                height: 'auto'
              }}
            />
          </div>
        </div>

        {/* Footer con instrucciones */}
        <div className="bg-gray-900 text-white p-2 text-center text-sm">
          <p>
            🖱️ <strong>Rueda del mouse:</strong> Zoom • 
            🖱️ <strong>Arrastrar:</strong> Mover • 
            🔄 <strong>Rotar:</strong> Botón rotar • 
            ⌨️ <strong>ESC:</strong> Cerrar
          </p>
        </div>
      </div>
    </div>
  )
}
