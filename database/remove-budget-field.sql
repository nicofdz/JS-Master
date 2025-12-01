-- =====================================================
-- ELIMINAR CAMPO BUDGET DE LA TABLA PROJECTS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar si el campo budget existe
SELECT 'Verificando campo budget:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
AND column_name = 'budget';

-- 2. Eliminar el campo budget si existe
ALTER TABLE public.projects DROP COLUMN IF EXISTS budget;

-- 3. Verificar que el campo fue eliminado
SELECT 'Verificación de eliminación:' as info;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND table_schema = 'public'
      AND column_name = 'budget'
    )
    THEN '❌ El campo budget aún existe'
    ELSE '✅ El campo budget fue eliminado correctamente'
  END as budget_field_status;

-- 4. Mostrar estructura actual de la tabla projects
SELECT 'Estructura actual de la tabla projects:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
ORDER BY ordinal_position;














<<<<<<< HEAD
=======

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
