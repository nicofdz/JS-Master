'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    Clock,
    Award,
    Search,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Trash2,
    UserPlus,
    Eye,
    RotateCcw,
    Archive
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { JobApplicationsFiltersSidebar } from './JobApplicationsFiltersSidebar'
import { Button } from '@/components/ui/Button'
import { Filter } from 'lucide-react'

// Note: Ensure this type matches your DB schema
type JobApplication = {
    id: string
    full_name: string
    rut: string
    email: string
    phone: string
    experience_years: number
    specialization: string
    message: string
    status: 'pending' | 'reviewed' | 'contacted' | 'rejected' | 'hired'
    created_at: string
    is_active: boolean
}

const statusColors = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    reviewed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    contacted: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    hired: 'bg-green-500/10 text-green-500 border-green-500/20',
}

const statusLabels = {
    pending: 'Pendiente',
    reviewed: 'Revisado',
    contacted: 'Contactado',
    rejected: 'Rechazado',
    hired: 'Contratado',
}

export function JobApplicationsTable() {
    const [applications, setApplications] = useState<JobApplication[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showTrash, setShowTrash] = useState(false)
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false)

    useEffect(() => {
        fetchApplications()
    }, [showTrash])

    async function fetchApplications() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('job_applications')
                .select('*')
                .eq('is_active', !showTrash)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching applications:', error)
            } else {
                setApplications(data || [])
            }
        } finally {
            setLoading(false)
        }
    }

    async function executeDelete() {
        if (!confirmDeleteId) return

        try {
            if (showTrash) {
                // Hard Delete
                const { error } = await supabase
                    .from('job_applications')
                    .delete()
                    .eq('id', confirmDeleteId)
                if (error) throw error
            } else {
                // Soft Delete
                const { error } = await supabase
                    .from('job_applications')
                    .update({ is_active: false })
                    .eq('id', confirmDeleteId)
                if (error) throw error
            }

            setApplications(prev => prev.filter(app => app.id !== confirmDeleteId))
            toast.success(showTrash ? 'Postulación eliminada permanentemente' : 'Postulación movida a la papelera')
        } catch (error) {
            console.error('Error deleting application:', error)
            toast.error('Error al eliminar la postulación')
        } finally {
            setConfirmDeleteId(null)
        }
    }



    const router = useRouter()

    function handleHire(app: JobApplication) {
        // Build URL with query params
        const params = new URLSearchParams({
            action: 'create',
            name: app.full_name,
            rut: app.rut,
            email: app.email,
            phone: app.phone
        })

        router.push(`/trabajadores?${params.toString()}`)
    }

    async function restoreApplication(id: string) {
        try {
            const { error } = await supabase
                .from('job_applications')
                .update({ is_active: true })
                .eq('id', id)

            if (error) throw error

            setApplications(prev => prev.filter(app => app.id !== id))
            toast.success('Postulación restaurada correctamente')
        } catch (error) {
            console.error('Error restoring application:', error)
            toast.error('Error al restaurar la postulación')
        }
    }

    async function updateStatus(id: string, newStatus: string) {
        try {
            const { error } = await supabase
                .from('job_applications')
                .update({ status: newStatus })
                .eq('id', id)

            if (error) throw error

            // Update local state
            setApplications(prev =>
                prev.map(app =>
                    app.id === id ? { ...app, status: newStatus as any } : app
                )
            )
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Error al actualizar el estado')
        }
    }

    const filteredApplications = applications.filter(app => {
        const matchesSearch =
            app.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.rut.includes(searchTerm) ||
            app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.specialization.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = filterStatus === 'all' || app.status === filterStatus

        return matchesSearch && matchesStatus
    })

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    const formatSpecialization = (text: string) => {
        return text.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, RUT, email..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => setIsFilterSidebarOpen(true)}
                        className="flex items-center gap-2 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors flex-1 md:flex-none justify-center"
                    >
                        <Filter className="w-4 h-4" />
                        <span>Filtros</span>
                        {filterStatus !== 'all' && (
                            <span className="bg-blue-500/20 text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-500/30">
                                !
                            </span>
                        )}
                    </Button>

                    <button
                        onClick={() => setShowTrash(!showTrash)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border flex-1 md:flex-none justify-center ${showTrash
                            ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-700'
                            }`}
                    >
                        {showTrash ? (
                            <>
                                <Archive className="w-4 h-4" />
                                <span>Ver Activos</span>
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                <span>Papelera</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <JobApplicationsFiltersSidebar
                isOpen={isFilterSidebarOpen}
                onClose={() => setIsFilterSidebarOpen(false)}
                currentStatusFilter={filterStatus}
                onStatusFilterChange={setFilterStatus}
                counts={{
                    all: applications.length,
                    pending: applications.filter(a => a.status === 'pending').length,
                    reviewed: applications.filter(a => a.status === 'reviewed').length,
                    contacted: applications.filter(a => a.status === 'contacted').length,
                    hired: applications.filter(a => a.status === 'hired').length,
                    rejected: applications.filter(a => a.status === 'rejected').length
                }}
            />

            {/* Table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50 border-b border-slate-700">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Candidato</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Especialidad</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Mensaje</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredApplications.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No se encontraron postulaciones
                                    </td>
                                </tr>
                            ) : (
                                filteredApplications.map((app) => (
                                    <tr key={app.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                                                    {app.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-200">{app.full_name}</p>
                                                    <p className="text-sm text-slate-500">{app.rut}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
                                                    <Award className="w-3.5 h-3.5 text-blue-400" />
                                                    {formatSpecialization(app.specialization)}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Clock className="w-3 h-3" />
                                                    {app.experience_years} años exp.
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <a href={`mailto:${app.email}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-400 transition-colors">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    {app.email}
                                                </a>
                                                <a href={`tel:${app.phone}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-400 transition-colors">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {app.phone}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-400 max-w-xs truncate" title={app.message}>
                                                {app.message || 'Sin mensaje adjunto'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="relative">
                                                <select
                                                    value={app.status}
                                                    onChange={(e) => updateStatus(app.id, e.target.value)}
                                                    className={`appearance-none cursor-pointer pl-3 pr-8 py-1 rounded-full text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors ${statusColors[app.status]}`}
                                                    style={{
                                                        // Fallback for custom arrow or just hide it? 
                                                        // Let's use a background image for the arrow or just standard select behavior styled well.
                                                        // "appearance-none" removes the arrow. Let's add it back or use a wrapper.
                                                        // A simple select with colors is often enough if styled right.
                                                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                                        backgroundPosition: 'right 0.2rem center',
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundSize: '1.2em 1.2em'
                                                    }}
                                                >
                                                    <option value="pending" className="bg-slate-800 text-slate-300">Pendiente</option>
                                                    <option value="reviewed" className="bg-slate-800 text-slate-300">Revisado</option>
                                                    <option value="contacted" className="bg-slate-800 text-slate-300">Contactado</option>
                                                    <option value="hired" className="bg-slate-800 text-slate-300">Contratado</option>
                                                    <option value="rejected" className="bg-slate-800 text-slate-300">Rechazado</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">

                                                <button
                                                    onClick={() => setSelectedApplication(app)}
                                                    className="p-1 text-blue-500 hover:text-blue-400 transition-colors"
                                                    title="Ver detalles"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>

                                                <button
                                                    onClick={() => handleHire(app)}
                                                    className="p-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                                                    title="Contratar (Crear Trabajador)"
                                                >
                                                    <UserPlus className="w-5 h-5" />
                                                </button>

                                                <button
                                                    onClick={() => setConfirmDeleteId(app.id)}
                                                    className="p-1 text-red-500 hover:text-red-400 transition-colors"
                                                    title="Eliminar postulación"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>

                                                {showTrash && (
                                                    <button
                                                        onClick={() => restoreApplication(app.id)}
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
                    ? "¿Estás seguro de que deseas eliminar permanentemente esta postulación? Esta acción NO se puede deshacer."
                    : "¿Estás seguro de que deseas mover esta postulación a la papelera? Podrás restaurarla luego."}
                type="danger"
                cancelText="Cancelar"
                confirmText={showTrash ? "Eliminar" : "Mover a Papelera"}
            />

            {/* Modal de Detalles */}
            <Modal
                isOpen={!!selectedApplication}
                onClose={() => setSelectedApplication(null)}
                title="Detalles de la Postulación"
                size="lg"
            >
                {selectedApplication && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-6 border-b border-slate-700">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-2xl font-bold border border-blue-500/20">
                                    {selectedApplication.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-100">{selectedApplication.full_name}</h3>
                                    <p className="text-slate-400">{selectedApplication.rut}</p>
                                </div>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${statusColors[selectedApplication.status]}`}>
                                {statusLabels[selectedApplication.status]}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Información Profesional</h4>
                                <div className="bg-slate-900/50 p-4 rounded-xl space-y-3 border border-slate-700">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Especialidad</span>
                                        <span className="text-slate-200 font-medium">{formatSpecialization(selectedApplication.specialization)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Experiencia</span>
                                        <span className="text-slate-200 font-medium">{selectedApplication.experience_years} años</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Fecha Postulación</span>
                                        <span className="text-slate-200 font-medium">
                                            {new Date(selectedApplication.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Información de Contacto</h4>
                                <div className="bg-slate-900/50 p-4 rounded-xl space-y-3 border border-slate-700">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-slate-500 text-xs">Correo Electrónico</span>
                                        <a href={`mailto:${selectedApplication.email}`} className="text-blue-400 hover:underline">
                                            {selectedApplication.email}
                                        </a>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-slate-500 text-xs">Teléfono</span>
                                        <a href={`tel:${selectedApplication.phone}`} className="text-blue-400 hover:underline">
                                            {selectedApplication.phone}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Mensaje del Candidato</h4>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 min-h-[100px]">
                                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {selectedApplication.message || 'El candidato no ha incluido un mensaje adicional.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                            <button
                                onClick={() => setSelectedApplication(null)}
                                className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors font-medium border border-slate-600 rounded-lg hover:bg-slate-700"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => {
                                    handleHire(selectedApplication)
                                    setSelectedApplication(null)
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <UserPlus className="w-4 h-4" />
                                Contratar
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
