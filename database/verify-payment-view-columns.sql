-- =====================================================
-- VERIFICAR COLUMNAS DE LA VISTA
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Verificar que la vista existe y sus columnas
SELECT 'Columnas de worker_payment_summary:' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'worker_payment_summary' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar que la vista funciona
SELECT 'Datos de la vista:' as status;
SELECT * FROM public.worker_payment_summary LIMIT 3;

-- Verificar que todas las columnas necesarias existen
SELECT 'Verificación de columnas:' as status;
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'worker_payment_summary' 
        AND column_name = 'total_payment_due'
    ) THEN '✅ total_payment_due existe' ELSE '❌ total_payment_due NO existe' END as total_payment_due,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'worker_payment_summary' 
        AND column_name = 'pending_payment'
    ) THEN '✅ pending_payment existe' ELSE '❌ pending_payment NO existe' END as pending_payment,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'worker_payment_summary' 
        AND column_name = 'uncompleted_payment'
    ) THEN '✅ uncompleted_payment existe' ELSE '❌ uncompleted_payment NO existe' END as uncompleted_payment,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'worker_payment_summary' 
        AND column_name = 'total_paid'
    ) THEN '✅ total_paid existe' ELSE '❌ total_paid NO existe' END as total_paid;














<<<<<<< HEAD
=======

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
