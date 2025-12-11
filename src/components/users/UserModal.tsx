import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UserProfile, UserRole, ROLE_LABELS } from '@/types/auth'
import { X } from 'lucide-react'

interface UserModalProps {
    isOpen: boolean
    onClose: () => void
    user: UserProfile | null
    onSave: (id: string, updates: Partial<UserProfile>) => Promise<void>
}

export function UserModal({ isOpen, onClose, user, onSave }: UserModalProps) {
    const [formData, setFormData] = useState<Partial<UserProfile>>({})
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name,
                role: user.role,
                phone: user.phone || '',
                is_active: user.is_active ?? true
            })
        }
    }, [user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        try {
            setIsLoading(true)
            await onSave(user.id, formData)
            onClose()
        } catch (error) {
            console.error('Error saving user:', error)
        } finally {
            setIsLoading(false)
        }
    }

    if (!user) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Usuario">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300">Nombre Completo</label>
                    <Input
                        value={formData.full_name || ''}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-slate-100"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300">Email</label>
                    <Input
                        value={user.email}
                        disabled
                        className="bg-slate-800/50 border-slate-700 text-slate-400 cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300">Rol</label>
                    <select
                        value={formData.role || 'maestro'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                        className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300">Teléfono</label>
                    <Input
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-slate-100"
                        placeholder="+56 9 ..."
                    />
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active ?? true}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-slate-300">
                        Usuario Activo
                    </label>
                </div>
                <p className="text-xs text-slate-500">
                    Los usuarios inactivos no podrán iniciar sesión en el sistema.
                </p>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
