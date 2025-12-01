-- =====================================================
-- ELIMINAR SISTEMA DE FOTOS COMPLETAMENTE
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Eliminar todas las políticas RLS de la tabla task_completion_photos
DROP POLICY IF EXISTS "Authenticated users can view task completion photos" ON public.task_completion_photos;
DROP POLICY IF EXISTS "Authenticated users can upload task completion photos" ON public.task_completion_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.task_completion_photos;
DROP POLICY IF EXISTS "task_completion_photos_select_policy" ON public.task_completion_photos;
DROP POLICY IF EXISTS "task_completion_photos_insert_policy" ON public.task_completion_photos;
DROP POLICY IF EXISTS "task_completion_photos_delete_policy" ON public.task_completion_photos;
DROP POLICY IF EXISTS "Authenticated users can delete task completion photos" ON public.task_completion_photos;

-- 2. Eliminar índices de la tabla task_completion_photos
DROP INDEX IF EXISTS idx_task_completion_photos_task_id;
DROP INDEX IF EXISTS idx_task_completion_photos_uploaded_by;

-- 3. Eliminar la tabla task_completion_photos
DROP TABLE IF EXISTS public.task_completion_photos CASCADE;

-- 4. Eliminar el bucket de storage task-photos
-- Nota: Esto eliminará TODOS los archivos en el bucket
DELETE FROM storage.buckets WHERE id = 'task-photos';

-- 5. Eliminar políticas del bucket (si existen)
DROP POLICY IF EXISTS "task-photos-select-policy" ON storage.objects;
DROP POLICY IF EXISTS "task-photos-insert-policy" ON storage.objects;
DROP POLICY IF EXISTS "task-photos-update-policy" ON storage.objects;
DROP POLICY IF EXISTS "task-photos-delete-policy" ON storage.objects;

-- 6. Verificar que se eliminó todo
SELECT 'Verificación de eliminación:' as info;

-- Verificar que la tabla no existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_completion_photos' AND table_schema = 'public')
    THEN '❌ La tabla task_completion_photos aún existe'
    ELSE '✅ La tabla task_completion_photos fue eliminada'
  END as tabla_status;

-- Verificar que el bucket no existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'task-photos')
    THEN '❌ El bucket task-photos aún existe'
    ELSE '✅ El bucket task-photos fue eliminado'
  END as bucket_status;

-- Mostrar buckets restantes
SELECT 'Buckets restantes:' as info;
SELECT id, name, public FROM storage.buckets;

-- Mostrar tablas restantes relacionadas con tareas
SELECT 'Tablas de tareas restantes:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%task%'
ORDER BY table_name;














<<<<<<< HEAD
=======

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
