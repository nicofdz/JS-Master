import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UserRole, ROLE_LABELS } from '@/types/auth'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/lib/auth'
import toast from 'react-hot-toast'

interface CreateUserModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
    const { signUp } = useAuth()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'supervisor' as UserRole,
        phone: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.password !== formData.confirmPassword) {
            toast.error('Las contraseñas no coinciden')
            return
        }

        if (formData.password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres')
            return
        }

        try {
            setLoading(true)
            const { data, error } = await signUp(
                formData.email,
                formData.password,
                formData.fullName,
                formData.role,
                { redirectTo: `${window.location.origin}/auth/callback` }
            )

            if (error) {
                throw error
            }

            // Explicitly create/update user profile to ensure it exists immediately
            // This is necessary because sometimes the database trigger waits for email confirmation
            if (data.user) {
                await authService.upsertUserProfile({
                    id: data.user.id,
                    email: formData.email,
                    full_name: formData.fullName,
                    role: formData.role,
                    is_active: true,
                    must_change_password: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
            }

            toast.success('Usuario creado exitosamente')
            onSuccess()
            onClose()

            // Reset form
            setFormData({
                fullName: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'supervisor',
                phone: ''
            })

        } catch (error: any) {
            console.error('Error creating user:', error)
            toast.error(error.message || 'Error al crear usuario')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Crear Nuevo Usuario">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300">Nombre Completo</label>
                    <Input
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-slate-100"
                        required
                        placeholder="Ej: Juan Pérez"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300">Email</label>
                    <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-slate-100"
                        required
                        placeholder="juan@ejemplo.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300">Rol</label>
                    <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                        className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {Object.entries(ROLE_LABELS)
                            .filter(([value]) => ['admin', 'supervisor'].includes(value))
                            .map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Contraseña</label>
                        <Input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="bg-slate-800 border-slate-700 text-slate-100"
                            required
                            minLength={6}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Confirmar</label>
                        <Input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="bg-slate-800 border-slate-700 text-slate-100"
                            required
                            minLength={6}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? 'Creando...' : 'Crear Usuario'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
