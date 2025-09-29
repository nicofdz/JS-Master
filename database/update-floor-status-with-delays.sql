-- =====================================================
-- ACTUALIZAR ESTADO DE PISOS CON RETRASOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Función para actualizar el estado de un piso basado en sus apartamentos y tareas
CREATE OR REPLACE FUNCTION update_floor_status_from_apartments()
RETURNS TRIGGER AS $$
DECLARE
    v_floor_id INTEGER;
    v_total_apartments INTEGER := 0;
    v_completed_apartments INTEGER := 0;
    v_in_progress_apartments INTEGER := 0;
    v_blocked_apartments INTEGER := 0;
    v_delayed_tasks INTEGER := 0;
    v_floor_status TEXT;
BEGIN
    -- Obtener el ID del piso
    IF TG_OP = 'DELETE' THEN
        v_floor_id := OLD.floor_id;
    ELSE
        v_floor_id := NEW.floor_id;
    END IF;

    -- Contar apartamentos y su estado
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status = 'completed' THEN 1 END),
        COUNT(CASE WHEN status = 'in-progress' THEN 1 END),
        COUNT(CASE WHEN status = 'blocked' THEN 1 END)
    INTO 
        v_total_apartments,
        v_completed_apartments,
        v_in_progress_apartments,
        v_blocked_apartments
    FROM public.apartments 
    WHERE floor_id = v_floor_id;

    -- Contar tareas retrasadas en el piso (EXCLUIR tareas bloqueadas)
    SELECT COUNT(*)
    INTO v_delayed_tasks
    FROM public.apartment_tasks at
    JOIN public.apartments a ON at.apartment_id = a.id
    WHERE a.floor_id = v_floor_id 
    AND at.is_delayed = true 
    AND at.status != 'blocked';

    -- Determinar el estado del piso
    IF v_total_apartments = 0 THEN
        v_floor_status := 'pending';
    ELSIF v_delayed_tasks > 0 THEN
        -- Si hay tareas retrasadas, el piso está retrasado
        v_floor_status := 'delayed';
    ELSIF v_completed_apartments = v_total_apartments THEN
        v_floor_status := 'completed';
    ELSIF v_in_progress_apartments > 0 OR v_completed_apartments > 0 THEN
        v_floor_status := 'in-progress';
    ELSE
        v_floor_status := 'pending';
    END IF;

    -- Actualizar el piso
    UPDATE public.floors 
    SET 
        status = v_floor_status,
        updated_at = NOW()
    WHERE id = v_floor_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en apartamentos para actualizar pisos
DROP TRIGGER IF EXISTS trigger_update_floor_status ON public.apartments;
CREATE TRIGGER trigger_update_floor_status
    AFTER INSERT OR UPDATE OR DELETE ON public.apartments
    FOR EACH ROW
    EXECUTE FUNCTION update_floor_status_from_apartments();

-- Crear trigger en tareas para actualizar pisos cuando cambien los retrasos
DROP TRIGGER IF EXISTS trigger_update_floor_from_tasks ON public.apartment_tasks;
CREATE TRIGGER trigger_update_floor_from_tasks
    AFTER INSERT OR UPDATE OR DELETE ON public.apartment_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_floor_status_from_apartments();

-- Función para actualizar todos los pisos existentes
CREATE OR REPLACE FUNCTION update_all_floor_statuses()
RETURNS VOID AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.floors
    LOOP
        -- Simular un cambio para activar el trigger
        UPDATE public.floors 
        SET updated_at = NOW() 
        WHERE id = r.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Actualizar todos los pisos existentes
SELECT update_all_floor_statuses();

-- Verificar el resultado
SELECT 
    p.name as project_name,
    f.floor_number,
    f.status as floor_status,
    COUNT(a.id) as total_apartments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_apartments,
    COUNT(CASE WHEN a.status = 'in-progress' THEN 1 END) as in_progress_apartments,
    COUNT(CASE WHEN a.status = 'blocked' THEN 1 END) as blocked_apartments,
    COUNT(CASE WHEN at.is_delayed = true AND at.status != 'blocked' THEN 1 END) as delayed_tasks
FROM public.floors f
JOIN public.projects p ON f.project_id = p.id
LEFT JOIN public.apartments a ON f.id = a.floor_id
LEFT JOIN public.apartment_tasks at ON a.id = at.apartment_id
GROUP BY p.name, f.floor_number, f.status
ORDER BY p.name, f.floor_number;
