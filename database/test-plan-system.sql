-- =====================================================
-- PROBAR SISTEMA DE PLANOS
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
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%project%'
ORDER BY policyname;

-- 4. Probar inserción de datos de prueba
INSERT INTO public.projects (
  name, 
  address, 
  status, 
  plan_pdf, 
  plan_image_url, 
  plan_uploaded_at
) VALUES (
  'Proyecto de Prueba',
  'Dirección de Prueba',
  'planning',
  'https://example.com/test.pdf',
  'https://example.com/test-image.png',
  NOW()
);

-- 5. Verificar inserción
SELECT 'Proyecto de prueba creado:' as info;
SELECT id, name, plan_pdf, plan_image_url, plan_uploaded_at
FROM public.projects 
WHERE name = 'Proyecto de Prueba';

-- 6. Limpiar datos de prueba
DELETE FROM public.projects WHERE name = 'Proyecto de Prueba';

-- 7. Verificar que se eliminó
SELECT 'Datos de prueba eliminados:' as info;
SELECT COUNT(*) as count FROM public.projects WHERE name = 'Proyecto de Prueba';
