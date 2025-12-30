'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { notifyStockLow, notifyStockCritical } from '@/lib/notifications'

export type MaterialMovementType = 'ingreso' | 'entrega' | 'ajuste_negativo'

export interface MaterialMovement {
  id: number
  material_id: number
  warehouse_id: number
  movement_type: MaterialMovementType
  quantity: number
  stock_before: number
  stock_after: number
  consumed?: boolean
  consumed_at?: string
  consumed_by?: string
  project_id?: number | null
  worker_id?: number | null
  delivered_by?: string | null
  reason?: string | null
  notes?: string | null
  unit_cost?: number | null
  total_cost?: number | null
  created_at: string
  // Relaciones expandidas
  material_name?: string
  warehouse_name?: string
  project_name?: string
  worker_name?: string
  delivered_by_name?: string
}

export interface MaterialDeliveryData {
  material_id: number
  warehouse_id: number
  quantity: number
  project_id?: number | null
  worker_id?: number | null
  reason?: string | null
  notes?: string | null
  delivered_by?: string | null
  created_at?: string | null
}

export interface MaterialAdjustmentData {
  material_id: number
  warehouse_id: number
  movement_type: 'ingreso' | 'ajuste_negativo'
  quantity: number
  reason?: string | null
  notes?: string | null
  project_id?: number | null
}

export interface MovementFilters {
  material_id?: number
  warehouse_id?: number
  project_id?: number
  worker_id?: number
  movement_type?: MaterialMovementType
  date_from?: string
  date_to?: string
  delivered_by?: string
  limit?: number
  offset?: number
}

export function useMaterialMovements() {
  const [movements, setMovements] = useState<MaterialMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Cargar movimientos con filtros
  const fetchMovements = async (filters?: MovementFilters) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('material_movements')
        .select(`
          *,
          materials!inner(id, name),
          warehouses!inner(id, name),
          projects(id, name),
          workers(id, full_name),
          user_profiles!delivered_by(id, full_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filters?.material_id) {
        query = query.eq('material_id', filters.material_id)
      }

      if (filters?.warehouse_id) {
        query = query.eq('warehouse_id', filters.warehouse_id)
      }

      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id)
      }

      if (filters?.worker_id) {
        query = query.eq('worker_id', filters.worker_id)
      }

      if (filters?.movement_type) {
        query = query.eq('movement_type', filters.movement_type)
      }

      if (filters?.delivered_by) {
        query = query.eq('delivered_by', filters.delivered_by)
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to + 'T23:59:59')
      }

      // Paginación
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1)
      }

      const { data, error, count } = await query

      if (error) throw error

      // Formatear datos con relaciones expandidas
      const formattedMovements = (data || []).map((movement: any) => {
        const materials = movement.materials as any
        const warehouses = movement.warehouses as any
        const projects = movement.projects as any
        const workers = movement.workers as any
        const userProfiles = movement.user_profiles as any

        return {
          id: movement.id,
          material_id: movement.material_id,
          warehouse_id: movement.warehouse_id,
          movement_type: movement.movement_type,
          quantity: Number(movement.quantity),
          stock_before: Number(movement.stock_before),
          stock_after: Number(movement.stock_after),
          project_id: movement.project_id,
          worker_id: movement.worker_id,
          delivered_by: movement.delivered_by,
          reason: movement.reason,
          notes: movement.notes,
          unit_cost: movement.unit_cost ? Number(movement.unit_cost) : null,
          total_cost: movement.total_cost ? Number(movement.total_cost) : null,
          created_at: movement.created_at,
          consumed: movement.consumed,
          consumed_at: movement.consumed_at,
          consumed_by: movement.consumed_by,
          // Relaciones
          material_name: materials?.name,
          warehouse_name: warehouses?.name,
          project_name: projects?.name,
          worker_name: workers?.full_name,
          delivered_by_name: userProfiles?.full_name,
        }
      })

      setMovements(formattedMovements)
      setTotalCount(count || 0)
    } catch (err: any) {
      console.error('Error fetching movements:', err)
      setError(err.message || 'Error al cargar movimientos')
    } finally {
      setLoading(false)
    }
  }

  // Registrar entrega usando función SQL
  const registerDelivery = async (deliveryData: MaterialDeliveryData) => {
    try {
      setError(null)

      // Obtener usuario actual si no se proporciona delivered_by
      let deliveredByUserId = deliveryData.delivered_by;
      if (!deliveredByUserId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('Usuario no autenticado')
        }
        deliveredByUserId = user.id
      }

      const { data, error } = await supabase.rpc('register_material_delivery', {
        p_material_id: deliveryData.material_id,
        p_warehouse_id: deliveryData.warehouse_id,
        p_quantity: deliveryData.quantity,
        p_project_id: deliveryData.project_id || null,
        p_worker_id: deliveryData.worker_id || null,
        p_delivered_by: deliveredByUserId,
        p_reason: deliveryData.reason || null,
        p_notes: deliveryData.notes || null,
        p_created_at: deliveryData.created_at || null,
      })

      if (error) throw error

      // Verificar stock después de la entrega y notificar si está bajo
      await checkAndNotifyStockLevel(deliveryData.material_id, deliveryData.warehouse_id)

      // Recargar movimientos
      await fetchMovements()

      return data
    } catch (err: any) {
      console.error('Error registering delivery:', err)
      setError(err.message || 'Error al registrar entrega')
      throw err
    }
  }

  // Registrar ajuste usando función SQL
  const registerAdjustment = async (adjustmentData: MaterialAdjustmentData) => {
    try {
      setError(null)

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const { data, error } = await supabase.rpc('register_material_adjustment', {
        p_material_id: adjustmentData.material_id,
        p_warehouse_id: adjustmentData.warehouse_id,
        p_movement_type: adjustmentData.movement_type,
        p_quantity: adjustmentData.quantity,
        p_reason: adjustmentData.reason || null,
        p_notes: adjustmentData.notes || null,
        p_delivered_by: user.id,
      })

      if (error) throw error

      // Verificar stock después del ajuste y notificar si está bajo
      await checkAndNotifyStockLevel(adjustmentData.material_id, adjustmentData.warehouse_id)

      // Recargar movimientos
      await fetchMovements()

      return data
    } catch (err: any) {
      console.error('Error registering adjustment:', err)
      setError(err.message || 'Error al registrar ajuste')
      throw err
    }
  }

  // Función auxiliar para verificar stock y notificar si está bajo
  const checkAndNotifyStockLevel = async (materialId: number, warehouseId: number) => {
    try {
      // Obtener información del material y stock actual
      const { data: stockData, error: stockError } = await supabase
        .from('material_stock_by_warehouse')
        .select(`
          quantity,
          materials!inner(
            id,
            name,
            stock_min
          )
        `)
        .eq('material_id', materialId)
        .eq('warehouse_id', warehouseId)
        .single()

      if (stockError || !stockData) return

      const currentStock = Number(stockData.quantity)
      const material = stockData.materials as any
      const minStock = Number(material.stock_min || 0)

      if (minStock === 0) return // No hay stock mínimo configurado

      // Obtener usuarios admin y supervisores para notificar
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .in('role', ['admin', 'supervisor'])

      if (!admins || admins.length === 0) return

      const isCritical = currentStock <= minStock * 0.5
      const isLow = currentStock <= minStock

      // Notificar a todos los admins/supervisores
      for (const admin of admins) {
        if (isCritical) {
          await notifyStockCritical({
            userId: admin.id,
            materialId: material.id,
            materialName: material.name,
            currentStock
          })
        } else if (isLow) {
          await notifyStockLow({
            userId: admin.id,
            materialId: material.id,
            materialName: material.name,
            currentStock,
            minStock
          })
        }
      }
    } catch (err) {
      // No fallar si hay error en la notificación
      console.error('Error checking stock level:', err)
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    fetchMovements()
  }, [])

  return {
    movements,
    loading,
    error,
    totalCount,
    fetchMovements,
    registerDelivery,
    registerAdjustment,
  }
}
