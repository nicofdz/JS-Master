-- =====================================================
-- SCRIPT COMPLETO PARA ARREGLAR EL BUCKET DE STORAGE
-- =====================================================

-- 1. Eliminar bucket existente si hay problemas
DELETE FROM storage.buckets WHERE id = 'task-photos';

-- 2. Crear bucket nuevo con configuración correcta
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-photos',
  'task-photos',
  true,  -- Público para que las imágenes sean accesibles
  10485760, -- 10MB en bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- 3. Eliminar TODAS las políticas existentes del storage
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

-- 4. Crear políticas RLS para el storage (nuevas y simples)
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

-- 5. Verificar que el bucket se creó correctamente
SELECT 
  'Bucket created successfully' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'task-photos';

-- 6. Verificar políticas creadas
SELECT 
  'Storage policies created' as status,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%task_photos%';

-- 7. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'BUCKET DE STORAGE CONFIGURADO EXITOSAMENTE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Bucket task-photos creado';
    RAISE NOTICE '✅ Bucket configurado como público';
    RAISE NOTICE '✅ Límite de 10MB por archivo';
    RAISE NOTICE '✅ Tipos de archivo permitidos: jpeg, jpg, png, webp';
    RAISE NOTICE '✅ Políticas RLS configuradas';
    RAISE NOTICE '✅ Usuarios autenticados pueden:';
    RAISE NOTICE '   - Subir imágenes a task-photos';
    RAISE NOTICE '   - Ver imágenes de task-photos';
    RAISE NOTICE '   - Eliminar imágenes de task-photos';
    RAISE NOTICE '========================================';
END $$;
