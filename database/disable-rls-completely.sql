-- =====================================================
-- DESACTIVAR RLS COMPLETAMENTE - EJECUTAR EN SUPABASE SQL EDITOR
-- =====================================================

-- DESACTIVAR RLS EN TODAS LAS TABLAS
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartment_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Admins and supervisors can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can view floors" ON public.floors;
DROP POLICY IF EXISTS "Supervisors can manage floors and apartments" ON public.floors;
DROP POLICY IF EXISTS "Authenticated users can view apartments" ON public.apartments;
DROP POLICY IF EXISTS "Supervisors can manage apartments" ON public.apartments;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view activity_templates" ON public.activity_templates;
DROP POLICY IF EXISTS "Admins and supervisors can manage activity_templates" ON public.activity_templates;
DROP POLICY IF EXISTS "Authenticated users can view apartment_activities" ON public.apartment_activities;
DROP POLICY IF EXISTS "Admins and supervisors can manage apartment_activities" ON public.apartment_activities;
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;
DROP POLICY IF EXISTS "Admins and supervisors can manage teams" ON public.teams;

-- VERIFICAR QUE RLS ESTÁ DESACTIVADO
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'floors', 'apartments', 'user_profiles', 'activity_templates', 'apartment_activities', 'teams', 'materials', 'notifications')
ORDER BY tablename;

-- MENSAJE DE CONFIRMACIÓN
SELECT 'RLS desactivado completamente - Ahora puedes crear pisos sin problemas!' as status;

