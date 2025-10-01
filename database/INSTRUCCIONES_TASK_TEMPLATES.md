# Instrucciones para Crear la Tabla de Plantillas de Tareas

## ¿Qué hace este script?

Este script crea la tabla `task_templates` que almacena las **plantillas de tareas** disponibles para seleccionar al crear apartamentos.

### Diferencia importante:
- **`task_templates`** = Plantillas/opciones de tareas disponibles (como un catálogo)
- **`apartment_tasks`** = Tareas reales asignadas a cada apartamento

Cuando creas un apartamento y seleccionas tareas, se copian de `task_templates` a `apartment_tasks`.

## Pasos para Ejecutar

### Desde Supabase Dashboard:

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Click en **"SQL Editor"** en el menú lateral
4. Click en **"+ New query"**
5. Copia y pega este código:

```sql
-- Crear tabla task_templates
CREATE TABLE IF NOT EXISTS public.task_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  estimated_hours INTEGER NOT NULL DEFAULT 8,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar las plantillas de tareas
INSERT INTO public.task_templates (name, category, estimated_hours, sort_order, is_active) VALUES
('Tabiques', 'Estructura', 24, 1, true),
('Instalacion de puertas', 'Carpintería', 8, 2, true),
('Piso flotante', 'Pisos', 16, 3, true),
('Cornisas', 'Terminaciones', 6, 4, true);

-- Verificar
SELECT * FROM public.task_templates WHERE is_active = true ORDER BY sort_order;
```

6. Click en **"Run"** o presiona `Ctrl + Enter`
7. Deberías ver las 4 plantillas creadas ✅

## Verificación

Después de ejecutar, verifica que la tabla se creó:

```sql
-- Ver todas las plantillas
SELECT * FROM public.task_templates ORDER BY sort_order;

-- Ver solo las activas
SELECT * FROM public.task_templates WHERE is_active = true ORDER BY sort_order;
```

Deberías ver:
1. Tabiques (Estructura, 24 horas)
2. Instalacion de puertas (Carpintería, 8 horas)
3. Piso flotante (Pisos, 16 horas)
4. Cornisas (Terminaciones, 6 horas)

## Flujo Completo

1. **Crear apartamento**: Seleccionas tareas de `task_templates`
2. **Se guardan en**: `apartment_tasks` (con apartment_id)
3. **Resultado**: El apartamento tiene sus propias tareas copiadas de las plantillas

## Ejemplo de Uso

Cuando creas un apartamento y seleccionas:
- ✅ Tabiques
- ✅ Piso flotante
- ✅ Cornisas

Se crearán 3 registros en `apartment_tasks` con:
- `apartment_id` = ID del nuevo apartamento
- `task_name` = "Tabiques", "Piso flotante", "Cornisas"
- `task_category`, `estimated_hours`, etc. copiados de la plantilla
- `status` = "pending"

## Notas

- Las plantillas son reutilizables (un catálogo)
- Cada apartamento tiene sus propias copias de las tareas
- Puedes agregar más plantillas más adelante con:
  ```sql
  INSERT INTO public.task_templates (name, category, estimated_hours, sort_order, is_active)
  VALUES ('Nueva Tarea', 'Categoría', 8, 5, true);
  ```

