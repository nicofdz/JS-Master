-- Arreglar la función para que incluya pagos por día
-- Actualiza el total_spent_on_payments para incluir pagos a trato Y pagos por día

-- Función mejorada que suma AMBOS tipos de pagos
CREATE OR REPLACE FUNCTION refresh_income_tracking_complete()
RETURNS VOID AS $$
BEGIN
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
    -- AQUÍ ESTÁ EL CAMBIO: Suma pagos a trato + pagos por día
    total_spent_on_payments = (
      -- Suma de pagos "a trato"
      SELECT COALESCE(SUM(total_paid), 0) 
      FROM worker_payment_summary
    ) + (
      -- Suma de pagos "por día"
      SELECT COALESCE(SUM(total_amount), 0) 
      FROM daily_worker_payments
    ),
    updated_at = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- Actualizar la función para refrescar el dinero gastado
CREATE OR REPLACE FUNCTION update_spent_payments()
RETURNS VOID AS $$
BEGIN
  UPDATE income_tracking 
  SET 
    -- Suma pagos a trato + pagos por día
    total_spent_on_payments = (
      SELECT COALESCE(SUM(total_paid), 0) 
      FROM worker_payment_summary
    ) + (
      SELECT COALESCE(SUM(total_amount), 0) 
      FROM daily_worker_payments
    ),
    updated_at = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para actualizar cuando se agreguen/eliminen pagos por día
DROP TRIGGER IF EXISTS trigger_update_income_on_daily_payment_insert ON daily_worker_payments;
CREATE TRIGGER trigger_update_income_on_daily_payment_insert
  AFTER INSERT ON daily_worker_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

DROP TRIGGER IF EXISTS trigger_update_income_on_daily_payment_delete ON daily_worker_payments;
CREATE TRIGGER trigger_update_income_on_daily_payment_delete
  AFTER DELETE ON daily_worker_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

-- Actualizar ahora los datos
SELECT refresh_income_tracking_complete();

-- Verificación
DO $$
DECLARE
  v_trato DECIMAL;
  v_dia DECIMAL;
  v_total DECIMAL;
BEGIN
  -- Pagos a trato
  SELECT COALESCE(SUM(total_paid), 0) INTO v_trato FROM worker_payment_summary;
  
  -- Pagos por día
  SELECT COALESCE(SUM(total_amount), 0) INTO v_dia FROM daily_worker_payments;
  
  -- Total en income_tracking
  SELECT total_spent_on_payments INTO v_total FROM income_tracking WHERE id = 1;
  
  RAISE NOTICE '💰 Pagos a trato: $%', v_trato;
  RAISE NOTICE '📅 Pagos por día: $%', v_dia;
  RAISE NOTICE '📊 Total gastado: $%', v_total;
  RAISE NOTICE '✅ Suma correcta: %', (v_trato + v_dia = v_total);
END $$;

<<<<<<< HEAD
=======

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
