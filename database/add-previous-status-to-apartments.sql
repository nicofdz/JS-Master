-- =====================================================
-- AGREGAR COLUMNA previous_status A APARTMENTS
-- =====================================================
-- Este script agrega una columna para guardar el estado 
-- anterior de un apartamento antes de bloquearlo
-- =====================================================

-- 1. Agregar columna previous_status si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'apartments' 
        AND column_name = 'previous_status'
    ) THEN
        ALTER TABLE public.apartments 
        ADD COLUMN previous_status VARCHAR(50);
        
        RAISE NOTICE 'Columna previous_status agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna previous_status ya existe';
    END IF;
END $$;

-- 2. Verificar que la columna se agregó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'apartments' 
AND column_name = 'previous_status';

