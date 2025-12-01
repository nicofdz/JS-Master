-- Script para actualizar los estados de facturas a los 3 estados correctos
-- Estados: pending, processed, blocked

-- 1. Actualizar estados existentes a los nuevos valores
UPDATE invoice_income 
SET status = 'pending' 
WHERE status IN ('draft', 'new', 'created') OR status IS NULL;

UPDATE invoice_income 
SET status = 'processed' 
WHERE status IN ('paid', 'completed', 'approved') OR is_processed = true;

UPDATE invoice_income 
SET status = 'blocked' 
WHERE status IN ('cancelled', 'rejected', 'blocked');

-- 2. Asegurar que todas las facturas tengan un estado válido
UPDATE invoice_income 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'processed', 'blocked');

-- 3. Actualizar is_processed basado en el nuevo estado
UPDATE invoice_income 
SET is_processed = (status = 'processed');

-- 4. Actualizar processed_at para facturas procesadas
UPDATE invoice_income 
SET processed_at = NOW() 
WHERE status = 'processed' AND processed_at IS NULL;

-- 5. Verificar los resultados
SELECT 
  status,
  COUNT(*) as cantidad,
  SUM(total_amount) as monto_total
FROM invoice_income 
GROUP BY status
ORDER BY status;

-- 6. Mostrar estadísticas por estado
SELECT 
  CASE 
    WHEN status = 'pending' THEN 'Pendientes'
    WHEN status = 'processed' THEN 'Procesadas'
    WHEN status = 'blocked' THEN 'Bloqueadas'
    ELSE 'Otros'
  END as estado_descripcion,
  status,
  COUNT(*) as cantidad,
  ROUND(AVG(total_amount), 0) as promedio_monto,
  ROUND(SUM(total_amount), 0) as monto_total
FROM invoice_income 
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'processed' THEN 2
    WHEN 'blocked' THEN 3
    ELSE 4
  END;











