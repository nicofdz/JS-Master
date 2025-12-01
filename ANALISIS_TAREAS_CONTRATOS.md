# 📊 Análisis Profundo: Vinculación de Tareas con Contratos

## 🎯 Objetivo

Implementar un sistema donde **solo trabajadores con contrato activo en un proyecto** puedan ser asignados a tareas de ese proyecto, creando trazabilidad completa entre:
- ✅ Proyectos
- ✅ Trabajadores
- ✅ Contratos
- ✅ Tareas
- ✅ Pagos

---

## 📋 Estado Actual de la Base de Datos

### ✅ Tablas Existentes y en Uso

#### 1. **`apartment_tasks`** (Tareas actuales)
```sql
CREATE TABLE public.apartment_tasks (
  id SERIAL PRIMARY KEY,
  apartment_id INTEGER REFERENCES apartments(id),
  task_name VARCHAR(255) NOT NULL,
  task_description TEXT,
  task_category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  estimated_hours INTEGER DEFAULT 8,
  actual_hours INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_to INTEGER REFERENCES workers(id),  -- ⚠️ Solo 1 trabajador
  worker_payment DECIMAL(10,2),
  is_paid BOOLEAN DEFAULT false,
  progress INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Relaciones actuales:**
- `apartment_id` → `apartments` → `floors` → `projects` ✅
- `assigned_to` → `workers` ✅
- ❌ **NO tiene vínculo directo con contratos**

#### 2. **`contract_history`** (Contratos de trabajadores)
```sql
CREATE TABLE public.contract_history (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER REFERENCES workers(id),
  project_id INTEGER REFERENCES projects(id),
  fecha_inicio DATE NOT NULL,
  fecha_termino DATE,
  contract_type VARCHAR(20), -- 'por_dia' o 'a_trato'
  daily_rate DECIMAL(10,2),
  status VARCHAR(20), -- 'activo', 'finalizado', 'cancelado'
  contract_number VARCHAR(50),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  is_renovacion BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Características:**
- ✅ Vincula `worker_id` con `project_id`
- ✅ Tiene estado (`activo`, `finalizado`, `cancelado`)
- ✅ Un trabajador puede tener **varios contratos** en diferentes proyectos
- ✅ Un trabajador puede tener **solo 1 contrato activo** por proyecto (validado por la app)
- ✅ Los contratos expirados se cambian automáticamente a `finalizado`

#### 3. **`workers`** (Trabajadores)
```sql
CREATE TABLE public.workers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  rut VARCHAR(12) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  cargo VARCHAR(100),
  contract_type VARCHAR(20) DEFAULT 'por_dia', -- Tipo general
  daily_rate DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

#### 4. **`payment_tasks`** (Relación Pagos-Tareas)
```sql
CREATE TABLE public.payment_tasks (
  payment_id INTEGER REFERENCES worker_payment_history(id),
  task_id INTEGER REFERENCES apartment_tasks(id),
  PRIMARY KEY (payment_id, task_id)
)
```

#### 5. **`worker_payment_history`** (Historial de pagos)
```sql
CREATE TABLE public.worker_payment_history (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER REFERENCES workers(id),
  payment_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  tasks_count INTEGER,
  payment_status VARCHAR(20) DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

---

## 🔗 Relaciones Actuales (Flujo de Datos)

```
projects
  ↓
floors
  ↓
apartments
  ↓
apartment_tasks ← assigned_to → workers
  ↓
payment_tasks
  ↓
worker_payment_history
```

**❌ PROBLEMA:** No hay vínculo entre `apartment_tasks` y `contract_history`

---

## 💡 Solución Propuesta

### Opción 1: **Agregar campo `contract_id` a `apartment_tasks`** ⭐ (RECOMENDADA)

#### Ventajas:
- ✅ **Simple**: Solo un campo nuevo
- ✅ **Trazabilidad completa**: Cada tarea apunta a un contrato específico
- ✅ **Reportes fáciles**: "¿Qué tareas hizo este trabajador en este contrato?"
- ✅ **Auditoría**: Se puede ver el tipo de contrato y tarifa al momento de la asignación
- ✅ **Compatibilidad**: No rompe código existente

#### Desventajas:
- ⚠️ Solo funciona con 1 trabajador por tarea (limitación actual)

#### Implementación:

```sql
-- 1. Agregar campo contract_id
ALTER TABLE public.apartment_tasks 
ADD COLUMN contract_id INTEGER REFERENCES public.contract_history(id) ON DELETE SET NULL;

-- 2. Crear índice para performance
CREATE INDEX idx_apartment_tasks_contract_id 
ON public.apartment_tasks(contract_id) 
WHERE contract_id IS NOT NULL;

-- 3. Crear índice compuesto para búsquedas frecuentes
CREATE INDEX idx_apartment_tasks_worker_contract 
ON public.apartment_tasks(assigned_to, contract_id) 
WHERE assigned_to IS NOT NULL;

-- 4. Comentario para documentación
COMMENT ON COLUMN public.apartment_tasks.contract_id IS 
'ID del contrato bajo el cual se asignó esta tarea. Permite rastrear qué tareas se hicieron con cada contrato.';
```

#### Flujo de Asignación Nuevo:

```typescript
// 1. Usuario selecciona proyecto y apartamento
const project_id = apartment.floor.project_id

// 2. Sistema obtiene trabajadores CON CONTRATO ACTIVO en ese proyecto
const { data: availableWorkers } = await supabase
  .from('contract_history')
  .select(`
    id as contract_id,
    worker_id,
    workers!inner(id, full_name, rut, cargo)
  `)
  .eq('project_id', project_id)
  .eq('status', 'activo')
  .eq('is_active', true)

// 3. Usuario asigna trabajador
// Se guarda tanto el worker_id como el contract_id
await supabase
  .from('apartment_tasks')
  .insert({
    apartment_id: apartment_id,
    task_name: 'Instalación eléctrica',
    assigned_to: worker_id,      // ← ID del trabajador
    contract_id: contract_id,     // ← ID del contrato activo
    worker_payment: 150000
  })
```

#### Queries útiles:

```sql
-- Tareas por contrato
SELECT 
  at.id,
  at.task_name,
  at.status,
  at.worker_payment,
  w.full_name as worker_name,
  p.name as project_name,
  ch.contract_number,
  ch.contract_type
FROM apartment_tasks at
JOIN workers w ON at.assigned_to = w.id
JOIN contract_history ch ON at.contract_id = ch.id
JOIN apartments a ON at.apartment_id = a.id
JOIN floors f ON a.floor_id = f.id
JOIN projects p ON f.project_id = p.id
WHERE ch.id = 123;

-- Resumen de pagos por contrato
SELECT 
  ch.id as contract_id,
  ch.contract_number,
  w.full_name,
  p.name as project_name,
  ch.fecha_inicio,
  ch.fecha_termino,
  COUNT(at.id) as total_tasks,
  COUNT(CASE WHEN at.status = 'completed' THEN 1 END) as completed_tasks,
  SUM(at.worker_payment) as total_assigned_amount,
  SUM(CASE WHEN at.is_paid THEN at.worker_payment ELSE 0 END) as total_paid
FROM contract_history ch
LEFT JOIN apartment_tasks at ON ch.id = at.contract_id
JOIN workers w ON ch.worker_id = w.id
JOIN projects p ON ch.project_id = p.id
WHERE ch.worker_id = 15
GROUP BY ch.id, ch.contract_number, w.full_name, p.name, ch.fecha_inicio, ch.fecha_termino
ORDER BY ch.fecha_inicio DESC;
```

---

### Opción 2: **Migrar a sistema V2 con `task_assignments`** (Futuro)

Si en el futuro quieres **múltiples trabajadores por tarea**, necesitarías:

1. Crear tabla `tasks` (sin `assigned_to`, solo `total_budget`)
2. Crear tabla `task_assignments` (muchos a muchos)
3. Agregar `contract_id` en `task_assignments` (no en `tasks`)

```sql
CREATE TABLE public.task_assignments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id),
  worker_id INTEGER REFERENCES workers(id),
  contract_id INTEGER REFERENCES contract_history(id), -- ← Aquí
  role VARCHAR(50) DEFAULT 'worker',
  assignment_status VARCHAR(50) DEFAULT 'assigned',
  payment_share_percentage DECIMAL(5,2),
  worker_payment DECIMAL(10,2),
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Ventajas:**
- ✅ Múltiples trabajadores por tarea
- ✅ Cada asignación tiene su propio contrato
- ✅ Distribución flexible de pagos

**Desventajas:**
- ⚠️ Requiere migración completa
- ⚠️ Mayor complejidad
- ⚠️ Reescribir todo el código de tareas

---

## 🚀 Implementación Recomendada (Opción 1)

### Fase 1: Modificar Base de Datos

**Archivo:** `database/add-contract-id-to-tasks.sql`

```sql
-- =====================================================
-- AGREGAR VÍNCULO DE CONTRATOS A TAREAS
-- =====================================================

-- 1. Agregar campo contract_id
ALTER TABLE public.apartment_tasks 
ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES public.contract_history(id) ON DELETE SET NULL;

-- 2. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_apartment_tasks_contract_id 
ON public.apartment_tasks(contract_id) 
WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_apartment_tasks_worker_contract 
ON public.apartment_tasks(assigned_to, contract_id) 
WHERE assigned_to IS NOT NULL AND contract_id IS NOT NULL;

-- 3. Comentario para documentación
COMMENT ON COLUMN public.apartment_tasks.contract_id IS 
'ID del contrato bajo el cual se asignó esta tarea. Permite rastrear qué tareas se hicieron con cada contrato específico.';

-- 4. Crear vista enriquecida de tareas con información de contrato
CREATE OR REPLACE VIEW public.tasks_with_contract_info AS
SELECT 
  at.id as task_id,
  at.task_name,
  at.task_description,
  at.status,
  at.priority,
  at.worker_payment,
  at.is_paid,
  at.start_date,
  at.end_date,
  at.completed_at,
  
  -- Información del apartamento y proyecto
  a.apartment_number,
  f.floor_number,
  p.id as project_id,
  p.name as project_name,
  
  -- Información del trabajador
  w.id as worker_id,
  w.full_name as worker_name,
  w.rut as worker_rut,
  w.cargo as worker_cargo,
  
  -- Información del contrato
  ch.id as contract_id,
  ch.contract_number,
  ch.contract_type,
  ch.daily_rate as contract_daily_rate,
  ch.fecha_inicio as contract_start,
  ch.fecha_termino as contract_end,
  ch.status as contract_status,
  
  at.created_at,
  at.updated_at
FROM apartment_tasks at
JOIN apartments a ON at.apartment_id = a.id
JOIN floors f ON a.floor_id = f.id
JOIN projects p ON f.project_id = p.id
LEFT JOIN workers w ON at.assigned_to = w.id
LEFT JOIN contract_history ch ON at.contract_id = ch.id
WHERE at.is_deleted = false OR at.is_deleted IS NULL
ORDER BY at.created_at DESC;

-- 5. Crear función para obtener trabajadores disponibles para un proyecto
-- (Solo trabajadores con contrato activo)
CREATE OR REPLACE FUNCTION get_available_workers_for_project(p_project_id INTEGER)
RETURNS TABLE (
  worker_id INTEGER,
  worker_name TEXT,
  worker_rut TEXT,
  worker_cargo TEXT,
  contract_id INTEGER,
  contract_number TEXT,
  contract_type TEXT,
  daily_rate DECIMAL(10,2),
  contract_start DATE,
  contract_end DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id as worker_id,
    w.full_name as worker_name,
    w.rut as worker_rut,
    w.cargo as worker_cargo,
    ch.id as contract_id,
    ch.contract_number,
    ch.contract_type,
    ch.daily_rate,
    ch.fecha_inicio as contract_start,
    ch.fecha_termino as contract_end
  FROM workers w
  JOIN contract_history ch ON w.id = ch.worker_id
  WHERE ch.project_id = p_project_id
    AND ch.status = 'activo'
    AND ch.is_active = true
    AND w.is_active = true
    AND (w.is_deleted = false OR w.is_deleted IS NULL)
  ORDER BY w.full_name;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear función para validar asignación de tarea
-- Valida que el trabajador tenga contrato activo en el proyecto de la tarea
CREATE OR REPLACE FUNCTION validate_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id INTEGER;
  v_contract_active BOOLEAN;
BEGIN
  -- Obtener el project_id de la tarea
  SELECT p.id INTO v_project_id
  FROM apartments a
  JOIN floors f ON a.floor_id = f.id
  JOIN projects p ON f.project_id = p.id
  WHERE a.id = NEW.apartment_id;
  
  -- Si se asigna un trabajador, validar que tenga contrato activo
  IF NEW.assigned_to IS NOT NULL AND NEW.contract_id IS NOT NULL THEN
    -- Verificar que el contrato existe, es del trabajador, es del proyecto correcto y está activo
    SELECT EXISTS(
      SELECT 1 FROM contract_history
      WHERE id = NEW.contract_id
        AND worker_id = NEW.assigned_to
        AND project_id = v_project_id
        AND status = 'activo'
        AND is_active = true
    ) INTO v_contract_active;
    
    IF NOT v_contract_active THEN
      RAISE EXCEPTION 'El trabajador no tiene un contrato activo en este proyecto o el contract_id no es válido';
    END IF;
  END IF;
  
  -- Si se asigna trabajador pero NO se especifica contrato, buscar automáticamente
  IF NEW.assigned_to IS NOT NULL AND NEW.contract_id IS NULL THEN
    -- Buscar el contrato activo del trabajador en este proyecto
    SELECT id INTO NEW.contract_id
    FROM contract_history
    WHERE worker_id = NEW.assigned_to
      AND project_id = v_project_id
      AND status = 'activo'
      AND is_active = true
    LIMIT 1;
    
    -- Si no hay contrato activo, rechazar la asignación
    IF NEW.contract_id IS NULL THEN
      RAISE EXCEPTION 'El trabajador % no tiene un contrato activo en el proyecto %', NEW.assigned_to, v_project_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para validar asignaciones
DROP TRIGGER IF EXISTS validate_task_assignment_trigger ON public.apartment_tasks;
CREATE TRIGGER validate_task_assignment_trigger
  BEFORE INSERT OR UPDATE OF assigned_to, contract_id ON public.apartment_tasks
  FOR EACH ROW
  WHEN (NEW.assigned_to IS NOT NULL)
  EXECUTE FUNCTION validate_task_assignment();

-- 8. Actualizar tareas existentes con contract_id
-- (Solo para tareas que tienen assigned_to y el trabajador tiene un contrato activo)
DO $$
DECLARE
  task_record RECORD;
  v_project_id INTEGER;
  v_contract_id INTEGER;
BEGIN
  FOR task_record IN 
    SELECT at.id, at.assigned_to, at.apartment_id
    FROM apartment_tasks at
    WHERE at.assigned_to IS NOT NULL
      AND at.contract_id IS NULL
      AND (at.is_deleted = false OR at.is_deleted IS NULL)
  LOOP
    -- Obtener project_id de la tarea
    SELECT p.id INTO v_project_id
    FROM apartments a
    JOIN floors f ON a.floor_id = f.id
    JOIN projects p ON f.project_id = p.id
    WHERE a.id = task_record.apartment_id;
    
    -- Buscar contrato activo del trabajador en ese proyecto
    SELECT id INTO v_contract_id
    FROM contract_history
    WHERE worker_id = task_record.assigned_to
      AND project_id = v_project_id
      AND status = 'activo'
      AND is_active = true
    LIMIT 1;
    
    -- Si encontró contrato, actualizar la tarea
    IF v_contract_id IS NOT NULL THEN
      UPDATE apartment_tasks
      SET contract_id = v_contract_id
      WHERE id = task_record.id;
      
      RAISE NOTICE 'Tarea % actualizada con contract_id %', task_record.id, v_contract_id;
    ELSE
      RAISE NOTICE 'Tarea % no tiene contrato activo disponible (trabajador % en proyecto %)', 
        task_record.id, task_record.assigned_to, v_project_id;
    END IF;
  END LOOP;
END $$;

-- 9. Verificar resultados
SELECT 
  COUNT(*) as total_tasks,
  COUNT(contract_id) as tasks_with_contract,
  COUNT(*) - COUNT(contract_id) as tasks_without_contract
FROM apartment_tasks
WHERE (is_deleted = false OR is_deleted IS NULL)
  AND assigned_to IS NOT NULL;
```

---

### Fase 2: Modificar Frontend (Hook `useTasks`)

**Archivo:** `src/hooks/useTasks.ts`

Agregar función para obtener trabajadores con contratos activos:

```typescript
// Nuevo: Obtener trabajadores disponibles para un proyecto (con contrato activo)
const getAvailableWorkersForProject = async (projectId: number) => {
  try {
    const { data, error } = await supabase.rpc(
      'get_available_workers_for_project',
      { p_project_id: projectId }
    )

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error('Error fetching available workers:', err)
    return []
  }
}

// Modificar createTask para incluir contract_id
const createTask = async (taskData: any) => {
  try {
    const { data, error } = await supabase
      .from('apartment_tasks')
      .insert({
        ...taskData,
        contract_id: taskData.contract_id || null // ← Nuevo campo
      })
      .select()
      .single()

    if (error) throw error
    
    await fetchTasks()
    return data
  } catch (err: any) {
    console.error('Error creating task:', err)
    throw err
  }
}

// Agregar al return del hook
return {
  // ... otros métodos
  getAvailableWorkersForProject // ← Nuevo
}
```

---

### Fase 3: Modificar Componente `TaskForm`

**Archivo:** `src/components/tasks/TaskForm.tsx`

```typescript
// Estado para trabajadores disponibles
const [availableWorkers, setAvailableWorkers] = useState<any[]>([])
const [selectedWorkerContract, setSelectedWorkerContract] = useState<any>(null)

// Cuando se selecciona un proyecto, cargar trabajadores con contrato
useEffect(() => {
  if (selectedProjectId) {
    loadAvailableWorkers(selectedProjectId)
  }
}, [selectedProjectId])

const loadAvailableWorkers = async (projectId: number) => {
  const workers = await getAvailableWorkersForProject(projectId)
  setAvailableWorkers(workers)
}

// Cuando se selecciona un trabajador, guardar su contract_id
const handleWorkerChange = (workerId: string) => {
  const workerData = availableWorkers.find(w => w.worker_id.toString() === workerId)
  setSelectedWorkerContract(workerData)
  setValue('assigned_to', workerId)
  setValue('contract_id', workerData?.contract_id || null) // ← Nuevo
}

// En el JSX del select de trabajadores
<select onChange={(e) => handleWorkerChange(e.target.value)}>
  <option value="">Seleccionar trabajador</option>
  {availableWorkers.map(worker => (
    <option key={worker.worker_id} value={worker.worker_id}>
      {worker.worker_name} - {worker.contract_number}
      {worker.contract_type === 'por_dia' 
        ? ` (Día: $${worker.daily_rate})`
        : ' (A trato)'}
    </option>
  ))}
</select>

// Mostrar info del contrato seleccionado
{selectedWorkerContract && (
  <div className="bg-blue-50 p-3 rounded-md text-sm">
    <p><strong>Contrato:</strong> {selectedWorkerContract.contract_number}</p>
    <p><strong>Tipo:</strong> {selectedWorkerContract.contract_type}</p>
    <p><strong>Vigencia:</strong> {selectedWorkerContract.contract_start} - {selectedWorkerContract.contract_end || 'Indefinido'}</p>
  </div>
)}
```

---

## 📊 Beneficios de esta Implementación

### ✅ Validación Automática
- ❌ **No se pueden asignar** trabajadores sin contrato en el proyecto
- ✅ El trigger valida antes de insertar/actualizar
- ✅ Si no se especifica `contract_id`, lo busca automáticamente

### ✅ Trazabilidad Completa
```sql
-- ¿Qué tareas hizo Juan en su contrato de marzo-abril?
SELECT * FROM tasks_with_contract_info
WHERE worker_name = 'Juan Pérez'
  AND contract_id = 123
ORDER BY start_date;

-- ¿Cuánto pagamos en total por el contrato #456?
SELECT 
  contract_number,
  COUNT(*) as total_tasks,
  SUM(worker_payment) as total_paid
FROM tasks_with_contract_info
WHERE contract_id = 456
GROUP BY contract_number;
```

### ✅ Reportes por Contrato
- Total de tareas por contrato
- Pagos por contrato
- Eficiencia por trabajador-contrato
- Comparación entre contratos

### ✅ Compatibilidad
- ✅ Código existente sigue funcionando (campo es NULL si no se especifica)
- ✅ No rompe queries actuales
- ✅ Mejora gradual (puedes actualizar tareas antiguas cuando quieras)

---

## 🔍 Casos de Uso

### Caso 1: Asignar tarea nueva
1. Usuario selecciona proyecto
2. Sistema muestra **solo trabajadores con contrato activo** en ese proyecto
3. Usuario selecciona trabajador (con su contract_id asociado)
4. Sistema guarda tarea con `assigned_to` y `contract_id`
5. ✅ Validación automática pasa

### Caso 2: Cambiar trabajador asignado
1. Usuario edita tarea
2. Selecciona nuevo trabajador
3. Sistema busca automáticamente su contrato activo en el proyecto
4. Si **no tiene contrato**, muestra error y no permite guardar
5. Si **tiene contrato**, actualiza con el nuevo `contract_id`

### Caso 3: Contrato expira
1. Sistema automático marca contrato como `finalizado`
2. Tareas **ya asignadas** mantienen el `contract_id` histórico
3. **No se pueden asignar nuevas tareas** con ese contrato
4. Reportes siguen mostrando qué se hizo bajo ese contrato

### Caso 4: Trabajador con múltiples contratos
1. Trabajador tiene contrato en Proyecto A (marzo-abril)
2. Luego tiene contrato en Proyecto B (mayo-junio)
3. Cada tarea apunta a su contrato específico
4. ✅ Puedes ver: "En Proyecto A hizo 15 tareas, en Proyecto B hizo 20"

---

## 📈 Próximos Pasos Recomendados

### Corto Plazo (Esta semana)
1. ✅ Ejecutar SQL para agregar `contract_id` a `apartment_tasks`
2. ✅ Probar trigger de validación
3. ✅ Actualizar tareas existentes con contract_id
4. ✅ Modificar `useTasks` hook
5. ✅ Modificar `TaskForm` componente
6. ✅ Probar flujo completo

### Mediano Plazo (Próximas semanas)
1. Crear página de "Reportes por Contrato"
2. Dashboard con métricas por contrato
3. Exportación de datos por contrato
4. Alertas cuando un trabajador no tiene contrato

### Largo Plazo (Futuro)
1. Migrar a sistema V2 con múltiples trabajadores (`task_assignments`)
2. Agregar campo `contract_id` en `task_assignments`
3. Sistema de aprobación de pagos por contrato
4. Integración con sistema de finanzas

---

## ⚠️ Consideraciones Importantes

### 1. **Tareas sin contrato (legacy)**
- Tareas antiguas pueden no tener `contract_id`
- El campo es NULL si no se puede encontrar contrato
- Puedes decidir si actualizar masivamente o dejar como está

### 2. **Contratos finalizados**
- Tareas mantienen el `contract_id` histórico
- No afecta reportes ni pagos ya procesados
- Solo afecta **nuevas asignaciones**

### 3. **Trabajadores sin contrato**
- No aparecen en el dropdown de asignación
- Deben tener un contrato activo primero
- Previene errores de asignación

### 4. **Performance**
- Los índices aseguran queries rápidos
- La vista `tasks_with_contract_info` simplifica consultas
- El trigger añade validación mínima (< 10ms)

---

## ✅ Resumen

### Lo que tendrás después de implementar:

✅ **Validación automática**: Solo trabajadores con contrato pueden ser asignados
✅ **Trazabilidad**: Cada tarea está vinculada a un contrato específico
✅ **Reportes**: Saber qué hizo cada trabajador en cada contrato
✅ **Auditoría**: Histórico completo de asignaciones por contrato
✅ **Flexibilidad**: Sistema compatible con código existente
✅ **Escalabilidad**: Base para futuras mejoras (V2 con múltiples trabajadores)

---

**Próxima acción sugerida:** ¿Quieres que cree el archivo SQL y los componentes modificados para implementar esta solución?

