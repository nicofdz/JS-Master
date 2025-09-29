-- =====================================================
-- DIAGNÓSTICO COMPLETO DEL PROBLEMA DE STORAGE
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar configuración de Supabase
SELECT '=== CONFIGURACIÓN DE SUPABASE ===' as info;
SELECT 
  current_setting('app.settings.api_url', true) as api_url,
  current_setting('app.settings.anon_key', true) as anon_key;

-- 2. Verificar que los campos de planos existen en la tabla projects
SELECT '=== CAMPOS DE PLANOS EN PROJECTS ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
AND column_name IN ('plan_pdf', 'plan_image_url', 'plan_uploaded_at')
ORDER BY column_name;

-- 3. Verificar buckets de storage
SELECT '=== BUCKETS DE STORAGE ===' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
FROM storage.buckets
WHERE id IN ('project-plans', 'project-plan-images')
ORDER BY id;

-- 4. Verificar políticas RLS
SELECT '=== POLÍTICAS RLS ===' as info;
SELECT policyname, cmd, permissive, roles, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%project%'
ORDER BY policyname;

-- 5. Verificar si hay archivos en storage
SELECT '=== ARCHIVOS EN STORAGE ===' as info;
SELECT bucket_id, name, created_at, updated_at
FROM storage.objects
WHERE bucket_id IN ('project-plans', 'project-plan-images')
ORDER BY created_at DESC
LIMIT 10;

-- 6. Probar inserción de un proyecto con planos
SELECT '=== PROBANDO INSERCIÓN DE PROYECTO CON PLANOS ===' as info;
INSERT INTO public.projects (
  name, 
  address, 
  status, 
  plan_pdf, 
  plan_image_url, 
  plan_uploaded_at
) VALUES (
  'Proyecto Test Planos',
  'Dirección Test',
  'planning',
  'https://test.com/test.pdf',
  'https://test.com/test-image.png',
  NOW()
);

-- 7. Verificar que se insertó correctamente
SELECT '=== PROYECTO INSERTADO ===' as info;
SELECT id, name, plan_pdf, plan_image_url, plan_uploaded_at
FROM public.projects 
WHERE name = 'Proyecto Test Planos';

-- 8. Limpiar datos de prueba
DELETE FROM public.projects WHERE name = 'Proyecto Test Planos';

-- 9. Verificar configuración de storage settings
SELECT '=== CONFIGURACIÓN DE STORAGE ===' as info;
SELECT 
  current_setting('storage.settings.max_file_size', true) as max_file_size,
  current_setting('storage.settings.allowed_mime_types', true) as allowed_mime_types;

-- 10. Verificar permisos de storage
SELECT '=== PERMISOS DE STORAGE ===' as info;
SELECT 
  has_table_privilege('authenticated', 'storage.objects', 'SELECT') as can_select,
  has_table_privilege('authenticated', 'storage.objects', 'INSERT') as can_insert,
  has_table_privilege('authenticated', 'storage.objects', 'UPDATE') as can_update,
  has_table_privilege('authenticated', 'storage.objects', 'DELETE') as can_delete;