-- =====================================================
-- CREAR BUCKET PARA FOTOS DE PROGRESO DE TAREAS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Crear bucket para fotos de progreso de tareas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-photos',
  'task-photos',
  true,
  10485760, -- 10MB por foto
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Allow authenticated uploads on task-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on task-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete on task-photos" ON storage.objects;

-- 3. Crear políticas de acceso
-- Permitir subida a usuarios autenticados
CREATE POLICY "Allow authenticated uploads on task-photos" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'task-photos');

-- Permitir lectura pública
CREATE POLICY "Allow public read on task-photos" ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'task-photos');

-- Permitir eliminación a usuarios autenticados
CREATE POLICY "Allow authenticated delete on task-photos" ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'task-photos');

-- Permitir actualización a usuarios autenticados
CREATE POLICY "Allow authenticated update on task-photos" ON storage.objects
FOR UPDATE 
TO authenticated
USING (bucket_id = 'task-photos');

-- 4. Verificar configuración
SELECT 'Bucket de fotos de tareas creado exitosamente' as info;
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'task-photos';

