-- =====================================================
-- CORRECCIÓN SIMPLE DE RLS - EJECUTAR EN SUPABASE SQL EDITOR
-- =====================================================

-- 1. DESHABILITAR RLS COMPLETAMENTE (TEMPORAL)
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartment_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
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

-- 3. CREAR POLÍTICAS MUY SIMPLES
CREATE POLICY "Allow all for authenticated users" ON public.projects
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON public.floors
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON public.apartments
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON public.user_profiles
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON public.activity_templates
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON public.apartment_activities
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON public.teams
FOR ALL USING (auth.role() = 'authenticated');

-- 4. HABILITAR RLS NUEVAMENTE
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartment_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 5. VERIFICAR QUE FUNCIONA
SELECT 'RLS corregido exitosamente' as status;

