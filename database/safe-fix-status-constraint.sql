-- =====================================================
-- SOLUCIÓN SEGURA PARA EL ERROR DE STATUS CONSTRAINT
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Paso 1: Verificar qué valores problemáticos existen
SELECT 'Valores problemáticos encontrados:' as info;
SELECT status, COUNT(*) as count
FROM public.apartment_tasks 
WHERE status NOT IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')
GROUP BY status
ORDER BY status;

-- Paso 2: Mostrar todos los valores de status actuales
SELECT 'Todos los valores de status:' as info;
SELECT status, COUNT(*) as count
FROM public.apartment_tasks 
GROUP BY status
ORDER BY status;

-- Paso 3: Eliminar la restricción existente si existe
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

-- Paso 4: Actualizar valores problemáticos a valores válidos
UPDATE public.apartment_tasks 
SET status = CASE 
    WHEN status = 'Pendiente' THEN 'pending'
    WHEN status = 'En Progreso' THEN 'in_progress'
    WHEN status = 'Completada' THEN 'completed'
    WHEN status = 'Cancelada' THEN 'cancelled'
    WHEN status = 'En Espera' THEN 'on_hold'
    WHEN status = 'Finalizada' THEN 'completed'
    WHEN status = 'Terminada' THEN 'completed'
    WHEN status = 'Activa' THEN 'in_progress'
    WHEN status = 'Inactiva' THEN 'cancelled'
    ELSE 'pending'
END
WHERE status NOT IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold');

-- Paso 5: Verificar que no quedan valores problemáticos
SELECT 'Verificación final - valores problemáticos restantes:' as info;
SELECT status, COUNT(*) as count
FROM public.apartment_tasks 
WHERE status NOT IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')
GROUP BY status
ORDER BY status;

-- Paso 6: Crear la nueva restricción
ALTER TABLE public.apartment_tasks 
ADD CONSTRAINT apartment_tasks_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold'));

-- Paso 7: Verificar que la restricción se creó correctamente
SELECT 'Restricción creada exitosamente:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.apartment_tasks'::regclass
AND contype = 'c'
AND conname = 'apartment_tasks_status_check';

-- Paso 8: Mostrar los valores finales
SELECT 'Valores finales de status:' as info;
SELECT status, COUNT(*) as count
FROM public.apartment_tasks 
GROUP BY status
ORDER BY status;














<<<<<<< HEAD
=======

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
