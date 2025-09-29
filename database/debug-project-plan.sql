-- =====================================================
-- DEBUG DEL SISTEMA DE PLANOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar proyecto específico
SELECT 'Proyecto ID 25:' as info;
SELECT 
  id, 
  name, 
  plan_pdf, 
  plan_image_url, 
  plan_uploaded_at,
  CASE 
    WHEN plan_pdf = plan_image_url THEN 'URLs iguales'
    WHEN plan_pdf IS NULL AND plan_image_url IS NULL THEN 'Sin planos'
    WHEN plan_pdf IS NOT NULL AND plan_image_url IS NULL THEN 'Solo PDF'
    WHEN plan_pdf IS NULL AND plan_image_url IS NOT NULL THEN 'Solo imagen'
    ELSE 'PDF e imagen diferentes'
  END as estado_planos
FROM public.projects
WHERE id = 25;

-- 2. Verificar archivos en storage
SELECT 'Archivos en project-plans:' as info;
SELECT bucket_id, name, created_at, updated_at
FROM storage.objects
WHERE bucket_id = 'project-plans'
ORDER BY created_at DESC
LIMIT 5;

SELECT 'Archivos en project-plan-images:' as info;
SELECT bucket_id, name, created_at, updated_at
FROM storage.objects
WHERE bucket_id = 'project-plan-images'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verificar buckets
SELECT 'Buckets de storage:' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('project-plans', 'project-plan-images')
ORDER BY id;

-- 4. Verificar políticas RLS
SELECT 'Políticas RLS:' as info;
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%project%'
ORDER BY policyname;

-- 5. Verificar todos los proyectos con planos
SELECT 'Todos los proyectos con planos:' as info;
SELECT 
  id, 
  name, 
  plan_pdf IS NOT NULL as tiene_pdf,
  plan_image_url IS NOT NULL as tiene_imagen,
  plan_pdf = plan_image_url as urls_iguales,
  plan_uploaded_at
FROM public.projects
WHERE plan_pdf IS NOT NULL OR plan_image_url IS NOT NULL
ORDER BY plan_uploaded_at DESC;








