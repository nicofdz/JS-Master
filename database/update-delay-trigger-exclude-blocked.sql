-- =====================================================
-- ACTUALIZAR TRIGGER PARA EXCLUIR TAREAS BLOQUEADAS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Función actualizada para calcular retrasos (EXCLUIR tareas bloqueadas)
CREATE OR REPLACE FUNCTION calculate_task_delay_status(
    p_start_date DATE,
    p_status TEXT
)
RETURNS TABLE (is_delayed BOOLEAN, delay_reason TEXT) AS $$
DECLARE
    v_is_delayed BOOLEAN := FALSE;
    v_delay_reason TEXT := NULL;
BEGIN
    -- EXCLUIR tareas bloqueadas del cálculo de retraso
    IF p_start_date IS NOT NULL AND p_status != 'blocked' THEN
        IF CURRENT_DATE > p_start_date AND p_status NOT IN ('in-progress', 'completed') THEN
            v_is_delayed := TRUE;
            v_delay_reason := 'No iniciada después de la fecha programada (' || p_start_date || ').';
        END IF;
    END IF;
    
    -- Si está bloqueada, NO debe estar retrasada
    IF p_status = 'blocked' THEN
        v_is_delayed := FALSE;
        v_delay_reason := NULL;
    END IF;
    
    RETURN QUERY SELECT v_is_delayed, v_delay_reason;
END;
$$ LANGUAGE plpgsql;

-- Actualizar todas las tareas existentes con la nueva lógica
DO $$
DECLARE
    r RECORD;
    v_is_delayed BOOLEAN;
    v_delay_reason TEXT;
BEGIN
    FOR r IN SELECT id, start_date, status FROM public.apartment_tasks
    LOOP
        SELECT is_delayed, delay_reason
        INTO v_is_delayed, v_delay_reason
        FROM calculate_task_delay_status(r.start_date, r.status);

        UPDATE public.apartment_tasks
        SET
            is_delayed = v_is_delayed,
            delay_reason = v_delay_reason,
            updated_at = NOW()
        WHERE id = r.id;
    END LOOP;
END $$;

-- Verificar el resultado
SELECT 
    p.name as project_name,
    at.task_name,
    at.status,
    at.start_date,
    at.is_delayed,
    at.delay_reason,
    CASE 
        WHEN at.status = 'blocked' AND at.is_delayed = false 
        THEN '✅ BLOQUEADA - CORRECTAMENTE NO RETRASADA'
        WHEN at.status != 'blocked' AND at.is_delayed = true 
        THEN '🔴 RETRASADA - CORRECTAMENTE MARCADA'
        WHEN at.status != 'blocked' AND at.is_delayed = false 
        THEN '✅ NO RETRASADA - CORRECTO'
        ELSE '❓ ESTADO INESPERADO'
    END as validation
FROM public.apartment_tasks at
JOIN public.apartments a ON at.apartment_id = a.id
JOIN public.floors f ON a.floor_id = f.id
JOIN public.projects p ON f.project_id = p.id
WHERE at.start_date IS NOT NULL
ORDER BY p.name, at.task_name;
