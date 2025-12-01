'use client'

import { useState, useEffect } from 'react'
import { ModalV2 } from './ModalV2'
import { supabase } from '@/lib/supabase'
import { Package, User, Search, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

interface AssociateMaterialDeliveryModalV2Props {
  isOpen: boolean
  onClose: () => void
  task: any
  onSuccess?: () => void
}

interface TaskAssignment {
  id: number
  worker_id: number
  worker_name: string
  assignment_status: string
}

interface MaterialDelivery {
  id: number
  material_id: number
  material_name: string
  quantity: number
  unit: string
  worker_id: number | null
  worker_name: string | null
  project_id: number | null
  project_name: string | null
  created_at: string
  unit_cost: number | null
  total_cost: number | null
}

export function AssociateMaterialDeliveryModalV2({
  isOpen,
  onClose,
  task,
  onSuccess
}: AssociateMaterialDeliveryModalV2Props) {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [deliveries, setDeliveries] = useState<MaterialDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null)
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterWorkerId, setFilterWorkerId] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen && task?.id) {
      loadData()
    } else {
      // Reset state when modal closes
      setAssignments([])
      setDeliveries([])
      setSelectedAssignmentId(null)
      setSelectedDeliveryId(null)
      setSearchTerm('')
      setFilterWorkerId(null)
    }
  }, [isOpen, task?.id])

  const loadData = async () => {
    if (!task?.id) return

    setLoading(true)
    try {
      // Load task assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select(`
          id,
          worker_id,
          assignment_status,
          workers!inner(
            full_name
          )
        `)
        .eq('task_id', task.id)
        .eq('is_deleted', false)

      if (assignmentsError) throw assignmentsError

      const formattedAssignments: TaskAssignment[] = (assignmentsData || []).map((a: any) => ({
        id: a.id,
        worker_id: a.worker_id,
        worker_name: a.workers?.full_name || 'Sin nombre',
        assignment_status: a.assignment_status
      }))

      setAssignments(formattedAssignments)

      // Load available deliveries (from project or assigned workers)
      await loadDeliveries(formattedAssignments)

    } catch (err: any) {
      console.error('Error loading data:', err)
      toast.error(`Error al cargar datos: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadDeliveries = async (taskAssignments: TaskAssignment[]) => {
    try {
      // Get project_id from task (apartment -> floor -> tower -> project)
      const { data: apartmentData, error: apartmentError } = await supabase
        .from('apartments')
        .select(`
          id,
          floor_id,
          floors!inner(
            id,
            tower_id,
            towers!inner(
              id,
              project_id
            )
          )
        `)
        .eq('id', task.apartment_id)
        .single()

      if (apartmentError) {
        console.error('Error loading apartment:', apartmentError)
      }

      const projectId = (apartmentData as any)?.floors?.towers?.project_id

      // Build query for deliveries
      let query = supabase
        .from('material_movements')
        .select(`
          id,
          material_id,
          quantity,
          unit_cost,
          total_cost,
          worker_id,
          project_id,
          created_at,
          materials!inner(
            name,
            unit,
            unit_cost
          ),
          workers(
            full_name
          ),
          projects(
            name
          )
        `)
        .eq('movement_type', 'entrega')
        .order('created_at', { ascending: false })
        .limit(50)

      // Filter by project if available
      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      // If no project, filter by assigned workers
      if (!projectId && taskAssignments.length > 0) {
        const workerIds = taskAssignments.map(a => a.worker_id)
        query = query.in('worker_id', workerIds)
      }

      const { data, error } = await query

      if (error) throw error

      // Format deliveries
      const formattedDeliveries: MaterialDelivery[] = (data || []).map((d: any) => {
        const materialUnitCost = Number(d.materials?.unit_cost || 0)
        const movementUnitCost = d.unit_cost ? Number(d.unit_cost) : null
        const movementTotalCost = d.total_cost ? Number(d.total_cost) : null
        
        const finalUnitCost = movementUnitCost ?? materialUnitCost
        const quantity = Number(d.quantity || 0)
        const finalTotalCost = movementTotalCost ?? (finalUnitCost * quantity)

        return {
          id: d.id,
          material_id: d.material_id,
          material_name: d.materials?.name || 'Material desconocido',
          quantity: quantity,
          unit: d.materials?.unit || 'unidad',
          worker_id: d.worker_id,
          worker_name: d.workers?.full_name || null,
          project_id: d.project_id,
          project_name: d.projects?.name || null,
          created_at: d.created_at,
          unit_cost: finalUnitCost,
          total_cost: finalTotalCost
        }
      })

      setDeliveries(formattedDeliveries)
    } catch (err: any) {
      console.error('Error loading deliveries:', err)
      toast.error(`Error al cargar entregas: ${err.message}`)
    }
  }

  const handleSubmit = async () => {
    if (!selectedAssignmentId || !selectedDeliveryId) {
      toast.error('Debes seleccionar un trabajador y una entrega')
      return
    }

    setSubmitting(true)
    try {
      // Check if this delivery is already associated with this assignment
      const { data: existing, error: checkError } = await supabase
        .from('task_assignment_materials')
        .select('id')
        .eq('task_assignment_id', selectedAssignmentId)
        .eq('delivery_id', selectedDeliveryId)
        .limit(1)

      if (checkError) throw checkError

      if (existing && existing.length > 0) {
        toast.error('Esta entrega ya está asociada a este trabajador')
        setSubmitting(false)
        return
      }

      // Create association
      const { error: insertError } = await supabase
        .from('task_assignment_materials')
        .insert({
          task_assignment_id: selectedAssignmentId,
          delivery_id: selectedDeliveryId
        })

      if (insertError) throw insertError

      toast.success('Entrega asociada exitosamente')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      console.error('Error associating delivery:', err)
      toast.error(`Error al asociar entrega: ${err.message}`)
    } finally {
      setSubmitting(false)
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0'
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Filter deliveries by search term and worker
  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = searchTerm === '' || 
      delivery.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (delivery.worker_name && delivery.worker_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesWorker = filterWorkerId === null || delivery.worker_id === filterWorkerId

    return matchesSearch && matchesWorker
  })

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title="Asociar Entrega de Material"
      size="xl"
    >
      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Cargando datos...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selección de Trabajador */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Selecciona el Trabajador
            </label>
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-700 border border-slate-600 rounded-lg p-4">
                Esta tarea no tiene trabajadores asignados. Primero asigna trabajadores a la tarea.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {assignments.map(assignment => (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => {
                      setSelectedAssignmentId(assignment.id)
                      setFilterWorkerId(assignment.worker_id)
                    }}
                    className={`p-4 border rounded-lg transition-colors text-left ${
                      selectedAssignmentId === assignment.id
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{assignment.worker_name}</span>
                    </div>
                    <span className="text-xs opacity-75">
                      Estado: {assignment.assignment_status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selección de Entrega */}
          {selectedAssignmentId && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Selecciona la Entrega de Material
              </label>

              {/* Filtros */}
              <div className="mb-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por material o trabajador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterWorkerId(null)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      filterWorkerId === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Todas las entregas
                  </button>
                  {assignments.map(assignment => (
                    <button
                      key={assignment.id}
                      type="button"
                      onClick={() => setFilterWorkerId(assignment.worker_id)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        filterWorkerId === assignment.worker_id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {assignment.worker_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de Entregas */}
              {filteredDeliveries.length === 0 ? (
                <p className="text-sm text-slate-400 bg-slate-700 border border-slate-600 rounded-lg p-4">
                  No hay entregas disponibles para mostrar
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredDeliveries.map(delivery => (
                    <button
                      key={delivery.id}
                      type="button"
                      onClick={() => setSelectedDeliveryId(delivery.id)}
                      className={`w-full p-4 border rounded-lg transition-colors text-left ${
                        selectedDeliveryId === delivery.id
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span className="font-medium">{delivery.material_name}</span>
                        </div>
                        <span className="text-xs opacity-75">#{delivery.id}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="opacity-75">Cantidad:</span>
                          <span className="ml-1 font-medium">
                            {delivery.quantity} {delivery.unit}
                          </span>
                        </div>
                        <div>
                          <span className="opacity-75">Costo:</span>
                          <span className="ml-1 font-medium">
                            {formatCurrency(delivery.total_cost)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 opacity-75" />
                          <span className="opacity-75">{formatDate(delivery.created_at)}</span>
                        </div>
                      </div>
                      {delivery.worker_name && (
                        <div className="mt-2 text-xs opacity-75">
                          <User className="w-3 h-3 inline mr-1" />
                          {delivery.worker_name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-600">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2 text-sm font-medium text-slate-100 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedAssignmentId || !selectedDeliveryId || submitting}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Asociando...' : 'Asociar Entrega'}
            </button>
          </div>
        </div>
      )}
    </ModalV2>
  )
}

