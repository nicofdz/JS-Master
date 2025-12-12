'use client'

import { useAuth } from '@/hooks'
import { ProjectFilterProvider } from '@/hooks/useProjectFilter'
import { useDelayedTasks } from '@/hooks/useDelayedTasks'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { NotificationCenter } from '@/components/layout/NotificationCenter'
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
  DollarSign, // Icono para Pagos
  ClipboardCheck, // Icono para Asistencia
  Wrench, // Icono para Herramientas
  Boxes, // Icono para Materiales
  Receipt, // Icono para Gastos
  FolderKanban, // Icono para sección Proyectos
  UsersRound, // Icono para sección Personal
  Package, // Icono para sección Inventario
  CreditCard, // Icono para sección Finanzas
  PieChart, // Icono para sección Reportes
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

import { ForceChangePassword } from '@/components/auth/ForceChangePassword'

import { useTaskDelayChecker } from '@/hooks/useTaskDelayChecker'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading, signOut } = useAuth()
  const { delayedCount } = useDelayedTasks()
  useTaskDelayChecker()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)

  // Cargar estado guardado al iniciar
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState))
    }
  }, [])

  // Guardar estado al cambiar
  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState))
  }

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

  const navigationSections = [
    {
      title: 'PROYECTOS',
      icon: FolderKanban,
      items: [
        { name: 'Obras', href: '/proyectos', icon: Building2 },
        { name: 'Pisos', href: '/pisos', icon: Home },
        { name: 'Apartamentos', href: '/apartamentos', icon: SquareStack },
        { name: 'Tareas', href: '/tareas', icon: CheckSquare, badge: delayedCount > 0 ? delayedCount : null },
      ]
    },
    {
      title: 'PERSONAL',
      icon: UsersRound,
      items: [
        { name: 'Trabajadores/Contratos', href: '/trabajadores', icon: Users },
        { name: 'Asistencia', href: '/asistencia', icon: ClipboardCheck },
      ]
    },
    {
      title: 'INVENTARIO',
      icon: Package,
      items: [
        { name: 'Herramientas', href: '/herramientas', icon: Wrench },
        { name: 'Materiales', href: '/materiales', icon: Boxes },
      ]
    },
    {
      title: 'FINANZAS',
      icon: CreditCard,
      items: [
        { name: 'Facturas', href: '/facturas', icon: DollarSign },
        { name: 'Gastos', href: '/gastos', icon: Receipt },
        { name: 'Pagos', href: '/pagos', icon: DollarSign },
      ]
    },
    {
      title: 'REPORTES',
      icon: PieChart,
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
        { name: 'Reportes', href: '/reportes', icon: TrendingUp },
      ]
    }
  ]

  // Filter navigation based on role
  const filteredNavigationSections = navigationSections.map(section => {
    // If admin, show everything (including Administration which is added below)
    if (profile?.role === 'admin') {
      return section
    }

    // If supervisor, filter specific items
    if (profile?.role === 'supervisor') {
      const allowedItems = ['Tareas', 'Asistencia', 'Herramientas', 'Trabajadores/Contratos', 'Materiales']
      const filteredItems = section.items.filter(item => allowedItems.includes(item.name))

      // Return section only if it has items
      if (filteredItems.length > 0) {
        return { ...section, items: filteredItems }
      }
      return null
    }

    // Default: Show nothing or basic items (can be adjusted)
    return null
  }).filter(Boolean) as typeof navigationSections

  // Add Administration section for Admins
  if (profile?.role === 'admin') {
    filteredNavigationSections.push({
      title: 'ADMINISTRACIÓN',
      icon: Users,
      items: [
        { name: 'Usuarios', href: '/usuarios', icon: Users },
      ]
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Force Password Change Check
  if (profile?.must_change_password && !passwordChanged) {
    return (
      <ForceChangePassword
        userId={user.id}
        onSuccess={() => {
          setPasswordChanged(true)
          router.refresh()
          window.location.reload() // Reload to fetch fresh profile
        }}
      />
    )
  }

  return (
    <ProjectFilterProvider>
      <div className="min-h-screen bg-slate-900">
        {/* Sidebar móvil */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden h-[100dvh]">
            <div className="fixed inset-0 bg-black bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-800 h-full">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
              <div className="flex-1 h-0 pt-5 pb-32 overflow-y-auto overscroll-contain mobile-sidebar-scrollbar">
                <div className="flex-shrink-0 flex items-center px-4">
                  <h1 className="text-lg font-semibold text-slate-100">JS Master</h1>
                </div>
                <nav className="mt-5 px-2 space-y-4">
                  {filteredNavigationSections.map((section) => {
                    const SectionIcon = section.icon
                    return (
                      <div key={section.title} className="space-y-1">
                        {/* Título de sección */}
                        <div className="px-2 py-1 flex items-center gap-2">
                          <SectionIcon className="w-4 h-4 text-slate-500" />
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {section.title}
                          </h3>
                        </div>

                        {/* Items de la sección */}
                        <div className="space-y-1">
                          {section.items.map((item) => {
                            const IconComponent = item.icon
                            const active = isActive(item.href)
                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                onClick={handleLinkClick}
                                className={`group flex items-center justify-between pl-8 pr-2 py-2 text-base font-medium rounded-md transition-all ${active
                                  ? 'bg-slate-700 text-slate-100 border-l-4 border-blue-500'
                                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 hover:border-l-4 hover:border-slate-600'
                                  }`}
                              >
                                <div className="flex items-center">
                                  <IconComponent className={`mr-3 w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                                  <span className="text-sm">{item.name}</span>
                                </div>
                                {item.badge && (
                                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                                    {item.badge}
                                  </span>
                                )}
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar desktop */}
        <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
          <div className="flex-1 flex flex-col min-h-0 border-r border-slate-700 bg-slate-800">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className={`flex items-center flex-shrink-0 px-4 h-16 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && <h1 className="text-lg font-semibold text-slate-100">JS Master</h1>}
                <button
                  onClick={toggleSidebar}
                  className={`p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-700 focus:outline-none ${isCollapsed ? '' : 'ml-auto'}`}
                >
                  {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-4">
                {filteredNavigationSections.map((section) => {
                  const SectionIcon = section.icon
                  return (
                    <div key={section.title} className="space-y-1">
                      {/* Título de sección */}
                      {!isCollapsed && (
                        <div className="px-2 py-1 flex items-center gap-2">
                          <SectionIcon className="w-4 h-4 text-slate-500" />
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {section.title}
                          </h3>
                        </div>
                      )}

                      {/* Items de la sección */}
                      <div className="space-y-1">
                        {section.items.map((item) => {
                          const IconComponent = item.icon
                          const active = isActive(item.href)
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              className={`group flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between pl-8 pr-2'} py-2 text-sm font-medium rounded-md transition-all ${active
                                ? 'bg-slate-700 text-slate-100 border-l-4 border-blue-500'
                                : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 hover:border-l-4 hover:border-slate-600'
                                }`}
                              title={isCollapsed ? item.name : undefined}
                            >
                              <div className="flex items-center">
                                <IconComponent className={`${isCollapsed ? 'w-6 h-6' : 'mr-3 w-4 h-4'} ${active ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                                {!isCollapsed && <span className="text-sm">{item.name}</span>}
                              </div>
                              {item.badge && !isCollapsed && (
                                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                                  {item.badge}
                                </span>
                              )}
                              {item.badge && isCollapsed && (
                                <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-slate-800 bg-red-600 transform translate-x-1/2 -translate-y-1/2" />
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </nav>
            </div>

            {/* Usuario info */}
            <div className="flex-shrink-0 flex border-t border-slate-700 p-4">
              <div className="flex items-center justify-between w-full">
                <div className={`ml-3 ${isCollapsed ? 'hidden' : 'block'}`}>
                  <p className="text-sm font-medium text-slate-200">{profile?.full_name}</p>
                  <p className="text-xs text-slate-400">{profile?.role ? ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] : 'Usuario'}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-200"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className={`flex flex-col flex-1 transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
          {/* Header móvil */}
          <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-slate-800 border-b border-slate-700">
            <button
              onClick={() => setSidebarOpen(true)}
              className="h-12 w-12 inline-flex items-center justify-center rounded-md text-slate-300 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Header desktop */}
          <div className="hidden lg:flex lg:items-center lg:justify-between lg:px-6 lg:py-2 bg-slate-800 border-b border-slate-700">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Bienvenido, {profile?.full_name}
              </h2>
              <p className="text-xs text-slate-400">
                {profile?.role ? ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] : 'Usuario'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Centro de Notificaciones */}
              <NotificationCenter />

              <Link href="/">
                <Image
                  src="/logo/logo jsmaster.png"
                  alt="JS Master Logo"
                  width={80}
                  height={30}
                  className="object-contain cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
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
