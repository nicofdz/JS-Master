'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/hooks/useUsers'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
    Search,
    UserPlus,
    MoreVertical,
    Edit2,
    Eye,
    Power,
    Trash2,
    Users,
    Briefcase
} from 'lucide-react'
import { UserProfile, ROLE_LABELS } from '@/types/auth'
import { UserModal } from '@/components/users/UserModal'
import { UserDetailModal } from '@/components/users/UserDetailModal'
import { CreateUserModal } from '@/components/users/CreateUserModal'
import { AssignProjectsModal } from '@/components/users/AssignProjectsModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function UsersPage() {
    const { profile, loading: authLoading } = useAuth()
    const { users, loading: usersLoading, fetchUsers, updateUser, toggleUserStatus, deleteUser, assignProjects, getUserProjects } = useUsers()
    const router = useRouter()

    const [searchTerm, setSearchTerm] = useState('')
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    // Assign Projects State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [userAssignments, setUserAssignments] = useState<number[]>([])

    // Confirm Dialog State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [confirmData, setConfirmData] = useState<{
        title: string
        message: string
        action: () => Promise<void>
        variant: 'danger' | 'warning'
    } | null>(null)

    // Protección de ruta: Solo Admin
    useEffect(() => {
        if (!authLoading && profile && profile.role !== 'admin') {
            toast.error('Acceso denegado')
            router.push('/dashboard')
        }
    }, [profile, authLoading, router])

    // Cargar usuarios
    useEffect(() => {
        if (profile?.role === 'admin') {
            fetchUsers(true) // Include inactive users
        }
    }, [profile, fetchUsers])

    const handleEdit = (user: UserProfile) => {
        setSelectedUser(user)
        setIsEditModalOpen(true)
    }

    const handleView = (user: UserProfile) => {
        setSelectedUser(user)
        setIsDetailModalOpen(true)
    }

    const handleAssignProjects = async (user: UserProfile) => {
        setSelectedUser(user)
        // Cargar asignaciones actuales
        const { data, error } = await getUserProjects(user.id)
        if (error) {
            toast.error('Error al cargar asignaciones')
            return
        }
        setUserAssignments(data)
        setIsAssignModalOpen(true)
    }

    const handleSaveAssignments = async (userId: string, projectIds: number[]) => {
        const { error } = await assignProjects(userId, projectIds)
        if (error) {
            toast.error('Error al guardar asignaciones')
        } else {
            toast.success('Asignaciones actualizadas correctamente')
        }
    }

    const handleToggleStatus = (user: UserProfile) => {
        const newStatus = !(user.is_active ?? true)
        const actionText = newStatus ? 'activar' : 'desactivar'

        setConfirmData({
            title: `${newStatus ? 'Activar' : 'Desactivar'} Usuario`,
            message: `¿Estás seguro de que deseas ${actionText} a ${user.full_name}? ${!newStatus ? 'El usuario no podrá acceder al sistema.' : ''}`,
            variant: newStatus ? 'warning' : 'danger',
            action: async () => {
                try {
                    await toggleUserStatus(user.id, newStatus)
                    toast.success(`Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`)
                    fetchUsers(true)
                } catch (error) {
                    toast.error('Error al cambiar estado del usuario')
                }
            }
        })
        setIsConfirmOpen(true)
    }

    const handleDelete = (user: UserProfile) => {
        setConfirmData({
            title: 'Eliminar Usuario Permanentemente',
            message: `¿Estás seguro de que deseas eliminar a "${user.full_name}"? Esta acción eliminará su perfil de datos. ATENCIÓN: Esta acción es irreversible.`,
            variant: 'danger',
            action: async () => {
                try {
                    const { error } = await deleteUser(user.id)
                    if (error) throw error
                    toast.success('Usuario eliminado permanentemente')
                } catch (error) {
                    toast.error('Error al eliminar usuario')
                }
            }
        })
        setIsConfirmOpen(true)
    }

    const handleConfirmAction = async () => {
        if (confirmData) {
            await confirmData.action()
            setIsConfirmOpen(false)
            setConfirmData(null)
        }
    }

    const handleSaveUser = async (id: string, updates: Partial<UserProfile>) => {
        const { error } = await updateUser(id, updates)
        if (error) {
            toast.error('Error al actualizar usuario')
            throw error
        }
        toast.success('Usuario actualizado correctamente')
        fetchUsers(true)
    }

    const handleCreateSuccess = () => {
        fetchUsers(true)
    }

    // Filtrado de usuarios
    const filteredUsers = users.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (authLoading || usersLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (profile?.role !== 'admin') return null

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="w-full space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Gestión de Usuarios</h1>
                            <p className="text-slate-400">Administra los usuarios, roles y permisos del sistema</p>
                        </div>
                    </div>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Nuevo Usuario
                    </Button>
                </div>

                {/* Filtros y Búsqueda */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                placeholder="Buscar por nombre o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla de Usuarios */}
                <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-slate-900/50 text-slate-200 uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-4">Usuario</th>
                                    <th className="px-6 py-4">Rol</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4">Fecha Registro</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-100 font-medium">{user.full_name}</span>
                                                <span className="text-xs">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                                                {ROLE_LABELS[user.role]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active !== false
                                                ? 'bg-green-500/10 text-green-500'
                                                : 'bg-red-500/10 text-red-500'
                                                }`}>
                                                {user.is_active !== false ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleAssignProjects(user)}
                                                    className="hover:bg-transparent p-0 h-auto text-yellow-500 hover:text-yellow-400 hover:drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] transition-all duration-300"
                                                    title="Asignar Obras"
                                                >
                                                    <Briefcase className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(user)}
                                                    className="hover:bg-transparent p-0 h-auto text-blue-500 hover:text-blue-400 hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all duration-300"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleStatus(user)}
                                                    className={`hover:bg-transparent p-0 h-auto transition-all duration-300 ${user.is_active !== false
                                                        ? 'text-amber-500 hover:text-amber-400 hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                                                        : 'text-slate-500 hover:text-slate-400'
                                                        }`}
                                                    title={user.is_active !== false ? 'Desactivar' : 'Activar'}
                                                >
                                                    <Power className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(user)}
                                                    className="hover:bg-transparent p-0 h-auto text-red-500 hover:text-red-400 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all duration-300"
                                                    title="Eliminar permanentemente"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleView(user)}
                                                    className="hover:bg-transparent p-0 h-auto text-cyan-400 hover:text-cyan-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all duration-300"
                                                    title="Ver detalles"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            No se encontraron usuarios coincidenes
                        </div>
                    )}
                </Card>
            </div>

            <AssignProjectsModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                user={selectedUser}
                onSave={handleSaveAssignments}
                initialAssignments={userAssignments}
            />

            <UserModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                user={selectedUser}
                onSave={handleSaveUser}
            />

            <UserDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                user={selectedUser}
            />

            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleCreateSuccess}
            />

            {confirmData && (
                <ConfirmDialog
                    isOpen={isConfirmOpen}
                    onCancel={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmAction}
                    title={confirmData.title}
                    message={confirmData.message}
                    variant={confirmData.variant}
                    confirmText="Sí, continuar"
                    cancelText="No, cancelar"
                />
            )}
        </div>
    )
}
