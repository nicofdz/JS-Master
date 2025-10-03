-- =====================================================
-- CONFIGURAR BUCKETS DE STORAGE
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Eliminar buckets existentes si hay problemas
DELETE FROM storage.buckets WHERE id = 'project-plans';
DELETE FROM storage.buckets WHERE id = 'project-plan-images';

-- 2. Crear bucket para PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-plans',
  'project-plans',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf']
);

-- 3. Crear bucket para imágenes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-plan-images',
  'project-plan-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- 4. Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow all operations on project-plans" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations on project-plan-images" ON storage.objects;

-- 5. Crear políticas permisivas
CREATE POLICY "Allow all operations on project-plans" ON storage.objects
FOR ALL USING (bucket_id = 'project-plans');

CREATE POLICY "Allow all operations on project-plan-images" ON storage.objects
FOR ALL USING (bucket_id = 'project-plan-images');

-- 6. Verificar configuración
SELECT 'Configuración completada:' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('project-plans', 'project-plan-images')
ORDER BY id;















