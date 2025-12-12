'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const { signIn, resetPassword, user, loading } = useAuth()
  const router = useRouter()

  // Redireccionar si ya está autenticado
  useEffect(() => {
    if (user && !loading) {
      const role = user.user_metadata?.role
      if (role === 'supervisor') {
        router.push('/tareas')
      } else {
        router.push('/dashboard')
      }
    }
  }, [user, loading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        toast.error(error.message || 'Error al iniciar sesión')
        return
      }

      toast.success('¡Bienvenido!')

      // Verificar rol para redirección
      const { data: { user } } = await import('@/lib/auth').then(m => m.authService.getUser())
      const role = user?.user_metadata?.role

      if (role === 'supervisor') {
        router.push('/tareas')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      toast.error('Error inesperado al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await resetPassword(email)

      if (error) {
        toast.error(error.message || 'Error al enviar correo de recuperación')
        return
      }

      toast.success('Correo de recuperación enviado. Revisa tu bandeja de entrada.')
      setShowForgotPassword(false)
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat relative">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>

      <div className="absolute top-4 left-4 z-20">
        <Link href="/">
          <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver al Inicio
          </Button>
        </Link>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block mb-4">
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 tracking-tight hover:scale-105 transition-transform cursor-pointer">
              JS MASTER
            </h1>
          </Link>
          <h2 className="text-2xl font-bold text-white">
            Sistema de Gestión
          </h2>
          <p className="mt-2 text-slate-400">
            {showForgotPassword
              ? 'Ingresa tu correo para recuperar tu contraseña'
              : 'Ingresa tus credenciales para acceder'}
          </p>
        </div>

        <Card className="bg-slate-900/90 border-slate-800 shadow-2xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-center text-white">
              {showForgotPassword
                ? '🔄 Recuperar Contraseña'
                : '🔑 Iniciar Sesión'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showForgotPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <Input
                  label="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                />

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? 'Enviando...' : 'Enviar correo de recuperación'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <Input
                  label="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                />

                <Input
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                />

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-medium shadow-lg shadow-blue-500/20"
                  disabled={isLoading}
                >
                  {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-slate-400 hover:text-blue-400 text-sm transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
