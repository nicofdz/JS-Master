'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalFloors: number
  totalApartments: number
  averageProgress: number
  completedActivities: number
  totalActivities: number
}

interface ProjectProgress {
  id: number
  name: string
  address: string | null
  status: string
  progress_percentage: number | null
  floors_created: number
  apartments_created: number
  activities_completed: number
  total_activities: number
  delayed_tasks: number
  is_delayed: boolean
  delay_percentage: number
}

interface FloorStatus {
  id: number
  project_id: number
  floor_number: number
  status: string
  project_name: string
  apartments_count: number
  completed_activities: number
  total_activities: number
  progress_percentage: number
  pending_apartments: number
  completed_apartments: number
  in_progress_apartments: number
  blocked_apartments: number
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalFloors: 0,
    totalApartments: 0,
    averageProgress: 0,
    completedActivities: 0,
    totalActivities: 0
  })
  const [projectProgress, setProjectProgress] = useState<ProjectProgress[]>([])
  const [floorStatus, setFloorStatus] = useState<FloorStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener estadísticas generales
      const [
        projectsResponse,
        floorsResponse,
        apartmentsResponse,
        activitiesResponse
      ] = await Promise.all([
        supabase.from('projects').select('*').eq('is_active', true),
        supabase.from('floors').select('*'),
        supabase.from('apartments').select('*'),
        supabase.from('tasks').select('status').neq('status', 'cancelled').eq('is_deleted', false)
      ])

      if (projectsResponse.error) throw projectsResponse.error
      if (floorsResponse.error) throw floorsResponse.error
      if (apartmentsResponse.error) throw apartmentsResponse.error
      if (activitiesResponse.error) throw activitiesResponse.error

      const projects = projectsResponse.data || []
      const floors = floorsResponse.data || []
      const apartments = apartmentsResponse.data || []
      const activities = activitiesResponse.data || []

      // Calcular estadísticas
      const activeProjects = projects.filter(p => p.status === 'active').length
      const completedTasks = activities.filter(a => a.status === 'completed').length
      const totalTasks = activities.length


      setStats({
        totalProjects: projects.length,
        activeProjects,
        totalFloors: floors.length,
        totalApartments: apartments.length,
        averageProgress: 0, // Se calculará después
        completedActivities: completedTasks,
        totalActivities: totalTasks
      })

      // Calcular progreso real de cada proyecto
      const projectProgressData = await Promise.all(
        projects.map(async (project) => {
          // Obtener pisos del proyecto (excluyendo apartamentos bloqueados)
          const { data: projectFloors, error: floorsError } = await supabase
            .from('floors')
            .select(`
              id,
              apartments!inner(
                id,
                status,
                tasks(status, is_delayed, delay_reason)
              )
            `)
            .eq('project_id', project.id)
            .neq('apartments.status', 'blocked')

          if (floorsError) {
            console.error('Error fetching floors for project', project.name, floorsError)
          }

          const floors = projectFloors || []

          let totalTasks = 0
          let completedTasks = 0
          let delayedTasks = 0
          let totalApartments = 0

          // Contar tareas y apartamentos
          floors.forEach(floor => {
            if (floor.apartments) {
              floor.apartments.forEach(apartment => {
                totalApartments++
                if (apartment.tasks) {
                  apartment.tasks.forEach((task: any) => {
                    // Excluir tareas canceladas y eliminadas de las estadísticas
                    if (task.status === 'cancelled' || task.is_deleted === true) {
                      return
                    }
                    totalTasks++
                    if (task.status === 'completed') {
                      completedTasks++
                    }
                    // Contar tareas atrasadas (EXCLUIR tareas bloqueadas y canceladas)
                    if (task.is_delayed === true && task.status !== 'blocked' && task.status !== 'cancelled') {
                      delayedTasks++
                      console.log('🔴 Tarea retrasada encontrada:', {
                        task_name: (task as any).task_name,
                        status: task.status,
                        is_delayed: task.is_delayed,
                        delay_reason: task.delay_reason
                      })
                    }
                  })
                }
              })
            }
          })

          console.log('📊 Estadísticas del proyecto', project.name, {
            totalTasks,
            completedTasks,
            delayedTasks,
            totalApartments
          })

          // Si el proyecto está en planificación, el progreso debe ser 0%
          const progressPercentage = project.status === 'planning'
            ? 0
            : (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0)


          // Determinar si el proyecto está retrasado
          // Solo marcar como retrasado si hay tareas retrasadas Y el porcentaje es mayor a 0
          const delayPercentage = totalTasks > 0 ? Math.round((delayedTasks / totalTasks) * 100) : 0
          const isDelayed = delayedTasks > 0 && delayPercentage > 0

          return {
            id: project.id,
            name: project.name,
            address: project.address,
            status: project.status,
            progress_percentage: progressPercentage,
            floors_created: floors.length,
            apartments_created: totalApartments,
            activities_completed: completedTasks,
            total_activities: totalTasks,
            delayed_tasks: delayedTasks,
            is_delayed: isDelayed,
            delay_percentage: delayPercentage,
          }
        })
      )

      setProjectProgress(projectProgressData)

      // Calcular progreso promedio basado solo en proyectos activos
      const activeProjectsList = projectProgressData.filter(p => p.status === 'active')
      const averageProgress = activeProjectsList.length > 0
        ? Math.round(activeProjectsList.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / activeProjectsList.length)
        : 0

      // Actualizar las estadísticas con el progreso promedio correcto
      setStats(prevStats => ({
        ...prevStats,
        averageProgress
      }))

      // Obtener estado de pisos recientes
      const { data: floorStatusData, error: floorStatusError } = await supabase
        .from('floors')
        .select(`
          id,
          project_id,
          floor_number,
          status,
          projects!inner(name),
          apartments(
            id,
            status,
            tasks(status, is_deleted)
          )
        `)
        .order('floor_number', { ascending: true })
        .limit(10)

      if (floorStatusError) throw floorStatusError

      // Procesar datos de pisos
      const processedFloorStatus: FloorStatus[] = (floorStatusData || []).map(floor => {
        const apartments = floor.apartments || []

        // Contar apartamentos por estado (excluyendo bloqueados del progreso)
        const pendingApartments = apartments.filter(apt => apt.status === 'pending').length
        const completedApartments = apartments.filter(apt => apt.status === 'completed').length
        const inProgressApartments = apartments.filter(apt => apt.status === 'in-progress').length
        const blockedApartments = apartments.filter(apt => apt.status === 'blocked').length

        // Calcular tareas solo de apartamentos no bloqueados
        const nonBlockedApartments = apartments.filter(apt => apt.status !== 'blocked')
        const allTasks = nonBlockedApartments.flatMap((apt: any) => (apt.tasks || []).filter((task: any) => !task.is_deleted))
        const completedTasks = allTasks.filter((task: any) => task.status === 'completed').length
        const totalTasks = allTasks.length

        // Determinar el estado del piso basado en sus apartamentos
        let floorStatus = 'pending'
        if (completedApartments > 0 && pendingApartments === 0 && inProgressApartments === 0) {
          floorStatus = 'completed'
        } else if (inProgressApartments > 0 || completedApartments > 0) {
          floorStatus = 'in-progress'
        } else if (pendingApartments > 0) {
          floorStatus = 'pending'
        }

        return {
          id: floor.id,
          project_id: floor.project_id,
          floor_number: floor.floor_number,
          status: floorStatus,
          project_name: (floor.projects as any)?.name || 'Proyecto Desconocido',
          apartments_count: apartments.length,
          completed_activities: completedTasks,
          total_activities: totalTasks,
          progress_percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          pending_apartments: pendingApartments,
          completed_apartments: completedApartments,
          in_progress_apartments: inProgressApartments,
          blocked_apartments: blockedApartments
        }
      })

      setFloorStatus(processedFloorStatus)

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar datos del dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  return {
    stats,
    projectProgress,
    floorStatus,
    loading,
    error,
    refresh: fetchDashboardData
  }
}
