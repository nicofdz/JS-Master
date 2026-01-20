'use client'

import { useState } from 'react'
import { Plus, Wrench, History, Search, Filter, Layers, CheckCircle, Clock, X, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ToolForm } from '@/components/tools/ToolForm'
import { ToolDetailsModal } from '@/components/tools/ToolDetailsModal'
import { ToolList } from '@/components/tools/ToolList'
import { LoanHistory } from '@/components/tools/LoanHistory'
import { LoanModal } from '@/components/tools/LoanModal'
import { useTools } from '@/hooks/useTools'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { ToolFiltersSidebar } from '@/components/tools/ToolFiltersSidebar'
import { LoanHistoryFiltersSidebar } from '@/components/tools/LoanHistoryFiltersSidebar'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'

export default function HerramientasPage() {
  const [activeTab, setActiveTab] = useState<'tools' | 'history'>('tools')
  const [showToolForm, setShowToolForm] = useState(false)
  const [showLoanModal, setShowLoanModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTool, setSelectedTool] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'disponible' | 'prestada'>('all')
  const [activeFilter, setActiveFilter] = useState('active')
  const [confirmDeleteToolState, setConfirmDeleteToolState] = useState<{ isOpen: boolean, toolId: number | null }>({ isOpen: false, toolId: null })

  const handleViewTool = (tool: any) => {
    setSelectedTool(tool)
    setShowDetailsModal(true)
  }

  // Sidebar filters
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false)

  // Loan History Filters
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all')
  const [historyMonthFilter, setHistoryMonthFilter] = useState('all')
  const [historyYearFilter, setHistoryYearFilter] = useState('all')
  const [historyWorkerFilter, setHistoryWorkerFilter] = useState('all')
  const [historyProjectFilter, setHistoryProjectFilter] = useState('all')
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [workerFilter, setWorkerFilter] = useState<string>('all')

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
    deleteLoan,
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

  const handleDeleteTool = (toolId: number) => {
    setConfirmDeleteToolState({ isOpen: true, toolId })
  }

  const executeDeleteTool = async () => {
    if (!confirmDeleteToolState.toolId) return

    try {
      await deleteTool(confirmDeleteToolState.toolId)
      toast.success('Herramienta deshabilitada exitosamente')
      setConfirmDeleteToolState({ isOpen: false, toolId: null })
    } catch (error) {
      toast.error('Error al deshabilitar la herramienta')
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

  const getActiveLoan = (toolId: number) => {
    return loans.find(loan => loan.tool_id === toolId && !loan.return_date)
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
    setShowLoanModal(false)
    setSelectedTool(null)
  }



  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || tool.status === statusFilter
    const matchesActive = activeFilter === 'all' ||
      (activeFilter === 'active' && tool.is_active) ||
      (activeFilter === 'inactive' && !tool.is_active)

    // Filtro por proyecto (sidebar)
    let matchesProject = true
    if (selectedProjectId) {
      // Si filtramos por proyecto, buscamos si la herramienta está prestada a ese proyecto
      // O si está disponible (opcional, pero asumimos que queremos ver lo que tiene el proyecto)
      // Para herramientas prestadas:
      if (tool.status === 'prestada') {
        const activeLoan = loans.find(l => l.tool_id === tool.id && !l.return_date)
        matchesProject = activeLoan?.project_id === selectedProjectId
      } else {
        // Herramientas disponibles no están en un proyecto específico (están en bodega)
        // Si el usuario filtra por proyecto, ¿debería ver las disponibles?
        // Por ahora, ocultamos las disponibles si se filtra por proyecto, para ver solo lo que tiene el proyecto.
        matchesProject = false
      }
    }

    // Filtro por trabajador (sidebar)
    let matchesWorker = true
    if (workerFilter !== 'all') {
      if (tool.status === 'prestada') {
        const activeLoan = loans.find(l => l.tool_id === tool.id && !l.return_date)
        matchesWorker = activeLoan?.borrower_id.toString() === workerFilter
      } else {
        matchesWorker = false
      }
    }

    return matchesSearch && matchesStatus && matchesActive && matchesProject && matchesWorker
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
    <div className="p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-stone-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-stone-500/20">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Herramientas</h1>
            <p className="text-gray-500">Administra el inventario y préstamos de herramientas</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsFilterSidebarOpen(true)}
            className="flex items-center gap-2 border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors flex-1 sm:flex-none justify-center"
          >
            <Filter className="w-5 h-5" />
            Filtros
            {((activeTab === 'tools' && (statusFilter !== 'all' || activeFilter !== 'active')) ||
              (activeTab === 'history' && (
                historyStatusFilter !== 'all' ||
                historyMonthFilter !== 'all' ||
                historyYearFilter !== 'all' ||
                historyWorkerFilter !== 'all' ||
                historyProjectFilter !== 'all'
              ))) && (
                <span className="ml-1 bg-blue-500/20 text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-500/30">
                  !
                </span>
              )}
          </Button>
          {((activeTab === 'tools' && (statusFilter !== 'all' || activeFilter !== 'active')) ||
            (activeTab === 'history' && (
              historyStatusFilter !== 'all' ||
              historyMonthFilter !== 'all' ||
              historyYearFilter !== 'all' ||
              historyWorkerFilter !== 'all' ||
              historyProjectFilter !== 'all'
            ))) && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (activeTab === 'tools') {
                    setStatusFilter('all')
                    setActiveFilter('active')
                  } else {
                    setHistoryStatusFilter('all')
                    setHistoryMonthFilter('all')
                    setHistoryYearFilter('all')
                    setHistoryWorkerFilter('all')
                    setHistoryProjectFilter('all')
                  }
                }}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
                title="Limpiar filtros"
              >
                <XCircle className="w-5 h-5" />
              </Button>
            )}
          <Button
            onClick={() => setShowToolForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none justify-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Herramienta
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Tarjeta Total */}
        <Card
          className={`cursor-pointer transition-all duration-200 border-2 ${statusFilter === 'all'
            ? 'bg-blue-900/30 border-blue-500 shadow-lg'
            : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
            }`}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Layers className={`w-5 h-5 ${statusFilter === 'all' ? 'text-blue-400' : 'text-slate-400'
                }`} />
              <span className={`font-semibold ${statusFilter === 'all' ? 'text-blue-400' : 'text-slate-300'
                }`}>
                Total
              </span>
            </div>
            <div className={`text-2xl font-bold text-center ${statusFilter === 'all' ? 'text-blue-400' : 'text-slate-400'
              }`}>
              {stats.total}
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta Disponibles */}
        <Card
          className={`cursor-pointer transition-all duration-200 border-2 ${statusFilter === 'disponible'
            ? 'bg-emerald-900/30 border-emerald-500 shadow-lg'
            : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
            }`}
          onClick={() => setStatusFilter('disponible')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className={`w-5 h-5 ${statusFilter === 'disponible' ? 'text-emerald-400' : 'text-slate-400'
                }`} />
              <span className={`font-semibold ${statusFilter === 'disponible' ? 'text-emerald-400' : 'text-slate-300'
                }`}>
                Disponibles
              </span>
            </div>
            <div className={`text-2xl font-bold text-center ${statusFilter === 'disponible' ? 'text-emerald-400' : 'text-slate-400'
              }`}>
              {stats.available}
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta Prestadas */}
        <Card
          className={`cursor-pointer transition-all duration-200 border-2 ${statusFilter === 'prestada'
            ? 'bg-orange-900/30 border-orange-500 shadow-lg'
            : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
            }`}
          onClick={() => setStatusFilter('prestada')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className={`w-5 h-5 ${statusFilter === 'prestada' ? 'text-orange-400' : 'text-slate-400'
                }`} />
              <span className={`font-semibold ${statusFilter === 'prestada' ? 'text-orange-400' : 'text-slate-300'
                }`}>
                Prestadas
              </span>
            </div>
            <div className={`text-2xl font-bold text-center ${statusFilter === 'prestada' ? 'text-orange-400' : 'text-slate-400'
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
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'tools'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Wrench className="w-4 h-4 inline mr-2" />
            Herramientas
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
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
          </div>

          {/* Tools List */}
          <ToolList
            tools={filteredTools}
            loans={loans}
            workers={workers}
            users={users}
            projects={projects}
            onEdit={(tool) => {
              setSelectedTool(tool)
              setShowToolForm(true)
            }}
            onDelete={handleDeleteTool}
            onReactivate={handleReactivateTool}
            onLoan={handleLoanTool}
            onView={handleViewTool}
          />
        </div>
      )}

      {showDetailsModal && selectedTool && (
        <ToolDetailsModal
          tool={selectedTool}
          loans={loans}
          workers={workers}
          users={users}
          projects={projects}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedTool(null)
          }}
        />
      )}

      {activeTab === 'history' && (
        <LoanHistory
          loans={loans}
          workers={workers}
          projects={projects}
          onReturn={handleReturnToolForModal}
          statusFilter={historyStatusFilter}
          monthFilter={historyMonthFilter}
          yearFilter={historyYearFilter}
          workerFilter={historyWorkerFilter}
          projectFilter={historyProjectFilter}
        />
      )}

      {activeTab === 'tools' ? (
        <ToolFiltersSidebar
          isOpen={isFilterSidebarOpen}
          onClose={() => setIsFilterSidebarOpen(false)}
          currentStatusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          currentActiveFilter={activeFilter}
          onActiveFilterChange={setActiveFilter}
        />
      ) : (
        <LoanHistoryFiltersSidebar
          isOpen={isFilterSidebarOpen}
          onClose={() => setIsFilterSidebarOpen(false)}
          currentStatusFilter={historyStatusFilter}
          onStatusFilterChange={setHistoryStatusFilter}
          currentMonthFilter={historyMonthFilter}
          onMonthFilterChange={setHistoryMonthFilter}
          currentYearFilter={historyYearFilter}
          onYearFilterChange={setHistoryYearFilter}
          currentWorkerFilter={historyWorkerFilter}
          onWorkerFilterChange={setHistoryWorkerFilter}
          currentProjectFilter={historyProjectFilter}
          onProjectFilterChange={setHistoryProjectFilter}
          workers={workers}
          projects={projects}
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
          activeLoan={selectedTool ? getActiveLoan(selectedTool.id) : undefined}
        />
      )}

      <ConfirmationModal
        isOpen={confirmDeleteToolState.isOpen}
        onClose={() => setConfirmDeleteToolState({ isOpen: false, toolId: null })}
        onConfirm={executeDeleteTool}
        title="Deshabilitar Herramienta"
        message="¿Estás seguro de que quieres deshabilitar esta herramienta?"
        confirmText="Deshabilitar"
        type="danger"
      />
    </div>
  )
}
