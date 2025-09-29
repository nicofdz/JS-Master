# Sistema de Control de Terminaciones

Sistema web para el control y seguimiento de terminaciones en proyectos de construcción, desarrollado con Next.js 14 y Supabase.

## 🎯 Estado del Proyecto

**Sprint 1 COMPLETADO** ✅ (100%)

### ✅ Implementado:
- ✅ Configuración de Next.js 14 con TypeScript
- ✅ Integración de Tailwind CSS con colores personalizados
- ✅ Configuración completa de Supabase (cliente, tipos, hooks)
- ✅ Componentes UI base (Button, Card) con variantes
- ✅ Utilidades y constantes del sistema
- ✅ Dashboard funcional con datos mock y reales
- ✅ Diseño responsive optimizado para móviles/tablets
- ✅ Esquema completo de base de datos con RLS
- ✅ Datos de ejemplo (seed data) listos para usar
- ✅ Toggle para alternar entre datos mock y reales
- ✅ Hooks personalizados para manejo de datos
- ✅ Manejo de errores y estados de carga
- ✅ Tipos TypeScript unificados
- ✅ **Sistema de autenticación completo con Supabase Auth**
- ✅ **Sistema de roles (admin, supervisor, jefe_cuadrilla, maestro)**
- ✅ **Protección de rutas con middleware**
- ✅ **Páginas de login y registro funcionales**
- ✅ **Layout autenticado con navegación**
- ✅ **Usuarios demo para pruebas**

## 🚀 Tecnologías

- **Frontend**: Next.js 14, React 18, TypeScript
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase
- **Iconos**: Lucide React
- **Formularios**: React Hook Form
- **Fechas**: date-fns
- **Notificaciones**: React Hot Toast
- **Gráficos**: Recharts
- **PDF**: jsPDF

## 🏗️ Arquitectura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── (auth)/            # Rutas protegidas (pendiente)
│   │   ├── dashboard/     # Dashboard principal
│   │   ├── pisos/         # Gestión de pisos
│   │   ├── equipos/       # Gestión de equipos
│   │   └── reportes/      # Reportes
│   ├── api/               # API Routes
│   ├── login/             # Página de login (pendiente)
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Dashboard home
├── components/
│   ├── ui/                # Componentes base reutilizables
│   ├── dashboard/         # Componentes específicos del dashboard
│   ├── layout/            # Componentes de layout
│   └── common/            # Componentes comunes
├── lib/
│   ├── supabase.ts        # Cliente y tipos de Supabase
│   ├── utils.ts           # Utilidades generales
│   └── constants.ts       # Constantes del sistema
├── data/
│   └── mockData.ts        # Datos de ejemplo para desarrollo
├── hooks/                 # Custom hooks (useProjects, useDashboard)
├── types/                 # Definiciones de tipos TypeScript
│   └── dashboard.ts       # Tipos unificados para dashboard
└── database/              # Archivos de base de datos
    ├── schema.sql         # Esquema completo de Supabase
    └── seed.sql           # Datos de ejemplo
```

## 🎨 Funcionalidades Implementadas

### Dashboard Principal
- **Métricas Generales**: Proyectos activos, progreso promedio, total de pisos y unidades
- **Lista de Proyectos**: Vista de proyectos con progreso, estado y información clave
- **Estado de Pisos**: Seguimiento del progreso por piso con códigos de color
- **Acciones Rápidas**: Botones para funcionalidades principales

### Sistema de Estados
- **Proyectos**: planning, active, completed, paused
- **Pisos/Apartamentos**: pending, in-progress, completed, good, warning, danger
- **Actividades**: pending, in-progress, completed, blocked

### Componentes UI
- **Button**: Múltiples variantes y tamaños
- **Card**: Componente base para contenedores
- **Utilidades**: Funciones para estados, colores, fechas y cálculos

## 📋 Próximos Pasos (Sprint 2)

1. **Autenticación y Roles** (1.5 semanas)
   - Implementar Supabase Auth
   - Sistema de roles: admin, supervisor, jefe_cuadrilla, maestro
   - Protección de rutas
   - Páginas de login y perfil

2. **Base de Datos**
   - Crear esquema completo en Supabase
   - Configurar Row Level Security (RLS)
   - Migrar de datos mock a datos reales

## 🛠️ Instalación y Desarrollo

### Instalación Rápida
```bash
# Clonar el repositorio
git clone <tu-repo>
cd sistema-control-terminaciones

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Ejecutar en modo desarrollo
npm run dev
```

### Configuración de Supabase (Opcional)

Para usar datos reales en lugar de datos mock:

1. **Crear proyecto en Supabase**: Ve a [supabase.com](https://supabase.com)
2. **Configurar variables**: Actualiza `.env.local` con tus credenciales
3. **Crear esquema**: Ejecuta `database/schema.sql` en SQL Editor
4. **Insertar datos**: Ejecuta `database/seed.sql` para datos de ejemplo
5. **Probar**: Usa el toggle "Cambiar a BD Real" en el dashboard

📖 **Guía detallada**: Ver `SUPABASE_SETUP.md` para instrucciones paso a paso

Abrir [http://localhost:3000](http://localhost:3000) para ver el resultado.

## 📊 Metodología de Desarrollo

El proyecto sigue una metodología de desarrollo por **Sprints**:

1. **Sprint 1**: Setup y Dashboard básico (2 semanas) ✅ 100%
2. **Sprint 2**: Autenticación y roles (1.5 semanas) ✅ 95%
3. **Sprint 3**: Mantenedores base (2 semanas)
4. **Sprint 4**: Vista de pisos y departamentos (2 semanas)
5. **Sprint 5**: Control de actividades y fotos (2.5 semanas)
6. **Sprint 6**: Reportes y deployment (1.5 semanas)

**Duración total estimada**: 11.5 semanas

## 🔧 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Verificar código con ESLint
```

## 📝 Notas de Desarrollo

- El proyecto está configurado para usar **datos mock** durante el desarrollo inicial
- La integración con Supabase está preparada pero requiere configuración de la base de datos
- El diseño es completamente responsive y optimizado para tablets y móviles
- Se utilizan las mejores prácticas de Next.js 14 con App Router
