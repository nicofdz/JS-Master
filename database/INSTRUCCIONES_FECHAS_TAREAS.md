# Instrucciones: Agregar Fecha de Terminación a Tareas

## 🎯 Objetivo

Agregar el campo `completed_at` a la tabla `apartment_tasks` para registrar la fecha exacta en que se completa una tarea.

## 🚀 Paso 1: Ejecutar Script SQL

### Desde Supabase Dashboard:

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Click en **"SQL Editor"** en el menú lateral
4. Click en **"+ New query"**
5. Copia y pega este código:

```sql
-- Agregar columna completed_at
ALTER TABLE public.apartment_tasks 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Actualizar tareas completadas existentes para que tengan completed_at
-- (usar updated_at como referencia)
UPDATE public.apartment_tasks 
SET completed_at = updated_at 
WHERE status = 'completed' 
AND completed_at IS NULL;

-- Verificar
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'apartment_tasks' 
AND column_name IN ('start_date', 'end_date', 'completed_at')
ORDER BY column_name;
```

6. Click en **"Run"** o presiona `Ctrl + Enter`
7. Deberías ver que se agregó `completed_at` ✅

## ✅ Cambios Implementados

### 1. **Campo `completed_at` en Base de Datos**
   - Se guarda automáticamente cuando una tarea se marca como "completada"
   - Timestamp con zona horaria para precisión

### 2. **Formulario de Tareas**
   - ✅ **Fecha de Inicio**: Si no se especifica, usa la fecha actual del sistema
   - ✅ **Fecha de Fin Estimada**: Campo opcional para planificación
   - ✅ **Fecha de Terminación**: Solo visible al EDITAR, muestra cuándo se completó

### 3. **Vista de Pagos - Modal "Ver"**
   - Ahora muestra la fecha correcta:
     - **1ra opción**: `completed_at` (fecha de terminación real)
     - **2da opción**: `end_date` (fecha estimada)
     - **3ra opción**: `created_at` (fecha de creación como respaldo)

### 4. **Lógica Automática**
   - Al **crear** una tarea sin fecha de inicio → se usa la fecha actual
   - Al **completar** una tarea → se guarda `completed_at` automáticamente
   - Al **editar** una tarea completada → puedes modificar `completed_at`

## 📋 Flujo Completo

1. **Crear Tarea**:
   - Usuario crea tarea
   - Si especifica fecha de inicio → se guarda esa fecha
   - Si NO especifica → se guarda la fecha actual

2. **Completar Tarea**:
   - Usuario marca tarea como "completada"
   - Sistema guarda `completed_at` con la fecha/hora actual automáticamente

3. **Ver en Pagos**:
   - Modal muestra la fecha de terminación (`completed_at`)
   - Si no hay terminación, muestra la fecha estimada
   - Como último recurso, muestra la fecha de creación

4. **Editar Tarea**:
   - Si la tarea está completada, puede editar la fecha de terminación
   - útil para corregir fechas erróneas

## 🔍 Verificación

Después de ejecutar el script:

```sql
-- Ver tareas con sus fechas
SELECT 
    id,
    task_name,
    status,
    start_date,
    end_date,
    completed_at,
    created_at
FROM public.apartment_tasks 
WHERE status = 'completed'
LIMIT 10;
```

## 💡 Notas Importantes

- Las tareas ya completadas se actualizan con `updated_at` como referencia
- A partir de ahora, las nuevas tareas completadas tendrán la fecha exacta
- La fecha de terminación se puede editar manualmente si es necesario
- La fecha de inicio se guarda automáticamente si no se especifica

