-- =====================================================
-- SCRIPT SIMPLE PARA VERIFICAR EL STORAGE (ARREGLADO)
-- =====================================================

-- 1. Verificar que el bucket existe
SELECT 
  'Bucket Status' as check_type,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'task-photos';

-- 2. Verificar archivos en el bucket (sin columna size)
SELECT 
  'Files in Bucket' as check_type,
  name,
  bucket_id,
  created_at
FROM storage.objects 
WHERE bucket_id = 'task-photos'
ORDER BY created_at DESC;

-- 3. Verificar registros en la base de datos
SELECT 
  'Photos in Database' as check_type,
  id,
  task_id,
  file_url,
  file_name,
  file_size,
  uploaded_at
FROM public.task_completion_photos
ORDER BY uploaded_at DESC;

-- 4. Verificar tareas completadas
SELECT 
  'Completed Tasks' as check_type,
  t.id,
  t.task_name,
  t.status,
  COUNT(p.id) as photo_count
FROM public.apartment_tasks t
LEFT JOIN public.task_completion_photos p ON t.id = p.task_id
WHERE t.status = 'completed'
GROUP BY t.id, t.task_name, t.status
ORDER BY t.id DESC;

-- 5. Verificar políticas del storage
SELECT 
  'Storage Policies' as check_type,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%task_photos%';
