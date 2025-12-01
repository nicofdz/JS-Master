'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// Función helper para obtener la hora actual en zona horaria de Chile
const getChileDateTime = () => {
  // Obtener la fecha/hora actual en formato de Chile
  const formatter = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const parts = formatter.formatToParts(new Date())
  const date: Record<string, string> = {}
  parts.forEach(part => {
    if (part.type !== 'literal') {
      date[part.type] = part.value
    }
  })
  
  // Construir el timestamp sin zona horaria (PostgreSQL lo tratará como local)
  return `${date.year}-${date.month}-${date.day}T${date.hour}:${date.minute}:${date.second}`
}

export interface WorkerAttendance {
  id: number
  worker_id: number
  project_id: number | null
  contract_id: number | null
  attendance_date: string
  is_present: boolean
  check_in_time: string
  check_out_time?: string | null
  departure_reason?: string | null
  hours_worked?: number | null
  is_overtime?: boolean
  overtime_hours?: number | null
  early_departure?: boolean
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  // Datos relacionados
  worker_name?: string
  worker_rut?: string
  project_name?: string
  contract_number?: string
}

export interface AttendanceFormData {
  worker_id: number
  project_id?: number | null
  contract_id: number
  attendance_date: string
  is_present: boolean
  notes?: string | null
  check_in_time?: string
  check_out_time?: string | null
  hours_worked?: number | null
  is_overtime?: boolean
  overtime_hours?: number | null
  early_departure?: boolean
  departure_reason?: string | null
  created_by?: string | null
}

export function useAttendance() {
  const [attendances, setAttendances] = useState<WorkerAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshingStats, setRefreshingStats] = useState(false)

  // Cargar asistencias
  const fetchAttendances = async (date?: string, projectId?: number | null) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('worker_attendance')
        .select(`
          *,
          workers!inner(full_name, rut),
          projects(name),
          contract_history(contract_number)
        `)

      // IMPORTANTE: Filtrar por fecha SIEMPRE (obligatorio)
      if (date) {
        query = query.eq('attendance_date', date)
      } else {
        // Si no hay fecha, usar fecha actual por defecto
        const today = new Date().toISOString().split('T')[0]
        query = query.eq('attendance_date', today)
      }

      // Filtrar por proyecto si se proporciona
      if (projectId !== undefined && projectId !== null) {
        query = query.eq('project_id', projectId)
      }

      // Ordenar DESPUÉS de los filtros
      query = query.order('check_in_time', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      // Transformar datos para incluir nombres
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        worker_name: item.workers?.full_name || 'Sin nombre',
        worker_rut: item.workers?.rut || '',
        project_name: item.projects?.name || 'General',
        contract_number: item.contract_history?.contract_number || 'N/A'
      }))

      setAttendances(transformedData)
    } catch (err: any) {
      console.error('Error fetching attendances:', err)
      setError(err.message || 'Error al cargar asistencias')
      toast.error('Error al cargar asistencias')
    } finally {
      setLoading(false)
    }
  }

  // Crear o actualizar asistencia
  const markAttendance = async (data: AttendanceFormData) => {
    try {
      // Buscar registro existente por contract_id y fecha
      const { data: existingAttendance } = await supabase
        .from('worker_attendance')
        .select('id')
        .eq('contract_id', data.contract_id)
        .eq('attendance_date', data.attendance_date)
        .single()

      if (existingAttendance) {
        // Actualizar asistencia existente (no cambiamos created_by en actualización)
        const { data: updated, error } = await supabase
          .from('worker_attendance')
          .update({
            is_present: data.is_present,
            notes: data.notes || null,
            check_in_time: data.check_in_time || getChileDateTime(),
            check_out_time: data.check_out_time || null,
            hours_worked: data.hours_worked || null,
            is_overtime: data.is_overtime || false,
            overtime_hours: data.overtime_hours || null,
            early_departure: data.early_departure || false,
            departure_reason: data.departure_reason || null,
            updated_at: getChileDateTime()
          })
          .eq('id', existingAttendance.id)
          .select(`
            *,
            workers!inner(full_name, rut),
            projects(name),
            contract_history!inner(contract_number)
          `)
          .single()

        if (error) throw error

        const transformed = {
          ...updated,
          worker_name: (updated as any).workers?.full_name || 'Sin nombre',
          worker_rut: (updated as any).workers?.rut || '',
          project_name: (updated as any).projects?.name || 'General',
          contract_number: (updated as any).contract_history?.contract_number || 'N/A'
        }

        setAttendances(prev => 
          prev.map(a => a.id === existingAttendance.id ? transformed : a)
        )
        toast.success('Asistencia actualizada')
      } else {
        // Crear nueva asistencia (guardamos created_by)
        const { data: created, error } = await supabase
          .from('worker_attendance')
          .insert([{
            worker_id: data.worker_id,
            project_id: data.project_id || null,
            contract_id: data.contract_id,
            attendance_date: data.attendance_date,
            is_present: data.is_present,
            notes: data.notes || null,
            check_in_time: data.check_in_time || getChileDateTime(),
            check_out_time: data.check_out_time || null,
            hours_worked: data.hours_worked || null,
            is_overtime: data.is_overtime || false,
            overtime_hours: data.overtime_hours || null,
            early_departure: data.early_departure || false,
            departure_reason: data.departure_reason || null,
            created_by: data.created_by || null
          }])
          .select(`
            *,
            workers!inner(full_name, rut),
            projects(name),
            contract_history!inner(contract_number)
          `)
          .single()

        if (error) throw error

        const transformed = {
          ...created,
          worker_name: (created as any).workers?.full_name || 'Sin nombre',
          worker_rut: (created as any).workers?.rut || '',
          project_name: (created as any).projects?.name || 'General',
          contract_number: (created as any).contract_history?.contract_number || 'N/A'
        }

        setAttendances(prev => [transformed, ...prev])
        toast.success('Asistencia registrada')
      }
    } catch (err: any) {
      console.error('Error marking attendance:', err)
      toast.error(err.message || 'Error al registrar asistencia')
      throw err
    }
  }

  // Eliminar asistencia
  const deleteAttendance = async (id: number) => {
    try {
      const { error } = await supabase
        .from('worker_attendance')
        .delete()
        .eq('id', id)

      if (error) throw error

      setAttendances(prev => prev.filter(a => a.id !== id))
      toast.success('Asistencia eliminada')
    } catch (err: any) {
      console.error('Error deleting attendance:', err)
      toast.error(err.message || 'Error al eliminar asistencia')
      throw err
    }
  }

  // Registrar checkout/salida de trabajador
  const checkoutWorker = async (attendanceId: number, checkoutTime: string, departureReason?: string) => {
    try {
      // Parsear las horas para calcular horas trabajadas
      const { data: attendance, error: fetchError } = await supabase
        .from('worker_attendance')
        .select('check_in_time')
        .eq('id', attendanceId)
        .single()

      if (fetchError) throw fetchError

      const checkInTime = new Date(attendance.check_in_time)
      const checkOutTimeDate = new Date(checkoutTime)
      
      // Calcular horas trabajadas
      const diffMs = checkOutTimeDate.getTime() - checkInTime.getTime()
      const hoursWorked = diffMs / (1000 * 60 * 60)
      
      // Hora de salida estándar: 18:00
      const standardCheckout = new Date(checkOutTimeDate)
      standardCheckout.setHours(18, 0, 0, 0)
      
      // Determinar si es salida temprana o horas extras
      const isEarlyDeparture = checkOutTimeDate < standardCheckout
      const isOvertime = checkOutTimeDate > standardCheckout
      
      // Calcular horas extras (después de las 18:00)
      let overtimeHours = 0
      if (isOvertime) {
        const overtimeDiffMs = checkOutTimeDate.getTime() - standardCheckout.getTime()
        overtimeHours = overtimeDiffMs / (1000 * 60 * 60)
      }

      const { data: updated, error } = await supabase
        .from('worker_attendance')
        .update({
          check_out_time: checkoutTime,
          departure_reason: departureReason || null,
          hours_worked: Math.round(hoursWorked * 100) / 100,
          is_overtime: isOvertime,
          overtime_hours: isOvertime ? Math.round(overtimeHours * 100) / 100 : null,
          early_departure: isEarlyDeparture,
          updated_at: getChileDateTime()
        })
        .eq('id', attendanceId)
        .select(`
          *,
          workers!inner(full_name, rut),
          projects(name),
          contract_history!inner(contract_number)
        `)
        .single()

      if (error) throw error

      const transformed = {
        ...updated,
        worker_name: (updated as any).workers?.full_name || 'Sin nombre',
        worker_rut: (updated as any).workers?.rut || '',
        project_name: (updated as any).projects?.name || 'General',
        contract_number: (updated as any).contract_history?.contract_number || 'N/A'
      }

      setAttendances(prev => 
        prev.map(a => a.id === attendanceId ? transformed : a)
      )
      
      toast.success(isEarlyDeparture ? 'Salida temprana registrada' : 'Salida registrada')
    } catch (err: any) {
      console.error('Error checking out worker:', err)
      toast.error(err.message || 'Error al registrar salida')
      throw err
    }
  }

  // Obtener estadísticas de asistencia de un trabajador
  const getWorkerAttendanceStats = async (workerId: number, month: number, year: number) => {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('worker_attendance')
        .select('*')
        .eq('worker_id', workerId)
        .eq('is_present', true)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)

      if (error) throw error

      return {
        totalDays: data?.length || 0,
        dates: data?.map(d => d.attendance_date) || []
      }
    } catch (err: any) {
      console.error('Error fetching worker stats:', err)
      return { totalDays: 0, dates: [] }
    }
  }

  // Refrescar estadísticas de asistencia (vista materializada)
  const refreshAttendanceStats = async () => {
    try {
      setRefreshingStats(true)
      
      const { error } = await supabase
        .rpc('refresh_attendance_stats')

      if (error) throw error

      toast.success('Estadísticas actualizadas')
      return true
    } catch (err: any) {
      console.error('Error refreshing stats:', err)
      toast.error('Error al actualizar estadísticas')
      return false
    } finally {
      setRefreshingStats(false)
    }
  }

  // NO cargar automáticamente - dejar que el componente controle la carga
  // useEffect(() => {
  //   fetchAttendances()
  // }, [])

  return {
    attendances,
    loading,
    error,
    refreshingStats,
    fetchAttendances,
    markAttendance,
    deleteAttendance,
    checkoutWorker,
    getWorkerAttendanceStats,
    refreshAttendanceStats
  }
}
