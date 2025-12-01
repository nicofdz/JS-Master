# 📊 Análisis: Migración de Proyectos a Sistema de Tareas V2

## 🎯 Objetivo
Migrar el cálculo de progreso de proyectos desde el sistema antiguo (`apartment_tasks`) al nuevo sistema (`tasks` V2).

---

## 📋 Estado Actual

### **Sistema Antiguo (En Uso Actualmente)**

#### 1. **Función RPC: `get_projects_with_progress()`**
- **Ubicación:** `database/get-projects-with-progress.sql`
- **Llamada desde:** `src/hooks/useProjects.ts` (línea 58)
- **Tabla utilizada:** `apartment_tasks` (antigua)

#### 2. **Cálculo de Progreso Actual:**
```sql
-- Líneas 55-62 de get-projects-with-progress.sql
CASE 
  WHEN COUNT(at.id) = 0 THEN 0::NUMERIC
  ELSE ROUND(
    (COUNT(CASE WHEN at.status = 'completed' THEN 1 END)::NUMERIC / COUNT(at.id)::NUMERIC) * 100, 
    2
  )
END as progress_percentage
```

#### 3. **Relaciones Actuales:**
```
projects
  ↓
floors (f.project_id = p.id)
  ↓
apartments (a.floor_id = f.id)
  ↓
apartment_tasks (at.apartment_id = a.id)
```

#### 4. **Filtros Aplicados:**
- ✅ Solo proyectos activos: `WHERE p.is_active = true`
- ✅ Excluye tareas canceladas: `AND at.status != 'cancelled'`
- ❌ **NO excluye tareas eliminadas** (apartment_tasks no tiene soft delete)

#### 5. **Campos Retornados:**
- `progress_percentage` y `progress` (alias)
- `total_activities` (COUNT de todas las tareas)
- `activities_completed` (COUNT de tareas completadas)
- `towers_count`, `total_floors_count`, `apartments_count`

---

## 🆕 Sistema Nuevo (Tareas V2)

### **1. Tabla Principal: `tasks`**
```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  apartment_id INTEGER REFERENCES apartments(id),
  task_name VARCHAR,
  task_category VARCHAR,
  status VARCHAR, -- 'pending', 'in_progress', 'completed', 'blocked', 'cancelled', 'on_hold'
  priority VARCHAR,
  total_budget NUMERIC,
  is_deleted BOOLEAN DEFAULT false, -- Soft delete
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  deletion_reason TEXT,
  ...
)
```

### **2. Relaciones Nuevas:**
```
projects
  ↓
floors (f.project_id = p.id)
  ↓
apartments (a.floor_id = f.id)
  ↓
tasks (t.apartment_id = a.id)
  ↓
task_assignments (ta.task_id = t.id) -- Múltiples trabajadores por tarea
```

### **3. Diferencias Clave:**

| Aspecto | Sistema Antiguo | Sistema Nuevo |
|---------|----------------|---------------|
| **Tabla** | `apartment_tasks` | `tasks` |
| **Trabajadores** | 1 por tarea (`assigned_to`) | Múltiples (`task_assignments`) |
| **Soft Delete** | ❌ No tiene | ✅ `is_deleted` |
| **Estados** | `pending`, `in-progress`, `completed`, `blocked` | `pending`, `in_progress`, `completed`, `blocked`, `cancelled`, `on_hold` |
| **Presupuesto** | `worker_payment` (por trabajador) | `total_budget` (total, se divide) |

---

## 🔄 Cambios Necesarios

### **1. Modificar Función `get_projects_with_progress()`**

#### **Cambios en el JOIN:**
```sql
-- ANTES:
LEFT JOIN apartment_tasks at ON at.apartment_id = a.id 
  AND at.status != 'cancelled'

-- DESPUÉS:
LEFT JOIN tasks t ON t.apartment_id = a.id 
  AND t.status != 'cancelled'  -- Excluir canceladas
  AND t.is_deleted = false     -- Excluir eliminadas (soft delete)
```

#### **Cambios en el Cálculo de Progreso:**
```sql
-- ANTES:
COUNT(CASE WHEN at.status = 'completed' THEN 1 END)

-- DESPUÉS:
COUNT(CASE WHEN t.status = 'completed' THEN 1 END)
```

#### **Cambios en los Conteos:**
```sql
-- ANTES:
COUNT(at.id) as total_activities
COUNT(CASE WHEN at.status = 'completed' THEN 1 END) as activities_completed

-- DESPUÉS:
COUNT(t.id) as total_activities
COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as activities_completed
```

### **2. Consideraciones Adicionales**

#### **A. Tareas con Múltiples Trabajadores:**
- El progreso se calcula por **tarea**, no por trabajador
- Una tarea completada cuenta como 1, independientemente de cuántos trabajadores tenga asignados
- ✅ **No requiere cambios** en el cálculo de progreso

#### **B. Tareas Eliminadas (Soft Delete):**
- Deben excluirse del cálculo: `AND t.is_deleted = false`
- Las tareas eliminadas no afectan el progreso del proyecto

#### **C. Tareas Canceladas:**
- Se mantiene la exclusión: `AND t.status != 'cancelled'`
- Las tareas canceladas no cuentan en el progreso

#### **D. Compatibilidad:**
- La función debe mantener la misma estructura de retorno
- Los campos `progress_percentage` y `progress` deben seguir siendo alias
- Los nombres de campos deben mantenerse iguales para no romper el frontend

---

## 📝 Plan de Migración

### **Paso 1: Crear Nueva Versión de la Función**
- Crear `get_projects_with_progress_v2()` como función nueva
- Probar que retorna los mismos campos
- Verificar cálculos con datos reales

### **Paso 2: Actualizar Función Existente**
- Reemplazar `get_projects_with_progress()` con la nueva lógica
- Mantener el mismo nombre para compatibilidad
- Aplicar migración SQL

### **Paso 3: Verificar Frontend**
- El hook `useProjects` no requiere cambios (usa RPC)
- La página `proyectos/page.tsx` no requiere cambios (usa datos del hook)
- Verificar que los porcentajes se muestren correctamente

### **Paso 4: Testing**
- Comparar resultados antes/después
- Verificar que proyectos sin tareas muestren 0%
- Verificar que proyectos con tareas completadas muestren 100%
- Verificar que tareas eliminadas no afecten el cálculo

---

## ⚠️ Riesgos y Consideraciones

### **1. Datos Históricos:**
- Las tareas antiguas en `apartment_tasks` seguirán existiendo
- El nuevo sistema solo consulta `tasks`
- ⚠️ **Pregunta:** ¿Debemos migrar datos de `apartment_tasks` a `tasks`?

### **2. Transición:**
- Durante la transición, puede haber tareas en ambas tablas
- El cálculo solo considerará `tasks` (nuevo sistema)
- ⚠️ **Recomendación:** Migrar datos históricos si es necesario

### **3. Performance:**
- El nuevo JOIN es similar al anterior
- `tasks` tiene índices en `apartment_id` y `status`
- ✅ No debería haber impacto significativo en performance

---

## ✅ Checklist de Implementación

- [ ] Crear migración SQL para actualizar `get_projects_with_progress()`
- [ ] Cambiar `apartment_tasks` por `tasks` en el JOIN
- [ ] Agregar filtro `AND t.is_deleted = false`
- [ ] Mantener filtro `AND t.status != 'cancelled'`
- [ ] Actualizar todos los COUNT para usar `t` en lugar de `at`
- [ ] Verificar que los campos retornados sean idénticos
- [ ] Probar con datos reales
- [ ] Verificar que el frontend no requiera cambios
- [ ] Documentar cambios en comentarios SQL

---

## 📊 Comparación de Resultados Esperados

### **Escenario 1: Proyecto sin tareas**
- **Antes:** `progress_percentage = 0`
- **Después:** `progress_percentage = 0`
- ✅ **Sin cambios**

### **Escenario 2: Proyecto con 10 tareas, 5 completadas**
- **Antes:** `progress_percentage = 50%`
- **Después:** `progress_percentage = 50%`
- ✅ **Sin cambios**

### **Escenario 3: Proyecto con tareas eliminadas**
- **Antes:** Las tareas eliminadas se contaban (si existían en apartment_tasks)
- **Después:** Las tareas eliminadas NO se cuentan (`is_deleted = false`)
- ⚠️ **Puede haber diferencia** si hay tareas eliminadas

### **Escenario 4: Proyecto con tareas canceladas**
- **Antes:** No se contaban (`status != 'cancelled'`)
- **Después:** No se cuentan (`status != 'cancelled'`)
- ✅ **Sin cambios**

---

## 🔍 Archivos a Modificar

### **1. Base de Datos**
- **`database/get-projects-with-progress.sql`**
  - Actualizar función para usar `tasks` en lugar de `apartment_tasks`

### **2. Frontend - Visualización de Estructura**

#### **A. `src/components/projects/EditStructureModal.tsx`**
- **Línea 87-114:** `fetchTaskCounts()` consulta `apartment_tasks`
  - **Cambio:** Consultar `tasks` con filtro `is_deleted = false`
  - **Campos:** `apartment_id`, `status`
  
- **Línea 294-306:** `getTaskBadge()` muestra conteo
  - **No requiere cambios** (usa datos de `fetchTaskCounts`)

- **Línea 742-752:** Usa `ApartmentTasksModal` para mostrar tareas
  - **Requiere actualizar** `ApartmentTasksModal` (ver abajo)

#### **B. `src/components/projects/StructureViewModal.tsx`**
- **Línea 43-71:** `fetchTaskCounts()` consulta `apartment_tasks`
  - **Cambio:** Consultar `tasks` con filtro `is_deleted = false`
  
- **Línea 146-158:** `getTaskBadge()` muestra conteo
  - **No requiere cambios**

- **Línea 314-325:** Usa `ApartmentTasksModal` para mostrar tareas
  - **Requiere actualizar** `ApartmentTasksModal` (ver abajo)

#### **C. `src/components/projects/ApartmentTasksModal.tsx`**
- **Línea 40-72:** Consulta `apartment_tasks` para mostrar tareas
  - **Cambio:** Consultar `tasks` con filtro `is_deleted = false`
  - **Cambio:** JOIN con `task_assignments` para obtener trabajadores (múltiples)
  - **Cambio:** Adaptar UI para mostrar múltiples trabajadores por tarea
  - **Campos a mostrar:**
    - `task_name`, `task_description`, `task_category`, `status`
    - Lista de trabajadores desde `task_assignments` (no solo `assigned_to`)

### **3. Frontend - Creación Masiva de Tareas**

#### **A. `src/components/projects/AddTasksToFloorsModal.tsx`**
- **Línea 126-144 y 211-229:** Consulta `apartment_tasks` para mostrar tareas existentes
  - **Cambio:** Consultar `tasks` con filtro `is_deleted = false`
  - **Campo:** `task_name` (para mostrar tareas existentes)

- **Línea 437-462:** Crea tareas masivas insertando en `apartment_tasks`
  - **Cambio:** Insertar en `tasks` en lugar de `apartment_tasks`
  - **Campos mínimos a crear:**
    ```typescript
    {
      apartment_id: number,
      task_name: string,
      task_category: string,
      status: 'pending',
      priority: 'medium',
      total_budget: 0,  // Por defecto 0 (sin trabajadores asignados)
      estimated_hours?: number  // Opcional, del template
    }
    ```
  - **Nota:** Las tareas se crean sin trabajadores asignados inicialmente
  - **Nota:** El usuario mencionó que las tareas masivas son simples y llevan campos faltantes, no preocuparse por eso

#### **B. `src/hooks/useTaskTemplates.ts`**
- **No requiere cambios:** La tabla `task_templates` se mantiene igual
- Solo cambia dónde se insertan las tareas creadas desde las plantillas

---

## 📋 Resumen de Cambios por Componente

### **1. `get_projects_with_progress()` (RPC)**
- ✅ Cambiar `apartment_tasks` → `tasks`
- ✅ Agregar filtro `is_deleted = false`
- ✅ Mantener filtro `status != 'cancelled'`

### **2. `EditStructureModal.tsx`**
- ✅ `fetchTaskCounts()`: Cambiar consulta a `tasks`
- ✅ Mantener `getTaskBadge()` sin cambios
- ⚠️ `ApartmentTasksModal` requiere actualización (ver abajo)

### **3. `StructureViewModal.tsx`**
- ✅ `fetchTaskCounts()`: Cambiar consulta a `tasks`
- ✅ Mantener `getTaskBadge()` sin cambios
- ⚠️ `ApartmentTasksModal` requiere actualización (ver abajo)

### **4. `ApartmentTasksModal.tsx`**
- ✅ Cambiar consulta de `apartment_tasks` → `tasks`
- ✅ Agregar JOIN con `task_assignments` para obtener trabajadores
- ✅ Adaptar UI para mostrar múltiples trabajadores
- ⚠️ **Consideración:** ¿Mostrar todos los trabajadores o solo el primero?

### **5. `AddTasksToFloorsModal.tsx`**
- ✅ Cambiar consulta de tareas existentes a `tasks`
- ✅ Cambiar inserción de `apartment_tasks` → `tasks`
- ✅ Mantener campos mínimos (como mencionó el usuario)
- ✅ No asignar trabajadores inicialmente (se asignan después)

---

## 🔄 Flujo de Creación Masiva Actual vs Nuevo

### **Sistema Antiguo:**
```
1. Usuario selecciona plantillas (task_templates)
2. Usuario selecciona pisos/departamentos
3. Se crean tareas en apartment_tasks:
   - apartment_id
   - task_name (de template)
   - task_category (de template)
   - status: 'pending'
   - priority: 'medium'
   - estimated_hours (de template)
   - assigned_to: null (sin trabajador)
```

### **Sistema Nuevo:**
```
1. Usuario selecciona plantillas (task_templates) ✅ Sin cambios
2. Usuario selecciona pisos/departamentos ✅ Sin cambios
3. Se crean tareas en tasks:
   - apartment_id
   - task_name (de template)
   - task_category (de template)
   - status: 'pending'
   - priority: 'medium'
   - total_budget: 0 (sin trabajadores)
   - estimated_hours?: (opcional, del template)
4. NO se crean task_assignments (trabajadores se asignan después)
```

---

## ⚠️ Consideraciones Importantes

### **1. Tareas Masivas Simples**
- El usuario mencionó que las tareas masivas son simples y llevan campos faltantes
- ✅ No preocuparse por completar todos los campos
- ✅ Solo los campos esenciales: `apartment_id`, `task_name`, `task_category`, `status`, `priority`
- ✅ `total_budget` puede ser 0 inicialmente

### **2. Trabajadores en Tareas Masivas**
- Las tareas masivas NO asignan trabajadores inicialmente
- Los trabajadores se asignan después manualmente
- ✅ No requiere crear `task_assignments` durante la creación masiva

### **3. Visualización de Tareas**
- `ApartmentTasksModal` actualmente muestra 1 trabajador por tarea
- Con el nuevo sistema, puede haber múltiples trabajadores
- ⚠️ **Decisión:** ¿Mostrar todos los trabajadores o solo el primero?
- ⚠️ **Alternativa:** Mostrar "X trabajadores asignados" en lugar de nombres

### **4. Compatibilidad de Estados**
- Sistema antiguo: `pending`, `in-progress`, `completed`, `blocked`
- Sistema nuevo: `pending`, `in_progress`, `completed`, `blocked`, `cancelled`, `on_hold`
- ⚠️ **Ajuste necesario:** Normalizar `in-progress` → `in_progress` en consultas

---

## 📌 Notas Finales

- La migración requiere cambios en **múltiples componentes frontend**
- La creación masiva es simple (campos mínimos)
- Las plantillas (`task_templates`) no cambian
- La visualización de tareas requiere adaptación para múltiples trabajadores

