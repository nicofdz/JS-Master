-- =====================================================
-- SOLUCIÓN RÁPIDA PARA RESTRICCIÓN FLOORS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Paso 1: Eliminar la restricción existente
ALTER TABLE public.floors DROP CONSTRAINT IF EXISTS floors_status_check;

-- Paso 2: Crear la nueva restricción con 'delayed'
ALTER TABLE public.floors ADD CONSTRAINT floors_status_check 
CHECK (status IN ('pending', 'in-progress', 'completed', 'delayed'));

-- Paso 3: Verificar que funciona
SELECT 'Restricción actualizada correctamente' as resultado;
