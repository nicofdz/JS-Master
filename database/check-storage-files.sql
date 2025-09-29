-- =====================================================
-- VERIFICAR ARCHIVOS EN STORAGE
-- =====================================================

-- 1. Ver archivos en el bucket
SELECT 
  '=== FILES IN STORAGE ===' as section,
  name,
  bucket_id,
  created_at
FROM storage.objects 
WHERE bucket_id = 'task-photos'
ORDER BY created_at DESC;

-- 2. Verificar si los archivos de la BD existen en storage
SELECT 
  '=== FILE EXISTENCE CHECK ===' as section,
  p.file_name,
  p.file_url,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM storage.objects 
      WHERE bucket_id = 'task-photos' 
      AND name LIKE '%' || p.file_name
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as file_status
FROM public.task_completion_photos p
ORDER BY p.id;
