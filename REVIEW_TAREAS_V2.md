# 📋 Review Completo: Sistema de Tareas V2

## 🎯 Resumen Ejecutivo

El sistema de **Tareas V2** es una reimplementación completa del sistema de gestión de tareas que introduce soporte para **múltiples trabajadores por tarea**, distribución flexible de pagos, y un sistema de auditoría robusto. Este review analiza la arquitectura, componentes, flujos de datos y posibles mejoras.

---

## 🏗️ Arquitectura del Sistema

### 1. Estructura de Base de Datos

#### Tablas Principales

**`tasks`** (Nueva tabla - reemplaza `apartment_tasks`)
- **Campos clave:**
  - `id`, `apartment_id`, `task_name`, `task_description`
  - `status` (pending, in_progress, completed, blocked)
  - `priority` (low, medium, high, urgent)
  - `total_budget` (reemplaza `worker_payment` de la versión anterior)
  - `progress_photos` (JSONB - eliminada tabla `progress_photos`)
  - `is_deleted`, `deleted_at`, `deletion_reason` (soft delete)
  - `start_date`, `end_date`, `completed_at`

**`task_assignments`** (Nueva tabla - relación muchos a muchos)
- **Campos clave:**
  - `id`, `task_id`, `worker_id`
  - `role` (worker, supervisor, assistant) - **informativo, no afecta pago**
  - `assignment_status` (assigned, working, completed, removed)
  - `payment_share_percentage` (%) - distribución del pago
  - `worker_payment` ($) - monto calculado
  - `is_paid`, `paid_at`
  - `is_deleted`, `deleted_at` (soft delete)
  - `completed_at`

**`task_assignment_materials`** (Nueva tabla)
- Vincula asignaciones con entregas de materiales
- `assignment_id`, `material_movement_id`, `notes`

**`payment_task_assignments`** (Nueva tabla - reemplaza `payment_tasks`)
- Relación entre pagos y asignaciones (no tareas directamente)
- `payment_id`, `task_assignment_id`, `amount_paid`, `task_id`

**`payment_distribution_history`** (Nueva tabla - auditoría)
- Registra cambios manuales en distribución de pagos
- `task_id`, `old_distribution` (JSONB), `new_distribution` (JSONB)
- `changed_by`, `change_reason`, `created_at`

#### Vistas

1. **`tasks_with_workers_v2`**
   - Agrega información de trabajadores a las tareas
   - Incluye array JSON de trabajadores con sus porcentajes y montos
   - Filtra automáticamente `is_deleted = false`

2. **`worker_pending_payments_v3`**
   - Resumen de pagos pendientes por trabajador
   - Incluye `pending_assignments` como JSONB
   - Calcula totales automáticamente

3. **`deleted_tasks_view`** / **`deleted_payments_view`**
   - Papelera de tareas y pagos eliminados (solo admins)

---

## 🔄 Flujos de Datos

### 1. Creación de Tarea

```
Usuario crea tarea
  ↓
TaskForm valida datos
  ↓
useTasksV2.createTask()
  ↓
INSERT INTO tasks (apartment_id, task_name, total_budget, ...)
  ↓
Trigger: recalculate_payments_on_budget_change (si hay asignaciones)
  ↓
Vista tasks_with_workers_v2 se actualiza automáticamente
```

**Observaciones:**
- ✅ La tarea se crea sin trabajadores asignados inicialmente
- ✅ El presupuesto (`total_budget`) puede ser $0 inicialmente
- ✅ Los trabajadores se asignan después desde el modal de gestión

### 2. Asignación de Trabajadores

```
Usuario asigna trabajador desde TaskWorkersModal
  ↓
useTasksV2.assignWorkerToTask(taskId, workerId, role)
  ↓
RPC: assign_worker_to_task(p_task_id, p_worker_id, p_role)
  ↓
Función SQL:
  1. INSERT INTO task_assignments
  2. Obtiene todas las asignaciones activas
  3. Calcula distribución equitativa (100% / número de trabajadores)
  4. Actualiza payment_share_percentage y worker_payment
  ↓
Trigger: update_task_status_from_assignments
  ↓
Si hay asignaciones, tarea pasa a 'in_progress'
```

**Características clave:**
- ✅ **Distribución automática equitativa**: Si hay 2 trabajadores, cada uno recibe 50%
- ✅ **Recálculo automático**: Si ya había trabajadores, se redistribuye todo
- ✅ **Filtro de trabajadores**: Solo muestra trabajadores con contrato activo en el proyecto

### 3. Ajuste Manual de Distribución

```
Usuario hace clic en "Ajustar Distribución"
  ↓
Edita porcentajes manualmente
  ↓
Validación: suma debe ser 100%
  ↓
useTasksV2.adjustPaymentDistribution(taskId, distributions)
  ↓
RPC: adjust_payment_distribution(p_task_id, p_distributions)
  ↓
Función SQL:
  1. Valida que la suma sea 100%
  2. Actualiza payment_share_percentage
  3. Recalcula worker_payment basado en total_budget
  4. INSERT INTO payment_distribution_history (auditoría)
  ↓
Vista se actualiza automáticamente
```

**Protecciones:**
- ✅ Validación en frontend y backend
- ✅ Auditoría completa de cambios
- ✅ No permite guardar si no suma 100%

### 4. Completado de Tarea (Bidireccional)

**Flujo A: Tarea → Asignaciones**
```
Usuario marca tarea como 'completed'
  ↓
useTasksV2.updateTask(taskId, { status: 'completed' })
  ↓
RPC: complete_task_manually(p_task_id, p_completed_at)
  ↓
Función SQL:
  1. UPDATE tasks SET status = 'completed', completed_at = ...
  2. UPDATE task_assignments SET assignment_status = 'completed', completed_at = ...
  ↓
Todas las asignaciones se marcan como completadas
```

**Flujo B: Asignaciones → Tarea**
```
Usuario completa asignación individual
  ↓
UPDATE task_assignments SET assignment_status = 'completed'
  ↓
Trigger: update_task_status_from_assignments
  ↓
Si TODAS las asignaciones están completadas:
  UPDATE tasks SET status = 'completed'
```

**Observaciones:**
- ✅ **Bidireccional**: Funciona en ambos sentidos
- ✅ **Automático**: El trigger detecta cuando todas las asignaciones están completadas
- ✅ **Manual**: Se puede completar la tarea completa desde la UI

### 5. Procesamiento de Pagos

```
Usuario procesa pago desde página de pagos
  ↓
useWorkerPaymentsV2.processFullPayment(workerId, notes)
  ↓
Obtiene todas las asignaciones completadas y no pagadas
  ↓
RPC: process_worker_payment_v2(p_worker_id, p_payment_amount, p_assignment_ids)
  ↓
Función SQL:
  1. INSERT INTO worker_payment_history
  2. INSERT INTO payment_task_assignments (una por cada asignación)
  3. UPDATE task_assignments SET is_paid = true, paid_at = NOW()
  ↓
Vista worker_pending_payments_v3 se actualiza
```

**Características:**
- ✅ **Pago completo**: Todas las asignaciones completadas del trabajador
- ✅ **Pago parcial**: Solo asignaciones seleccionadas
- ✅ **Trazabilidad**: Cada pago vincula a asignaciones específicas

### 6. Soft Delete

```
Usuario elimina tarea
  ↓
useTasksV2.deleteTask(taskId, reason)
  ↓
RPC: soft_delete_task(p_task_id, p_deletion_reason)
  ↓
Función SQL:
  1. Valida que NO tenga pagos asociados
  2. UPDATE tasks SET is_deleted = true, deleted_at = NOW()
  3. UPDATE task_assignments SET is_deleted = true (cascada)
  ↓
Tarea desaparece de vista normal, aparece en papelera
```

**Restricciones:**
- ❌ **NO permite eliminar** si tiene pagos asociados
- ✅ **Permite eliminar** si está completada pero no pagada
- ✅ **Permite eliminar** si está pendiente

---

## 🎨 Componentes Frontend

### 1. **`TareasV2Page`** (`src/app/(auth)/tareas-v2/page.tsx`)

**Responsabilidades:**
- Página principal de gestión de tareas
- Filtros avanzados (proyecto, piso, apartamento, trabajador, estado, prioridad)
- Estadísticas en tiempo real
- Gestión de modales (crear, editar, info, trabajadores)

**Flujos principales:**
1. **Carga inicial:**
   - `useTasksV2()` carga tareas, apartamentos, usuarios, proyectos, pisos
   - `fetchTaskStats()` obtiene estadísticas desde RPC `get_task_stats`
   - Filtra tareas según criterios seleccionados

2. **Creación de tarea:**
   - Modal con `TaskForm`
   - Validación de campos obligatorios
   - Actualiza estadísticas después de crear

3. **Edición de tarea:**
   - Mismo formulario, pre-poblado con datos existentes
   - Actualiza estadísticas después de editar

4. **Gestión de trabajadores:**
   - Botón "Info" abre `TaskInfoV2`
   - Botón "Gestionar Trabajadores" abre `TaskWorkersModal`
   - Permite asignar, remover y ajustar distribución

**Filtros implementados:**
- ✅ Búsqueda por texto (nombre, descripción, apartamento, proyecto)
- ✅ Filtro por proyecto (cascada con pisos y apartamentos)
- ✅ Filtro por piso (depende de proyecto)
- ✅ Filtro por apartamento (depende de piso)
- ✅ Filtro por trabajador (busca en array de workers)
- ✅ Filtro por estado (pending, in_progress, completed, blocked, delayed)
- ✅ Filtro por prioridad (urgent, high, medium, low)

**Estadísticas:**
- Total de tareas
- Pendientes
- En progreso
- Completadas
- Bloqueadas
- Atrasadas (usando campo `is_delayed`)

### 2. **`TaskCard`** (`src/components/tasks/TaskCard.tsx`)

**Responsabilidades:**
- Visualización de tarea en formato tarjeta
- Botones de acción rápida (cambiar estado, editar, eliminar, info)
- Indicadores visuales (estado, prioridad, retraso)

**Estados visuales:**
- `completed`: Fondo verde oscuro, borde verde
- `in_progress`: Fondo azul oscuro, borde azul
- `blocked`: Fondo rojo oscuro, borde rojo
- `pending`: Fondo gris oscuro, borde gris

**Acciones rápidas:**
- **Pendiente → En Progreso**: Botón "Iniciar"
- **En Progreso → Completada**: Botón "Completar"
- **En Progreso → Bloqueada**: Botón "Bloquear"
- **Completada → Reabrir**: Botón "Reabrir"

**Observaciones:**
- ✅ Muestra información básica (proyecto, piso, apartamento)
- ✅ Muestra trabajador asignado (compatibilidad con código viejo)
- ✅ Indicador de retraso si `is_delayed = true`
- ⚠️ No muestra múltiples trabajadores en la tarjeta (solo en modal de info)

### 3. **`TaskInfoV2`** (`src/components/tasks/TaskInfo_v2.tsx`)

**Responsabilidades:**
- Modal con información detallada de la tarea
- Lista de trabajadores asignados con sus porcentajes y montos
- Fotos de progreso (desde JSONB)
- Botón para gestionar trabajadores

**Información mostrada:**
- ✅ Datos básicos (nombre, proyecto, piso, apartamento, estado, presupuesto)
- ✅ Descripción completa
- ✅ Lista de trabajadores con:
  - Nombre y rol
  - Porcentaje de distribución
  - Monto asignado
  - Estado de pago (✅ Pagado / ⏳ Pendiente)
- ✅ Fotos de progreso (grid responsive)
- ✅ Notas adicionales
- ✅ Información de retraso (si aplica)

**Flujo:**
1. Usuario hace clic en "Info" en `TaskCard`
2. Se abre modal con información completa
3. Botón "Gestionar Trabajadores" abre `TaskWorkersModal`
4. Cierra modal de info al abrir modal de trabajadores

### 4. **`TaskWorkersModal`** (`src/components/tasks/TaskWorkersModal.tsx`)

**Responsabilidades:**
- Gestión completa de trabajadores asignados
- Asignación de nuevos trabajadores
- Ajuste manual de distribución de pagos
- Remoción de trabajadores

**Funcionalidades:**

**A. Asignación de Trabajadores:**
- ✅ Filtra trabajadores con contrato activo en el proyecto
- ✅ Solo muestra trabajadores no asignados
- ✅ Selección de rol (worker, supervisor, assistant)
- ✅ Distribución automática equitativa al asignar

**B. Ajuste de Distribución:**
- ✅ Modo edición con inputs numéricos
- ✅ Validación en tiempo real (debe sumar 100%)
- ✅ Muestra total actual mientras edita
- ✅ Botón "Guardar" solo habilitado si suma 100%
- ✅ Recalcula montos automáticamente

**C. Remoción de Trabajadores:**
- ✅ Confirmación antes de remover
- ✅ NO redistribuye automáticamente (debe ajustar manualmente)
- ✅ No permite remover si está pagado
- ✅ Campo opcional para razón de remoción

**Observaciones:**
- ⚠️ **Requiere projectId**: Si la tarea no tiene proyecto asociado, no se pueden asignar trabajadores
- ✅ **Carga asíncrona**: Carga trabajadores del proyecto al abrir el modal
- ✅ **Validación robusta**: Frontend y backend validan distribución

### 5. **`TaskForm`** (`src/components/tasks/TaskForm.tsx`)

**Responsabilidades:**
- Formulario de creación/edición de tareas
- Validación de campos
- Cascada de selección (proyecto → piso → apartamento)

**Campos:**
- ✅ Proyecto (select con cascada)
- ✅ Piso (filtrado por proyecto)
- ✅ Apartamento (filtrado por piso)
- ✅ Nombre de tarea (obligatorio)
- ✅ Descripción (opcional, textarea)
- ✅ Categoría (select: Estructura, Instalaciones, Acabados, etc.)
- ✅ Estado (select con ACTIVITY_STATUSES)
- ✅ Prioridad (select: low, medium, high, urgent)
- ✅ Horas estimadas (number)
- ✅ Pago a trabajador (number) - **⚠️ Este campo es legacy, ahora se usa total_budget**
- ✅ Asignado a (select) - **⚠️ Este campo es legacy, ahora se asignan desde modal**
- ✅ Fechas (start_date, end_date, completed_at)

**Observaciones:**
- ⚠️ **Campos legacy**: `worker_payment` y `assigned_to` están en el formulario pero el sistema nuevo usa `total_budget` y asignaciones múltiples
- ✅ **Cascada funcional**: Los selects se actualizan correctamente
- ✅ **Validación**: Campos obligatorios validados con react-hook-form

---

## 🔧 Hooks

### 1. **`useTasksV2`** (`src/hooks/useTasks_v2.ts`)

**Estado:**
- `tasks`: Array de tareas con trabajadores agregados
- `apartments`, `users`, `projects`, `floors`: Datos de referencia
- `loading`, `error`: Estados de carga
- `taskStats`: Estadísticas agregadas

**Funciones principales:**

**`fetchTasks()`**
- Consulta vista `tasks_with_workers_v2`
- Procesa workers desde JSON string a array
- Compatibilidad con código viejo (asigned_to, assigned_user_name)

**`createTask()`**
- INSERT directo en tabla `tasks`
- Valores por defecto: `status = 'pending'`, `total_budget = 0`
- Recarga tareas y estadísticas después de crear

**`updateTask()`**
- Si status = 'completed', usa RPC `complete_task_manually`
- Si no, UPDATE directo en tabla `tasks`
- Maneja fechas vacías (convierte a null)

**`deleteTask()`**
- Usa RPC `soft_delete_task`
- Requiere razón de eliminación
- Recarga tareas y estadísticas

**`assignWorkerToTask()`**
- RPC `assign_worker_to_task`
- Distribución automática equitativa
- Recarga tareas después de asignar

**`adjustPaymentDistribution()`**
- RPC `adjust_payment_distribution`
- Valida que distribuciones sumen 100%
- Registra en auditoría

**`removeWorkerFromTask()`**
- RPC `remove_worker_from_task`
- NO redistribuye automáticamente
- Requiere razón opcional

**`getWorkersForProject()`**
- Consulta `contract_history` para trabajadores con contrato activo
- Filtra por `project_id` y `status = 'activo'`
- Elimina duplicados

**`fetchTaskStats()`**
- RPC `get_task_stats`
- Estadísticas agregadas por estado
- Filtro opcional por proyecto

### 2. **`useWorkerPaymentsV2`** (`src/hooks/useWorkerPayments_v2.ts`)

**Estado:**
- `payments`: Array de resúmenes de pagos por trabajador
- `loading`, `refreshing`, `error`: Estados de carga

**Funciones principales:**

**`fetchWorkerPayments()`**
- Consulta vista `worker_pending_payments_v3`
- Obtiene `contract_type` de cada trabajador
- Procesa `pending_assignments` desde JSON

**`getWorkerPaymentDetails()`**
- Consulta `task_assignments` con joins a tareas y apartamentos
- Filtra por `worker_id` y `is_deleted = false`
- Ordena por `completed_at` descendente

**`processFullPayment()`**
- Obtiene todas las asignaciones completadas y no pagadas
- Calcula monto total
- RPC `process_worker_payment_v2`

**`processPartialPayment()`**
- Similar a full payment pero solo para asignaciones seleccionadas
- Valida que las asignaciones existan
- RPC `process_worker_payment_v2`

**`deletePayment()`**
- RPC `soft_delete_payment`
- Marca asignaciones como no pagadas (trigger)
- Requiere razón de eliminación

**`getPaymentHistory()`**
- Consulta `worker_payment_history`
- Filtra por `worker_id` y `is_deleted = false`
- Ordena por `payment_date` descendente

**`getPaymentAssignments()`**
- Consulta `payment_task_assignments` con joins
- Muestra detalles de asignaciones incluidas en un pago
- Incluye información de tarea, apartamento, piso, proyecto

---

## 🔍 Análisis de Funcionamiento

### ✅ Fortalezas

1. **Arquitectura sólida:**
   - Separación clara entre tareas y asignaciones
   - Soft delete completo
   - Auditoría de cambios

2. **Distribución flexible:**
   - Automática equitativa por defecto
   - Manual editable cuando se necesita
   - Recálculo automático al cambiar presupuesto

3. **Completado bidireccional:**
   - Funciona desde tarea o desde asignaciones
   - Triggers automáticos mantienen consistencia

4. **Filtros avanzados:**
   - Múltiples criterios de búsqueda
   - Cascada funcional (proyecto → piso → apartamento)
   - Filtro por trabajador busca en array JSON

5. **UI/UX:**
   - Modales informativos
   - Validación en tiempo real
   - Feedback visual claro

### ⚠️ Áreas de Mejora

1. **Compatibilidad con código viejo:**
   - `TaskForm` todavía tiene campos `worker_payment` y `assigned_to` que son legacy
   - Debería usar solo `total_budget` y eliminar `assigned_to`
   - La página de pagos (`/pagos`) todavía usa `useWorkerPayments` (viejo), no `useWorkerPaymentsV2`

2. **Visualización de múltiples trabajadores:**
   - `TaskCard` solo muestra un trabajador (compatibilidad)
   - Debería mostrar "X trabajadores asignados" o lista compacta

3. **Filtro por trabajador:**
   - Busca en array JSON parseado, puede ser lento con muchas tareas
   - Considerar índice o vista materializada

4. **Carga de trabajadores:**
   - `TaskWorkersModal` carga trabajadores del proyecto al abrir
   - Si hay muchos trabajadores, puede ser lento
   - Considerar paginación o búsqueda

5. **Validación de distribución:**
   - Validación en frontend y backend (redundante pero seguro)
   - Podría mostrar sugerencia de distribución equitativa si no suma 100%

6. **Estadísticas:**
   - Se recargan después de cada operación (crear, editar, eliminar)
   - Podría optimizarse con actualización incremental

7. **Fotos de progreso:**
   - Se almacenan en JSONB pero no hay UI para subirlas
   - Solo se muestran si ya existen

8. **Materiales:**
   - Tabla `task_assignment_materials` existe pero no hay UI para gestionarla
   - Solo se vincula a entregas, no hay visualización

---

## 🔄 Flujos de Usuario Típicos

### Flujo 1: Crear Tarea y Asignar Trabajadores

```
1. Usuario hace clic en "Nueva Tarea"
2. Completa formulario (proyecto, piso, apartamento, nombre, presupuesto)
3. Guarda tarea
4. Hace clic en "Info" de la tarea creada
5. Hace clic en "Gestionar Trabajadores"
6. Selecciona trabajador del proyecto
7. Asigna (distribución automática 100%)
8. Asigna segundo trabajador (distribución automática 50% c/u)
9. Ajusta distribución manualmente si es necesario (70% / 30%)
10. Guarda distribución
```

### Flujo 2: Completar Tarea y Procesar Pago

```
1. Usuario ve tarea en progreso
2. Hace clic en "Completar" en TaskCard
3. Tarea y todas las asignaciones se marcan como completadas
4. Usuario va a página de pagos
5. Ve trabajador con asignaciones completadas pendientes
6. Hace clic en "Procesar Pago"
7. Se crea registro en worker_payment_history
8. Se vinculan asignaciones en payment_task_assignments
9. Asignaciones se marcan como is_paid = true
```

### Flujo 3: Ajustar Presupuesto

```
1. Usuario edita tarea
2. Cambia total_budget de $300,000 a $450,000
3. Guarda cambios
4. Trigger recalculate_payments_on_budget_change se ejecuta
5. Recalcula worker_payment de cada asignación
6. Mantiene porcentajes (ej: 50% / 50%)
7. Actualiza montos ($225,000 c/u)
```

---

## 📊 Comparación con Sistema Anterior

| Característica | Sistema Anterior | Sistema V2 |
|---------------|------------------|------------|
| Trabajadores por tarea | 1 (assigned_to) | Múltiples (task_assignments) |
| Distribución de pago | Fija (worker_payment) | Flexible (payment_share_percentage) |
| Recálculo automático | ❌ No | ✅ Sí (trigger) |
| Completado bidireccional | ❌ No | ✅ Sí |
| Soft delete | ⚠️ Parcial | ✅ Completo |
| Fotos | Tabla separada | JSONB en tarea |
| Materiales | Tabla task_materials | Vinculación a entregas |
| Auditoría | ❌ No | ✅ Completa |
| Filtros | Básicos | Avanzados (múltiples criterios) |

---

## 🐛 Problemas Conocidos

1. **Página de pagos no usa V2:**
   - `/pagos` todavía usa `useWorkerPayments` (viejo)
   - Debería migrar a `useWorkerPaymentsV2`

2. **TaskForm con campos legacy:**
   - Muestra `worker_payment` y `assigned_to`
   - Debería usar solo `total_budget` y eliminar `assigned_to`

3. **Falta UI para materiales:**
   - Tabla `task_assignment_materials` existe pero no hay interfaz

4. **Falta UI para fotos:**
   - Campo `progress_photos` existe pero no hay uploader

5. **Performance con muchas tareas:**
   - Filtro por trabajador parsea JSON en cada render
   - Considerar optimización

---

## ✅ Recomendaciones

### Corto Plazo

1. **Migrar página de pagos a V2:**
   - Actualizar `/pagos` para usar `useWorkerPaymentsV2`
   - Actualizar componentes relacionados

2. **Limpiar TaskForm:**
   - Eliminar campos `worker_payment` y `assigned_to`
   - Usar solo `total_budget`

3. **Mejorar TaskCard:**
   - Mostrar "X trabajadores" en lugar de solo uno
   - Agregar badge con número de trabajadores

### Mediano Plazo

1. **UI para materiales:**
   - Componente para vincular entregas a asignaciones
   - Visualización de materiales usados por tarea

2. **UI para fotos:**
   - Uploader de fotos de progreso
   - Integración con storage de Supabase

3. **Optimización de filtros:**
   - Índice en campo workers (JSONB)
   - Vista materializada para búsquedas frecuentes

### Largo Plazo

1. **Notificaciones:**
   - Alertas cuando tarea se atrasa
   - Notificaciones de asignación

2. **Reportes:**
   - Dashboard de productividad por trabajador
   - Análisis de distribución de pagos

3. **Exportación:**
   - Exportar tareas a Excel/PDF
   - Reportes de pagos

---

## 🎓 Conclusión

El sistema de **Tareas V2** es una mejora significativa sobre el sistema anterior, con arquitectura más flexible y funcionalidades avanzadas. La implementación es sólida y bien estructurada, con separación clara de responsabilidades.

**Puntos destacados:**
- ✅ Soporte para múltiples trabajadores
- ✅ Distribución flexible de pagos
- ✅ Completado bidireccional
- ✅ Soft delete completo
- ✅ Auditoría de cambios

**Áreas de atención:**
- ⚠️ Migración completa de páginas antiguas
- ⚠️ Limpieza de campos legacy
- ⚠️ UI para funcionalidades faltantes (materiales, fotos)

El sistema está **listo para producción** con las mejoras sugeridas en el corto plazo.

---

**Fecha del Review:** 2025-01-XX
**Revisado por:** AI Assistant
**Versión del Sistema:** V2 (Rework Completo)

