-- =====================================================
-- SCRIPT PARA IDENTIFICAR ARCHIVOS HUÉRFANOS EN STORAGE
-- Ejecutar en Supabase SQL Editor para ver archivos sin referencia
-- =====================================================

-- 1. Ver todas las facturas con sus URLs de archivos
SELECT 'FACTURAS CON ARCHIVOS:' as info;
SELECT 
  id,
  invoice_number,
  pdf_url,
  image_url,
  created_at
FROM invoice_income 
WHERE pdf_url IS NOT NULL OR image_url IS NOT NULL
ORDER BY created_at DESC;

-- 2. Contar archivos por tipo
SELECT 'RESUMEN DE ARCHIVOS:' as info;
SELECT 
  'PDFs' as tipo,
  COUNT(*) as total
FROM invoice_income 
WHERE pdf_url IS NOT NULL
UNION ALL
SELECT 
  'Imágenes' as tipo,
  COUNT(*) as total
FROM invoice_income 
WHERE image_url IS NOT NULL
UNION ALL
SELECT 
  'Sin archivos' as tipo,
  COUNT(*) as total
FROM invoice_income 
WHERE pdf_url IS NULL AND image_url IS NULL;

-- 3. Facturas sin PDF (potenciales problemas)
SELECT 'FACTURAS SIN PDF:' as info;
SELECT 
  id,
  invoice_number,
  issuer_name,
  created_at
FROM invoice_income 
WHERE pdf_url IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 4. Facturas con PDF pero sin imagen (normal, se genera bajo demanda)
SELECT 'FACTURAS CON PDF PERO SIN IMAGEN:' as info;
SELECT 
  COUNT(*) as total
FROM invoice_income 
WHERE pdf_url IS NOT NULL AND image_url IS NULL;

-- 5. Facturas con imagen pero sin PDF (posible problema)
SELECT 'FACTURAS CON IMAGEN PERO SIN PDF:' as info;
SELECT 
  id,
  invoice_number,
  pdf_url,
  image_url
FROM invoice_income 
WHERE pdf_url IS NULL AND image_url IS NOT NULL;

SELECT '✅ ANÁLISIS COMPLETADO' as resultado;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 
-- Para limpiar archivos huérfanos manualmente en Supabase Dashboard:
-- 1. Ve a Storage → invoices
-- 2. Compara los archivos con las URLs en la base de datos
-- 3. Elimina archivos que no tengan referencia en invoice_income
-- 
-- Los archivos en Storage siguen este formato:
-- PDFs: invoice-{timestamp}-{filename}.pdf
-- Imágenes: previews/invoice-preview-{invoiceId}-{timestamp}.png
-- 
-- =====================================================







