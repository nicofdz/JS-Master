'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Warehouse {
  id: number
  name: string
  code?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WarehouseFormData {
  name: string
  code?: string | null
  is_active?: boolean
}

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar almacenes
  const fetchWarehouses = async (activeOnly: boolean = true) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('warehouses')
        .select('*')
        .order('name', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error

      setWarehouses(data || [])
    } catch (err: any) {
      console.error('Error fetching warehouses:', err)
      setError(err.message || 'Error al cargar almacenes')
    } finally {
      setLoading(false)
    }
  }

  // Crear almacén
  const createWarehouse = async (warehouseData: WarehouseFormData) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('warehouses')
        .insert([{
          name: warehouseData.name,
          code: warehouseData.code || null,
          is_active: warehouseData.is_active ?? true,
        }])
        .select()
        .single()

      if (error) throw error

      await fetchWarehouses()
      return data
    } catch (err: any) {
      console.error('Error creating warehouse:', err)
      setError(err.message || 'Error al crear almacén')
      throw err
    }
  }

  // Actualizar almacén
  const updateWarehouse = async (id: number, warehouseData: Partial<WarehouseFormData>) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('warehouses')
        .update({
          ...warehouseData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await fetchWarehouses()
      return data
    } catch (err: any) {
      console.error('Error updating warehouse:', err)
      setError(err.message || 'Error al actualizar almacén')
      throw err
    }
  }

  // Desactivar almacén
  const deactivateWarehouse = async (id: number) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('warehouses')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await fetchWarehouses()
      return data
    } catch (err: any) {
      console.error('Error deactivating warehouse:', err)
      setError(err.message || 'Error al desactivar almacén')
      throw err
    }
  }

  // Activar almacén (Desbloquear)
  const activateWarehouse = async (id: number) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('warehouses')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await fetchWarehouses()
      return data
    } catch (err: any) {
      console.error('Error activating warehouse:', err)
      setError(err.message || 'Error al activar almacén')
      throw err
    }
  }

  // Eliminar almacén (Hard Delete)
  const deleteWarehouse = async (id: number) => {
    try {
      setError(null)

      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchWarehouses()
    } catch (err: any) {
      console.error('Error deleting warehouse:', err)
      setError(err.message || 'Error al eliminar almacén')
      throw err
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    fetchWarehouses()
  }, [])

  return {
    warehouses,
    loading,
    error,
    fetchWarehouses,
    createWarehouse,
    updateWarehouse,
    deactivateWarehouse,
    activateWarehouse,
    deleteWarehouse,
  }
}
