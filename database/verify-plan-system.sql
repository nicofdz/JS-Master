-- =====================================================
-- VERIFICAR SISTEMA DE PLANOS (VERSIÓN SIMPLE)
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

-- 4. Verificar que los campos están en la tabla projects
SELECT 'Estructura de la tabla projects:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
ORDER BY ordinal_position;















