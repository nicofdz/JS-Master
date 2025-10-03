-- Verificar la estructura de la tabla worker_payments
SELECT 'Estructura de worker_payments:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'worker_payments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver algunos datos de ejemplo
SELECT 'Datos de ejemplo de worker_payments:' as info;
SELECT * FROM worker_payments LIMIT 3;








