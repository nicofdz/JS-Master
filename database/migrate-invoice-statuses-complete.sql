-- =====================================================
-- MIGRACIÓN COMPLETA DE ESTADOS DE FACTURAS
-- =====================================================
-- Este script actualiza los estados de facturas a los 3 estados correctos:
-- - pending (Pendiente)
-- - processed (Procesada) 
-- - blocked (Bloqueada)

-- =====================================================
-- PASO 1: ACTUALIZAR ESTADOS EXISTENTES
-- =====================================================

-- Actualizar estados pendientes
UPDATE invoice_income 
SET status = 'pending' 
WHERE status IN ('draft', 'new', 'created') OR status IS NULL;

-- Actualizar estados procesados
UPDATE invoice_income 
SET status = 'processed' 
WHERE status IN ('paid', 'completed', 'approved') OR is_processed = true;

-- Actualizar estados bloqueados
UPDATE invoice_income 
SET status = 'blocked' 
WHERE status IN ('cancelled', 'rejected', 'blocked');

-- Asegurar que todas las facturas tengan un estado válido
UPDATE invoice_income 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'processed', 'blocked');

-- =====================================================
-- PASO 2: SINCRONIZAR CAMPOS RELACIONADOS
-- =====================================================

-- Actualizar is_processed basado en el nuevo estado
UPDATE invoice_income 
SET is_processed = (status = 'processed');

-- Actualizar processed_at para facturas procesadas
UPDATE invoice_income 
SET processed_at = NOW() 
WHERE status = 'processed' AND processed_at IS NULL;

-- =====================================================
-- PASO 3: AGREGAR RESTRICCIÓN DE ESTADO
-- =====================================================

-- Eliminar restricción existente si existe
ALTER TABLE invoice_income DROP CONSTRAINT IF EXISTS check_invoice_status;

-- Agregar nueva restricción para los 3 estados válidos
ALTER TABLE invoice_income 
ADD CONSTRAINT check_invoice_status 
CHECK (status IN ('pending', 'processed', 'blocked'));

-- =====================================================
-- PASO 4: VERIFICACIONES Y REPORTES
-- =====================================================

-- Verificar que no hay estados inválidos
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM invoice_income 
  WHERE status NOT IN ('pending', 'processed', 'blocked');
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Aún existen % estados inválidos en la tabla invoice_income', invalid_count;
  END IF;
END $$;

-- Mostrar estadísticas por estado
SELECT 
  CASE 
    WHEN status = 'pending' THEN '🟡 Pendientes'
    WHEN status = 'processed' THEN '🟢 Procesadas'
    WHEN status = 'blocked' THEN '🔴 Bloqueadas'
    ELSE '❓ Otros'
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

-- Mostrar información sobre la restricción
SELECT 
  '✅ Restricción agregada:' as mensaje,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'invoice_income'::regclass 
AND conname = 'check_invoice_status';

-- =====================================================
-- RESUMEN DE LA MIGRACIÓN
-- =====================================================
SELECT 
  '🎉 MIGRACIÓN COMPLETADA' as resultado,
  'Estados actualizados a: pending, processed, blocked' as descripcion,
  'Restricción de estado agregada' as restriccion;
