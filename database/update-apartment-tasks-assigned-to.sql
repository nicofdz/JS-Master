-- =====================================================
-- ACTUALIZAR CAMPO assigned_to EN apartment_tasks
-- Para que apunte a la tabla workers en lugar de user_profiles
-- =====================================================

-- Primero, eliminar la foreign key existente si existe
DO $$
BEGIN
    -- Verificar si existe la constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'apartment_tasks_assigned_to_fkey'
        AND table_name = 'apartment_tasks'
    ) THEN
        -- Eliminar la constraint existente
        ALTER TABLE public.apartment_tasks 
        DROP CONSTRAINT apartment_tasks_assigned_to_fkey;
    END IF;
END $$;

-- Agregar la nueva foreign key que apunta a workers
ALTER TABLE public.apartment_tasks 
ADD CONSTRAINT apartment_tasks_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES public.workers(id) ON DELETE SET NULL;

-- Comentario para documentar el cambio
COMMENT ON COLUMN public.apartment_tasks.assigned_to IS 'ID del trabajador asignado a la tarea (referencia a workers.id)';
