'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { usePaymentsV2, PaymentHistoryItem } from '@/hooks/usePaymentsV2'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import {
  DollarSign,
  Calendar,
  Users,
  FileText,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  TrendingUp,
  CheckCircle,
  Clock,
  Building2,
  Eye,
  Info,
  AlertCircle,
  XCircle,
  Download
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { WorkerTasksModal } from '@/components/payments/WorkerTasksModal'
import { WorkerAttendanceModal } from '@/components/payments/WorkerAttendanceModal'
import { PaymentTasksModal } from '@/components/payments/PaymentTasksModal'
import { PaymentDaysModal } from '@/components/payments/PaymentDaysModal'
import { ProcessTaskPaymentModal } from '@/components/payments/ProcessTaskPaymentModal'
import { ProcessDaysPaymentModal } from '@/components/payments/ProcessDaysPaymentModal'
import { CustomPaymentModal } from '@/components/payments/CustomPaymentModal'
import { PaymentFiltersSidebar } from '@/components/payments/PaymentFiltersSidebar'
import { useWorkers } from '@/hooks/useWorkers'

// Datos mockup (se usarán solo si loading es true o hay error)
const mockMetrics = {
  totalTasks: 150000,
  totalDays: 1050000,
  tasksCount: 3,
  daysCount: 115,
  workersCount: 5,
  workersATrato: 3,
  workersPorDia: 2
}

const mockProjects = [
  {
    id: 1,
    name: 'Edificio Residencial A',
    workers: [
      {
        id: 1,
        name: 'Armin Alejandro Seitz Cofré',
        rut: '12.345.678-9',
        type: 'a_trato',
        tasksPending: 1,
        tasksAmount: 70000,
        daysPending: 0,
        daysAmount: 0,
        totalPending: 70000
      },
      {
        id: 2,
        name: 'Frank Robinson Muñoz Veloz',
        rut: '13.456.789-0',
        type: 'a_trato',
        tasksPending: 1,
        tasksAmount: 50000,
        daysPending: 0,
        daysAmount: 0,
        totalPending: 50000
      },
      {
        id: 3,
        name: 'Ricardo César Núñez Romo',
        rut: '14.567.890-1',
        type: 'a_trato',
        tasksPending: 1,
        tasksAmount: 30000,
        daysPending: 0,
        daysAmount: 0,
        totalPending: 30000
      }
    ]
  },
  {
    id: 2,
    name: 'Edificio Comercial B',
    workers: [
      {
        id: 4,
        name: 'Juan Pérez González',
        rut: '15.678.901-2',
        type: 'por_dia',
        tasksPending: 0,
        tasksAmount: 0,
        daysPending: 25,
        daysAmount: 875000,
        totalPending: 875000
      },
      {
        id: 5,
        name: 'María González López',
        rut: '16.789.012-3',
        type: 'por_dia',
        tasksPending: 0,
        tasksAmount: 0,
        daysPending: 30,
        daysAmount: 1050000,
        totalPending: 1050000
      }
    ]
  }
]

const mockHistory = [
  {
    id: 1,
    date: '2025-01-15',
    worker: 'Armin Alejandro Seitz Cofré',
    project: 'Edificio Residencial A',
    type: 'a_trato',
    amount: 150000,
    tasksCount: 2,
    daysCount: 0
  },
  {
    id: 2,
    date: '2025-01-10',
    worker: 'Juan Pérez González',
    project: 'Edificio Comercial B',
    type: 'por_dia',
    amount: 280000,
    tasksCount: 0,
    daysCount: 8
  },
  {
    id: 3,
    date: '2025-01-05',
    worker: 'María González López',
    project: 'Edificio Comercial B',
    type: 'por_dia',
    amount: 350000,
    tasksCount: 0,
    daysCount: 10
  },
  {
    id: 4,
    date: '2024-12-28',
    worker: 'Frank Robinson Muñoz Veloz',
    project: 'Edificio Residencial A',
    type: 'a_trato',
    amount: 200000,
    tasksCount: 3,
    daysCount: 0
  }
]

const mockChartData = [
  { month: 'Ene', tareas: 150000, asistencia: 280000 },
  { month: 'Feb', tareas: 200000, asistencia: 350000 },
  { month: 'Mar', tareas: 180000, asistencia: 420000 },
  { month: 'Abr', tareas: 220000, asistencia: 380000 },
  { month: 'May', tareas: 250000, asistencia: 450000 },
  { month: 'Jun', tareas: 190000, asistencia: 400000 }
]

export default function PagosPage() {
  // Hook para obtener datos de la BD
  const {
    metrics: dbMetrics,
    projects: dbProjects,
    paymentHistory: dbPaymentHistory,
    chartData: dbChartData,
    loading,
    error,
    refresh: refreshPayments,
    fetchWorkerTasks,
    fetchPaymentHistory
  } = usePaymentsV2()

  const { workers: fetchedWorkers } = useWorkers()

  const [currentView, setCurrentView] = useState<'pending' | 'history'>('pending')
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  // Usar solo datos de BD (sin mockup)
  const metrics = dbMetrics
  const projects = dbProjects

  // Expandir todos los proyectos por defecto al cargar
  useEffect(() => {
    if (dbProjects.length > 0) {
      const allProjectIds = new Set(dbProjects.map(p => p.project_id))
      setExpandedProjects(allProjectIds)
    }
  }, [dbProjects])

  // Filtros
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [workerFilter, setWorkerFilter] = useState<string>('all')
  const [searchWorker, setSearchWorker] = useState<string>('')

  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false)

  // Filtros historial
  const [historyPeriod, setHistoryPeriod] = useState<string>('all')
  const [historyWorker, setHistoryWorker] = useState<string>('all')
  const [historyProject, setHistoryProject] = useState<string>('all')

  const [loadingHistory, setLoadingHistory] = useState(false)
  const [allHistoryWorkers, setAllHistoryWorkers] = useState<Map<number, string>>(new Map())
  const [allHistoryProjects, setAllHistoryProjects] = useState<Map<number, string>>(new Map())

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 30

  // Estados para modales
  const [showTasksModal, setShowTasksModal] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [showPaymentTasksModal, setShowPaymentTasksModal] = useState(false)
  const [showPaymentDaysModal, setShowPaymentDaysModal] = useState(false)
  const [showProcessPaymentModal, setShowProcessPaymentModal] = useState(false)
  const [showProcessDaysModal, setShowProcessDaysModal] = useState(false)
  const [showCustomPaymentModal, setShowCustomPaymentModal] = useState(false)
  const [selectedWorkerForModal, setSelectedWorkerForModal] = useState<{
    id: number
    name: string
    rut: string
    type: 'a_trato' | 'por_dia'
  } | null>(null)


  const [workerAttendanceData, setWorkerAttendanceData] = useState<{
    attendances: any[]
    contracts: any[]
    loading: boolean
  }>({
    attendances: [],
    contracts: [],
    loading: false
  })
  const [selectedPaymentForModal, setSelectedPaymentForModal] = useState<{
    id: number
    workerName: string
    paymentDate: string
    totalAmount: number
  } | null>(null)
  const [selectedPaymentDaysForModal, setSelectedPaymentDaysForModal] = useState<{
    id: number
    workerId: number
    workerName: string
    paymentDate: string
    paymentMonth: number
    paymentYear: number
    totalAmount: number
    daysCount: number
    dailyRate: number
    startDate?: string
    endDate?: string
    projectId?: number | null
  } | null>(null)
  const [workerTasks, setWorkerTasks] = useState<any[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  const toggleProjectExpansion = (projectId: number) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  const handleExportPaymentPDF = async (payment: PaymentHistoryItem) => {
    try {
      toast.loading('Generando PDF...', { id: 'generating-pdf' })

      if (payment.type === 'a_trato') {
        // Obtener tareas del pago (usando la misma estructura que PaymentTasksModal)
        const { data: paymentAssignments, error: tasksError } = await supabase
          .from('payment_task_assignments')
          .select(`
                      task_assignment_id,
                      amount_paid,
                      task_assignments!inner(
                      id,
                      task_id,
                      worker_payment,
                      completed_at,
                      tasks!inner(
                      id,
                      task_name,
                      apartment_id,
                      apartments!inner(
                      id,
                      apartment_number,
                      floor_id,
                      floors!inner(
                      id,
                      project_id,
                      projects!inner(id, name)
                      )
                      )
                      )
                      )
                      `)
          .eq('payment_id', payment.id)

        if (tasksError) throw tasksError

        await generateTaskPaymentPDF(payment, paymentAssignments || [])
      } else {
        // Obtener días del pago
        let attendanceDays: any[] = []

        // Intentar filtrar por payment_history_id primero
        const { data: daysByPaymentId, error: errorById } = await supabase
          .from('worker_attendance')
          .select(`
                      id,
                      attendance_date,
                      is_present,
                      hours_worked,
                      payment_percentage,
                      late_arrival,
                      early_departure,
                      is_overtime,
                      overtime_hours,
                      arrival_reason,
                      departure_reason
                      `)
          .eq('worker_id', payment.worker_id)
          .eq('is_present', true)
          .eq('is_paid', true)
          .eq('payment_history_id', payment.id)
          .order('attendance_date', { ascending: true })

        // Si no hay resultados con payment_history_id, usar rango de fechas como fallback
        if (!daysByPaymentId || daysByPaymentId.length === 0) {
          let fallbackQuery = supabase
            .from('worker_attendance')
            .select(`
                      id,
                      attendance_date,
                      is_present,
                      hours_worked,
                      payment_percentage,
                      late_arrival,
                      early_departure,
                      is_overtime,
                      overtime_hours,
                      arrival_reason,
                      departure_reason
                      `)
            .eq('worker_id', payment.worker_id)
            .eq('is_present', true)
            .eq('is_paid', true)
            .order('attendance_date', { ascending: true })

          if (payment.start_date && payment.end_date) {
            fallbackQuery = fallbackQuery.gte('attendance_date', payment.start_date)
            fallbackQuery = fallbackQuery.lte('attendance_date', payment.end_date)
          } else if (payment.payment_month && payment.payment_year) {
            const startDate = `${payment.payment_year}-${String(payment.payment_month).padStart(2, '0')}-01`
            const endDate = payment.payment_month === 12
              ? `${payment.payment_year + 1}-01-01`
              : `${payment.payment_year}-${String(payment.payment_month + 1).padStart(2, '0')}-01`
            fallbackQuery = fallbackQuery.gte('attendance_date', startDate)
            fallbackQuery = fallbackQuery.lt('attendance_date', endDate)
          }

          if (payment.project_id) {
            fallbackQuery = fallbackQuery.eq('project_id', payment.project_id)
          }

          const { data: daysByDate, error: errorByDate } = await fallbackQuery
          if (errorByDate) throw errorByDate
          attendanceDays = daysByDate || []
        } else {
          attendanceDays = daysByPaymentId
        }

        // Obtener contrato del trabajador
        const { data: contracts, error: contractsError } = await supabase
          .from('contract_history')
          .select('contract_number, projects(name)')
          .eq('worker_id', payment.worker_id)
          .eq('is_active', true)
          .limit(1)
          .single()

        if (contractsError && contractsError.code !== 'PGRST116') {
          console.warn('Error obteniendo contrato:', contractsError)
        }

        await generateDaysPaymentPDF(payment, attendanceDays || [], contracts)
      }

      toast.success('PDF generado exitosamente', { id: 'generating-pdf' })
    } catch (error: any) {
      console.error('Error generando PDF:', error)
      toast.error(error.message || 'Error al generar el PDF', { id: 'generating-pdf' })
    }
  }

  const generateTaskPaymentPDF = async (
    payment: PaymentHistoryItem,
    paymentAssignments: any[]
  ) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    let yPos = margin
    const lineHeight = 6

    // Función para agregar nueva página si es necesario
    const checkNewPage = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - margin) {
        doc.addPage()
        yPos = margin
        return true
      }
      return false
    }

    // Información del trabajador
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(payment.worker_name, margin, yPos)
    yPos += lineHeight + 2

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`RUT: ${payment.worker_rut}`, margin, yPos)
    yPos += lineHeight

    // Obtener contrato
    const { data: contract } = await supabase
      .from('contract_history')
      .select('contract_number, projects(name)')
      .eq('worker_id', payment.worker_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (contract) {
      doc.text(`Contrato: ${contract.contract_number}`, margin, yPos)
      yPos += lineHeight
    }

    doc.text(`Proyecto: ${payment.project_name || 'N/A'}`, margin, yPos)
    yPos += lineHeight
    doc.text(`Fecha de Pago: ${new Date(payment.payment_date).toLocaleDateString('es-CL')}`, margin, yPos)
    yPos += lineHeight
    doc.text(`Cantidad de Tareas: ${paymentAssignments.length}`, margin, yPos)
    yPos += lineHeight + 5

    // Tabla de tareas
    checkNewPage(30)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Tareas Pagadas:', margin, yPos)
    yPos += lineHeight + 5

    // Encabezados de tabla
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    const colWidths = [12, 50, 35, 25, 30, 28]
    const headers = ['#', 'Tarea', 'Proyecto', 'Depto', 'Fecha', 'Monto']
    let xPos = margin

    headers.forEach((header, idx) => {
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

    let totalAmount = 0
    paymentAssignments.forEach((pa, index) => {
      checkNewPage(15)
      xPos = margin

      const assignment = pa.task_assignments as any
      const task = assignment.tasks
      const apartment = task.apartments
      const project = apartment.floors.projects

      const taskName = task.task_name || 'N/A'
      const apartmentNumber = apartment.apartment_number || 'N/A'
      const projectName = project.name || 'N/A'
      const completionDate = assignment.completed_at
        ? new Date(assignment.completed_at).toLocaleDateString('es-CL')
        : 'N/A'
      const amount = Number(pa.amount_paid || assignment.worker_payment || 0)
      totalAmount += amount

      // Fila de datos
      doc.text(String(index + 1), xPos, yPos)
      xPos += colWidths[0]

      const taskNameLines = doc.splitTextToSize(taskName, colWidths[1])
      doc.text(taskNameLines[0], xPos, yPos)
      xPos += colWidths[1]

      const projectLines = doc.splitTextToSize(projectName, colWidths[2])
      doc.text(projectLines[0], xPos, yPos)
      xPos += colWidths[2]

      doc.text(apartmentNumber, xPos, yPos)
      xPos += colWidths[3]

      doc.text(completionDate, xPos, yPos)
      xPos += colWidths[4]

      doc.text(`$${amount.toLocaleString('es-CL')}`, xPos, yPos)

      // Si hay múltiples líneas, ajustar posición
      if (taskNameLines.length > 1 || projectLines.length > 1) {
        yPos += lineHeight
      } else {
        yPos += lineHeight + 2
      }
    })

    // Total
    checkNewPage(15)
    yPos += lineHeight
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += lineHeight + 2

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`TOTAL: $${payment.total_amount.toLocaleString('es-CL')}`, margin, yPos)

    // Notas si existen
    if (payment.notes) {
      yPos += lineHeight + 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Notas:', margin, yPos)
      yPos += lineHeight + 2
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const notesLines = doc.splitTextToSize(payment.notes, pageWidth - margin * 2)
      notesLines.forEach((line: string) => {
        checkNewPage(lineHeight)
        doc.text(line, margin, yPos)
        yPos += lineHeight
      })
    }

    // Descargar PDF
    const fileName = `pago-${payment.worker_name.replace(/\s+/g, '-')}-${payment.payment_date}-tareas.pdf`
    doc.save(fileName)
  }

  const generateDaysPaymentPDF = async (
    payment: PaymentHistoryItem,
    days: any[],
    contract: any
  ) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    let yPos = margin
    const lineHeight = 6

    // Función para agregar nueva página si es necesario
    const checkNewPage = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - margin) {
        doc.addPage()
        yPos = margin
        return true
      }
      return false
    }

    // Información del trabajador
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(payment.worker_name, margin, yPos)
    yPos += lineHeight + 2

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`RUT: ${payment.worker_rut}`, margin, yPos)
    yPos += lineHeight

    if (contract) {
      doc.text(`Contrato: ${contract.contract_number}`, margin, yPos)
      yPos += lineHeight
    }

    doc.text(`Proyecto: ${payment.project_name || 'N/A'}`, margin, yPos)
    yPos += lineHeight
    doc.text(`Fecha de Pago: ${new Date(payment.payment_date).toLocaleDateString('es-CL')}`, margin, yPos)
    yPos += lineHeight

    // Calcular rango real de días pagados
    if (days.length > 0) {
      const dates = days.map(d => new Date(d.attendance_date)).sort((a, b) => a.getTime() - b.getTime())
      const firstDate = dates[0]
      const lastDate = dates[dates.length - 1]
      const firstDateStr = firstDate.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const lastDateStr = lastDate.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
      doc.text(`Período: ${firstDateStr} - ${lastDateStr}`, margin, yPos)
      yPos += lineHeight
    }

    doc.text(`Tarifa Diaria: $${(payment.daily_rate || 0).toLocaleString('es-CL')}`, margin, yPos)
    yPos += lineHeight + 5

    // Tabla de días
    checkNewPage(30)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Días Pagados:', margin, yPos)
    yPos += lineHeight + 5

    // Encabezados de tabla
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    const colWidths = [15, 40, 30, 60, 35]
    const headers = ['#', 'Fecha', 'Porcentaje', 'Problemas', 'Monto']
    let xPos = margin

    headers.forEach((header, idx) => {
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

    let totalAmount = 0
    days.forEach((day, index) => {
      checkNewPage(15)
      xPos = margin

      const date = new Date(day.attendance_date).toLocaleDateString('es-CL')
      const percentage = Number(day.payment_percentage || 100)
      const dailyRate = payment.daily_rate || 0
      const dayAmount = dailyRate * (percentage / 100)
      totalAmount += dayAmount

      // Problemas
      let problems: string[] = []
      if (day.late_arrival) problems.push('Llegada tardía')
      if (day.early_departure) problems.push('Salida temprana')
      if (day.is_overtime) problems.push(`Horas extra: ${day.overtime_hours || 0}h`)
      const problemsText = problems.length > 0 ? problems.join(', ') : 'Ninguno'

      // Fila de datos
      doc.text(String(index + 1), xPos, yPos)
      xPos += colWidths[0]

      doc.text(date, xPos, yPos)
      xPos += colWidths[1]

      doc.text(`${percentage}%`, xPos, yPos)
      xPos += colWidths[2]

      const problemsLines = doc.splitTextToSize(problemsText, colWidths[3])
      doc.text(problemsLines[0], xPos, yPos)
      xPos += colWidths[3]

      doc.text(`$${dayAmount.toLocaleString('es-CL')}`, xPos, yPos)

      // Si hay múltiples líneas en problemas, ajustar posición
      if (problemsLines.length > 1) {
        yPos += lineHeight
      } else {
        yPos += lineHeight + 2
      }
    })

    // Total
    checkNewPage(15)
    yPos += lineHeight
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += lineHeight + 2

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`TOTAL: $${payment.total_amount.toLocaleString('es-CL')}`, margin, yPos)

    // Notas si existen
    if (payment.notes) {
      yPos += lineHeight + 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Notas:', margin, yPos)
      yPos += lineHeight + 2
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const notesLines = doc.splitTextToSize(payment.notes, pageWidth - margin * 2)
      notesLines.forEach((line: string) => {
        checkNewPage(lineHeight)
        doc.text(line, margin, yPos)
        yPos += lineHeight
      })
    }

    // Descargar PDF
    const fileName = `pago-${payment.worker_name.replace(/\s+/g, '-')}-${payment.payment_date}-dias.pdf`
    doc.save(fileName)
  }

  const handleViewTasks = async (worker: { worker_id: number; name: string; rut: string }) => {
    setSelectedWorkerForModal({
      id: worker.worker_id,
      name: worker.name,
      rut: worker.rut,
      type: 'a_trato'
    })
    setLoadingTasks(true)
    setShowTasksModal(true)

    try {
      const tasks = await fetchWorkerTasks(worker.worker_id)
      setWorkerTasks(tasks || [])
    } catch (err) {
      console.error('Error obteniendo tareas:', err)
      setWorkerTasks([])
    } finally {
      setLoadingTasks(false)
    }
  }

  // Función para cargar datos de asistencia y contratos del trabajador
  const loadWorkerAttendanceData = async (workerId: number) => {
    try {
      setWorkerAttendanceData(prev => ({ ...prev, loading: true }))

      // Obtener asistencias del trabajador (últimos 12 meses)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 12)

      const { data: attendancesData, error: attendancesError } = await supabase
        .from('worker_attendance')
        .select(`
                      id,
                      attendance_date,
                      is_present,
                      check_in_time,
                      check_out_time,
                      hours_worked,
                      early_departure,
                      late_arrival,
                      arrival_reason,
                      departure_reason,
                      is_overtime,
                      overtime_hours,
                      is_paid,
                      payment_percentage,
                      projects(name)
                      `)
        .eq('worker_id', workerId)
        .eq('is_present', true)
        .eq('is_paid', false)
        .gte('attendance_date', startDate.toISOString().split('T')[0])
        .lte('attendance_date', endDate.toISOString().split('T')[0])
        .order('attendance_date', { ascending: false })

      if (attendancesError) throw attendancesError

      // Obtener contratos del trabajador
      const { data: contractsData, error: contractsError } = await supabase
        .from('contract_history')
        .select(`
                      id,
                      contract_number,
                      fecha_inicio,
                      fecha_termino,
                      projects(name)
                      `)
        .eq('worker_id', workerId)
        .eq('is_active', true)
        .order('fecha_inicio', { ascending: false })

      if (contractsError) throw contractsError

      // Función helper para extraer hora del timestamp
      const extractTimeFromTimestamp = (timestamp: string | null | undefined): string => {
        if (!timestamp) return '08:00'

        let timeStr = ''

        if (timestamp.includes('T')) {
          timeStr = timestamp.split('T')[1]?.split('.')[0] || ''
        } else if (timestamp.includes(' ')) {
          timeStr = timestamp.split(' ')[1]?.split('+')[0] || timestamp.split(' ')[1]?.split('-')[0] || ''
        }

        if (timeStr) {
          const parts = timeStr.split(':')
          if (parts.length >= 2) {
            return `${parts[0]}:${parts[1]}`
          }
        }

        return '08:00'
      }

      // Transformar datos de asistencias
      const transformedAttendances = (attendancesData || []).map((att: any) => ({
        id: att.id,
        attendance_date: att.attendance_date,
        is_present: att.is_present,
        check_in_time: extractTimeFromTimestamp(att.check_in_time),
        check_out_time: att.check_out_time ? extractTimeFromTimestamp(att.check_out_time) : null,
        hours_worked: att.hours_worked,
        early_departure: att.early_departure || false,
        late_arrival: att.late_arrival || false,
        arrival_reason: att.arrival_reason || null,
        departure_reason: att.departure_reason || null,
        is_overtime: att.is_overtime || false,
        overtime_hours: att.overtime_hours || null,
        is_paid: att.is_paid || false,
        payment_percentage: att.payment_percentage || 100,
        project_name: att.projects?.name || 'General'
      }))

      // Transformar datos de contratos
      const transformedContracts = (contractsData || []).map((contract: any) => ({
        id: contract.id,
        contract_number: contract.contract_number,
        fecha_inicio: contract.fecha_inicio,
        fecha_termino: contract.fecha_termino,
        project_name: contract.projects?.name || 'General'
      }))

      setWorkerAttendanceData({
        attendances: transformedAttendances,
        contracts: transformedContracts,
        loading: false
      })
    } catch (error: any) {
      console.error('Error cargando datos de asistencia:', error)
      toast.error('Error al cargar datos de asistencia')
      setWorkerAttendanceData({
        attendances: [],
        contracts: [],
        loading: false
      })
    }
  }

  // Cargar lista completa de trabajadores y proyectos (solo una vez cuando se abre la vista de historial)
  useEffect(() => {
    if (currentView === 'history' && allHistoryWorkers.size === 0) {
      let cancelled = false
      fetchPaymentHistory(undefined, undefined, 'all').then((allHistory) => {
        if (cancelled) return

        const workersMap = new Map<number, string>()
        const projectsMap = new Map<number, string>()

        allHistory.forEach(h => {
          if (h.worker_id && !workersMap.has(h.worker_id)) {
            workersMap.set(h.worker_id, h.worker_name)
          }
          if (h.project_id && h.project_name && !projectsMap.has(h.project_id)) {
            projectsMap.set(h.project_id, h.project_name)
          }
        })

        if (!cancelled) {
          setAllHistoryWorkers(workersMap)
          setAllHistoryProjects(projectsMap)
        }
      })

      return () => {
        cancelled = true
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]) // Solo depende de currentView, allHistoryWorkers.size se verifica dentro

  // Cargar historial filtrado cuando cambien los filtros
  useEffect(() => {
    if (currentView === 'history') {
      setLoadingHistory(true)
      const workerId = historyWorker !== 'all' ? parseInt(historyWorker) : undefined
      const projectId = historyProject !== 'all' ? parseInt(historyProject) : undefined

      fetchPaymentHistory(
        workerId,
        projectId,
        historyPeriod as 'all' | 'monthly' | 'yearly'
      ).finally(() => {
        setLoadingHistory(false)
        setCurrentPage(1) // Resetear a la primera página cuando cambian los filtros
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, historyPeriod, historyWorker, historyProject]) // fetchPaymentHistory es estable, no necesita estar en deps

  // Calcular paginación
  const totalPages = Math.ceil(dbPaymentHistory.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedHistory = dbPaymentHistory.slice(startIndex, endIndex)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Obtener todos los trabajadores únicos para el select
  const allWorkers = Array.from(
    new Map(
      projects.flatMap(p =>
        p.workers
          .filter(w => w.worker_id) // Filtrar trabajadores sin ID
          .map(w => [w.worker_id, { id: w.worker_id, name: w.name, rut: w.rut }])
      )
    ).values()
  )

  // Filtrar proyectos según filtros activos
  const filteredProjects = projects.filter(project => {
    if (projectFilter !== 'all' && project.project_id.toString() !== projectFilter) return false

    const projectWorkers = project.workers.filter(worker => {
      if (activeFilter === 'tasks' && worker.type !== 'a_trato') return false
      if (activeFilter === 'days' && worker.type !== 'por_dia') return false
      if (typeFilter !== 'all' && worker.type !== typeFilter) return false
      if (workerFilter !== 'all' && worker.worker_id.toString() !== workerFilter) return false
      if (searchWorker && !worker.name.toLowerCase().includes(searchWorker.toLowerCase()) &&
        !worker.rut.toLowerCase().includes(searchWorker.toLowerCase())) return false
      return true
    })

    return projectWorkers.length > 0
  })

  // Función para exportar pagos pendientes a PDF
  const handleExportPendingPayments = () => {
    try {
      toast.loading('Generando PDF...', { id: 'export-pending' })

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPos = margin
      const lineHeight = 6

      // Función para agregar nueva página si es necesario
      const checkNewPage = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          doc.addPage()
          yPos = margin
          return true
        }
        return false
      }

      // Título
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Resumen de Pagos Pendientes', margin, yPos)
      yPos += lineHeight + 4

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, margin, yPos)
      yPos += lineHeight + 8

      // Resumen de totales
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Resumen General', margin, yPos)
      yPos += lineHeight + 3

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total a Pagar en Tareas: $${metrics.totalTasks.toLocaleString('es-CL')}`, margin, yPos)
      yPos += lineHeight
      doc.text(`Total a Pagar en Asistencia: $${metrics.totalDays.toLocaleString('es-CL')}`, margin, yPos)
      yPos += lineHeight
      doc.setFont('helvetica', 'bold')
      doc.text(`Total General: $${(metrics.totalTasks + metrics.totalDays).toLocaleString('es-CL')}`, margin, yPos)
      yPos += lineHeight + 8

      // Tabla de trabajadores
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Detalle por Trabajador', margin, yPos)
      yPos += lineHeight + 5

      // Encabezados de tabla
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      // Adjusted widths to fit 5 columns [Trabajador, Tipo, Proyecto, Cant., Monto]
      const colWidths = [60, 25, 45, 25, 30]
      const headers = ['Trabajador', 'Tipo', 'Proyecto', 'Cant.', 'Monto']
      let xPos = margin

      headers.forEach((header, idx) => {
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

      let totalGeneral = 0

      // Iterar por proyectos y trabajadores
      filteredProjects.forEach(project => {
        const projectWorkers = project.workers.filter(worker => {
          if (activeFilter === 'tasks' && worker.type !== 'a_trato') return false
          if (activeFilter === 'days' && worker.type !== 'por_dia') return false
          if (typeFilter !== 'all' && worker.type !== typeFilter) return false
          if (workerFilter !== 'all' && worker.worker_id.toString() !== workerFilter) return false
          if (searchWorker && !worker.name.toLowerCase().includes(searchWorker.toLowerCase()) &&
            !worker.rut.toLowerCase().includes(searchWorker.toLowerCase())) return false
          return true
        })

        projectWorkers.forEach(worker => {
          checkNewPage(15)
          xPos = margin

          const workerName = worker.name.length > 25 ? worker.name.substring(0, 22) + '...' : worker.name
          const workerType = worker.type === 'a_trato' ? 'A Trato' : 'Por Día'
          const projectName = project.project_name.length > 25 ? project.project_name.substring(0, 22) + '...' : project.project_name
          const amount = worker.totalPending

          // Logic for Quantity column
          let quantityText = ''
          if (worker.type === 'a_trato') {
            quantityText = `${worker.tasksPending} tarea${worker.tasksPending !== 1 ? 's' : ''}`
          } else {
            quantityText = `${worker.daysPending} día${worker.daysPending !== 1 ? 's' : ''}`
          }

          totalGeneral += amount

          // Fila de datos
          doc.text(workerName, xPos, yPos)
          xPos += colWidths[0]

          doc.text(workerType, xPos, yPos)
          xPos += colWidths[1]

          doc.text(projectName, xPos, yPos)
          xPos += colWidths[2]

          doc.text(quantityText, xPos, yPos)
          xPos += colWidths[3]

          doc.text(`$${amount.toLocaleString('es-CL')}`, xPos, yPos)

          yPos += lineHeight + 2
        })
      })

      // Total
      checkNewPage(15)
      yPos += lineHeight
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += lineHeight + 2

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`TOTAL A PAGAR: $${totalGeneral.toLocaleString('es-CL')}`, margin, yPos)

      // Descargar PDF
      const fileName = `pagos-pendientes-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)

      toast.success('PDF generado exitosamente', { id: 'export-pending' })
    } catch (error: any) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar el PDF', { id: 'export-pending' })
    }
  }

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Pagos</h1>
            <p className="text-gray-500">Administra los pagos y anticipos de trabajadores</p>
            {loading && (
              <p className="text-sm text-blue-600 mt-2">Cargando datos...</p>
            )}
            {error && (
              <p className="text-sm text-red-600 mt-2">Error: {error}</p>
            )}
          </div>
        </div>

        {currentView === 'pending' && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowProcessPaymentModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Procesar Tareas
            </Button>
            <Button
              onClick={() => setShowCustomPaymentModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Pago Personalizado
            </Button>
            <Button
              onClick={handleExportPendingPayments}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Switch entre vistas */}
        <div className="flex gap-2 bg-slate-800 p-1 rounded-lg w-fit border border-slate-700">
          <button
            onClick={() => setCurrentView('pending')}
            className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${currentView === 'pending'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
          >
            Pagos Pendientes
          </button>
          <button
            onClick={() => setCurrentView('history')}
            className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${currentView === 'history'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
          >
            Historial
          </button>
        </div>

        {/* Header Actions (Search & Filters) */}
        <div className="flex items-center gap-3">
          {currentView === 'pending' && (
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar trabajador..."
                value={searchWorker}
                onChange={(e) => setSearchWorker(e.target.value)}
                className="pl-9 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-blue-500"
              />
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => setIsFilterSidebarOpen(true)}
            className="flex items-center gap-2 border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors bg-slate-800/50"
          >
            <Filter className="w-5 h-5" />
            Filtros
            {(projectFilter !== 'all' || typeFilter !== 'all' || workerFilter !== 'all' || historyPeriod !== 'all' || historyWorker !== 'all' || historyProject !== 'all') && (
              <span className="ml-1 bg-blue-100 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-200">
                !
              </span>
            )}
          </Button>

          {(projectFilter !== 'all' || typeFilter !== 'all' || workerFilter !== 'all' || searchWorker || historyPeriod !== 'all' || historyWorker !== 'all' || historyProject !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => {
                // Clear all filters
                setProjectFilter('all')
                setTypeFilter('all')
                setWorkerFilter('all')
                setSearchWorker('')
                setHistoryPeriod('all')
                setHistoryWorker('all')
                setHistoryProject('all')
                setActiveFilter(null)
              }}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              title="Limpiar filtros"
            >
              <XCircle className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {currentView === 'pending' ? (

        <>
          {/* Tarjetas de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Tarjeta: Total a Pagar en Tareas */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-lg bg-white border-gray-200 ${activeFilter === 'tasks' ? 'ring-2 ring-blue-500' : ''
                }`}
              onClick={() => {
                setActiveFilter(activeFilter === 'tasks' ? null : 'tasks')
                setTypeFilter('a_trato')
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total a Pagar en Tareas</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalTasks)}</p>
                    <p className="text-xs text-gray-500 mt-1">{metrics.tasksCount} tareas pendientes</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta: Total a Pagar en Asistencia */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-lg bg-white border-gray-200 ${activeFilter === 'days' ? 'ring-2 ring-blue-500' : ''
                }`}
              onClick={() => {
                setActiveFilter(activeFilter === 'days' ? null : 'days')
                setTypeFilter('por_dia')
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total a Pagar en Asistencia</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalDays)}</p>
                    <p className="text-xs text-gray-500 mt-1">{metrics.daysCount} días pendientes</p>
                  </div>
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta: Trabajadores a Pagar */}
            <Card className="cursor-pointer transition-all hover:shadow-lg bg-white border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Trabajadores a Pagar</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.workersCount}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {metrics.workersATrato} a trato, {metrics.workersPorDia} por día
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta: Total General */}
            <Card className="cursor-pointer transition-all hover:shadow-lg bg-white border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total General</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(metrics.totalTasks + metrics.totalDays)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Tareas + Asistencia</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>



          {/* Lista de Trabajadores por Proyecto */}
          <div className="space-y-4">
            {filteredProjects.map(project => {
              const projectWorkers = project.workers.filter(worker => {
                if (activeFilter === 'tasks' && worker.type !== 'a_trato') return false
                if (activeFilter === 'days' && worker.type !== 'por_dia') return false
                if (typeFilter !== 'all' && worker.type !== typeFilter) return false
                if (workerFilter !== 'all' && worker.worker_id.toString() !== workerFilter) return false
                if (searchWorker && !worker.name.toLowerCase().includes(searchWorker.toLowerCase()) &&
                  !worker.rut.toLowerCase().includes(searchWorker.toLowerCase())) return false
                return true
              })

              if (projectWorkers.length === 0) return null

              const isExpanded = expandedProjects.has(project.project_id)
              const projectTotal = projectWorkers.reduce((sum, w) => sum + w.totalPending, 0)

              return (
                <div key={project.project_id} className="mb-4">
                  {/* Card del Proyecto */}
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-2 px-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:space-x-4 w-full md:w-auto">
                          <button
                            onClick={() => toggleProjectExpansion(project.project_id)}
                            className="flex items-center space-x-3 hover:text-blue-400 transition-colors w-full md:w-auto"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-slate-300 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                            )}
                            <Building2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                            <span className="font-semibold text-slate-100 text-lg truncate">{project.project_name}</span>
                          </button>
                          <div className="flex items-center gap-2 pl-8 md:pl-0">
                            <Badge className="bg-blue-900/30 text-blue-400 border-blue-500 whitespace-nowrap">
                              {projectWorkers.length} trabajador{projectWorkers.length !== 1 ? 'es' : ''}
                            </Badge>
                            {projectTotal > 0 && (
                              <span className="text-sm text-slate-400 md:hidden lg:inline">
                                Total: <span className="font-semibold text-slate-200">{formatCurrency(projectTotal)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Desktop only total for better alignment, or keep it inside as above */}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Trabajadores del Proyecto */}
                  {isExpanded && (
                    <div className="mt-2 ml-8 space-y-1.5">
                      {projectWorkers.map(worker => (
                        <Card key={worker.worker_id} className="bg-slate-700/30 border-slate-600">
                          <CardContent className="py-2 px-3">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex flex-col md:flex-row md:items-center gap-2 md:space-x-3 flex-1 min-w-0 w-full md:w-auto">
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                  {worker.type === 'a_trato' ? (
                                    <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                  ) : (
                                    <Calendar className="w-4 h-4 text-green-400 flex-shrink-0" />
                                  )}
                                  <span className="font-medium text-slate-100 text-sm truncate flex-1 md:flex-none">{worker.name}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pl-6 md:pl-0">
                                  <span className="flex-shrink-0">{worker.rut}</span>
                                  <Badge className={`flex-shrink-0 ${worker.type === 'a_trato' ? 'bg-purple-900/30 text-purple-400 border-purple-500' : 'bg-green-900/30 text-green-400 border-green-500'}`}>
                                    {worker.type === 'a_trato' ? 'A Trato' : 'Por Día'}
                                  </Badge>
                                  {worker.is_active === false && (
                                    <Badge className="flex-shrink-0 bg-red-900/30 text-red-400 border-red-500">
                                      Contrato Inactivo
                                    </Badge>
                                  )}
                                  {(worker.tasksPending > 0 || worker.daysPending > 0) && (
                                    <span className="text-xs text-slate-500 flex-shrink-0">
                                      {worker.tasksPending > 0 && `${worker.tasksPending} tarea${worker.tasksPending !== 1 ? 's' : ''}`}
                                      {worker.tasksPending > 0 && worker.daysPending > 0 && ' • '}
                                      {worker.daysPending > 0 && `${worker.daysPending} día${worker.daysPending !== 1 ? 's' : ''}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto mt-1 md:mt-0 pl-6 md:pl-0">
                                <span className="font-semibold text-base text-blue-400 whitespace-nowrap">
                                  {formatCurrency(worker.totalPending)}
                                </span>
                                <div className="flex items-center gap-2">
                                  {worker.type === 'a_trato' ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleViewTasks(worker)}
                                      className="flex items-center gap-1"
                                    >
                                      <Eye className="w-4 h-4" />
                                      <span className="hidden sm:inline">Ver Tareas</span>
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        setSelectedWorkerForModal({
                                          id: worker.worker_id,
                                          name: worker.name,
                                          rut: worker.rut,
                                          type: 'por_dia'
                                        })
                                        await loadWorkerAttendanceData(worker.worker_id)
                                        setShowAttendanceModal(true)
                                      }}
                                      className="flex items-center gap-1"
                                    >
                                      <Calendar className="w-4 h-4" />
                                      <span className="hidden sm:inline">Ver Asistencia</span>
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => {
                                      console.log('💰 Click en Procesar Pago:', { worker, type: worker.type })
                                      setSelectedWorkerForModal({
                                        id: worker.worker_id,
                                        name: worker.name,
                                        rut: worker.rut,
                                        type: worker.type
                                      })
                                      if (worker.type === 'a_trato') {
                                        console.log('📋 Abriendo modal de tareas')
                                        setShowProcessPaymentModal(true)
                                      } else {
                                        console.log('📅 Abriendo modal de días')
                                        setShowProcessDaysModal(true)
                                      }
                                    }}
                                  >
                                    Pagar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>


          {/* Gráfico - SOLO VISIBLE EN DESKTOP */}
          <Card className="mb-6 bg-slate-700/30 border-slate-600 hidden md:block">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <TrendingUp className="w-5 h-5" />
                Evolución de Pagos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {loadingHistory ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-400">Cargando datos...</p>
                  </div>
                ) : dbChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-400">No hay datos para mostrar</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dbChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis
                        dataKey="month"
                        stroke="#94a3b8"
                        tick={{ fill: '#cbd5e1' }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#cbd5e1' }}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                          if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
                          return `$${value}`
                        }}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#cbd5e1'
                        }}
                        labelStyle={{ color: '#e2e8f0' }}
                      />
                      <Legend
                        wrapperStyle={{ color: '#cbd5e1' }}
                      />
                      <Bar dataKey="tareas" name="Pagos a Trato" fill="#8b5cf6" />
                      <Bar dataKey="asistencia" name="Pagos por Asistencia" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Historial */}
          <Card className="bg-slate-700/30 border-slate-600">
            <CardHeader>
              <CardTitle className="text-slate-100">Historial de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Vista Móvil (Cards) */}
              <div className="md:hidden space-y-4">
                {loadingHistory ? (
                  <div className="text-center py-8 text-slate-400">Cargando datos...</div>
                ) : dbPaymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No hay pagos registrados</div>
                ) : (
                  paginatedHistory.map(payment => (
                    <div key={payment.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-slate-100 font-medium">{payment.worker_name}</div>
                          <div className="text-xs text-slate-400">{formatDate(payment.payment_date)}</div>
                        </div>
                        <Badge className={payment.type === 'a_trato' ? 'bg-purple-900/30 text-purple-400 border-purple-500' : 'bg-green-900/30 text-green-400 border-green-500'}>
                          {payment.type === 'a_trato' ? 'Trato' : 'Día'}
                        </Badge>
                      </div>

                      <div className="text-sm text-slate-300">
                        {payment.project_name || 'N/A'}
                      </div>

                      <div className="flex items-center gap-2">
                        {payment.tasks_count !== undefined && payment.tasks_count > 0 && (
                          <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-400">
                            {payment.tasks_count} tareas
                          </Badge>
                        )}
                        {payment.days_count !== undefined && payment.days_count > 0 && (
                          <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">
                            {payment.days_count} días
                          </Badge>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                        <span className="text-lg font-semibold text-blue-400">{formatCurrency(payment.total_amount)}</span>

                        <div className="flex items-center gap-2">
                          {payment.tasks_count !== undefined && payment.tasks_count > 0 && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedPaymentForModal({
                                  id: payment.id,
                                  workerName: payment.worker_name,
                                  paymentDate: payment.payment_date,
                                  totalAmount: payment.total_amount
                                })
                                setShowPaymentTasksModal(true)
                              }}
                              className="p-2 rounded-full bg-purple-900/30 text-purple-400 border border-purple-500 hover:bg-purple-900/50"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          )}
                          {payment.days_count !== undefined && payment.days_count > 0 && payment.type !== 'a_trato' && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedPaymentDaysForModal({
                                  id: payment.id,
                                  workerId: payment.worker_id,
                                  workerName: payment.worker_name,
                                  paymentDate: payment.payment_date,
                                  paymentMonth: payment.payment_month || new Date(payment.payment_date).getMonth() + 1,
                                  paymentYear: payment.payment_year || new Date(payment.payment_date).getFullYear(),
                                  totalAmount: payment.total_amount,
                                  daysCount: payment.days_count || 0,
                                  dailyRate: payment.daily_rate || 0,
                                  startDate: (payment as any).start_date,
                                  endDate: (payment as any).end_date,
                                  projectId: payment.project_id
                                })
                                setShowPaymentDaysModal(true)
                              }}
                              className="p-2 rounded-full bg-green-900/30 text-green-400 border border-green-500 hover:bg-green-900/50"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleExportPaymentPDF(payment)
                            }}
                            className="p-2 rounded-full bg-blue-900/30 text-blue-400 border border-blue-500 hover:bg-blue-900/50"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Vista Desktop (Tabla) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Fecha</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Trabajador</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Proyecto</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Tipo</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Monto</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Detalles</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-200">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingHistory ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Cargando datos...
                        </td>
                      </tr>
                    ) : dbPaymentHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No hay pagos registrados
                        </td>
                      </tr>
                    ) : (
                      paginatedHistory.map(payment => (
                        <tr key={payment.id} className="border-b border-slate-600/50 hover:bg-slate-700/50">
                          <td className="py-3 px-4 text-slate-300">{formatDate(payment.payment_date)}</td>
                          <td className="py-3 px-4 text-slate-100">{payment.worker_name}</td>
                          <td className="py-3 px-4 text-slate-300">{payment.project_name || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <Badge className={payment.type === 'a_trato' ? 'bg-purple-900/30 text-purple-400 border-purple-500' : 'bg-green-900/30 text-green-400 border-green-500'}>
                              {payment.type === 'a_trato' ? 'A Trato' : 'Por Día'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-semibold text-blue-400">{formatCurrency(payment.total_amount)}</td>
                          <td className="py-3 px-4 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                              {payment.tasks_count !== undefined && payment.tasks_count > 0 && (
                                <Badge className="bg-purple-900/30 text-purple-400 border-purple-500">
                                  {payment.tasks_count} tarea{payment.tasks_count !== 1 ? 's' : ''}
                                </Badge>
                              )}
                              {payment.days_count !== undefined && payment.days_count > 0 && (
                                <Badge className="bg-green-900/30 text-green-400 border-green-500">
                                  {payment.days_count} día{payment.days_count !== 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {payment.tasks_count !== undefined && payment.tasks_count > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setSelectedPaymentForModal({
                                      id: payment.id,
                                      workerName: payment.worker_name,
                                      paymentDate: payment.payment_date,
                                      totalAmount: payment.total_amount
                                    })
                                    setShowPaymentTasksModal(true)
                                  }}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-900/30 text-purple-400 border border-purple-500 hover:bg-purple-900/50 transition-colors"
                                  type="button"
                                  title="Ver detalles de tareas"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {payment.days_count !== undefined && payment.days_count > 0 && payment.type !== 'a_trato' && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setSelectedPaymentDaysForModal({
                                      id: payment.id,
                                      workerId: payment.worker_id,
                                      workerName: payment.worker_name,
                                      paymentDate: payment.payment_date,
                                      paymentMonth: payment.payment_month || new Date(payment.payment_date).getMonth() + 1,
                                      paymentYear: payment.payment_year || new Date(payment.payment_date).getFullYear(),
                                      totalAmount: payment.total_amount,
                                      daysCount: payment.days_count || 0,
                                      dailyRate: payment.daily_rate || 0,
                                      startDate: (payment as any).start_date,
                                      endDate: (payment as any).end_date,
                                      projectId: payment.project_id
                                    })
                                    setShowPaymentDaysModal(true)
                                  }}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-900/30 text-green-400 border border-green-500 hover:bg-green-900/50 transition-colors"
                                  type="button"
                                  title="Ver detalles de días"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleExportPaymentPDF(payment)
                                }}
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-900/30 text-blue-400 border border-blue-500 hover:bg-blue-900/50 transition-colors"
                                type="button"
                                title="Exportar PDF"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Paginación */}
          {!loadingHistory && dbPaymentHistory.length > 0 && totalPages > 1 && (
            <Card className="bg-slate-700/30 border-slate-600">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, dbPaymentHistory.length)} de {dbPaymentHistory.length} pagos
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-slate-300">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modales - Renderizados fuera del switch para que funcionen en ambas vistas */}
      {selectedWorkerForModal && selectedWorkerForModal.type === 'a_trato' && (
        <WorkerTasksModal
          isOpen={showTasksModal}
          onClose={() => {
            setShowTasksModal(false)
            setSelectedWorkerForModal(null)
            setWorkerTasks([])
          }}
          worker={{
            id: selectedWorkerForModal.id,
            name: selectedWorkerForModal.name,
            rut: selectedWorkerForModal.rut
          }}
          tasks={loadingTasks ? [] : workerTasks.map(task => ({
            id: task.id,
            task_name: task.task_name,
            apartment_number: task.apartment_number,
            project_name: task.project_name,
            assignment_status: task.assignment_status,
            worker_payment: task.worker_payment,
            completed_at: task.completed_at,
            paid_at: task.paid_at,
            payment_id: task.payment_id,
            contract_id: task.contract_id,
            contract_start: task.contract_start,
            contract_end: task.contract_end,
            contract_number: task.contract_number
          }))}
        />
      )}
      {selectedWorkerForModal && selectedWorkerForModal.type === 'por_dia' && (
        <WorkerAttendanceModal
          isOpen={showAttendanceModal}
          onClose={() => {
            setShowAttendanceModal(false)
            setSelectedWorkerForModal(null)
            setWorkerAttendanceData({ attendances: [], contracts: [], loading: false })
          }}
          worker={{
            id: selectedWorkerForModal.id,
            name: selectedWorkerForModal.name,
            rut: selectedWorkerForModal.rut
          }}
          attendances={workerAttendanceData.attendances}
          contracts={workerAttendanceData.contracts}
        />
      )}
      {selectedPaymentForModal && (
        <PaymentTasksModal
          key={`payment-tasks-modal-${selectedPaymentForModal.id}`}
          isOpen={showPaymentTasksModal && !!selectedPaymentForModal}
          onClose={() => {
            setShowPaymentTasksModal(false)
            setSelectedPaymentForModal(null)
          }}
          paymentId={selectedPaymentForModal.id}
          workerName={selectedPaymentForModal.workerName}
          paymentDate={selectedPaymentForModal.paymentDate}
          totalAmount={selectedPaymentForModal.totalAmount}
        />
      )}
      {selectedPaymentDaysForModal && (
        <PaymentDaysModal
          isOpen={showPaymentDaysModal}
          onClose={() => {
            setShowPaymentDaysModal(false)
            setSelectedPaymentDaysForModal(null)
          }}
          paymentId={selectedPaymentDaysForModal.id}
          workerId={selectedPaymentDaysForModal.workerId}
          workerName={selectedPaymentDaysForModal.workerName}
          paymentDate={selectedPaymentDaysForModal.paymentDate}
          paymentMonth={selectedPaymentDaysForModal.paymentMonth}
          paymentYear={selectedPaymentDaysForModal.paymentYear}
          totalAmount={selectedPaymentDaysForModal.totalAmount}
          daysCount={selectedPaymentDaysForModal.daysCount}
          dailyRate={selectedPaymentDaysForModal.dailyRate}
          startDate={selectedPaymentDaysForModal.startDate}
          endDate={selectedPaymentDaysForModal.endDate}
          projectId={selectedPaymentDaysForModal.projectId}
        />
      )}

      {/* Modal de procesar pago de tareas */}
      {selectedWorkerForModal && selectedWorkerForModal.type === 'a_trato' && (
        <ProcessTaskPaymentModal
          isOpen={showProcessPaymentModal}
          onClose={() => {
            setShowProcessPaymentModal(false)
            setSelectedWorkerForModal(null)
          }}
          worker={{
            id: selectedWorkerForModal.id,
            name: selectedWorkerForModal.name,
            rut: selectedWorkerForModal.rut
          }}
          onPaymentProcessed={() => {
            // Refrescar datos después del pago
            refreshPayments()
            setShowProcessPaymentModal(false)
            setSelectedWorkerForModal(null)
          }}
        />
      )}

      {/* Modal de procesar pago de días */}
      {selectedWorkerForModal && selectedWorkerForModal.type === 'por_dia' && (() => {
        const workerProject = projects.find(p =>
          p.workers.some(w => w.worker_id === selectedWorkerForModal.id)
        )
        const workerData = workerProject?.workers.find(w => w.worker_id === selectedWorkerForModal.id)

        return (
          <ProcessDaysPaymentModal
            isOpen={showProcessDaysModal}
            onClose={() => {
              setShowProcessDaysModal(false)
              setSelectedWorkerForModal(null)
            }}
            worker={{
              id: selectedWorkerForModal.id,
              name: selectedWorkerForModal.name,
              rut: selectedWorkerForModal.rut
            }}
            project={{
              id: workerProject?.project_id || 0,
              name: workerProject?.project_name || ''
            }}
            dailyRate={workerData?.daily_rate || 0}
            onPaymentProcessed={() => {
              // Refrescar datos después del pago
              refreshPayments()
              setShowProcessDaysModal(false)
              setSelectedWorkerForModal(null)
            }}
          />
        )
      })()}
      <PaymentFiltersSidebar
        isOpen={isFilterSidebarOpen}
        onClose={() => setIsFilterSidebarOpen(false)}
        currentView={currentView}
        projectFilter={projectFilter}
        setProjectFilter={setProjectFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        workerFilter={workerFilter}
        setWorkerFilter={setWorkerFilter}
        projects={dbProjects}
        allWorkers={allWorkers}
        historyPeriod={historyPeriod}
        setHistoryPeriod={setHistoryPeriod}
        historyWorker={historyWorker}
        setHistoryWorker={setHistoryWorker}
        historyProject={historyProject}
        setHistoryProject={setHistoryProject}
        allHistoryWorkers={allHistoryWorkers}
        allHistoryProjects={allHistoryProjects}
        onClearFilters={() => {
          setProjectFilter('all')
          setTypeFilter('all')
          setWorkerFilter('all')
          setSearchWorker('')
          setHistoryPeriod('all')
          setHistoryWorker('all')
          setHistoryProject('all')
          setActiveFilter(null)
        }}
      />
      {/* Modal de Pago Personalizado */}
      <CustomPaymentModal
        isOpen={showCustomPaymentModal}
        onClose={() => setShowCustomPaymentModal(false)}
        onPaymentSuccess={() => {
          refreshPayments()
          setShowCustomPaymentModal(false)
        }}
        workers={fetchedWorkers.map(w => ({ id: w.id, name: w.full_name, rut: w.rut }))}
        projects={projects.map(p => ({ id: p.project_id, name: p.project_name }))}
      />
    </div>
  )
}

