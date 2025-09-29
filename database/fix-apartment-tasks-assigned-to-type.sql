-- =====================================================
-- CORREGIR TIPO DE DATO DEL CAMPO assigned_to
-- Cambiar de UUID a INTEGER para que sea compatible con workers.id
-- =====================================================

-- Primero, eliminar las políticas RLS que dependen del campo assigned_to
DROP POLICY IF EXISTS "Assigned users can update their tasks" ON public.apartment_tasks;
DROP POLICY IF EXISTS "Assigned users can view their tasks" ON public.apartment_tasks;
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.apartment_tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.apartment_tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.apartment_tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.apartment_tasks;

-- Eliminar la foreign key existente si existe
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

-- Cambiar el tipo de dato del campo assigned_to de UUID a INTEGER
ALTER TABLE public.apartment_tasks 
ALTER COLUMN assigned_to TYPE INTEGER USING assigned_to::TEXT::INTEGER;

-- Agregar la nueva foreign key que apunta a workers
ALTER TABLE public.apartment_tasks 
ADD CONSTRAINT apartment_tasks_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES public.workers(id) ON DELETE SET NULL;

-- Recrear las políticas RLS básicas
CREATE POLICY "Authenticated users can view tasks" ON public.apartment_tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert tasks" ON public.apartment_tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tasks" ON public.apartment_tasks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tasks" ON public.apartment_tasks
  FOR DELETE USING (auth.role() = 'authenticated');

-- Comentario para documentar el cambio
COMMENT ON COLUMN public.apartment_tasks.assigned_to IS 'ID del trabajador asignado a la tarea (referencia a workers.id)';
