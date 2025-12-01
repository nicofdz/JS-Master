'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Tower {
  id: number
  project_id: number
  tower_number: number
  name?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  project_name?: string
}

type TowerInsert = {
  project_id: number
  tower_number: number
  name?: string
  description?: string
}

export function useTowers(projectId?: number) {
  const [towers, setTowers] = useState<Tower[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTowers = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('towers')
        .select(`
          *,
          projects!inner(name)
        `)
        .eq('is_active', true)
        .order('project_id', { ascending: true })
        .order('tower_number', { ascending: true })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error

      const processedTowers = (data || []).map(tower => ({
        ...tower,
        project_name: (tower.projects as any)?.name || 'Proyecto Desconocido'
      }))

      setTowers(processedTowers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar torres')
      console.error('Error fetching towers:', err)
    } finally {
      setLoading(false)
    }
  }

  const createTower = async (tower: TowerInsert) => {
    try {
      const { data, error } = await supabase
        .from('towers')
        .insert(tower)
        .select(`
          *,
          projects!inner(name)
        `)
        .single()

      if (error) throw error

      const newTower = {
        ...data,
        project_name: (data.projects as any)?.name || 'Proyecto Desconocido'
      }

      setTowers(prev => [...prev, newTower].sort((a, b) => {
        if (a.project_id !== b.project_id) return a.project_id - b.project_id
        return a.tower_number - b.tower_number
      }))

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear torre')
      throw err
    }
  }

  const updateTower = async (id: number, updates: Partial<Tower>) => {
    try {
      const { data, error } = await supabase
        .from('towers')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          projects!inner(name)
        `)
        .single()

      if (error) throw error

      setTowers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar torre')
      throw err
    }
  }

  const deleteTower = async (id: number) => {
    try {
      const { error } = await supabase
        .from('towers')
        .delete()
        .eq('id', id)

      if (error) throw error
      setTowers(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar torre')
      throw err
    }
  }

  const softDeleteTower = async (id: number) => {
    try {
      // Obtener la torre actual para agregar prefijo al nombre
      const tower = towers.find(t => t.id === id)
      const currentName = tower?.name || `Torre ${tower?.tower_number || ''}`
      const newName = currentName.startsWith('[ELIMINADO] ') 
        ? currentName 
        : `[ELIMINADO] ${currentName}`

      const { data, error } = await supabase
        .from('towers')
        .update({ 
          is_active: false,
          name: newName
        })
        .eq('id', id)
        .select(`
          *,
          projects!inner(name)
        `)
        .single()

      if (error) throw error

      // Actualizar la lista local (remover de la lista ya que filtramos por is_active)
      setTowers(prev => prev.filter(t => t.id !== id))
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar torre')
      throw err
    }
  }

  const getNextTowerNumber = async (projectId: number): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('towers')
        .select('tower_number')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('tower_number', { ascending: false })
        .limit(1)

      if (error) throw error

      if (!data || data.length === 0) {
        return 1
      }

      return (data[0].tower_number || 0) + 1
    } catch (err) {
      console.error('Error getting next tower number:', err)
      throw err
    }
  }

  const createTowersForProject = async (projectId: number, totalTowers: number) => {
    try {
      const towersToCreate = Array.from({ length: totalTowers }, (_, index) => ({
        project_id: projectId,
        tower_number: index + 1,
        name: `Torre ${index + 1}`
      }))

      const { data, error } = await supabase
        .from('towers')
        .insert(towersToCreate)
        .select(`
          *,
          projects!inner(name)
        `)

      if (error) throw error

      const newTowers = (data || []).map(tower => ({
        ...tower,
        project_name: (tower.projects as any)?.name || 'Proyecto Desconocido'
      }))

      setTowers(prev => [...prev, ...newTowers].sort((a, b) => {
        if (a.project_id !== b.project_id) return a.project_id - b.project_id
        return a.tower_number - b.tower_number
      }))

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear torres')
      throw err
    }
  }

  useEffect(() => {
    fetchTowers()
  }, [projectId])

  return {
    towers,
    loading,
    error,
    refresh: fetchTowers,
    createTower,
    updateTower,
    deleteTower,
    softDeleteTower,
    getNextTowerNumber,
    createTowersForProject
  }
}

