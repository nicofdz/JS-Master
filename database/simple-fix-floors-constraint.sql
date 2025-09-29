-- =====================================================
-- SOLUCIÓN SIMPLE PARA RESTRICCIÓN FLOORS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Eliminar la restricción existente
ALTER TABLE public.floors DROP CONSTRAINT IF EXISTS floors_status_check;

-- Crear la nueva restricción que incluye 'delayed'
ALTER TABLE public.floors ADD CONSTRAINT floors_status_check 
CHECK (status IN ('pending', 'in-progress', 'completed', 'delayed'));

-- Verificar que se aplicó correctamente
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'floors_status_check';

SELECT 'Restricción actualizada correctamente' as resultado;
