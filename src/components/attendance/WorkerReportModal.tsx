'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Calendar, FileText, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'

interface Worker {
    id: number
    full_name: string
    rut: string
}

interface Project {
    id: number
    name: string
}

interface Contract {
    id: number
    worker_id: number
    project_id: number
    status: string
}

interface WorkerReportModalProps {
    isOpen: boolean
    onClose: () => void
    workers: Worker[]
    projects: Project[]
    selectedProjectId: number | null
    preselectedWorkerId?: number | null
    contracts?: Contract[]
}

export function WorkerReportModal({
    isOpen,
    onClose,
    workers,
    projects,
    selectedProjectId,
    preselectedWorkerId,
    contracts = []
}: WorkerReportModalProps) {
    const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(preselectedWorkerId || null)
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [includeCalendar, setIncludeCalendar] = useState(true)
    const [includeDetails, setIncludeDetails] = useState(true)
    const [includeStats, setIncludeStats] = useState(true)
    const [generating, setGenerating] = useState(false)

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

    // Establecer trabajador preseleccionado cuando el modal se abre
    useEffect(() => {
        if (isOpen && preselectedWorkerId) {
            setSelectedWorkerId(preselectedWorkerId)
        } else if (!isOpen) {
            // Limpiar cuando se cierra el modal
            setSelectedWorkerId(null)
        }
    }, [isOpen, preselectedWorkerId])

    const handleGenerate = async () => {
        if (!selectedWorkerId) {
            toast.error('Debe seleccionar un trabajador')
            return
        }

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
            toast.loading('Generando reporte PDF...', { id: 'generating-report' })

            // Obtener datos del trabajador
            const selectedWorker = workers.find(w => w.id === selectedWorkerId)
            if (!selectedWorker) {
                throw new Error('Trabajador no encontrado')
            }

            // Obtener datos de asistencia
            const { data: attendances, error: attendanceError } = await supabase
                .from('worker_attendance')
                .select(`
          *,
          projects(name),
          contract_history(contract_number, contract_type)
        `)
                .eq('worker_id', selectedWorkerId)
                .gte('attendance_date', startDate)
                .lte('attendance_date', endDate)
                .order('attendance_date', { ascending: true })

            if (attendanceError) throw attendanceError

            // Obtener contratos del trabajador en el rango de fechas
            const { data: contracts, error: contractsError } = await supabase
                .from('contract_history')
                .select('id, project_id, contract_type, fecha_inicio, fecha_termino, projects(name)')
                .eq('worker_id', selectedWorkerId)
                .or(`fecha_termino.gte.${startDate},fecha_termino.is.null`)
                .lte('fecha_inicio', endDate)

            if (contractsError) throw contractsError

            // Generar PDF
            await generatePDF(
                selectedWorker,
                attendances || [],
                contracts || [],
                startDate,
                endDate,
                includeCalendar,
                includeDetails,
                includeStats
            )

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
        worker: Worker,
        attendances: any[],
        contracts: any[],
        startDate: string,
        endDate: string,
        includeCalendar: boolean,
        includeDetails: boolean,
        includeStats: boolean
    ) => {
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 15
        let yPos = margin
        const lineHeight = 7
        const sectionSpacing = 10

        // Colores
        const primaryColor = [41, 128, 185] // Azul
        const successColor = [46, 204, 113] // Verde
        const warningColor = [241, 196, 15] // Amarillo
        const dangerColor = [231, 76, 60] // Rojo

        // Función para agregar nueva página si es necesario
        const checkNewPage = (requiredSpace: number) => {
            if (yPos + requiredSpace > pageHeight - margin) {
                doc.addPage()
                yPos = margin
                return true
            }
            return false
        }

        // Encabezado
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.rect(0, 0, pageWidth, 40, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.text('REPORTE DE ASISTENCIA', pageWidth / 2, 20, { align: 'center' })

        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.text(`Trabajador: ${worker.full_name}`, pageWidth / 2, 30, { align: 'center' })
        doc.text(`RUT: ${worker.rut}`, pageWidth / 2, 36, { align: 'center' })

        yPos = 50

        // Información del período
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Período:', margin, yPos)
        doc.setFont('helvetica', 'normal')
        const startDateFormatted = new Date(startDate).toLocaleDateString('es-CL')
        const endDateFormatted = new Date(endDate).toLocaleDateString('es-CL')
        doc.text(`${startDateFormatted} - ${endDateFormatted}`, margin + 30, yPos)
        yPos += lineHeight + sectionSpacing

        // Estadísticas (si está marcado)
        if (includeStats) {
            checkNewPage(40)

            const totalDays = attendances.length
            const presentDays = attendances.filter(a => a.is_present).length
            const absentDays = totalDays - presentDays
            const totalHours = attendances
                .filter(a => a.is_present && a.hours_worked)
                .reduce((sum: number, a: any) => sum + (a.hours_worked || 0), 0)
            const lateArrivals = attendances.filter(a => a.late_arrival).length
            const earlyDepartures = attendances.filter(a => a.early_departure).length
            const overtimeDays = attendances.filter(a => a.is_overtime).length
            const totalOvertimeHours = attendances
                .filter(a => a.is_overtime && a.overtime_hours)
                .reduce((sum: number, a: any) => sum + (a.overtime_hours || 0), 0)

            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.text('RESUMEN Y ESTADÍSTICAS', margin, yPos)
            yPos += lineHeight + 5

            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`Total de días registrados: ${totalDays}`, margin, yPos)
            yPos += lineHeight
            doc.text(`Días presentes: ${presentDays}`, margin, yPos)
            yPos += lineHeight
            doc.text(`Días ausentes: ${absentDays}`, margin, yPos)
            yPos += lineHeight
            doc.text(`Total de horas trabajadas: ${totalHours.toFixed(1)}`, margin, yPos)
            yPos += lineHeight
            doc.text(`Llegadas tardías: ${lateArrivals}`, margin, yPos)
            yPos += lineHeight
            doc.text(`Salidas tempranas: ${earlyDepartures}`, margin, yPos)
            yPos += lineHeight
            doc.text(`Días con horas extra: ${overtimeDays}`, margin, yPos)
            yPos += lineHeight
            doc.text(`Total horas extra: ${totalOvertimeHours.toFixed(1)}`, margin, yPos)
            yPos += sectionSpacing + 5
        }

        // Calendario mensual (si está marcado)
        if (includeCalendar) {
            // Agrupar por mes
            const attendancesByMonth: Record<string, any[]> = {}
            attendances.forEach((att: any) => {
                const monthKey = att.attendance_date.substring(0, 7) // YYYY-MM
                if (!attendancesByMonth[monthKey]) {
                    attendancesByMonth[monthKey] = []
                }
                attendancesByMonth[monthKey].push(att)
            })

            for (const [monthKey, monthAttendances] of Object.entries(attendancesByMonth)) {
                checkNewPage(80)

                const [year, month] = monthKey.split('-')
                const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

                doc.setFontSize(12)
                doc.setFont('helvetica', 'bold')
                doc.text(`CALENDARIO - ${monthName.toUpperCase()}`, margin, yPos)
                yPos += lineHeight + 5

                // Crear calendario simple
                const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate()
                const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1).getDay()
                const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1 // Lunes = 0

                // Encabezados de días
                doc.setFontSize(8)
                const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
                const cellWidth = 8
                const cellHeight = 6
                let xPos = margin

                dayNames.forEach(day => {
                    doc.setFont('helvetica', 'bold')
                    doc.text(day, xPos + cellWidth / 2, yPos, { align: 'center' })
                    xPos += cellWidth + 1
                })
                yPos += cellHeight + 2

                // Días del mes
                xPos = margin
                let dayCount = 0

                // Espacios vacíos antes del primer día
                for (let i = 0; i < adjustedFirstDay; i++) {
                    xPos += cellWidth + 1
                    dayCount++
                }

                for (let day = 1; day <= daysInMonth; day++) {
                    if (dayCount % 7 === 0 && dayCount > 0) {
                        xPos = margin
                        yPos += cellHeight + 1
                        checkNewPage(cellHeight + 5)
                    }

                    const dateStr = `${year}-${month.padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const attendance = monthAttendances.find((a: any) => a.attendance_date === dateStr)

                    if (attendance) {
                        if (attendance.is_present) {
                            doc.setFillColor(successColor[0], successColor[1], successColor[2])
                        } else {
                            doc.setFillColor(dangerColor[0], dangerColor[1], dangerColor[2])
                        }
                        doc.rect(xPos, yPos - cellHeight, cellWidth, cellHeight, 'F')
                        doc.setTextColor(255, 255, 255)
                    } else {
                        doc.setFillColor(240, 240, 240)
                        doc.rect(xPos, yPos - cellHeight, cellWidth, cellHeight, 'F')
                        doc.setTextColor(150, 150, 150)
                    }

                    doc.setFontSize(7)
                    doc.text(String(day), xPos + cellWidth / 2, yPos - 2, { align: 'center' })
                    doc.setTextColor(0, 0, 0)

                    xPos += cellWidth + 1
                    dayCount++
                }

                yPos += cellHeight + sectionSpacing + 5
            }
        }

        // Detalle diario (si está marcado)
        if (includeDetails && attendances.length > 0) {
            checkNewPage(30)

            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.text('DETALLE DIARIO', margin, yPos)
            yPos += lineHeight + 5

            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            const tableHeaders = ['Fecha', 'Estado', 'Entrada', 'Salida', 'Horas', 'Observaciones']
            const colWidths = [30, 20, 25, 25, 20, pageWidth - margin * 2 - 120]
            let xPos = margin

            tableHeaders.forEach((header, idx) => {
                doc.text(header, xPos, yPos)
                xPos += colWidths[idx]
            })
            yPos += lineHeight + 2

            // Línea separadora
            doc.setDrawColor(200, 200, 200)
            doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)
            yPos += 3

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)

            attendances.forEach((att: any) => {
                checkNewPage(20)

                xPos = margin
                const date = new Date(att.attendance_date).toLocaleDateString('es-CL')
                doc.text(date, xPos, yPos)
                xPos += colWidths[0]

                const status = att.is_present ? 'Presente' : 'Ausente'
                doc.text(status, xPos, yPos)
                xPos += colWidths[1]

                if (att.check_in_time) {
                    const checkIn = typeof att.check_in_time === 'string'
                        ? att.check_in_time.substring(11, 16)
                        : 'N/A'
                    doc.text(checkIn, xPos, yPos)
                }
                xPos += colWidths[2]

                if (att.check_out_time) {
                    const checkOut = typeof att.check_out_time === 'string'
                        ? att.check_out_time.substring(11, 16)
                        : 'N/A'
                    doc.text(checkOut, xPos, yPos)
                }
                xPos += colWidths[3]

                if (att.hours_worked) {
                    doc.text(`${att.hours_worked.toFixed(1)}h`, xPos, yPos)
                }
                xPos += colWidths[4]

                let notes = ''
                if (att.late_arrival) notes += 'Llegó tarde. '
                if (att.early_departure) notes += 'Salió temprano. '
                if (att.is_overtime) notes += `Horas extra: ${att.overtime_hours || 0}h. `
                if (att.notes) notes += att.notes
                if (notes.length > 50) notes = notes.substring(0, 47) + '...'
                doc.text(notes || '-', xPos, yPos)

                yPos += lineHeight + 2
            })
        }

        // Pie de página
        const totalPages = doc.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setTextColor(150, 150, 150)
            doc.text(
                `Página ${i} de ${totalPages}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            )
            doc.text(
                `Generado el ${new Date().toLocaleDateString('es-CL')}`,
                pageWidth / 2,
                pageHeight - 5,
                { align: 'center' }
            )
        }

        // Descargar PDF
        const fileName = `reporte-asistencia-${worker.full_name.replace(/\s+/g, '-')}-${startDate}-${endDate}.pdf`
        doc.save(fileName)
    }

    // Filtrar trabajadores con contratos activos
    const workersWithActiveContracts = workers.filter(w => {
        return contracts.some(c =>
            c.worker_id === w.id &&
            c.status === 'activo'
        )
    })

    // Filtrar por proyecto si hay uno seleccionado
    const availableWorkers = selectedProjectId
        ? workersWithActiveContracts.filter(w => {
            return contracts.some(c =>
                c.worker_id === w.id &&
                c.project_id === selectedProjectId &&
                c.status === 'activo'
            )
        })
        : workersWithActiveContracts

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Generar Reporte de Asistencia"
            size="lg"
        >
            <div className="space-y-6">
                {/* Información */}
                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-slate-200 mb-1">
                                Reporte Individual por Trabajador
                            </p>
                            <p className="text-xs text-slate-400">
                                Genera un reporte PDF detallado con la asistencia de un trabajador en el rango de fechas seleccionado.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Selección de trabajador */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Trabajador <span className="text-red-400">*</span>
                    </label>
                    <select
                        value={selectedWorkerId?.toString() || ''}
                        onChange={(e) => setSelectedWorkerId(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={!!preselectedWorkerId}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">Seleccionar trabajador...</option>
                        {availableWorkers.map(worker => (
                            <option key={worker.id} value={worker.id}>
                                {worker.full_name} - {worker.rut}
                            </option>
                        ))}
                    </select>
                    {preselectedWorkerId && (
                        <p className="text-xs text-slate-400 mt-1">
                            Trabajador preseleccionado desde la tarjeta
                        </p>
                    )}
                </div>

                {/* Rango de fechas */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Fecha Inicio <span className="text-red-400">*</span>
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
                            Fecha Fin <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Opciones del reporte */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                        Opciones del Reporte
                    </label>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeCalendar}
                                onChange={(e) => setIncludeCalendar(e.target.checked)}
                                className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-300">Incluir calendario mensual</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeDetails}
                                onChange={(e) => setIncludeDetails(e.target.checked)}
                                className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-300">Incluir detalle diario (horarios, problemas)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeStats}
                                onChange={(e) => setIncludeStats(e.target.checked)}
                                className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-300">Incluir estadísticas y resumen</span>
                        </label>
                    </div>
                </div>

                {/* Botones */}
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
                        disabled={generating || !selectedWorkerId || !startDate || !endDate}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {generating ? (
                            'Generando...'
                        ) : (
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
