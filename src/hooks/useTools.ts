'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Tool {
  id: number
  name: string
  brand: string
  status: 'disponible' | 'prestada' | 'mantenimiento' | 'perdida'
  value: number
  location: string
  details: string
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ToolLoan {
  id: number
  tool_id: number
  tool_name: string
  borrower_id: number
  borrower_name: string
  lender_id: string
  lender_name: string
  loan_date: string
  return_date: string | null
  return_details: string | null
  project_id: number | null
  project_name?: string
  created_at: string
}

export function useTools() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loans, setLoans] = useState<ToolLoan[]>([])
  const [workers, setWorkers] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar herramientas
  const fetchTools = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTools(data || [])
    } catch (err: any) {
      console.error('Error fetching tools:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Cargar préstamos
  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('tool_loans')
        .select(`
          *,
          tools!inner(name),
          workers!inner(full_name),
          user_profiles!inner(full_name),
          projects(name)
        `)
        .order('loan_date', { ascending: false })

      if (error) throw error

      const formattedLoans = (data || []).map((loan: any) => ({
        id: loan.id,
        tool_id: loan.tool_id,
        tool_name: loan.tools.name,
        borrower_id: loan.borrower_id,
        borrower_name: loan.workers.full_name,
        lender_id: loan.lender_id,
        lender_name: loan.user_profiles.full_name,
        loan_date: loan.loan_date,
        return_date: loan.return_date,
        return_details: loan.return_details,
        project_id: loan.project_id,
        project_name: loan.projects?.name || null,
        created_at: loan.created_at
      }))

      setLoans(formattedLoans)
    } catch (err: any) {
      console.error('Error fetching loans:', err)
      setError(err.message)
    }
  }

  // Crear herramienta
  const createTool = async (toolData: Omit<Tool, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .insert([toolData])
        .select()
        .single()

      if (error) throw error

      setTools(prev => [data, ...prev])
      return data
    } catch (err: any) {
      console.error('Error creating tool:', err)
      setError(err.message)
      throw err
    }
  }

  // Actualizar herramienta
  const updateTool = async (id: number, updates: Partial<Tool>) => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setTools(prev => prev.map(tool =>
        tool.id === id ? { ...tool, ...data } : tool
      ))
      return data
    } catch (err: any) {
      console.error('Error updating tool:', err)
      setError(err.message)
      throw err
    }
  }

  // Deshabilitar herramienta (soft delete)
  const deleteTool = async (id: number) => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setTools(prev => prev.map(tool =>
        tool.id === id ? { ...tool, ...data } : tool
      ))
    } catch (err: any) {
      console.error('Error disabling tool:', err)
      setError(err.message)
      throw err
    }
  }

  // Reactivar herramienta
  const reactivateTool = async (id: number) => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setTools(prev => prev.map(tool =>
        tool.id === id ? { ...tool, ...data } : tool
      ))
    } catch (err: any) {
      console.error('Error reactivating tool:', err)
      setError(err.message)
      throw err
    }
  }

  // Prestar herramienta
  const loanTool = async (toolId: number, borrowerId: number, lenderId: string, projectId?: number) => {
    try {
      // Verificar que la herramienta esté activa
      const { data: tool, error: toolError } = await supabase
        .from('tools')
        .select('is_active, status')
        .eq('id', toolId)
        .single()

      if (toolError) throw toolError

      if (!tool.is_active) {
        throw new Error('No se puede prestar una herramienta deshabilitada')
      }

      if (tool.status !== 'disponible') {
        throw new Error('La herramienta no está disponible para préstamo')
      }

      const { data, error } = await supabase.rpc('loan_tool', {
        p_tool_id: toolId,
        p_borrower_id: borrowerId,
        p_lender_id: lenderId,
        p_project_id: projectId || null
      })

      if (error) throw error

      // Actualizar herramientas y préstamos
      await fetchTools()
      await fetchLoans()

      return data
    } catch (err: any) {
      console.error('Error loaning tool:', err)
      setError(err.message)
      throw err
    }
  }

  // Devolver herramienta
  const returnTool = async (loanId: number, returnDetails: string) => {
    try {
      console.log('Returning tool with loanId:', loanId, 'type:', typeof loanId)
      console.log('Return details:', returnDetails, 'type:', typeof returnDetails)

      const { error } = await supabase.rpc('return_tool', {
        p_loan_id: Number(loanId),
        p_return_details: returnDetails
      })

      if (error) throw error

      // Actualizar herramientas y préstamos
      await fetchTools()
      await fetchLoans()
    } catch (err: any) {
      console.error('Error returning tool:', err)
      setError(err.message)
      throw err
    }
  }

  // Obtener herramientas disponibles
  const getAvailableTools = async () => {
    try {
      const { data, error } = await supabase.rpc('get_available_tools')
      if (error) throw error
      return data
    } catch (err: any) {
      console.error('Error getting available tools:', err)
      setError(err.message)
      throw err
    }
  }

  // Obtener historial de préstamos de una herramienta
  const getToolLoanHistory = async (toolId: number) => {
    try {
      const { data, error } = await supabase.rpc('get_tool_loan_history', {
        p_tool_id: toolId
      })
      if (error) throw error
      return data
    } catch (err: any) {
      console.error('Error getting tool loan history:', err)
      setError(err.message)
      throw err
    }
  }

  // Cargar trabajadores
  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name')

      if (error) throw error
      setWorkers(data || [])
    } catch (err: any) {
      console.error('Error fetching workers:', err)
      setError(err.message)
    }
  }

  // Cargar proyectos
  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data || []
    } catch (err: any) {
      console.error('Error fetching projects:', err)
      setError(err.message)
      return []
    }
  }

  // Cargar usuarios del sistema
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setError(err.message)
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      await fetchTools()
      await fetchLoans()
      await fetchWorkers()
      await fetchUsers()
      const projectsData = await fetchProjects()
      setProjects(projectsData)
    }
    loadData()
  }, [])

  // Subir imagen de herramienta
  const uploadToolImage = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('tools')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('tools')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (err: any) {
      console.error('Error uploading image:', err)
      setError(err.message)
      throw err
    }
  }

  return {
    tools,
    loans,
    workers,
    users,
    projects,
    loading,
    error,
    createTool,
    updateTool,
    deleteTool,
    reactivateTool,
    loanTool,
    returnTool,
    getAvailableTools,
    getToolLoanHistory,
    uploadToolImage,
    refreshTools: fetchTools,
    refreshLoans: fetchLoans
  }
}
