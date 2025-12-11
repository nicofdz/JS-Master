import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { UserProfile, ROLE_LABELS } from '@/types/auth'
import { Calendar, Mail, Phone, Shield, User, Clock } from 'lucide-react'

interface UserDetailModalProps {
    isOpen: boolean
    onClose: () => void
    user: UserProfile | null
}

export function UserDetailModal({ isOpen, onClose, user }: UserDetailModalProps) {
    if (!user) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalles del Usuario">
            <div className="space-y-6">
                {/* Header con Estado */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${user.is_active !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-100">{user.full_name}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.is_active !== false
                                    ? 'bg-green-500/10 text-green-500'
                                    : 'bg-red-500/10 text-red-500'
                                }`}>
                                {user.is_active !== false ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Información Detallada */}
                <div className="grid gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                        <Mail className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-xs text-slate-500">Correo Electrónico</p>
                            <p className="text-sm text-slate-200">{user.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                        <Shield className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-xs text-slate-500">Rol del Sistema</p>
                            <p className="text-sm font-medium text-blue-400">
                                {ROLE_LABELS[user.role]}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                        <Phone className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-xs text-slate-500">Teléfono</p>
                            <p className="text-sm text-slate-200">{user.phone || 'No registrado'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                            <Calendar className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-xs text-slate-500">Fecha Registro</p>
                                <p className="text-xs text-slate-200">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                            <Clock className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-xs text-slate-500">Última Actualización</p>
                                <p className="text-xs text-slate-200">
                                    {new Date(user.updated_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
