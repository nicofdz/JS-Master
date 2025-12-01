-- =====================================================
-- ACTUALIZAR FACTURAS EXISTENTES CON PDF_URL
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar facturas sin pdf_url
SELECT 'FACTURAS SIN PDF_URL:' as info;
SELECT 
  id,
  invoice_number,
  client_name,
  pdf_url,
  created_at
FROM invoice_income 
WHERE pdf_url IS NULL 
ORDER BY created_at DESC;

-- 2. Verificar archivos en Storage bucket 'invoices'
-- (Esto se debe hacer manualmente en Supabase Dashboard > Storage > invoices)

-- 3. OPCIÓN TEMPORAL: Crear URLs ficticias para testing
-- Solo para poder ver el botón mientras se suben nuevas facturas
-- COMENTAR/DESCOMENTAR según necesites

/*
UPDATE invoice_income 
SET pdf_url = 'https://ejemplo.com/factura-' || id || '.pdf'
WHERE pdf_url IS NULL;
*/

-- 4. Verificar facturas después de la actualización
SELECT 'FACTURAS DESPUÉS DE ACTUALIZACIÓN:' as info;
SELECT 
  id,
  invoice_number,
  client_name,
  pdf_url,
  created_at
FROM invoice_income 
ORDER BY created_at DESC
LIMIT 5;

-- 5. Contar facturas con y sin PDF
SELECT 'RESUMEN:' as info;
SELECT 
  COUNT(*) as total_facturas,
  COUNT(pdf_url) as con_pdf_url,
  COUNT(*) - COUNT(pdf_url) as sin_pdf_url
FROM invoice_income;







