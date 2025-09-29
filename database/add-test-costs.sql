-- =====================================================
-- AGREGAR COSTOS DE PRUEBA A LAS TAREAS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Agregar costos estimados a las tareas que no los tienen
UPDATE public.apartment_tasks 
SET estimated_cost = CASE 
    WHEN task_name ILIKE '%ventana%' THEN 150000
    WHEN task_name ILIKE '%corniz%' THEN 80000
    WHEN task_name ILIKE '%pintura%' THEN 120000
    WHEN task_name ILIKE '%instalaci%' THEN 200000
    WHEN task_name ILIKE '%electric%' THEN 180000
    WHEN task_name ILIKE '%plomer%' THEN 160000
    ELSE 100000
END
WHERE estimated_cost IS NULL OR estimated_cost = 0;

-- Verificar el resultado
SELECT 
    p.name as project_name,
    at.task_name,
    at.estimated_cost,
    at.status
FROM public.apartment_tasks at
JOIN public.apartments a ON at.apartment_id = a.id
JOIN public.floors f ON a.floor_id = f.id
JOIN public.projects p ON f.project_id = p.id
WHERE p.name = 'CONDOMINIO PARQUE LOURDES'
ORDER BY at.task_name;
