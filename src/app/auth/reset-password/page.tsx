'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks'
import { authService } from '@/lib/auth'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { user, loading } = useAuth()

    useEffect(() => {
        // Verificar si hay un hash en la URL (indicativo de flujo de recuperación)
        const hasHash = typeof window !== 'undefined' && window.location.hash.length > 0

        // Si no hay usuario, no está cargando y NO hay hash, entonces sí redirigir
        if (!loading && !user && !hasHash) {
            router.push('/login')
        }
    }, [user, loading, router])

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden')
            return
        }

        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres')
            return
        }

        setIsLoading(true)

        try {
            const { error } = await authService.updatePassword(password)

            if (error) {
                toast.error(error.message || 'Error al actualizar la contraseña')
                return
            }

            toast.success('Contraseña actualizada exitosamente. Por favor inicia sesión.')
            await authService.signOut()
            router.push('/login')
        } catch (error) {
            toast.error('Error inesperado')
        } finally {
            setIsLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Restablecer Contraseña
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Ingresa tu nueva contraseña
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Nueva Contraseña</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <Input
                                label="Nueva contraseña"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />

                            <Input
                                label="Confirmar contraseña"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
