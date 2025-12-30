'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, Eye, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MaterialDeliveryDetailModalV2 } from './MaterialDeliveryDetailModalV2'
import { AssociateMaterialDeliveryModalV2 } from './AssociateMaterialDeliveryModalV2'
import { ConfirmModalV2 } from './ConfirmModalV2'
import toast from 'react-hot-toast'

interface TaskMaterialsContentProps {
  task?: any
}

interface MaterialDelivery {
  id: number // ID de la asociación o ID negativo/virtual si no está asociada
  delivery_id: number
  task_assignment_id: number | null
  material_name: string
  quantity: number
  unit: string
  unit_cost: number
  total_cost: number
  worker_name: string
  date: string
  notes?: string
  is_linked: boolean
  consumed: boolean // Nuevo campo agregado explícitamente
}

export function TaskMaterialsContent({ task }: TaskMaterialsContentProps) {
  const [materials, setMaterials] = useState<MaterialDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(null)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [showAssociateModal, setShowAssociateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<number | null>(null)

  useEffect(() => {
    if (task?.id) {
      loadMaterials()
    } else {
      setLoading(false)
    }
  }, [task?.id])

  const loadMaterials = async () => {
    if (!task?.id) return

    setLoading(true)
    try {
      // 1. Obtener trabajadores asignados a esta tarea
      const { data: assignments, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select('id, worker_id')
        .eq('task_id', task.id)
        .eq('is_deleted', false)

      if (assignmentsError) throw assignmentsError

      if (!assignments || assignments.length === 0) {
        setMaterials([])
        setLoading(false)
        return
      }

      const workerIds = assignments.map(a => a.worker_id)
      const assignmentMap = new Map(assignments.map(a => [a.worker_id, a.id]))

      // 2. Obtener TODAS las entregas de materiales a estos trabajadores (últimas 50)
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('material_movements')
        .select(`
          id,
          material_id,
          quantity,
          unit_cost,
          total_cost,
          worker_id,
          consumed,
          movement_type,
          created_at,
          materials!inner(
            name,
            unit,
            unit_cost
          ),
          workers(
            full_name
          )
        `)
        .in('worker_id', workerIds)
        .eq('movement_type', 'entrega')
        .order('created_at', { ascending: false })
        .limit(50)

      if (deliveriesError) throw deliveriesError

      // 3. Obtener asociaciones explícitas existentes
      const { data: associations, error: associationsError } = await supabase
        .from('task_assignment_materials')
        .select('id, delivery_id, task_assignment_id, notes')
        .in('task_assignment_id', assignments.map(a => a.id))

      if (associationsError) throw associationsError

      const associationMap = new Map() // delivery_id -> association object
      associations?.forEach(assoc => {
        associationMap.set(assoc.delivery_id, assoc)
      })

      // 4. Combinar datos
      const materialsData: MaterialDelivery[] = (deliveries || []).map(delivery => {
        const association = associationMap.get(delivery.id)
        const isLinked = !!association

        const materialData = Array.isArray(delivery.materials) ? delivery.materials[0] : delivery.materials

        // Si los costos no están guardados en el movimiento, obtenerlos del material
        const materialUnitCost = Number(materialData?.unit_cost || 0)
        const movementUnitCost = delivery.unit_cost ? Number(delivery.unit_cost) : null
        const movementTotalCost = delivery.total_cost ? Number(delivery.total_cost) : null

        const finalUnitCost = movementUnitCost ?? materialUnitCost
        const quantity = Number(delivery.quantity || 0)
        const finalTotalCost = movementTotalCost ?? (finalUnitCost * quantity)

        return {
          id: association ? association.id : -delivery.id, // Si no está asociado, usamos ID negativo del delivery para key única
          delivery_id: delivery.id,
          task_assignment_id: association ? association.task_assignment_id : (assignmentMap.get(delivery.worker_id) || null),
          material_name: materialData?.name || 'Material desconocido',
          quantity: quantity,
          unit: materialData?.unit || 'unidad',
          unit_cost: finalUnitCost,
          total_cost: finalTotalCost,
          worker_name: (Array.isArray(delivery.workers) && delivery.workers.length > 0 ? delivery.workers[0]?.full_name : (delivery.workers as any)?.full_name) || 'Sin nombre',
          date: delivery.created_at,
          notes: association?.notes,
          is_linked: isLinked,
          consumed: delivery.consumed || false
        }
      })

      // 5. FILTRAR para mostrar SOLO materiales explícitamente asociados
      const linkedMaterials = materialsData.filter(m => m.is_linked)

      setMaterials(linkedMaterials)
    } catch (err: any) {
      console.error('Error loading materials:', err)
      toast.error(`Error al cargar materiales: ${err.message}`)
      setMaterials([])
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsUsed = async (deliveryId: number) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      const { error } = await supabase
        .from('material_movements')
        .update({
          consumed: true,
          consumed_at: new Date().toISOString(),
          consumed_by: user?.id
        })
        .eq('id', deliveryId)

      if (error) throw error

      toast.success('Material marcado como usado')
      loadMaterials() // Recargar para actualizar UI
    } catch (err: any) {
      console.error('Error marking as used:', err)
      toast.error('Error al actualizar estado')
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Sin fecha'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cargando materiales...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-gray-600">
          Tarea: <span className="font-medium">{task?.task_name || 'Sin nombre'}</span>
        </p>
        <button
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          onClick={() => {
            setShowAssociateModal(true)
          }}
        >
          <Plus className="w-4 h-4" />
          Asociar Entrega de Material
        </button>
      </div>

      {/* Materiales Asociados - Grid 3 Columnas */}
      {materials.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Materiales Asociados ({materials.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((material) => (
              <div key={material.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative">
                {material.consumed && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Usado
                    </span>
                  </div>
                )}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-blue-600">Entrega #{material.delivery_id}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{formatDate(material.date)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Material</label>
                    <p className="text-sm font-medium text-gray-900">{material.material_name}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                    <p className="text-sm text-gray-700">
                      {material.quantity} {material.unit}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Costo Unitario</label>
                    <p className="text-sm text-gray-700">{formatCurrency(material.unit_cost)}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Costo Total</label>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(material.total_cost)}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Entregado a</label>
                    <p className="text-sm text-gray-700">{material.worker_name}</p>
                  </div>
                  {material.notes && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Notas</label>
                      <p className="text-sm text-gray-600">{material.notes}</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  {/* Mark as Used Button - Only if not consumed */}
                  {!material.consumed && (
                    <button
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                      onClick={() => handleMarkAsUsed(material.delivery_id)}
                    >
                      Marcar Usado
                    </button>
                  )}

                  <button
                    className={`${!material.consumed ? 'flex-1' : 'w-full'} flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors`}
                    onClick={() => {
                      setSelectedDeliveryId(material.delivery_id)
                      setShowDeliveryModal(true)
                    }}
                  >
                    <Eye className="w-3 h-3" />
                    {!material.consumed ? 'Detalles' : 'Ver Detalles'}
                  </button>

                  {material.is_linked && (
                    <button
                      className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                      onClick={() => {
                        setMaterialToDelete(material.id)
                        setShowDeleteConfirm(true)
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No hay materiales asociados a esta tarea</p>
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            onClick={() => {
              setShowAssociateModal(true)
            }}
          >
            Asociar Primera Entrega
          </button>
        </div>
      )}

      {/* Nota Informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-800">
          <strong>Nota:</strong> Los materiales se asocian mediante entregas registradas en el sistema de inventario.
          Para asociar un material, selecciona una entrega existente.
        </p>
      </div>

      {/* Modal de Detalles de Entrega */}
      {selectedDeliveryId && (
        <MaterialDeliveryDetailModalV2
          isOpen={showDeliveryModal}
          onClose={() => {
            setShowDeliveryModal(false)
            setSelectedDeliveryId(null)
          }}
          deliveryId={selectedDeliveryId}
        />
      )}

      {/* Modal de Asociar Entrega */}
      <AssociateMaterialDeliveryModalV2
        isOpen={showAssociateModal}
        onClose={() => setShowAssociateModal(false)}
        task={task}
        onSuccess={() => {
          loadMaterials() // Recargar materiales después de asociar
        }}
      />

      {/* Modal de Confirmación de Desasociar Entrega */}
      <ConfirmModalV2
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setMaterialToDelete(null)
        }}
        onConfirm={async () => {
          if (materialToDelete === null) return

          try {
            const { error } = await supabase
              .from('task_assignment_materials')
              .delete()
              .eq('id', materialToDelete)

            if (error) throw error

            toast.success('Entrega desasociada exitosamente')
            setShowDeleteConfirm(false)
            setMaterialToDelete(null)
            loadMaterials() // Recargar materiales
          } catch (err: any) {
            console.error('Error removing delivery:', err)
            toast.error(`Error al desasociar entrega: ${err.message}`)
          }
        }}
        title="Desasociar Entrega"
        message="¿Estás seguro de que quieres desasociar esta entrega de material? Esta acción no se puede deshacer."
        confirmText="Desasociar"
        cancelText="Cancelar"
        variant="warning"
      />
    </div>
  )
}
