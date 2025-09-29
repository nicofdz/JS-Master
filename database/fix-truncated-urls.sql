-- =====================================================
-- ARREGLAR URLs TRUNCADAS
-- =====================================================

-- 1. Ver las URLs actuales (truncadas)
SELECT 
  '=== CURRENT URLS ===' as section,
  id,
  task_id,
  file_url,
  file_name
FROM public.task_completion_photos
ORDER BY id;

-- 2. Actualizar las URLs truncadas
UPDATE public.task_completion_photos 
SET file_url = CONCAT(
  'https://yypydgzcavbeubppzsvh.supabase.co/storage/v1/object/public/task-photos/task-completion-photos/',
  file_name
)
WHERE file_url LIKE '%/public/ta%';

-- 3. Verificar que se actualizaron
SELECT 
  '=== UPDATED URLS ===' as section,
  id,
  task_id,
  file_url,
  file_name
FROM public.task_completion_photos
ORDER BY id;

-- 4. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'URLs TRUNCADAS ARREGLADAS!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ URLs actualizadas con rutas completas';
    RAISE NOTICE '✅ Las imágenes ahora deberían ser visibles';
    RAISE NOTICE '========================================';
END $$;
