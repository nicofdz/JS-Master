import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Obtener sesión
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/login', '/']
  const isPublicRoute = publicRoutes.includes(req.nextUrl.pathname)

  // Rutas protegidas que requieren autenticación
  const protectedRoutes = ['/dashboard', '/trabajadores', '/pisos', '/reportes', '/solicitudes']
  const isProtectedRoute = protectedRoutes.some(route =>
    req.nextUrl.pathname.startsWith(route)
  )

  // Si no hay sesión y está tratando de acceder a ruta protegida
  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Si hay sesión y está tratando de acceder al login, redirigir según rol
  if (session && req.nextUrl.pathname === '/login') {
    const role = session.user.user_metadata?.role
    if (role === 'supervisor') {
      return NextResponse.redirect(new URL('/tareas', req.url))
    }
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Control de Acceso Basado en Roles (RBAC)
  if (session && isProtectedRoute) {
    const role = session.user.user_metadata?.role

    // Si es admin tiene acceso a todo
    if (role === 'admin') {
      return res
    }

    // Definir rutas permitidas por rol
    const supervisorAllowedRoutes = [
      '/tareas',
      '/asistencia',
      '/herramientas',
      '/trabajadores',
      '/materiales'
    ]

    // Si es supervisor
    if (role === 'supervisor') {
      // Verificar si la ruta actual comienza con alguna de las rutas permitidas
      const isAllowed = supervisorAllowedRoutes.some(route =>
        req.nextUrl.pathname.startsWith(route)
      )

      if (!isAllowed) {
        // Si intenta acceder a una ruta no permitida, redirigir a su home
        return NextResponse.redirect(new URL('/tareas', req.url))
      }
    }

    // Otros roles (por ahora redirigir a dashboard si intentan acceder a rutas protegidas básicas no permitidas)
    // Se puede expandir según sea necesario
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
