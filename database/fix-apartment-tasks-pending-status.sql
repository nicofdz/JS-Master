-- =====================================================
-- ARREGLAR RESTRICCIÓN PARA PERMITIR 'pending' EN APARTMENT_TASKS
-- =====================================================

-- Verificar la restricción actual
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.apartment_tasks'::regclass 
AND conname LIKE '%status%';

-- Eliminar la restricción existente
ALTER TABLE public.apartment_tasks DROP CONSTRAINT IF EXISTS apartment_tasks_status_check;

-- Agregar la nueva restricción que incluye 'pending'
ALTER TABLE public.apartment_tasks ADD CONSTRAINT apartment_tasks_status_check 
CHECK (status IN ('pending', 'in-progress', 'completed', 'blocked'));

-- Verificar que la restricción se aplicó correctamente
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.apartment_tasks'::regclass 
AND conname = 'apartment_tasks_status_check';

