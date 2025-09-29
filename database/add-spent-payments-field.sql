-- Agregar campo para dinero gastado en pagos
ALTER TABLE income_tracking 
ADD COLUMN IF NOT EXISTS total_spent_on_payments DECIMAL(15,2) DEFAULT 0;

-- Actualizar el registro existente
UPDATE income_tracking 
SET total_spent_on_payments = 0 
WHERE id = 1;

-- Función para actualizar el dinero gastado en pagos
CREATE OR REPLACE FUNCTION update_spent_payments()
RETURNS VOID AS $$
BEGIN
  UPDATE income_tracking 
  SET 
    total_spent_on_payments = (
      SELECT COALESCE(SUM(total_paid), 0) 
      FROM worker_payment_summary
    ),
    updated_at = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- Función para refrescar todos los datos de ingresos
CREATE OR REPLACE FUNCTION refresh_income_tracking_complete()
RETURNS VOID AS $$
BEGIN
  -- Actualizar totales de facturas procesadas
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
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar automáticamente cuando cambien los pagos
DROP TRIGGER IF EXISTS trigger_update_income_on_payment_insert ON worker_payments;
CREATE TRIGGER trigger_update_income_on_payment_insert
  AFTER INSERT ON worker_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

DROP TRIGGER IF EXISTS trigger_update_income_on_payment_update ON worker_payments;
CREATE TRIGGER trigger_update_income_on_payment_update
  AFTER UPDATE ON worker_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

DROP TRIGGER IF EXISTS trigger_update_income_on_payment_delete ON worker_payments;
CREATE TRIGGER trigger_update_income_on_payment_delete
  AFTER DELETE ON worker_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

-- Triggers para actualizar cuando cambien las tareas (que afectan uncompleted_payment)
DROP TRIGGER IF EXISTS trigger_update_income_on_task_update ON apartment_tasks;
CREATE TRIGGER trigger_update_income_on_task_update
  AFTER UPDATE ON apartment_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

-- Actualizar datos iniciales
SELECT refresh_income_tracking_complete();
