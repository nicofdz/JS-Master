-- =====================================================
-- CORREGIR RESTRICCIÓN DE STATUS EN APARTMENT_TASKS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Primero, verificar qué restricciones existen
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.apartment_tasks'::regclass
AND contype = 'c';

-- Eliminar la restricción existente si existe
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Buscar el nombre de la restricción de status
    SELECT conname INTO constraint_name
    FROM pg_constraint 
    WHERE conrelid = 'public.apartment_tasks'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';
    
    -- Si existe, eliminarla
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.apartment_tasks DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Restricción eliminada: %', constraint_name;
    ELSE
        RAISE NOTICE 'No se encontró restricción de status';
    END IF;
END $$;

-- Primero, actualizar los valores de status que no coinciden con los permitidos
UPDATE public.apartment_tasks 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold');

-- Mostrar los valores que se van a cambiar
SELECT 'Valores actualizados:' as info;
SELECT status, COUNT(*) as count
FROM public.apartment_tasks 
GROUP BY status
ORDER BY status;

-- Crear una nueva restricción más flexible
ALTER TABLE public.apartment_tasks 
ADD CONSTRAINT apartment_tasks_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold'));

-- Verificar que la restricción se creó correctamente
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.apartment_tasks'::regclass
AND contype = 'c'
AND conname = 'apartment_tasks_status_check';

-- Mostrar los valores actuales de status
SELECT 'Valores actuales de status:' as info;
SELECT DISTINCT status, COUNT(*) as count
FROM public.apartment_tasks 
GROUP BY status
ORDER BY status;