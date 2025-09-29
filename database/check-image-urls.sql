-- =====================================================
-- SCRIPT PARA VERIFICAR LAS URLs DE LAS IMÁGENES
-- =====================================================

-- 1. Verificar todas las fotos en la base de datos
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

-- 2. Verificar archivos en el storage
SELECT 
  'Files in Storage' as check_type,
  name,
  bucket_id,
  created_at,
  updated_at
FROM storage.objects 
WHERE bucket_id = 'task-photos'
ORDER BY created_at DESC;

-- 3. Verificar si las URLs son accesibles (esto es solo informativo)
SELECT 
  'URL Analysis' as check_type,
  id,
  task_id,
  file_url,
  CASE 
    WHEN file_url LIKE '%task-photos%' THEN 'URL contains bucket name'
    ELSE 'URL does not contain bucket name'
  END as url_status,
  file_name
FROM public.task_completion_photos
ORDER BY uploaded_at DESC;

-- 4. Verificar tareas completadas con fotos
SELECT 
  'Completed Tasks with Photos' as check_type,
  t.id as task_id,
  t.task_name,
  t.status,
  t.completed_at,
  COUNT(p.id) as photo_count,
  STRING_AGG(p.file_url, ', ') as photo_urls
FROM public.apartment_tasks t
LEFT JOIN public.task_completion_photos p ON t.id = p.task_id
WHERE t.status = 'completed'
GROUP BY t.id, t.task_name, t.status, t.completed_at
ORDER BY t.completed_at DESC;

-- 5. Verificar configuración del bucket
SELECT 
  'Bucket Configuration' as check_type,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'task-photos';

-- 6. Verificar políticas del storage
SELECT 
  'Storage Policies' as check_type,
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%task_photos%';
