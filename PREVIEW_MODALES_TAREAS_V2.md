# 📋 Preview de Modales - Sistema de Tareas V2

## 🎨 Especificaciones Generales
- **Formato:** Cuadrados y espaciosos (más anchos que altos)
- **Tamaño:** Grande (max-w-5xl o max-w-6xl) para aprovechar el ancho
- **Layout:** Grid de 3 columnas para campos (reduce scroll vertical)
- **Estilo:** Consistente con el diseño actual del sistema
- **Ubicación:** `src/components/tasks-v2/`

---

## 1. 📝 Modal: Agregar/Editar Tarea
**Archivo:** `TaskFormModalV2.tsx`

### Campos del Formulario (Grid 3 Columnas):
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Crear/Editar Tarea                                              [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Información Básica                                                    │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Nombre de la Tarea *          │  Categoría *          │  Prioridad * │
│  [___________________]        │  [Seleccionar ▼]      │  [● Baja]    │
│                                 │                       │  [● Media]   │
│                                 │                       │  [● Alta]     │
│                                 │                       │  [● Urgente]  │
│                                                                         │
│  Descripción (ancho completo)                                          │
│  [_________________________________________________________________]    │
│  [_________________________________________________________________]    │
│                                                                         │
│  Ubicación                                                              │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Proyecto *              │  Torre              │  Piso                 │
│  [Seleccionar ▼]         │  [Seleccionar ▼]    │  [Seleccionar ▼]      │
│                                                                         │
│  Departamento *          │  Fecha Inicio       │  Fecha Fin            │
│  [Seleccionar ▼]         │  [DD/MM/YYYY]       │  [DD/MM/YYYY]         │
│                                                                         │
│  Presupuesto y Trabajadores                                            │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Presupuesto Total ($) *                                                │
│  [$_________________]                                                   │
│                                                                         │
│  Asignación de Trabajadores (Grid 3 columnas)                          │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [☐ Juan Pérez]          │  [☐ María González]  │  [☐ Carlos Rodríguez]│
│  [☐ Pedro Sánchez]        │  [☐ Ana López]       │  [☐ Luis Martínez]  │
│  [☐ ...]                 │  [☐ ...]             │  [☐ ...]            │
│                                                                         │
│  Notas (ancho completo)                                                 │
│  [_________________________________________________________________]    │
│  [_________________________________________________________________]    │
│                                                                         │
│  [Cancelar]                                              [Guardar Tarea]│
└─────────────────────────────────────────────────────────────────────────┘
```

### Campos de Base de Datos:
- `task_name` (VARCHAR) - Requerido
- `task_description` (TEXT) - Opcional
- `task_category` (VARCHAR) - Requerido
- `apartment_id` (INTEGER) - Requerido (FK)
- `start_date` (DATE) - Opcional
- `end_date` (DATE) - Opcional
- `priority` (VARCHAR) - Requerido (low, medium, high, urgent)
- `total_budget` (NUMERIC) - Requerido (default: 0)
- `notes` (TEXT) - Opcional
- `task_assignments[]` - Múltiples trabajadores (crear registros en task_assignments)

### Validaciones:
- Nombre de tarea requerido
- Categoría requerida
- Departamento requerido
- Presupuesto >= 0
- Al menos 1 trabajador asignado
- Trabajadores deben tener contrato activo en el proyecto

---

## 2. 👁️ Modal: Ver Detalles de Tarea
**Archivo:** `TaskDetailModalV2.tsx`

### Estructura (Grid 3 Columnas):
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Detalles de Tarea                                              [X]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Información General                                                   │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Nombre: Tabiques          │  Categoría: Estructura  │  Estado: [● En Progreso]│
│  Prioridad: [● Alta]        │  Presupuesto: $500,000  │  Progreso: 66%          │
│                                                                         │
│  Ubicación                                                              │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Proyecto: Parque Lourdes   │  Torre: Torre 1         │  Piso: Piso 2           │
│  Departamento: Depto 201    │  Fecha Inicio: 15/01   │  Fecha Fin: 20/01       │
│                                                                         │
│  Trabajadores Asignados (3) - Grid 3 Columnas                          │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [Avatar] Juan Pérez        │  [Avatar] María G.      │  [Avatar] Carlos R.    │
│  50% - $250,000             │  30% - $150,000         │  20% - $100,000         │
│  [● Trabajando]             │  [● Asignado]            │  [● Completado]         │
│                                                                         │
│  Progreso General                                                       │
│  ────────────────────────────────────────────────────────────────────  │
│  [████████░░] 66% (2/3 trabajadores completados)                       │
│                                                                         │
│  Notas                                                                  │
│  ────────────────────────────────────────────────────────────────────  │
│  Se requiere revisión de estructura antes de continuar                 │
│                                                                         │
│  [Editar] [Ajustar Distribución] [Ver Fotos] [Ver Materiales] [Historial]│
└─────────────────────────────────────────────────────────────────────────┘
```

### Datos a Mostrar:
- Todos los campos de `tasks`
- Trabajadores desde `task_assignments` (con porcentajes y montos)
- Progreso calculado (trabajadores completados / total)
- Botones de acción rápida

---

## 3. 💰 Modal: Ajustar Distribución
**Archivo:** `AdjustDistributionModalV2.tsx`

### Estructura (Grid 3 Columnas):
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Ajustar Distribución de Pagos                                  [X]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tarea: Tabiques                                                        │
│  Presupuesto Total: $500,000                                            │
│                                                                         │
│  Distribución Actual - Grid 3 Columnas                                 │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Trabajador 1: Juan Pérez    │  Trabajador 2: María G.  │  Trabajador 3: Carlos R.│
│  Porcentaje: [50]%           │  Porcentaje: [30]%       │  Porcentaje: [20]%      │
│  Monto: $250,000             │  Monto: $150,000         │  Monto: $100,000       │
│  [━━━━━━━━━━━━━━━━━━━━━━]    │  [━━━━━━━━━━━━━━━━━━━━━━]│  [━━━━━━━━━━━━━━━━━━━━━━]│
│                                                                         │
│  Total: 100%  $500,000                                                  │
│  ⚠️ La suma debe ser exactamente 100%                                    │
│                                                                         │
│  Razón del Ajuste (Opcional) - Ancho completo                           │
│  [_________________________________________________________________]    │
│                                                                         │
│  [Cancelar]                                          [Guardar Distribución]│
└─────────────────────────────────────────────────────────────────────────┘
```

### Funcionalidad:
- Sliders o inputs numéricos para cada trabajador
- Validación: suma debe ser 100%
- Cálculo automático de montos al cambiar porcentajes
- Guardar en `task_assignments.payment_share_percentage`
- Registrar cambio en `payment_distribution_history`

---

## 4. 📸 Modal: Fotos de Progreso
**Archivo:** `TaskPhotosModalV2.tsx`

### Estructura (Grid 3 Columnas):
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Fotos de Progreso                                              [X]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tarea: Tabiques                                                        │
│  [Subir Nueva Foto]                                                     │
│                                                                         │
│  Galería de Fotos (6) - Grid 3 Columnas                                │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                             │
│  │  Foto 1  │  │  Foto 2  │  │  Foto 3  │                             │
│  │ [Imagen] │  │ [Imagen] │  │ [Imagen] │                             │
│  │ 15/01    │  │ 16/01    │  │ 17/01    │                             │
│  └──────────┘  └──────────┘  └──────────┘                             │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                             │
│  │  Foto 4  │  │  Foto 5  │  │  Foto 6  │                             │
│  │ [Imagen] │  │ [Imagen] │  │ [Imagen] │                             │
│  │ 18/01    │  │ 19/01    │  │ 20/01    │                             │
│  └──────────┘  └──────────┘  └──────────┘                             │
│                                                                         │
│  Vista Ampliada (al hacer clic)                                        │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │                                                               │     │
│  │                    [Imagen Grande]                           │     │
│  │                                                               │     │
│  └───────────────────────────────────────────────────────────────┘     │
│  Descripción: Inicio de tabiques                                        │
│  Fecha: 15/01/2025 10:30                                                │
│  [← Anterior] [Siguiente →] [Eliminar]                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Funcionalidad:
- Ver fotos desde `tasks.progress_photos` (JSONB array)
- Subir nuevas fotos (guardar en Supabase Storage)
- Agregar descripción a cada foto
- Eliminar fotos
- Navegación entre fotos
- Formato JSONB: `[{"url": "...", "description": "...", "uploaded_at": "..."}]`

---

## 5. 📦 Modal: Materiales
**Archivo:** `TaskMaterialsModalV2.tsx`

### Estructura (Grid 3 Columnas):
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Materiales de la Tarea                                         [X]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Tarea: Tabiques                                                        │
│  [Asociar Entrega de Material]                                         │
│                                                                         │
│  Materiales Asociados (6) - Grid 3 Columnas                            │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Entrega #123           │  Entrega #124           │  Entrega #125      │
│  15/01/2025              │  16/01/2025             │  17/01/2025       │
│  Material: Cemento       │  Material: Ladrillos    │  Material: Arena  │
│  Cantidad: 50 sacos      │  Cantidad: 500 unid.    │  Cantidad: 2 m³    │
│  A: Juan Pérez           │  A: María González      │  A: Carlos R.      │
│  Notas: Para tabiques    │  Notas: -               │  Notas: Fina       │
│  [Ver Detalles]          │  [Ver Detalles]         │  [Ver Detalles]    │
│                                                                         │
│  Entrega #126           │  Entrega #127           │  Entrega #128      │
│  18/01/2025              │  19/01/2025             │  20/01/2025       │
│  Material: Yeso          │  Material: Pintura      │  Material: ...    │
│  Cantidad: 30 kg         │  Cantidad: 10 galones  │  Cantidad: ...     │
│  A: Pedro Sánchez        │  A: Ana López          │  A: ...            │
│  Notas: -                │  Notas: Blanca          │  Notas: ...        │
│  [Ver Detalles]          │  [Ver Detalles]         │  [Ver Detalles]    │
│                                                                         │
│  Nota: Los materiales se asocian mediante entregas registradas        │
│  en el sistema de inventario.                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Funcionalidad:
- Listar materiales desde `task_assignment_materials`
- Mostrar detalles de `material_movements` (tipo: entrega)
- Asociar nuevas entregas a la tarea
- Ver detalles de cada entrega
- Datos desde: `task_assignment_materials` → `material_movements` → `materials`

---

## 6. 📜 Modal: Historial
**Archivo:** `TaskHistoryModalV2.tsx`

### Estructura:
```
┌─────────────────────────────────────────┐
│  Historial de la Tarea           [X]     │
├─────────────────────────────────────────┤
│                                         │
│  Tarea: Tabiques                        │
│                                         │
│  Filtros                                 │
│  [Todos] [Cambios] [Pagos] [Asignaciones]│
│                                         │
│  Historial Completo                      │
│  ──────────────────────                │
│                                         │
│  📅 20/01/2025 14:30                    │
│  ✅ Tarea completada                    │
│  Por: Admin User                        │
│                                         │
│  📅 18/01/2025 10:15                    │
│  💰 Distribución ajustada               │
│  Juan: 50% → 60%                        │
│  María: 30% → 25%                       │
│  Carlos: 20% → 15%                      │
│  Razón: Ajuste por horas trabajadas    │
│  Por: Admin User                        │
│                                         │
│  📅 16/01/2025 09:00                    │
│  👤 Trabajador agregado                 │
│  Carlos Rodríguez asignado             │
│  Por: Admin User                        │
│                                         │
│  📅 15/01/2025 08:00                    │
│  📝 Tarea creada                        │
│  Por: Admin User                        │
│                                         │
└─────────────────────────────────────────┘
```

### Fuentes de Datos:
- `audit_log` - Cambios en la tarea
- `payment_distribution_history` - Cambios en distribución
- `task_assignments` (historial) - Asignaciones/remociones
- `tasks.created_at`, `tasks.updated_at` - Fechas importantes

---

## 🎨 Estilo y Diseño

### Tamaño de Modales:
- **Ancho:** `max-w-5xl` (1024px) o `max-w-6xl` (1152px) - Modales cuadrados/anchos
- **Alto máximo:** `max-h-[90vh]` con scroll interno mínimo
- **Padding:** `p-6` o `p-8` para espaciosidad
- **Grid:** `grid-cols-3` para campos (reduce altura y aprovecha ancho)

### Colores:
- Fondo modal: `bg-white` o `bg-gray-50`
- Bordes: `border-gray-200`
- Botones primarios: Azul (`bg-blue-600`)
- Botones secundarios: Gris (`bg-gray-200`)

### Componentes Base:
- Usar el componente `Modal` existente o crear variante
- Inputs: `Input`, `Select`, `Textarea`
- Botones: `Button` component
- Badges para estados y prioridades

---

## ✅ Checklist de Implementación

- [ ] 1. TaskFormModalV2.tsx - Crear/Editar
- [ ] 2. TaskDetailModalV2.tsx - Ver detalles
- [ ] 3. AdjustDistributionModalV2.tsx - Ajustar distribución
- [ ] 4. TaskPhotosModalV2.tsx - Fotos de progreso
- [ ] 5. TaskMaterialsModalV2.tsx - Materiales
- [ ] 6. TaskHistoryModalV2.tsx - Historial
- [ ] 7. Integrar modales en TaskRowV2.tsx
- [ ] 8. Agregar funciones en useTasks_v2.ts
- [ ] 9. Testing de cada modal

---

## 📝 Notas Importantes

1. **Trabajadores:** Solo mostrar trabajadores con contratos activos en el proyecto
2. **Distribución:** Validar que la suma sea 100% antes de guardar
3. **Fotos:** Subir a Supabase Storage y guardar URLs en JSONB
4. **Materiales:** Solo asociar entregas existentes (no crear nuevas)
5. **Historial:** Combinar datos de múltiples tablas de auditoría
6. **Validaciones:** Frontend y backend (RPCs en Supabase)

