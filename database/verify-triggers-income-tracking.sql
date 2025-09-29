-- =====================================================
-- VERIFICAR Y CORREGIR TRIGGERS DE INCOME_TRACKING
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. VERIFICAR TRIGGERS EXISTENTES
SELECT 'TRIGGERS ACTUALES RELACIONADOS CON INCOME_TRACKING:' as info;
SELECT 
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation as event_type,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND (
  trigger_name LIKE '%income%' OR
  action_statement LIKE '%income_tracking%' OR
  action_statement LIKE '%refresh_income_tracking%'
)
ORDER BY event_object_table, trigger_name;

-- 2. VERIFICAR SI LA FUNCIÓN update_income_tracking INCLUYE total_spent_on_payments
SELECT 'DEFINICIÓN DE update_income_tracking:' as info;
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'update_income_tracking';

-- 3. ASEGURAR QUE LA FUNCIÓN update_income_tracking ESTÉ COMPLETA
CREATE OR REPLACE FUNCTION update_income_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar todos los campos de income_tracking
  UPDATE income_tracking 
  SET 
    total_income = (
      SELECT COALESCE(SUM(total_amount), 0) 
      FROM invoice_income 
      WHERE status = 'processed'
    ),
    total_net = (
      SELECT COALESCE(SUM(net_amount), 0) 
      FROM invoice_income 
      WHERE status = 'processed'
    ),
    total_iva = (
      SELECT COALESCE(SUM(iva_amount), 0) 
      FROM invoice_income 
      WHERE status = 'processed'
    ),
    processed_invoices_count = (
      SELECT COUNT(*) 
      FROM invoice_income 
      WHERE status = 'processed'
    ),
    total_spent_on_payments = (
      SELECT COALESCE(SUM(total_paid), 0) 
      FROM worker_payment_summary
    ),
    updated_at = NOW()
  WHERE id = 1;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. RECREAR TRIGGERS PARA ASEGURAR QUE ESTÉN ACTIVOS

-- Triggers para invoice_income (ya deberían existir)
DROP TRIGGER IF EXISTS trigger_update_income_on_insert ON invoice_income;
CREATE TRIGGER trigger_update_income_on_insert
  AFTER INSERT ON invoice_income
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

DROP TRIGGER IF EXISTS trigger_update_income_on_update ON invoice_income;
CREATE TRIGGER trigger_update_income_on_update
  AFTER UPDATE ON invoice_income
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

DROP TRIGGER IF EXISTS trigger_update_income_on_delete ON invoice_income;
CREATE TRIGGER trigger_update_income_on_delete
  AFTER DELETE ON invoice_income
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

-- Triggers para worker_payment_history (CRÍTICOS para el problema)
DROP TRIGGER IF EXISTS trigger_update_income_on_payment_insert ON worker_payment_history;
CREATE TRIGGER trigger_update_income_on_payment_insert
  AFTER INSERT ON worker_payment_history
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

DROP TRIGGER IF EXISTS trigger_update_income_on_payment_update ON worker_payment_history;
CREATE TRIGGER trigger_update_income_on_payment_update
  AFTER UPDATE ON worker_payment_history
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

DROP TRIGGER IF EXISTS trigger_update_income_on_payment_delete ON worker_payment_history;
CREATE TRIGGER trigger_update_income_on_payment_delete
  AFTER DELETE ON worker_payment_history
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

-- Triggers para apartment_tasks (cuando cambia is_paid)
DROP TRIGGER IF EXISTS trigger_update_income_on_task_update ON apartment_tasks;
CREATE TRIGGER trigger_update_income_on_task_update
  AFTER UPDATE ON apartment_tasks
  FOR EACH ROW
  WHEN (OLD.is_paid IS DISTINCT FROM NEW.is_paid)
  EXECUTE FUNCTION update_income_tracking();

-- 5. VERIFICAR TRIGGERS DESPUÉS DE LA RECREACIÓN
SELECT 'TRIGGERS DESPUÉS DE LA RECREACIÓN:' as info;
SELECT 
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation as event_type
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND (
  trigger_name LIKE '%income%' OR
  event_object_table IN ('invoice_income', 'worker_payment_history', 'apartment_tasks')
)
ORDER BY event_object_table, trigger_name;

-- 6. EJECUTAR REFRESH MANUAL PARA ASEGURAR CONSISTENCIA
SELECT 'EJECUTANDO REFRESH FINAL:' as info;
SELECT public.refresh_income_tracking_complete();

-- 7. MOSTRAR ESTADO FINAL
SELECT 'ESTADO FINAL DE INCOME_TRACKING:' as info;
SELECT 
  total_income,
  total_spent_on_payments,
  (total_income - total_spent_on_payments) as dinero_disponible,
  processed_invoices_count,
  updated_at
FROM income_tracking 
WHERE id = 1;

SELECT '✅ TRIGGERS Y FUNCIONES VERIFICADOS Y CORREGIDOS' as resultado;

