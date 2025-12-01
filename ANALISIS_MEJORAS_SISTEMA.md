# Análisis y Mejoras del Sistema de Proyectos

## 1. UNIFICAR SOFT DELETE

### Situación Actual (INCONSISTENTE):
- **`projects`**: Usa `deleted_at` (timestamp) → `NULL` = activo, `timestamp` = eliminado
- **`floors`**: Usa `is_active` (boolean) → `true` = activo, `false` = eliminado
- **`apartments`**: Usa `is_active` (boolean) → `true` = activo, `false` = eliminado
- **`towers`**: Usa `is_active` (boolean) → `true` = activo, `false` = eliminado

### Problemas de la Inconsistencia:
1. **Código duplicado**: Cada hook tiene lógica diferente para filtrar elementos activos
2. **Consultas diferentes**: 
   - Proyectos: `WHERE deleted_at IS NULL`
   - Pisos/Apartamentos: `WHERE is_active = true`
3. **Mantenimiento difícil**: Si cambias la lógica en un lugar, debes recordar cambiarla en otros
4. **Riesgo de errores**: Fácil olvidar aplicar el filtro correcto en nuevas consultas

### Solución: Unificar con `is_active` (BOOLEAN)

**¿Por qué `is_active` y no `deleted_at`?**
- ✅ Más simple: un booleano es más fácil de entender y usar
- ✅ Más eficiente: las consultas con `WHERE is_active = true` son más rápidas que `WHERE deleted_at IS NULL`
- ✅ Índices más eficientes: PostgreSQL puede crear índices parciales más eficientes
- ✅ Ya está implementado en 3 de 4 tablas (menos cambios necesarios)

### Cambios Necesarios:

1. **Migración de BD**: Cambiar `projects.deleted_at` → `projects.is_active`
2. **Actualizar hooks**: Cambiar todas las consultas de `deleted_at IS NULL` a `is_active = true`
3. **Actualizar funciones**: Cambiar `deleteProject` y `restoreProject` para usar `is_active`

### Beneficios:
- ✅ Código más consistente y fácil de mantener
- ✅ Consultas más rápidas
- ✅ Menos errores al agregar nuevas funcionalidades
- ✅ Mismo patrón en todo el sistema

---

## 2. OPTIMIZAR CONSULTAS DE ESTADÍSTICAS

### Situación Actual (INEficiente):

En `useTasks.ts`, la función `fetchTaskStats` hace esto:

```typescript
// 1. Primera consulta: Obtener TODAS las tareas
const { data } = await supabase
  .from('apartment_tasks')
  .select('status, is_delayed')

// 2. Si hay filtro de proyecto, hacer SEGUNDA consulta
if (projectId) {
  const { data: projectTasks } = await supabase
    .from('apartment_tasks')
    .select('status, is_delayed, apartments!inner(floors!inner(project_id))')
    .eq('apartments.floors.project_id', projectId)
  
  filteredData = projectTasks || []
}

// 3. Filtrar en JavaScript (en memoria)
const stats = {
  total: filteredData.length,
  pending: filteredData.filter(t => t.status === 'pending').length,
  // ... más filtros
}
```

### Problemas:
1. **Dos consultas cuando hay filtro**: Una para obtener todo, otra para filtrar
2. **Trae datos innecesarios**: Trae todas las tareas a la aplicación solo para contar
3. **Procesamiento en JavaScript**: El filtrado y conteo se hace en el cliente, no en la BD
4. **Lento con muchos datos**: Si hay 10,000 tareas, trae todas solo para contar

### Solución: Función RPC en PostgreSQL

Crear una función en PostgreSQL que haga TODO en una sola consulta:

```sql
CREATE OR REPLACE FUNCTION get_task_stats(project_id_param INTEGER DEFAULT NULL)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total', COUNT(*),
      'pending', COUNT(*) FILTER (WHERE status = 'pending'),
      'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
      'completed', COUNT(*) FILTER (WHERE status = 'completed'),
      'blocked', COUNT(*) FILTER (WHERE status = 'blocked'),
      'delayed', COUNT(*) FILTER (WHERE is_delayed = true)
    )
    FROM apartment_tasks at
    INNER JOIN apartments a ON a.id = at.apartment_id
    INNER JOIN floors f ON f.id = a.floor_id
    WHERE (project_id_param IS NULL OR f.project_id = project_id_param)
      AND a.is_active = true
      AND f.is_active = true
  );
END;
$$ LANGUAGE plpgsql;
```

### Beneficios:
- ✅ **Una sola consulta**: Todo se hace en la base de datos
- ✅ **Más rápido**: PostgreSQL es mucho más eficiente contando que JavaScript
- ✅ **Menos datos transferidos**: Solo se envía el resultado (un objeto JSON pequeño)
- ✅ **Escalable**: Funciona igual de rápido con 100 o 100,000 tareas

### Uso en el código:
```typescript
const fetchTaskStats = async (projectId?: number) => {
  const { data, error } = await supabase.rpc('get_task_stats', {
    project_id_param: projectId || null
  })
  
  if (error) throw error
  setTaskStats(data)
}
```

---

## 3. VALIDACIONES A NIVEL DE BASE DE DATOS

### ¿Por qué validar en la BD y no solo en el frontend?

**Problema actual**: Las validaciones solo están en el frontend (React/TypeScript)
- ❌ Si alguien accede directamente a la BD, puede insertar datos inválidos
- ❌ Si hay un bug en el frontend, los datos inválidos se guardan
- ❌ Si se crea una API en el futuro, hay que reimplementar las validaciones

**Solución**: Validar en la BASE DE DATOS (la única fuente de verdad)

### Validaciones Necesarias:

#### A. Unicidad de `floor_number` por torre
**Problema**: Actualmente no hay restricción que evite tener dos pisos con el mismo número en la misma torre.

**Solución**: Constraint UNIQUE compuesto
```sql
ALTER TABLE floors
ADD CONSTRAINT floors_tower_floor_unique 
UNIQUE (tower_id, floor_number) 
WHERE is_active = true;
```

**Beneficio**: PostgreSQL rechazará automáticamente intentos de crear pisos duplicados.

#### B. Validar estados consistentes
**Problema**: Un apartamento puede estar "completed" sin tener tareas completadas.

**Solución**: Trigger que valide antes de actualizar
```sql
CREATE OR REPLACE FUNCTION validate_apartment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se marca como completed, verificar que todas las tareas estén completadas
  IF NEW.status = 'completed' THEN
    IF EXISTS (
      SELECT 1 FROM apartment_tasks 
      WHERE apartment_id = NEW.id 
      AND status != 'completed'
    ) THEN
      RAISE EXCEPTION 'No se puede marcar como completado: hay tareas pendientes';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_apartment_status
BEFORE UPDATE ON apartments
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION validate_apartment_status();
```

**Beneficio**: Imposible tener datos inconsistentes, incluso si hay un bug en el código.

#### C. Validar rangos de valores
**Problema**: Campos numéricos pueden tener valores negativos o muy grandes.

**Solución**: CHECK constraints
```sql
-- Validar que progress esté entre 0 y 100
ALTER TABLE apartment_tasks
ADD CONSTRAINT check_progress_range 
CHECK (progress >= 0 AND progress <= 100);

-- Validar que floor_number no sea 0
ALTER TABLE floors
ADD CONSTRAINT check_floor_number_not_zero
CHECK (floor_number != 0);
```

**Beneficio**: La BD rechaza automáticamente valores inválidos.

#### D. Validar relaciones
**Problema**: Un apartamento puede estar asociado a un piso eliminado.

**Solución**: Foreign key con validación de is_active
```sql
-- Ya existe la FK, pero podemos agregar un trigger que valide is_active
CREATE OR REPLACE FUNCTION validate_apartment_floor_active()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM floors 
    WHERE id = NEW.floor_id 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'No se puede crear apartamento en un piso eliminado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_floor_active
BEFORE INSERT OR UPDATE ON apartments
FOR EACH ROW
EXECUTE FUNCTION validate_apartment_floor_active();
```

**Beneficio**: Garantiza integridad referencial incluso con soft delete.

### Beneficios Generales de Validaciones en BD:
- ✅ **Seguridad**: Imposible insertar datos inválidos, incluso con acceso directo a la BD
- ✅ **Consistencia**: Los datos siempre cumplen las reglas de negocio
- ✅ **Mantenibilidad**: Las reglas están en un solo lugar (la BD)
- ✅ **Performance**: Las validaciones se hacen en la BD, que es más rápida
- ✅ **Documentación**: Los constraints documentan las reglas de negocio

---

## RESUMEN DE MEJORAS

| Mejora | Problema Actual | Solución | Beneficio |
|--------|----------------|----------|-----------|
| **Unificar Soft Delete** | 2 patrones diferentes (`deleted_at` vs `is_active`) | Usar `is_active` en todas las tablas | Código consistente, más fácil de mantener |
| **Optimizar Estadísticas** | 2 consultas + filtrado en JavaScript | Función RPC en PostgreSQL | Más rápido, escalable, menos transferencia de datos |
| **Validaciones en BD** | Solo validaciones en frontend | Constraints y triggers en PostgreSQL | Seguridad, consistencia, imposible tener datos inválidos |

