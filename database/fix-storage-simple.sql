-- Script SIMPLE para configurar storage sin modificar tablas del sistema
-- Ejecutar en Supabase SQL Editor

-- 1. Crear el bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoices', 'invoices', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- 2. Eliminar políticas existentes (solo las que podemos eliminar)
DROP POLICY IF EXISTS "Upload invoices policy" ON storage.objects;
DROP POLICY IF EXISTS "View invoices policy" ON storage.objects;
DROP POLICY IF EXISTS "Delete invoices policy" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to delete invoices" ON storage.objects;

-- 3. Crear políticas muy permisivas
CREATE POLICY "Allow everyone to upload to invoices" ON storage.objects
FOR INSERT 
WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Allow everyone to view invoices" ON storage.objects
FOR SELECT 
USING (bucket_id = 'invoices');

CREATE POLICY "Allow everyone to delete invoices" ON storage.objects
FOR DELETE 
USING (bucket_id = 'invoices');

-- 4. Asegurar que el bucket es público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'invoices';

-- 5. Verificar configuración
SELECT 
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'invoices';

-- 6. Verificar políticas
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage' 
  AND policyname LIKE '%invoice%';











