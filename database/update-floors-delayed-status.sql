-- =====================================================
-- ACTUALIZAR PISOS CON ESTADO RETRASADO
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Función simple para actualizar estado de pisos
CREATE OR REPLACE FUNCTION update_floor_delayed_status()
RETURNS VOID AS $$
DECLARE
    r RECORD;
    v_delayed_tasks INTEGER;
    v_total_apartments INTEGER;
    v_completed_apartments INTEGER;
    v_in_progress_apartments INTEGER;
    v_new_status TEXT;
BEGIN
    FOR r IN SELECT id FROM public.floors
    LOOP
        -- Contar tareas retrasadas en el piso (EXCLUIR tareas bloqueadas)
        SELECT COUNT(*)
        INTO v_delayed_tasks
        FROM public.apartment_tasks at
        JOIN public.apartments a ON at.apartment_id = a.id
        WHERE a.floor_id = r.id 
        AND at.is_delayed = true 
        AND at.status != 'blocked';

        -- Contar apartamentos del piso
        SELECT 
            COUNT(*),
            COUNT(CASE WHEN status = 'completed' THEN 1 END),
            COUNT(CASE WHEN status = 'in-progress' THEN 1 END)
        INTO 
            v_total_apartments,
            v_completed_apartments,
            v_in_progress_apartments
        FROM public.apartments 
        WHERE floor_id = r.id;

        -- Determinar el nuevo estado
        IF v_total_apartments = 0 THEN
            v_new_status := 'pending';
        ELSIF v_delayed_tasks > 0 THEN
            v_new_status := 'delayed';
        ELSIF v_completed_apartments = v_total_apartments THEN
            v_new_status := 'completed';
        ELSIF v_in_progress_apartments > 0 OR v_completed_apartments > 0 THEN
            v_new_status := 'in-progress';
        ELSE
            v_new_status := 'pending';
        END IF;

        -- Actualizar el piso
        UPDATE public.floors 
        SET 
            status = v_new_status,
            updated_at = NOW()
        WHERE id = r.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función
SELECT update_floor_delayed_status();

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
