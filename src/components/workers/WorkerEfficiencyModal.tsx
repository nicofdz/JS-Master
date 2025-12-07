'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal' // Assuming generic Modal exists
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'
import { Loader2, TrendingUp, CheckCircle2, Clock, Calendar, Award, Download } from 'lucide-react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts'
import jsPDF from 'jspdf'

interface WorkerEfficiencyModalProps {
    isOpen: boolean
    onClose: () => void
    workerId: number
    workerName: string
}

interface EfficiencyStats {
    totalTasksCompleted: number
    avgCompletionTimeDays: number
    onTimeRate: number
    attendanceRate: number
    efficiencyScore: number
}

interface MonthlyData {
    month: string
    tasksCompleted: number
    attendancePercentage: number
    efficiency: number
}

export function WorkerEfficiencyModal({
    isOpen,
    onClose,
    workerId,
    workerName
}: WorkerEfficiencyModalProps) {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<EfficiencyStats | null>(null)
    const [chartData, setChartData] = useState<MonthlyData[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && workerId) {
            fetchEfficiencyData()
        }
    }, [isOpen, workerId])

    const fetchEfficiencyData = async () => {
        setLoading(true)
        setError(null)
        try {
            // 1. Fetch Completed Tasks (Assignments)
            // We look for assignments that are completed.
            const { data: assignments, error: tasksError } = await supabase
                .from('task_assignments')
                .select(`
          id,
          completed_at,
          worker_payment,
          assignment_status,
          tasks!inner (
            id,
            total_budget,
            start_date,
            end_date,
            created_at,
            is_delayed
          )
        `)
                .eq('worker_id', workerId)
                .eq('assignment_status', 'completed')
                .eq('is_deleted', false)
                .order('completed_at', { ascending: true })

            if (tasksError) throw tasksError

            // 2. Fetch Attendance
            // Get all present days in the last 6 months (or all time if needed)
            // For accurate "Rate", we need active contract days. 
            // Simplified approach: (Present Days) / (Rough Estimate of working days in that period)
            // Better approach: Get contract history to know valid ranges.

            const { data: attendance, error: attendanceError } = await supabase
                .from('worker_attendance')
                .select('attendance_date, is_present')
                .eq('worker_id', workerId)
                .eq('is_present', true)

            if (attendanceError) throw attendanceError

            const { data: contracts, error: contractsError } = await supabase
                .from('contract_history')
                .select('fecha_inicio, fecha_termino, status')
                .eq('worker_id', workerId)
                .eq('is_active', true)

            if (contractsError) throw contractsError

            // --- CALCULATIONS ---

            // A. Task Metrics
            const totalTasks = assignments?.length || 0
            let totalDurationMs = 0
            let onTimeCount = 0
            let tasksWithTime = 0

            // Group by Month for Chart
            const monthlyStats = new Map<string, { tasks: number, present: number, workingDays: number }>()

            // Initialize last 6 months
            const today = new Date()
            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                monthlyStats.set(key, { tasks: 0, present: 0, workingDays: 0 })
            }

            // Process Tasks
            assignments?.forEach((a: any) => {
                const completedDate = new Date(a.completed_at || a.tasks.created_at) // Fallback if needed
                const monthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`

                // Update Chart Data
                if (monthlyStats.has(monthKey)) {
                    monthlyStats.get(monthKey)!.tasks += 1
                }

                // On Time Check
                const endDate = a.tasks.end_date ? new Date(a.tasks.end_date) : null
                if (endDate) {
                    if (completedDate <= endDate && !a.tasks.is_delayed) {
                        onTimeCount++
                    }
                } else {
                    // If no end_date, assume on time if not marked delayed
                    if (!a.tasks.is_delayed) onTimeCount++
                }

                // Duration Check
                // We use created_at as start proxy if started_at not available (assignment doesn't have started_at usually in this schema?)
                // Let's assume task creation is start relative to assignment for simplicity unless we have precise log
                const startDate = new Date(a.tasks.created_at)
                const duration = completedDate.getTime() - startDate.getTime()
                if (duration > 0) {
                    totalDurationMs += duration
                    tasksWithTime++
                }
            })

            const onTimeRate = totalTasks > 0 ? (onTimeCount / totalTasks) * 100 : 100
            const avgDurationDays = tasksWithTime > 0 ? (totalDurationMs / tasksWithTime) / (1000 * 60 * 60 * 24) : 0

            // B. Attendance Metrics (Calculated per month for trend, and global)
            // We need to calculate how many "working days" existed in the contract periods

            let totalWorkingDays = 0
            let totalPresentDays = attendance?.length || 0

            // Helper to check if a date is within any active contract
            const isContractActive = (date: Date) => {
                return contracts?.some(c => {
                    const start = new Date(c.fecha_inicio)
                    const end = c.fecha_termino ? new Date(c.fecha_termino) : new Date('2099-12-31')
                    return date >= start && date <= end
                })
            }

            // Iterate through months to calculate potential working days
            monthlyStats.forEach((val, key) => {
                const [year, month] = key.split('-').map(Number)
                const daysInMonth = new Date(year, month, 0).getDate()

                let workingDaysInMonth = 0
                for (let d = 1; d <= daysInMonth; d++) {
                    const date = new Date(year, month - 1, d)
                    // Exclude weekends
                    if (date.getDay() !== 0 && date.getDay() !== 6) {
                        if (isContractActive(date)) {
                            workingDaysInMonth++
                            totalWorkingDays++ // Accumulate global
                        }
                    }
                }
                val.workingDays = workingDaysInMonth
            })

            // Count actual present days per month
            attendance?.forEach((att: any) => {
                const d = new Date(att.attendance_date)
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                if (monthlyStats.has(key)) {
                    monthlyStats.get(key)!.present += 1
                }
            })

            // Calculate Rates and Score
            const globalAttendanceRate = totalWorkingDays > 0 ? (totalPresentDays / totalWorkingDays) * 100 : 0

            // Heuristic Efficiency Score (0-100)
            // Weighted: 40% Attendance, 40% OnTime, 20% Volume Bonus (capped)
            const volumeScore = Math.min(totalTasks * 2, 100) // 50 tasks = 100% volume score
            // Be lenient with attendance if very few working days
            const attScore = totalWorkingDays === 0 ? 100 : Math.min(globalAttendanceRate, 100)
            const efficiencyScore = (attScore * 0.4) + (onTimeRate * 0.4) + (volumeScore * 0.2)

            setStats({
                totalTasksCompleted: totalTasks,
                avgCompletionTimeDays: Math.round(avgDurationDays * 10) / 10,
                onTimeRate: Math.round(onTimeRate),
                attendanceRate: Math.round(globalAttendanceRate),
                efficiencyScore: Math.round(efficiencyScore)
            })

            // Format Chart Data
            const finalChartData: MonthlyData[] = Array.from(monthlyStats.entries()).map(([month, data]) => {
                const mAttRate = data.workingDays > 0 ? (data.present / data.workingDays) * 100 : 0
                // Simple monthly efficiency
                const mEff = (mAttRate * 0.5) + (Math.min(data.tasks * 5, 100) * 0.5)

                return {
                    month,
                    tasksCompleted: data.tasks,
                    attendancePercentage: Math.round(mAttRate),
                    efficiency: Math.round(mEff)
                }
            }).sort((a, b) => a.month.localeCompare(b.month))

            setChartData(finalChartData)

        } catch (err: any) {
            console.error('Error fetching efficiency stats:', err)
            setError('Error al calcular eficiencia')
        } finally {
            setLoading(false)
        }
    }

    const handleExportPDF = () => {
        if (!stats || !workerName) return

        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const margin = 20
        let yPos = 20

        // Title
        doc.setFontSize(22)
        doc.setTextColor(41, 128, 185) // Blue
        doc.text('Reporte de Eficiencia', pageWidth / 2, yPos, { align: 'center' })
        yPos += 15

        // Worker Info
        doc.setFontSize(14)
        doc.setTextColor(0, 0, 0)
        doc.text(`Trabajador: ${workerName}`, margin, yPos)
        yPos += 10
        doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-CL')}`, margin, yPos)
        yPos += 20

        // Global Score
        doc.setFillColor(240, 240, 240)
        doc.rect(margin, yPos, pageWidth - (margin * 2), 40, 'F')
        doc.setFontSize(16)
        doc.text('Calificación Global', pageWidth / 2, yPos + 15, { align: 'center' })

        doc.setFontSize(24)
        let color = [0, 0, 0]
        if (stats.efficiencyScore >= 80) color = [16, 185, 129] // Emerald
        else if (stats.efficiencyScore >= 60) color = [234, 179, 8] // Yellow
        else color = [239, 68, 68] // Red

        doc.setTextColor(color[0], color[1], color[2])
        doc.text(`${stats.efficiencyScore} / 100`, pageWidth / 2, yPos + 30, { align: 'center' })
        yPos += 50

        // Detailed Metrics
        doc.setFontSize(14)
        doc.setTextColor(0, 0, 0)
        doc.text('Métricas Detalladas', margin, yPos)
        yPos += 10

        const metrics = [
            ['Tareas Completadas', stats.totalTasksCompleted.toString()],
            ['Tiempo Promedio', `${stats.avgCompletionTimeDays} días`],
            ['Tasa Entrega a Tiempo', `${stats.onTimeRate}%`],
            ['Asistencia Global', `${stats.attendanceRate}%`]
        ]

        let xPos = margin
        metrics.forEach((metric, index) => {
            if (index % 2 === 0 && index !== 0) {
                yPos += 20
                xPos = margin
            }
            else if (index % 2 !== 0) {
                xPos = pageWidth / 2 + 10
            }

            doc.setFontSize(10)
            doc.setTextColor(100, 100, 100)
            doc.text(metric[0], xPos, yPos)
            doc.setFontSize(14)
            doc.setTextColor(0, 0, 0)
            doc.text(metric[1], xPos, yPos + 7)
        })
        yPos += 30

        // Monthly Evolution Table
        doc.setFontSize(14)
        doc.text('Evolución Mensual', margin, yPos)
        yPos += 10

        // Headers
        const headers = ['Mes', 'Tareas', 'Asistencia %', 'Eficiencia Est.']
        const colWidth = (pageWidth - (margin * 2)) / 4

        doc.setFillColor(41, 128, 185)
        doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')

        headers.forEach((h, i) => {
            doc.text(h, margin + (i * colWidth) + 5, yPos + 7)
        })
        yPos += 10

        // Rows
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'normal')

        chartData.forEach((row, i) => {
            if (i % 2 === 0) {
                doc.setFillColor(245, 245, 245)
                doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F')
            }

            doc.text(row.month, margin + 5, yPos + 7)
            doc.text(row.tasksCompleted.toString(), margin + colWidth + 5, yPos + 7)
            doc.text(`${row.attendancePercentage}%`, margin + (colWidth * 2) + 5, yPos + 7)
            doc.text(row.efficiency.toString(), margin + (colWidth * 3) + 5, yPos + 7)

            yPos += 10
        })

        doc.save(`reporte_eficiencia_${workerName.replace(/\s+/g, '_')}.pdf`)
    }

    // Helper for color rating
    const getRatingColor = (score: number) => {
        if (score >= 80) return 'text-emerald-400'
        if (score >= 60) return 'text-yellow-400'
        return 'text-red-400'
    }

    const getRatingText = (score: number) => {
        if (score >= 80) return 'Excelente'
        if (score >= 60) return 'Bueno'
        if (score >= 40) return 'Regular'
        return 'Deficiente'
    }

    if (!isOpen) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reporte de Eficiencia: ${workerName}`} className="max-w-4xl">
            <div className="flex justify-end mb-4">
                <button
                    onClick={handleExportPDF}
                    disabled={loading || !stats}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    title="Exportar a PDF"
                >
                    <Download className="w-4 h-4" />
                    Exportar PDF
                </button>
            </div>
            <div className="space-y-6 max-h-[80vh] overflow-y-auto p-2">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : error ? (
                    <div className="text-center text-red-400 py-8">
                        {error}
                    </div>
                ) : stats ? (
                    <>
                        {/* Score Big Card */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <Card className="flex-1 bg-slate-800/50 border-slate-700">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 font-medium mb-1">Calificación Global</p>
                                        <h2 className={`text-4xl font-bold ${getRatingColor(stats.efficiencyScore)}`}>
                                            {stats.efficiencyScore} / 100
                                        </h2>
                                        <p className={`text-sm mt-1 font-medium ${getRatingColor(stats.efficiencyScore)}`}>
                                            {getRatingText(stats.efficiencyScore)}
                                        </p>
                                    </div>
                                    <Award className={`w-16 h-16 ${getRatingColor(stats.efficiencyScore)} opacity-80`} />
                                </CardContent>
                            </Card>

                            <Card className="flex-1 bg-slate-800/50 border-slate-700">
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-blue-400" /> Resumen
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-slate-400">Total Tareas</p>
                                            <p className="text-xl font-bold text-slate-100">{stats.totalTasksCompleted}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">Tiempo Promedio</p>
                                            <p className="text-xl font-bold text-slate-100">{stats.avgCompletionTimeDays} días</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detailed Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="p-4 flex flex-col items-center text-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                                    <p className="text-slate-400 text-sm">Tasa de Entrega a Tiempo</p>
                                    <p className="text-2xl font-bold text-slate-100 mt-1">{stats.onTimeRate}%</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="p-4 flex flex-col items-center text-center">
                                    <Calendar className="w-8 h-8 text-blue-500 mb-2" />
                                    <p className="text-slate-400 text-sm">Asistencia Global</p>
                                    <p className="text-2xl font-bold text-slate-100 mt-1">{stats.attendanceRate}%</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="p-4 flex flex-col items-center text-center">
                                    <Clock className="w-8 h-8 text-purple-500 mb-2" />
                                    <p className="text-slate-400 text-sm">Velocidad Relativa</p>
                                    <p className="text-2xl font-bold text-slate-100 mt-1">Normal</p>
                                    <p className="text-xs text-slate-500">(Basado en histórico)</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts */}
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-lg font-medium text-slate-200">Evolución (Últimos 6 meses)</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                                        <YAxis stroke="#9CA3AF" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="tasksCompleted" name="Tareas Completadas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="attendancePercentage" name="Asistencia %" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </>
                ) : null}
            </div>
        </Modal>
    )
}
