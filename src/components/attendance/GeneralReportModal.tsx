'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Calendar, Download, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Worker {
    id: number
    full_name: string
    rut: string
}

interface Project {
    id: number
    name: string
}

interface GeneralReportModalProps {
    isOpen: boolean
    onClose: () => void
    workers: Worker[]
    projects: Project[]
    selectedProjectId: number | null
}

export function GeneralReportModal({
    isOpen,
    onClose,
    workers,
    projects,
    selectedProjectId
}: GeneralReportModalProps) {
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [filterProjectId, setFilterProjectId] = useState<number | null>(selectedProjectId)
    const [generating, setGenerating] = useState(false)

    // Actualizar el proyecto seleccionado cuando cambia la prop
    useEffect(() => {
        setFilterProjectId(selectedProjectId)
    }, [selectedProjectId])

    // Inicializar fechas con el mes actual
    useEffect(() => {
        if (!startDate || !endDate) {
            const today = new Date()
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

            setStartDate(firstDay.toISOString().split('T')[0])
            setEndDate(lastDay.toISOString().split('T')[0])
        }
    }, [])

    const handleGenerate = async () => {
        if (!startDate || !endDate) {
            toast.error('Debe seleccionar un rango de fechas')
            return
        }

        if (new Date(startDate) > new Date(endDate)) {
            toast.error('La fecha de inicio debe ser anterior a la fecha de fin')
            return
        }

        try {
            setGenerating(true)
            toast.loading('Generando reporte...', { id: 'generating-report' })

            // Construir consulta base
            let query = supabase
                .from('worker_attendance')
                .select(`
          *,
          projects(name),
          workers(full_name, rut)
        `)
                .gte('attendance_date', startDate)
                .lte('attendance_date', endDate)
                .order('attendance_date', { ascending: true })

            // Aplicar filtro de proyecto si está seleccionado
            if (filterProjectId) {
                query = query.eq('project_id', filterProjectId)
            }

            const { data: attendances, error: attendanceError } = await query

            if (attendanceError) throw attendanceError

            // Agrupar datos por trabajador
            const workerStats: Record<number, {
                worker: Worker,
                presentDays: number,
                lateArrivals: number,
                earlyDepartures: number,
                notes: string[]
            }> = {}

            // Inicializar con todos los trabajadores disponibles
            workers.forEach(w => {
                workerStats[w.id] = {
                    worker: w,
                    presentDays: 0,
                    lateArrivals: 0,
                    earlyDepartures: 0,
                    notes: []
                }
            })

            attendances?.forEach((att: any) => {
                if (workerStats[att.worker_id]) {
                    if (att.is_present) {
                        workerStats[att.worker_id].presentDays++
                    }
                    if (att.late_arrival) workerStats[att.worker_id].lateArrivals++
                    if (att.early_departure) workerStats[att.worker_id].earlyDepartures++
                    if (att.notes) {
                        const date = new Date(att.attendance_date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
                        workerStats[att.worker_id].notes.push(`[${date}] ${att.notes}`)
                    }
                }
            })

            // Determinar nombre del proyecto para el título
            const projectName = filterProjectId
                ? projects.find(p => p.id === filterProjectId)?.name
                : 'General (Todas las Obras)'

            // Generar PDF
            await generatePDF(Object.values(workerStats), startDate, endDate, projectName || 'General')

            toast.success('Reporte generado exitosamente', { id: 'generating-report' })
            onClose()
        } catch (error: any) {
            console.error('Error generating report:', error)
            toast.error(error.message || 'Error al generar el reporte', { id: 'generating-report' })
        } finally {
            setGenerating(false)
        }
    }

    const generatePDF = async (
        stats: any[],
        startDate: string,
        endDate: string,
        projectName: string
    ) => {
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()

        // Título
        doc.setFontSize(18)
        doc.text('Reporte de Asistencia', pageWidth / 2, 20, { align: 'center' })

        doc.setFontSize(14)
        doc.text(projectName, pageWidth / 2, 30, { align: 'center' })

        doc.setFontSize(12)
        doc.text(`Período: ${new Date(startDate).toLocaleDateString('es-CL')} - ${new Date(endDate).toLocaleDateString('es-CL')}`, pageWidth / 2, 40, { align: 'center' })

        // Preparar datos para la tabla
        const tableData = stats
            .filter(s => s.presentDays > 0 || s.notes.length > 0) // Opcional: ocultar los que no tienen actividad
            .map(s => [
                s.worker.full_name,
                s.worker.rut,
                s.presentDays,
                s.lateArrivals,
                s.earlyDepartures,
                s.notes.join('\n') // Unir notas con saltos de línea
            ])

        // Generar tabla
        autoTable(doc, {
            startY: 50,
            head: [['Trabajador', 'RUT', 'Días', 'Atrasos', 'Salidas', 'Notas']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            columnStyles: {
                0: { cellWidth: 40 }, // Nombre
                1: { cellWidth: 25 }, // RUT
                2: { cellWidth: 15, halign: 'center' }, // Días
                3: { cellWidth: 15, halign: 'center' }, // Atrasos
                4: { cellWidth: 15, halign: 'center' }, // Salidas
                5: { cellWidth: 'auto' } // Notas
            }
        })

        const fileName = `reporte-${projectName.replace(/\s+/g, '-').toLowerCase()}-${startDate}-${endDate}.pdf`
        doc.save(fileName)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Generar Reporte"
            size="md"
        >
            <div className="space-y-6">
                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-slate-200 mb-1">
                                Reporte de Asistencia
                            </p>
                            <p className="text-xs text-slate-400">
                                Genera un resumen de asistencia, filtrando por obra o general.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Seleccionar Obra
                        </label>
                        <select
                            value={filterProjectId?.toString() || ''}
                            onChange={(e) => setFilterProjectId(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Reporte General (Todas las Obras)</option>
                            {projects.map(project => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Fecha Inicio
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Fecha Fin
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={generating}
                        className="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={generating || !startDate || !endDate}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {generating ? 'Generando...' : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Generar PDF
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
