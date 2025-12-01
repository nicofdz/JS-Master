# 🎨 Implementación Frontend: Tareas V2

## ✅ Completado

### 1. **Estructura de Archivos Creados**

```
src/
├── app/(auth)/
│   └── tareas-v2/
│       └── page.tsx ✅ Página principal con datos reales
│
├── components/
│   └── tasks-v2/
│       ├── TaskTableV2.tsx ✅ Tabla compacta
│       └── TaskRowV2.tsx ✅ Fila expandible con trabajadores
│
└── hooks/
    ├── useTasks_v2.ts ✅ Hook con conexión a BD
    └── index.ts ✅ Exportación actualizada
```

### 2. **Funcionalidades Implementadas**

#### **Página Principal (`tareas-v2/page.tsx`)**
- ✅ Conexión con hook `useTasksV2`
- ✅ Estados de carga y error
- ✅ Filtros funcionales:
  - Búsqueda por texto
  - Filtro por proyecto
  - Filtro por trabajador
  - Filtro por estado (badges clickeables)
- ✅ Estadísticas en tiempo real desde BD
- ✅ Diseño consistente con el resto de la aplicación

#### **Hook `useTasksV2`**
- ✅ Fetch de tareas desde vista `tasks_with_workers_v2`
- ✅ Parse de array JSON de trabajadores
- ✅ CRUD completo:
  - `createTask()` - Crear tarea
  - `updateTask()` - Actualizar tarea
  - `deleteTask()` - Soft delete con razón
- ✅ Gestión de trabajadores:
  - `assignWorkerToTask()` - Asignar trabajador con rol
  - `adjustPaymentDistribution()` - Ajustar % de distribución
  - `removeWorkerFromTask()` - Remover trabajador
  - `getWorkersForProject()` - Obtener trabajadores con contratos activos
  - `updateAssignmentStatus()` - Cambiar estado de asignación
- ✅ Estadísticas con `fetchTaskStats()` (RPC)
- ✅ Carga de datos relacionados (apartments, users, projects, floors)

#### **Componente `TaskTableV2`**
- ✅ Header de tabla con columnas organizadas
- ✅ Manejo de expansión/colapso de filas
- ✅ Vista vacía cuando no hay tareas
- ✅ Responsive

#### **Componente `TaskRowV2`**
- ✅ **Vista compacta:**
  - Nombre + categoría
  - Ubicación (Proyecto > Piso > Apartamento)
  - Avatares de trabajadores (max 3 + contador)
  - Presupuesto formato compacto ($300K)
  - Badge de estado con color
  - Barra de progreso mini
  - Fechas de inicio/fin
  - Botón de acciones
  - Botón expandir/colapsar
  
- ✅ **Vista expandida:**
  - Desglose completo de trabajadores
  - Avatar grande + nombre + ID
  - Porcentaje de distribución
  - Monto en pesos
  - Estado individual (Completado/Trabajando/Asignado)
  - Botón "Ajustar Distribución"
  - Placeholder para tabs (Fotos/Materiales/Historial)

### 3. **Datos Reales Conectados**

- ✅ Tareas desde `tasks_with_workers_v2` view
- ✅ Proyectos desde tabla `projects`
- ✅ Trabajadores desde tabla `workers`
- ✅ Apartamentos desde tabla `apartments`
- ✅ Pisos desde tabla `floors`
- ✅ Estadísticas desde RPC `get_task_stats`

### 4. **Filtros y Búsqueda**

- ✅ Búsqueda por texto en nombre, apartamento, proyecto
- ✅ Filtro por proyecto (con reset cascada)
- ✅ Filtro por trabajador (busca en array de workers)
- ✅ Filtro por estado con badges clickeables:
  - Todas
  - Pendientes
  - En Progreso
  - Completadas
  - Bloqueadas
  - Atrasadas

---

## 🔄 Pendiente de Implementar

### 1. **Modales**

#### **Modal de Crear/Editar Tarea**
```typescript
// Componente: TaskFormModalV2.tsx
- Formulario completo con react-hook-form
- Validación de campos
- Cascada proyecto → piso → apartamento
- Campo total_budget (NO worker_payment)
- Sin campo assigned_to (se asigna después)
```

#### **Modal de Gestión de Trabajadores**
```typescript
// Componente: TaskWorkersModalV2.tsx
- Lista de trabajadores asignados
- Selector de trabajadores (filtrado por proyecto)
- Asignación con rol (worker/supervisor/assistant)
- Botón "Ajustar Distribución"
- Remoción de trabajadores
```

#### **Modal de Ajuste de Distribución**
```typescript
// Componente: AdjustPaymentModalV2.tsx
- Inputs numéricos para cada trabajador
- Validación en tiempo real (debe sumar 100%)
- Muestra montos calculados
- Confirmación para guardar
```

#### **Modal de Detalles de Tarea**
```typescript
// Componente: TaskDetailsModalV2.tsx
- Información completa de la tarea
- Timeline de eventos
- Fotos de progreso (si hay)
- Botón para gestionar trabajadores
```

### 2. **Acciones en Fila**

```typescript
// Menu de acciones (⋮)
- Editar tarea
- Ver detalles
- Gestionar trabajadores
- Cambiar estado rápido
- Eliminar (con confirmación)
```

### 3. **Tabs Adicionales en Vista Expandida**

```typescript
// Tabs secundarios
- 📸 Fotos de Progreso (implementar uploader)
- 📦 Materiales (vincular entregas)
- 📜 Historial (auditoría de cambios)
```

### 4. **Funcionalidades Avanzadas**

- 📷 **Upload de fotos de progreso** (Supabase Storage + JSONB)
- 📦 **Gestión de materiales** (vincular entregas a asignaciones)
- 📊 **Paginación** (para cientos de tareas)
- 🔔 **Notificaciones** (cuando se asigna/completa tarea)
- 📄 **Exportar tareas** (Excel/PDF)

---

## 🎯 Próximos Pasos Inmediatos

### **Fase 1: Modales Básicos** (Prioridad Alta)

1. **TaskFormModalV2.tsx**
   - Crear/editar tareas
   - Usar `total_budget` en lugar de `worker_payment`
   - Sin campo `assigned_to`

2. **TaskWorkersModalV2.tsx**
   - Gestión completa de trabajadores
   - Asignación con filtro por contratos activos
   - Ajuste de distribución inline

3. **Conectar modales con página principal**
   - Botón "Nueva Tarea" → TaskFormModalV2
   - Botón "Ajustar Distribución" → Inline en TaskWorkersModalV2
   - Botón acciones → Menu contextual

### **Fase 2: Acciones y Estados** (Prioridad Media)

1. **Cambios de estado rápidos**
   - Completar tarea
   - Marcar como bloqueada
   - Cambiar prioridad

2. **Completado bidireccional**
   - Completar tarea → marca todas las asignaciones
   - Completar todas las asignaciones → marca tarea

### **Fase 3: Features Avanzadas** (Prioridad Baja)

1. **Upload de fotos**
2. **Gestión de materiales**
3. **Historial y auditoría**
4. **Paginación**
5. **Exportación**

---

## 📝 Notas Técnicas

### **Convenciones de Nomenclatura**

- Todos los componentes V2 terminan en `V2` (ej: `TaskFormV2.tsx`)
- Los modales tienen sufijo `Modal` (ej: `TaskFormModalV2.tsx`)
- Los hooks V2 terminan en `_v2` (ej: `useTasks_v2.ts`)

### **Tipos TypeScript**

```typescript
// Ya definidos en useTasks_v2.ts
export interface Worker { ... }
export interface TaskV2 { ... }
export interface TaskStats { ... }
```

### **RPCs Disponibles**

```sql
- get_task_stats(p_project_id)
- assign_worker_to_task(p_task_id, p_worker_id, p_role)
- adjust_payment_distribution(p_task_id, p_distributions)
- complete_task_manually(p_task_id, p_completed_at)
- uncomplete_task(p_task_id)
- soft_delete_task(p_task_id, p_deletion_reason)
- restore_task(p_task_id)
- remove_worker_from_task(p_assignment_id, p_removal_reason)
```

### **Vistas Disponibles**

```sql
- tasks_with_workers_v2 (tareas con array de trabajadores)
- worker_pending_payments_v3 (pagos pendientes)
- deleted_tasks_view (papelera de tareas)
- deleted_payments_view (papelera de pagos)
```

---

## ✅ Estado Actual

**FUNCIONANDO:**
- ✅ Página carga tareas reales de BD
- ✅ Filtros operativos
- ✅ Estadísticas en tiempo real
- ✅ Vista compacta y expandida
- ✅ Diseño responsive
- ✅ Sin errores de compilación

**FALTA:**
- ⏳ Modales de creación/edición
- ⏳ Gestión de trabajadores (asignar/remover/ajustar)
- ⏳ Cambios de estado
- ⏳ Acciones contextuales
- ⏳ Features avanzadas

---

**Fecha:** 2025-01-19  
**Estado:** Esqueleto completado y conectado a BD ✅  
**Próximo paso:** Implementar modales básicos

