'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ModalV2 } from './ModalV2'
import { useTasksV2 } from '@/hooks/useTasks_v2'
import { useWorkers } from '@/hooks/useWorkers'
import { useTowers } from '@/hooks/useTowers'
import { useFloors } from '@/hooks/useFloors'
import { useApartments } from '@/hooks/useApartments'
import { useTaskTemplates } from '@/hooks/useTaskTemplates'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Plus, AlertCircle, Calendar } from 'lucide-react'

interface TaskFormModalV2Props {
  isOpen: boolean
  onClose: () => void
  task?: any // TaskV2 type
  mode?: 'create' | 'edit'
  onSuccess?: () => void
  initialProjectId?: number
  initialTowerId?: number
  initialFloorId?: number
  initialApartmentId?: number | null
  isMassCreate?: boolean
  massCreateData?: {
    projectId: number
    towerId: number
  }
}

export function TaskFormModalV2({
  isOpen,
  onClose,
  task,
  mode = 'create',
  onSuccess,
  initialProjectId,
  initialTowerId,
  initialFloorId,
  initialApartmentId,
  isMassCreate,
  massCreateData
}: TaskFormModalV2Props) {
  const { projects, createTask, updateTask, assignWorkerToTask, removeWorkerFromTask, getWorkersForProject, refreshTasks } = useTasksV2()
  const { templates } = useTaskTemplates()

  // Form states
  const [formData, setFormData] = useState({
    task_name: '',
    task_category: '',
    priority: 'medium',
    task_description: '',
    estimated_hours: '',
    project_id: '',
    tower_id: '',
    floor_id: '',
    apartment_id: '',
    start_date: '',
    end_date: '',
    total_budget: '',
    notes: ''
  })
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

  // Use hooks with projectId parameter to filter data
  const projectIdForHooks = formData.project_id ? parseInt(formData.project_id) : undefined
  const { towers } = useTowers(projectIdForHooks)
  const { floors } = useFloors(projectIdForHooks)

  // Cascade states
  const [availableTowers, setAvailableTowers] = useState<any[]>([])
  const [availableFloors, setAvailableFloors] = useState<any[]>([])
  const [availableApartments, setAvailableApartments] = useState<any[]>([])
  const [availableWorkers, setAvailableWorkers] = useState<any[]>([])
  const [selectedWorkers, setSelectedWorkers] = useState<number[]>([])
  const [workerMaterialDeliveries, setWorkerMaterialDeliveries] = useState<Record<number, number[]>>({})
  const [workerDeliveries, setWorkerDeliveries] = useState<Record<number, any[]>>({})
  const [loadingDeliveries, setLoadingDeliveries] = useState<Record<number, boolean>>({})
  const [workerTimestamps, setWorkerTimestamps] = useState<Record<number, { started_at: string; completed_at: string }>>({})

  // Loading states
  const [loadingTowers, setLoadingTowers] = useState(false)
  const [loadingFloors, setLoadingFloors] = useState(false)
  const [loadingApartments, setLoadingApartments] = useState(false)
  const [loadingWorkers, setLoadingWorkers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [workersSectionExpanded, setWorkersSectionExpanded] = useState(false)
  const [materialsSectionExpanded, setMaterialsSectionExpanded] = useState<Record<number, boolean>>({})
  const [activeWorkerTab, setActiveWorkerTab] = useState<'assigned' | 'available'>('assigned')
  const [activeContractTypeTab, setActiveContractTypeTab] = useState<'por_dia' | 'a_trato' | 'sin_contrato' | null>(null)
  const [taskCategories, setTaskCategories] = useState<{ id: number; name: string }[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [allowMixedContracts, setAllowMixedContracts] = useState(false)

  // Calcular trabajadores asignados y disponibles (solo en modo editar)
  const { assignedWorkers, availableWorkersForEdit } = useMemo(() => {
    if (mode === 'edit' && task?.workers) {
      const assigned = task.workers || []
      const assignedIds = new Set(assigned.map((w: any) => w.id))
      const available = availableWorkers.filter(w => !assignedIds.has(w.id))
      return {
        assignedWorkers: assigned,
        availableWorkersForEdit: available
      }
    }
    return {
      assignedWorkers: [],
      availableWorkersForEdit: []
    }
  }, [mode, task?.workers, availableWorkers])

  // Unificar trabajadores para la vista (solo asignados y disponibles del proyecto)
  const unifiedWorkers = useMemo(() => {
    // Crear un mapa para evitar duplicados por ID
    const workersMap = new Map()

    // 1. Agregar asignados (preservando estado de asignación)
    if (mode === 'edit' && assignedWorkers.length > 0) {
      assignedWorkers.forEach((w: any) => {
        workersMap.set(w.id, { ...w, is_assigned: true })
      })
    }

    // 2. Agregar disponibles del proyecto (si no están ya)
    availableWorkers.forEach((worker: any) => {
      if (!workersMap.has(worker.id)) {
        workersMap.set(worker.id, { ...worker, is_assigned: false })
      } else {
        // Asegurarse de tener la data más completa asignación
        workersMap.set(worker.id, { ...workersMap.get(worker.id), ...worker })
      }
    })

    return Array.from(workersMap.values())
  }, [mode, availableWorkers, assignedWorkers])

  // Separar trabajadores por tipo de contrato (Usando la lista unificada)
  const { workersPorDia, workersATrato, workersSinContrato } = useMemo(() => {
    const porDia: any[] = []
    const aTrato: any[] = []
    const sinContrato: any[] = []

    unifiedWorkers.forEach((worker: any) => {
      const contractType = worker.contract_type || 'a_trato'
      if (contractType === 'por_dia') {
        porDia.push(worker)
      } else if (contractType === 'a_trato') {
        aTrato.push(worker)
      } else {
        sinContrato.push(worker)
      }
    })

    return { workersPorDia: porDia, workersATrato: aTrato, workersSinContrato: sinContrato }
  }, [unifiedWorkers])



  // Detectar qué tipo de trabajadores están seleccionados
  const { hasPorDiaSelected, hasATratoSelected } = useMemo(() => {
    let porDia = false
    let aTrato = false

    selectedWorkers.forEach(workerId => {
      const worker = [...availableWorkers, ...assignedWorkers, ...availableWorkersForEdit]
        .find((w: any) => w.id === workerId)
      if (worker) {
        const contractType = worker.contract_type || 'a_trato'
        if (contractType === 'por_dia') {
          porDia = true
        } else {
          aTrato = true
        }
      }
    })

    return { hasPorDiaSelected: porDia, hasATratoSelected: aTrato }
  }, [selectedWorkers, availableWorkers, assignedWorkers, availableWorkersForEdit])

  // Determinar tab activo de tipo de contrato basado en selección
  useEffect(() => {
    if (hasPorDiaSelected && !hasATratoSelected) {
      setActiveContractTypeTab('por_dia')
    } else if (hasATratoSelected && !hasPorDiaSelected) {
      setActiveContractTypeTab('a_trato')
    } else if (!hasPorDiaSelected && !hasATratoSelected) {
      setActiveContractTypeTab(null)
    }
  }, [hasPorDiaSelected, hasATratoSelected])

  // Resetear allowMixedContracts cuando se cierra el modal o cambia el modo
  useEffect(() => {
    if (!isOpen) {
      setAllowMixedContracts(false)
    }
  }, [isOpen, mode])

  // Detectar si solo hay trabajadores "por_dia" seleccionados
  const selectedWorkersData = useMemo(() => {
    return availableWorkers.filter(w => selectedWorkers.includes(w.id))
  }, [availableWorkers, selectedWorkers])

  const hasOnlyPorDia = useMemo(() => {
    return selectedWorkersData.length > 0 && selectedWorkersData.every(w => w.contract_type === 'por_dia')
  }, [selectedWorkersData])

  // Auto-poner presupuesto en 0 si solo hay trabajadores "por_dia" (solo si NO está permitido mezclar)
  useEffect(() => {
    if (!allowMixedContracts && hasOnlyPorDia && formData.total_budget !== '0') {
      setFormData(prev => ({ ...prev, total_budget: '0' }))
    }
  }, [hasOnlyPorDia, allowMixedContracts])

  // Pre-fill form when editing
  useEffect(() => {
    if (mode === 'edit' && task && isOpen) {
      setFormData({
        task_name: task.task_name || '',
        task_category: task.task_category || '',
        priority: task.priority || 'medium',
        task_description: task.task_description || '',
        estimated_hours: task.estimated_hours?.toString() || '',
        project_id: task.project_id?.toString() || '',
        tower_id: task.tower_id?.toString() || '',
        floor_id: task.floor_id?.toString() || '',
        apartment_id: task.apartment_id?.toString() || '',
        start_date: task.start_date ? task.start_date.split('T')[0] : '',
        end_date: task.end_date ? task.end_date.split('T')[0] : '',
        total_budget: task.total_budget?.toString() || '',
        notes: task.notes || ''
      })

      // Set selected workers (solo activos inicialmente, pero permitir reactivar removidos)
      if (task.workers && Array.isArray(task.workers)) {
        const activeWorkers = task.workers
          .filter((w: any) => w.assignment_status !== 'removed')
          .map((w: any) => w.id)
        setSelectedWorkers(activeWorkers)

        // Cargar timestamps de las asignaciones
        const timestamps: Record<number, { started_at: string; completed_at: string }> = {}
        task.workers?.forEach((w: any) => {
          if (w.assignment_id) {
            timestamps[w.assignment_id] = {
              started_at: w.started_at || '',
              completed_at: w.completed_at || ''
            }
          }
        })
        setWorkerTimestamps(timestamps)
      }

      // Load cascade data
      if (task.project_id) {
        loadTowersForProject(task.project_id)
        loadWorkersForProject(task.project_id)
      }
      if (task.tower_id) {
        loadFloorsForTower(task.tower_id)
      }
      if (task.floor_id) {
        loadApartmentsForFloor(task.floor_id)
      }
    } else if (mode === 'create' && isOpen) {
      // Reset form for create mode, but use initial values if provided
      setFormData({
        task_name: '',
        task_category: '',
        priority: 'medium',
        task_description: '',
        estimated_hours: '',
        project_id: initialProjectId?.toString() || '',
        tower_id: initialTowerId?.toString() || '',
        floor_id: initialFloorId?.toString() || '',
        apartment_id: initialApartmentId?.toString() || '',
        start_date: '',
        end_date: '',
        total_budget: '',
        notes: ''
      })
      setSelectedTemplateId('')
      setSelectedWorkers([])
      setAvailableTowers([])
      setAvailableFloors([])
      setAvailableApartments([])
      setAvailableWorkers([])
    }
  }, [mode, task, isOpen, initialProjectId, initialTowerId, initialFloorId, initialApartmentId])

  // Load cascade data when initial values are provided in create mode
  useEffect(() => {
    if (mode === 'create' && isOpen) {
      if (initialProjectId) {
        const loadProjectData = async () => {
          await loadTowersForProject(initialProjectId)
          await loadWorkersForProject(initialProjectId)

          if (initialTowerId) {
            await loadFloorsForTower(initialTowerId)

            if (initialFloorId) {
              await loadApartmentsForFloor(initialFloorId)
            }
          }
        }
        loadProjectData()
      }
    }
  }, [mode, isOpen, initialProjectId, initialTowerId, initialFloorId])

  const loadTaskCategories = useCallback(async () => {
    try {
      setLoadingCategories(true)
      const { data, error } = await supabase
        .from('task_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error

      let categories = data || []
      const currentCategory =
        formData.task_category || (mode === 'edit' ? task?.task_category : '')

      if (currentCategory && !categories.some((cat) => cat.name === currentCategory)) {
        categories = [...categories, { id: -1, name: currentCategory }]
      }

      setTaskCategories(categories)
    } catch (err) {
      console.error('Error loading task categories:', err)
      toast.error('Error al cargar categorías de tarea')
    } finally {
      setLoadingCategories(false)
    }
  }, [formData.task_category, mode, task?.task_category])

  useEffect(() => {
    if (isOpen) {
      loadTaskCategories()
    }
  }, [isOpen, loadTaskCategories])

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Ingresa un nombre para la categoría')
      return
    }

    try {
      setAddingCategory(true)
      const normalizedName = newCategoryName.trim()

      const { data, error } = await supabase
        .from('task_categories')
        .insert({ name: normalizedName })
        .select('id, name')
        .single()

      if (error) throw error

      const updatedCategories = [...taskCategories.filter((cat) => cat.name !== data.name), data].sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      )

      setTaskCategories(updatedCategories)
      setFormData((prev) => ({ ...prev, task_category: data.name }))
      setShowNewCategoryInput(false)
      setNewCategoryName('')
      toast.success('Categoría creada')
    } catch (err: any) {
      if (err?.code === '23505') {
        toast.error('La categoría ya existe')
      } else {
        console.error('Error adding category:', err)
        toast.error('Error al crear la categoría')
      }
    } finally {
      setAddingCategory(false)
    }
  }

  // Update available towers when towers state changes
  useEffect(() => {
    if (formData.project_id) {
      setAvailableTowers(towers)
    } else {
      setAvailableTowers([])
    }
  }, [towers, formData.project_id])

  // Load towers when project changes
  const loadTowersForProject = async (projectId: number) => {
    if (!projectId) {
      setAvailableTowers([])
      setFormData(prev => ({ ...prev, tower_id: '', floor_id: '', apartment_id: '' }))
      return
    }

    setLoadingTowers(true)
    try {
      const { data: towersData, error } = await supabase
        .from('towers')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('tower_number', { ascending: true })

      if (error) throw error

      setAvailableTowers(towersData || [])

      if (mode === 'edit' && task?.tower_id) {
        setFormData(prev => ({ ...prev, tower_id: task.tower_id.toString() }))
      } else if (mode === 'create' && initialTowerId) {
        setFormData(prev => ({ ...prev, tower_id: initialTowerId.toString() }))
      } else {
        setFormData(prev => ({ ...prev, tower_id: '', floor_id: '', apartment_id: '' }))
      }
    } catch (error) {
      console.error('Error loading towers:', error)
      toast.error('Error al cargar torres')
    } finally {
      setLoadingTowers(false)
    }
  }

  // Update available floors when floors state changes
  useEffect(() => {
    if (formData.tower_id) {
      const towerFloors = floors.filter(f => f.tower_id === parseInt(formData.tower_id))
      setAvailableFloors(towerFloors)
    } else {
      setAvailableFloors([])
    }
  }, [floors, formData.tower_id])

  // Load floors when tower changes
  const loadFloorsForTower = async (towerId: number) => {
    if (!towerId) {
      setAvailableFloors([])
      setFormData(prev => ({ ...prev, floor_id: '', apartment_id: '' }))
      return
    }

    setLoadingFloors(true)
    try {
      const { data: floorsData, error } = await supabase
        .from('floors')
        .select('*')
        .eq('tower_id', towerId)
        .eq('is_active', true)
        .order('floor_number', { ascending: true })

      if (error) throw error

      setAvailableFloors(floorsData || [])

      if (mode === 'edit' && task?.floor_id) {
        setFormData(prev => ({ ...prev, floor_id: task.floor_id.toString() }))
      } else if (mode === 'create' && initialFloorId) {
        setFormData(prev => ({ ...prev, floor_id: initialFloorId.toString() }))
      } else {
        setFormData(prev => ({ ...prev, floor_id: '', apartment_id: '' }))
      }
    } catch (error) {
      console.error('Error loading floors:', error)
      toast.error('Error al cargar pisos')
    } finally {
      setLoadingFloors(false)
    }
  }

  // Load apartments when floor changes
  const loadApartmentsForFloor = async (floorId: number) => {
    if (!floorId) {
      setAvailableApartments([])
      setFormData(prev => ({ ...prev, apartment_id: '' }))
      return
    }

    setLoadingApartments(true)
    try {
      const { data: apartmentsData, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('floor_id', floorId)
        .eq('is_active', true)
        .order('apartment_number', { ascending: true })

      if (error) throw error

      setAvailableApartments(apartmentsData || [])

      if (mode === 'edit' && task?.apartment_id) {
        setFormData(prev => ({ ...prev, apartment_id: task.apartment_id.toString() }))
      } else if (mode === 'create' && initialApartmentId) {
        setFormData(prev => ({ ...prev, apartment_id: initialApartmentId.toString() }))
      } else {
        setFormData(prev => ({ ...prev, apartment_id: '' }))
      }
    } catch (error) {
      console.error('Error loading apartments:', error)
      toast.error('Error al cargar departamentos')
    } finally {
      setLoadingApartments(false)
    }
  }

  // Load workers when project changes
  const loadWorkersForProject = async (projectId: number) => {
    if (!projectId) {
      setAvailableWorkers([])
      return
    }

    setLoadingWorkers(true)
    try {
      const workers = await getWorkersForProject(projectId)
      setAvailableWorkers(workers)
    } catch (error) {
      console.error('Error loading workers:', error)
      toast.error('Error al cargar trabajadores')
    } finally {
      setLoadingWorkers(false)
    }
  }

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    if (mode !== 'create' || !templateId) {
      setSelectedTemplateId('')
      return
    }

    const template = templates.find(t => t.id.toString() === templateId)
    if (!template) {
      setSelectedTemplateId('')
      return
    }

    setFormData(prev => ({
      ...prev,
      task_name: template.name || '',
      task_category: template.category || '',
      priority: template.priority || 'medium',
      task_description: template.description || '',
      estimated_hours: template.estimated_hours?.toString() || ''
    }))
    setSelectedTemplateId(templateId)
  }

  // Load material deliveries for a worker
  const loadWorkerDeliveries = async (workerId: number) => {
    if (!workerId) return

    setLoadingDeliveries(prev => ({ ...prev, [workerId]: true }))
    try {
      const { data, error } = await supabase
        .from('material_movements')
        .select(`
          id,
          material_id,
          quantity,
          unit_cost,
          total_cost,
          created_at,
          materials!inner(
            name,
            unit
          )
        `)
        .eq('worker_id', workerId)
        .eq('movement_type', 'entrega')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      setWorkerDeliveries(prev => ({
        ...prev,
        [workerId]: data || []
      }))
    } catch (error: any) {
      console.error('Error loading deliveries:', error)
      toast.error(`Error al cargar entregas del trabajador: ${error.message}`)
    } finally {
      setLoadingDeliveries(prev => ({ ...prev, [workerId]: false }))
    }
  }

  useEffect(() => {
    selectedWorkers.forEach(workerId => {
      if (!workerDeliveries[workerId]) {
        loadWorkerDeliveries(workerId)
      }
    })
  }, [selectedWorkers])

  // Handle project change
  const handleProjectChange = (projectId: string) => {
    setFormData(prev => ({
      ...prev,
      project_id: projectId,
      tower_id: '',
      floor_id: '',
      apartment_id: ''
    }))
    setSelectedWorkers([])

    if (projectId) {
      loadTowersForProject(parseInt(projectId))
      loadWorkersForProject(parseInt(projectId))
    } else {
      setAvailableTowers([])
      setAvailableFloors([])
      setAvailableApartments([])
      setAvailableWorkers([])
    }
  }

  // Handle tower change
  const handleTowerChange = (towerId: string) => {
    setFormData(prev => ({
      ...prev,
      tower_id: towerId,
      floor_id: '',
      apartment_id: ''
    }))

    if (towerId) {
      loadFloorsForTower(parseInt(towerId))
    } else {
      setAvailableFloors([])
      setAvailableApartments([])
    }
  }

  // Handle floor change
  const handleFloorChange = (floorId: string) => {
    setFormData(prev => ({
      ...prev,
      floor_id: floorId,
      apartment_id: ''
    }))

    if (floorId) {
      loadApartmentsForFloor(parseInt(floorId))
    } else {
      setAvailableApartments([])
    }
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.task_name.trim()) {
      toast.error('El nombre de la tarea es requerido')
      return
    }
    if (!formData.task_category) {
      toast.error('La categoría es requerida')
      return
    }
    if (!formData.project_id) {
      toast.error('El proyecto es requerido')
      return
    }
    if (!isMassCreate && !formData.apartment_id && !formData.floor_id) {
      toast.error('Debe seleccionar al menos un Piso o un Departamento')
      return
    }

    // Validation
    const selectedWorkersData = availableWorkers.filter(w => selectedWorkers.includes(w.id))
    const hasOnlyPorDia = selectedWorkersData.length > 0 && selectedWorkersData.every(w => w.contract_type === 'por_dia')
    const hasATrato = selectedWorkersData.some(w => w.contract_type === 'a_trato')

    if (!allowMixedContracts && hasOnlyPorDia) {
      if (!formData.total_budget || parseFloat(formData.total_budget) !== 0) {
        toast.error('Los trabajadores "Por Día" no reciben pago por tarea. El presupuesto debe ser 0.')
        return
      }
    } else if (hasATrato || selectedWorkersData.length === 0 || allowMixedContracts) {
      if (formData.total_budget && parseFloat(formData.total_budget) < 0) {
        toast.error('El presupuesto no puede ser negativo')
        return
      }
    }

    setSubmitting(true)

    try {
      const taskPayloadBase = {
        task_name: formData.task_name.trim(),
        task_description: formData.task_description.trim() || null,
        task_category: formData.task_category,
        priority: formData.priority,
        estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : null,
        total_budget: formData.total_budget ? parseFloat(formData.total_budget) : 0,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        notes: formData.notes.trim() || null,
        status: mode === 'edit' ? task?.status || 'pending' : 'pending'
      }

      if (isMassCreate && massCreateData) {
        toast.loading('Creando tareas masivas...', { id: 'mass-create' })

        // ... (Already in file, skipping detailed rewrite for brevity in thought, but full in output)
        // [Original logic here - see Step 4048 code]
        // But for safety I need to include it in write_to_file call

        const { data: floorsInTower, error: floorsError } = await supabase
          .from('floors')
          .select('id')
          .eq('tower_id', massCreateData.towerId)

        if (floorsError) throw floorsError
        const floorIds = floorsInTower.map(f => f.id)

        if (floorIds.length === 0) throw new Error('No se encontraron pisos')

        const { data: apartments, error: aptError } = await supabase
          .from('apartments')
          .select('id, floor_id')
          .in('floor_id', floorIds)
          .eq('is_active', true)

        if (aptError) throw aptError
        if (!apartments || apartments.length === 0) throw new Error('No se encontraron departamentos')

        let createdCount = 0

        for (const apt of apartments) {
          const taskPayload = {
            ...taskPayloadBase,
            project_id: parseInt(formData.project_id),
            tower_id: massCreateData.towerId,
            floor_id: apt.floor_id,
            apartment_id: apt.id
          }

          const newTask = await createTask(taskPayload)

          if (selectedWorkers.length > 0) {
            for (const workerId of selectedWorkers) {
              await assignWorkerToTask(newTask.id, workerId)
            }
          }
          createdCount++
        }

        toast.dismiss('mass-create')
        toast.success(`${createdCount} tareas creadas masivamente`)
      } else {
        const taskPayload = {
          ...taskPayloadBase,
          project_id: parseInt(formData.project_id),
          tower_id: parseInt(formData.tower_id),
          floor_id: parseInt(formData.floor_id),
          // Si apartment_id es vacío, enviamos null (tarea de piso), sino el ID parseado
          apartment_id: formData.apartment_id ? parseInt(formData.apartment_id) : null
        }

        let taskId: number

        if (mode === 'create') {
          const newTask = await createTask(taskPayload)
          taskId = newTask.id

          if (selectedWorkers.length > 0) {
            for (const workerId of selectedWorkers) {
              await assignWorkerToTask(taskId, workerId)

              const { data: assignment } = await supabase
                .from('task_assignments')
                .select('id')
                .eq('task_id', taskId)
                .eq('worker_id', workerId)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

              const deliveryIds = workerMaterialDeliveries[workerId] || []
              if (deliveryIds.length > 0 && assignment?.id) {
                try {
                  const materialInserts = deliveryIds.map(deliveryId => ({
                    task_assignment_id: assignment.id,
                    delivery_id: deliveryId
                  }))
                  await supabase.from('task_assignment_materials').insert(materialInserts)
                } catch (err) {
                  console.error('Error linking material deliveries:', err)
                }
              }
            }
          }
        } else {
          await updateTask(task!.id, taskPayload)
          taskId = task!.id

          const currentActiveWorkerIds = task.workers?.filter((w: any) => w.assignment_status !== 'removed').map((w: any) => w.id) || []

          for (const workerId of currentActiveWorkerIds) {
            if (!selectedWorkers.includes(workerId)) {
              const assignment = task.workers?.find((w: any) => w.id === workerId && w.assignment_status !== 'removed')
              if (assignment?.assignment_id) {
                await removeWorkerFromTask(assignment.assignment_id, `Removido al editar tarea - ${new Date().toLocaleString('es-CL')}`)
              }
            }
          }

          for (const workerId of selectedWorkers) {
            if (!currentActiveWorkerIds.includes(workerId)) {
              await assignWorkerToTask(taskId, workerId)
            }
          }

          for (const [assignmentIdStr, timestamps] of Object.entries(workerTimestamps)) {
            const assignmentId = parseInt(assignmentIdStr)
            if (isNaN(assignmentId)) continue
            await supabase.from('task_assignments').update({
              started_at: timestamps.started_at || null,
              completed_at: timestamps.completed_at || null
            }).eq('id', assignmentId)
          }
        }
      }

      if (onSuccess) {
        onSuccess()
      } else {
        await refreshTasks()
      }
      toast.success(mode === 'create' ? 'Tarea creada exitosamente' : 'Tarea actualizada exitosamente')
      onClose()
    } catch (error: any) {
      console.error('Error saving task:', error)
      toast.error(`Error al ${mode === 'create' ? 'crear' : 'actualizar'} tarea: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Crear Nueva Tarea' : 'Editar Tarea'}
      size="xl"
      headerRight={mode === 'create' ? (
        <div className="flex items-center gap-3 mr-8">
          <span className="text-sm text-slate-400 hidden sm:inline">Plantilla:</span>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">-- Seleccionar Plantilla --</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      ) : null}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nombre de la Tarea</label>
              <input
                type="text"
                value={formData.task_name}
                onChange={(e) => setFormData(prev => ({ ...prev, task_name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Pintura Fachada"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Categoría</label>
              <div className="relative">
                {showNewCategoryInput ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nueva categoría..."
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={addingCategory}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewCategoryInput(false); setNewCategoryName('') }}
                      className="px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.task_category}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setShowNewCategoryInput(true)
                      } else {
                        setFormData(prev => ({ ...prev, task_category: e.target.value }))
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"

                  >
                    <option value="">Seleccionar...</option>
                    {taskCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                    <option value="new">+ Crear Nueva</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Prioridad</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Horas Estimadas</label>
              <input
                type="number"
                value={formData.estimated_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Descripción</label>
            <textarea
              rows={2}
              value={formData.task_description}
              onChange={(e) => setFormData(prev => ({ ...prev, task_description: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Location Selection */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Proyecto</label>
            <select
              value={formData.project_id}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Torre</label>
            <select
              value={formData.tower_id}
              onChange={(e) => handleTowerChange(e.target.value)}
              disabled={!formData.project_id || loadingTowers}
              className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Seleccionar...</option>
              {availableTowers.map(t => (
                <option key={t.id} value={t.id}>{t.tower_number}</option>
              ))}
            </select>
          </div>
          {!isMassCreate && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Piso</label>
                <select
                  value={formData.floor_id}
                  onChange={(e) => handleFloorChange(e.target.value)}
                  disabled={!formData.tower_id || loadingFloors}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Seleccionar...</option>
                  {availableFloors.map(f => (
                    <option key={f.id} value={f.id}>{f.floor_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Depto</label>
                <select
                  value={formData.apartment_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, apartment_id: e.target.value }))}
                  disabled={!formData.floor_id || loadingApartments}
                  className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Seleccionar (Opcional)...</option>
                  {availableApartments.map(apt => (
                    <option key={apt.id} value={apt.id}>{apt.apartment_number}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Worker Assignment Section - UPDATED & STANDARDIZED */}
        <div className="border border-slate-700 rounded-md overflow-hidden bg-slate-800/50">
          <button
            type="button"
            onClick={() => setWorkersSectionExpanded(!workersSectionExpanded)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200">Asignación de Trabajadores</span>
              <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full border border-slate-600">
                {selectedWorkers.length} seleccionados
              </span>
            </div>
            <Plus className={`w-5 h-5 text-slate-400 transition-transform ${workersSectionExpanded ? 'rotate-45' : ''}`} />
          </button>

          {workersSectionExpanded && (
            <div className="p-4 border-t border-slate-700 space-y-4">
              {/* Mixed Contract Option */}
              <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-md group hover:border-blue-600/50 transition-colors">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowMixedContracts}
                    disabled={hasPorDiaSelected && hasATratoSelected}
                    onChange={(e) => {
                      if (hasPorDiaSelected && hasATratoSelected) {
                        toast.error('No puedes desactivar esta opción mientras tengas trabajadores de ambos tipos seleccionados.')
                        return
                      }
                      setAllowMixedContracts(e.target.checked)
                    }}
                    className="mt-1 w-4 h-4 text-blue-600 bg-slate-700 border-slate-500 rounded"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-300">
                      Permitir mezclar trabajadores &quot;Por Día&quot; y &quot;A Trato&quot;
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      Habilita la selección flexible. Nota: Los trabajadores &quot;Por Día&quot; no suman al presupuesto.
                    </p>
                  </div>
                </label>
              </div>

              {/* Tabs */}
              {/* Tabs */}
              <div className="flex gap-2 border-b border-slate-600 mb-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (allowMixedContracts || (!hasATratoSelected && !selectedWorkers.some(id => workersSinContrato.find(w => w.id === id)))) setActiveContractTypeTab('por_dia')
                  }}
                  disabled={!allowMixedContracts && (hasATratoSelected || selectedWorkers.some(id => workersSinContrato.find(w => w.id === id)))}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeContractTypeTab === 'por_dia'
                    ? 'border-yellow-400 text-yellow-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                    } ${!allowMixedContracts && (hasATratoSelected || selectedWorkers.some(id => workersSinContrato.find(w => w.id === id))) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Por Día ({workersPorDia.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (allowMixedContracts || (!hasPorDiaSelected && !selectedWorkers.some(id => workersSinContrato.find(w => w.id === id)))) setActiveContractTypeTab('a_trato')
                  }}
                  disabled={!allowMixedContracts && (hasPorDiaSelected || selectedWorkers.some(id => workersSinContrato.find(w => w.id === id)))}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeContractTypeTab === 'a_trato'
                    ? 'border-green-400 text-green-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                    } ${!allowMixedContracts && (hasPorDiaSelected || selectedWorkers.some(id => workersSinContrato.find(w => w.id === id))) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  A Trato ({workersATrato.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveContractTypeTab('sin_contrato')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeContractTypeTab === 'sin_contrato'
                    ? 'border-slate-300 text-slate-100'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                  Sin Contrato ({workersSinContrato.length})
                </button>
              </div>

              {/* Workers List */}
              {loadingWorkers ? (
                <p className="text-slate-400 text-sm p-4 text-center">Cargando trabajadores...</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {(() => {
                    const activeList = activeContractTypeTab === 'por_dia' ? workersPorDia : (activeContractTypeTab === 'a_trato' ? workersATrato : workersSinContrato);
                    return activeList.length > 0 ? (
                      activeList.map(worker => {
                        const isSelected = selectedWorkers.includes(worker.id)
                        const isRemoved = worker.assignment_status === 'removed'
                        const isAssigned = worker.is_assigned

                        return (
                          <div key={worker.id} className={`p-3 rounded-md border ${isSelected ? 'bg-slate-700 border-slate-500' : 'bg-slate-800 border-slate-700'}`}>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!isSelected && !allowMixedContracts && (
                                  (worker.contract_type === 'por_dia' && hasATratoSelected) ||
                                  (worker.contract_type === 'a_trato' && hasPorDiaSelected)
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    if (!allowMixedContracts) {
                                      if (worker.contract_type === 'por_dia' && hasATratoSelected) {
                                        toast.error('No se pueden mezclar tipos de contrato.')
                                        return
                                      }
                                      if (worker.contract_type === 'a_trato' && hasPorDiaSelected) {
                                        toast.error('No se pueden mezclar tipos de contrato.')
                                        return
                                      }
                                    }
                                    setSelectedWorkers(prev => [...prev, worker.id])
                                  } else {
                                    setSelectedWorkers(prev => prev.filter(id => id !== worker.id))
                                  }
                                }}
                                className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-medium ${isRemoved ? 'text-red-400 line-through' : 'text-slate-200'}`}>
                                    {worker.full_name}
                                  </span>
                                  {isRemoved && <span className="text-xs text-red-400">(Removido)</span>}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {worker.rut} • {worker.contract_type === 'por_dia' ? 'Por Día' : (worker.contract_type === 'a_trato' ? 'A Trato' : 'Sin Contrato')}
                                </div>
                              </div>
                            </div>

                            {/* Edit Mode: Timestamps */}
                            {mode === 'edit' && isSelected && !isRemoved && worker.assignment_id && (
                              <div className="mt-3 pt-3 border-t border-slate-600 grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1">Inicio</label>
                                  <input
                                    type="datetime-local"
                                    value={workerTimestamps[worker.assignment_id]?.started_at?.split('.')[0] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value ? new Date(e.target.value).toISOString() : ''
                                      setWorkerTimestamps(prev => ({
                                        ...prev,
                                        [worker.assignment_id]: { ...prev[worker.assignment_id], started_at: val }
                                      }))
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-slate-600 bg-slate-700 rounded text-slate-200"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1">Fin</label>
                                  <input
                                    type="datetime-local"
                                    value={workerTimestamps[worker.assignment_id]?.completed_at?.split('.')[0] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value ? new Date(e.target.value).toISOString() : ''
                                      setWorkerTimestamps(prev => ({
                                        ...prev,
                                        [worker.assignment_id]: { ...prev[worker.assignment_id], completed_at: val }
                                      }))
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-slate-600 bg-slate-700 rounded text-slate-200"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-4">No hay trabajadores disponibles en esta categoría.</p>
                    )
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Budget & Dates */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Presupuesto</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input
                type="number"
                value={formData.total_budget}
                onChange={(e) => setFormData(prev => ({ ...prev, total_budget: e.target.value }))}
                className="w-full pl-6 px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Fecha Inicio</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Fecha Fin</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Notas</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Notas adicionales..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            {submitting ? 'Guardando...' : mode === 'create' ? 'Crear Tarea' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </ModalV2 >
  )
}
