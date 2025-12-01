'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export interface AttendanceStats {
  worker_id: number
  full_name: string
  rut: string
  cargo: string
  worker_is_active: boolean
  contract_id: number
  contract_number: string
  project_id: number
  project_name: string
  contract_type: 'por_dia' | 'a_trato'
  daily_rate: number
  contract_start: string
  contract_end: string | null
  contract_status: string
  contract_is_active: boolean
  total_registros: number
  dias_presente: number
  dias_ausente: number
  salidas_tempranas: number
  dias_con_extras: number
  total_horas_trabajadas: number
  promedio_horas_diarias: number
  total_horas_extras: number
  primer_registro: string | null
  ultimo_registro: string | null
  tasa_asistencia_pct: number
  tasa_puntualidad_pct: number
  ultima_actualizacion: string
}

export interface WorkerStats {
  contract_number: string
  project_name: string
  dias_presente: number
  dias_ausente: number
  total_horas: number
  promedio_horas: number
  tasa_asistencia: number
  salidas_tempranas: number
}

export interface ProjectStats {
  worker_name: string
  contract_number: string
  dias_presente: number
  tasa_asistencia: number
  total_horas: number
  salidas_tempranas: number
  dias_con_extras: number
}

export function useAttendanceStats() {
  const [stats, setStats] = useState<AttendanceStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refrescar la vista materializada
  const refreshStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const { error: refreshError } = await supabase
        .rpc('refresh_attendance_stats')

      if (refreshError) throw refreshError

      toast.success('Estadísticas actualizadas correctamente')
    } catch (err: any) {
      console.error('Error refreshing stats:', err)
      setError(err.message || 'Error al actualizar estadísticas')
      toast.error('Error al actualizar estadísticas')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Obtener todas las estadísticas
  const fetchAllStats = async (filters?: {
    projectId?: number
    workerId?: number
    activeOnly?: boolean
  }) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('worker_attendance_stats')
        .select('*')

      // Aplicar filtros
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      if (filters?.workerId) {
        query = query.eq('worker_id', filters.workerId)
      }

      if (filters?.activeOnly) {
        query = query.eq('contract_is_active', true)
      }

      query = query.order('dias_presente', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      setStats(data || [])
      return data || []
    } catch (err: any) {
      console.error('Error fetching stats:', err)
      setError(err.message || 'Error al cargar estadísticas')
      toast.error('Error al cargar estadísticas')
      return []
    } finally {
      setLoading(false)
    }
  }

  // Obtener estadísticas de un trabajador específico
  const getWorkerStats = async (workerId: number): Promise<WorkerStats[]> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .rpc('get_worker_stats', { p_worker_id: workerId })

      if (error) throw error

      return data || []
    } catch (err: any) {
      console.error('Error fetching worker stats:', err)
      setError(err.message || 'Error al cargar estadísticas del trabajador')
      return []
    } finally {
      setLoading(false)
    }
  }

  // Obtener estadísticas de un proyecto
  const getProjectStats = async (projectId: number): Promise<ProjectStats[]> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .rpc('get_project_attendance_stats', { p_project_id: projectId })

      if (error) throw error

      return data || []
    } catch (err: any) {
      console.error('Error fetching project stats:', err)
      setError(err.message || 'Error al cargar estadísticas del proyecto')
      return []
    } finally {
      setLoading(false)
    }
  }

  // Obtener resumen general de asistencia
  const getAttendanceSummary = async (projectId?: number) => {
    try {
      const data = await fetchAllStats({
        projectId,
        activeOnly: true
      })

      // Calcular estadísticas agregadas
      const totalWorkers = data.length
      const totalDaysPresent = data.reduce((sum, stat) => sum + stat.dias_presente, 0)
      const totalDaysAbsent = data.reduce((sum, stat) => sum + stat.dias_ausente, 0)
      const totalHours = data.reduce((sum, stat) => sum + stat.total_horas_trabajadas, 0)
      const totalEarlyDepartures = data.reduce((sum, stat) => sum + stat.salidas_tempranas, 0)
      const totalOvertimeDays = data.reduce((sum, stat) => sum + stat.dias_con_extras, 0)

      const averageAttendanceRate = totalWorkers > 0
        ? data.reduce((sum, stat) => sum + stat.tasa_asistencia_pct, 0) / totalWorkers
        : 0

      const averagePunctualityRate = totalWorkers > 0
        ? data.reduce((sum, stat) => sum + stat.tasa_puntualidad_pct, 0) / totalWorkers
        : 0

      // Identificar trabajadores con baja asistencia (< 85%)
      const lowAttendanceWorkers = data.filter(stat => stat.tasa_asistencia_pct < 85)

      // Identificar trabajadores con muchas salidas tempranas (>= 3)
      const frequentEarlyDepartures = data.filter(stat => stat.salidas_tempranas >= 3)

      return {
        totalWorkers,
        totalDaysPresent,
        totalDaysAbsent,
        totalHours,
        totalEarlyDepartures,
        totalOvertimeDays,
        averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100,
        averagePunctualityRate: Math.round(averagePunctualityRate * 100) / 100,
        lowAttendanceWorkers: lowAttendanceWorkers.map(w => ({
          name: w.full_name,
          contract: w.contract_number,
          rate: w.tasa_asistencia_pct
        })),
        frequentEarlyDepartures: frequentEarlyDepartures.map(w => ({
          name: w.full_name,
          contract: w.contract_number,
          count: w.salidas_tempranas
        })),
        topPerformers: data
          .filter(w => w.dias_presente > 0)
          .sort((a, b) => b.tasa_asistencia_pct - a.tasa_asistencia_pct)
          .slice(0, 10)
          .map(w => ({
            name: w.full_name,
            contract: w.contract_number,
            daysPresent: w.dias_presente,
            rate: w.tasa_asistencia_pct
          }))
      }
    } catch (err: any) {
      console.error('Error getting attendance summary:', err)
      return null
    }
  }

  return {
    stats,
    loading,
    error,
    refreshStats,
    fetchAllStats,
    getWorkerStats,
    getProjectStats,
    getAttendanceSummary
  }
}

