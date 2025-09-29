-- =====================================================
-- VERIFICAR COSTOS DE TAREAS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Verificar si las tareas tienen costos estimados
SELECT 
    p.name as project_name,
    at.task_name,
    at.estimated_cost,
    at.status,
    CASE 
        WHEN at.estimated_cost IS NULL THEN 'SIN COSTO'
        WHEN at.estimated_cost = 0 THEN 'COSTO CERO'
        ELSE 'CON COSTO'
    END as cost_status
FROM public.apartment_tasks at
JOIN public.apartments a ON at.apartment_id = a.id
JOIN public.floors f ON a.floor_id = f.id
JOIN public.projects p ON f.project_id = p.id
WHERE p.name = 'CONDOMINIO PARQUE LOURDES'
ORDER BY at.task_name;

-- Verificar el presupuesto del proyecto
SELECT 
    name,
    budget,
    CASE 
        WHEN budget IS NULL THEN 'SIN PRESUPUESTO'
        WHEN budget = 0 THEN 'PRESUPUESTO CERO'
        ELSE 'CON PRESUPUESTO'
    END as budget_status
FROM public.projects 
WHERE name = 'CONDOMINIO PARQUE LOURDES';

-- Contar tareas con y sin costos
SELECT 
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN estimated_cost IS NOT NULL AND estimated_cost > 0 THEN 1 END) as tasks_with_cost,
    COUNT(CASE WHEN estimated_cost IS NULL OR estimated_cost = 0 THEN 1 END) as tasks_without_cost
FROM public.apartment_tasks at
JOIN public.apartments a ON at.apartment_id = a.id
JOIN public.floors f ON a.floor_id = f.id
JOIN public.projects p ON f.project_id = p.id
WHERE p.name = 'CONDOMINIO PARQUE LOURDES';
