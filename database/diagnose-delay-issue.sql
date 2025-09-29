-- =====================================================
-- DIAGNÓSTICO DEL SISTEMA DE RETRASOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar si las columnas existen
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'apartment_tasks' 
AND column_name IN ('is_delayed', 'delay_reason')
ORDER BY column_name;

-- 2. Verificar si el trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_check_task_delay';

-- 3. Verificar tareas con fechas pasadas que deberían estar retrasadas
-- EXCLUIR tareas bloqueadas del cálculo de retraso
SELECT 
    id,
    task_name,
    status,
    start_date,
    is_delayed,
    delay_reason,
    created_at,
    CASE 
        WHEN start_date IS NOT NULL AND CURRENT_DATE > start_date::DATE AND status NOT IN ('in-progress', 'completed', 'blocked') 
        THEN 'DEBERÍA ESTAR RETRASADA'
        WHEN status = 'blocked' AND start_date IS NOT NULL AND CURRENT_DATE > start_date::DATE
        THEN 'BLOQUEADA - NO DEBE CONTAR COMO RETRASADA'
        ELSE 'OK'
    END as should_be_delayed
FROM public.apartment_tasks 
WHERE start_date IS NOT NULL
ORDER BY start_date;

-- 4. Forzar actualización de todas las tareas para activar el trigger
UPDATE public.apartment_tasks 
SET updated_at = NOW()
WHERE id = id;

-- 5. Verificar el resultado después de la actualización
SELECT 
    id,
    task_name,
    status,
    start_date,
    is_delayed,
    delay_reason
FROM public.apartment_tasks 
WHERE start_date IS NOT NULL
ORDER BY start_date;
