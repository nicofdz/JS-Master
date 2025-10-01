-- =====================================================
-- SCRIPT DE PRUEBA PARA VERIFICAR EL FLUJO DE ELIMINACIÓN
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar datos ANTES de eliminar un pago
SELECT '=== DATOS ANTES DE ELIMINAR PAGO ===' as info;

-- Verificar income_tracking antes
SELECT 
    'income_tracking ANTES:' as tabla,
    total_income,
    total_spent_on_payments,
    (total_income - total_spent_on_payments) as dinero_disponible
FROM income_tracking 
WHERE id = 1;

-- Verificar worker_payment_summary antes
SELECT 
    'worker_payment_summary ANTES:' as tabla,
    worker_id,
    full_name,
    total_paid,
    uncompleted_payment
FROM worker_payment_summary
WHERE total_paid > 0;

-- 2. Verificar si hay pagos para eliminar
SELECT '=== PAGOS DISPONIBLES PARA ELIMINAR ===' as info;
SELECT 
    id,
    worker_id,
    amount,
    payment_date,
    notes
FROM worker_payment_history
ORDER BY payment_date DESC
LIMIT 5;

-- 3. Si hay un pago para eliminar, ejecutar la eliminación
-- (Comentar/descomentar según necesites)
/*
-- Ejemplo: eliminar el pago más reciente
DO $$
DECLARE
    payment_to_delete INTEGER;
BEGIN
    -- Obtener el ID del pago más reciente
    SELECT id INTO payment_to_delete
    FROM worker_payment_history
    ORDER BY payment_date DESC
    LIMIT 1;
    
    IF payment_to_delete IS NOT NULL THEN
        RAISE NOTICE 'Eliminando pago ID: %', payment_to_delete;
        PERFORM delete_payment(payment_to_delete);
    ELSE
        RAISE NOTICE 'No hay pagos para eliminar';
    END IF;
END $$;
*/

-- 4. Verificar datos DESPUÉS de eliminar un pago
SELECT '=== DATOS DESPUÉS DE ELIMINAR PAGO ===' as info;

-- Verificar income_tracking después
SELECT 
    'income_tracking DESPUÉS:' as tabla,
    total_income,
    total_spent_on_payments,
    (total_income - total_spent_on_payments) as dinero_disponible
FROM income_tracking 
WHERE id = 1;

-- Verificar worker_payment_summary después
SELECT 
    'worker_payment_summary DESPUÉS:' as tabla,
    worker_id,
    full_name,
    total_paid,
    uncompleted_payment
FROM worker_payment_summary
WHERE total_paid > 0;

-- 5. Forzar actualización manual para verificar
SELECT '=== FORZAR ACTUALIZACIÓN MANUAL ===' as info;
SELECT refresh_income_tracking_complete();

-- Verificar datos después de forzar actualización
SELECT 
    'income_tracking DESPUÉS DE REFRESH:' as tabla,
    total_income,
    total_spent_on_payments,
    (total_income - total_spent_on_payments) as dinero_disponible
FROM income_tracking 
WHERE id = 1;



