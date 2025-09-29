-- =====================================================
-- SCRIPT SEGURO PARA ARREGLAR EL BUCKET (SIN ELIMINAR)
-- =====================================================

-- 1. Verificar el estado actual del bucket
SELECT 
  'Current Bucket Status' as check_type,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'task-photos';

-- 2. Verificar archivos existentes en el bucket
SELECT 
  'Files in Bucket' as check_type,
  name,
  bucket_id,
  created_at
FROM storage.objects 
WHERE bucket_id = 'task-photos'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Actualizar configuración del bucket (sin eliminarlo)
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
WHERE id = 'task-photos';

-- 4. Eliminar TODAS las políticas existentes del storage (si existen)
DO $$
BEGIN
    -- Eliminar políticas del storage.objects
    DROP POLICY IF EXISTS "task_photos_select_policy" ON storage.objects;
    DROP POLICY IF EXISTS "task_photos_insert_policy" ON storage.objects;
    DROP POLICY IF EXISTS "task_photos_delete_policy" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can view task photos" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload task photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own task photos" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete task photos" ON storage.objects;
    
    RAISE NOTICE 'Políticas existentes eliminadas de storage.objects';
END $$;

-- 5. Crear políticas RLS para el storage (nuevas y simples)
CREATE POLICY "task_photos_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'task-photos' AND auth.role() = 'authenticated');

CREATE POLICY "task_photos_insert_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'task-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "task_photos_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'task-photos' 
  AND auth.role() = 'authenticated'
);

-- 6. Verificar que el bucket se actualizó correctamente
SELECT 
  'Updated Bucket Status' as check_type,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'task-photos';

-- 7. Verificar políticas creadas
SELECT 
  'Storage Policies Created' as check_type,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%task_photos%';

-- 8. Verificar registros en task_completion_photos
SELECT 
  'Database Records' as check_type,
  id,
  task_id,
  file_url,
  file_name,
  file_size,
  uploaded_at
FROM public.task_completion_photos
ORDER BY uploaded_at DESC
LIMIT 5;

-- 9. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'BUCKET DE STORAGE ARREGLADO EXITOSAMENTE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Bucket task-photos actualizado';
    RAISE NOTICE '✅ Bucket configurado como público';
    RAISE NOTICE '✅ Límite de 10MB por archivo';
    RAISE NOTICE '✅ Tipos de archivo permitidos: jpeg, jpg, png, webp';
    RAISE NOTICE '✅ Políticas RLS configuradas';
    RAISE NOTICE '✅ Archivos existentes preservados';
    RAISE NOTICE '✅ Usuarios autenticados pueden:';
    RAISE NOTICE '   - Subir imágenes a task-photos';
    RAISE NOTICE '   - Ver imágenes de task-photos';
    RAISE NOTICE '   - Eliminar imágenes de task-photos';
    RAISE NOTICE '========================================';
END $$;
