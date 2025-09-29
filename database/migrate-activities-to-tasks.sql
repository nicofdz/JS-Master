-- =====================================================
-- MIGRACIÓN SEGURA DE APARTMENT_ACTIVITIES A APARTMENT_TASKS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- PASO 1: Crear tabla temporal para respaldar datos
CREATE TABLE IF NOT EXISTS apartment_activities_backup AS 
SELECT * FROM public.apartment_activities;

-- PASO 2: Migrar datos de apartment_activities a apartment_tasks
INSERT INTO public.apartment_tasks (
    apartment_id,
    activity_template_id,
    status,
    progress,
    start_date,
    end_date,
    estimated_hours,
    actual_hours,
    team_id,
    assigned_to,
    priority,
    quality_rating,
    notes,
    created_at,
    updated_at
)
SELECT 
    aa.apartment_id,
    aa.activity_template_id,
    aa.status,
    aa.progress,
    aa.start_date,
    aa.end_date,
    aa.estimated_hours,
    aa.actual_hours,
    aa.team_id,
    NULL as assigned_to, -- No hay campo en apartment_activities
    'medium' as priority, -- Valor por defecto
    NULL as quality_rating, -- No hay campo en apartment_activities
    aa.notes,
    aa.created_at,
    aa.updated_at
FROM public.apartment_activities aa;

-- PASO 3: Verificar migración
SELECT 
    'Registros migrados:' as info,
    COUNT(*) as total_records
FROM public.apartment_tasks;

-- PASO 4: Mostrar estadísticas
SELECT 
    'Estadísticas de migración:' as info;
    
SELECT 
    status,
    COUNT(*) as count
FROM public.apartment_tasks
GROUP BY status
ORDER BY status;

-- PASO 5: Confirmar que los triggers funcionan
-- (Esto se verificará cuando se cree un nuevo piso con apartamentos)

SELECT '🎉 MIGRACIÓN COMPLETADA - Ahora puedes eliminar apartment_activities' as resultado;


