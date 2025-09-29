-- =====================================================
-- AGREGAR COLUMNA is_paid A APARTMENT_TASKS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Verificar si la columna is_paid existe, si no, crearla
DO $$
BEGIN
    -- Verificar si la columna is_paid existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'apartment_tasks' 
        AND column_name = 'is_paid'
        AND table_schema = 'public'
    ) THEN
        -- Agregar la columna is_paid
        ALTER TABLE public.apartment_tasks 
        ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
        
        -- Crear índice para mejorar performance
        CREATE INDEX IF NOT EXISTS idx_apartment_tasks_is_paid ON public.apartment_tasks(is_paid);
        
        RAISE NOTICE 'Columna is_paid agregada exitosamente a apartment_tasks';
    ELSE
        RAISE NOTICE 'La columna is_paid ya existe en apartment_tasks';
    END IF;
END $$;

-- Verificar la estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'apartment_tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position;





