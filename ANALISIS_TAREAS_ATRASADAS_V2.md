# 📊 Análisis: Manejo de Tareas Atrasadas en Sistema V2

## 🎯 Objetivo
Analizar cómo manejar tareas atrasadas en el sistema de tareas V2, identificar campos no utilizados y proponer implementación.

---

## 📋 Campos Disponibles en la Tabla `tasks`

### **Campos Relacionados con Tiempo y Retrasos:**

| Campo | Tipo | Default | Estado Actual | Uso en V2 |
|-------|------|---------|---------------|-----------|
| `start_date` | DATE | NULL | ✅ Existe | ✅ Se usa (creación/edición) |
| `end_date` | DATE | NULL | ✅ Existe | ✅ Se usa (creación/edición) |
| `estimated_hours` | INTEGER | NULL | ✅ Existe | ❓ No verificado |
| `actual_start_time` | TIMESTAMPTZ | NULL | ✅ Existe | ❌ **NO SE USA** |
| `actual_end_time` | TIMESTAMPTZ | NULL | ✅ Existe | ❌ **NO SE USA** |
| `completed_at` | TIMESTAMPTZ | NULL | ✅ Existe | ✅ Se usa (cuando se completa) |
| `is_delayed` | BOOLEAN | false | ✅ Existe | ❌ **NO SE USA en V2** |
| `delay_reason` | TEXT | NULL | ✅ Existe | ❌ **NO SE USA en V2** |

---

## 🔍 Análisis del Sistema Antiguo

### **Sistema Antiguo (`apartment_tasks`):**
- ✅ Tenía triggers automáticos para calcular `is_delayed`
- ✅ Lógica: Si `start_date` pasó y `status` no es 'in-progress' o 'completed' → retrasada
- ✅ Excluía tareas bloqueadas del cálculo
- ✅ Mostraba indicadores visuales de retraso
- ✅ Tenía filtro "Atrasadas" en la UI

### **Sistema Nuevo (`tasks` V2):**
- ❌ No tiene triggers automáticos para calcular `is_delayed`
- ❌ No muestra indicadores de retraso en la UI
- ❌ No tiene filtro "Atrasadas" funcional
- ❌ Los campos `is_delayed` y `delay_reason` existen pero no se usan

---

## 💡 Propuesta de Implementación

### **1. Cálculo Automático de Retrasos**

#### **A. Crear Función SQL para Calcular Retrasos:**
```sql
CREATE OR REPLACE FUNCTION calculate_task_delay(
    p_start_date DATE,
    p_end_date DATE,
    p_status VARCHAR,
    p_completed_at TIMESTAMPTZ
)
RETURNS TABLE (is_delayed BOOLEAN, delay_reason TEXT, days_delayed INTEGER) AS $$
DECLARE
    v_is_delayed BOOLEAN := FALSE;
    v_delay_reason TEXT := NULL;
    v_days_delayed INTEGER := 0;
BEGIN
    -- Excluir tareas completadas, bloqueadas, canceladas y en pausa
    IF p_status IN ('completed', 'blocked', 'cancelled', 'on_hold') THEN
        RETURN QUERY SELECT FALSE, NULL, 0;
        RETURN;
    END IF;
    
    -- Calcular retraso por fecha de inicio
    IF p_start_date IS NOT NULL THEN
        IF CURRENT_DATE > p_start_date AND p_status NOT IN ('in_progress', 'completed') THEN
            v_is_delayed := TRUE;
            v_days_delayed := CURRENT_DATE - p_start_date;
            v_delay_reason := 'No iniciada después de la fecha programada (' || p_start_date || ').';
        END IF;
    END IF;
    
    -- Calcular retraso por fecha de fin (si está en progreso o completada después de end_date)
    IF p_end_date IS NOT NULL THEN
        IF CURRENT_DATE > p_end_date THEN
            IF p_status = 'in_progress' THEN
                v_is_delayed := TRUE;
                v_days_delayed := CURRENT_DATE - p_end_date;
                v_delay_reason := COALESCE(v_delay_reason, '') || 
                    ' En progreso después de la fecha de fin (' || p_end_date || ').';
            ELSIF p_completed_at IS NOT NULL AND p_completed_at::DATE > p_end_date THEN
                v_is_delayed := TRUE;
                v_days_delayed := p_completed_at::DATE - p_end_date;
                v_delay_reason := 'Completada después de la fecha de fin (' || p_end_date || ').';
            END IF;
        END IF;
    END IF;
    
    RETURN QUERY SELECT v_is_delayed, v_delay_reason, v_days_delayed;
END;
$$ LANGUAGE plpgsql;
```

#### **B. Crear Trigger para Actualizar Automáticamente:**
```sql
CREATE OR REPLACE FUNCTION update_task_delay()
RETURNS TRIGGER AS $$
DECLARE
    v_delay_info RECORD;
BEGIN
    SELECT * INTO v_delay_info
    FROM calculate_task_delay(
        NEW.start_date,
        NEW.end_date,
        NEW.status,
        NEW.completed_at
    );
    
    NEW.is_delayed := v_delay_info.is_delayed;
    NEW.delay_reason := v_delay_info.delay_reason;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_delay_trigger
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_task_delay();
```

### **2. Agregar Campo `days_delayed` (Opcional)**

Si queremos mostrar "X días de retraso", podríamos:
- **Opción A:** Calcular en el frontend (más simple)
- **Opción B:** Agregar campo `days_delayed` a la tabla (más eficiente)

**Recomendación:** Opción A (calcular en frontend) para no modificar la estructura.

### **3. Actualizar Interfaz TypeScript:**

```typescript
export interface TaskV2 {
  // ... campos existentes ...
  is_delayed?: boolean
  delay_reason?: string
  days_delayed?: number  // Nuevo: calcular en frontend
}
```

### **4. Actualizar UI para Mostrar Retrasos:**

#### **A. En `TaskRowV2.tsx`:**
- Badge de "Atrasada" con color rojo/naranja
- Mostrar días de retraso: "3 días de retraso"
- Tooltip con `delay_reason`

#### **B. En Filtros:**
- Agregar filtro "Atrasadas" funcional
- Mostrar contador de tareas atrasadas

#### **C. En Dashboard:**
- Mostrar estadísticas de tareas atrasadas
- Alertas visuales para proyectos con muchas tareas atrasadas

---

## 📊 Campos No Utilizados que Podríamos Usar

### **1. `actual_start_time` y `actual_end_time`:**
- **Propósito:** Registrar cuándo realmente se inició/completó la tarea
- **Uso propuesto:** 
  - `actual_start_time`: Se establece cuando `status` cambia a `in_progress`
  - `actual_end_time`: Se establece cuando `status` cambia a `completed`
- **Beneficio:** Permite calcular tiempo real vs estimado

### **2. `estimated_hours`:**
- **Propósito:** Horas estimadas para completar la tarea
- **Uso propuesto:** 
  - Mostrar en la UI
  - Comparar con horas reales (si agregamos `actual_hours`)
  - Calcular retrasos basados en horas estimadas

---

## 🎨 Propuesta de UI

### **1. Badge de Retraso:**
```tsx
{task.is_delayed && (
  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
    <AlertCircle className="w-3 h-3" />
    {task.days_delayed || 0} día{task.days_delayed !== 1 ? 's' : ''} de retraso
  </span>
)}
```

### **2. Indicador en Lista:**
- Borde rojo en la tarjeta de tarea
- Ícono de alerta
- Texto "Atrasada" en el header

### **3. Filtro "Atrasadas":**
- Agregar a los filtros existentes
- Mostrar solo tareas con `is_delayed = true`

---

## ✅ Checklist de Implementación

### **Fase 1: Base de Datos**
- [ ] Crear función `calculate_task_delay()`
- [ ] Crear trigger `update_task_delay()`
- [ ] Actualizar tareas existentes con cálculo de retrasos
- [ ] Probar con datos reales

### **Fase 2: Backend/Frontend**
- [ ] Actualizar interfaz `TaskV2` con `days_delayed`
- [ ] Agregar función para calcular `days_delayed` en frontend
- [ ] Actualizar `fetchTasks` para incluir campos de retraso

### **Fase 3: UI - Indicadores**
- [ ] Agregar badge de retraso en `TaskRowV2`
- [ ] Agregar indicador visual (borde rojo, ícono)
- [ ] Mostrar tooltip con `delay_reason`

### **Fase 4: UI - Filtros**
- [ ] Agregar filtro "Atrasadas" en página de tareas
- [ ] Mostrar contador de tareas atrasadas
- [ ] Agregar a estadísticas del dashboard

### **Fase 5: Opcional - Campos Adicionales**
- [ ] Implementar `actual_start_time` cuando status → `in_progress`
- [ ] Implementar `actual_end_time` cuando status → `completed`
- [ ] Mostrar `estimated_hours` en la UI
- [ ] Comparar horas estimadas vs reales

---

## 🔄 Flujo de Cálculo de Retrasos

### **Escenario 1: Tarea No Iniciada Después de `start_date`**
```
start_date: 2024-01-15
Fecha actual: 2024-01-20
status: 'pending'
→ is_delayed: true
→ days_delayed: 5
→ delay_reason: "No iniciada después de la fecha programada (2024-01-15)."
```

### **Escenario 2: Tarea en Progreso Después de `end_date`**
```
start_date: 2024-01-15
end_date: 2024-01-20
Fecha actual: 2024-01-25
status: 'in_progress'
→ is_delayed: true
→ days_delayed: 5
→ delay_reason: "En progreso después de la fecha de fin (2024-01-20)."
```

### **Escenario 3: Tarea Completada Después de `end_date`**
```
start_date: 2024-01-15
end_date: 2024-01-20
completed_at: 2024-01-25
status: 'completed'
→ is_delayed: true
→ days_delayed: 5
→ delay_reason: "Completada después de la fecha de fin (2024-01-20)."
```

### **Escenario 4: Tarea Bloqueada (No Retrasada)**
```
start_date: 2024-01-15
Fecha actual: 2024-01-20
status: 'blocked'
→ is_delayed: false
→ delay_reason: NULL
```

---

## 📌 Notas Finales

- Los campos `is_delayed` y `delay_reason` ya existen pero no se usan
- Los campos `actual_start_time` y `actual_end_time` existen pero no se usan
- El sistema antiguo tenía lógica automática que podemos adaptar
- La implementación debe ser gradual y probada
- Considerar agregar notificaciones para tareas atrasadas (futuro)

