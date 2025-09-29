-- =====================================================
-- SCRIPT DE PRUEBA PARA VERIFICAR EL STORAGE
-- =====================================================

-- 1. Verificar que el bucket existe y está configurado correctamente
SELECT 
  'Bucket Status' as check_type,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'task-photos';

-- 2. Verificar políticas del storage
SELECT 
  'Storage Policies' as check_type,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 3. Verificar si hay archivos en el bucket
SELECT 
  'Files in Bucket' as check_type,
  name,
  bucket_id,
  size,
  created_at,
  updated_at
FROM storage.objects 
WHERE bucket_id = 'task-photos'
ORDER BY created_at DESC;

-- 4. Verificar registros en task_completion_photos
SELECT 
  'Database Records' as check_type,
  id,
  task_id,
  file_url,
  file_name,
  file_size,
  uploaded_at
FROM public.task_completion_photos
ORDER BY uploaded_at DESC;

-- 5. Verificar tareas completadas
SELECT 
  'Completed Tasks' as check_type,
  t.id,
  t.task_name,
  t.status,
  t.completed_at,
  COUNT(p.id) as photo_count
FROM public.apartment_tasks t
LEFT JOIN public.task_completion_photos p ON t.id = p.task_id
WHERE t.status = 'completed'
GROUP BY t.id, t.task_name, t.status, t.completed_at
ORDER BY t.completed_at DESC;

-- 6. Verificar permisos del usuario actual
SELECT 
  'User Permissions' as check_type,
  current_user,
  session_user,
  current_database(),
  current_schema();

-- 7. Verificar RLS en las tablas relevantes
SELECT 
  'RLS Status' as check_type,
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables 
WHERE tablename IN ('task_completion_photos', 'objects')
AND schemaname IN ('public', 'storage');

-- 8. Verificar políticas RLS específicas
SELECT 
  'RLS Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('task_completion_photos', 'objects')
AND schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;
