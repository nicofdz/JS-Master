-- =====================================================
-- VERIFICAR Y CORREGIR CONFIGURACIÓN DE BUCKETS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar buckets existentes
SELECT 'Buckets existentes:' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
FROM storage.buckets
WHERE id IN ('project-plans', 'project-plan-images')
ORDER BY id;

-- 2. Eliminar buckets si existen para recrearlos
DELETE FROM storage.buckets WHERE id = 'project-plans';
DELETE FROM storage.buckets WHERE id = 'project-plan-images';

-- 3. Crear bucket para planos PDF con configuración correcta
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-plans',
  'project-plans',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf']
);

-- 4. Crear bucket para imágenes de planos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-plan-images',
  'project-plan-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- 5. Eliminar políticas existentes
DROP POLICY IF EXISTS "Authenticated users can view project plans" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload project plans" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update project plans" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete project plans" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view project plan images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload project plan images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update project plan images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete project plan images" ON storage.objects;

-- 6. Crear políticas RLS para project-plans
CREATE POLICY "project-plans-select" ON storage.objects
FOR SELECT USING (bucket_id = 'project-plans');

CREATE POLICY "project-plans-insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'project-plans');

CREATE POLICY "project-plans-update" ON storage.objects
FOR UPDATE USING (bucket_id = 'project-plans');

CREATE POLICY "project-plans-delete" ON storage.objects
FOR DELETE USING (bucket_id = 'project-plans');

-- 7. Crear políticas RLS para project-plan-images
CREATE POLICY "project-plan-images-select" ON storage.objects
FOR SELECT USING (bucket_id = 'project-plan-images');

CREATE POLICY "project-plan-images-insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'project-plan-images');

CREATE POLICY "project-plan-images-update" ON storage.objects
FOR UPDATE USING (bucket_id = 'project-plan-images');

CREATE POLICY "project-plan-images-delete" ON storage.objects
FOR DELETE USING (bucket_id = 'project-plan-images');

-- 8. Verificar configuración final
SELECT 'Configuración final:' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('project-plans', 'project-plan-images')
ORDER BY id;

-- 9. Verificar políticas creadas
SELECT 'Políticas creadas:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%project%'
ORDER BY policyname;














