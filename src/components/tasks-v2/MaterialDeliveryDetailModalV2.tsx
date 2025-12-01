'use client'

import { useState, useEffect } from 'react'
import { ModalV2 } from './ModalV2'
import { supabase } from '@/lib/supabase'
import { Package, User, Building2, Calendar, DollarSign, FileText, Warehouse } from 'lucide-react'

interface MaterialDeliveryDetailModalV2Props {
  isOpen: boolean
  onClose: () => void
  deliveryId: number
}

interface DeliveryDetails {
  id: number
  material_id: number
  material_name: string
  material_category: string
  material_unit: string
  warehouse_id: number
  warehouse_name: string
  quantity: number
  unit_cost: number
  total_cost: number
  stock_before: number
  stock_after: number
  project_id: number | null
  project_name: string | null
  worker_id: number | null
  worker_name: string | null
  delivered_by: string | null
  delivered_by_name: string | null
  reason: string | null
  notes: string | null
  created_at: string
}

export function MaterialDeliveryDetailModalV2({ 
  isOpen, 
  onClose, 
  deliveryId 
}: MaterialDeliveryDetailModalV2Props) {
  const [delivery, setDelivery] = useState<DeliveryDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && deliveryId) {
      loadDeliveryDetails()
    } else {
      setDelivery(null)
      setLoading(true)
    }
  }, [isOpen, deliveryId])

  const loadDeliveryDetails = async () => {
    if (!deliveryId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('material_movements')
        .select(`
          id,
          material_id,
          quantity,
          unit_cost,
          total_cost,
          stock_before,
          stock_after,
          project_id,
          worker_id,
          delivered_by,
          reason,
          notes,
          created_at,
          materials!inner(
            name,
            category,
            unit,
            unit_cost
          ),
          warehouses!inner(
            id,
            name
          ),
          projects(
            name
          ),
          workers(
            full_name
          ),
          user_profiles!delivered_by(
            full_name
          )
        `)
        .eq('id', deliveryId)
        .eq('movement_type', 'entrega')
        .single()

      if (error) throw error

      if (data) {
        // Si los costos no están guardados en el movimiento, obtenerlos del material
        const materialUnitCost = Number(Array.isArray(data.materials) && data.materials.length > 0 ? data.materials[0]?.unit_cost : 0)
        const movementUnitCost = data.unit_cost ? Number(data.unit_cost) : null
        const movementTotalCost = data.total_cost ? Number(data.total_cost) : null
        
        // Usar el costo del movimiento si existe, sino usar el del material
        const finalUnitCost = movementUnitCost ?? materialUnitCost
        const quantity = Number(data.quantity || 0)
        // Calcular total_cost si no está guardado
        const finalTotalCost = movementTotalCost ?? (finalUnitCost * quantity)

        setDelivery({
          id: data.id,
          material_id: data.material_id,
          material_name: (Array.isArray(data.materials) && data.materials.length > 0 ? data.materials[0]?.name : null) || 'Material desconocido',
          material_category: (Array.isArray(data.materials) && data.materials.length > 0 ? data.materials[0]?.category : null) || 'Sin categoría',
          material_unit: (Array.isArray(data.materials) && data.materials.length > 0 ? data.materials[0]?.unit : null) || 'unidad',
          warehouse_id: (data as any).warehouse_id || (Array.isArray(data.warehouses) && data.warehouses.length > 0 ? (data.warehouses[0] as any)?.id : null),
          warehouse_name: (Array.isArray(data.warehouses) && data.warehouses.length > 0 ? (data.warehouses[0] as any)?.name : null) || 'Almacén desconocido',
          quantity: quantity,
          unit_cost: finalUnitCost,
          total_cost: finalTotalCost,
          stock_before: Number(data.stock_before || 0),
          stock_after: Number(data.stock_after || 0),
          project_id: data.project_id,
          project_name: (Array.isArray(data.projects) && data.projects.length > 0 ? (data.projects[0] as any)?.name : (data.projects as any)?.name) || null,
          worker_id: data.worker_id,
          worker_name: (Array.isArray(data.workers) && data.workers.length > 0 ? (data.workers[0] as any)?.full_name : (data.workers as any)?.full_name) || null,
          delivered_by: data.delivered_by,
          delivered_by_name: (Array.isArray(data.user_profiles) && data.user_profiles.length > 0 ? (data.user_profiles[0] as any)?.full_name : (data.user_profiles as any)?.full_name) || null,
          reason: data.reason || null,
          notes: data.notes || null,
          created_at: data.created_at
        })
      }
    } catch (err: any) {
      console.error('Error loading delivery details:', err)
      setDelivery(null)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Sin fecha'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title="Detalles de Entrega de Material"
      size="lg"
    >
      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Cargando detalles...</p>
        </div>
      ) : !delivery ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No se encontraron detalles de la entrega</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Información Principal - Grid 3 Columnas */}
          <div className="grid grid-cols-3 gap-4">
            {/* Entrega ID */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
              <label className="block text-xs font-medium text-slate-400 mb-1">ID de Entrega</label>
              <p className="text-lg font-semibold text-slate-100">#{delivery.id}</p>
            </div>

            {/* Fecha */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Fecha y Hora
              </label>
              <p className="text-sm text-slate-100">{formatDate(delivery.created_at)}</p>
            </div>

            {/* Tipo de Movimiento */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
              <label className="block text-xs font-medium text-slate-400 mb-1">Tipo</label>
              <p className="text-sm font-medium text-blue-400">Entrega</p>
            </div>
          </div>

          {/* Material - Grid 3 Columnas */}
          <div className="grid grid-cols-3 gap-4">
            {/* Nombre del Material */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Package className="w-3 h-3" />
                Material
              </label>
              <p className="text-sm font-semibold text-slate-100">{delivery.material_name}</p>
              <p className="text-xs text-slate-400 mt-1">{delivery.material_category}</p>
            </div>

            {/* Cantidad */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
              <label className="block text-xs font-medium text-slate-400 mb-1">Cantidad</label>
              <p className="text-sm font-semibold text-slate-100">
                {delivery.quantity} {delivery.material_unit}
              </p>
            </div>

            {/* Almacén */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Warehouse className="w-3 h-3" />
                Almacén
              </label>
              <p className="text-sm text-slate-100">{delivery.warehouse_name}</p>
            </div>
          </div>

          {/* Costos - Grid 3 Columnas */}
          <div className="grid grid-cols-3 gap-4">
            {/* Costo Unitario */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Costo Unitario
              </label>
              <p className="text-sm text-slate-100">{formatCurrency(delivery.unit_cost)}</p>
            </div>

            {/* Costo Total */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
              <label className="block text-xs font-medium text-slate-400 mb-1">Costo Total</label>
              <p className="text-lg font-semibold text-green-400">{formatCurrency(delivery.total_cost)}</p>
            </div>

            {/* Stock */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
              <label className="block text-xs font-medium text-slate-400 mb-1">Stock</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Antes:</span>
                <span className="text-sm text-slate-300">{delivery.stock_before}</span>
                <span className="text-xs text-slate-400">→</span>
                <span className="text-xs text-slate-400">Después:</span>
                <span className="text-sm font-semibold text-slate-100">{delivery.stock_after}</span>
              </div>
            </div>
          </div>

          {/* Proyecto y Trabajador - Grid 3 Columnas */}
          <div className="grid grid-cols-3 gap-4">
            {/* Proyecto */}
            {delivery.project_name ? (
              <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Proyecto
                </label>
                <p className="text-sm text-slate-100">{delivery.project_name}</p>
              </div>
            ) : (
              <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                <label className="block text-xs font-medium text-slate-400 mb-1">Proyecto</label>
                <p className="text-sm text-slate-500">No asociado</p>
              </div>
            )}

            {/* Trabajador */}
            {delivery.worker_name ? (
              <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Entregado a
                </label>
                <p className="text-sm text-slate-100">{delivery.worker_name}</p>
              </div>
            ) : (
              <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                <label className="block text-xs font-medium text-slate-400 mb-1">Entregado a</label>
                <p className="text-sm text-slate-500">No especificado</p>
              </div>
            )}

            {/* Entregado por */}
            {delivery.delivered_by_name ? (
              <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                <label className="block text-xs font-medium text-slate-400 mb-1">Entregado por</label>
                <p className="text-sm text-slate-100">{delivery.delivered_by_name}</p>
              </div>
            ) : (
              <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                <label className="block text-xs font-medium text-slate-400 mb-1">Entregado por</label>
                <p className="text-sm text-slate-500">No especificado</p>
              </div>
            )}
          </div>

          {/* Razón y Notas - Grid 3 Columnas */}
          {(delivery.reason || delivery.notes) && (
            <div className="grid grid-cols-3 gap-4">
              {delivery.reason && (
                <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Razón</label>
                  <p className="text-sm text-slate-100">{delivery.reason}</p>
                </div>
              )}
              {delivery.notes && (
                <div className={`bg-slate-700 border border-slate-600 rounded-lg p-4 ${delivery.reason ? 'col-span-2' : 'col-span-3'}`}>
                  <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Notas
                  </label>
                  <p className="text-sm text-slate-100 whitespace-pre-wrap">{delivery.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Botón Cerrar */}
          <div className="flex justify-end pt-4 border-t border-slate-600">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-slate-100 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </ModalV2>
  )
}

