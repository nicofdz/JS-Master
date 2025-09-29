-- =====================================================
-- VERIFICAR ESTRUCTURA DE LA TABLA APARTMENT_TASKS
-- =====================================================

-- 1. Verificar estructura de apartment_tasks
SELECT 
  '=== APARTMENT_TASKS STRUCTURE ===' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'apartment_tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar valores permitidos para task_category
SELECT 
  '=== TASK_CATEGORY VALUES ===' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'apartment_tasks' 
AND table_schema = 'public'
AND column_name = 'task_category';

-- 3. Verificar si hay CHECK constraints
SELECT 
  '=== CHECK CONSTRAINTS ===' as section,
  constraint_name,
  check_clause
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public'
AND constraint_name LIKE '%task_category%';

-- 4. Verificar estructura de task_completion_photos
SELECT 
  '=== TASK_COMPLETION_PHOTOS STRUCTURE ===' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'task_completion_photos' 
AND table_schema = 'public'
ORDER BY ordinal_position;
