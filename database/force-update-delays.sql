-- =====================================================
-- FORZAR ACTUALIZACIÓN DE RETRASOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Actualizar todas las tareas que deberían estar retrasadas
-- EXCLUIR tareas bloqueadas del cálculo de retraso
UPDATE public.apartment_tasks 
SET 
    is_delayed = true,
    delay_reason = 'No iniciada después de la fecha programada (' || start_date || ').'
WHERE 
    start_date IS NOT NULL 
    AND CURRENT_DATE > start_date::DATE 
    AND status NOT IN ('in-progress', 'completed', 'blocked');

-- Marcar como no retrasadas las que no cumplen los criterios
-- INCLUIR tareas bloqueadas como no retrasadas
UPDATE public.apartment_tasks 
SET 
    is_delayed = false,
    delay_reason = NULL
WHERE 
    start_date IS NULL 
    OR CURRENT_DATE <= start_date::DATE 
    OR status IN ('in-progress', 'completed', 'blocked');

-- Verificar el resultado
SELECT 
    p.name as project_name,
    at.task_name,
    at.status,
    at.start_date,
    at.is_delayed,
    at.delay_reason
FROM public.apartment_tasks at
JOIN public.apartments a ON at.apartment_id = a.id
JOIN public.floors f ON a.floor_id = f.id
JOIN public.projects p ON f.project_id = p.id
WHERE at.start_date IS NOT NULL
ORDER BY p.name, at.start_date;
