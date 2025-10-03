-- =====================================================
-- ELIMINAR COSTOS DE TAREAS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Eliminar la columna estimated_cost de apartment_tasks
ALTER TABLE public.apartment_tasks
DROP COLUMN IF EXISTS estimated_cost;

-- 2. Verificar que la columna se eliminó
SELECT 'Verificando eliminación de estimated_cost:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'apartment_tasks' 
AND table_schema = 'public'
AND column_name = 'estimated_cost';

-- 3. Verificar que worker_payment sigue existiendo
SELECT 'Verificando que worker_payment existe:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'apartment_tasks' 
AND table_schema = 'public'
AND column_name = 'worker_payment';

-- 4. Mostrar estructura actual de apartment_tasks
SELECT 'Estructura actual de apartment_tasks:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'apartment_tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position;















