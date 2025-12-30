import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface PaymentMetrics {
    totalTasks: number
    totalDays: number
    tasksCount: number
    daysCount: number
    workersCount: number
    workersATrato: number
    workersPorDia: number
}

export interface WorkerPaymentPending {
    worker_id: number
    name: string
    rut: string
    type: 'a_trato' | 'por_dia'
    tasksPending: number
    tasksAmount: number
    daysPending: number
    daysAmount: number
    totalPending: number
    project_id: number
    project_name: string
    is_active?: boolean
    daily_rate?: number
}

export interface ProjectWorkers {
    project_id: number
    project_name: string
    workers: WorkerPaymentPending[]
    totalAmount: number
    totalWorkers: number
}

export interface PaymentHistoryItem {
    id: number
    payment_date: string
    created_at?: string
    worker_id: number
    worker_name: string
    worker_rut: string
    project_id: number | null
    project_name: string | null
    type: 'a_trato' | 'por_dia' | 'custom'
    total_amount: number
    tasks_count?: number
    days_count?: number
    payment_month?: number
    payment_year?: number
    daily_rate?: number
    start_date?: string
    end_date?: string
    notes?: string | null
    created_by_name?: string | null
}

export interface PaymentHistoryChartData {
    month: string
    tareas: number
    asistencia: number
}

export function usePaymentsV2() {
    const [metrics, setMetrics] = useState<PaymentMetrics>({
        totalTasks: 0,
        totalDays: 0,
        tasksCount: 0,
        daysCount: 0,
        workersCount: 0,
        workersATrato: 0,
        workersPorDia: 0
    })
    const [projects, setProjects] = useState<ProjectWorkers[]>([])
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
    const [chartData, setChartData] = useState<PaymentHistoryChartData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchAll()
    }, [])

    const fetchAll = async () => {
        setLoading(true)
        setError(null)
        try {
            await Promise.all([
                fetchMetrics(),
                fetchWorkersByProject(),
                fetchPaymentHistory()
            ])
        } catch (err: any) {
            console.error('Error fetching payment data:', err)
            setError(err.message || 'Error al cargar datos de pagos')
        } finally {
            setLoading(false)
        }
    }

    const fetchMetrics = async () => {
        try {
            // 1. Obtener métricas de tareas (a_trato)
            const { data: tasksData, error: tasksError } = await supabase
                .from('task_assignments')
                .select('worker_id, worker_payment, contract_type')
                .eq('contract_type', 'a_trato')
                .eq('assignment_status', 'completed')
                .eq('is_paid', false)
                .eq('is_deleted', false)
                .gte('worker_payment', 0)

            if (tasksError) throw tasksError

            // 2. Obtener métricas de días (por_dia)
            // Primero obtener asistencias pendientes
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('worker_attendance')
                .select('worker_id, project_id, payment_percentage')
                .eq('is_present', true)
                .eq('is_paid', false)

            if (attendanceError) throw attendanceError

            // Obtener contratos activos para calcular montos
            const workerIds = Array.from(new Set(attendanceData?.map(a => a.worker_id) || []))
            let contractsMap = new Map<number, number>() // worker_id -> daily_rate

            if (workerIds.length > 0) {
                const { data: contracts, error: contractsError } = await supabase
                    .from('contract_history')
                    .select('worker_id, daily_rate')
                    .in('worker_id', workerIds)
                    .eq('is_active', true)
                    .eq('contract_type', 'por_dia')

                if (contractsError) throw contractsError

                contracts?.forEach(c => {
                    contractsMap.set(c.worker_id, c.daily_rate)
                })
            }

            // Calcular totales
            const tasksAmount = tasksData?.reduce((sum, t) => sum + (t.worker_payment || 0), 0) || 0
            const tasksCount = tasksData?.length || 0

            let daysAmount = 0
            attendanceData?.forEach(a => {
                const rate = contractsMap.get(a.worker_id) || 0
                const percentage = (a.payment_percentage || 100) / 100
                daysAmount += rate * percentage
            })

            const daysCount = attendanceData?.length || 0

            // Contar trabajadores únicos
            const workersATrato = new Set(tasksData?.map(t => t.worker_id)).size
            const workersPorDia = new Set(attendanceData?.map(a => a.worker_id)).size
            const allWorkers = new Set([
                ...(tasksData?.map(t => t.worker_id) || []),
                ...(attendanceData?.map(a => a.worker_id) || [])
            ]).size

            const metricsData = {
                totalTasks: tasksAmount,
                totalDays: daysAmount,
                tasksCount,
                daysCount,
                workersCount: allWorkers,
                workersATrato,
                workersPorDia
            }

            setMetrics(metricsData)
        } catch (err: any) {
            console.error('❌ Error obteniendo métricas:', err)
            setError(err.message || 'Error al obtener métricas')
        }
    }

    const fetchWorkersByProject = async () => {
        try {
            const projectsResultMap = new Map<number, ProjectWorkers>()

            // ===== PARTE 1: TRABAJADORES A_TRATO =====
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from('task_assignments')
                .select(`
          worker_id, 
          worker_payment, 
          task_id,
          tasks!inner (
            id,
            apartments!inner (
              id,
              floors!inner (
                id,
                project_id,
                projects!inner (
                  id, 
                  name,
                  is_active
                )
              )
            )
          ),
          workers!inner (
            id,
            full_name,
            rut
          )
        `)
                .eq('contract_type', 'a_trato')
                .eq('assignment_status', 'completed')
                .eq('is_paid', false)
                .eq('is_deleted', false)
                .gte('worker_payment', 0)

            if (assignmentsError) throw assignmentsError

            // Procesar datos a_trato
            assignmentsData?.forEach((assignment: any) => {
                const project = assignment.tasks.apartments.floors.projects

                // Solo procesar proyectos activos
                if (!project.is_active) return

                if (!projectsResultMap.has(project.id)) {
                    projectsResultMap.set(project.id, {
                        project_id: project.id,
                        project_name: project.name,
                        workers: [],
                        totalAmount: 0,
                        totalWorkers: 0
                    })
                }

                const projectData = projectsResultMap.get(project.id)!
                const workerId = assignment.worker_id

                let workerEntry = projectData.workers.find(w => w.worker_id === workerId && w.type === 'a_trato')

                if (!workerEntry) {
                    workerEntry = {
                        worker_id: workerId,
                        name: assignment.workers.full_name,
                        rut: assignment.workers.rut,
                        type: 'a_trato',
                        tasksPending: 0,
                        tasksAmount: 0,
                        daysPending: 0,
                        daysAmount: 0,
                        totalPending: 0,
                        project_id: project.id,
                        project_name: project.name
                    }
                    projectData.workers.push(workerEntry)
                }

                const amount = Number(assignment.worker_payment || 0)
                workerEntry.tasksPending++
                workerEntry.tasksAmount += amount
                workerEntry.totalPending += amount
                projectData.totalAmount += amount
            })

            // ===== PARTE 2: TRABAJADORES POR_DIA =====
            const { data: allAttendanceData, error: attendanceError } = await supabase
                .from('worker_attendance')
                .select(`
          worker_id,
          project_id,
          attendance_date,
          payment_percentage,
          projects!inner (
            id,
            name,
            is_active
          ),
          workers!inner (
            id,
            full_name,
            rut
          )
        `)
                .eq('is_present', true)
                .eq('is_paid', false)

            if (attendanceError) throw attendanceError

            // Obtener contratos para tarifas
            const workerIds = Array.from(new Set(allAttendanceData?.map(a => a.worker_id) || []))
            let contractsMap = new Map<number, any>() // worker_id -> contract

            if (workerIds.length > 0) {
                const { data: contracts, error: contractsError } = await supabase
                    .from('contract_history')
                    .select('worker_id, daily_rate, project_id')
                    .in('worker_id', workerIds)
                    .eq('is_active', true)
                    .eq('contract_type', 'por_dia')

                if (contractsError) throw contractsError

                contracts?.forEach(c => {
                    // Guardar contrato por trabajador (asumiendo un contrato activo por trabajador)
                    contractsMap.set(c.worker_id, c)
                })
            }

            // Procesar datos por_dia
            allAttendanceData?.forEach((attendance: any) => {
                const project = attendance.projects

                // Solo procesar proyectos activos
                if (!project.is_active) return

                // Verificar si el trabajador tiene contrato activo
                const contract = contractsMap.get(attendance.worker_id)
                if (!contract) return // Si no tiene contrato activo, ignorar (o manejar según regla de negocio)

                // Verificar que el contrato corresponda al proyecto (opcional, pero recomendable)
                // if (contract.project_id !== project.id) return 

                if (!projectsResultMap.has(project.id)) {
                    projectsResultMap.set(project.id, {
                        project_id: project.id,
                        project_name: project.name,
                        workers: [],
                        totalAmount: 0,
                        totalWorkers: 0
                    })
                }

                const projectData = projectsResultMap.get(project.id)!
                const workerId = attendance.worker_id

                let workerEntry = projectData.workers.find(w => w.worker_id === workerId && w.type === 'por_dia')

                if (!workerEntry) {
                    workerEntry = {
                        worker_id: workerId,
                        name: attendance.workers.full_name,
                        rut: attendance.workers.rut,
                        type: 'por_dia',
                        tasksPending: 0,
                        tasksAmount: 0,
                        daysPending: 0,
                        daysAmount: 0,
                        totalPending: 0,
                        project_id: project.id,
                        project_name: project.name,
                        daily_rate: contract.daily_rate
                    }
                    projectData.workers.push(workerEntry)
                }

                const percentage = (attendance.payment_percentage || 100) / 100
                const amount = contract.daily_rate * percentage

                workerEntry.daysPending++
                workerEntry.daysAmount += amount
                workerEntry.totalPending += amount
                projectData.totalAmount += amount
            })

            // Actualizar conteo de trabajadores por proyecto
            projectsResultMap.forEach(project => {
                project.totalWorkers = project.workers.length
                // Ordenar trabajadores por nombre
                project.workers.sort((a, b) => a.name.localeCompare(b.name))
            })

            const projectsArray = Array.from(projectsResultMap.values())
            setProjects(projectsArray)
        } catch (err: any) {
            console.error('❌ Error obteniendo trabajadores:', err)
            setError(err.message || 'Error al obtener trabajadores')
        }
    }

    const fetchWorkerTasks = async (workerId: number) => {
        try {
            // 1. Obtener tareas pendientes
            const { data: pendingTasks, error: pendingError } = await supabase
                .from('task_assignments')
                .select(`
          id,
          task_id,
          worker_payment,
          completed_at,
          assignment_status,
          tasks!inner (
            id,
            task_name,
            status,
            is_deleted,
            apartments!inner (
              id,
              apartment_number,
              floors!inner (
                id,
                project_id,
                projects!inner (
                  id,
                  name
                )
              )
            )
          )
        `)
                .eq('worker_id', workerId)
                .eq('contract_type', 'a_trato')
                .eq('assignment_status', 'completed')
                .eq('is_paid', false)
                .eq('is_deleted', false)
                .gte('worker_payment', 0)

            if (pendingError) throw pendingError

            // 2. Obtener tareas pagadas (histórico)
            const { data: paidTasks, error: paidError } = await supabase
                .from('task_assignments')
                .select(`
          id,
          task_id,
          worker_payment,
          completed_at,
          assignment_status,
          payment_task_assignments!inner (
            payment_id,
            worker_payment_history!inner (
              payment_date
            )
          ),
          tasks!inner (
            id,
            task_name,
            status,
            apartment_id,
            apartments!inner (
              id,
              apartment_number,
              floors!inner (
                id,
                project_id,
                projects!inner (
                  id,
                  name
                )
              )
            )
          )
        `)
                .eq('worker_id', workerId)
                .eq('contract_type', 'a_trato')
                .eq('is_paid', true)
                .order('completed_at', { ascending: false })
                .limit(50) // Limitar historial

            if (paidError) throw paidError

            // Helper para filtrar tareas válidas
            const isValidTask = (t: any) => {
                // Si no hay tarea, no es válido
                if (!t.tasks) return false
                // Si está explícitamente eliminada, filtrar (si viene el dato)
                if (t.tasks.is_deleted === true) return false
                return true
            }

            console.log('🔍 Fetching worker tasks for:', workerId)
            console.log('📊 Raw pending tasks:', pendingTasks?.length, pendingTasks)
            if (pendingError) console.error('❌ Error fetching pending tasks:', pendingError)

            // Formatear datos
            const formattedPending = (pendingTasks || [])
                .filter(isValidTask)
                .map((t: any) => ({
                    id: t.id,
                    task_name: t.tasks.task_name,
                    apartment_number: t.tasks.apartments.apartment_number,
                    project_name: t.tasks.apartments.floors.projects?.name || 'Proyecto Desconocido',
                    assignment_status: t.assignment_status,
                    worker_payment: t.worker_payment,
                    completed_at: t.completed_at
                }))

            console.log('✅ Formatted pending tasks:', formattedPending.length)


            const formattedPaid = (paidTasks || [])
                .filter(isValidTask)
                .map((t: any) => ({
                    id: t.id,
                    task_name: t.tasks.task_name,
                    apartment_number: t.tasks.apartments.apartment_number,
                    project_name: t.tasks.apartments.floors.projects.name,
                    assignment_status: t.assignment_status,
                    worker_payment: t.worker_payment,
                    completed_at: t.completed_at,
                    paid_at: t.payment_task_assignments[0]?.worker_payment_history?.payment_date,
                    payment_id: t.payment_task_assignments[0]?.payment_id
                }))

            return [...formattedPending, ...formattedPaid]
        } catch (err: any) {
            console.error('Error fetching worker tasks:', err)
            return []
        }
    }

    const fetchPaymentHistory = async (workerId?: number, projectId?: number, period: 'monthly' | 'yearly' | 'all' = 'all') => {
        try {
            const historyItems: PaymentHistoryItem[] = []

            // Usar RPC para obtener historial con nombres de proyectos correctos
            const { data: payments, error } = await supabase
                .rpc('get_payment_history_v2', {
                    p_worker_id: workerId || null,
                    p_project_id: projectId || null
                })

            if (error) {
                console.error('❌ Error obteniendo historial de pagos:', error)
                throw error
            }

            if (payments) {
                for (const payment of payments) {
                    // Determinar tipo: si es null, asumir a_trato (legacy) o inferir por tasks_count > 0
                    let type: 'a_trato' | 'por_dia' | 'custom' = (payment.contract_type as any)

                    if (!type) {
                        if ((payment.tasks_count || 0) > 0) {
                            type = 'a_trato'
                        } else if (payment.days_count && payment.days_count > 0) {
                            type = 'por_dia'
                        } else {
                            // Si no hay tareas ni días, y no tiene tipo, podría ser custom o legacy
                            // Asumimos custom si tiene monto pero no tareas/dias
                            type = 'custom'
                        }
                    }

                    historyItems.push({
                        id: payment.id,
                        payment_date: payment.payment_date,
                        created_at: payment.created_at,
                        worker_id: payment.worker_id,
                        worker_name: payment.worker_name || 'Trabajador desconocido',
                        worker_rut: payment.worker_rut || '',
                        project_id: payment.project_id,
                        project_name: payment.project_name || 'N/A',
                        type: type,
                        total_amount: Number(payment.total_amount || 0),
                        tasks_count: payment.tasks_count || 0,
                        days_count: payment.days_count || 0,
                        payment_month: payment.payment_month,
                        payment_year: payment.payment_year,
                        daily_rate: Number(payment.daily_rate || 0),
                        start_date: payment.start_date,
                        end_date: payment.end_date,
                        notes: payment.notes || null,
                        created_by_name: payment.created_by_name || null
                    })
                }
            }

            // Aplicar filtro de período (en memoria para simplificar, o mover a query)
            let filteredHistory = historyItems
            if (period === 'monthly') {
                const currentDate = new Date()
                const currentMonth = currentDate.getMonth()
                const currentYear = currentDate.getFullYear()
                filteredHistory = historyItems.filter(item => {
                    const itemDate = new Date(item.payment_date)
                    return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
                })
            } else if (period === 'yearly') {
                const currentYear = new Date().getFullYear()
                filteredHistory = historyItems.filter(item => {
                    const itemDate = new Date(item.payment_date)
                    return itemDate.getFullYear() === currentYear
                })
            }

            // Generar datos para el gráfico
            const chartDataMap = new Map<string, { tareas: number; asistencia: number }>()
            let targetYear = new Date().getFullYear()
            if (filteredHistory.length > 0) {
                const lastPaymentDate = new Date(filteredHistory[0].payment_date)
                targetYear = Math.max(targetYear, lastPaymentDate.getFullYear())
            }

            for (let month = 1; month <= 12; month++) {
                const monthKey = `${targetYear}-${String(month).padStart(2, '0')}`
                chartDataMap.set(monthKey, { tareas: 0, asistencia: 0 })
            }

            filteredHistory.forEach(item => {
                const date = new Date(item.payment_date)
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                if (chartDataMap.has(monthKey)) {
                    const monthData = chartDataMap.get(monthKey)!
                    if (item.type === 'a_trato') {
                        monthData.tareas += item.total_amount
                    } else {
                        monthData.asistencia += item.total_amount
                    }
                }
            })

            const chartDataArray: PaymentHistoryChartData[] = Array.from(chartDataMap.entries())
                .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                .map(([key, data]) => {
                    const [year, month] = key.split('-')
                    const date = new Date(parseInt(year), parseInt(month) - 1)
                    return {
                        month: date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }),
                        tareas: data.tareas,
                        asistencia: data.asistencia
                    }
                })

            console.log('✅ Historial obtenido (unificado):', filteredHistory.length, 'pagos')
            setPaymentHistory(filteredHistory)
            setChartData(chartDataArray)

            return filteredHistory
        } catch (err: any) {
            console.error('❌ Error obteniendo historial:', err)
            setError(err.message || 'Error al obtener historial')
            return []
        }
    }


    const deletePayment = async (paymentId: number) => {
        try {
            const { error } = await supabase
                .from('worker_payment_history')
                .update({ is_deleted: true })
                .eq('id', paymentId)

            if (error) throw error

            // Refresh data
            await fetchAll()
            return true
        } catch (err: any) {
            console.error('Error deleting payment:', err)
            throw err
        }
    }

    const updatePaymentDate = async (paymentId: number, newDate: Date) => {
        try {
            const { error } = await supabase
                .rpc('update_payment_date', {
                    p_payment_id: paymentId,
                    p_new_date: newDate.toISOString()
                })

            if (error) throw error

            await fetchAll()
            return true
        } catch (err: any) {
            console.error('Error updating payment date:', err)
            throw err
        }
    }

    return {
        metrics,
        projects,
        paymentHistory,
        chartData,
        loading,
        error,
        refresh: fetchAll,
        fetchWorkerTasks,
        fetchPaymentHistory,
        deletePayment,
        updatePaymentDate
    }
}
