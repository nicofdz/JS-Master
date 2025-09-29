-- =====================================================
-- VERIFICAR SISTEMA DE PAGOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Verificar que la vista existe y funciona
SELECT 'Vista worker_payment_summary:' as status;
SELECT * FROM public.worker_payment_summary LIMIT 5;

-- Verificar estructura de apartment_tasks
SELECT 'Columnas de apartment_tasks:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'apartment_tasks' 
AND table_schema = 'public'
AND column_name IN ('is_paid', 'worker_payment', 'estimated_cost', 'status')
ORDER BY column_name;

-- Verificar estructura de worker_payment_history
SELECT 'Columnas de worker_payment_history:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'worker_payment_history' 
AND table_schema = 'public'
ORDER BY column_name;

-- Verificar que hay trabajadores activos
SELECT 'Trabajadores activos:' as status;
SELECT COUNT(*) as total_workers FROM public.workers WHERE is_active = true;

-- Verificar que hay tareas
SELECT 'Tareas existentes:' as status;
SELECT COUNT(*) as total_tasks FROM public.apartment_tasks;








