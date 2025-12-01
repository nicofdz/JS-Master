'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { FileText, Download, Calendar, User, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDateToChilean } from '@/lib/contracts'
import toast from 'react-hot-toast'

interface ContractGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Worker {
  id: number
  full_name: string
  rut: string
  email: string
  phone: string
  // Campos que pueden estar vacíos pero los traemos de la BD
  direccion?: string
  ciudad?: string
  nacionalidad?: string
  estado_civil?: string
  fecha_nacimiento?: string
  prevision?: string
  salud?: string
  cargo?: string
}

interface Project {
  id: number
  name: string
  address?: string
}

export function ContractGeneratorModal({ isOpen, onClose }: ContractGeneratorModalProps) {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [loading, setLoading] = useState(false)

  // Cargar datos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Cargar trabajadores
      const { data: workersData, error: workersError } = await supabase
        .from('workers')
        .select('*')
        .order('full_name')

      if (workersError) throw workersError

      // Cargar proyectos
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('name')

      if (projectsError) throw projectsError

      setWorkers(workersData || [])
      setProjects(projectsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateContract = async () => {
    if (!selectedWorker || !selectedProject || !startDate || !endDate) {
      toast.error('Por favor completa todos los campos')
      return
    }

    try {
      setIsGenerating(true)

      // Preparar datos del contrato
      const contractData = {
        // Datos del trabajador
        nombre_trabajador: selectedWorker.full_name,
        rut_trabajador: selectedWorker.rut,
        direccion: selectedWorker.direccion || 'No especificado',
        telefono: selectedWorker.phone,
        correo: selectedWorker.email,
        ciudad: selectedWorker.ciudad || 'No especificado',
        nacionalidad: selectedWorker.nacionalidad || 'Chilena',
        estado: selectedWorker.estado_civil || 'No especificado',
        fecha_nacimiento: selectedWorker.fecha_nacimiento 
          ? formatDateToChilean(selectedWorker.fecha_nacimiento)
          : 'No especificado',
        prevision: selectedWorker.prevision || 'No especificado',
        salud: selectedWorker.salud || 'No especificado',
        
        // Datos del trabajo
        cargo: selectedWorker.cargo || 'Trabajador',
        nombre_obra: selectedProject.name,
        fecha_inicio: formatDateToChilean(startDate),
        fecha_termino: formatDateToChilean(endDate)
      }

      // Llamar a la API para generar el contrato
      console.log('Enviando petición a /api/contracts/generate con método POST')
      console.log('Datos del contrato:', contractData)
      
      const response = await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData),
      })

      console.log('Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`Error al generar el contrato: ${errorText}`)
      }

      // Descargar el archivo ZIP
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `documentos-${selectedWorker.full_name}-${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Documentos generados exitosamente (Contrato + Horas)')
      onClose()
    } catch (error) {
      console.error('Error generating contract:', error)
      toast.error('Error al generar el contrato')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClose = () => {
    setSelectedWorker(null)
    setSelectedProject(null)
    setStartDate('')
    setEndDate('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generar Documentos de Trabajo"
      className="modal_contratos"
    >
      <div className="space-y-6">
        {/* Selección de Trabajador */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Seleccionar Trabajador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedWorker?.id?.toString() || ''}
              onChange={(e) => {
                const workerId = parseInt(e.target.value)
                const worker = workers.find(w => w.id === workerId)
                setSelectedWorker(worker || null)
              }}
              disabled={loading}
            >
              <option value="">Selecciona un trabajador</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.full_name} - {worker.rut}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>

        {/* Selección de Proyecto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-600" />
              Seleccionar Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedProject?.id?.toString() || ''}
              onChange={(e) => {
                const projectId = parseInt(e.target.value)
                const project = projects.find(p => p.id === projectId)
                setSelectedProject(project || null)
              }}
              disabled={loading}
            >
              <option value="">Selecciona un proyecto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>

        {/* Fechas del Contrato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Duración del Contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Inicio
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Término
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen del Contrato */}
        {selectedWorker && selectedProject && startDate && endDate && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <FileText className="h-5 w-5 text-blue-400" />
                Resumen de los Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-slate-200">
                <p><strong className="text-slate-300">Trabajador:</strong> {selectedWorker.full_name}</p>
                <p><strong className="text-slate-300">RUT:</strong> {selectedWorker.rut}</p>
                <p><strong className="text-slate-300">Proyecto:</strong> {selectedProject.name}</p>
                <p><strong className="text-slate-300">Período:</strong> {formatDateToChilean(startDate)} - {formatDateToChilean(endDate)}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerateContract}
            disabled={!selectedWorker || !selectedProject || !startDate || !endDate || isGenerating || loading}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? 'Generando...' : 'Generar Documentos'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
