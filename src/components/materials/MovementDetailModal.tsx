'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Package, Calendar, User, MapPin, FileText, CheckCircle, XCircle, Warehouse, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface MovementDetailModalProps {
    isOpen: boolean
    onClose: () => void
    movementId: number | null
    onUpdate?: () => void
}

export function MovementDetailModal({ isOpen, onClose, movementId, onUpdate }: MovementDetailModalProps) {
    const [movement, setMovement] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [activeTab, setActiveTab] = useState<'details' | 'tasks'>('details')
    const [taskAssignments, setTaskAssignments] = useState<any[]>([])
    const [loadingTasks, setLoadingTasks] = useState(false)

    useEffect(() => {
        if (isOpen && movementId) {
            setActiveTab('details')
            loadMovementDetails()
            loadTaskAssignments()
        }
    }, [isOpen, movementId])

    const loadMovementDetails = async () => {
        if (!movementId) return

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('material_movements')
                .select(`
          *,
          materials (
            name,
            unit,
            category
          ),
          warehouses (
            name,
            code
          ),
          projects (
            name
          ),
          workers (
            full_name
          ),
          user_profiles!material_movements_delivered_by_fkey (
            full_name
          )
        `)
                .eq('id', movementId)
                .single()

            if (error) throw error
            setMovement(data)
        } catch (err: any) {
            console.error('Error loading movement details:', err)
            toast.error('Error al cargar detalles del movimiento')
        } finally {
            setLoading(false)
        }
    }

    const loadTaskAssignments = async () => {
        if (!movementId) return

        setLoadingTasks(true)
        console.log('Loading assignments for movement:', movementId)
        try {
            // 1. Get the assignment materials
            const { data: materialsData, error: materialsError } = await supabase
                .from('task_assignment_materials')
                .select('id, task_assignment_id, notes')
                .eq('delivery_id', movementId)

            if (materialsError) {
                console.error('Supabase error loading assignment materials:', materialsError)
                throw materialsError
            }

            if (!materialsData || materialsData.length === 0) {
                console.log('No task assignments found for this delivery')
                setTaskAssignments([])
                return
            }

            console.log('Found assignment materials:', materialsData)

            const assignmentIds = materialsData.map(m => m.task_assignment_id)

            // 2. Get task_assignments with worker info
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from('task_assignments')
                .select(`
                    id,
                    task_id,
                    worker_id,
                    assignment_status,
                    workers (
                        full_name
                    )
                `)
                .in('id', assignmentIds)

            if (assignmentsError) {
                console.error('Supabase error loading assignments:', assignmentsError)
                throw assignmentsError
            }

            console.log('Loaded task assignments:', assignmentsData)

            // 3. Get unique task IDs and fetch task details
            // IMPORTANT: tasks table ONLY has apartment_id, NO project_id/tower_id/floor_id
            const taskIds = [...new Set(assignmentsData?.map(a => a.task_id).filter(Boolean))] as number[]

            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select('id, task_name, task_description, status, priority, apartment_id')
                .in('id', taskIds)

            if (tasksError) {
                console.error('Supabase error loading tasks:', tasksError)
                throw tasksError
            }

            console.log('Loaded tasks:', tasksData)

            // 4. Fetch location hierarchy via apartments
            const apartmentIds = [...new Set(tasksData?.map(t => t.apartment_id).filter(Boolean))] as number[]

            let apartmentsMap = new Map()

            if (apartmentIds.length > 0) {
                const { data: aptData, error: aptError } = await supabase
                    .from('apartments')
                    .select(`
                        id,
                        apartment_number,
                        floors (
                            id,
                            floor_number,
                            towers (
                                id,
                                tower_number,
                                projects (
                                    id,
                                    name
                                )
                            )
                        )
                    `)
                    .in('id', apartmentIds)

                if (aptError) {
                    console.error('Error loading apartments hierarchy:', aptError)
                } else if (aptData) {
                    apartmentsMap = new Map(aptData.map(a => [a.id, a]))
                }
            }

            // 5. Merge everything together
            const finalAssignments = materialsData.map(material => {
                const assignment = assignmentsData?.find(a => a.id === material.task_assignment_id)
                if (assignment) {
                    const task = tasksData?.find(t => t.id === assignment.task_id)
                    if (task) {
                        // Resolve hierarchy
                        let project = null
                        let tower = null
                        let floor = null

                        if (task.apartment_id && apartmentsMap.has(task.apartment_id)) {
                            const apt = apartmentsMap.get(task.apartment_id)
                            if (apt.floors) {
                                floor = apt.floors
                                if (apt.floors.towers) {
                                    tower = apt.floors.towers
                                    if (apt.floors.towers.projects) {
                                        project = apt.floors.towers.projects
                                    }
                                }
                            }
                        }

                        const enrichedTask = {
                            ...task,
                            projects: project,
                            towers: tower,
                            floors: floor
                        }

                        return {
                            id: material.id,
                            notes: material.notes,
                            task_assignments: {
                                ...assignment,
                                tasks: enrichedTask
                            }
                        }
                    }
                }

                return {
                    id: material.id,
                    notes: material.notes,
                    task_assignments: assignment
                }
            })

            console.log('Final assignments with enriched data:', finalAssignments)
            setTaskAssignments(finalAssignments)
        } catch (err: any) {
            console.error('Error loading task assignments:', err)
        } finally {
            setLoadingTasks(false)
        }
    }

    const handleToggleUsed = async () => {
        if (!movement || movement.movement_type !== 'entrega') return

        setUpdating(true)
        console.log('Toggling used status for movement:', movementId)
        try {
            const newConsumedValue = !movement.consumed

            // Get user safely
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError) console.error('Error getting user:', userError)

            const userId = user?.id || null
            console.log('User ID for update:', userId)

            const updatePayload = {
                consumed: newConsumedValue,
                consumed_at: newConsumedValue ? new Date().toISOString() : null,
                consumed_by: newConsumedValue ? userId : null
            }

            console.log('Sending update payload:', updatePayload)

            const { data, error } = await supabase
                .from('material_movements')
                .update(updatePayload)
                .eq('id', movementId)
                .select() // Add select to verify the return

            if (error) {
                console.error('Supabase update error:', error)
                throw error
            }

            console.log('Update successful, returned data:', data)

            toast.success(newConsumedValue ? 'Marcado como usado' : 'Marcado como disponible')
            await loadMovementDetails() // Wait for reload
            onUpdate?.() // Notify parent
        } catch (err: any) {
            console.error('Error updating consumed status:', err)
            // Show more specific error message if available
            toast.error(`Error: ${err.message || 'Error al actualizar estado'}`)
        } finally {
            setUpdating(false)
        }
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const getMovementTypeLabel = (type: string) => {
        const types: Record<string, { label: string; color: string }> = {
            ingreso: { label: 'Ingreso', color: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' },
            entrega: { label: 'Entrega', color: 'bg-red-900/30 text-red-400 border-red-800/50' },
            ajuste_negativo: { label: 'Ajuste Negativo', color: 'bg-orange-900/30 text-orange-400 border-orange-800/50' }
        }
        return types[type] || types.ingreso
    }

    const getStatusBadge = (status: string) => {
        const statuses: Record<string, { label: string; color: string }> = {
            pending: { label: 'Pendiente', color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50' },
            in_progress: { label: 'En Progreso', color: 'bg-blue-900/30 text-blue-400 border-blue-800/50' },
            completed: { label: 'Completada', color: 'bg-green-900/30 text-green-400 border-green-800/50' },
            cancelled: { label: 'Cancelada', color: 'bg-red-900/30 text-red-400 border-red-800/50' }
        }
        return statuses[status] || statuses.pending
    }

    if (!movement && !loading) return null

    const typeInfo = movement ? getMovementTypeLabel(movement.movement_type) : null
    const isDelivery = movement?.movement_type === 'entrega'

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalles del Movimiento" size="lg">
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : movement ? (
                <div className="space-y-6">
                    {/* Header Section */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                <Package className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100">
                                    {movement.materials?.name || 'Material desconocido'}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    {movement.materials?.category || 'Sin categoría'}
                                </p>
                            </div>
                        </div>
                        {typeInfo && (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${typeInfo.color}`}>
                                {typeInfo.label}
                            </span>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-slate-700">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details'
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                Detalles
                            </button>
                            {isDelivery && (
                                <button
                                    onClick={() => setActiveTab('tasks')}
                                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'tasks'
                                        ? 'border-blue-500 text-blue-400'
                                        : 'border-transparent text-slate-400 hover:text-slate-300'
                                        }`}
                                >
                                    <ClipboardList className="w-4 h-4" />
                                    Tareas Asignadas ({taskAssignments.length})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'details' ? (
                        <div className="space-y-6">
                            {/* Main Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Cantidad */}
                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package className="w-4 h-4 text-slate-400" />
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cantidad</label>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-100">
                                        {movement.movement_type === 'ingreso' ? '+' : '-'}
                                        {Number(movement.quantity).toLocaleString()} {movement.materials?.unit || 'unidad'}
                                    </p>
                                </div>

                                {/* Fecha */}
                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Fecha</label>
                                    </div>
                                    <p className="text-sm font-medium text-slate-100">
                                        {formatDate(movement.created_at)}
                                    </p>
                                </div>

                                {/* Stock Before/After */}
                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Stock Anterior</label>
                                    <p className="text-lg font-semibold text-slate-100">
                                        {Number(movement.stock_before).toLocaleString()}
                                    </p>
                                </div>

                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Stock Posterior</label>
                                    <p className="text-lg font-semibold text-slate-100">
                                        {Number(movement.stock_after).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Additional Details */}
                            <div className="space-y-3">
                                {movement.warehouses && (
                                    <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                                        <Warehouse className="w-5 h-5 text-slate-400 mt-0.5" />
                                        <div className="flex-1">
                                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Almacén</label>
                                            <p className="text-sm font-medium text-slate-100 mt-1">
                                                {movement.warehouses.name} {movement.warehouses.code && `(${movement.warehouses.code})`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {movement.projects && (
                                    <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                                        <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                                        <div className="flex-1">
                                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Proyecto</label>
                                            <p className="text-sm font-medium text-slate-100 mt-1">{movement.projects.name}</p>
                                        </div>
                                    </div>
                                )}

                                {movement.workers && (
                                    <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                                        <User className="w-5 h-5 text-slate-400 mt-0.5" />
                                        <div className="flex-1">
                                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Trabajador</label>
                                            <p className="text-sm font-medium text-slate-100 mt-1">{movement.workers.full_name}</p>
                                        </div>
                                    </div>
                                )}

                                {movement.user_profiles && (
                                    <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                                        <User className="w-5 h-5 text-slate-400 mt-0.5" />
                                        <div className="flex-1">
                                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Entregado por</label>
                                            <p className="text-sm font-medium text-slate-100 mt-1">{movement.user_profiles.full_name}</p>
                                        </div>
                                    </div>
                                )}

                                {(movement.unit_cost || movement.total_cost) && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {movement.unit_cost && (
                                            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Costo Unitario</label>
                                                <p className="text-sm font-medium text-slate-100 mt-1">
                                                    {formatCurrency(Number(movement.unit_cost))}
                                                </p>
                                            </div>
                                        )}
                                        {movement.total_cost && (
                                            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Costo Total</label>
                                                <p className="text-sm font-medium text-slate-100 mt-1">
                                                    {formatCurrency(Number(movement.total_cost))}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(movement.notes || movement.reason) && (
                                    <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                                        <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                                        <div className="flex-1">
                                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                                {movement.notes ? 'Notas' : 'Razón'}
                                            </label>
                                            <p className="text-sm text-slate-300 mt-1 italic">
                                                "{movement.notes || movement.reason}"
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Used Status Section (Only for deliveries) */}
                            {isDelivery && (
                                <div className="border-t border-slate-700 pt-6">
                                    <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {movement.consumed ? (
                                                <CheckCircle className="w-6 h-6 text-yellow-400" />
                                            ) : (
                                                <XCircle className="w-6 h-6 text-slate-500" />
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-slate-100">
                                                    Estado: {movement.consumed ? 'Usado' : 'Disponible'}
                                                </p>
                                                {movement.consumed && movement.consumed_at && (
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        Marcado como usado el {formatDate(movement.consumed_at)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleToggleUsed}
                                            disabled={updating}
                                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${movement.consumed
                                                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                                                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {updating ? 'Actualizando...' : movement.consumed ? 'Marcar como Disponible' : 'Marcar como Usado'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Tasks Tab
                        <div className="space-y-4">
                            {loadingTasks ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                </div>
                            ) : taskAssignments.length > 0 ? (
                                taskAssignments.map((assignment: any) => {
                                    const task = assignment.task_assignments?.tasks
                                    const worker = assignment.task_assignments?.workers
                                    const statusInfo = task ? getStatusBadge(task.status) : null

                                    return (
                                        <div key={assignment.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-semibold text-slate-100 mb-1">
                                                        {task?.task_name || 'Tarea sin nombre'}
                                                    </h4>
                                                    {task?.task_description && (
                                                        <p className="text-xs text-slate-400 line-clamp-2">{task.task_description}</p>
                                                    )}
                                                </div>
                                                {statusInfo && (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusInfo.color} ml-2`}>
                                                        {statusInfo.label}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                {task?.projects && (
                                                    <div>
                                                        <span className="text-slate-500">Proyecto:</span>
                                                        <p className="text-slate-300 font-medium">{task.projects.name}</p>
                                                    </div>
                                                )}
                                                {worker && (
                                                    <div>
                                                        <span className="text-slate-500">Trabajador:</span>
                                                        <p className="text-slate-300 font-medium">{worker.full_name}</p>
                                                    </div>
                                                )}
                                                {task?.towers && (
                                                    <div>
                                                        <span className="text-slate-500">Torre:</span>
                                                        <p className="text-slate-300 font-medium">Torre {task.towers.tower_number}</p>
                                                    </div>
                                                )}
                                                {task?.floors && (
                                                    <div>
                                                        <span className="text-slate-500">Piso:</span>
                                                        <p className="text-slate-300 font-medium">Piso {task.floors.floor_number}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {assignment.notes && (
                                                <div className="mt-3 pt-3 border-t border-slate-700/50">
                                                    <p className="text-xs text-slate-400 italic">"{assignment.notes}"</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center py-12">
                                    <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400">Este material no ha sido asignado a ninguna tarea</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : null}
        </Modal>
    )
}
