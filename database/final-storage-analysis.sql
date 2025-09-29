-- =====================================================
-- ANÁLISIS FINAL DEL STORAGE (SIN ERRORES)
-- =====================================================

-- 1. VERIFICAR BUCKET Y CONFIGURACIÓN
SELECT 
  '=== BUCKET STATUS ===' as section,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'task-photos';

-- 2. VERIFICAR ARCHIVOS EN STORAGE
SELECT 
  '=== FILES IN STORAGE ===' as section,
  name,
  bucket_id,
  created_at
FROM storage.objects 
WHERE bucket_id = 'task-photos'
ORDER BY created_at DESC;

-- 3. VERIFICAR REGISTROS EN BASE DE DATOS
SELECT 
  '=== PHOTOS IN DATABASE ===' as section,
  id,
  task_id,
  file_url,
  file_name,
  file_size,
  uploaded_at
FROM public.task_completion_photos
ORDER BY uploaded_at DESC;

-- 4. VERIFICAR TAREAS COMPLETADAS
SELECT 
  '=== COMPLETED TASKS ===' as section,
  t.id,
  t.task_name,
  t.status,
  COUNT(p.id) as photo_count
FROM public.apartment_tasks t
LEFT JOIN public.task_completion_photos p ON t.id = p.task_id
WHERE t.status = 'completed'
GROUP BY t.id, t.task_name, t.status
ORDER BY t.id DESC;

-- 5. VERIFICAR POLÍTICAS RLS DEL STORAGE
SELECT 
  '=== STORAGE POLICIES ===' as section,
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 6. VERIFICAR POLÍTICAS RLS DE LA TABLA
SELECT 
  '=== TABLE POLICIES ===' as section,
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'task_completion_photos' 
AND schemaname = 'public'
ORDER BY policyname;

-- 7. VERIFICAR ESTRUCTURA DE LA TABLA
SELECT 
  '=== TABLE STRUCTURE ===' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'task_completion_photos' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. VERIFICAR RLS HABILITADO (SIN forcerowsecurity)
SELECT 
  '=== RLS STATUS ===' as section,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('task_completion_photos', 'objects')
AND schemaname IN ('public', 'storage');

-- 9. VERIFICAR USUARIO ACTUAL Y PERMISOS
SELECT 
  '=== USER PERMISSIONS ===' as section,
  current_user,
  session_user,
  current_database(),
  current_schema();

-- 10. VERIFICAR VERSIÓN DE POSTGRESQL
SELECT 
  '=== SYSTEM INFO ===' as section,
  version() as postgres_version;
