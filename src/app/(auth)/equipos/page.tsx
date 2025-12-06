'use client'

import React, { useState } from 'react'
import { useWorkers } from '@/hooks/useWorkers'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { WorkerForm } from '@/components/workers/WorkerForm'
import { ContractGeneratorModal } from '@/components/contracts/ContractGeneratorModal'
import { Plus, Search, Edit, Trash2, User, Users, UserCheck, UserX, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function TrabajadoresPage() {
  const { workers, loading, error, createWorker, updateWorker, deleteWorker, refresh } = useWorkers()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<any>(null)
  const [showContractModal, setShowContractModal] = useState(false)

  // Filtrar trabajadores
  const filteredWorkers = workers.filter(worker => {
    const matchesSearch = worker.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.phone?.includes(searchTerm)
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && worker.is_active) ||
      (statusFilter === 'inactive' && !worker.is_active)
    const matchesContractType = contractTypeFilter === 'all' ||
      worker.contract_type === contractTypeFilter
    return matchesSearch && matchesStatus && matchesContractType
  })

  const handleDelete = async (workerId: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este trabajador?')) {
      try {
        await deleteWorker(workerId)
        toast.success('Trabajador eliminado exitosamente')
      } catch (error) {
        toast.error('Error al eliminar trabajador')
      }
    }
  }

  const handleEdit = (worker: any) => {
    setEditingWorker(worker)
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

  // Estadísticas
  const totalWorkers = workers.length
  const activeWorkers = workers.filter(w => w.is_active).length
  const inactiveWorkers = workers.filter(w => !w.is_active).length

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Trabajadores</h1>
            <p className="text-gray-600">Administra todos los trabajadores del sistema</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <Button
              onClick={() => setShowContractModal(true)}
              variant="outline"
              className="flex items-center gap-2 flex-1 sm:flex-none justify-center"
            >
              <FileText className="h-4 w-4" />
              Generar Documentos
            </Button>
            <Button onClick={handleCreate} className="flex items-center gap-2 flex-1 sm:flex-none justify-center">
              <Plus className="h-4 w-4" />
              Nuevo Trabajador
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Total Trabajadores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalWorkers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Activos</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeWorkers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Inactivos</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{inactiveWorkers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="space-y-4">
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </div>

          {/* Toggle Tipo de Contrato */}
          <div className="flex gap-2 bg-slate-700/30 p-1 rounded-lg w-fit">
            <button
              onClick={() => setContractTypeFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${contractTypeFilter === 'all'
                  ? 'bg-slate-600 text-slate-100 shadow-md'
                  : 'text-slate-400 hover:text-slate-300'
                }`}
            >
              Todos
            </button>
            <button
              onClick={() => setContractTypeFilter('por_dia')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${contractTypeFilter === 'por_dia'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-300'
                }`}
            >
              Por Día
            </button>
            <button
              onClick={() => setContractTypeFilter('a_trato')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${contractTypeFilter === 'a_trato'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-300'
                }`}
            >
              A Trato
            </button>
          </div>
        </div>

        {/* Lista de trabajadores */}
        <div className="space-y-4">
          {/* Vista Móvil (Cards) */}
          <div className="md:hidden space-y-4">
            {filteredWorkers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-white rounded-lg shadow">
                {searchTerm || statusFilter !== 'all'
                  ? 'No se encontraron trabajadores'
                  : 'No hay trabajadores registrados'
                }
              </div>
            ) : (
              filteredWorkers.map(worker => (
                <div key={worker.id} className="bg-white p-4 rounded-lg shadow space-y-3 border border-slate-100">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{worker.full_name}</div>
                        <div className="text-sm text-gray-500">{worker.rut}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${worker.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        {worker.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs">Contrato</span>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full mt-1 ${worker.contract_type === 'a_trato'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                        }`}>
                        {worker.contract_type === 'a_trato' ? 'A Trato' : 'Por Día'}
                      </span>
                    </div>
                    {contractTypeFilter === 'por_dia' && (
                      <div>
                        <span className="text-gray-500 block text-xs">Tarifa</span>
                        <span className="font-medium text-green-600">${worker.daily_rate?.toLocaleString('es-CL') || '0'}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 space-y-1 pt-2 border-t border-gray-100">
                    {worker.email && <div className="flex items-center gap-2"><span className="text-xs">✉️</span> {worker.email}</div>}
                    {worker.phone && <div className="flex items-center gap-2"><span className="text-xs">📱</span> {worker.phone}</div>}
                    <div className="text-xs text-gray-400 mt-1">Reg: {formatDate(worker.created_at)}</div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleEdit(worker)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(worker.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vista Desktop (Tabla) */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trabajador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RUT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo de Contrato
                    </th>
                    {contractTypeFilter === 'por_dia' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tarifa Diaria
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Registro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={contractTypeFilter === 'por_dia' ? 8 : 7} className="px-6 py-12 text-center text-gray-500">
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
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${worker.contract_type === 'a_trato'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                            }`}>
                            {worker.contract_type === 'a_trato' ? 'A Trato' : 'Por Día'}
                          </span>
                        </td>
                        {contractTypeFilter === 'por_dia' && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-green-600">
                              ${worker.daily_rate?.toLocaleString('es-CL') || '0'}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${worker.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {worker.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(worker.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(worker)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(worker.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal de creación/edición */}
        <Modal
          isOpen={showCreateModal || !!editingWorker}
          onClose={handleCloseModal}
          title={editingWorker ? 'Editar Trabajador' : 'Nuevo Trabajador'}
        >
          <WorkerForm
            worker={editingWorker}
            onSave={handleSave}
            onCancel={handleCloseModal}
          />
        </Modal>

        {/* Modal de generación de contratos */}
        <ContractGeneratorModal
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
        />
      </div>
    </div>
  )
}