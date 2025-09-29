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
    return matchesSearch && matchesStatus
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Trabajadores</h1>
            <p className="text-gray-600">Administra todos los trabajadores del sistema</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowContractModal(true)} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
                      Generar Documentos
            </Button>
            <Button onClick={handleCreate} className="flex items-center gap-2">
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

      {/* Lista de trabajadores */}
      <div className="bg-white rounded-lg shadow">
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
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        worker.is_active 
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