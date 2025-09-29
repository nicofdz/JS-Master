-- =====================================================
-- AGREGAR CAMPOS DE SEGUIMIENTO DE TIEMPO A APARTMENT_TASKS
-- Para detectar retrasos en tareas
-- =====================================================

-- Agregar campos de seguimiento si no existen
DO $$
BEGIN
    -- Campo para marcar si está retrasada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartment_tasks' 
        AND column_name = 'is_delayed'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.apartment_tasks 
        ADD COLUMN is_delayed BOOLEAN DEFAULT false;
    END IF;
    
    -- Campo para razón del retraso
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartment_tasks' 
        AND column_name = 'delay_reason'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.apartment_tasks 
        ADD COLUMN delay_reason TEXT;
    END IF;
END $$;

-- Crear función para calcular si una tarea está retrasada (automática)
CREATE OR REPLACE FUNCTION check_task_delay()
RETURNS TRIGGER AS $$
DECLARE
    is_date_delayed BOOLEAN := false;
    delay_reason_text TEXT := '';
BEGIN
    -- Solo verificar retraso por fecha de inicio (automático)
    IF NEW.start_date IS NOT NULL THEN
        -- Si la fecha de inicio ya pasó y la tarea no está en progreso o completada
        IF CURRENT_DATE > NEW.start_date::DATE AND NEW.status NOT IN ('in-progress', 'completed') THEN
            is_date_delayed := true;
            delay_reason_text := 'No iniciada después de la fecha programada (' || NEW.start_date || '). ';
        END IF;
    END IF;
    
    -- Actualizar campos de retraso
    NEW.is_delayed := is_date_delayed;
    NEW.delay_reason := CASE 
        WHEN NEW.is_delayed THEN delay_reason_text
        ELSE NULL
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para verificar retrasos automáticamente
DROP TRIGGER IF EXISTS trigger_check_task_delay ON public.apartment_tasks;
CREATE TRIGGER trigger_check_task_delay
    BEFORE INSERT OR UPDATE ON public.apartment_tasks
    FOR EACH ROW
    EXECUTE FUNCTION check_task_delay();

-- Función para actualizar todas las tareas existentes
CREATE OR REPLACE FUNCTION update_all_task_delays()
RETURNS void AS $$
BEGIN
    UPDATE public.apartment_tasks 
    SET 
        is_delayed = false,
        delay_reason = NULL
    WHERE id = id; -- Esto activará el trigger para todas las filas
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON COLUMN public.apartment_tasks.is_delayed IS 'Indica si la tarea está retrasada (calculado automáticamente)';
COMMENT ON COLUMN public.apartment_tasks.delay_reason IS 'Razón del retraso de la tarea (calculado automáticamente)';
