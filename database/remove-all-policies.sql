-- =====================================================
-- ELIMINAR TODAS LAS POLÍTICAS DE RLS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. ELIMINAR POLÍTICAS DE FLOORS
DROP POLICY IF EXISTS "Allow authenticated users to delete floors" ON public.floors;
DROP POLICY IF EXISTS "Allow authenticated users to insert floors" ON public.floors;
DROP POLICY IF EXISTS "Allow authenticated users to update floors" ON public.floors;
DROP POLICY IF EXISTS "Allow authenticated users to view floors" ON public.floors;

-- 2. ELIMINAR POLÍTICAS DE PROJECTS
DROP POLICY IF EXISTS "Allow authenticated users to delete projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated users to insert projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated users to update projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated users to view projects" ON public.projects;

-- 3. ELIMINAR POLÍTICAS DE APARTMENTS
DROP POLICY IF EXISTS "Allow authenticated users to delete apartments" ON public.apartments;
DROP POLICY IF EXISTS "Allow authenticated users to insert apartments" ON public.apartments;
DROP POLICY IF EXISTS "Allow authenticated users to update apartments" ON public.apartments;
DROP POLICY IF EXISTS "Allow authenticated users to view apartments" ON public.apartments;

-- 4. ELIMINAR POLÍTICAS DE APARTMENT_ACTIVITIES
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.apartment_activities;
DROP POLICY IF EXISTS "Workers can update their activities" ON public.apartment_activities;
DROP POLICY IF EXISTS "Allow authenticated users to delete apartment_activities" ON public.apartment_activities;
DROP POLICY IF EXISTS "Allow authenticated users to insert apartment_activities" ON public.apartment_activities;
DROP POLICY IF EXISTS "Allow authenticated users to update apartment_activities" ON public.apartment_activities;
DROP POLICY IF EXISTS "Allow authenticated users to view apartment_activities" ON public.apartment_activities;

-- 5. ELIMINAR POLÍTICAS DE MATERIALS
DROP POLICY IF EXISTS "Allow authenticated users to delete materials" ON public.materials;
DROP POLICY IF EXISTS "Allow authenticated users to insert materials" ON public.materials;
DROP POLICY IF EXISTS "Allow authenticated users to update materials" ON public.materials;
DROP POLICY IF EXISTS "Allow authenticated users to view materials" ON public.materials;

-- 6. ELIMINAR POLÍTICAS DE NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated users to delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated users to update notifications" ON public.notifications;

-- 7. ELIMINAR POLÍTICAS DE USER_PROFILES
DROP POLICY IF EXISTS "Allow users to insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow users to view own profile" ON public.user_profiles;

-- 8. ELIMINAR POLÍTICAS DE TEAMS
DROP POLICY IF EXISTS "Allow authenticated users to delete teams" ON public.teams;
DROP POLICY IF EXISTS "Allow authenticated users to insert teams" ON public.teams;
DROP POLICY IF EXISTS "Allow authenticated users to update teams" ON public.teams;
DROP POLICY IF EXISTS "Allow authenticated users to view teams" ON public.teams;

-- 9. ELIMINAR POLÍTICAS DE ACTIVITY_TEMPLATES
DROP POLICY IF EXISTS "Allow authenticated users to delete activity_templates" ON public.activity_templates;
DROP POLICY IF EXISTS "Allow authenticated users to insert activity_templates" ON public.activity_templates;
DROP POLICY IF EXISTS "Allow authenticated users to update activity_templates" ON public.activity_templates;
DROP POLICY IF EXISTS "Allow authenticated users to view activity_templates" ON public.activity_templates;

-- 10. VERIFICAR QUE NO QUEDAN POLÍTICAS
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'floors', 'apartments', 'user_profiles', 'activity_templates', 'apartment_activities', 'teams', 'materials', 'notifications')
ORDER BY tablename, policyname;

-- 11. MENSAJE DE CONFIRMACIÓN
SELECT '🎉 TODAS LAS POLÍTICAS ELIMINADAS - Ahora deberías poder crear pisos sin problemas!' as resultado;


