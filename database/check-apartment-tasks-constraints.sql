-- =====================================================
-- VERIFICAR RESTRICCIONES DE APARTMENT_TASKS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Verificar las restricciones de la tabla apartment_tasks
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.apartment_tasks'::regclass
AND contype = 'c';

-- Verificar los valores permitidos en la columna status
SELECT DISTINCT status 
FROM public.apartment_tasks 
ORDER BY status;

-- Verificar la estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'apartment_tasks' 
AND table_schema = 'public'
AND column_name = 'status'
ORDER BY ordinal_position;








