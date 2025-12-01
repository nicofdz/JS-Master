-- Script para corregir las políticas de storage del bucket 'invoices'
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si el bucket existe
SELECT name, public FROM storage.buckets WHERE name = 'invoices';

-- 2. Si el bucket no existe, crearlo
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoices', 'invoices', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 3. Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Allow authenticated users to upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete invoices" ON storage.objects;

-- 4. Crear nuevas políticas para el bucket invoices
CREATE POLICY "Allow authenticated users to upload invoices" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Allow authenticated users to view invoices" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'invoices');

CREATE POLICY "Allow authenticated users to delete invoices" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'invoices');

-- 5. Verificar las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- 6. Verificar que el bucket es público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'invoices';

-- 7. Mostrar información del bucket
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at
FROM storage.buckets 
WHERE id = 'invoices';











