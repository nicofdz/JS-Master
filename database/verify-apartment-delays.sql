-- =====================================================
-- VERIFICAR RETRASOS EN VISTA DE APARTAMENTOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Verificar tareas con retrasos y sus apartamentos
SELECT 
    p.name as project_name,
    f.floor_number,
    a.apartment_number,
    at.task_name,
    at.status,
    at.start_date,
    at.is_delayed,
    at.delay_reason,
    at.created_at
FROM public.apartment_tasks at
JOIN public.apartments a ON at.apartment_id = a.id
JOIN public.floors f ON a.floor_id = f.id
JOIN public.projects p ON f.project_id = p.id
WHERE at.is_delayed = true
ORDER BY p.name, f.floor_number, a.apartment_number, at.task_name;

-- Verificar que las tareas retrasadas tienen start_date en el pasado
SELECT 
    p.name as project_name,
    a.apartment_number,
    at.task_name,
    at.start_date,
    at.status,
    at.is_delayed,
    CASE 
        WHEN at.start_date IS NOT NULL AND CURRENT_DATE > at.start_date::DATE 
        THEN 'Fecha pasada - debería estar retrasada'
        ELSE 'Fecha futura o sin fecha'
    END as date_analysis
FROM public.apartment_tasks at
JOIN public.apartments a ON at.apartment_id = a.id
JOIN public.floors f ON a.floor_id = f.id
JOIN public.projects p ON f.project_id = p.id
WHERE at.start_date IS NOT NULL
ORDER BY at.start_date;
