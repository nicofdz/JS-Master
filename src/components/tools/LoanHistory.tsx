'use client'

import { useState } from 'react'
import { ArrowLeft, Calendar, User, Wrench, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { ToolLoan } from '@/hooks/useTools'

type Loan = ToolLoan

interface LoanHistoryProps {
  loans: Loan[]
  workers: Array<{ id: number; full_name: string }>
  projects: Array<{ id: number; name: string }>
  onReturn: (loanId: number, returnDetails: string) => void | Promise<void>
  statusFilter: string
  monthFilter: string
  yearFilter: string
  workerFilter: string
  projectFilter: string
}

export function LoanHistory({
  loans,
  workers,
  projects,
  onReturn,
  statusFilter,
  monthFilter,
  yearFilter,
  workerFilter,
  projectFilter
}: LoanHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [returnDetails, setReturnDetails] = useState('')
  const [selectedLoan, setSelectedLoan] = useState<number | null>(null)

  // Opciones para filtros
  const months = [
    { value: 'all', label: 'Todos los meses' },
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ]

  const years = [
    { value: 'all', label: 'Todos los años' },
    { value: '2023', label: '2023' },
    { value: '2024', label: '2024' },
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' }
  ]

  const filteredLoans = loans.filter(loan => {
    const matchesSearch =
      (loan.tool_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loan.borrower_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loan.lender_name || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && loan.return_date === null) ||
      (statusFilter === 'returned' && loan.return_date !== null)

    // Filtro por mes
    let matchesMonth = true
    if (monthFilter !== 'all') {
      const loanMonth = new Date(loan.loan_date).getMonth() + 1
      matchesMonth = loanMonth.toString() === monthFilter
    }

    // Filtro por año
    let matchesYear = true
    if (yearFilter !== 'all') {
      const loanYear = new Date(loan.loan_date).getFullYear()
      matchesYear = loanYear.toString() === yearFilter
    }

    // Filtro por trabajador
    let matchesWorker = true
    if (workerFilter !== 'all') {
      matchesWorker = loan.borrower_id.toString() === workerFilter
    }

    // Filtro por proyecto
    let matchesProject = true
    if (projectFilter !== 'all') {
      matchesProject = loan.project_id?.toString() === projectFilter
    }

    return matchesSearch && matchesStatus && matchesMonth && matchesYear && matchesWorker && matchesProject
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Prestada'
    return new Date(dateString).toLocaleDateString('es-CL')
  }

  const getStatusBadge = (loan: Loan) => {
    if (loan.return_date === null) {
      return <Badge className="bg-orange-900/30 text-orange-400 border border-orange-600/50">Activo</Badge>
    } else {
      return <Badge className="bg-emerald-900/30 text-emerald-400 border border-emerald-600/50">Devuelto</Badge>
    }
  }

  const handleReturn = (loanId: number) => {
    if (returnDetails.trim()) {
      onReturn(loanId, returnDetails)
      setReturnDetails('')
      setSelectedLoan(null)
    }
  }

  const stats = {
    total: loans.length,
    active: loans.filter(l => l.return_date === null).length,
    returned: loans.filter(l => l.return_date !== null).length
  }

  if (loans.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <Wrench className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-200 mb-2">No hay préstamos registrados</h3>
        <p className="text-slate-400">Los préstamos de herramientas aparecerán aquí.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Wrench className="w-8 h-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Total Préstamos</p>
                <p className="text-2xl font-bold text-slate-100">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-900/20 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Activos</p>
                <p className="text-2xl font-bold text-slate-100">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-emerald-900/20 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Devueltos</p>
                <p className="text-2xl font-bold text-slate-100">{stats.returned}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Buscar por herramienta o prestatario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </div>

      </div>

      {/* Loans List */}
      <div className="space-y-4">
        {filteredLoans.map((loan) => (
          <Card key={loan.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/80 transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between">
                <div className="flex-1 w-full">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold text-slate-100">
                      {loan.tool_name}
                    </h3>
                    {getStatusBadge(loan)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-slate-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-slate-400">Prestatario</p>
                        <p className="text-sm text-slate-200">{loan.borrower_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <User className="w-4 h-4 text-slate-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-slate-400">Prestador</p>
                        <p className="text-sm text-slate-200">{loan.lender_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-slate-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-slate-400">Fecha Préstamo</p>
                        <p className="text-sm text-slate-200">{formatDate(loan.loan_date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <ArrowLeft className="w-4 h-4 text-slate-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-slate-400">Fecha Devolución</p>
                        <p className="text-sm text-slate-200">{formatDate(loan.return_date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Wrench className="w-4 h-4 text-slate-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-slate-400">Proyecto</p>
                        <p className="text-sm text-slate-200">{loan.project_name || 'Sin proyecto'}</p>
                      </div>
                    </div>
                  </div>

                  {loan.return_details && (
                    <div>
                      <p className="text-sm font-medium text-slate-400 mb-1">Detalles de Devolución</p>
                      <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                        {loan.return_details}
                      </p>
                    </div>
                  )}
                </div>

                {loan.return_date === null && (
                  <div className="mt-4 sm:mt-0 sm:ml-4 w-full sm:w-auto">
                    {selectedLoan === loan.id ? (
                      <div className="space-y-3 w-full sm:min-w-[300px]">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Detalles de Devolución
                          </label>
                          <textarea
                            value={returnDetails}
                            onChange={(e) => setReturnDetails(e.target.value)}
                            placeholder="Describe el estado de la herramienta al devolverla..."
                            className="w-full p-3 bg-slate-900/50 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleReturn(loan.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                            disabled={!returnDetails.trim()}
                          >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Devolver
                          </Button>
                          <Button
                            onClick={() => setSelectedLoan(null)}
                            size="sm"
                            className="bg-slate-700 hover:bg-slate-600 text-slate-200 flex-1 sm:flex-none"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setSelectedLoan(loan.id)}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Devolver
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {
        filteredLoans.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500">No se encontraron préstamos con los filtros aplicados.</p>
          </div>
        )
      }
    </div >
  )
}
