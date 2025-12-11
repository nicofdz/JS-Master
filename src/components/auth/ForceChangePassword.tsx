import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authService } from '@/lib/auth'
import toast from 'react-hot-toast'
import { Lock } from 'lucide-react'

interface ForceChangePasswordProps {
    userId: string
    onSuccess: () => void
}

export function ForceChangePassword({ userId, onSuccess }: ForceChangePasswordProps) {
    const [loading, setLoading] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden')
            return
        }

        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres')
            return
        }

        try {
            setLoading(true)

            // 1. Actualizar contraseña en Auth
            const { error: authError } = await authService.updatePassword(password)
            if (authError) throw authError

            // 2. Actualizar flag en User Profile
            const { error: profileError } = await authService.updateUserProfile(userId, {
                must_change_password: false
            })
            if (profileError) throw profileError

            toast.success('Contraseña actualizada exitosamente')
            onSuccess()
        } catch (error: any) {
            console.error('Error updating password:', error)
            toast.error(error.message || 'Error al actualizar contraseña')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-md w-full shadow-2xl">
                <div className="flex flex-col items-center mb-6 text-center">
                    <div className="bg-amber-500/10 p-4 rounded-full mb-4">
                        <Lock className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-100">Cambio de Contraseña Requerido</h2>
                    <p className="text-slate-400 mt-2">
                        Por seguridad, debes cambiar tu contraseña predeterminada antes de continuar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nueva Contraseña</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-slate-900 border-slate-700 text-slate-100"
                            required
                            minLength={6}
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Confirmar Contraseña</label>
                        <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="bg-slate-900 border-slate-700 text-slate-100"
                            required
                            minLength={6}
                            placeholder="Repite la contraseña"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 mt-6"
                        disabled={loading}
                    >
                        {loading ? 'Actualizando...' : 'Actualizar Contraseña e Ingresar'}
                    </Button>
                </form>
            </div>
        </div>
    )
}
