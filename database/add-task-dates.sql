-- =====================================================
-- AGREGAR CAMPO completed_at A apartment_tasks
-- =====================================================
-- Este campo guardará la fecha exacta en que se completó la tarea
-- =====================================================

-- Agregar columna completed_at si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'apartment_tasks' 
        AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.apartment_tasks 
        ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Columna completed_at agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna completed_at ya existe';
    END IF;
END $$;

-- Actualizar tareas completadas existentes para que tengan completed_at
-- (usar updated_at como referencia para tareas ya completadas)
UPDATE public.apartment_tasks 
SET completed_at = updated_at 
WHERE status = 'completed' 
AND completed_at IS NULL;

-- Verificar que se agregó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'apartment_tasks' 
AND column_name IN ('start_date', 'end_date', 'completed_at', 'created_at', 'updated_at')
ORDER BY column_name;

-- Ver un ejemplo de las fechas
SELECT 
    id,
    task_name,
    status,
    start_date,
    end_date,
    completed_at,
    created_at
FROM public.apartment_tasks 
LIMIT 5;

