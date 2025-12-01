-- =====================================================
-- CONFIGURAR BUCKET DE STORAGE PARA FACTURAS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar buckets existentes
SELECT 'BUCKETS EXISTENTES:' as info;
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE name IN ('invoices', 'project-plans', 'project-plan-images')
ORDER BY name;

-- 2. Crear bucket 'invoices' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices', 
  true,
  52428800, -- 50MB en bytes
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) 
DO UPDATE SET
  allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  public = true,
  file_size_limit = 52428800;

-- 3. Eliminar políticas existentes que puedan causar conflictos
DROP POLICY IF EXISTS "Allow authenticated users to upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete invoices" ON storage.objects;
DROP POLICY IF EXISTS "invoices_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "invoices_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "invoices_delete_policy" ON storage.objects;

-- 4. Crear políticas RLS para el bucket 'invoices'
-- Política para UPLOAD (INSERT)
CREATE POLICY "invoices_upload_policy" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);

-- Política para READ (SELECT) - Acceso público
CREATE POLICY "invoices_read_policy" ON storage.objects
FOR SELECT 
USING (bucket_id = 'invoices');

-- Política para DELETE
CREATE POLICY "invoices_delete_policy" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);

-- Política para UPDATE
CREATE POLICY "invoices_update_policy" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);

-- 5. Verificar configuración final
SELECT 'CONFIGURACIÓN FINAL DEL BUCKET INVOICES:' as info;
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE name = 'invoices';

-- 6. Verificar políticas creadas
SELECT 'POLÍTICAS CREADAS:' as info;
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%invoices%'
ORDER BY policyname;

-- 7. Verificar que RLS está habilitado
SELECT 'RLS STATUS:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

SELECT '✅ CONFIGURACIÓN DE STORAGE COMPLETADA' as resultado;







