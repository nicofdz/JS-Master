'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useWorkers, Worker } from '@/hooks/useWorkers'
import { useContracts, Contract } from '@/hooks/useContracts'
import { useProjects } from '@/hooks/useProjects'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { WorkerForm } from '@/components/workers/WorkerForm'
import { Plus, Search, Edit, Trash2, User, Users, UserCheck, UserX, FileText, RotateCcw, History, Clock, ChevronLeft, ChevronRight, Layers, Filter, XCircle, TrendingUp, UserMinus } from 'lucide-react'
import { StatusFilterCards } from '@/components/common/StatusFilterCards'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { ContractFiltersSidebar } from '@/components/workers/ContractFiltersSidebar'
import { WorkerEfficiencyModal } from '@/components/workers/WorkerEfficiencyModal'
import { TerminateContractModal } from '@/components/workers/TerminateContractModal'
import { formatDateToChilean } from '@/lib/contracts'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function TrabajadoresPage() {
  const { profile } = useAuth()
  const { workers, loading, error, createWorker, updateWorker, deleteWorker, restoreWorker, hardDeleteWorker, toggleWorkerStatus, refresh, refreshAll } = useWorkers()
  const { contracts, loading: contractsLoading, createContract, updateContract, deleteContract, restoreContract, hardDeleteContract, terminateContract, fetchContracts, checkAllContracts } = useContracts()
  const { projects } = useProjects()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('all')
  const [cardFilter, setCardFilter] = useState<'all' | 'active' | 'inactive'>('active') // Por defecto 'active'

  // Estados para filtros de contratos
  const [contractCardFilter, setContractCardFilter] = useState<'all' | 'active' | 'finalized'>('active') // Por defecto 'active'
  const [contractTypeButtonFilter, setContractTypeButtonFilter] = useState<string>('all') // 'all', 'por_dia', 'a_trato'
  const [contractSearchTerm, setContractSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false)

  // Toggle entre vista de trabajadores y contratos
  const [currentView, setCurrentView] = useState<'workers' | 'contracts'>('workers')

  // Estados para la vista de contratos
  const [contractProjectFilter, setContractProjectFilter] = useState<string>('all')
  const [contractWorkerFilter, setContractWorkerFilter] = useState<string>('all')
  const [contractStatusFilter, setContractStatusFilter] = useState<string>('all')
  const [contractTypeFilterContracts, setContractTypeFilterContracts] = useState<string>('all')

  const [contractDateFilter, setContractDateFilter] = useState<string>('')
  const [showTrash, setShowTrash] = useState(false) // Estado para la papelera de contratos
  const [showCreateContractModal, setShowCreateContractModal] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [contractFormData, setContractFormData] = useState({
    worker_id: '',
    project_id: '',
    fecha_inicio: '',
    fecha_termino: '',
    contract_type: '',
    daily_rate: '',
    status: 'activo',
    contract_number: '',
    notes: '',
    is_renovacion: false
  })
  const [isIndefiniteContract, setIsIndefiniteContract] = useState(false)
  const [fechaEntradaEmpresa, setFechaEntradaEmpresa] = useState('')

  // Estados para el modal de historial de contratos
  const [showContractHistoryModal, setShowContractHistoryModal] = useState(false)
  const [selectedWorkerForHistory, setSelectedWorkerForHistory] = useState<Worker | null>(null)
  const [contractHistoryFilter, setContractHistoryFilter] = useState<string>('all')

  // Estados para el modal de generación de pacto de horas
  const [showHoursModal, setShowHoursModal] = useState(false)
  const [selectedContractForHours, setSelectedContractForHours] = useState<Contract | null>(null)
  const [hoursFormData, setHoursFormData] = useState({
    fecha_inicio: '',
    fecha_termino: ''
  })

  const [contractToRestore, setContractToRestore] = useState<number | null>(null)

  // Efficiency Report States
  const [showEfficiencyModal, setShowEfficiencyModal] = useState(false)
  const [selectedWorkerForEfficiency, setSelectedWorkerForEfficiency] = useState<{ id: number, name: string } | null>(null)

  // Estados para modales de confirmación
  const [confirmDeleteWorkerState, setConfirmDeleteWorkerState] = useState<{ isOpen: boolean, workerId: number | null }>({ isOpen: false, workerId: null })

  const [confirmRestoreWorkerState, setConfirmRestoreWorkerState] = useState<{ isOpen: boolean, workerId: number | null }>({ isOpen: false, workerId: null })
  const [confirmHardDeleteWorkerState, setConfirmHardDeleteWorkerState] = useState<{ isOpen: boolean, workerId: number | null }>({ isOpen: false, workerId: null }) // Nuevo estado para hard delete
  const [cannotDeleteModalState, setCannotDeleteModalState] = useState({ isOpen: false, message: '' }) // Nuevo modal de alerta

  const [showWorkerTrash, setShowWorkerTrash] = useState(false) // Nuevo estado para papelera de trabajadores
  const [confirmDeleteContractState, setConfirmDeleteContractState] = useState<{ isOpen: boolean, contractId: number | null }>({ isOpen: false, contractId: null })
  // Estados para confirmación de contratos
  const [confirmRestoreContractState, setConfirmRestoreContractState] = useState<{ isOpen: boolean, contractId: number | null }>({ isOpen: false, contractId: null })
  const [confirmHardDeleteContractState, setConfirmHardDeleteContractState] = useState<{ isOpen: boolean, contractId: number | null }>({ isOpen: false, contractId: null })

  // Estado para terminación de contrato
  const [showTerminateContractModal, setShowTerminateContractModal] = useState(false)
  const [contractToTerminate, setContractToTerminate] = useState<Contract | null>(null)

  // Estados para paginación (Performance)
  const [currentPage, setCurrentPage] = useState(1)
  // Estados para paginación (Performance)
  const [itemsPerPage] = useState(50)

  // Estado para datos iniciales de creación (desde URL)
  const [initialWorkerData, setInitialWorkerData] = useState<any>(null)

  // Checking URL params for "Quick Hire" action
  useEffect(() => {
    // Basic implementation to parse query params without using useSearchParams hook directly
    // to avoid suspense boundaries issues if not already properly set up
    const searchParams = new URLSearchParams(window.location.search)
    const action = searchParams.get('action')

    if (action === 'create') {
      const name = searchParams.get('name') || ''
      const rut = searchParams.get('rut') || ''
      const email = searchParams.get('email') || ''
      const phone = searchParams.get('phone') || ''

      setInitialWorkerData({
        full_name: name,
        rut: rut,
        email: email,
        phone: phone
      })
      setShowCreateModal(true)

      // Clean URL
      window.history.replaceState({}, '', '/trabajadores')
    }
  }, [])

  // Refrescar datos al cambiar vista de papelera de contratos
  useEffect(() => {
    fetchContracts()
  }, [showTrash])

  // Refrescar datos al cambiar vista de papelera de trabajadores
  useEffect(() => {
    if (showWorkerTrash) {
      refreshAll()
    } else {
      refresh()
    }
  }, [showWorkerTrash])

  // Función para validar contratos duplicados/solapados
  const validateContractOverlap = async (
    workerId: number,
    projectId: number,
    startDate: string,
    endDate: string | null,
    excludeContractId?: number
  ): Promise<boolean> => {
    try {
      // Buscar contratos del mismo trabajador en el mismo proyecto
      const overlappingContracts = contracts.filter(contract => {
        // Excluir el contrato actual si estamos editando
        if (excludeContractId && contract.id === excludeContractId) {
          return false
        }

        // Debe ser del mismo trabajador y proyecto
        if (contract.worker_id !== workerId || contract.project_id !== projectId) {
          return false
        }

        // Solo considerar contratos activos (no cancelados ni finalizados)
        if (contract.status !== 'activo' || !contract.is_active) {
          return false
        }

        const contractStart = new Date(contract.fecha_inicio)
        const contractEnd = contract.fecha_termino ? new Date(contract.fecha_termino) : null
        const newStart = new Date(startDate)
        const newEnd = endDate ? new Date(endDate) : null

        // Si el contrato existente es indefinido o el nuevo es indefinido, hay solapamiento
        if (!contractEnd || !newEnd) {
          return true
        }

        // Verificar solapamiento de fechas
        return (
          (newStart >= contractStart && newStart <= contractEnd) ||
          (newEnd >= contractStart && newEnd <= contractEnd) ||
          (newStart <= contractStart && newEnd >= contractEnd)
        )
      })

      if (overlappingContracts.length > 0) {
        const contract = overlappingContracts[0]
        const workerName = workers.find(w => w.id === workerId)?.full_name || 'Desconocido'
        const projectName = projects.find(p => p.id === projectId)?.name || 'Desconocido'

        toast.error(
          `Ya existe un contrato activo para ${workerName} en el proyecto ${projectName} con fechas solapadas (${contract.fecha_inicio} - ${contract.fecha_termino || 'Indefinido'})`,
          { duration: 6000 }
        )
        return false
      }

      return true
    } catch (error) {
      console.error('Error validating contract overlap:', error)
      return true // En caso de error, permitir continuar
    }
  }

  // Filtrar trabajadores con useMemo para performance
  const filteredWorkers = useMemo(() => workers.filter(worker => {
    const matchesSearch = worker.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.phone?.includes(searchTerm)
    // Verificar si tiene al menos un contrato activo
    const hasActiveContract = contracts.some(contract =>
      contract.worker_id === worker.id && contract.status === 'activo'
    )

    // Filtro de Papelera independiente para trabajadores
    if (showWorkerTrash) {
      return worker.is_deleted && matchesSearch
    }

    // Vista normal: Ocultar eliminados
    if (worker.is_deleted) return false

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && worker.is_active && hasActiveContract) ||
      (statusFilter === 'inactive' && worker.is_active && !hasActiveContract) || // Ajustado para lógica de activos/inactivos según contratos
      (statusFilter === 'deleted' && worker.is_deleted) // Este caso ya no debería ocurrir aquí porsque is_deleted se filtra antes, pero se mantiene por compatibilidad inversa temporal

    // Simplificamos la logica de active/inactive basada en si tiene contratos o no, o si el worker está marcado como inactivo manualmente
    const isWorkerActive = worker.is_active

    const matchesContractType = contractTypeFilter === 'all' ||
      (worker as any).contract_type === contractTypeFilter

    // Filtro de tarjetas revisado
    const matchesCardFilter = cardFilter === 'all' ||
      (cardFilter === 'active' && isWorkerActive) ||
      (cardFilter === 'inactive' && !isWorkerActive)

    // Filtro de Seguridad para Supervisores (Visibilidad)
    // Solo mostrar trabajadores que tengan contratos en los proyectos asignados (presentes en la lista 'contracts')
    let isVisibleForSupervisor = true
    if (profile?.role !== 'admin') {
      isVisibleForSupervisor = contracts.some(c => c.worker_id === worker.id)
    }

    return matchesSearch && matchesStatus && matchesContractType && matchesCardFilter && isVisibleForSupervisor
  }), [workers, searchTerm, statusFilter, contractTypeFilter, cardFilter, contracts, showWorkerTrash, profile])

  // Filtrar contratos con useMemo para performance
  const filteredContracts = useMemo(() => contracts.filter(contract => {
    const matchesProject = contractProjectFilter === 'all' || contract.project_id === parseInt(contractProjectFilter)
    const matchesWorker = contractWorkerFilter === 'all' || contract.worker_id === parseInt(contractWorkerFilter)
    const matchesStatus = contractStatusFilter === 'all' ||
      (contractStatusFilter === 'indefinite' ? !contract.fecha_termino : contract.status === contractStatusFilter)
    const matchesType = contractTypeFilterContracts === 'all' || contract.contract_type === contractTypeFilterContracts

    // Filtro de búsqueda
    const matchesSearch = contractSearchTerm === '' ||
      contract.worker_name?.toLowerCase().includes(contractSearchTerm.toLowerCase()) ||
      contract.project_name?.toLowerCase().includes(contractSearchTerm.toLowerCase()) ||
      contract.contract_number?.toLowerCase().includes(contractSearchTerm.toLowerCase()) ||
      contract.notes?.toLowerCase().includes(contractSearchTerm.toLowerCase())

    // Filtros de tarjetas de contratos
    const matchesContractCardFilter = contractCardFilter === 'all' ||
      (contractCardFilter === 'active' && contract.status === 'activo' && contract.is_active) ||
      (contractCardFilter === 'finalized' && contract.status === 'finalizado' && contract.is_active)

    // Filtros de botones de tipo de contrato
    const matchesContractTypeButtonFilter = contractTypeButtonFilter === 'all' || contract.contract_type === contractTypeButtonFilter

    // Filtro por Mes y Año (Solapamiento)
    const matchesDateRange = (() => {
      if (!contractDateFilter) return true

      // contractDateFilter viene como "YYYY-MM"
      const [yearStr, monthStr] = contractDateFilter.split('-')
      const year = parseInt(yearStr)
      const month = parseInt(monthStr) - 1 // JS months are 0-indexed

      // Rango del filtro: primer y último día del mes seleccionado
      const filtroInicio = new Date(year, month, 1)
      const filtroFin = new Date(year, month + 1, 0) // Último día del mes

      const contractInicio = new Date(contract.fecha_inicio)
      // Si no tiene fecha de término, asumimos futuro muy lejano
      const contractFin = contract.fecha_termino ? new Date(contract.fecha_termino) : new Date(8640000000000000)

      // Lógica de solapamiento: (StartA <= EndB) AND (EndA >= StartB)
      return (contractInicio <= filtroFin) && (contractFin >= filtroInicio)
    })()

    // Filtro de Papelera
    if (showTrash) {
      // En la papelera mostramos solo lo eliminado (is_active: false)
      return !contract.is_active && matchesSearch
    }

    // Vista normal: solo activos (is_active: true) + resto de filtros
    if (!contract.is_active) return false

    return matchesProject && matchesWorker && matchesStatus && matchesType && matchesSearch && matchesContractCardFilter && matchesContractTypeButtonFilter && matchesDateRange
  }).sort((a, b) => {
    // Ordenar: activos primero, inactivos al final
    if (a.status === 'activo' && b.status !== 'activo') return -1
    if (a.status !== 'activo' && b.status === 'activo') return 1
    return 0
  }), [
    contracts,
    contractProjectFilter,
    contractWorkerFilter,
    contractStatusFilter,
    contractTypeFilterContracts,
    contractSearchTerm,
    contractCardFilter,
    contractTypeButtonFilter,
    contractDateFilter,
    showTrash
  ])

  // Paginación de contratos
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage)
  const paginatedContracts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredContracts.slice(startIndex, endIndex)
  }, [filteredContracts, currentPage, itemsPerPage])

  // Funciones para contratos
  const handleCreateContract = () => {
    setContractFormData({
      worker_id: '',
      project_id: '',
      fecha_inicio: '',
      fecha_termino: '',
      contract_type: '',
      daily_rate: '',
      status: 'activo',
      contract_number: '',
      notes: '',
      is_renovacion: false
    })
    setIsIndefiniteContract(false)
    setEditingContract(null)
    setShowCreateContractModal(true)
  }

  const handleEditContract = (contract: Contract) => {
    const isIndefinite = !contract.fecha_termino
    setContractFormData({
      worker_id: contract.worker_id?.toString() || '',
      project_id: contract.project_id?.toString() || '',
      fecha_inicio: contract.fecha_inicio || '',
      fecha_termino: contract.fecha_termino || '',
      contract_type: contract.contract_type || '',
      daily_rate: contract.daily_rate?.toString() || '',
      status: contract.status || 'activo',
      contract_number: contract.contract_number || '',
      notes: contract.notes || '',
      is_renovacion: contract.is_renovacion || false
    })
    setIsIndefiniteContract(isIndefinite)
    setEditingContract(contract)
    setShowCreateContractModal(true)
  }

  const handleDeleteContract = (contractId: number) => {
    setConfirmDeleteContractState({ isOpen: true, contractId })
  }

  const executeDeleteContract = async () => {
    if (!confirmDeleteContractState.contractId) return

    try {
      await deleteContract(confirmDeleteContractState.contractId)
      toast.success('Contrato eliminado correctamente')
      setConfirmDeleteContractState({ isOpen: false, contractId: null })
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar contrato')
    }
  }

  const handleRestoreContract = async (contractId: number) => {
    try {
      await restoreContract(contractId)
      toast.success('Contrato restaurado correctamente')
    } catch (error: any) {
      toast.error(error.message || 'Error al restaurar contrato')
    }
  }

  const handleHardDeleteContract = async (contractId: number) => {
    try {
      await hardDeleteContract(contractId)
      toast.success('Contrato eliminado permanentemente')
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar contrato')
    }
  }

  const handleTerminateContract = (contract: Contract) => {
    setContractToTerminate(contract)
    setShowTerminateContractModal(true)
  }

  const executeTerminateContract = async (data: { date: string; type: string; reason: string }) => {
    if (!contractToTerminate) return

    try {
      await terminateContract(contractToTerminate.id, data)
      toast.success('Contrato terminado exitosamente')
      setShowTerminateContractModal(false)
      setContractToTerminate(null)
    } catch (error: any) {
      toast.error(error.message || 'Error al terminar contrato')
    }
  }

  // Función para generar código de contrato automáticamente
  const generateContractNumber = async (projectId: number) => {
    try {
      // Buscar contratos existentes para este proyecto
      const { data: existingContracts } = await supabase
        .from('contract_history')
        .select('contract_number')
        .eq('project_id', projectId)
        .order('contract_number', { ascending: false })

      let prefix = 'EDL' // Prefijo por defecto
      let nextNumber = 1

      if (existingContracts && existingContracts.length > 0) {
        // Usar el prefijo del último contrato existente
        const lastContract = existingContracts[0]
        const match = lastContract.contract_number.match(/^([A-Z]+)-C(\d+)$/)
        if (match) {
          prefix = match[1]
          nextNumber = parseInt(match[2]) + 1
        }
      } else {
        // Si no hay contratos existentes, generar prefijo del nombre del proyecto
        const { data: project } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single()

        if (project?.name) {
          prefix = project.name
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase())
            .join('')
            .substring(0, 3)
        }
      }

      // Formatear con 2 dígitos
      return `${prefix}-C${nextNumber.toString().padStart(2, '0')}`
    } catch (error) {
      console.error('Error generating contract number:', error)
      return 'EDL-C01'
    }
  }

  const handleGenerateDocuments = async (contract: Contract) => {
    try {
      // Buscar los datos del trabajador y proyecto
      const worker = workers.find(w => w.id === contract.worker_id)
      const project = projects.find(p => p.id === contract.project_id)

      if (!worker || !project) {
        toast.error('No se encontraron los datos del trabajador o proyecto')
        return
      }

      // Calcular fecha de entrada a la empresa
      let fechaEntradaEmpresa = contract.fecha_inicio
      if (contract.is_renovacion) {
        // Si es renovación, buscar el primer contrato del trabajador en este proyecto
        const workerContracts = contracts
          .filter(c =>
            c.worker_id === contract.worker_id &&
            c.project_id === contract.project_id
          )
          .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())

        if (workerContracts.length > 0) {
          fechaEntradaEmpresa = workerContracts[0].fecha_inicio
        }
      }

      // Preparar datos del contrato para la API
      const contractData = {
        // Datos del trabajador
        nombre_trabajador: worker.full_name,
        rut_trabajador: worker.rut,
        direccion: worker.direccion || 'No especificado',
        telefono: worker.phone || 'No especificado',
        correo: worker.email || 'No especificado',
        ciudad: worker.ciudad || 'No especificado', // Ciudad del trabajador
        ciudad_obra: project.city || 'No especificado', // Ciudad de la obra
        nacionalidad: worker.nacionalidad || 'Chilena',
        estado: worker.estado_civil || 'No especificado',
        fecha_nacimiento: worker.fecha_nacimiento
          ? formatDateToChilean(worker.fecha_nacimiento)
          : 'No especificado',
        prevision: worker.prevision || 'No especificado',
        salud: worker.salud || 'No especificado',

        // Datos del trabajo
        cargo: worker.cargo || 'Trabajador',
        nombre_obra: project.name,
        direccion_obra: project.address || 'No especificado',
        fecha_inicio: formatDateToChilean(contract.fecha_inicio),
        fecha_termino: contract.fecha_termino ? `HASTA ${formatDateToChilean(contract.fecha_termino)}` : 'INDEFINIDO',
        fecha_entrada_empresa: formatDateToChilean(fechaEntradaEmpresa)
      }

      // Llamar a la API para generar el contrato
      const response = await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData),
      })

      if (!response.ok) {
        throw new Error('Error al generar el contrato')
      }

      // Descargar el archivo ZIP
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `documentos-${worker.full_name}-${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Documentos generados y descargados correctamente')
    } catch (error: any) {
      console.error('Error generating documents:', error)
      toast.error(error.message || 'Error al generar documentos')
    }
  }

  const handleGenerateHoursOnly = (contract: Contract) => {
    // Abrir modal para seleccionar fechas del pacto de horas
    setSelectedContractForHours(contract)

    // Función para obtener fecha local en formato YYYY-MM-DD (zona horaria de Chile)
    const getLocalDateString = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Inicializar con fecha actual y +3 meses en zona local
    const today = new Date()
    const threeMonthsLater = new Date()
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)

    setHoursFormData({
      fecha_inicio: getLocalDateString(today),
      fecha_termino: getLocalDateString(threeMonthsLater)
    })
    setShowHoursModal(true)
  }

  const handleConfirmGenerateHours = async () => {
    if (!selectedContractForHours || !hoursFormData.fecha_inicio || !hoursFormData.fecha_termino) {
      toast.error('Por favor completa las fechas requeridas')
      return
    }

    try {
      // Buscar los datos del trabajador y proyecto
      const worker = workers.find(w => w.id === selectedContractForHours.worker_id)
      const project = projects.find(p => p.id === selectedContractForHours.project_id)

      if (!worker || !project) {
        toast.error('No se encontraron los datos del trabajador o proyecto')
        return
      }

      // Preparar datos del contrato para la API con las fechas personalizadas
      const contractData = {
        // Datos del trabajador
        nombre_trabajador: worker.full_name,
        rut_trabajador: worker.rut,
        direccion: worker.direccion || 'No especificado',
        telefono: worker.phone || 'No especificado',
        correo: worker.email || 'No especificado',
        ciudad: worker.ciudad || 'No especificado',
        ciudad_obra: project.city || 'No especificado',
        nacionalidad: worker.nacionalidad || 'Chilena',
        estado: worker.estado_civil || 'No especificado',
        fecha_nacimiento: worker.fecha_nacimiento
          ? formatDateToChilean(worker.fecha_nacimiento)
          : 'No especificado',
        prevision: worker.prevision || 'No especificado',
        salud: worker.salud || 'No especificado',

        // Datos del trabajo
        cargo: worker.cargo || 'Trabajador',
        nombre_obra: project.name,
        direccion_obra: project.address || 'No especificado',
        // Usar las fechas seleccionadas en el modal
        fecha_inicio: formatDateToChilean(hoursFormData.fecha_inicio),
        fecha_termino: `HASTA ${formatDateToChilean(hoursFormData.fecha_termino)}`,

        // Indicar que solo queremos el pacto de horas
        documentType: 'hours'
      }

      // Llamar a la API para generar solo el pacto de horas
      const response = await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData),
      })

      if (!response.ok) {
        throw new Error('Error al generar el pacto de horas')
      }

      // Descargar el archivo DOCX
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pacto-horas-${worker.full_name}-${Date.now()}.docx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Pacto de horas generado y descargado correctamente')

      // Cerrar modal y limpiar
      setShowHoursModal(false)
      setSelectedContractForHours(null)
      setHoursFormData({ fecha_inicio: '', fecha_termino: '' })
    } catch (error: any) {
      console.error('Error generating hours document:', error)
      toast.error(error.message || 'Error al generar pacto de horas')
    }
  }

  const handleCloseHoursModal = () => {
    setShowHoursModal(false)
    setSelectedContractForHours(null)
    setHoursFormData({ fecha_inicio: '', fecha_termino: '' })
  }

  const handleCloseContractModal = () => {
    setShowCreateContractModal(false)
    setEditingContract(null)
    setIsIndefiniteContract(false)
    setFechaEntradaEmpresa('')
    setContractFormData({
      worker_id: '',
      project_id: '',
      fecha_inicio: '',
      fecha_termino: '',
      contract_type: '',
      daily_rate: '',
      status: 'activo',
      contract_number: '',
      notes: '',
      is_renovacion: false
    })
  }

  const handleContractFormChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      if (name === 'isIndefiniteContract') {
        setIsIndefiniteContract(checked)
        if (checked) {
          setContractFormData(prev => ({
            ...prev,
            fecha_termino: ''
          }))
        }
      } else if (name === 'is_renovacion') {
        setContractFormData(prev => ({
          ...prev,
          is_renovacion: checked
        }))

        // Si marca renovación, buscar el primer contrato del trabajador en este proyecto
        if (checked && contractFormData.worker_id && contractFormData.project_id) {
          const workerContracts = contracts
            .filter(c =>
              c.worker_id === parseInt(contractFormData.worker_id) &&
              c.project_id === parseInt(contractFormData.project_id)
            )
            .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())

          if (workerContracts.length > 0) {
            // Usar la fecha del primer contrato
            setFechaEntradaEmpresa(workerContracts[0].fecha_inicio)
          } else {
            // Si no hay contratos previos, usar la fecha de inicio actual
            setFechaEntradaEmpresa(contractFormData.fecha_inicio || '')
          }
        } else if (!checked) {
          // Si desmarca renovación, limpiar la fecha de entrada
          setFechaEntradaEmpresa('')
        }
      }
    } else {
      setContractFormData(prev => ({
        ...prev,
        [name]: value
      }))

      // Si se selecciona un proyecto, generar automáticamente el número de contrato
      if (name === 'project_id' && value && !editingContract) {
        const contractNumber = await generateContractNumber(parseInt(value))
        setContractFormData(prev => ({
          ...prev,
          contract_number: contractNumber
        }))
      }
    }
  }

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Preparar datos para guardar
      const dataToSave = {
        ...contractFormData,
        fecha_termino: isIndefiniteContract ? '' : contractFormData.fecha_termino
      }

      // Validar solapamiento de contratos
      const isValid = await validateContractOverlap(
        parseInt(contractFormData.worker_id),
        parseInt(contractFormData.project_id),
        contractFormData.fecha_inicio,
        isIndefiniteContract ? null : contractFormData.fecha_termino,
        editingContract?.id
      )

      if (!isValid) {
        return // La validación ya mostró el error
      }

      if (editingContract) {
        await updateContract(editingContract.id, dataToSave)
        toast.success('Contrato actualizado exitosamente')
      } else {
        await createContract(dataToSave)
        toast.success('Contrato creado exitosamente')
      }
      handleCloseContractModal()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar contrato')
    }
  }

  // Cargar trabajadores eliminados cuando se selecciona el filtro
  const handleStatusFilterChange = async (newFilter: string) => {
    setStatusFilter(newFilter)
    if (newFilter === 'deleted') {
      try {
        await refreshAll()
      } catch (error) {
        console.error('Error loading deleted workers:', error)
      }
    }
  }

  // Función para filtro de tarjetas (ya no se usa, se maneja directamente en onSelect)

  // Función para filtros de tarjetas de contratos (ya no se usa, se maneja directamente en onSelect del StatusFilterCards)

  // Función para filtros de botones de tipo de contrato
  const handleContractTypeButtonFilter = (filterType: string) => {
    if (contractTypeButtonFilter === filterType) {
      setContractTypeButtonFilter('all')
    } else {
      setContractTypeButtonFilter(filterType)
      // Resetear filtro de estado a 'all' para mostrar todos los contratos de ese tipo
      setContractCardFilter('all')
      setContractStatusFilter('all')
    }

    // Resetear paginación
    setCurrentPage(1)

    // Scroll automático a la tabla de contratos
    setTimeout(() => {
      const contractsTable = document.getElementById('contracts-table')
      if (contractsTable) {
        contractsTable.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  // Función para manejar cambio en el select de estado (sincronización bidireccional)
  const handleContractStatusSelectChange = (newStatus: string) => {
    setContractStatusFilter(newStatus)

    // Sincronizar con las tarjetas
    if (newStatus === 'activo') {
      setContractCardFilter('active')
    } else if (newStatus === 'finalizado') {
      setContractCardFilter('finalized')
    } else if (newStatus === 'cancelado') {
      // Para cancelado, no activar ninguna tarjeta específica
      setContractCardFilter('all')
    } else {
      // Para indefinite o all, mostrar todos
      setContractCardFilter('all')
    }

    // Resetear paginación
    setCurrentPage(1)
  }

  // Función para manejar cambio en el select de trabajador
  const handleContractWorkerFilterChange = (workerId: string) => {
    setContractWorkerFilter(workerId)

    // Si se selecciona un trabajador específico, mostrar todos sus contratos
    if (workerId !== 'all') {
      setContractCardFilter('all')
      setContractStatusFilter('all')
    }

    // Resetear paginación
    setCurrentPage(1)
  }

  const handleDelete = async (workerId: number) => {
    // Verificar si tiene contratos activos directamente en la base de datos
    try {
      const { data: activeContracts, error } = await supabase
        .from('contract_history')
        .select('id')
        .eq('worker_id', workerId)
        .eq('status', 'activo')
        .eq('is_active', true)
        .limit(1)

      if (error) throw error

      const hasActiveContracts = activeContracts && activeContracts.length > 0

      if (hasActiveContracts) {
        setCannotDeleteModalState({
          isOpen: true,
          message: 'No se puede eliminar el trabajador porque tiene uno o más contratos activos. Por favor, finalice o cancele los contratos activos antes de eliminar al trabajador.'
        })
        return
      }

      setConfirmDeleteWorkerState({ isOpen: true, workerId })
    } catch (error) {
      console.error('Error checking active contracts:', error)
      toast.error('Error al verificar contratos')
    }
  }

  const executeDeleteWorker = async () => {
    if (!confirmDeleteWorkerState.workerId) return

    try {
      await deleteWorker(confirmDeleteWorkerState.workerId)
      toast.success('Trabajador movido a la papelera')
      refresh()
      setConfirmDeleteWorkerState({ isOpen: false, workerId: null })
    } catch (error) {
      toast.error('Error al eliminar trabajador')
    }
  }

  const executeHardDeleteWorker = async () => {
    if (!confirmHardDeleteWorkerState.workerId) return

    try {
      await hardDeleteWorker(confirmHardDeleteWorkerState.workerId)
      toast.success('Trabajador eliminado permanentemente')
      refreshAll()
      setConfirmHardDeleteWorkerState({ isOpen: false, workerId: null })
    } catch (error) {
      toast.error('Error al eliminar trabajador permanentemente')
    }
  }

  const handleShowContractHistory = async (worker: Worker) => {
    setSelectedWorkerForHistory(worker)
    setShowContractHistoryModal(true)

    // Asegurar que los contratos estén cargados
    if (contracts.length === 0) {
      await fetchContracts()
    }
  }

  const handleCloseContractHistoryModal = () => {
    setShowContractHistoryModal(false)
    setSelectedWorkerForHistory(null)
    setContractHistoryFilter('all')
  }

  // Filtrar contratos del trabajador seleccionado
  const getWorkerContracts = () => {
    if (!selectedWorkerForHistory) return []

    return contracts.filter(contract => {
      const matchesWorker = contract.worker_id === selectedWorkerForHistory.id
      const matchesStatus = contractHistoryFilter === 'all' || contract.status === contractHistoryFilter
      return matchesWorker && matchesStatus
    })
  }

  // Calcular duración del contrato
  const calculateContractDuration = (startDate: string, endDate: string | undefined) => {
    if (!endDate) {
      // Contrato indefinido - calcular desde inicio hasta hoy
      const start = new Date(startDate)
      const today = new Date()
      const diffTime = Math.abs(today.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays < 30) {
        return `${diffDays} día${diffDays !== 1 ? 's' : ''} (En curso)`
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        return `${months} mes${months !== 1 ? 'es' : ''} (En curso)`
      } else {
        const years = Math.floor(diffDays / 365)
        const months = Math.floor((diffDays % 365) / 30)
        return `${years} año${years !== 1 ? 's' : ''} ${months > 0 ? `${months} mes${months !== 1 ? 'es' : ''}` : ''} (En curso)`
      }
    }

    // Contrato con fecha de término
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 30) {
      return `${diffDays} día${diffDays !== 1 ? 's' : ''}`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      const days = diffDays % 30
      return `${months} mes${months !== 1 ? 'es' : ''}${days > 0 ? ` ${days} día${days !== 1 ? 's' : ''}` : ''}`
    } else {
      const years = Math.floor(diffDays / 365)
      const months = Math.floor((diffDays % 365) / 30)
      return `${years} año${years !== 1 ? 's' : ''}${months > 0 ? ` ${months} mes${months !== 1 ? 'es' : ''}` : ''}`
    }
  }

  const handleRestore = (workerId: number) => {
    setConfirmRestoreWorkerState({ isOpen: true, workerId })
  }

  const executeRestoreWorker = async () => {
    if (!confirmRestoreWorkerState.workerId) return

    try {
      await restoreWorker(confirmRestoreWorkerState.workerId)
      toast.success('Trabajador restaurado correctamente')
      refreshAll() // Refrescar para mostrar el trabajador restaurado
      setConfirmRestoreWorkerState({ isOpen: false, workerId: null })
    } catch (error) {
      toast.error('Error al restaurar trabajador')
    }
  }

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker)
  }

  const handleShowEfficiency = (worker: Worker) => {
    setSelectedWorkerForEfficiency({ id: worker.id, name: worker.full_name })
    setShowEfficiencyModal(true)
  }

  const handleCreate = () => {
    setEditingWorker(null)
    setShowCreateModal(true)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingWorker(null)
  }

  const handleSave = async (workerData: any) => {
    try {
      if (editingWorker) {
        await updateWorker(editingWorker.id, workerData)
        toast.success('Trabajador actualizado exitosamente')
      } else {
        await createWorker(workerData)
        toast.success('Trabajador creado exitosamente')
      }
      handleCloseModal()
    } catch (error) {
      toast.error('Error al guardar trabajador')
    }
  }

  // Revisar contratos automáticamente al ingresar a la vista de contratos
  useEffect(() => {
    if (currentView === 'contracts' && !contractsLoading) {
      // Ejecutar en segundo plano sin bloquear la UI
      checkAllContracts().catch((error) => {
        console.error('Error checking contracts:', error)
        // No mostrar error al usuario, solo loguear
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, contractsLoading])

  // Estadísticas
  const totalWorkers = workers.length
  const activeWorkers = workers.filter(w => w.is_active).length
  const inactiveWorkers = workers.filter(w => !w.is_active).length

  // Estadísticas de contratos
  const totalContracts = contracts.filter(c => c.is_active).length // Solo contar contratos no eliminados
  const activeContracts = contracts.filter(c => c.status === 'activo' && c.is_active).length
  const finalizedContracts = contracts.filter(c => c.status === 'finalizado' && c.is_active).length
  const cancelledContracts = contracts.filter(c => c.status === 'cancelado' || !c.is_active).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando trabajadores...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error al cargar trabajadores: {error}</div>
      </div>
    )
  }

  return (
    <div className="w-full md:h-[calc(100vh-120px)] h-auto px-4 sm:px-6 lg:px-8 flex flex-col pb-4 mt-8">
      <div className="space-y-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Trabajadores</h1>
              <p className="text-gray-500">Administra el personal y sus contratos</p>
            </div>
          </div>

          {/* Toggle entre vistas */}
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-700/30 p-1 rounded-lg">
              <button
                onClick={() => setCurrentView('workers')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'workers'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-300'
                  }`}
              >
                Trabajadores
              </button>
              <button
                onClick={() => setCurrentView('contracts')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'contracts'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-300'
                  }`}
              >
                Contratos
              </button>
            </div>

            <div className="flex gap-3">
              {currentView === 'workers' ? (
                <Button onClick={handleCreate} className="flex items-center gap-2 h-10">
                  <Plus className="h-4 w-4" />
                  Nuevo Trabajador
                </Button>
              ) : (
                <Button onClick={handleCreateContract} className="flex items-center gap-2 h-10">
                  <Plus className="h-4 w-4" />
                  Nuevo Contrato
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Vista de Trabajadores */}
        {
          currentView === 'workers' && (
            <>
              {/* Estadísticas */}
              <div className="flex-shrink-0">
                <StatusFilterCards
                  selectedValue={cardFilter}
                  onSelect={(value) => {
                    setCardFilter(value as 'all' | 'active' | 'inactive')
                    // Scroll automático a la tabla de trabajadores
                    setTimeout(() => {
                      const workersTable = document.getElementById('workers-table')
                      if (workersTable) {
                        workersTable.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }, 100)
                  }}
                  defaultOption={{
                    value: 'active',
                    label: 'Activos',
                    icon: UserCheck,
                    count: activeWorkers,
                    activeColor: 'emerald-400',
                    activeBg: 'emerald-900/30',
                    activeBorder: 'emerald-500'
                  }}
                  options={[
                    {
                      value: 'all',
                      label: 'Todos',
                      icon: Layers,
                      count: totalWorkers,
                      activeColor: 'blue-400',
                      activeBg: 'blue-900/30',
                      activeBorder: 'blue-500'
                    },
                    {
                      value: 'inactive',
                      label: 'Inactivos',
                      icon: UserX,
                      count: inactiveWorkers,
                      activeColor: 'red-400',
                      activeBg: 'red-900/30',
                      activeBorder: 'red-500'
                    }
                  ]}
                />
              </div>

              {/* Filtros */}
              <div className="space-y-4 flex-shrink-0">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre, RUT, email o teléfono..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={showWorkerTrash ? 'danger' : 'outline'}
                      onClick={() => setShowWorkerTrash(!showWorkerTrash)}
                      className={`flex items-center gap-2 transition-colors ${showWorkerTrash
                        ? 'bg-red-900/30 text-red-400 border-red-800 hover:bg-red-900/50'
                        : 'border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      {showWorkerTrash ? 'Salir de Papelera' : 'Papelera'}
                    </Button>
                  </div>
                </div>

              </div>

              {/* Lista de trabajadores */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-transparent sm:bg-white rounded-lg sm:shadow">

                {/* VISTA MÓVIL: Tarjetas */}
                <div className="md:hidden space-y-4 pb-4">
                  {filteredWorkers.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-slate-800 rounded-lg shadow border border-slate-700 p-4">
                      {searchTerm || statusFilter !== 'all'
                        ? 'No se encontraron trabajadores con los filtros aplicados'
                        : 'No hay trabajadores registrados'
                      }
                    </div>
                  ) : (
                    filteredWorkers.map((worker) => (
                      <div key={worker.id} className="bg-slate-800 rounded-lg shadow border border-slate-700 p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-900/30 flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                              <User className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                              <h3 className="font-medium text-slate-100">{worker.full_name}</h3>
                              <p className="text-sm font-mono text-slate-400">{worker.rut}</p>
                            </div>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${worker.is_active
                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-900/30 text-red-400 border border-red-500/30'
                            }`}>
                            {worker.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm text-slate-300 mb-4">
                          {worker.email && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Email:</span>
                              <span className="text-blue-400">{worker.email}</span>
                            </div>
                          )}
                          {worker.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">Tel:</span>
                              <span>{worker.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
                          {!showWorkerTrash ? (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(worker)} className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-slate-700">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleShowContractHistory(worker)} className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-slate-700">
                                <History className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleShowEfficiency(worker)} className="h-8 w-8 p-0 text-amber-500 hover:text-amber-400 hover:bg-slate-700" title="Ver reporte de eficiencia">
                                <TrendingUp className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(worker.id)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-slate-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmRestoreWorkerState({ isOpen: true, workerId: worker.id })} className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-slate-700">
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmHardDeleteWorkerState({ isOpen: true, workerId: worker.id })} className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-slate-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* VISTA DESKTOP: Tabla */}
                <div id="workers-table" className="hidden md:block overflow-auto h-full">
                  <table className="w-full relative">
                    <thead className="bg-slate-800 border border-slate-600 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider border-r border-slate-600">
                          Trabajador
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider border-r border-slate-600">
                          RUT
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider border-r border-slate-600">
                          Contacto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider border-r border-slate-600">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredWorkers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            {searchTerm || statusFilter !== 'all'
                              ? 'No se encontraron trabajadores con los filtros aplicados'
                              : 'No hay trabajadores registrados'
                            }
                          </td>
                        </tr>
                      ) : (
                        filteredWorkers.map((worker) => (
                          <tr key={worker.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <User className="h-5 w-5 text-blue-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {worker.full_name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-mono text-gray-900">
                                {worker.rut}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {worker.email && (
                                  <div className="text-blue-600">{worker.email}</div>
                                )}
                                {worker.phone && (
                                  <div className="text-gray-500">{worker.phone}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${worker.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}>
                                {worker.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                {!showWorkerTrash ? (
                                  <>
                                    <button
                                      onClick={() => handleEdit(worker)}
                                      className="text-blue-600 hover:text-blue-900"
                                      title="Editar trabajador"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleShowContractHistory(worker)}
                                      className="text-blue-600 hover:text-blue-900"
                                      title="Ver historial de contratos"
                                    >
                                      <History className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleShowEfficiency(worker)}
                                      className="text-amber-600 hover:text-amber-800"
                                      title="Ver reporte de eficiencia"
                                    >
                                      <TrendingUp className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(worker.id)}
                                      className="text-red-600 hover:text-red-900"
                                      title="Eliminar trabajador"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setConfirmRestoreWorkerState({ isOpen: true, workerId: worker.id })}
                                      className="text-green-600 hover:text-green-900"
                                      title="Restaurar trabajador"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmHardDeleteWorkerState({ isOpen: true, workerId: worker.id })}
                                      className="text-red-600 hover:text-red-900"
                                      title="Eliminar permanentemente"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal de creación/edición */}
              <Modal
                isOpen={showCreateModal || !!editingWorker}
                onClose={handleCloseModal}
                title={editingWorker ? 'Editar Trabajador' : 'Nuevo Trabajador'}
                className="modal_trabajadores"
              >
                <WorkerForm
                  worker={editingWorker}
                  initialData={initialWorkerData}
                  onSave={handleSave}
                  onCancel={handleCloseModal}
                />
              </Modal>

              {/* Modal de generación de contratos */}
            </>
          )
        }

        {/* Vista de Contratos */}
        {
          currentView === 'contracts' && (
            <>
              {/* Estadísticas de contratos */}
              <div className="flex-shrink-0">
                <StatusFilterCards
                  selectedValue={contractCardFilter}
                  onSelect={(value) => {
                    const filterValue = value as 'all' | 'active' | 'finalized'
                    if (contractCardFilter === filterValue) {
                      setContractCardFilter('all')
                      setContractStatusFilter('all')
                    } else {
                      setContractCardFilter(filterValue)
                      // Actualizar el select de estado según la tarjeta clickeada
                      if (filterValue === 'active') {
                        setContractStatusFilter('activo')
                      } else if (filterValue === 'finalized') {
                        setContractStatusFilter('finalizado')
                      } else {
                        setContractStatusFilter('all')
                      }
                    }

                    // Resetear paginación
                    setCurrentPage(1)

                    // Scroll automático a la tabla de contratos
                    setTimeout(() => {
                      const contractsTable = document.getElementById('contracts-table')
                      if (contractsTable) {
                        contractsTable.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }, 100)
                  }}
                  defaultOption={{
                    value: 'active',
                    label: 'Activos',
                    icon: UserCheck,
                    count: activeContracts,
                    activeColor: 'emerald-400',
                    activeBg: 'emerald-900/30',
                    activeBorder: 'emerald-500'
                  }}
                  options={[
                    {
                      value: 'all',
                      label: 'Todos',
                      icon: Layers,
                      count: totalContracts,
                      activeColor: 'blue-400',
                      activeBg: 'blue-900/30',
                      activeBorder: 'blue-500'
                    },
                    {
                      value: 'finalized',
                      label: 'Finalizados',
                      icon: UserX,
                      count: finalizedContracts,
                      activeColor: 'red-400',
                      activeBg: 'red-900/30',
                      activeBorder: 'red-500'
                    }
                  ]}
                />
              </div>


              {/* Filtros para contratos */}

              <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4 flex-shrink-0">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Buscar contratos..."
                      value={contractSearchTerm}
                      onChange={(e) => setContractSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsFilterSidebarOpen(true)}
                    className="flex items-center gap-2 border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Filter className="w-4 h-4" />
                    Filtros
                    {(contractProjectFilter !== 'all' || contractWorkerFilter !== 'all' || contractTypeButtonFilter !== 'all' || contractDateFilter !== '') && (
                      <span className="ml-1 bg-blue-500/20 text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-500/30">
                        !
                      </span>
                    )}
                  </Button>

                  <Button
                    variant={showTrash ? 'danger' : 'outline'}
                    onClick={() => setShowTrash(!showTrash)}
                    className={`flex items-center gap-2 transition-colors ${showTrash
                      ? 'bg-red-900/30 text-red-400 border-red-800 hover:bg-red-900/50'
                      : 'border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    {showTrash ? 'Salir de Papelera' : 'Papelera'}
                  </Button>

                  {(contractProjectFilter !== 'all' || contractWorkerFilter !== 'all' || contractTypeButtonFilter !== 'all' || contractDateFilter !== '') && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setContractProjectFilter('all')
                        setContractWorkerFilter('all')
                        setContractStatusFilter('all')
                        setContractTypeButtonFilter('all')
                        setContractDateFilter('')
                      }}
                      className="text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Limpiar filtros"
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>

              <ContractFiltersSidebar
                isOpen={isFilterSidebarOpen}
                onClose={() => setIsFilterSidebarOpen(false)}
                currentProjectFilter={contractProjectFilter}
                onProjectFilterChange={setContractProjectFilter}
                currentWorkerFilter={contractWorkerFilter}
                onWorkerFilterChange={handleContractWorkerFilterChange}
                currentStatusFilter={contractStatusFilter}
                onStatusFilterChange={handleContractStatusSelectChange}
                currentTypeFilter={contractTypeButtonFilter as 'all' | 'a_trato' | 'por_dia'}
                onTypeFilterChange={handleContractTypeButtonFilter}
                currentDateFilter={contractDateFilter}
                onDateFilterChange={setContractDateFilter}
                projects={projects}
                workers={workers}
              />

              {/* Lista de contratos */}
              <div className="bg-transparent sm:bg-white rounded-lg sm:shadow flex-1 overflow-hidden flex flex-col min-h-0">

                {/* VISTA MÓVIL: Tarjetas de Contratos */}
                <div className="md:hidden space-y-4 pb-4">
                  {paginatedContracts.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-slate-800 rounded-lg shadow border border-slate-700 p-4">
                      No hay contratos registrados
                    </div>
                  ) : (
                    paginatedContracts.map((contract) => (
                      <div key={contract.id} className="bg-slate-800 rounded-lg shadow border border-slate-700 p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-slate-100">{contract.worker_name || 'Trabajador no encontrado'}</h4>
                            <p className="text-xs text-blue-400">{contract.project_name || 'Proyecto no encontrado'}</p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${contract.status === 'activo'
                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'
                            : contract.status === 'finalizado'
                              ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                              : 'bg-slate-700 text-slate-300 border border-slate-600'
                            }`}>
                            {contract.status === 'activo' ? 'Activo' :
                              contract.status === 'finalizado' ? 'Finalizado' : 'Cancelado'}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm text-slate-300 mb-4">
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-400">Tipo:</span>
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${contract.contract_type === 'por_dia'
                              ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                              : 'bg-orange-900/30 text-orange-400 border border-orange-500/30'
                              }`}>
                              {contract.contract_type === 'por_dia' ? 'Por día' : 'A trato'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-400">Categoría:</span>
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${contract.is_renovacion
                              ? 'bg-purple-900/30 text-purple-400 border border-purple-500/30'
                              : 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/30'
                              }`}>
                              {contract.is_renovacion ? 'Renovación' : 'Nuevo'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-700/50">
                            <span className="text-xs text-slate-400">Periodo:</span>
                            <span className="text-xs font-medium text-slate-200">
                              {contract.fecha_inicio} - {contract.fecha_termino || 'Indefinido'}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-700 flex-wrap">
                          {!showTrash ? (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleEditContract(contract)} className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-slate-700">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleGenerateDocuments(contract)} className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-slate-700">
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleGenerateHoursOnly(contract)} className="h-8 w-8 p-0 text-purple-400 hover:text-purple-300 hover:bg-slate-700">
                                <Clock className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleTerminateContract(contract)} className="h-8 w-8 p-0 text-orange-400 hover:text-orange-300 hover:bg-slate-700" title="Terminar contrato anticipadamente">
                                <UserMinus className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteContract(contract.id)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-slate-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmRestoreContractState({ isOpen: true, contractId: contract.id })} className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-slate-700">
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmHardDeleteContractState({ isOpen: true, contractId: contract.id })} className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-slate-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* VISTA DESKTOP: Tabla */}
                <div id="contracts-table" className="hidden md:block overflow-auto h-full">
                  <table className="w-full relative">
                    <thead className="bg-slate-800 border border-slate-600 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider border-r border-slate-600">
                          Trabajador
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider border-r border-slate-600">
                          Proyecto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider border-r border-slate-600">
                          Período
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider border-r border-slate-600">
                          Categoría
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider border-r border-slate-600">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider border-r border-slate-600">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedContracts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                            No hay contratos registrados
                          </td>
                        </tr>
                      ) : (
                        paginatedContracts.map((contract) => (
                          <tr key={contract.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {contract.worker_name || 'Trabajador no encontrado'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {contract.project_name || 'Proyecto no encontrado'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {contract.fecha_inicio} - {contract.fecha_termino || 'Indefinido'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${contract.is_renovacion
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-cyan-100 text-cyan-800'
                                }`}>
                                {contract.is_renovacion ? 'Renovación' : 'Nuevo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${contract.contract_type === 'por_dia'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                                }`}>
                                {contract.contract_type === 'por_dia' ? 'Por día' : 'A trato'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${contract.status === 'activo'
                                ? 'bg-green-100 text-green-800'
                                : contract.status === 'finalizado'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                                }`}>
                                {contract.status === 'activo' ? 'Activo' :
                                  contract.status === 'finalizado' ? 'Finalizado' : 'Cancelado'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                {!showTrash ? (
                                  <>
                                    <button
                                      onClick={() => handleEditContract(contract)}
                                      className="text-blue-600 hover:text-blue-900"
                                      title="Editar contrato"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleGenerateDocuments(contract)}
                                      className="text-green-600 hover:text-green-900"
                                      title="Generar documentos completos (Contrato + Pacto de Horas)"
                                    >
                                      <FileText className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleGenerateHoursOnly(contract)}
                                      className="text-purple-600 hover:text-purple-900"
                                      title="Generar solo Pacto de Horas (renovación cada 3 meses)"
                                    >
                                      <Clock className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleTerminateContract(contract)}
                                      className="text-orange-600 hover:text-orange-900"
                                      title="Terminar contrato anticipadamente"
                                    >
                                      <UserMinus className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteContract(contract.id)}
                                      className="text-red-600 hover:text-red-900"
                                      title="Eliminar contrato"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setConfirmRestoreContractState({ isOpen: true, contractId: contract.id })}
                                      className="text-green-600 hover:text-green-900"
                                      title="Restaurar contrato"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmHardDeleteContractState({ isOpen: true, contractId: contract.id })}
                                      className="text-red-600 hover:text-red-900"
                                      title="Eliminar permanentemente"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Controles de paginación */}
                {filteredContracts.length > itemsPerPage && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                          <span className="font-medium">
                            {Math.min(currentPage * itemsPerPage, filteredContracts.length)}
                          </span>{' '}
                          de <span className="font-medium">{filteredContracts.length}</span> contratos
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal de creación/edición de contrato */}
              <Modal
                isOpen={showCreateContractModal || !!editingContract}
                onClose={handleCloseContractModal}
                title={editingContract ? 'Editar Contrato' : 'Nuevo Contrato'}
                className="modal_contratos_wide"
              >
                <form onSubmit={handleSaveContract}>
                  <div className="grid grid-cols-1 gap-8">
                    {/* Información del Contrato */}
                    <div className="bg-slate-700/40 p-4 rounded-lg border border-slate-600">
                      <h3 className="text-lg font-medium text-slate-100 mb-4">Información del Contrato</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Primera fila: Trabajador y Proyecto */}
                        <div className="md:col-span-1">
                          <label htmlFor="worker_id" className="block text-sm font-medium text-slate-300 mb-2">
                            Trabajador *
                          </label>
                          <select
                            id="worker_id"
                            name="worker_id"
                            value={contractFormData.worker_id}
                            onChange={handleContractFormChange}
                            required
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Seleccionar trabajador...</option>
                            {workers
                              .filter(w => !w.is_deleted) // Solo excluir trabajadores eliminados
                              .sort((a, b) => {
                                // Ordenar: activos primero, inactivos al final
                                if (a.is_active && !b.is_active) return -1
                                if (!a.is_active && b.is_active) return 1
                                return a.full_name.localeCompare(b.full_name)
                              })
                              .map(worker => (
                                <option key={worker.id} value={worker.id}>
                                  {worker.full_name} - {worker.rut} {!worker.is_active ? '(Inactivo)' : ''}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Proyecto */}
                        <div className="md:col-span-1">
                          <label htmlFor="project_id" className="block text-sm font-medium text-slate-300 mb-2">
                            Proyecto *
                          </label>
                          <select
                            id="project_id"
                            name="project_id"
                            value={contractFormData.project_id}
                            onChange={handleContractFormChange}
                            required
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Seleccionar proyecto...</option>
                            {projects.map(project => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Segunda fila: Fechas y Checkbox en 3 columnas */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                        {/* Fecha de Inicio */}
                        <div className="date-field-container">
                          <label htmlFor="fecha_inicio" className="block text-sm font-medium text-slate-300 mb-2">
                            Fecha de Inicio *
                          </label>
                          <input
                            type="date"
                            id="fecha_inicio"
                            name="fecha_inicio"
                            value={contractFormData.fecha_inicio}
                            onChange={handleContractFormChange}
                            required
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Fecha de Término */}
                        <div className="date-field-container">
                          <label htmlFor="fecha_termino" className="block text-sm font-medium text-slate-300 mb-2">
                            Fecha de Término *
                          </label>
                          <input
                            type="date"
                            id="fecha_termino"
                            name="fecha_termino"
                            value={contractFormData.fecha_termino}
                            onChange={handleContractFormChange}
                            required={!isIndefiniteContract}
                            disabled={isIndefiniteContract}
                            className={`w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isIndefiniteContract ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                          />
                        </div>

                        {/* Contrato Indefinido */}
                        <div>
                          <label htmlFor="isIndefiniteContract" className="block text-sm font-medium text-slate-300 mb-2">
                            Contrato Indefinido
                          </label>
                          <div className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-md text-slate-100 flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="isIndefiniteContract"
                              name="isIndefiniteContract"
                              checked={isIndefiniteContract}
                              onChange={handleContractFormChange}
                              className="h-4 w-4 text-blue-600 bg-slate-700 border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-sm text-slate-300">
                              {isIndefiniteContract ? 'Sí' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tercera fila: Renovación y Fecha de Entrada */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
                        {/* Renovación */}
                        <div>
                          <label htmlFor="is_renovacion" className="block text-sm font-medium text-slate-300 mb-2">
                            Renovación de Contrato
                          </label>
                          <div className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-md text-slate-100 flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="is_renovacion"
                              name="is_renovacion"
                              checked={contractFormData.is_renovacion}
                              onChange={handleContractFormChange}
                              className="h-4 w-4 text-blue-600 bg-slate-700 border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-sm text-slate-300">
                              {contractFormData.is_renovacion ? 'Sí' : 'No'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Marcar si este contrato es una renovación
                          </p>
                        </div>

                        {/* Fecha de Entrada a la Empresa - Solo visible si es renovación */}
                        {contractFormData.is_renovacion && (
                          <div className="date-field-container">
                            <label htmlFor="fecha_entrada_empresa" className="block text-sm font-medium text-slate-300 mb-2">
                              Fecha de Entrada a la Empresa *
                            </label>
                            <input
                              type="date"
                              id="fecha_entrada_empresa"
                              name="fecha_entrada_empresa"
                              value={fechaEntradaEmpresa}
                              onChange={(e) => setFechaEntradaEmpresa(e.target.value)}
                              required
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                              Fecha del primer contrato en este proyecto
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Cuarta fila: Resto de campos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">

                        {/* Tipo de Contrato */}
                        <div>
                          <label htmlFor="contract_type" className="block text-sm font-medium text-slate-300 mb-2">
                            Tipo de Contrato *
                          </label>
                          <select
                            id="contract_type"
                            name="contract_type"
                            value={contractFormData.contract_type}
                            onChange={handleContractFormChange}
                            required
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Seleccionar tipo...</option>
                            <option value="por_dia">Por día</option>
                            <option value="a_trato">A trato</option>
                          </select>
                        </div>

                        {/* Tarifa Diaria (solo si es por día) */}
                        {contractFormData.contract_type === 'por_dia' && (
                          <div>
                            <label htmlFor="daily_rate" className="block text-sm font-medium text-slate-300 mb-2">
                              Tarifa Diaria *
                            </label>
                            <input
                              type="number"
                              id="daily_rate"
                              name="daily_rate"
                              value={contractFormData.daily_rate}
                              onChange={handleContractFormChange}
                              min="0"
                              step="1000"
                              required
                              placeholder="Ingrese la tarifa diaria"
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}

                        {/* Estado */}
                        <div>
                          <label htmlFor="status" className="block text-sm font-medium text-slate-300 mb-2">
                            Estado
                          </label>
                          <select
                            id="status"
                            name="status"
                            value={contractFormData.status}
                            onChange={handleContractFormChange}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="activo">Activo</option>
                            <option value="finalizado">Finalizado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </div>

                        {/* Número de Contrato */}
                        <div>
                          <label htmlFor="contract_number" className="block text-sm font-medium text-slate-300 mb-2">
                            Número de Contrato
                          </label>
                          <input
                            type="text"
                            id="contract_number"
                            name="contract_number"
                            value={contractFormData.contract_number}
                            onChange={handleContractFormChange}
                            placeholder={editingContract ? "Ej: CONT-2024-001 (opcional)" : "Se genera automáticamente"}
                            readOnly={!editingContract}
                            className={`w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${!editingContract ? 'opacity-75 cursor-not-allowed' : ''
                              }`}
                          />
                          {!editingContract && (
                            <p className="text-xs text-slate-400 mt-1">
                              Se genera automáticamente al seleccionar el proyecto
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Notas */}
                      <div className="mt-4">
                        <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-2">
                          Notas Adicionales
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          value={contractFormData.notes}
                          onChange={handleContractFormChange}
                          rows={3}
                          placeholder="Información adicional del contrato..."
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Historial de Contratos del Trabajador */}
                  {contractFormData.worker_id && (
                    <div className="mt-6 bg-slate-700/40 p-4 rounded-lg border border-slate-600">
                      <h3 className="text-lg font-medium text-slate-100 mb-4">
                        Historial de Contratos
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-600">
                          <thead className="bg-slate-800/50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-300 uppercase">
                                Proyecto
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-300 uppercase">
                                Período
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-300 uppercase">
                                Categoría
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-300 uppercase">
                                Tipo
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-300 uppercase">
                                Estado
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-600">
                            {contracts
                              .filter(c => c.worker_id === parseInt(contractFormData.worker_id))
                              .sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())
                              .map((contract) => (
                                <tr key={contract.id} className="hover:bg-slate-700/30">
                                  <td className="px-3 py-2 text-sm text-slate-100">
                                    {contract.project_name}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-slate-100">
                                    <div className="text-xs">
                                      {contract.fecha_inicio} - {contract.fecha_termino || 'Indefinido'}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-sm">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${contract.is_renovacion
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-cyan-100 text-cyan-800'
                                      }`}>
                                      {contract.is_renovacion ? 'Renovación' : 'Nuevo'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-sm">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${contract.contract_type === 'por_dia'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-orange-100 text-orange-800'
                                      }`}>
                                      {contract.contract_type === 'por_dia' ? 'Por día' : 'A trato'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-sm">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${contract.status === 'activo'
                                      ? 'bg-green-100 text-green-800'
                                      : contract.status === 'finalizado'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-800'
                                      }`}>
                                      {contract.status === 'activo' ? 'Activo' :
                                        contract.status === 'finalizado' ? 'Finalizado' : 'Cancelado'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            {contracts.filter(c => c.worker_id === parseInt(contractFormData.worker_id)).length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-3 py-4 text-center text-slate-400 text-sm">
                                  Este trabajador no tiene contratos previos
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-slate-600">
                    <button
                      type="button"
                      onClick={handleCloseContractModal}
                      className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                    >
                      {editingContract ? 'Actualizar Contrato' : 'Crear Contrato'}
                    </button>
                  </div>
                </form>
              </Modal>
            </>
          )
        }

        {/* Modal de Generación de Pacto de Horas */}
        {
          showHoursModal && selectedContractForHours && (
            <Modal
              isOpen={showHoursModal}
              onClose={handleCloseHoursModal}
              title="Generar Pacto de Horas"
              className="modal_pacto_horas"
            >
              <div className="space-y-4">
                {/* Información del trabajador (solo lectura) */}
                <div className="bg-slate-700/40 p-3 rounded-lg border border-slate-600">
                  <h3 className="text-xs font-semibold text-slate-300 mb-2 flex items-center">
                    <User className="h-3.5 w-3.5 mr-1.5" />
                    Información del Trabajador
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-slate-400">Trabajador:</span>
                      <p className="text-slate-100 font-medium truncate">
                        {workers.find(w => w.id === selectedContractForHours.worker_id)?.full_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">RUT:</span>
                      <p className="text-slate-100 font-medium">
                        {workers.find(w => w.id === selectedContractForHours.worker_id)?.rut}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Proyecto:</span>
                      <p className="text-slate-100 font-medium truncate">
                        {projects.find(p => p.id === selectedContractForHours.project_id)?.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Contrato N°:</span>
                      <p className="text-slate-100 font-medium">
                        {selectedContractForHours.contract_number}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selección de fechas del pacto */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600">
                  <h3 className="text-xs font-semibold text-slate-300 mb-2 flex items-center">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    Período del Pacto de Horas
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="hours_fecha_inicio" className="block text-xs font-medium text-slate-300 mb-1.5">
                        Fecha de Inicio *
                      </label>
                      <Input
                        type="date"
                        id="hours_fecha_inicio"
                        value={hoursFormData.fecha_inicio}
                        onChange={(e) => setHoursFormData(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                        required
                        className="w-full text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="hours_fecha_termino" className="block text-xs font-medium text-slate-300 mb-1.5">
                        Fecha de Término *
                      </label>
                      <Input
                        type="date"
                        id="hours_fecha_termino"
                        value={hoursFormData.fecha_termino}
                        onChange={(e) => setHoursFormData(prev => ({ ...prev, fecha_termino: e.target.value }))}
                        required
                        className="w-full text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    💡 Por ley, el pacto de horas tiene vigencia máxima de 3 meses.
                  </p>
                </div>

                {/* Resumen */}
                {hoursFormData.fecha_inicio && hoursFormData.fecha_termino && (
                  <div className="bg-blue-900/20 border border-blue-700/50 p-3 rounded-lg">
                    <h4 className="text-xs font-semibold text-blue-300 mb-1.5">📄 Resumen del Documento</h4>
                    <p className="text-xs text-slate-300">
                      Desde <strong>{formatDateToChilean(hoursFormData.fecha_inicio)}</strong> hasta <strong>{formatDateToChilean(hoursFormData.fecha_termino)}</strong>
                    </p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-600">
                  <button
                    type="button"
                    onClick={handleCloseHoursModal}
                    className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmGenerateHours}
                    disabled={!hoursFormData.fecha_inicio || !hoursFormData.fecha_termino}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-md transition-colors flex items-center"
                  >
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    Generar Pacto
                  </button>
                </div>
              </div>
            </Modal>
          )
        }

        <TerminateContractModal
          isOpen={showTerminateContractModal}
          onClose={() => {
            setShowTerminateContractModal(false)
            setContractToTerminate(null)
          }}
          onConfirm={executeTerminateContract}
          startDate={contractToTerminate?.fecha_inicio}
        />

        {/* Modal de Historial de Contratos */}
        {
          showContractHistoryModal && selectedWorkerForHistory && (
            <Modal
              isOpen={showContractHistoryModal}
              onClose={handleCloseContractHistoryModal}
              title={`Historial de Contratos - ${selectedWorkerForHistory.full_name}`}
              className="modal_contratos_wide"
            >
              <div className="space-y-4">
                {/* Información del trabajador */}
                <div className="bg-slate-700/40 p-4 rounded-lg border border-slate-600">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-slate-400">Nombre:</span>
                      <p className="text-slate-100 font-medium">{selectedWorkerForHistory.full_name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-400">RUT:</span>
                      <p className="text-slate-100 font-medium">{selectedWorkerForHistory.rut}</p>
                    </div>
                  </div>
                </div>

                {/* Filtros */}
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-slate-300">Filtrar por estado:</label>
                  <select
                    value={contractHistoryFilter}
                    onChange={(e) => setContractHistoryFilter(e.target.value)}
                    className="px-3 py-1 bg-slate-800 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos</option>
                    <option value="activo">Activos</option>
                    <option value="finalizado">Finalizados</option>
                    <option value="cancelado">Cancelados</option>
                  </select>
                </div>

                {/* Tabla de contratos */}
                <div className="bg-slate-800 rounded-lg border border-slate-600 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-600">
                      <thead className="bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Contrato
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Proyecto
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Fechas
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Duración
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Categoría
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-slate-800 divide-y divide-slate-600">
                        {getWorkerContracts().length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                              No se encontraron contratos
                            </td>
                          </tr>
                        ) : (
                          getWorkerContracts().map((contract) => (
                            <tr key={contract.id} className="hover:bg-slate-700/50">
                              <td className="px-4 py-3 text-sm text-slate-100 font-medium">
                                {contract.contract_number || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-100">
                                {contract.project_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-100">
                                <div>
                                  <div>Inicio: {contract.fecha_inicio}</div>
                                  <div>
                                    Término: {contract.fecha_termino || 'Indefinido'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-100">
                                <span className="text-xs font-medium text-slate-300">
                                  {calculateContractDuration(contract.fecha_inicio, contract.fecha_termino)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${contract.is_renovacion
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-cyan-100 text-cyan-800'
                                  }`}>
                                  {contract.is_renovacion ? 'Renovación' : 'Nuevo'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${contract.contract_type === 'por_dia'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-orange-100 text-orange-800'
                                  }`}>
                                  {contract.contract_type === 'por_dia' ? 'Por día' : 'A trato'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${contract.status === 'activo'
                                  ? 'bg-green-100 text-green-800'
                                  : contract.status === 'finalizado'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                  }`}>
                                  {contract.status === 'activo' ? 'Activo' :
                                    contract.status === 'finalizado' ? 'Finalizado' : 'Cancelado'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Botón de cerrar */}
                <div className="flex justify-end pt-4 border-t border-slate-600">
                  <button
                    onClick={handleCloseContractHistoryModal}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </Modal>
          )
        }
        {/* Modal de creación de contrato */}
        {/* Modales de Confirmación */}
        <ConfirmationModal
          isOpen={cannotDeleteModalState.isOpen}
          onClose={() => setCannotDeleteModalState({ isOpen: false, message: '' })}
          onConfirm={() => setCannotDeleteModalState({ isOpen: false, message: '' })}
          title="No se puede eliminar"
          message={cannotDeleteModalState.message}
          confirmText="Entendido"
          cancelText="Cerrar"
          type="warning"
        />

        <ConfirmationModal
          isOpen={confirmDeleteWorkerState.isOpen}
          onClose={() => setConfirmDeleteWorkerState({ isOpen: false, workerId: null })}
          onConfirm={executeDeleteWorker}
          title="Eliminar Trabajador"
          message="¿Estás seguro de que quieres eliminar este trabajador? Esta acción se puede revertir."
          confirmText="Eliminar"
          type="danger"
        />

        <ConfirmationModal
          isOpen={confirmRestoreWorkerState.isOpen}
          onClose={() => setConfirmRestoreWorkerState({ isOpen: false, workerId: null })}
          onConfirm={executeRestoreWorker}
          title="Restaurar Trabajador"
          message="¿Estás seguro de que quieres restaurar este trabajador?"
          confirmText="Restaurar"
          type="info"
        />

        <ConfirmationModal
          isOpen={confirmHardDeleteWorkerState.isOpen}
          onClose={() => setConfirmHardDeleteWorkerState({ isOpen: false, workerId: null })}
          onConfirm={executeHardDeleteWorker}
          title="Eliminar Trabajador Permanentemente"
          message="¿Estás seguro de que quieres eliminar este trabajador permanentemente? Esta acción NO se puede deshacer."
          confirmText="Eliminar Permanentemente"
          type="danger"
        />

        <ConfirmationModal
          isOpen={confirmDeleteContractState.isOpen}
          onClose={() => setConfirmDeleteContractState({ isOpen: false, contractId: null })}
          onConfirm={executeDeleteContract}
          title="Eliminar Contrato"
          message="¿Estás seguro de que quieres eliminar este contrato?"
          confirmText="Eliminar"
          type="danger"
        />

        <ConfirmationModal
          isOpen={confirmRestoreContractState.isOpen}
          onClose={() => setConfirmRestoreContractState({ isOpen: false, contractId: null })}
          onConfirm={async () => {
            if (confirmRestoreContractState.contractId) {
              await handleRestoreContract(confirmRestoreContractState.contractId)
              setConfirmRestoreContractState({ isOpen: false, contractId: null })
            }
          }}
          title="Restaurar Contrato"
          message="¿Estás seguro de que quieres restaurar este contrato?"
          confirmText="Restaurar"
          type="info"
        />

        <ConfirmationModal
          isOpen={confirmHardDeleteContractState.isOpen}
          onClose={() => setConfirmHardDeleteContractState({ isOpen: false, contractId: null })}
          onConfirm={async () => {
            if (confirmHardDeleteContractState.contractId) {
              await handleHardDeleteContract(confirmHardDeleteContractState.contractId)
              setConfirmHardDeleteContractState({ isOpen: false, contractId: null })
            }
          }}
          title="Eliminar Contrato Permanentemente"
          message="¿Estás seguro de que quieres eliminar este contrato permanentemente? Esta acción NO se puede deshacer."
          confirmText="Eliminar Permanentemente"
          type="danger"
        />
        {/* Worker Efficiency Modal */}
        <WorkerEfficiencyModal
          isOpen={showEfficiencyModal}
          onClose={() => setShowEfficiencyModal(false)}
          workerId={selectedWorkerForEfficiency?.id || 0}
          workerName={selectedWorkerForEfficiency?.name || ''}
        />
      </div >
    </div >
  )
}
