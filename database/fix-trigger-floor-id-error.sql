-- =====================================================
-- DIAGNÓSTICO Y CORRECCIÓN DEL ERROR FLOOR_ID
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar qué triggers existen en la tabla apartment_tasks
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'apartment_tasks'
ORDER BY trigger_name;

-- 2. Verificar las funciones de trigger que podrían estar causando el problema
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%floor%' 
AND routine_type = 'FUNCTION';

-- 3. Buscar funciones que usen NEW.floor_id
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE prosrc LIKE '%NEW.floor_id%';

-- 4. Si encontramos el problema, vamos a corregir la función
-- Primero, vamos a ver si existe la función update_floor_status_from_apartments
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'update_floor_status_from_apartments';

-- 5. Si el problema está en esa función, vamos a recrearla correctamente
DROP FUNCTION IF EXISTS update_floor_status_from_apartments() CASCADE;

-- 6. Recrear la función correctamente
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
    -- Obtener el ID del piso desde el apartamento
    IF TG_OP = 'DELETE' THEN
        SELECT floor_id INTO v_floor_id FROM public.apartments WHERE id = OLD.apartment_id;
    ELSE
        SELECT floor_id INTO v_floor_id FROM public.apartments WHERE id = NEW.apartment_id;
    END IF;

    -- Si no encontramos el floor_id, salir
    IF v_floor_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
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

-- 7. Recrear el trigger
DROP TRIGGER IF EXISTS trigger_update_floor_from_tasks ON public.apartment_tasks;
CREATE TRIGGER trigger_update_floor_from_tasks
    AFTER INSERT OR UPDATE OR DELETE ON public.apartment_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_floor_status_from_apartments();

SELECT 'Función y trigger corregidos' as resultado;
