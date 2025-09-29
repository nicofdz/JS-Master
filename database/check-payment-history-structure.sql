-- =====================================================
-- VERIFICAR ESTRUCTURA DE worker_payment_history
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Verificar si la tabla existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'worker_payment_history'
) as table_exists;

-- Si existe, mostrar su estructura
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'worker_payment_history' 
AND table_schema = 'public'
ORDER BY ordinal_position;





