-- =====================================================
-- ELIMINAR COLUMNA team_id DE apartment_tasks
-- =====================================================
-- Esta columna ya no se utiliza en el sistema
-- =====================================================

-- 1. Eliminar la foreign key constraint si existe
DO $$
BEGIN
    -- Buscar y eliminar la constraint de foreign key
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'apartment_tasks' 
        AND constraint_name LIKE '%team_id%'
    ) THEN
        -- Obtener el nombre de la constraint
        DECLARE
            constraint_name_var TEXT;
        BEGIN
            SELECT tc.constraint_name INTO constraint_name_var
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'public' 
            AND tc.table_name = 'apartment_tasks' 
            AND kcu.column_name = 'team_id'
            AND tc.constraint_type = 'FOREIGN KEY'
            LIMIT 1;
            
            IF constraint_name_var IS NOT NULL THEN
                EXECUTE format('ALTER TABLE public.apartment_tasks DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
                RAISE NOTICE 'Constraint % eliminada', constraint_name_var;
            END IF;
        END;
    END IF;
END $$;

-- 2. Eliminar la columna team_id
ALTER TABLE public.apartment_tasks
DROP COLUMN IF EXISTS team_id;

-- 3. Verificar que se eliminó correctamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'apartment_tasks' 
        AND column_name = 'team_id'
    ) THEN
        RAISE NOTICE 'Columna team_id eliminada exitosamente de apartment_tasks';
    ELSE
        RAISE WARNING 'La columna team_id aún existe';
    END IF;
END $$;

