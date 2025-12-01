-- Script para DESHABILITAR RLS en el storage bucket 'invoices'
-- Ejecutar en Supabase SQL Editor

-- 1. Crear el bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoices', 'invoices', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- 2. DESHABILITAR RLS en la tabla storage.objects para el bucket invoices
-- Esto permite acceso libre al bucket sin restricciones de políticas

-- Primero, eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Upload invoices policy" ON storage.objects;
DROP POLICY IF EXISTS "View invoices policy" ON storage.objects;
DROP POLICY IF EXISTS "Delete invoices policy" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to delete invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to invoices bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view their own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON storage.objects;

-- 3. DESHABILITAR RLS en storage.objects
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

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

-- 6. Verificar que RLS está deshabilitado
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'objects' 
  AND schemaname = 'storage';

-- 7. Mostrar que no hay políticas activas
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage';











