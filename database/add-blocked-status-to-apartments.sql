-- =====================================================
-- AGREGAR STATUS 'blocked' A LA TABLA APARTMENTS
-- =====================================================

-- Eliminar la restricción CHECK existente
ALTER TABLE public.apartments DROP CONSTRAINT IF EXISTS apartments_status_check;

-- Agregar la nueva restricción CHECK que incluye 'blocked'
ALTER TABLE public.apartments ADD CONSTRAINT apartments_status_check 
CHECK (status IN ('pending', 'in-progress', 'completed', 'blocked'));

-- Verificar que la restricción se aplicó correctamente
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.apartments'::regclass 
AND conname = 'apartments_status_check';
