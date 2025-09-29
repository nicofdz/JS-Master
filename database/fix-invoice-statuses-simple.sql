-- =====================================================
-- SCRIPT SIMPLE PARA CORREGIR ESTADOS DE FACTURAS
-- =====================================================
-- Este script es más seguro y evita errores de GROUP BY

-- PASO 1: Verificar estados actuales
SELECT 'Estados actuales en la base de datos:' as info;
SELECT status, COUNT(*) as cantidad
FROM invoice_income 
GROUP BY status
ORDER BY status;

-- PASO 2: Actualizar estados a los 3 correctos
UPDATE invoice_income 
SET status = 'pending' 
WHERE status IN ('draft', 'new', 'created') OR status IS NULL;

UPDATE invoice_income 
SET status = 'processed' 
WHERE status IN ('paid', 'completed', 'approved') OR is_processed = true;

UPDATE invoice_income 
SET status = 'blocked' 
WHERE status IN ('cancelled', 'rejected', 'blocked');

-- Asegurar que todas las facturas tengan un estado válido
UPDATE invoice_income 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'processed', 'blocked');

-- PASO 3: Sincronizar campos relacionados
UPDATE invoice_income 
SET is_processed = (status = 'processed');

UPDATE invoice_income 
SET processed_at = NOW() 
WHERE status = 'processed' AND processed_at IS NULL;

-- PASO 4: Agregar restricción (opcional)
-- Descomenta la siguiente línea si quieres agregar la restricción:
-- ALTER TABLE invoice_income ADD CONSTRAINT check_invoice_status CHECK (status IN ('pending', 'processed', 'blocked'));

-- PASO 5: Verificar resultados
SELECT 'Estados después de la actualización:' as info;
SELECT status, COUNT(*) as cantidad
FROM invoice_income 
GROUP BY status
ORDER BY status;

-- PASO 6: Mostrar estadísticas finales
SELECT 
  CASE 
    WHEN status = 'pending' THEN '🟡 Pendientes'
    WHEN status = 'processed' THEN '🟢 Procesadas'
    WHEN status = 'blocked' THEN '🔴 Bloqueadas'
    ELSE '❓ Otros'
  END as estado,
  COUNT(*) as cantidad,
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





