-- =====================================================
-- SCRIPT PARA ARREGLAR SOLO LAS POLÍTICAS DEL STORAGE
-- =====================================================

-- 1. Eliminar TODAS las políticas existentes del storage
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

-- 2. Crear políticas RLS para el storage (nuevas y simples)
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

-- 3. Verificar que las políticas se crearon
SELECT 
  'Storage Policies Created' as check_type,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%task_photos%';

-- 4. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'POLÍTICAS DEL STORAGE ARREGLADAS!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Políticas RLS configuradas';
    RAISE NOTICE '✅ Usuarios autenticados pueden:';
    RAISE NOTICE '   - Subir imágenes a task-photos';
    RAISE NOTICE '   - Ver imágenes de task-photos';
    RAISE NOTICE '   - Eliminar imágenes de task-photos';
    RAISE NOTICE '========================================';
END $$;
