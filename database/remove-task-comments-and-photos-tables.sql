-- =====================================================
-- ELIMINAR TABLAS task_comments Y task_completion_photos
-- =====================================================
-- Estas tablas ya no se utilizan en el sistema
-- =====================================================

-- =====================================================
-- 1. ELIMINAR task_comments
-- =====================================================

-- Eliminar todas las políticas RLS de task_comments
DO $$
DECLARE
    policy_name_var TEXT;
BEGIN
    FOR policy_name_var IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'task_comments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.task_comments', policy_name_var);
        RAISE NOTICE 'Política % eliminada de task_comments', policy_name_var;
    END LOOP;
END $$;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS trigger_update_task_comments_updated_at ON public.task_comments;

-- Eliminar función del trigger si no se usa en otro lugar
-- (Verificar primero si se usa en otras tablas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_update_task_comments_updated_at'
        AND event_object_table != 'task_comments'
    ) THEN
        DROP FUNCTION IF EXISTS update_task_comments_updated_at() CASCADE;
        RAISE NOTICE 'Función update_task_comments_updated_at eliminada';
    END IF;
END $$;

-- Eliminar índices de task_comments
DROP INDEX IF EXISTS idx_task_comments_task_id;
DROP INDEX IF EXISTS idx_task_comments_user_id;
DROP INDEX IF EXISTS idx_task_comments_created_at;

-- Eliminar la tabla task_comments
DROP TABLE IF EXISTS public.task_comments CASCADE;

-- =====================================================
-- 2. ELIMINAR task_completion_photos
-- =====================================================

-- Eliminar todas las políticas RLS de task_completion_photos
DO $$
DECLARE
    policy_name_var TEXT;
BEGIN
    FOR policy_name_var IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'task_completion_photos'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.task_completion_photos', policy_name_var);
        RAISE NOTICE 'Política % eliminada de task_completion_photos', policy_name_var;
    END LOOP;
END $$;

-- Eliminar índices de task_completion_photos
DROP INDEX IF EXISTS idx_task_completion_photos_task_id;
DROP INDEX IF EXISTS idx_task_completion_photos_uploaded_by;

-- Eliminar la tabla task_completion_photos
DROP TABLE IF EXISTS public.task_completion_photos CASCADE;

-- =====================================================
-- 3. VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
    -- Verificar task_comments
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'task_comments'
    ) THEN
        RAISE NOTICE '✅ La tabla task_comments fue eliminada exitosamente';
    ELSE
        RAISE WARNING '❌ La tabla task_comments aún existe';
    END IF;

    -- Verificar task_completion_photos
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'task_completion_photos'
    ) THEN
        RAISE NOTICE '✅ La tabla task_completion_photos fue eliminada exitosamente';
    ELSE
        RAISE WARNING '❌ La tabla task_completion_photos aún existe';
    END IF;
END $$;

