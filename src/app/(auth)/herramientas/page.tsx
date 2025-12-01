'use client'

import { useState } from 'react'
import { Plus, Wrench, History, Search, Filter, Layers, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ToolForm } from '@/components/tools/ToolForm'
import { ToolList } from '@/components/tools/ToolList'
import { LoanHistory } from '@/components/tools/LoanHistory'
import { LoanModal } from '@/components/tools/LoanModal'
import { useTools } from '@/hooks/useTools'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export default function HerramientasPage() {
  const [activeTab, setActiveTab] = useState<'tools' | 'history'>('tools')
  const [showToolForm, setShowToolForm] = useState(false)
  const [showLoanModal, setShowLoanModal] = useState(false)
  const [selectedTool, setSelectedTool] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'disponible' | 'prestada'>('all')
  const [activeFilter, setActiveFilter] = useState('active')

  // Obtener usuario actual
  const { user } = useAuth()

  // Usar hook de herramientas
  const {
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
    refreshTools,
    refreshLoans
  } = useTools()

  const handleAddTool = async (toolData: any) => {
    try {
      await createTool({
        ...toolData,
        status: 'disponible',
        location: 'Almacén Principal'
      })
      setShowToolForm(false)
      toast.success('Herramienta creada exitosamente')
    } catch (error) {
      toast.error('Error al crear la herramienta')
    }
  }

  const handleEditTool = async (toolData: any) => {
    try {
      await updateTool(toolData.id, toolData)
      setShowToolForm(false)
      setSelectedTool(null)
      toast.success('Herramienta actualizada exitosamente')
    } catch (error) {
      toast.error('Error al actualizar la herramienta')
    }
  }

  const handleDeleteTool = async (toolId: number) => {
    if (confirm('¿Estás seguro de que quieres deshabilitar esta herramienta?')) {
      try {
        await deleteTool(toolId)
        toast.success('Herramienta deshabilitada exitosamente')
      } catch (error) {
        toast.error('Error al deshabilitar la herramienta')
      }
    }
  }

  const handleReactivateTool = async (toolId: number) => {
    try {
      await reactivateTool(toolId)
      toast.success('Herramienta reactivada exitosamente')
    } catch (error) {
      toast.error('Error al reactivar la herramienta')
    }
  }

  const handleLoanTool = (toolId: number) => {
    const tool = tools.find(t => t.id === toolId)
    setSelectedTool(tool)
    setShowLoanModal(true)
  }

  const getActiveLoanId = (toolId: number): number | undefined => {
    const activeLoan = loans.find(loan => loan.tool_id === toolId && !loan.return_date)
    return activeLoan?.id
  }

  const handleLoan = async (borrowerId: number, lenderId: string, projectId?: number) => {
    try {
      await loanTool(selectedTool.id, borrowerId, lenderId, projectId)
      toast.success('Herramienta prestada exitosamente')
      setShowLoanModal(false)
      setSelectedTool(null)
    } catch (error) {
      console.error('Error lending tool:', error)
      toast.error('Error al prestar la herramienta')
    }
  }

  const handleReturnTool = async (loanId: number, returnDetails: string) => {
    try {
      await returnTool(loanId, returnDetails)
      toast.success('Herramienta devuelta exitosamente')
    } catch (error) {
      toast.error('Error al devolver la herramienta')
    }
  }

  const handleReturnToolForModal = async (loanId: number, returnDetails: string) => {
    await handleReturnTool(loanId, returnDetails)
  }

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || tool.status === statusFilter
    const matchesActive = activeFilter === 'all' || 
                         (activeFilter === 'active' && tool.is_active) ||
                         (activeFilter === 'inactive' && !tool.is_active)
    return matchesSearch && matchesStatus && matchesActive
  })

  const stats = {
    total: tools.filter(t => t.is_active).length,
    available: tools.filter(t => t.status === 'disponible' && t.is_active).length,
    loaned: tools.filter(t => t.status === 'prestada' && t.is_active).length,
    totalValue: tools.filter(t => t.is_active).reduce((sum, tool) => sum + tool.value, 0)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando herramientas...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error al cargar las herramientas: {error}</p>
          <Button
            onClick={() => {
              refreshTools()
              refreshLoans()
            }}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white"
          >
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Herramientas</h1>
          <p className="text-gray-600">Administra el inventario y préstamos de herramientas</p>
        </div>
        <Button
          onClick={() => setShowToolForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Herramienta
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Tarjeta Total */}
        <Card 
          className={`cursor-pointer transition-all duration-200 border-2 ${
            statusFilter === 'all'
              ? 'bg-blue-900/30 border-blue-500 shadow-lg'
              : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
          }`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Layers className={`w-5 h-5 ${
                statusFilter === 'all' ? 'text-blue-400' : 'text-slate-400'
              }`} />
              <span className={`font-semibold ${
                statusFilter === 'all' ? 'text-blue-400' : 'text-slate-300'
              }`}>
                Total
              </span>
            </div>
            <div className={`text-2xl font-bold text-center ${
              statusFilter === 'all' ? 'text-blue-400' : 'text-slate-400'
            }`}>
              {stats.total}
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta Disponibles */}
        <Card 
          className={`cursor-pointer transition-all duration-200 border-2 ${
            statusFilter === 'disponible'
              ? 'bg-emerald-900/30 border-emerald-500 shadow-lg'
              : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
          }`}
          onClick={() => setStatusFilter('disponible')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className={`w-5 h-5 ${
                statusFilter === 'disponible' ? 'text-emerald-400' : 'text-slate-400'
              }`} />
              <span className={`font-semibold ${
                statusFilter === 'disponible' ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                Disponibles
              </span>
            </div>
            <div className={`text-2xl font-bold text-center ${
              statusFilter === 'disponible' ? 'text-emerald-400' : 'text-slate-400'
            }`}>
              {stats.available}
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta Prestadas */}
        <Card 
          className={`cursor-pointer transition-all duration-200 border-2 ${
            statusFilter === 'prestada'
              ? 'bg-orange-900/30 border-orange-500 shadow-lg'
              : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
          }`}
          onClick={() => setStatusFilter('prestada')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className={`w-5 h-5 ${
                statusFilter === 'prestada' ? 'text-orange-400' : 'text-slate-400'
              }`} />
              <span className={`font-semibold ${
                statusFilter === 'prestada' ? 'text-orange-400' : 'text-slate-300'
              }`}>
                Prestadas
              </span>
            </div>
            <div className={`text-2xl font-bold text-center ${
              statusFilter === 'prestada' ? 'text-orange-400' : 'text-slate-400'
            }`}>
              {stats.loaned}
            </div>
          </CardContent>
        </Card>
        
        {/* Tarjeta de Valor Total (solo informativa, no es filtro) */}
        <Card className="bg-slate-700/30 border-2 border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-5 h-5 bg-purple-500/20 rounded flex items-center justify-center">
                <span className="text-purple-400 font-bold text-xs">$</span>
              </div>
              <span className="font-semibold text-slate-300">Valor Total</span>
            </div>
            <div className="text-2xl font-bold text-center text-purple-400">
              ${stats.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('tools')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tools'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Wrench className="w-4 h-4 inline mr-2" />
            Herramientas
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            Historial de Préstamos
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'tools' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre o marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'disponible' | 'prestada')}
              >
                <option value="all">Todos los estados</option>
                <option value="disponible">Disponible</option>
                <option value="prestada">Prestada</option>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
              >
                <option value="active">Activas</option>
                <option value="inactive">Inactivas</option>
                <option value="all">Todas</option>
              </Select>
            </div>
          </div>

          {/* Tools List */}
          <ToolList
            tools={filteredTools}
            onEdit={(tool) => {
              setSelectedTool(tool)
              setShowToolForm(true)
            }}
            onDelete={handleDeleteTool}
            onReactivate={handleReactivateTool}
            onLoan={handleLoanTool}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <LoanHistory
          loans={loans}
          workers={workers}
          projects={projects}
          onReturn={handleReturnToolForModal}
        />
      )}

      {/* Modals */}
      {showToolForm && (
        <ToolForm
          tool={selectedTool}
          onSave={selectedTool ? handleEditTool : handleAddTool}
          onClose={() => {
            setShowToolForm(false)
            setSelectedTool(null)
          }}
        />
      )}

      {showLoanModal && selectedTool && (
        <LoanModal
          tool={selectedTool}
          workers={workers}
          users={users}
          projects={projects}
          currentUserId={user?.id || ''}
          onClose={() => {
            setShowLoanModal(false)
            setSelectedTool(null)
          }}
          onLoan={handleLoan}
          onReturn={handleReturnToolForModal}
          activeLoanId={selectedTool ? getActiveLoanId(selectedTool.id) : undefined}
        />
      )}
    </div>
  )
}
