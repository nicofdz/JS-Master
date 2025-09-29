-- =====================================================
-- SOLUCIÓN DEFINITIVA PARA RLS - EJECUTAR EN SUPABASE SQL EDITOR
-- =====================================================

-- 1. FORZAR DESACTIVACIÓN DE RLS EN TODAS LAS TABLAS
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartment_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES (INCLUYENDO LAS QUE PUEDEN ESTAR OCULTAS)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Eliminar todas las políticas de todas las tablas
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('projects', 'floors', 'apartments', 'user_profiles', 'activity_templates', 'apartment_activities', 'teams', 'materials', 'notifications')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 3. VERIFICAR QUE RLS ESTÁ COMPLETAMENTE DESACTIVADO
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '❌ RLS AÚN ACTIVO' 
        ELSE '✅ RLS DESACTIVADO' 
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'floors', 'apartments', 'user_profiles', 'activity_templates', 'apartment_activities', 'teams', 'materials', 'notifications')
ORDER BY tablename;

-- 4. VERIFICAR QUE NO HAY POLÍTICAS RESTANTES
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'floors', 'apartments', 'user_profiles', 'activity_templates', 'apartment_activities', 'teams', 'materials', 'notifications')
ORDER BY tablename, policyname;

-- 5. PROBAR INSERCIÓN DIRECTA EN FLOORS
INSERT INTO public.floors (project_id, floor_number, status, total_apartments, description)
VALUES (1, 999, 'pending', 0, 'Piso de prueba')
ON CONFLICT DO NOTHING;

-- 6. ELIMINAR EL REGISTRO DE PRUEBA
DELETE FROM public.floors WHERE floor_number = 999;

-- 7. MENSAJE FINAL
SELECT '🎉 RLS DESACTIVADO COMPLETAMENTE - Ahora deberías poder crear pisos sin problemas!' as resultado;


