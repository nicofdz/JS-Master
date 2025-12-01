-- =====================================================
-- SCRIPT DE DIAGNÓSTICO: PAYMENT TRACKING
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar que existen las funciones necesarias
SELECT 'FUNCIONES DISPONIBLES:' as info;
SELECT 
  routine_name as function_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'process_worker_payment_simple',
  'process_partial_payment_simple', 
  'delete_payment',
  'refresh_income_tracking_complete',
  'update_income_tracking'
)
ORDER BY routine_name;

-- 2. Verificar estructura de income_tracking
SELECT 'ESTRUCTURA INCOME_TRACKING:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'income_tracking' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar datos actuales de income_tracking
SELECT 'DATOS ACTUALES INCOME_TRACKING:' as info;
SELECT 
  total_income,
  total_spent_on_payments,
  (total_income - total_spent_on_payments) as dinero_disponible,
  processed_invoices_count,
  updated_at
FROM income_tracking 
WHERE id = 1;

-- 4. Verificar vista worker_payment_summary
SELECT 'DATOS WORKER_PAYMENT_SUMMARY (top 5):' as info;
SELECT 
  worker_id,
  full_name,
  total_paid,
  uncompleted_payment,
  pending_payment
FROM worker_payment_summary 
ORDER BY total_paid DESC 
LIMIT 5;

-- 5. Verificar total_paid de la vista vs suma manual
SELECT 'COMPARACIÓN TOTAL_PAID:' as info;
SELECT 
  'Vista worker_payment_summary' as source,
  SUM(total_paid) as total_pagado
FROM worker_payment_summary
UNION ALL
SELECT 
  'Tabla worker_payment_history' as source,
  COALESCE(SUM(total_amount), 0) as total_pagado
FROM worker_payment_history;

-- 6. Verificar triggers activos
SELECT 'TRIGGERS ACTIVOS:' as info;
SELECT 
  trigger_name,
  event_object_table,
  trigger_schema,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND (
  trigger_name LIKE '%income%' OR
  trigger_name LIKE '%payment%'
)
ORDER BY event_object_table, trigger_name;

-- 7. Verificar últimos pagos
SELECT 'ÚLTIMOS PAGOS (top 3):' as info;
SELECT 
  id,
  worker_id,
  total_amount,
  payment_date,
  created_at
FROM worker_payment_history 
ORDER BY created_at DESC 
LIMIT 3;

-- 8. Test de función refresh_income_tracking_complete
SELECT 'EJECUTANDO REFRESH MANUAL:' as info;
SELECT refresh_income_tracking_complete();

-- 9. Verificar datos después del refresh
SELECT 'DATOS DESPUÉS DEL REFRESH:' as info;
SELECT 
  total_income,
  total_spent_on_payments,
  (total_income - total_spent_on_payments) as dinero_disponible,
  updated_at
FROM income_tracking 
WHERE id = 1;







<<<<<<< HEAD
=======

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
