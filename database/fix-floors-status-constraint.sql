-- =====================================================
-- CORREGIR RESTRICCIÓN DE ESTADO DE PISOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Verificar la restricción actual
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'floors_status_check';

-- Eliminar la restricción existente
ALTER TABLE public.floors 
DROP CONSTRAINT IF EXISTS floors_status_check;

-- Crear la nueva restricción que incluye 'delayed'
ALTER TABLE public.floors 
ADD CONSTRAINT floors_status_check 
CHECK (status IN ('pending', 'in-progress', 'completed', 'delayed'));

-- Verificar que la nueva restricción se aplicó correctamente
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'floors_status_check';

-- Probar insertar un piso con estado 'delayed' para verificar que funciona
-- Primero obtener un project_id que exista
DO $$
DECLARE
    existing_project_id INTEGER;
BEGIN
    -- Obtener el primer project_id que existe
    SELECT id INTO existing_project_id FROM public.projects LIMIT 1;
    
    -- Si existe un proyecto, insertar el piso de prueba
    IF existing_project_id IS NOT NULL THEN
        INSERT INTO public.floors (project_id, floor_number, status) 
        VALUES (existing_project_id, 999, 'delayed') 
        ON CONFLICT DO NOTHING;
        
        -- Eliminar el piso de prueba
        DELETE FROM public.floors WHERE floor_number = 999;
        
        RAISE NOTICE 'Prueba exitosa: piso con estado delayed insertado y eliminado';
    ELSE
        RAISE NOTICE 'No hay proyectos disponibles para la prueba';
    END IF;
END $$;

-- Verificar que no hay errores
SELECT 'Restricción actualizada correctamente' as resultado;
