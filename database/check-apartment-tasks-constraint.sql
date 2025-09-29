-- =====================================================
-- VERIFICAR RESTRICCIÓN DE STATUS EN APARTMENT_TASKS
-- =====================================================

-- Verificar la restricción actual
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.apartment_tasks'::regclass 
AND conname LIKE '%status%';

-- Verificar la estructura de la tabla
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'apartment_tasks' 
AND column_name = 'status';

-- Probar insertar con diferentes valores de status
-- (Esto nos dirá exactamente qué valores están permitidos)

