'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ModalV2 } from './ModalV2'
import { useTasksV2 } from '@/hooks/useTasks_v2'
import { useTowers } from '@/hooks/useTowers'
import { useFloors } from '@/hooks/useFloors'
import { useApartments } from '@/hooks/useApartments'
import { useTaskTemplates } from '@/hooks/useTaskTemplates'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Plus, AlertCircle } from 'lucide-react'

interface TaskFormModalV2Props {
  isOpen: boolean
  onClose: () => void
  task?: any // TaskV2 type
  mode?: 'create' | 'edit'
  onSuccess?: () => void
  initialProjectId?: number
  initialTowerId?: number
  initialFloorId?: number
  initialApartmentId?: number
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

  // const floorIdForHooks = formData.floor_id ? parseInt(formData.floor_id) : undefined
  // const { apartments } = useApartments(floorIdForHooks)

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
  const [activeContractTypeTab, setActiveContractTypeTab] = useState<'por_dia' | 'a_trato' | null>(null)
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

  // Separar trabajadores por tipo de contrato
  const { workersPorDia, workersATrato } = useMemo(() => {
    const porDia: any[] = []
    const aTrato: any[] = []

    const workersToFilter = mode === 'edit'
      ? (activeWorkerTab === 'assigned' ? assignedWorkers : availableWorkersForEdit)
      : availableWorkers

    workersToFilter.forEach((worker: any) => {
      const contractType = worker.contract_type || 'a_trato'
      if (contractType === 'por_dia') {
        porDia.push(worker)
      } else {
        aTrato.push(worker)
      }
    })

    return { workersPorDia: porDia, workersATrato: aTrato }
  }, [mode, activeWorkerTab, assignedWorkers, availableWorkersForEdit, availableWorkers])

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
        // Los removidos no se seleccionan inicialmente, pero el usuario puede seleccionarlos para reactivarlos
        // NOTA: En modo editar, NO cargamos materiales (solo se ven en la sección de materiales)

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
  // This effect runs after the form data is set, so we can safely call the load functions
  useEffect(() => {
    if (mode === 'create' && isOpen) {
      // Load data in sequence to ensure proper cascade
      if (initialProjectId) {
        // Load towers and workers for the project
        const loadProjectData = async () => {
          await loadTowersForProject(initialProjectId)
          await loadWorkersForProject(initialProjectId)

          // After towers are loaded, load floors if towerId is provided
          if (initialTowerId) {
            await loadFloorsForTower(initialTowerId)

            // After floors are loaded, load apartments if floorId is provided
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

      // No establecer categoría por defecto - el usuario debe seleccionar una
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
      // Query directly from Supabase to ensure we have the latest data
      const { data: towersData, error } = await supabase
        .from('towers')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('tower_number', { ascending: true })

      if (error) throw error

      setAvailableTowers(towersData || [])

      // If editing and tower_id is set, keep it
      if (mode === 'edit' && task?.tower_id) {
        setFormData(prev => ({ ...prev, tower_id: task.tower_id.toString() }))
      } else if (mode === 'create' && initialTowerId) {
        // Preserve initialTowerId in create mode
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

  // Update available floors when floors state changes - filter by tower_id
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
      // Query directly from Supabase to ensure we have the latest data
      const { data: floorsData, error } = await supabase
        .from('floors')
        .select('*')
        .eq('tower_id', towerId)
        .eq('is_active', true)
        .order('floor_number', { ascending: true })

      if (error) throw error

      setAvailableFloors(floorsData || [])

      // If editing and floor_id is set, keep it
      if (mode === 'edit' && task?.floor_id) {
        setFormData(prev => ({ ...prev, floor_id: task.floor_id.toString() }))
      } else if (mode === 'create' && initialFloorId) {
        // Preserve initialFloorId in create mode
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

  /*
  // Update available apartments when apartments state changes
  useEffect(() => {
    if (formData.floor_id) {
      // Apartments are already filtered by the hook using floorId
      setAvailableApartments(apartments)
    } else {
      setAvailableApartments([])
    }
  }, [apartments, formData.floor_id])
  */

  // Load apartments when floor changes
  const loadApartmentsForFloor = async (floorId: number) => {
    if (!floorId) {
      setAvailableApartments([])
      setFormData(prev => ({ ...prev, apartment_id: '' }))
      return
    }

    setLoadingApartments(true)
    try {
      // Query directly from Supabase to ensure we have the latest data
      const { data: apartmentsData, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('floor_id', floorId)
        .eq('is_active', true)
        .order('apartment_number', { ascending: true })

      if (error) throw error

      setAvailableApartments(apartmentsData || [])

      // If editing and apartment_id is set, keep it
      if (mode === 'edit' && task?.apartment_id) {
        setFormData(prev => ({ ...prev, apartment_id: task.apartment_id.toString() }))
      } else if (mode === 'create' && initialApartmentId) {
        // Preserve initialApartmentId in create mode
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

  // NOTA: loadExistingMaterialAssignments fue eliminada porque en modo editar
  // los materiales solo se gestionan en la sección de materiales, no en el formulario

  // Handle template selection (solo en modo crear)
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

    // Limpiar y rellenar los campos que la plantilla reemplaza
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

  // Load deliveries when a worker is selected
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

    // Validation
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
    if (!isMassCreate && !formData.apartment_id) {
      toast.error('El departamento es requerido')
      return
    }
    // Validar presupuesto según tipo de trabajadores
    const selectedWorkersData = availableWorkers.filter(w => selectedWorkers.includes(w.id))
    const hasOnlyPorDia = selectedWorkersData.length > 0 && selectedWorkersData.every(w => w.contract_type === 'por_dia')
    const hasATrato = selectedWorkersData.some(w => w.contract_type === 'a_trato')

    // Si está permitido mezclar, siempre se puede ingresar presupuesto (aunque haya por_dia)
    if (!allowMixedContracts && hasOnlyPorDia) {
      // Si solo hay trabajadores "por_dia" y NO está permitido mezclar, el presupuesto debe ser 0
      if (!formData.total_budget || parseFloat(formData.total_budget) !== 0) {
        toast.error('Los trabajadores "Por Día" no reciben pago por tarea. El presupuesto debe ser 0.')
        return
      }
    } else if (hasATrato || selectedWorkersData.length === 0 || allowMixedContracts) {
      // Si hay trabajadores "a_trato", no hay trabajadores, o está permitido mezclar, el presupuesto debe ser mayor a 0
      if (!formData.total_budget || parseFloat(formData.total_budget) <= 0) {
        toast.error('El presupuesto debe ser mayor a 0')
        return
      }
    }
    // Trabajadores son opcionales - no validar

    setSubmitting(true)

    try {
      const taskPayloadBase = {
        task_name: formData.task_name.trim(),
        task_description: formData.task_description.trim() || null,
        task_category: formData.task_category,
        priority: formData.priority,
        estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : null,
        total_budget: parseFloat(formData.total_budget),
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        notes: formData.notes.trim() || null,
        status: mode === 'edit' ? task?.status || 'pending' : 'pending'
      }

      if (isMassCreate && massCreateData) {
        // Mass Create Logic
        toast.loading('Creando tareas masivas...', { id: 'mass-create' })

        // Fetch apartments with their floor_id
        // Alternative safe fetch:
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
        // Single Create/Edit Logic
        const taskPayload = {
          ...taskPayloadBase,
          project_id: parseInt(formData.project_id),
          tower_id: parseInt(formData.tower_id),
          floor_id: parseInt(formData.floor_id),
          apartment_id: parseInt(formData.apartment_id)
        }

        let taskId: number

        if (mode === 'create') {
          // Create task
          const newTask = await createTask(taskPayload)
          taskId = newTask.id

          // Assign workers (opcional - solo si hay seleccionados)
          if (selectedWorkers.length > 0) {
            for (const workerId of selectedWorkers) {
              await assignWorkerToTask(taskId, workerId)

              // Get the assignment_id that was just created
              const { data: assignment, error: assignmentError } = await supabase
                .from('task_assignments')
                .select('id')
                .eq('task_id', taskId)
                .eq('worker_id', workerId)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

              // Link material deliveries if selected for this worker
              const deliveryIds = workerMaterialDeliveries[workerId] || []
              if (deliveryIds.length > 0 && assignment?.id) {
                try {
                  const materialInserts = deliveryIds.map(deliveryId => ({
                    task_assignment_id: assignment.id,
                    delivery_id: deliveryId
                  }))

                  const { error: materialError } = await supabase
                    .from('task_assignment_materials')
                    .insert(materialInserts)

                  if (materialError) {
                    console.error('Error linking material deliveries:', materialError)
                    // No mostrar error al usuario, solo log
                  }
                } catch (err) {
                  console.error('Error linking material deliveries:', err)
                }
              }
            }
          }
        } else {
          // Update task
          await updateTask(task!.id, taskPayload)
          taskId = task!.id

          // Get current assigned workers (solo activos)
          const currentActiveWorkerIds = task.workers
            ?.filter((w: any) => w.assignment_status !== 'removed')
            ?.map((w: any) => w.id) || []

          // Get all workers (including removed ones) to check for reactivation
          const allWorkerIds = task.workers?.map((w: any) => w.id) || []

          // IMPORTANTE: Solo procesar cambios reales
          // 1. Remover trabajadores que ya no están seleccionados (solo los que estaban activos)
          for (const workerId of currentActiveWorkerIds) {
            if (!selectedWorkers.includes(workerId)) {
              // Find assignment_id and remove
              const assignment = task.workers?.find((w: any) => w.id === workerId && w.assignment_status !== 'removed')
              if (assignment?.assignment_id) {
                try {
                  // Remover trabajador con razón automática
                  await removeWorkerFromTask(assignment.assignment_id, `Removido al editar tarea - ${new Date().toLocaleString('es-CL')}`)
                } catch (err: any) {
                  console.error(`Error removiendo trabajador ${workerId}:`, err)
                  // Continuar con otros trabajadores aunque falle uno
                  toast.error(`No se pudo remover trabajador: ${err.message || 'Error desconocido'}`)
                }
              }
            }
          }

          // 2. Agregar o reactivar trabajadores que están seleccionados pero NO estaban activos
          // IMPORTANTE: NO hacer nada con trabajadores que ya están activos y seleccionados
          // NOTA: En modo editar, NO guardamos materiales aquí (solo se gestionan en la sección de materiales)
          for (const workerId of selectedWorkers) {
            // Solo procesar si NO está en los activos actuales
            // Esto significa que es un trabajador nuevo o uno removido que se está reactivando
            if (!currentActiveWorkerIds.includes(workerId)) {
              // assignWorkerToTask ya maneja la reactivación si el trabajador tiene una asignación removida
              await assignWorkerToTask(taskId, workerId)
            }
          }

          // 3. Actualizar timestamps de las asignaciones
          for (const [assignmentIdStr, timestamps] of Object.entries(workerTimestamps)) {
            const assignmentId = parseInt(assignmentIdStr)
            if (isNaN(assignmentId)) continue

            const { error: updateError } = await supabase
              .from('task_assignments')
              .update({
                started_at: timestamps.started_at || null,
                completed_at: timestamps.completed_at || null
              })
              .eq('id', assignmentId)

            if (updateError) {
              console.error(`Error actualizando timestamps para asignación ${assignmentId}:`, updateError)
              toast.error(`Error al actualizar tiempos de trabajo: ${updateError.message}`)
            }
          }
        }
      }

      if (onSuccess) {
        onSuccess()
      } else {
        // Fallback: usar refreshTasks del hook si no hay callback
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
      headerRight={
        mode === 'create' ? (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-300">
              Usar Plantilla:
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px] text-sm"
            >
              <option value="">Seleccionar plantilla...</option>
              {templates.map(template => {
                const priorityLabel = template.priority === 'urgent' ? 'Urgente' :
                  template.priority === 'high' ? 'Alta' :
                    template.priority === 'low' ? 'Baja' : 'Media'
                return (
                  <option key={template.id} value={template.id.toString()}>
                    {template.name} - {priorityLabel} - {template.estimated_hours}h
                  </option>
                )
              })}
            </select>
          </div>
        ) : undefined
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Información Básica */}
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-4">Información Básica</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre de la Tarea *
              </label>
              <input
                type="text"
                value={formData.task_name}
                onChange={(e) => setFormData(prev => ({ ...prev, task_name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Tabiques"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Categoría *
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={formData.task_category}
                  onChange={(e) => setFormData(prev => ({ ...prev, task_category: e.target.value }))}
                  disabled={loadingCategories}
                  className="flex-1 px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                  required
                >
                  <option value="">{loadingCategories ? 'Cargando categorías...' : 'Seleccionar categoría'}</option>
                  {taskCategories.map((category) => (
                    <option key={`${category.id}-${category.name}`} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCategoryInput((prev) => !prev)}
                  className="p-2 rounded-md border border-slate-600 text-slate-200 hover:text-white hover:border-blue-500"
                  title="Agregar nueva categoría"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {showNewCategoryInput && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nombre de la categoría"
                    className="flex-1 px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={addingCategory}
                    className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addingCategory ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategoryInput(false)
                      setNewCategoryName('')
                    }}
                    className="px-3 py-2 border border-slate-600 text-slate-200 rounded-md hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Prioridad *
              </label>
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
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descripción
            </label>
            <textarea
              rows={3}
              value={formData.task_description}
              onChange={(e) => setFormData(prev => ({ ...prev, task_description: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descripción detallada de la tarea..."
            />
          </div>
        </div>

        {/* Ubicación */}
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-4">Ubicación</h4>
          {/* Determinar si los campos deben estar deshabilitados (solo en modo create con valores iniciales) */}
          {(() => {
            const hasInitialValues = mode === 'create' && (initialProjectId || initialTowerId || initialFloorId || initialApartmentId)
            const isLocationDisabled = Boolean(hasInitialValues)

            return (
              /* Selectores en Cascada */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Proyecto - Siempre visible, deshabilitado si viene pre-seleccionado */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Proyecto *
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!!initialProjectId || isMassCreate}
                    required
                  >
                    <option value="">Seleccionar Proyecto</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {isMassCreate ? (
                  <div className="md:col-span-3 bg-blue-900/20 border border-blue-800 rounded-lg p-4 flex items-center justify-center">
                    <p className="text-blue-200 font-medium flex items-center gap-2 text-sm">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      Modo Masivo: Se creará esta tarea para TODOS los departamentos de la torre seleccionada.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Torre */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Torre *
                      </label>
                      <select
                        value={formData.tower_id}
                        onChange={(e) => handleTowerChange(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!formData.project_id || loadingTowers || !!initialTowerId}
                        required
                      >
                        <option value="">Seleccionar Torre</option>
                        {towers.map(tower => (
                          <option key={tower.id} value={tower.id}>
                            Torre {tower.tower_number}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Piso */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Piso *
                      </label>
                      <select
                        value={formData.floor_id}
                        onChange={(e) => handleFloorChange(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!formData.tower_id || loadingFloors || !!initialFloorId}
                        required
                      >
                        <option value="">Seleccionar Piso</option>
                        {floors.map(floor => (
                          <option key={floor.id} value={floor.id}>
                            Piso {floor.floor_number}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Apartamento */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Apartamento *
                      </label>
                      <select
                        value={formData.apartment_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, apartment_id: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!formData.floor_id || loadingApartments || !!initialApartmentId}
                        required
                      >
                        <option value="">Seleccionar Depto</option>
                        {availableApartments.map(apt => (
                          <option key={apt.id} value={apt.id}>
                            {apt.apartment_number}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            )
          })()}
        </div>

        {/* Asignación de Trabajadores - Acordeón Desplegable */}
        <div className="border border-slate-600 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setWorkersSectionExpanded(!workersSectionExpanded)}
            className="w-full flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <h4 className="text-sm font-semibold text-slate-200">Asignación de Trabajadores</h4>
              {selectedWorkers.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">
                  {selectedWorkers.length} seleccionado{selectedWorkers.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <svg
              className={`w-5 h-5 text-slate-300 transition-transform ${workersSectionExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {workersSectionExpanded && (
            <div className="p-4 bg-slate-800 border-t border-slate-600">
              {/* Toggle para anular restricciones de contrato - Solo en modo crear */}
              {mode === 'create' && (
                <div className="mb-4 p-3 bg-slate-800/50 border border-slate-600 rounded-md">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={allowMixedContracts}
                      disabled={hasPorDiaSelected && hasATratoSelected}
                      onChange={(e) => {
                        if (hasPorDiaSelected && hasATratoSelected) {
                          toast.error('No puedes desactivar esta opción mientras tengas trabajadores de ambos tipos seleccionados. Deselecciona trabajadores de uno de los tipos primero.')
                          return
                        }
                        setAllowMixedContracts(e.target.checked)
                      }}
                      className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-500 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
                        Permitir mezclar trabajadores &quot;Por Día&quot; y &quot;A Trato&quot; (caso excepcional)
                      </span>
                    </div>
                  </label>
                  <p className="mt-2 ml-6 text-xs text-slate-400">
                    Cuando está activo, permite seleccionar ambos tipos de trabajadores. Los trabajadores &quot;Por Día&quot; no recibirán pago y su distribución no será modificable.
                  </p>
                  {hasPorDiaSelected && hasATratoSelected && (
                    <p className="mt-2 ml-6 text-xs text-yellow-400">
                      ⚠️ Tienes trabajadores de ambos tipos seleccionados. Deselecciona trabajadores de uno de los tipos para poder desactivar esta opción.
                    </p>
                  )}
                </div>
              )}

              {/* Tabs solo en modo editar */}
              {mode === 'edit' ? (
                <div className="mb-4 flex gap-2 border-b border-slate-600">
                  <button
                    type="button"
                    onClick={() => setActiveWorkerTab('assigned')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${activeWorkerTab === 'assigned'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    Asignados ({assignedWorkers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkerTab('available')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${activeWorkerTab === 'available'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    Disponibles ({availableWorkersForEdit.length})
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-400 mb-3">
                  {loadingWorkers ? 'Cargando trabajadores...' : `Trabajadores con Contrato Activo (${availableWorkers.length})`}
                </p>
              )}

              {/* Contenido según el tab activo o modo */}
              {mode === 'edit' ? (
                activeWorkerTab === 'assigned' ? (
                  // Tab: Asignados (trabajadores con asignación previa)
                  assignedWorkers.length > 0 ? (
                    <div className="space-y-4">
                      {assignedWorkers.map((worker: any) => {
                        const isSelected = selectedWorkers.includes(worker.id)
                        const isRemoved = worker.assignment_status === 'removed'
                        const deliveries = workerDeliveries[worker.id] || []
                        const selectedDelivery = workerMaterialDeliveries[worker.id] || []
                        const isLoading = loadingDeliveries[worker.id] || false

                        return (
                          <div key={worker.id} className={`border rounded-md overflow-hidden ${isRemoved ? 'border-red-500/50 bg-red-900/10' : 'border-slate-600'}`}>
                            <label className={`flex items-center p-3 cursor-pointer transition-colors ${isRemoved ? 'bg-red-900/20 hover:bg-red-900/30' : 'bg-slate-700 hover:bg-slate-600'}`}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!isSelected && !allowMixedContracts && (
                                  (worker.contract_type === 'por_dia' && hasATratoSelected) ||
                                  (worker.contract_type === 'a_trato' && hasPorDiaSelected)
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Validar bloqueo mutuo (solo si no está permitido mezclar)
                                    if (!allowMixedContracts) {
                                      if (worker.contract_type === 'por_dia' && hasATratoSelected) {
                                        toast.error('No puedes seleccionar trabajadores "Por Día" si ya tienes trabajadores "A Trato" seleccionados. Activa la opción "Permitir mezclar" si necesitas ambos tipos.')
                                        return
                                      }
                                      if (worker.contract_type === 'a_trato' && hasPorDiaSelected) {
                                        toast.error('No puedes seleccionar trabajadores "A Trato" si ya tienes trabajadores "Por Día" seleccionados. Activa la opción "Permitir mezclar" si necesitas ambos tipos.')
                                        return
                                      }
                                    }
                                    // Permitir seleccionar trabajadores removidos para reactivarlos
                                    setSelectedWorkers(prev => [...prev, worker.id])
                                    // En modo editar, NO cargamos entregas (solo se ven en la sección de materiales)
                                  } else {
                                    setSelectedWorkers(prev => prev.filter(id => id !== worker.id))
                                    // En modo editar, NO limpiamos materiales aquí
                                  }
                                }}
                                className="mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${isRemoved ? 'text-red-400 line-through' : 'text-slate-100'}`}>
                                    {worker.full_name}
                                  </span>
                                  {worker.contract_type && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${worker.contract_type === 'por_dia'
                                      ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
                                      : 'bg-green-600/20 text-green-400 border border-green-600/30'
                                      }`}>
                                      {worker.contract_type === 'por_dia' ? 'Por Día' : 'A Trato'}
                                    </span>
                                  )}
                                </div>
                                {isRemoved && (
                                  <span className="ml-2 text-xs text-red-400">(Removido)</span>
                                )}
                              </div>
                            </label>

                            {/* Campos para editar timestamps (solo en modo editar y si está seleccionado) */}
                            {isSelected && !isRemoved && worker.assignment_id && (
                              <div className="p-3 bg-slate-800 border-t border-slate-600 space-y-3">
                                <div className="text-xs font-medium text-slate-300 mb-2">Tiempos de Trabajo</div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">
                                      Fecha/Hora de Inicio
                                    </label>
                                    <input
                                      type="datetime-local"
                                      value={(() => {
                                        if (!workerTimestamps[worker.assignment_id]?.started_at) return ''
                                        const date = new Date(workerTimestamps[worker.assignment_id].started_at)
                                        // Convertir a formato local (YYYY-MM-DDTHH:mm) sin zona horaria
                                        const year = date.getFullYear()
                                        const month = String(date.getMonth() + 1).padStart(2, '0')
                                        const day = String(date.getDate()).padStart(2, '0')
                                        const hours = String(date.getHours()).padStart(2, '0')
                                        const minutes = String(date.getMinutes()).padStart(2, '0')
                                        return `${year}-${month}-${day}T${hours}:${minutes}`
                                      })()}
                                      onChange={(e) => {
                                        if (!e.target.value) {
                                          setWorkerTimestamps(prev => ({
                                            ...prev,
                                            [worker.assignment_id]: {
                                              ...prev[worker.assignment_id],
                                              started_at: ''
                                            }
                                          }))
                                          return
                                        }
                                        // El input datetime-local devuelve un string en formato YYYY-MM-DDTHH:mm
                                        // que representa una hora local. new Date() lo interpreta como hora local
                                        // y toISOString() lo convierte correctamente a UTC
                                        const localDate = new Date(e.target.value)
                                        setWorkerTimestamps(prev => ({
                                          ...prev,
                                          [worker.assignment_id]: {
                                            ...prev[worker.assignment_id],
                                            started_at: localDate.toISOString()
                                          }
                                        }))
                                      }}
                                      className="w-full px-2 py-1.5 text-xs border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">
                                      Fecha/Hora de Finalización
                                    </label>
                                    <input
                                      type="datetime-local"
                                      value={(() => {
                                        if (!workerTimestamps[worker.assignment_id]?.completed_at) return ''
                                        const date = new Date(workerTimestamps[worker.assignment_id].completed_at)
                                        // Convertir a formato local (YYYY-MM-DDTHH:mm) sin zona horaria
                                        const year = date.getFullYear()
                                        const month = String(date.getMonth() + 1).padStart(2, '0')
                                        const day = String(date.getDate()).padStart(2, '0')
                                        const hours = String(date.getHours()).padStart(2, '0')
                                        const minutes = String(date.getMinutes()).padStart(2, '0')
                                        return `${year}-${month}-${day}T${hours}:${minutes}`
                                      })()}
                                      onChange={(e) => {
                                        if (!e.target.value) {
                                          setWorkerTimestamps(prev => ({
                                            ...prev,
                                            [worker.assignment_id]: {
                                              ...prev[worker.assignment_id],
                                              completed_at: ''
                                            }
                                          }))
                                          return
                                        }
                                        // El input datetime-local devuelve un string en formato YYYY-MM-DDTHH:mm
                                        // que representa una hora local. new Date() lo interpreta como hora local
                                        // y toISOString() lo convierte correctamente a UTC
                                        const localDate = new Date(e.target.value)
                                        setWorkerTimestamps(prev => ({
                                          ...prev,
                                          [worker.assignment_id]: {
                                            ...prev[worker.assignment_id],
                                            completed_at: localDate.toISOString()
                                          }
                                        }))
                                      }}
                                      className="w-full px-2 py-1.5 text-xs border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* En modo editar, NO mostramos la sección de materiales aquí (solo en la sección de materiales) */}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No hay trabajadores asignados a esta tarea</p>
                  )
                ) : (
                  // Tab: Disponibles (trabajadores del proyecto con contrato activo que NO están asignados)
                  loadingWorkers ? (
                    <p className="text-sm text-slate-400">Cargando trabajadores...</p>
                  ) : availableWorkersForEdit.length > 0 ? (
                    <div className="space-y-4">
                      {availableWorkersForEdit.map(worker => {
                        const isSelected = selectedWorkers.includes(worker.id)
                        const deliveries = workerDeliveries[worker.id] || []
                        const selectedDelivery = workerMaterialDeliveries[worker.id] || []
                        const isLoading = loadingDeliveries[worker.id] || false

                        return (
                          <div key={worker.id} className="border border-slate-600 rounded-md overflow-hidden">
                            <label className="flex items-center p-3 bg-slate-700 hover:bg-slate-600 cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!isSelected && (
                                  (worker.contract_type === 'por_dia' && hasATratoSelected) ||
                                  (worker.contract_type === 'a_trato' && hasPorDiaSelected)
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Validar bloqueo mutuo
                                    if (worker.contract_type === 'por_dia' && hasATratoSelected) {
                                      toast.error('No puedes seleccionar trabajadores "Por Día" si ya tienes trabajadores "A Trato" seleccionados')
                                      return
                                    }
                                    if (worker.contract_type === 'a_trato' && hasPorDiaSelected) {
                                      toast.error('No puedes seleccionar trabajadores "A Trato" si ya tienes trabajadores "Por Día" seleccionados')
                                      return
                                    }
                                    setSelectedWorkers(prev => [...prev, worker.id])
                                    // En modo editar, NO cargamos entregas (solo se ven en la sección de materiales)
                                  } else {
                                    setSelectedWorkers(prev => prev.filter(id => id !== worker.id))
                                    // En modo editar, NO limpiamos materiales aquí
                                  }
                                }}
                                className="mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-100">{worker.full_name}</span>
                                {worker.contract_type && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${worker.contract_type === 'por_dia'
                                    ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
                                    : 'bg-green-600/20 text-green-400 border border-green-600/30'
                                    }`}>
                                    {worker.contract_type === 'por_dia' ? 'Por Día' : 'A Trato'}
                                  </span>
                                )}
                              </div>
                            </label>

                            {/* En modo editar, NO mostramos la sección de materiales aquí (solo en la sección de materiales) */}
                          </div>
                        )
                      })}
                    </div>
                  ) : formData.project_id ? (
                    <p className="text-sm text-slate-400">No hay trabajadores disponibles con contrato activo en este proyecto</p>
                  ) : (
                    <p className="text-sm text-slate-400">Selecciona un proyecto para ver los trabajadores disponibles</p>
                  )
                )
              ) : (
                // Modo crear: mostrar trabajadores separados por tipo de contrato en tabs
                <>
                  {/* Tabs de tipo de contrato */}
                  <div className="mb-4 flex gap-2 border-b border-slate-600">
                    <button
                      type="button"
                      onClick={() => {
                        if (allowMixedContracts || !hasATratoSelected) {
                          setActiveContractTypeTab('por_dia')
                        }
                      }}
                      disabled={!allowMixedContracts && hasATratoSelected}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${activeContractTypeTab === 'por_dia'
                        ? 'text-yellow-400 border-b-2 border-yellow-400'
                        : !allowMixedContracts && hasATratoSelected
                          ? 'text-slate-500 cursor-not-allowed opacity-50'
                          : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      Por Día ({workersPorDia.length})
                      {!allowMixedContracts && hasATratoSelected && (
                        <span className="ml-2 text-xs text-red-400">(Bloqueado)</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (allowMixedContracts || !hasPorDiaSelected) {
                          setActiveContractTypeTab('a_trato')
                        }
                      }}
                      disabled={!allowMixedContracts && hasPorDiaSelected}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${activeContractTypeTab === 'a_trato'
                        ? 'text-green-400 border-b-2 border-green-400'
                        : !allowMixedContracts && hasPorDiaSelected
                          ? 'text-slate-500 cursor-not-allowed opacity-50'
                          : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      A Trato ({workersATrato.length})
                      {!allowMixedContracts && hasPorDiaSelected && (
                        <span className="ml-2 text-xs text-red-400">(Bloqueado)</span>
                      )}
                    </button>
                  </div>

                  {/* Mensaje de bloqueo - Solo mostrar si NO está permitido mezclar */}
                  {!allowMixedContracts && (hasPorDiaSelected || hasATratoSelected) && (
                    <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-md">
                      <p className="text-sm text-yellow-400">
                        {hasPorDiaSelected && hasATratoSelected
                          ? '⚠️ No puedes seleccionar trabajadores "Por Día" y "A Trato" al mismo tiempo. Deselecciona uno de los tipos para continuar.'
                          : hasPorDiaSelected
                            ? '⚠️ Tienes trabajadores "Por Día" seleccionados. Deselecciónalos para poder seleccionar trabajadores "A Trato".'
                            : '⚠️ Tienes trabajadores "A Trato" seleccionados. Deselecciónalos para poder seleccionar trabajadores "Por Día".'}
                      </p>
                    </div>
                  )}

                  {/* Contenido según tab activo */}
                  {activeContractTypeTab === 'por_dia' ? (
                    // Tab: Por Día
                    loadingWorkers ? (
                      <p className="text-sm text-slate-400">Cargando trabajadores...</p>
                    ) : workersPorDia.length > 0 ? (
                      <div className="space-y-4">
                        {workersPorDia.map(worker => {
                          const isSelected = selectedWorkers.includes(worker.id)
                          const deliveries = workerDeliveries[worker.id] || []
                          const selectedDelivery = workerMaterialDeliveries[worker.id] || []
                          const isLoading = loadingDeliveries[worker.id] || false

                          return (
                            <div key={worker.id} className="border border-slate-600 rounded-md overflow-hidden">
                              <label className="flex items-center p-3 bg-slate-700 hover:bg-slate-600 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      // Verificar que no haya trabajadores "a_trato" seleccionados (solo si no está permitido mezclar)
                                      if (!allowMixedContracts && hasATratoSelected) {
                                        toast.error('No puedes seleccionar trabajadores "Por Día" si ya tienes trabajadores "A Trato" seleccionados. Activa la opción "Permitir mezclar" si necesitas ambos tipos.')
                                        return
                                      }
                                      setSelectedWorkers(prev => [...prev, worker.id])
                                      if (!workerDeliveries[worker.id]) {
                                        loadWorkerDeliveries(worker.id)
                                      }
                                    } else {
                                      setSelectedWorkers(prev => prev.filter(id => id !== worker.id))
                                      setWorkerMaterialDeliveries(prev => {
                                        const newState = { ...prev }
                                        delete newState[worker.id]
                                        return newState
                                      })
                                    }
                                  }}
                                  className="mr-2"
                                />
                                <div className="flex-1 flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-100">{worker.full_name}</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-600/20 text-yellow-400 border border-yellow-600/30">
                                    Por Día
                                  </span>
                                </div>
                              </label>

                              {isSelected && (
                                <div className="p-3 bg-slate-800 border-t border-slate-600">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMaterialsSectionExpanded(prev => ({
                                        ...prev,
                                        [worker.id]: !prev[worker.id]
                                      }))
                                    }}
                                    className="w-full flex items-center justify-between text-xs font-medium text-slate-300 mb-2 hover:text-slate-100 transition-colors"
                                  >
                                    <span>
                                      Entregas de Materiales (Múltiple selección)
                                      {!isLoading && deliveries.length > 0 && (
                                        <span className="ml-2 text-slate-400">({deliveries.length})</span>
                                      )}
                                    </span>
                                    <svg
                                      className={`w-4 h-4 transition-transform ${materialsSectionExpanded[worker.id] ? 'rotate-180' : ''}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  {materialsSectionExpanded[worker.id] && (
                                    <>
                                      {isLoading ? (
                                        <p className="text-xs text-slate-400">Cargando entregas...</p>
                                      ) : deliveries.length > 0 ? (
                                        <>
                                          <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-700 border border-slate-600 rounded-md p-3">
                                            {deliveries.map((delivery: any) => {
                                              const isSelected = selectedDelivery.includes(delivery.id)
                                              return (
                                                <label
                                                  key={delivery.id}
                                                  className="flex items-start gap-3 p-2 rounded-md hover:bg-slate-600 cursor-pointer transition-colors"
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                      if (e.target.checked) {
                                                        setWorkerMaterialDeliveries(prev => ({
                                                          ...prev,
                                                          [worker.id]: [...(prev[worker.id] || []), delivery.id]
                                                        }))
                                                      } else {
                                                        setWorkerMaterialDeliveries(prev => ({
                                                          ...prev,
                                                          [worker.id]: (prev[worker.id] || []).filter(id => id !== delivery.id)
                                                        }))
                                                      }
                                                    }}
                                                    className="mt-1 w-4 h-4 text-blue-600 bg-slate-700 border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                                                  />
                                                  <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-slate-100">
                                                      {delivery.materials?.name || 'Material'}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                      {delivery.quantity} {delivery.materials?.unit || 'un'} • {new Date(delivery.created_at).toLocaleDateString('es-CL')}
                                                    </div>
                                                  </div>
                                                </label>
                                              )
                                            })}
                                          </div>
                                          {selectedDelivery.length > 0 && (
                                            <p className="text-xs text-slate-400 mt-2">
                                              {selectedDelivery.length} entrega{selectedDelivery.length > 1 ? 's' : ''} seleccionada{selectedDelivery.length > 1 ? 's' : ''}
                                            </p>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-xs text-slate-400">No hay entregas registradas para este trabajador</p>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : formData.project_id ? (
                      <p className="text-sm text-slate-400">No hay trabajadores &quot;Por Día&quot; disponibles en este proyecto</p>
                    ) : (
                      <p className="text-sm text-slate-400">Selecciona un proyecto para ver los trabajadores disponibles</p>
                    )
                  ) : activeContractTypeTab === 'a_trato' ? (
                    // Tab: A Trato
                    loadingWorkers ? (
                      <p className="text-sm text-slate-400">Cargando trabajadores...</p>
                    ) : workersATrato.length > 0 ? (
                      <div className="space-y-4">
                        {workersATrato.map(worker => {
                          const isSelected = selectedWorkers.includes(worker.id)
                          const deliveries = workerDeliveries[worker.id] || []
                          const selectedDelivery = workerMaterialDeliveries[worker.id] || []
                          const isLoading = loadingDeliveries[worker.id] || false

                          return (
                            <div key={worker.id} className="border border-slate-600 rounded-md overflow-hidden">
                              <label className="flex items-center p-3 bg-slate-700 hover:bg-slate-600 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      // Verificar que no haya trabajadores "por_dia" seleccionados (solo si no está permitido mezclar)
                                      if (!allowMixedContracts && hasPorDiaSelected) {
                                        toast.error('No puedes seleccionar trabajadores "A Trato" si ya tienes trabajadores "Por Día" seleccionados. Activa la opción "Permitir mezclar" si necesitas ambos tipos.')
                                        return
                                      }
                                      setSelectedWorkers(prev => [...prev, worker.id])
                                      if (!workerDeliveries[worker.id]) {
                                        loadWorkerDeliveries(worker.id)
                                      }
                                    } else {
                                      setSelectedWorkers(prev => prev.filter(id => id !== worker.id))
                                      setWorkerMaterialDeliveries(prev => {
                                        const newState = { ...prev }
                                        delete newState[worker.id]
                                        return newState
                                      })
                                    }
                                  }}
                                  className="mr-2"
                                />
                                <div className="flex-1 flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-100">{worker.full_name}</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-600/20 text-green-400 border border-green-600/30">
                                    A Trato
                                  </span>
                                </div>
                              </label>

                              {isSelected && (
                                <div className="p-3 bg-slate-800 border-t border-slate-600">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMaterialsSectionExpanded(prev => ({
                                        ...prev,
                                        [worker.id]: !prev[worker.id]
                                      }))
                                    }}
                                    className="w-full flex items-center justify-between text-xs font-medium text-slate-300 mb-2 hover:text-slate-100 transition-colors"
                                  >
                                    <span>
                                      Entregas de Materiales (Múltiple selección)
                                      {!isLoading && deliveries.length > 0 && (
                                        <span className="ml-2 text-slate-400">({deliveries.length})</span>
                                      )}
                                    </span>
                                    <svg
                                      className={`w-4 h-4 transition-transform ${materialsSectionExpanded[worker.id] ? 'rotate-180' : ''}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  {materialsSectionExpanded[worker.id] && (
                                    <>
                                      {isLoading ? (
                                        <p className="text-xs text-slate-400">Cargando entregas...</p>
                                      ) : deliveries.length > 0 ? (
                                        <>
                                          <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-700 border border-slate-600 rounded-md p-3">
                                            {deliveries.map((delivery: any) => {
                                              const isSelected = selectedDelivery.includes(delivery.id)
                                              return (
                                                <label
                                                  key={delivery.id}
                                                  className="flex items-start gap-3 p-2 rounded-md hover:bg-slate-600 cursor-pointer transition-colors"
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                      if (e.target.checked) {
                                                        setWorkerMaterialDeliveries(prev => ({
                                                          ...prev,
                                                          [worker.id]: [...(prev[worker.id] || []), delivery.id]
                                                        }))
                                                      } else {
                                                        setWorkerMaterialDeliveries(prev => ({
                                                          ...prev,
                                                          [worker.id]: (prev[worker.id] || []).filter(id => id !== delivery.id)
                                                        }))
                                                      }
                                                    }}
                                                    className="mt-1 w-4 h-4 text-blue-600 bg-slate-700 border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                                                  />
                                                  <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-slate-100">
                                                      {delivery.materials?.name || 'Material'}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                      {delivery.quantity} {delivery.materials?.unit || 'un'} • {new Date(delivery.created_at).toLocaleDateString('es-CL')}
                                                    </div>
                                                  </div>
                                                </label>
                                              )
                                            })}
                                          </div>
                                          {selectedDelivery.length > 0 && (
                                            <p className="text-xs text-slate-400 mt-2">
                                              {selectedDelivery.length} entrega{selectedDelivery.length > 1 ? 's' : ''} seleccionada{selectedDelivery.length > 1 ? 's' : ''}
                                            </p>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-xs text-slate-400">No hay entregas registradas para este trabajador</p>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : formData.project_id ? (
                      <p className="text-sm text-slate-400">No hay trabajadores &quot;A Trato&quot; disponibles en este proyecto</p>
                    ) : (
                      <p className="text-sm text-slate-400">Selecciona un proyecto para ver los trabajadores disponibles</p>
                    )
                  ) : (
                    // Sin tab seleccionado
                    <div className="text-center py-8">
                      <p className="text-sm text-slate-400">Selecciona un tipo de contrato para ver los trabajadores disponibles</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Fechas y Presupuesto */}
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-4">Fechas y Presupuesto</h4>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Horas Estimadas
              </label>
              <input
                type="number"
                min="1"
                value={formData.estimated_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 8"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Presupuesto Total ($) *
                {!allowMixedContracts && hasOnlyPorDia && (
                  <span className="ml-2 text-xs text-yellow-400">(Solo trabajadores &quot;Por Día&quot;)</span>
                )}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.total_budget}
                onChange={(e) => {
                  if (allowMixedContracts || !hasOnlyPorDia) {
                    setFormData(prev => ({ ...prev, total_budget: e.target.value }))
                  }
                }}
                disabled={!allowMixedContracts && hasOnlyPorDia}
                className={`w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!allowMixedContracts && hasOnlyPorDia ? 'opacity-50 cursor-not-allowed bg-slate-800' : ''
                  }`}
                placeholder="0"
                required
              />
              {!allowMixedContracts && hasOnlyPorDia && (
                <p className="mt-1 text-xs text-yellow-400">
                  Los trabajadores &quot;Por Día&quot; no reciben pago por tarea. El presupuesto se establece en 0.
                </p>
              )}
              {allowMixedContracts && hasPorDiaSelected && (
                <p className="mt-1 text-xs text-yellow-400">
                  ⚠️ Los trabajadores &quot;Por Día&quot; no recibirán pago y su distribución no será modificable.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Notas
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Notas adicionales..."
          />
        </div>

        {/* Botones */}
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
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            {submitting ? 'Guardando...' : mode === 'create' ? 'Crear Tarea' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </ModalV2>
  )
}
