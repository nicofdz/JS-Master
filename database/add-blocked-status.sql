-- =====================================================
-- AGREGAR ESTADO 'blocked' A LA RESTRICCIÓN
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Verificar la restricción actual
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.apartment_tasks'::regclass
AND contype = 'c'
AND conname = 'apartment_tasks_status_check';

-- Eliminar la restricción existente
ALTER TABLE public.apartment_tasks 
DROP CONSTRAINT IF EXISTS apartment_tasks_status_check;

-- Crear una nueva restricción que incluya 'blocked'
ALTER TABLE public.apartment_tasks 
ADD CONSTRAINT apartment_tasks_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold', 'blocked'));

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
SELECT status, COUNT(*) as count
FROM public.apartment_tasks 
GROUP BY status
ORDER BY status;














