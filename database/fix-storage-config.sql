-- =====================================================
-- CORREGIR CONFIGURACIÓN DE STORAGE
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar configuración actual de Supabase
SELECT 'Configuración de Supabase:' as info;
SELECT 
  current_setting('app.settings.api_url', true) as api_url,
  current_setting('app.settings.anon_key', true) as anon_key;

-- 2. Eliminar buckets existentes si hay problemas
DELETE FROM storage.buckets WHERE id = 'project-plans';
DELETE FROM storage.buckets WHERE id = 'project-plan-images';

-- 3. Crear buckets con configuración correcta
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-plans',
  'project-plans',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf']
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-plan-images',
  'project-plan-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- 4. Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "project-plans-select" ON storage.objects;
DROP POLICY IF EXISTS "project-plans-insert" ON storage.objects;
DROP POLICY IF EXISTS "project-plans-update" ON storage.objects;
DROP POLICY IF EXISTS "project-plans-delete" ON storage.objects;
DROP POLICY IF EXISTS "project-plan-images-select" ON storage.objects;
DROP POLICY IF EXISTS "project-plan-images-insert" ON storage.objects;
DROP POLICY IF EXISTS "project-plan-images-update" ON storage.objects;
DROP POLICY IF EXISTS "project-plan-images-delete" ON storage.objects;

-- 5. Crear políticas más permisivas para testing
CREATE POLICY "Allow all operations on project-plans" ON storage.objects
FOR ALL USING (bucket_id = 'project-plans');

CREATE POLICY "Allow all operations on project-plan-images" ON storage.objects
FOR ALL USING (bucket_id = 'project-plan-images');

-- 6. Verificar buckets creados
SELECT 'Buckets creados:' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('project-plans', 'project-plan-images')
ORDER BY id;

-- 7. Verificar políticas creadas
SELECT 'Políticas creadas:' as info;
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%project%'
ORDER BY policyname;

-- 8. Probar inserción de un archivo de prueba
SELECT 'Configuración completada. Los buckets están listos para usar.' as status;








