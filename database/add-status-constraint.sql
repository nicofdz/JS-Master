-- Script para agregar restricción de estado en la tabla invoice_income
-- Asegura que solo se puedan usar los 3 estados: pending, processed, blocked

-- 1. Eliminar restricción existente si existe
ALTER TABLE invoice_income DROP CONSTRAINT IF EXISTS check_invoice_status;

-- 2. Agregar nueva restricción para los 3 estados válidos
ALTER TABLE invoice_income 
ADD CONSTRAINT check_invoice_status 
CHECK (status IN ('pending', 'processed', 'blocked'));

-- 3. Verificar que la restricción funciona
-- Esta consulta debería fallar si hay estados inválidos:
SELECT status, COUNT(*) as cantidad
FROM invoice_income 
WHERE status NOT IN ('pending', 'processed', 'blocked')
GROUP BY status;

-- 4. Mostrar información sobre la restricción
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'invoice_income'::regclass 
AND conname = 'check_invoice_status';
