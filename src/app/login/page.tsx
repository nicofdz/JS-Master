'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'maestro' as const,
    phone: ''
  })

  const { signIn, signUp, user, loading } = useAuth()
  const router = useRouter()

  // Redireccionar si ya está autenticado
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard')
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
      router.push('/dashboard')
    } catch (error) {
      toast.error('Error inesperado al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (registerData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await signUp(
        registerData.email,
        registerData.password,
        registerData.fullName,
        registerData.role
      )
      
      if (error) {
        toast.error(error.message || 'Error al registrarse')
        return
      }

      toast.success('¡Cuenta creada exitosamente!')
      setShowRegister(false)
      // El usuario será redirigido automáticamente cuando se autentique
    } catch (error) {
      toast.error('Error inesperado al registrarse')
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
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Sistema de Control de Terminaciones
          </h1>
          <p className="mt-2 text-gray-600">
            {showRegister ? 'Crear nueva cuenta' : 'Iniciar sesión en tu cuenta'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {showRegister ? '🔐 Registro' : '🔑 Iniciar Sesión'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showRegister ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                />
                
                <Input
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowRegister(true)}
                    className="text-primary-600 hover:text-primary-500 text-sm"
                  >
                    ¿No tienes cuenta? Regístrate aquí
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <Input
                  label="Nombre completo"
                  type="text"
                  value={registerData.fullName}
                  onChange={(e) => setRegisterData({...registerData, fullName: e.target.value})}
                  placeholder="Tu nombre completo"
                  required
                />

                <Input
                  label="Correo electrónico"
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                  placeholder="ejemplo@correo.com"
                  required
                />

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={registerData.role}
                    onChange={(e) => setRegisterData({...registerData, role: e.target.value as any})}
                    className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="maestro">Maestro</option>
                    <option value="jefe_cuadrilla">Jefe de Cuadrilla</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <Input
                  label="Teléfono (opcional)"
                  type="tel"
                  value={registerData.phone}
                  onChange={(e) => setRegisterData({...registerData, phone: e.target.value})}
                  placeholder="+56 9 1234 5678"
                />

                <Input
                  label="Contraseña"
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                  placeholder="••••••••"
                  helperText="Mínimo 6 caracteres"
                  required
                />

                <Input
                  label="Confirmar contraseña"
                  type="password"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                  placeholder="••••••••"
                  required
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowRegister(false)}
                    className="text-primary-600 hover:text-primary-500 text-sm"
                  >
                    ¿Ya tienes cuenta? Inicia sesión aquí
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
