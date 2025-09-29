-- =====================================================
-- ACTUALIZAR TAREAS EXISTENTES PARA MARCAR RETRASOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Actualizar todas las tareas existentes para marcar retrasos
UPDATE public.apartment_tasks 
SET 
    is_delayed = false,
    delay_reason = NULL
WHERE id = id; -- Esto activará el trigger para todas las filas

-- Verificar tareas retrasadas
SELECT 
    id,
    task_name,
    status,
    start_date,
    is_delayed,
    delay_reason,
    CASE 
        WHEN start_date IS NOT NULL AND CURRENT_DATE > start_date::DATE AND status NOT IN ('in-progress', 'completed') 
        THEN 'DEBERÍA ESTAR RETRASADA'
        ELSE 'OK'
    END as should_be_delayed
FROM public.apartment_tasks 
WHERE start_date IS NOT NULL
ORDER BY start_date;

-- Contar tareas retrasadas por proyecto
SELECT 
    p.name as project_name,
    COUNT(at.id) as total_tasks,
    COUNT(CASE WHEN at.is_delayed = true THEN 1 END) as delayed_tasks,
    ROUND(
        COUNT(CASE WHEN at.is_delayed = true THEN 1 END) * 100.0 / COUNT(at.id), 
        2
    ) as delay_percentage
FROM public.projects p
LEFT JOIN public.floors f ON p.id = f.project_id
LEFT JOIN public.apartments a ON f.id = a.floor_id
LEFT JOIN public.apartment_tasks at ON a.id = at.apartment_id
GROUP BY p.id, p.name
HAVING COUNT(at.id) > 0
ORDER BY delay_percentage DESC;
