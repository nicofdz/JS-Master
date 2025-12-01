# 📋 Preview: Migración de Consolidación de Tareas Duplicadas

## 🔍 Análisis de la Situación Actual

### Problema Identificado

En la tabla `apartment_tasks` (sistema antiguo), cuando una tarea tenía múltiples trabajadores, se creaban **múltiples registros** de la misma tarea, uno por cada trabajador, con el dinero dividido manualmente.

**Ejemplo:**
- Departamento 485, Tarea "Tabiques"
- 3 registros en `apartment_tasks`:
  - Registro 1: Trabajador 8 → $53,283.33
  - Registro 2: Trabajador 9 → $53,283.33
  - Registro 3: Trabajador 10 → $53,283.34
- **Total presupuesto:** $159,850.00

### Estado Actual en `tasks` (Sistema Nuevo)

La migración creó **3 tareas separadas** en lugar de consolidar:

```
Tarea 187: "Tabiques" → $53,283.33 (Trabajador 8 al 100%)
Tarea 188: "Tabiques" → $53,283.33 (Trabajador 9 al 100%)
Tarea 189: "Tabiques" → $53,283.34 (Trabajador 10 al 100%)
```

**Problema:** Esto genera duplicación y no refleja que era UNA tarea con 3 trabajadores.

---

## ✅ Estado Deseado (Después de la Consolidación)

### Estructura Correcta

```
Tarea ÚNICA: "Tabiques" → $159,850.00 (total_budget)
├── Asignación 1: Trabajador 8 → 33.33% = $53,283.33
├── Asignación 2: Trabajador 9 → 33.33% = $53,283.33
└── Asignación 3: Trabajador 10 → 33.34% = $53,283.34
```

---

## 📊 Estadísticas de la Migración

### Tareas Duplicadas Encontradas

**Total de grupos duplicados:** 44 grupos
**Total de tareas duplicadas:** 104 tareas
**Tareas a eliminar (duplicadas):** 60 tareas
**Asignaciones a consolidar:** 104 asignaciones

### Distribución de Duplicados

- **Tareas con 3 duplicados:** 16 grupos (48 tareas → 16 únicas)
- **Tareas con 2 duplicados:** 4 grupos (8 tareas → 4 únicas)
- **Total:** 20 grupos de "Tabiques" en diferentes departamentos

### Ejemplos de Grupos a Consolidar

#### Ejemplo 1: Departamento 485 (3 tareas → 1 tarea)
- **Tareas actuales:** 187, 188, 189
- **Presupuesto total:** $159,850.00
- **Trabajadores:** 3 (todos pagados)
- **Resultado:** 1 tarea (ID 187) con 3 asignaciones

#### Ejemplo 2: Departamento 345 (3 tareas → 1 tarea)
- **Tareas actuales:** 53, 132, 133
- **Presupuesto total:** $304,299.98
- **Trabajadores:** 3 (todos pagados)
- **Resultado:** 1 tarea (ID 53) con 3 asignaciones

#### Ejemplo 3: Departamento 336 (2 tareas → 1 tarea)
- **Tareas actuales:** 124, 125
- **Presupuesto total:** $152,150.00
- **Trabajadores:** 2 (todos pagados)
- **Resultado:** 1 tarea (ID 124) con 2 asignaciones

### Ejemplo Detallado: Departamento 485

#### ANTES (Estado Actual)

| Task ID | Apartment | Tarea | Presupuesto | Trabajador | Porcentaje | Monto | Pagado |
|---------|-----------|-------|-------------|------------|------------|-------|--------|
| 187 | 485 | Tabiques | $53,283.33 | Álvaro Araya (8) | 100% | $53,283.33 | ✅ Pagado |
| 188 | 485 | Tabiques | $53,283.33 | Yonatan Santana (9) | 100% | $53,283.33 | ✅ Pagado |
| 189 | 485 | Tabiques | $53,283.34 | Pablo Lagos (10) | 100% | $53,283.34 | ✅ Pagado |

**Total:** 3 tareas separadas, $159,850.00

#### DESPUÉS (Estado Deseado)

| Task ID | Apartment | Tarea | Presupuesto Total | Trabajador | Porcentaje | Monto | Pagado |
|---------|-----------|-------|-------------------|------------|------------|-------|--------|
| 187* | 485 | Tabiques | **$159,850.00** | Álvaro Araya (8) | 33.33% | $53,283.33 | ✅ Pagado |
| | | | | Yonatan Santana (9) | 33.33% | $53,283.33 | ✅ Pagado |
| | | | | Pablo Lagos (10) | 33.34% | $53,283.34 | ✅ Pagado |

**Total:** 1 tarea consolidada, $159,850.00
**Tareas eliminadas:** 188, 189

*Se mantiene el ID de la primera tarea (más antigua)

---

## 🔧 Proceso de Consolidación

### Paso 1: Identificar Tareas Duplicadas

```sql
-- Agrupar por: apartment_id, task_name, task_category
-- Contar: COUNT(*) > 1
```

### Paso 2: Seleccionar Tarea Principal

- **Criterio:** Mantener la tarea con el `id` más bajo (más antigua)
- **Razón:** Preservar el historial más completo

### Paso 3: Consolidar Presupuesto

- **Sumar:** `total_budget` de todas las tareas duplicadas
- **Actualizar:** Tarea principal con el total

### Paso 4: Migrar Asignaciones

- **Mover:** Todas las asignaciones de tareas duplicadas a la tarea principal
- **Recalcular:** Porcentajes basados en el nuevo `total_budget`
- **Preservar:** Estados, fechas, pagos existentes

### Paso 5: Actualizar Referencias

- **payment_task_assignments:** Actualizar `task_id` a la tarea principal
- **payment_distribution_history:** Actualizar `task_id` si existe
- **task_assignment_materials:** Actualizar `task_assignment_id` si cambia

### Paso 6: Soft Delete de Tareas Duplicadas

- **Marcar:** `is_deleted = true` en tareas duplicadas
- **Registrar:** `deleted_at`, `deleted_by`, `deletion_reason`
- **NO eliminar físicamente:** Para mantener historial

---

## ⚠️ Consideraciones Importantes

### 1. Pagos Existentes

- **Estado actual:** Todas las asignaciones están marcadas como `is_paid = true`
- **Importante:** NO hay registros en `payment_task_assignments` (los pagos se procesaron directamente)
- **Durante consolidación:**
  - Se preservará el estado `is_paid = true` en todas las asignaciones
  - Los montos NO cambiarán
  - Si en el futuro se crean pagos, se referenciarán a la tarea principal

### 2. Estados de Tareas

- Si las tareas duplicadas tienen estados diferentes:
  - Se tomará el estado más avanzado (completed > in_progress > pending)
  - O se puede usar el estado de la tarea principal

### 3. Fechas

- `created_at`: Se mantiene la fecha más antigua
- `updated_at`: Se actualiza a `NOW()`
- `completed_at`: Se toma la fecha más reciente si existe

### 4. Fotos de Progreso

- Si hay `progress_photos` en diferentes tareas:
  - Se consolidan en un solo array JSONB
  - Se preservan todas las fotos

### 5. Notas

- Se concatenan las notas de todas las tareas duplicadas
- Formato: "Nota de Tarea 187 | Nota de Tarea 188 | ..."

---

## 📝 Ejemplo de Script SQL

```sql
-- =====================================================
-- CONSOLIDACIÓN DE TAREAS DUPLICADAS
-- =====================================================
-- Este script consolida tareas duplicadas en tasks
-- que fueron creadas incorrectamente durante la migración
-- =====================================================

-- Paso 1: Crear tabla temporal con grupos de tareas duplicadas
CREATE TEMP TABLE tareas_duplicadas_grupos AS
SELECT 
  apartment_id,
  task_name,
  task_category,
  MIN(id) as task_id_principal,  -- Mantener la más antigua
  ARRAY_AGG(id ORDER BY id) as todos_los_ids,
  SUM(total_budget) as total_budget_consolidado,
  MIN(created_at) as fecha_creacion,
  -- Tomar el estado más avanzado
  CASE 
    WHEN BOOL_OR(status = 'completed') THEN 'completed'
    WHEN BOOL_OR(status = 'in_progress') THEN 'in_progress'
    WHEN BOOL_OR(status = 'blocked') THEN 'blocked'
    ELSE 'pending'
  END as status_consolidado,
  -- Consolidar notas
  STRING_AGG(DISTINCT COALESCE(notes, ''), ' | ') FILTER (WHERE notes IS NOT NULL AND notes != '') as notas_consolidadas,
  -- Consolidar fotos
  jsonb_agg(DISTINCT jsonb_array_elements(progress_photos)) FILTER (WHERE progress_photos IS NOT NULL) as fotos_consolidadas
FROM tasks
WHERE is_deleted = false
GROUP BY apartment_id, task_name, task_category
HAVING COUNT(*) > 1;

-- Paso 2: Actualizar tarea principal con datos consolidados
UPDATE tasks t
SET 
  total_budget = td.total_budget_consolidado,
  status = td.status_consolidado,
  notes = CASE 
    WHEN t.notes IS NULL OR t.notes = '' THEN td.notas_consolidadas
    ELSE t.notes || ' | ' || td.notas_consolidadas
  END,
  progress_photos = COALESCE(td.fotos_consolidadas, '[]'::jsonb),
  updated_at = NOW()
FROM tareas_duplicadas_grupos td
WHERE t.id = td.task_id_principal;

-- Paso 3: Mover asignaciones de tareas duplicadas a la principal
UPDATE task_assignments ta
SET task_id = td.task_id_principal
FROM tareas_duplicadas_grupos td
WHERE ta.task_id = ANY(td.todos_los_ids[2:])  -- Todos excepto el primero
  AND ta.is_deleted = false;

-- Paso 4: Recalcular porcentajes y montos de asignaciones
-- (Esto se hace automáticamente con el trigger recalculate_payments_on_budget_change)

-- Paso 5: Actualizar referencias en payment_task_assignments
UPDATE payment_task_assignments pta
SET task_id = td.task_id_principal
FROM tareas_duplicadas_grupos td
WHERE pta.task_id = ANY(td.todos_los_ids[2:]);

-- Paso 6: Actualizar referencias en payment_distribution_history
UPDATE payment_distribution_history pdh
SET task_id = td.task_id_principal
FROM tareas_duplicadas_grupos td
WHERE pdh.task_id = ANY(td.todos_los_ids[2:]);

-- Paso 7: Soft delete de tareas duplicadas
UPDATE tasks
SET 
  is_deleted = true,
  deleted_at = NOW(),
  deleted_by = (SELECT id FROM auth.users WHERE email = 'system@migration' LIMIT 1),
  deletion_reason = 'Consolidada en tarea principal durante migración'
WHERE id IN (
  SELECT unnest(todos_los_ids[2:])
  FROM tareas_duplicadas_grupos
);

-- Paso 8: Verificación
SELECT 
  'Tareas consolidadas' as accion,
  COUNT(*) as cantidad
FROM tareas_duplicadas_grupos;

SELECT 
  'Tareas eliminadas (soft delete)' as accion,
  COUNT(*) as cantidad
FROM tasks
WHERE is_deleted = true
  AND deletion_reason LIKE '%Consolidada%';
```

---

## 🎯 Resultado Esperado

### Antes de la Consolidación

- **Total tareas:** 471
- **Tareas duplicadas:** 44 grupos
- **Tareas a consolidar:** 104 tareas duplicadas

### Después de la Consolidación

- **Total tareas:** 411 (471 - 60 eliminadas)
- **Tareas eliminadas (soft delete):** 60 tareas
- **Tareas consolidadas:** 44 grupos → 44 tareas únicas
- **Asignaciones:** 104 asignaciones preservadas y consolidadas
- **Presupuestos:** Correctamente sumados
- **Pagos:** Todas las asignaciones están marcadas como `is_paid = true`, pero NO hay registros en `payment_task_assignments` (pagos procesados directamente)

---

## ⚠️ Advertencias

1. **Backup:** Se recomienda hacer backup antes de ejecutar
2. **Transacciones:** Todo se ejecutará en una transacción
3. **Rollback:** Si algo falla, se puede revertir
4. **Validación:** Se ejecutarán verificaciones antes y después

---

## 📋 Checklist Pre-Migración

- [ ] Backup de base de datos
- [ ] Verificar que no haya procesos activos
- [ ] Contar tareas duplicadas
- [ ] Verificar pagos asociados
- [ ] Revisar asignaciones
- [ ] Confirmar con usuario

---

¿Deseas que proceda con la creación y ejecución del script de consolidación?

