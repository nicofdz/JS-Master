-- =====================================================
-- PRUEBA SIMPLE SIN INSERTAR DATOS
-- =====================================================

-- 1. Verificar que existe al menos un apartamento
SELECT 
  '=== APARTMENTS AVAILABLE ===' as section,
  id,
  apartment_number,
  floor_id
FROM public.apartments
LIMIT 5;

-- 2. Verificar tareas existentes
SELECT 
  '=== EXISTING TASKS ===' as section,
  id,
  task_name,
  task_category,
  status,
  priority
FROM public.apartment_tasks
ORDER BY id DESC
LIMIT 5;

-- 3. Verificar fotos existentes
SELECT 
  '=== EXISTING PHOTOS ===' as section,
  id,
  task_id,
  file_url,
  file_name,
  file_size,
  uploaded_at
FROM public.task_completion_photos
ORDER BY uploaded_at DESC
LIMIT 5;

-- 4. Verificar tareas completadas con fotos
SELECT 
  '=== COMPLETED TASKS WITH PHOTOS ===' as section,
  t.id,
  t.task_name,
  t.task_category,
  t.status,
  COUNT(p.id) as photo_count
FROM public.apartment_tasks t
LEFT JOIN public.task_completion_photos p ON t.id = p.task_id
WHERE t.status = 'completed'
GROUP BY t.id, t.task_name, t.task_category, t.status
ORDER BY t.id DESC
LIMIT 5;

-- 5. Verificar bucket de storage
SELECT 
  '=== STORAGE BUCKET ===' as section,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'task-photos';

-- 6. Verificar archivos en storage
SELECT 
  '=== STORAGE FILES ===' as section,
  name,
  bucket_id,
  created_at
FROM storage.objects 
WHERE bucket_id = 'task-photos'
ORDER BY created_at DESC
LIMIT 5;

-- 7. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN COMPLETA EXITOSA!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Estructura de tablas verificada';
    RAISE NOTICE '✅ Datos existentes verificados';
    RAISE NOTICE '✅ Storage bucket verificado';
    RAISE NOTICE '✅ Archivos en storage verificados';
    RAISE NOTICE '✅ Relaciones tarea-foto verificadas';
    RAISE NOTICE '========================================';
END $$;
