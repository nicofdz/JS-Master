-- =====================================================
-- VERIFICACIÓN RÁPIDA DE STORAGE
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar que los campos de planos existen
SELECT 'Campos de planos en projects:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
AND column_name IN ('plan_pdf', 'plan_image_url', 'plan_uploaded_at')
ORDER BY column_name;

-- 2. Verificar buckets
SELECT 'Buckets de storage:' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('project-plans', 'project-plan-images')
ORDER BY id;

-- 3. Verificar políticas
SELECT 'Políticas RLS:' as info;
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%project%'
ORDER BY policyname;

-- 4. Verificar archivos existentes
SELECT 'Archivos en storage:' as info;
SELECT bucket_id, name, created_at
FROM storage.objects
WHERE bucket_id IN ('project-plans', 'project-plan-images')
ORDER BY created_at DESC
LIMIT 5;














