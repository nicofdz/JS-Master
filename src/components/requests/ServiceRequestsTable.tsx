'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    Briefcase,
    Search,
    Eye,
    Trash2,
    RotateCcw,
    Archive
} from 'lucide-react'

// Note: Ensure this type matches your DB schema
type ServiceRequest = {
    id: string
    company_name?: string
    contact_name: string
    email: string
    phone: string
    project_type: string
    location: string
    message: string
    status: 'new' | 'contacted' | 'quoted' | 'closed'
    created_at: string
    is_active: boolean
}

const statusColors = {
    new: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    contacted: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    quoted: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    closed: 'bg-green-500/10 text-green-500 border-green-500/20',
}

const statusLabels = {
    new: 'Nuevo',
    contacted: 'Contactado',
    quoted: 'Cotizado',
    closed: 'Cerrado',
}

export function ServiceRequestsTable() {
    const [requests, setRequests] = useState<ServiceRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showTrash, setShowTrash] = useState(false)
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

    useEffect(() => {
        fetchRequests()
    }, [showTrash])

    async function fetchRequests() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('service_requests')
                .select('*')
                .eq('is_active', !showTrash)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching requests:', error)
                toast.error('Error al cargar las solicitudes')
            } else {
                setRequests(data || [])
            }
        } finally {
            setLoading(false)
        }
    }

    async function updateStatus(id: string, newStatus: string) {
        try {
            const { error } = await supabase
                .from('service_requests')
                .update({ status: newStatus })
                .eq('id', id)

            if (error) throw error

            // Update local state
            setRequests(prev =>
                prev.map(req =>
                    req.id === id ? { ...req, status: newStatus as any } : req
                )
            )
            toast.success('Estado actualizado correctamente')
        } catch (error) {
            console.error('Error updating status:', error)
            toast.error('Error al actualizar el estado')
        }
    }

    async function executeDelete() {
        if (!confirmDeleteId) return

        try {
            if (showTrash) {
                // Hard Delete
                const { error } = await supabase
                    .from('service_requests')
                    .delete()
                    .eq('id', confirmDeleteId)
                if (error) throw error
            } else {
                // Soft Delete
                const { error } = await supabase
                    .from('service_requests')
                    .update({ is_active: false })
                    .eq('id', confirmDeleteId)
                if (error) throw error
            }

            setRequests(prev => prev.filter(req => req.id !== confirmDeleteId))
            toast.success(showTrash ? 'Solicitud eliminada permanentemente' : 'Solicitud movida a la papelera')
        } catch (error: any) {
            console.error('Error deleting request:', error)
            toast.error('Error al eliminar la solicitud: ' + (error.message || 'Error desconocido'))
        } finally {
            setConfirmDeleteId(null)
        }
    }

    async function restoreRequest(id: string) {
        try {
            const { error } = await supabase
                .from('service_requests')
                .update({ is_active: true })
                .eq('id', id)

            if (error) throw error

            setRequests(prev => prev.filter(req => req.id !== id))
            toast.success('Solicitud restaurada correctamente')
        } catch (error) {
            console.error('Error restoring request:', error)
            toast.error('Error al restaurar la solicitud')
        }
    }

    const filteredRequests = requests.filter(req => {
        const matchesSearch =
            req.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.company_name && req.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.location.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = filterStatus === 'all' || req.status === filterStatus

        return matchesSearch && matchesStatus
    })

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar por empresa, contacto, ubicación..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">Todos los estados</option>
                    <option value="new">Nuevos</option>
                    <option value="contacted">Contactados</option>
                    <option value="quoted">Cotizados</option>
                    <option value="closed">Cerrados</option>
                </select>

                <button
                    onClick={() => setShowTrash(!showTrash)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${showTrash
                        ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-700'
                        }`}
                >
                    {showTrash ? (
                        <>
                            <Archive className="w-4 h-4" />
                            Ver Activos
                        </>
                    ) : (
                        <>
                            <Trash2 className="w-4 h-4" />
                            Papelera
                        </>
                    )}
                </button>
            </div>

            {/* Table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50 border-b border-slate-700">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Solicitante</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Proyecto</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No se encontraron solicitudes
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-200">
                                                        {req.company_name || req.contact_name}
                                                    </p>
                                                    {req.company_name && (
                                                        <p className="text-sm text-slate-500">{req.contact_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium capitalize">
                                                    <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                                                    {req.project_type || 'No especificado'}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                                    <MapPin className="w-3 h-3" />
                                                    {req.location || 'Sin ubicación'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <a href={`mailto:${req.email}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-400 transition-colors">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    {req.email}
                                                </a>
                                                <a href={`tel:${req.phone}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-400 transition-colors">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {req.phone}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="relative">
                                                <select
                                                    value={req.status}
                                                    onChange={(e) => updateStatus(req.id, e.target.value)}
                                                    className={`appearance-none cursor-pointer pl-3 pr-8 py-1 rounded-full text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors ${statusColors[req.status]}`}
                                                    style={{
                                                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                                        backgroundPosition: 'right 0.2rem center',
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundSize: '1.2em 1.2em'
                                                    }}
                                                >
                                                    <option value="new" className="bg-slate-800 text-slate-300">Nuevo</option>
                                                    <option value="contacted" className="bg-slate-800 text-slate-300">Contactado</option>
                                                    <option value="quoted" className="bg-slate-800 text-slate-300">Cotizado</option>
                                                    <option value="closed" className="bg-slate-800 text-slate-300">Cerrado</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">

                                                <button
                                                    onClick={() => setSelectedRequest(req)}
                                                    className="p-1 text-blue-500 hover:text-blue-400 transition-colors"
                                                    title="Ver detalles"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>

                                                <button
                                                    onClick={() => setConfirmDeleteId(req.id)}
                                                    className="p-1 text-red-500 hover:text-red-400 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>

                                                {showTrash && (
                                                    <button
                                                        onClick={() => restoreRequest(req.id)}
                                                        className="p-1 text-blue-500 hover:text-blue-400 transition-colors"
                                                        title="Restaurar"
                                                    >
                                                        <RotateCcw className="w-5 h-5" />
                                                    </button>
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


            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={executeDelete}
                title={showTrash ? "Eliminar Permanentemente" : "Mover a Papelera"}
                message={showTrash
                    ? "¿Estás seguro de que deseas eliminar permanentemente esta solicitud? Esta acción NO se puede deshacer."
                    : "¿Estás seguro de que deseas mover esta solicitud a la papelera? Podrás restaurarla luego."}
                type="danger"
                cancelText="Cancelar"
                confirmText={showTrash ? "Eliminar" : "Mover a Papelera"}
            />

            {/* Details Modal */}
            <Modal
                isOpen={!!selectedRequest}
                onClose={() => setSelectedRequest(null)}
                title="Detalles de la Solicitud"
            >
                {selectedRequest && (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20 text-xl shrink-0">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-100">
                                    {selectedRequest.company_name || selectedRequest.contact_name}
                                </h3>
                                {selectedRequest.company_name && (
                                    <p className="text-slate-400">{selectedRequest.contact_name}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[selectedRequest.status]}`}>
                                        {statusLabels[selectedRequest.status]}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {new Date(selectedRequest.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Project Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                    Información del Proyecto
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Briefcase className="w-4 h-4 text-blue-400" />
                                        <span>{selectedRequest.project_type}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <MapPin className="w-4 h-4 text-blue-400" />
                                        <span>{selectedRequest.location}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                    Contacto
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-slate-500 flex items-center gap-2">
                                            <Mail className="w-3 h-3" /> Correo Electrónico
                                        </span>
                                        <a
                                            href={`mailto:${selectedRequest.email}`}
                                            className="text-blue-400 hover:underline break-all"
                                        >
                                            {selectedRequest.email}
                                        </a>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-slate-500 flex items-center gap-2">
                                            <Phone className="w-3 h-3" /> Teléfono
                                        </span>
                                        <a
                                            href={`tel:${selectedRequest.phone}`}
                                            className="text-blue-400 hover:underline"
                                        >
                                            {selectedRequest.phone}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Message */}
                        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Mensaje
                            </h4>
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {selectedRequest.message || 'No hay mensaje adjunto.'}
                            </p>
                        </div>

                        {/* Actions in Modal */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-medium border border-slate-700"
                            >
                                Cerrar
                            </button>
                            <a
                                href={`mailto:${selectedRequest.email}?subject=Respuesta a su cotización - JS Master`}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-500/20"
                            >
                                Responder por Correo
                            </a>
                        </div>
                    </div>
                )}
            </Modal>
        </div >
    )
}
