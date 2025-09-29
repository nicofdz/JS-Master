-- Crear tabla para rastrear ingresos totales
CREATE TABLE IF NOT EXISTS income_tracking (
  id SERIAL PRIMARY KEY,
  total_income DECIMAL(15,2) DEFAULT 0,
  total_net DECIMAL(15,2) DEFAULT 0,
  total_iva DECIMAL(15,2) DEFAULT 0,
  processed_invoices_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar registro inicial si no existe
INSERT INTO income_tracking (id, total_income, total_net, total_iva, processed_invoices_count)
VALUES (1, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Función para actualizar el total de ingresos (para triggers)
CREATE OR REPLACE FUNCTION update_income_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular totales de facturas procesadas
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
    updated_at = NOW()
  WHERE id = 1;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Función para refrescar manualmente los datos de ingresos
CREATE OR REPLACE FUNCTION refresh_income_tracking()
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
    updated_at = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar automáticamente
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

-- Actualizar el registro inicial con los datos actuales
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
  updated_at = NOW()
WHERE id = 1;
