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
  attendance_date: string
  is_present: boolean
  check_in_time: string
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  // Datos relacionados
  worker_name?: string
  worker_rut?: string
  project_name?: string
}

export interface AttendanceFormData {
  worker_id: number
  project_id?: number | null
  attendance_date: string
  is_present: boolean
  notes?: string | null
}

export function useAttendance() {
  const [attendances, setAttendances] = useState<WorkerAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          projects(name)
        `)
        .order('check_in_time', { ascending: false })

      // Filtrar por fecha si se proporciona
      if (date) {
        query = query.eq('attendance_date', date)
      }

      // Filtrar por proyecto si se proporciona
      if (projectId !== undefined && projectId !== null) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error

      // Transformar datos para incluir nombres
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        worker_name: item.workers?.full_name || 'Sin nombre',
        worker_rut: item.workers?.rut || '',
        project_name: item.projects?.name || 'General'
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
      // Buscar registro existente (manejando NULL correctamente)
      let query = supabase
        .from('worker_attendance')
        .select('id')
        .eq('worker_id', data.worker_id)
        .eq('attendance_date', data.attendance_date)
      
      // En SQL, NULL se compara con IS NULL, no con = NULL
      if (data.project_id === null || data.project_id === undefined) {
        query = query.is('project_id', null)
      } else {
        query = query.eq('project_id', data.project_id)
      }
      
      const { data: existingAttendance } = await query.single()

      if (existingAttendance) {
        // Actualizar asistencia existente
        const { data: updated, error } = await supabase
          .from('worker_attendance')
          .update({
            is_present: data.is_present,
            notes: data.notes || null,
            check_in_time: getChileDateTime(),
            updated_at: getChileDateTime()
          })
          .eq('id', existingAttendance.id)
          .select(`
            *,
            workers!inner(full_name, rut),
            projects(name)
          `)
          .single()

        if (error) throw error

        const transformed = {
          ...updated,
          worker_name: (updated as any).workers?.full_name || 'Sin nombre',
          worker_rut: (updated as any).workers?.rut || '',
          project_name: (updated as any).projects?.name || 'General'
        }

        setAttendances(prev => 
          prev.map(a => a.id === existingAttendance.id ? transformed : a)
        )
        toast.success('Asistencia actualizada')
      } else {
        // Crear nueva asistencia
        const { data: created, error } = await supabase
          .from('worker_attendance')
          .insert([{
            worker_id: data.worker_id,
            project_id: data.project_id || null,
            attendance_date: data.attendance_date,
            is_present: data.is_present,
            notes: data.notes || null,
            check_in_time: getChileDateTime()
          }])
          .select(`
            *,
            workers!inner(full_name, rut),
            projects(name)
          `)
          .single()

        if (error) throw error

        const transformed = {
          ...created,
          worker_name: (created as any).workers?.full_name || 'Sin nombre',
          worker_rut: (created as any).workers?.rut || '',
          project_name: (created as any).projects?.name || 'General'
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

  useEffect(() => {
    fetchAttendances()
  }, [])

  return {
    attendances,
    loading,
    error,
    fetchAttendances,
    markAttendance,
    deleteAttendance,
    getWorkerAttendanceStats
  }
}

