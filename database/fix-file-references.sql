-- =====================================================
-- ARREGLAR REFERENCIAS DE ARCHIVOS
-- =====================================================

-- 1. Ver archivos reales en storage
SELECT 
  '=== REAL FILES IN STORAGE ===' as section,
  name,
  bucket_id,
  created_at
FROM storage.objects 
WHERE bucket_id = 'task-photos'
AND name LIKE 'task-completion-photos/%'
ORDER BY created_at DESC;

-- 2. Ver referencias actuales en BD
SELECT 
  '=== CURRENT DB REFERENCES ===' as section,
  id,
  task_id,
  file_url,
  file_name
FROM public.task_completion_photos
ORDER BY id;

-- 3. Actualizar referencias para que coincidan con archivos reales
UPDATE public.task_completion_photos 
SET 
  file_name = '12_1758846287292.jpg',
  file_url = 'https://yypydgzcavbeubppzsvh.supabase.co/storage/v1/object/public/task-photos/task-completion-photos/12_1758846287292.jpg'
WHERE id = 5;

UPDATE public.task_completion_photos 
SET 
  file_name = '12_1758845458437.jpg',
  file_url = 'https://yypydgzcavbeubppzsvh.supabase.co/storage/v1/object/public/task-photos/task-completion-photos/12_1758845458437.jpg'
WHERE id = 3;

-- 4. Eliminar referencias que no tienen archivos reales
DELETE FROM public.task_completion_photos 
WHERE file_name = 'icon 2.jpg';

-- 5. Verificar que quedaron las referencias correctas
SELECT 
  '=== UPDATED REFERENCES ===' as section,
  id,
  task_id,
  file_url,
  file_name
FROM public.task_completion_photos
ORDER BY id;

-- 6. Verificar que los archivos ahora existen
SELECT 
  '=== FILE EXISTENCE CHECK ===' as section,
  p.file_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM storage.objects 
      WHERE bucket_id = 'task-photos' 
      AND name = 'task-completion-photos/' || p.file_name
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as file_status
FROM public.task_completion_photos p
ORDER BY p.id;

-- 7. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'REFERENCIAS DE ARCHIVOS ARREGLADAS!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Referencias actualizadas con archivos reales';
    RAISE NOTICE '✅ Referencias incorrectas eliminadas';
    RAISE NOTICE '✅ Las imágenes ahora deberían ser visibles';
    RAISE NOTICE '========================================';
END $$;
