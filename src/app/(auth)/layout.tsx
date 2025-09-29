'use client'

import { useAuth } from '@/hooks'
import { ProjectFilterProvider } from '@/hooks/useProjectFilter'
import { useDelayedTasks } from '@/hooks/useDelayedTasks'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ROLE_LABELS } from '@/types/auth'
import { 
  BarChart3, 
  Building2, 
  Users, 
  Home, 
  TrendingUp, 
  Menu, 
  X,
  LogOut,
  SquareStack, // Icono para Apartamentos
  CheckSquare, // Icono para Tareas
  DollarSign // Icono para Pagos
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading, signOut } = useAuth()
  const { delayedCount } = useDelayedTasks()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Sesión cerrada exitosamente')
      router.push('/login')
    } catch (error) {
      toast.error('Error al cerrar sesión')
    }
  }

  // Función para determinar si un enlace está activo
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  // Función para cerrar el sidebar móvil al hacer clic en un enlace
  const handleLinkClick = () => {
    setSidebarOpen(false)
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Proyectos', href: '/proyectos', icon: Building2 },
    { name: 'Trabajadores', href: '/equipos', icon: Users },
    { name: 'Pisos', href: '/pisos', icon: Home },
    { name: 'Apartamentos', href: '/apartamentos', icon: SquareStack },
    { name: 'Tareas', href: '/tareas', icon: CheckSquare, badge: delayedCount > 0 ? delayedCount : null },
    { name: 'Facturas', href: '/facturas', icon: DollarSign },
    { name: 'Pagos', href: '/pagos', icon: DollarSign },
    { name: 'Reportes', href: '/reportes', icon: TrendingUp },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <ProjectFilterProvider>
      <div className="min-h-screen bg-gray-50">
      {/* Sidebar móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-lg font-semibold text-gray-900">Control Terminaciones</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => {
                  const IconComponent = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={`group flex items-center justify-between px-2 py-2 text-base font-medium rounded-md ${
                        active 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <IconComponent className={`mr-3 w-5 h-5 ${active ? 'text-gray-900' : 'text-gray-500'}`} />
                        {item.name}
                      </div>
                      {item.badge && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-lg font-semibold text-gray-900">Control Terminaciones</h1>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const IconComponent = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md ${
                      active 
                        ? 'bg-gray-100 text-gray-900' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center">
                      <IconComponent className={`mr-3 w-5 h-5 ${active ? 'text-gray-900' : 'text-gray-500'}`} />
                      {item.name}
                    </div>
                    {item.badge && (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
          
          {/* Usuario info */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center justify-between w-full">
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{profile?.full_name}</p>
                <p className="text-xs text-gray-500">{profile?.role ? ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] : 'Usuario'}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Header móvil */}
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Header desktop */}
        <div className="hidden lg:flex lg:items-center lg:justify-between lg:px-6 lg:py-4 bg-white border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Bienvenido, {profile?.full_name}
            </h2>
            <p className="text-sm text-gray-500">
              {profile?.role ? ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] : 'Usuario'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{profile?.email}</span>
          </div>
        </div>

        {/* Contenido */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
    </ProjectFilterProvider>
  )
}
