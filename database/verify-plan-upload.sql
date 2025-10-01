-- =====================================================
-- VERIFICAR SISTEMA DE SUBIDA DE PLANOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar que los campos existen en la tabla projects
SELECT 'Campos de planos en projects:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
AND column_name IN ('plan_pdf', 'plan_image_url', 'plan_uploaded_at')
ORDER BY column_name;

-- 2. Verificar buckets de storage
SELECT 'Buckets de storage:' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('project-plans', 'project-plan-images')
ORDER BY id;

-- 3. Verificar políticas RLS
SELECT 'Políticas RLS:' as info;
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%project%'
ORDER BY policyname;

-- 4. Verificar proyectos con planos
SELECT 'Proyectos con planos:' as info;
SELECT id, name, plan_pdf, plan_image_url, plan_uploaded_at
FROM public.projects
WHERE plan_pdf IS NOT NULL OR plan_image_url IS NOT NULL
ORDER BY plan_uploaded_at DESC
LIMIT 5;

-- 5. Verificar archivos en storage
SELECT 'Archivos en storage:' as info;
SELECT bucket_id, name, created_at
FROM storage.objects
WHERE bucket_id IN ('project-plans', 'project-plan-images')
ORDER BY created_at DESC
LIMIT 5;










