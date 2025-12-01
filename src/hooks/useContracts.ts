'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { notifyContractExpiring, notifyContractExpired } from '@/lib/notifications'

export interface Contract {
  id: number
  worker_id: number
  project_id: number
  fecha_inicio: string
  fecha_termino?: string
  contract_type: 'por_dia' | 'a_trato'
  daily_rate?: number
  status: 'activo' | 'finalizado' | 'cancelado'
  notes?: string
  contract_number?: string
  is_active: boolean
  is_renovacion: boolean
  created_at: string
  created_by?: string
  // Datos relacionados
  worker_name?: string
  worker_rut?: string
  project_name?: string
}

export interface ContractFormData {
  worker_id: string
  project_id: string
  fecha_inicio: string
  fecha_termino: string
  contract_type: string
  daily_rate: string
  status: string
  contract_number: string
  notes: string
  is_renovacion: boolean
}

export const useContracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar contratos con datos relacionados
  const fetchContracts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Cargar TODOS los contratos (incluidos los eliminados)
      const { data, error } = await supabase
        .from('contract_history')
        .select(`
          *,
          workers!inner(full_name, rut),
          projects!inner(name)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // Actualizar contratos expirados automáticamente
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Resetear a medianoche para comparación exacta

      const contractsToUpdate: number[] = []
      
      const transformedData = data?.map(contract => {
        // Si is_active = false, el status debe ser 'cancelado'
        if (!contract.is_active && contract.status !== 'cancelado') {
          return {
            ...contract,
            status: 'cancelado',
            worker_name: contract.workers?.full_name,
            worker_rut: contract.workers?.rut,
            project_name: contract.projects?.name
          }
        }
        
        // Verificar si el contrato está expirado
        if (contract.fecha_termino && contract.status === 'activo') {
          const endDate = new Date(contract.fecha_termino)
          endDate.setHours(0, 0, 0, 0)
          
          if (endDate < today) {
            contractsToUpdate.push(contract.id)
            return {
              ...contract,
              status: 'finalizado',
              worker_name: contract.workers?.full_name,
              worker_rut: contract.workers?.rut,
              project_name: contract.projects?.name
            }
          }
        }
        
        return {
          ...contract,
          worker_name: contract.workers?.full_name,
          worker_rut: contract.workers?.rut,
          project_name: contract.projects?.name
        }
      }) || []

      // Actualizar contratos expirados en la base de datos
      if (contractsToUpdate.length > 0) {
        await supabase
          .from('contract_history')
          .update({ status: 'finalizado', updated_at: new Date().toISOString() })
          .in('id', contractsToUpdate)
      }

      setContracts(transformedData)
    } catch (err: any) {
      console.error('Error fetching contracts:', err)
      setError(err.message || 'Error al cargar contratos')
    } finally {
      setLoading(false)
    }
  }

  // Validar si el trabajador ya tiene un contrato activo en el proyecto
  const validateContractBeforeCreate = async (workerId: number, projectId: number): Promise<{
    isValid: boolean
    message?: string
    activeContract?: any
  }> => {
    try {
      // Usar la función RPC para obtener contratos activos del trabajador
      const { data: activeContracts, error } = await supabase
        .rpc('get_active_contracts_by_worker', { p_worker_id: workerId })

      if (error) {
        console.error('Error checking active contracts:', error)
        // Si falla la validación, permitir crear (no bloquear por error de validación)
        return { isValid: true }
      }

      // Verificar si existe un contrato activo en el mismo proyecto
      const existingContract = activeContracts?.find((c: any) => c.project_id === projectId)

      if (existingContract) {
        return {
          isValid: false,
          message: `El trabajador ya tiene un contrato activo (${existingContract.contract_number}) en este proyecto. Debes finalizarlo antes de crear uno nuevo.`,
          activeContract: existingContract
        }
      }

      return { isValid: true }
    } catch (err: any) {
      console.error('Error validating contract:', err)
      // Si hay un error en la validación, permitir crear
      return { isValid: true }
    }
  }

  // Crear nuevo contrato
  const createContract = async (contractData: ContractFormData) => {
    try {
      // Validar antes de crear
      const validation = await validateContractBeforeCreate(
        parseInt(contractData.worker_id),
        parseInt(contractData.project_id)
      )

      if (!validation.isValid) {
        throw new Error(validation.message || 'No se puede crear el contrato')
      }

      const { data, error } = await supabase
        .from('contract_history')
        .insert({
          worker_id: parseInt(contractData.worker_id),
          project_id: parseInt(contractData.project_id),
          fecha_inicio: contractData.fecha_inicio,
          fecha_termino: contractData.fecha_termino || null,
          contract_type: contractData.contract_type,
          daily_rate: contractData.contract_type === 'por_dia' ? parseFloat(contractData.daily_rate) : 0,
          status: contractData.status,
          notes: contractData.notes || null,
          contract_number: contractData.contract_number || null,
          is_active: true,
          is_renovacion: contractData.is_renovacion
        })
        .select(`
          *,
          workers!inner(full_name, rut),
          projects!inner(name)
        `)
        .single()

      if (error) {
        // Manejar error específico de constraint único
        if (error.code === '23505') {
          throw new Error('Este trabajador ya tiene un contrato activo en este proyecto. Por favor, finaliza el contrato anterior primero.')
        }
        throw error
      }

      // Agregar el nuevo contrato a la lista local
      const newContract = {
        ...data,
        worker_name: data.workers?.full_name,
        worker_rut: data.workers?.rut,
        project_name: data.projects?.name
      }

      setContracts(prev => [newContract, ...prev])
      return newContract
    } catch (err: any) {
      console.error('Error creating contract:', err)
      throw new Error(err.message || 'Error al crear contrato')
    }
  }

  // Actualizar contrato
  const updateContract = async (id: number, contractData: ContractFormData) => {
    try {
      const { data, error } = await supabase
        .from('contract_history')
        .update({
          worker_id: parseInt(contractData.worker_id),
          project_id: parseInt(contractData.project_id),
          fecha_inicio: contractData.fecha_inicio,
          fecha_termino: contractData.fecha_termino || null,
          contract_type: contractData.contract_type,
          daily_rate: contractData.contract_type === 'por_dia' ? parseFloat(contractData.daily_rate) : 0,
          status: contractData.status,
          notes: contractData.notes || null,
          contract_number: contractData.contract_number || null,
          is_renovacion: contractData.is_renovacion,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          workers!inner(full_name, rut),
          projects!inner(name)
        `)
        .single()

      if (error) {
        throw error
      }

      // Actualizar el contrato en la lista local
      const updatedContract = {
        ...data,
        worker_name: data.workers?.full_name,
        worker_rut: data.workers?.rut,
        project_name: data.projects?.name
      }

      setContracts(prev => prev.map(contract => 
        contract.id === id ? updatedContract : contract
      ))

      return updatedContract
    } catch (err: any) {
      console.error('Error updating contract:', err)
      throw new Error(err.message || 'Error al actualizar contrato')
    }
  }

  // Eliminar contrato (soft delete)
  const deleteContract = async (id: number) => {
    try {
      const { error } = await supabase
        .from('contract_history')
        .update({
          is_active: false,
          status: 'cancelado',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        throw error
      }

      // Actualizar el contrato en la lista local (no removerlo, solo cambiar status)
      setContracts(prev => prev.map(contract => 
        contract.id === id 
          ? { ...contract, is_active: false, status: 'cancelado' as 'cancelado' }
          : contract
      ))
    } catch (err: any) {
      console.error('Error deleting contract:', err)
      throw new Error(err.message || 'Error al eliminar contrato')
    }
  }

  // Cargar contratos al montar el componente
  useEffect(() => {
    fetchContracts()
  }, [])

  // Obtener contratos activos de un trabajador
  const getActiveContractsByWorker = async (workerId: number) => {
    try {
      const { data, error } = await supabase
        .rpc('get_active_contracts_by_worker', { p_worker_id: workerId })

      if (error) throw error

      return data || []
    } catch (err: any) {
      console.error('Error fetching active contracts:', err)
      return []
    }
  }

  // Revisar contratos por vencer (7 días o menos) y notificar
  const checkExpiringContracts = async () => {
    try {
      // Obtener fecha de hoy en zona horaria local (sin hora)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      today.setHours(0, 0, 0, 0)
      
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
      sevenDaysFromNow.setHours(23, 59, 59, 999)

      // Obtener contratos que vencen en 7 días o menos
      const { data: contracts, error } = await supabase
        .from('contract_history')
        .select(`
          *,
          workers!inner(full_name, rut)
        `)
        .eq('status', 'activo')
        .eq('is_active', true)
        .not('fecha_termino', 'is', null)
        .gte('fecha_termino', today.toISOString().split('T')[0])
        .lte('fecha_termino', sevenDaysFromNow.toISOString().split('T')[0])

      if (error) {
        console.error('Error checking expiring contracts:', error)
        return { checked: 0, notified: 0 }
      }

      if (!contracts || contracts.length === 0) {
        return { checked: 0, notified: 0 }
      }

      // Obtener usuarios admin y supervisores para notificar
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .in('role', ['admin', 'supervisor'])

      if (!admins || admins.length === 0) {
        return { checked: contracts.length, notified: 0 }
      }

      let notifiedCount = 0

      // Notificar sobre cada contrato por vencer
      for (const contract of contracts) {
        // Parsear fecha de término (formato YYYY-MM-DD)
        const endDateStr = contract.fecha_termino
        const [year, month, day] = endDateStr.split('-').map(Number)
        const endDate = new Date(year, month - 1, day)
        endDate.setHours(0, 0, 0, 0)
        
        // Calcular días hasta vencimiento (días naturales completos)
        // Si vence mañana = 1 día, si vence hoy = 0 días
        const diffTime = endDate.getTime() - today.getTime()
        const daysUntilExpiry = Math.round(diffTime / (1000 * 60 * 60 * 24))

        // Solo notificar si faltan días (no si ya venció hoy o antes)
        if (daysUntilExpiry < 0) continue

        // Notificar a todos los admins/supervisores
        for (const admin of admins) {
          // Verificar si ya existe una notificación para este contrato en las últimas 24 horas
          // Esto evita crear notificaciones duplicadas si el usuario entra varias veces
          try {
            const twentyFourHoursAgo = new Date()
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
            
            const { data: existingNotifications, error: checkError } = await supabase
              .from('notifications')
              .select('id, created_at')
              .eq('user_id', admin.id)
              .eq('type', 'contract_expiring')
              .eq('related_table', 'contract_history')
              .eq('related_id', contract.id)
              .gte('created_at', twentyFourHoursAgo.toISOString())
              .limit(1)

            // Si hay error en la consulta, loguear pero continuar (mejor crear duplicado que no notificar)
            if (checkError) {
              console.error('Error checking existing notifications:', checkError)
            }

            // Si ya existe una notificación reciente para este contrato, no crear otra
            if (existingNotifications && existingNotifications.length > 0) {
              continue
            }
          } catch (err) {
            // Si hay error, loguear pero continuar (mejor crear duplicado que no notificar)
            console.error('Error checking existing notifications:', err)
          }

          const result = await notifyContractExpiring({
            userId: admin.id,
            contractId: contract.id,
            workerName: contract.workers?.full_name || 'Trabajador',
            daysUntilExpiry
          })
          
          if (result.success) {
            notifiedCount++
          }
        }
      }

      return { checked: contracts.length, notified: notifiedCount }
    } catch (err) {
      console.error('Error in checkExpiringContracts:', err)
      return { checked: 0, notified: 0 }
    }
  }

  // Revisar contratos vencidos y notificar
  const checkExpiredContracts = async () => {
    try {
      // Obtener fecha de hoy en zona horaria local (sin hora)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      today.setHours(0, 0, 0, 0)

      // Obtener contratos que ya vencieron pero siguen activos
      const { data: contracts, error } = await supabase
        .from('contract_history')
        .select(`
          *,
          workers!inner(full_name, rut)
        `)
        .eq('status', 'activo')
        .eq('is_active', true)
        .not('fecha_termino', 'is', null)
        .lt('fecha_termino', today.toISOString().split('T')[0])

      if (error) {
        console.error('Error checking expired contracts:', error)
        return { checked: 0, notified: 0, updated: 0 }
      }

      if (!contracts || contracts.length === 0) {
        return { checked: 0, notified: 0, updated: 0 }
      }

      // Obtener usuarios admin y supervisores para notificar
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .in('role', ['admin', 'supervisor'])

      let notifiedCount = 0
      const contractsToUpdate: number[] = []

      // Notificar y marcar para actualizar
      for (const contract of contracts) {
        contractsToUpdate.push(contract.id)

        // Notificar a todos los admins/supervisores
        if (admins && admins.length > 0) {
          for (const admin of admins) {
            // Verificar si ya existe una notificación para este contrato en las últimas 24 horas
            // Esto evita crear notificaciones duplicadas si el usuario entra varias veces
            try {
              const twentyFourHoursAgo = new Date()
              twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
              
              const { data: existingNotifications, error: checkError } = await supabase
                .from('notifications')
                .select('id, created_at')
                .eq('user_id', admin.id)
                .eq('type', 'contract_expired')
                .eq('related_table', 'contract_history')
                .eq('related_id', contract.id)
                .gte('created_at', twentyFourHoursAgo.toISOString())
                .limit(1)

              // Si hay error en la consulta, loguear pero continuar (mejor crear duplicado que no notificar)
              if (checkError) {
                console.error('Error checking existing notifications:', checkError)
              }

              // Si ya existe una notificación reciente para este contrato, no crear otra
              if (existingNotifications && existingNotifications.length > 0) {
                continue
              }
            } catch (err) {
              // Si hay error, loguear pero continuar (mejor crear duplicado que no notificar)
              console.error('Error checking existing notifications:', err)
            }

            const result = await notifyContractExpired({
              userId: admin.id,
              contractId: contract.id,
              workerName: contract.workers?.full_name || 'Trabajador'
            })
            
            if (result.success) {
              notifiedCount++
            }
          }
        }
      }

      // Actualizar contratos vencidos a 'finalizado'
      if (contractsToUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from('contract_history')
          .update({ 
            status: 'finalizado', 
            updated_at: new Date().toISOString() 
          })
          .in('id', contractsToUpdate)

        if (updateError) {
          console.error('Error updating expired contracts:', updateError)
        }
      }

      return { 
        checked: contracts.length, 
        notified: notifiedCount, 
        updated: contractsToUpdate.length 
      }
    } catch (err) {
      console.error('Error in checkExpiredContracts:', err)
      return { checked: 0, notified: 0, updated: 0 }
    }
  }

  // Revisar ambos: contratos por vencer y vencidos
  const checkAllContracts = async () => {
    const expiring = await checkExpiringContracts()
    const expired = await checkExpiredContracts()
    
    return {
      expiring,
      expired,
      total: {
        checked: expiring.checked + expired.checked,
        notified: expiring.notified + expired.notified,
        updated: expired.updated
      }
    }
  }

  return {
    contracts,
    loading,
    error,
    fetchContracts,
    createContract,
    updateContract,
    deleteContract,
    validateContractBeforeCreate,
    getActiveContractsByWorker,
    checkExpiringContracts,
    checkExpiredContracts,
    checkAllContracts
  }
}
