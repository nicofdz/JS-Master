'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Material {
  id: number
  name: string
  category: string
  unit: string
  unit_cost: number
  supplier?: string | null
  stock_min: number
  default_warehouse_id?: number | null
  default_warehouse?: {
    id: number
    name: string
  } | null
  project?: {
    id: number
    name: string
  } | null
  notes?: string | null
  is_active: boolean
  project_id?: number | null
  created_at: string
  updated_at: string
}

export interface MaterialStock {
  material_id: number
  warehouse_id: number
  quantity: number
  material_name?: string
  warehouse_name?: string
}

export interface MaterialFormData {
  name: string
  category: string
  unit: string
  unit_cost: number
  supplier?: string | null
  stock_min?: number
  default_warehouse_id?: number | null
  notes?: string | null
  is_active?: boolean
  project_id?: number | null
}

export interface MaterialFilters {
  search?: string
  category?: string
  lowStockOnly?: boolean
  activeOnly?: boolean
}

export function useMaterials(filters?: MaterialFilters) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [stockData, setStockData] = useState<MaterialStock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar materiales con filtros
  const fetchMaterials = async (customFilters?: MaterialFilters) => {
    try {
      setLoading(true)
      setError(null)

      const activeFilters = customFilters || filters

      let query = supabase
        .from('materials')
        .select(`
          *,
          warehouses!default_warehouse_id(id, name),
          projects(id, name)
        `)
        .order('created_at', { ascending: false })

      // Filtro de búsqueda por nombre
      if (activeFilters?.search) {
        query = query.ilike('name', `%${activeFilters.search}%`)
      }

      // Filtro por categoría
      if (activeFilters?.category) {
        query = query.eq('category', activeFilters.category)
      }

      // Solo activos por defecto
      if (activeFilters?.activeOnly !== false) {
        query = query.eq('is_active', true)
      }

      // Obtener usuario actual y perfil para filtrado por rol
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        // Si es supervisor, filtrar por proyectos asignados
        if (profile?.role === 'supervisor') {
          const { data: assignments } = await supabase
            .from('user_projects')
            .select('project_id')
            .eq('user_id', user.id)

          const projectIds = assignments?.map(a => a.project_id) || []

          if (projectIds.length > 0) {
            query = query.in('project_id', projectIds)
          } else {
            // Si no tiene proyectos asignados, no ve ningÃºn material
            query = query.eq('id', -1)
          }
        }
      }

      const { data, error } = await query

      if (error) throw error

      // Formatear datos con relación a warehouses y projects
      let filteredData = (data || []).map((material: any) => ({
        ...material,
        default_warehouse: material.warehouses ? {
          id: material.warehouses.id,
          name: material.warehouses.name,
        } : null,
        project: material.projects ? {
          id: material.projects.id,
          name: material.projects.name,
        } : null
      }))

      // Filtro de stock bajo (necesita verificar stock)
      if (activeFilters?.lowStockOnly && filteredData.length > 0) {
        // Primero cargar stock para estos materiales
        const materialIds = filteredData.map(m => m.id)

        const { data: stockDataResponse, error: stockError } = await supabase
          .from('material_stock_by_warehouse')
          .select(`
            *,
            materials!inner(id, name, stock_min)
          `)
          .in('material_id', materialIds)

        if (!stockError && stockDataResponse) {
          // Sumar stock por material
          const stockByMaterial = stockDataResponse.reduce((acc: any, stock: any) => {
            const matId = stock.material_id
            if (!acc[matId]) {
              acc[matId] = { total: 0, stock_min: stock.materials.stock_min || 0 }
            }
            acc[matId].total += Number(stock.quantity)
            return acc
          }, {})

          // Filtrar materiales con stock bajo o sin stock
          filteredData = filteredData.filter(m => {
            const stockInfo = stockByMaterial[m.id]
            if (!stockInfo) {
              // Sin stock registrado, verificar si tiene stock_min definido
              return (m.stock_min || 0) > 0
            }
            return stockInfo.total <= stockInfo.stock_min
          })
        }
      }

      setMaterials(filteredData)
    } catch (err: any) {
      console.error('Error fetching materials:', err)
      setError(err.message || 'Error al cargar materiales')
    } finally {
      setLoading(false)
    }
  }

  // Cargar stock por material y almacén
  const fetchStockForMaterials = async (materialIds?: number[]) => {
    try {
      let query = supabase
        .from('material_stock_by_warehouse')
        .select(`
          *,
          materials!inner(id, name),
          warehouses!inner(id, name)
        `)

      if (materialIds && materialIds.length > 0) {
        query = query.in('material_id', materialIds)
      }

      const { data, error } = await query

      if (error) throw error

      const formattedStock = (data || []).map((stock: any) => ({
        material_id: stock.material_id,
        warehouse_id: stock.warehouse_id,
        quantity: Number(stock.quantity),
        material_name: stock.materials?.name,
        warehouse_name: stock.warehouses?.name,
      }))

      setStockData(formattedStock)
    } catch (err: any) {
      console.error('Error fetching stock:', err)
      // No lanzar error aquí, solo loggear
    }
  }

  // Obtener stock total de un material (suma de todos los almacenes)
  const getTotalStock = (materialId: number): number => {
    return stockData
      .filter(s => s.material_id === materialId)
      .reduce((sum, s) => sum + Number(s.quantity), 0)
  }

  // Obtener stock de un material en un almacén específico
  const getStockByWarehouse = (materialId: number, warehouseId: number): number => {
    const stock = stockData.find(
      s => s.material_id === materialId && s.warehouse_id === warehouseId
    )
    return stock ? Number(stock.quantity) : 0
  }

  // Crear material
  const createMaterial = async (materialData: MaterialFormData) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('materials')
        .insert([{
          name: materialData.name,
          category: materialData.category,
          unit: materialData.unit,
          unit_cost: materialData.unit_cost,
          supplier: materialData.supplier || null,
          stock_min: materialData.stock_min || 0,
          default_warehouse_id: materialData.default_warehouse_id || null,
          notes: materialData.notes || null,
          is_active: materialData.is_active ?? true,
          project_id: materialData.project_id || null,
        }])
        .select(`
          *,
          warehouses!default_warehouse_id(id, name)
        `)
        .single()

      if (error) throw error

      // Formatear datos con relación a warehouses
      const formattedData = {
        ...data,
        default_warehouse: (data as any).warehouses ? {
          id: (data as any).warehouses.id,
          name: (data as any).warehouses.name,
        } : null,
      }

      await fetchMaterials()
      return formattedData
    } catch (err: any) {
      console.error('Error creating material:', err)
      setError(err.message || 'Error al crear material')
      throw err
    }
  }

  // Actualizar material
  const updateMaterial = async (id: number, materialData: Partial<MaterialFormData>) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('materials')
        .update({
          ...materialData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          warehouses!default_warehouse_id(id, name)
        `)
        .single()

      if (error) throw error

      // Formatear datos con relación a warehouses
      const formattedData = {
        ...data,
        default_warehouse: (data as any).warehouses ? {
          id: (data as any).warehouses.id,
          name: (data as any).warehouses.name,
        } : null,
      }

      await fetchMaterials()
      return formattedData
    } catch (err: any) {
      console.error('Error updating material:', err)
      setError(err.message || 'Error al actualizar material')
      throw err
    }
  }

  // Soft delete (desactivar) material
  const deleteMaterial = async (id: number) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('materials')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await fetchMaterials()
      return data
    } catch (err: any) {
      console.error('Error deleting material:', err)
      setError(err.message || 'Error al eliminar material')
      throw err
    }
  }

  // Obtener categorías únicas
  const getCategories = async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('category')
        .eq('is_active', true)

      if (error) throw error

      const uniqueCategories = Array.from(
        new Set((data || []).map((m: any) => m.category))
      ).filter(Boolean) as string[]

      return uniqueCategories.sort()
    } catch (err: any) {
      console.error('Error fetching categories:', err)
      return []
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    fetchMaterials()
  }, [])

  // Recargar stock cuando cambian los materiales
  useEffect(() => {
    if (materials.length > 0) {
      fetchStockForMaterials(materials.map(m => m.id))
    }
  }, [materials.length])

  return {
    materials,
    stockData,
    loading,
    error,
    fetchMaterials,
    fetchStockForMaterials,
    getTotalStock,
    getStockByWarehouse,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    getCategories,
  }
}
