-- =====================================================
-- DIAGNÓSTICO DIRECTO DEL PROBLEMA
-- =====================================================

-- 1. ¿Existe la tabla task_completion_photos?
SELECT 
  'TABLE EXISTS' as check_type,
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'task_completion_photos' 
AND table_schema = 'public';

-- 2. ¿Existe el bucket task-photos?
SELECT 
  'BUCKET EXISTS' as check_type,
  id,
  name,
  public
FROM storage.buckets 
WHERE id = 'task-photos';

-- 3. ¿Hay fotos en la base de datos?
SELECT 
  'PHOTOS IN DB' as check_type,
  COUNT(*) as total_photos
FROM public.task_completion_photos;

-- 4. ¿Hay archivos en el storage?
SELECT 
  'FILES IN STORAGE' as check_type,
  COUNT(*) as total_files
FROM storage.objects 
WHERE bucket_id = 'task-photos';

-- 5. ¿Hay tareas completadas?
SELECT 
  'COMPLETED TASKS' as check_type,
  COUNT(*) as total_completed
FROM public.apartment_tasks 
WHERE status = 'completed';

-- 6. ¿Las políticas RLS están bien?
SELECT 
  'RLS POLICIES' as check_type,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'task_completion_photos' 
AND schemaname = 'public';
