-- Script de prueba para verificar el sistema de dinero gastado
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que la tabla income_tracking tenga el campo
SELECT 'Verificando campo total_spent_on_payments:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'income_tracking' 
AND table_schema = 'public'
AND column_name = 'total_spent_on_payments';

-- 2. Verificar datos actuales de la vista worker_payment_summary
SELECT 'Datos de worker_payment_summary (pagos realizados):' as info;
SELECT 
    worker_id,
    full_name,
    total_paid,
    uncompleted_payment
FROM worker_payment_summary
ORDER BY total_paid DESC
LIMIT 5;

-- 2.1. Verificar suma de total_paid de worker_payment_summary
SELECT 'Suma de total_paid de worker_payment_summary (dinero ya pagado):' as info;
SELECT 
    SUM(total_paid) as total_pagado_a_trabajadores
FROM worker_payment_summary;

-- 3. Verificar datos actuales de income_tracking
SELECT 'Datos de income_tracking:' as info;
SELECT 
    total_income,
    total_spent_on_payments,
    (total_income - total_spent_on_payments) as dinero_disponible
FROM income_tracking
WHERE id = 1;

-- 4. Probar la función de actualización
SELECT 'Probando función refresh_income_tracking_complete:' as info;
SELECT refresh_income_tracking_complete();

-- 5. Verificar datos después de la actualización
SELECT 'Datos después de actualización:' as info;
SELECT 
    total_income,
    total_spent_on_payments,
    (total_income - total_spent_on_payments) as dinero_disponible
FROM income_tracking
WHERE id = 1;
