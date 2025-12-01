-- =====================================================
-- SCRIPT PARA DEBUGGEAR URLs DE FACTURAS
-- Ejecutar en Supabase SQL Editor para verificar URLs
-- =====================================================

-- 1. Ver las últimas 10 facturas con sus URLs
SELECT 'ÚLTIMAS FACTURAS CON URLs:' as info;
SELECT 
  id,
  invoice_number,
  issuer_name,
  pdf_url,
  image_url,
  created_at
FROM invoice_income 
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar facturas con PDFs
SELECT 'FACTURAS CON PDF:' as info;
SELECT 
  id,
  invoice_number,
  CASE 
    WHEN pdf_url IS NULL THEN '❌ SIN PDF'
    WHEN pdf_url LIKE '%/storage/v1/object/public/invoices/%' THEN '✅ PDF EN INVOICES'
    ELSE '⚠️ PDF EN OTRO BUCKET'
  END as pdf_status,
  pdf_url
FROM invoice_income 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 3. Verificar facturas con imágenes
SELECT 'FACTURAS CON IMAGEN:' as info;
SELECT 
  id,
  invoice_number,
  CASE 
    WHEN image_url IS NULL THEN '❌ SIN IMAGEN'
    WHEN image_url LIKE 'data:%' THEN '📝 IMAGEN BASE64'
    WHEN image_url LIKE '%/storage/v1/object/public/invoices/%' THEN '✅ IMAGEN EN INVOICES'
    WHEN image_url LIKE '%/storage/v1/object/public/project-plan-images/%' THEN '✅ IMAGEN EN PROJECT-PLAN-IMAGES'
    ELSE '⚠️ IMAGEN EN OTRO BUCKET'
  END as image_status,
  LEFT(image_url, 100) as image_url_preview
FROM invoice_income 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 4. Contar tipos de URLs
SELECT 'RESUMEN DE TIPOS DE URLs:' as info;
SELECT 
  'PDFs en invoices' as tipo,
  COUNT(*) as total
FROM invoice_income 
WHERE pdf_url LIKE '%/storage/v1/object/public/invoices/%'
UNION ALL
SELECT 
  'PDFs en otros buckets' as tipo,
  COUNT(*) as total
FROM invoice_income 
WHERE pdf_url IS NOT NULL AND pdf_url NOT LIKE '%/storage/v1/object/public/invoices/%'
UNION ALL
SELECT 
  'Imágenes en invoices' as tipo,
  COUNT(*) as total
FROM invoice_income 
WHERE image_url LIKE '%/storage/v1/object/public/invoices/%'
UNION ALL
SELECT 
  'Imágenes en project-plan-images' as tipo,
  COUNT(*) as total
FROM invoice_income 
WHERE image_url LIKE '%/storage/v1/object/public/project-plan-images/%'
UNION ALL
SELECT 
  'Imágenes base64' as tipo,
  COUNT(*) as total
FROM invoice_income 
WHERE image_url LIKE 'data:%';

-- 5. Facturas problemáticas (sin PDF)
SELECT 'FACTURAS PROBLEMÁTICAS (SIN PDF):' as info;
SELECT 
  id,
  invoice_number,
  issuer_name,
  created_at
FROM invoice_income 
WHERE pdf_url IS NULL 
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

SELECT '✅ ANÁLISIS DE URLs COMPLETADO' as resultado;







