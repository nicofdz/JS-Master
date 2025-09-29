'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useApartmentsSimple() {
  const [apartments, setApartments] = useState<any[]>([])
  const [floors, setFloors] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApartments = async () => {
    try {
      console.log('🔍 Iniciando fetchApartments...')
      console.log('🔍 Supabase client:', supabase)
      
      // Consulta simple sin joins
      const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .order('apartment_number', { ascending: true })

      console.log('🔍 Respuesta de Supabase:', { data, error })

      if (error) {
        console.error('❌ ERROR DETALLADO en fetchApartments:')
        console.error('❌ Código de error:', error.code)
        console.error('❌ Mensaje de error:', error.message)
        console.error('❌ Detalles de error:', error.details)
        console.error('❌ Hint de error:', error.hint)
        console.error('❌ Error completo:', error)
        throw error
      }
      
      console.log('✅ Apartamentos obtenidos:', data?.length)
      console.log('✅ Primer apartamento:', data?.[0])
      setApartments(data || [])
    } catch (err) {
      console.error('💥 ERROR COMPLETO en fetchApartments:')
      console.error('💥 Tipo de error:', typeof err)
      console.error('💥 Error es instancia de Error:', err instanceof Error)
      console.error('💥 Mensaje:', err instanceof Error ? err.message : 'Error desconocido')
      console.error('💥 Stack:', err instanceof Error ? err.stack : 'No stack disponible')
      console.error('💥 Error completo:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar apartamentos')
    }
  }

  const fetchFloors = async () => {
    try {
      console.log('🔍 Iniciando fetchFloors...')
      
      // Consulta simple sin joins
      const { data, error } = await supabase
        .from('floors')
        .select('*')
        .order('floor_number', { ascending: true })

      console.log('🔍 Respuesta de Supabase para pisos:', { data, error })

      if (error) {
        console.error('❌ ERROR DETALLADO en fetchFloors:')
        console.error('❌ Código de error:', error.code)
        console.error('❌ Mensaje de error:', error.message)
        console.error('❌ Detalles de error:', error.details)
        console.error('❌ Hint de error:', error.hint)
        console.error('❌ Error completo:', error)
        throw error
      }
      
      console.log('✅ Pisos obtenidos:', data?.length)
      console.log('✅ Primer piso:', data?.[0])
      setFloors(data || [])
    } catch (err) {
      console.error('💥 ERROR COMPLETO en fetchFloors:')
      console.error('💥 Tipo de error:', typeof err)
      console.error('💥 Error es instancia de Error:', err instanceof Error)
      console.error('💥 Mensaje:', err instanceof Error ? err.message : 'Error desconocido')
      console.error('💥 Stack:', err instanceof Error ? err.stack : 'No stack disponible')
      console.error('💥 Error completo:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar pisos')
    }
  }

  const fetchProjects = async () => {
    try {
      console.log('🔍 Iniciando fetchProjects...')
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true })

      console.log('🔍 Respuesta de Supabase para proyectos:', { data, error })

      if (error) {
        console.error('❌ ERROR DETALLADO en fetchProjects:')
        console.error('❌ Código de error:', error.code)
        console.error('❌ Mensaje de error:', error.message)
        console.error('❌ Detalles de error:', error.details)
        console.error('❌ Hint de error:', error.hint)
        console.error('❌ Error completo:', error)
        throw error
      }
      
      console.log('✅ Proyectos obtenidos:', data?.length)
      console.log('✅ Primer proyecto:', data?.[0])
      setProjects(data || [])
    } catch (err) {
      console.error('💥 ERROR COMPLETO en fetchProjects:')
      console.error('💥 Tipo de error:', typeof err)
      console.error('💥 Error es instancia de Error:', err instanceof Error)
      console.error('💥 Mensaje:', err instanceof Error ? err.message : 'Error desconocido')
      console.error('💥 Stack:', err instanceof Error ? err.stack : 'No stack disponible')
      console.error('💥 Error completo:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar proyectos')
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        await Promise.all([
          fetchProjects(),
          fetchFloors(),
          fetchApartments()
        ])
      } catch (err) {
        console.error('💥 Error cargando datos:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return {
    apartments,
    floors,
    projects,
    loading,
    error,
    refresh: () => {
      setLoading(true)
      setError(null)
      fetchApartments()
      fetchFloors()
      fetchProjects()
      setLoading(false)
    }
  }
}
