-- =====================================================
-- CORRECCIÓN DE RLS PARA SISTEMA DE CONTROL DE TERMINACIONES
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. VERIFICAR ESTADO ACTUAL DE RLS
-- =====================================================

-- Verificar si RLS está habilitado en las tablas principales
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'floors', 'apartments', 'user_profiles')
ORDER BY tablename;

-- =====================================================
-- 2. DESHABILITAR RLS TEMPORALMENTE PARA DEBUGGING
-- =====================================================

-- Deshabilitar RLS en tablas principales para permitir acceso
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CREAR POLÍTICAS RLS CORRECTAS
-- =====================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Admins and supervisors can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can view floors" ON public.floors;
DROP POLICY IF EXISTS "Supervisors can manage floors and apartments" ON public.floors;
DROP POLICY IF EXISTS "Authenticated users can view apartments" ON public.apartments;
DROP POLICY IF EXISTS "Supervisors can manage apartments" ON public.apartments;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

-- =====================================================
-- 4. HABILITAR RLS NUEVAMENTE
-- =====================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREAR POLÍTICAS RLS SIMPLIFICADAS
-- =====================================================

-- Políticas para proyectos - permitir acceso a usuarios autenticados
CREATE POLICY "Allow authenticated users to view projects" ON public.projects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert projects" ON public.projects
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update projects" ON public.projects
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete projects" ON public.projects
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para pisos
CREATE POLICY "Allow authenticated users to view floors" ON public.floors
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert floors" ON public.floors
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update floors" ON public.floors
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete floors" ON public.floors
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para apartamentos
CREATE POLICY "Allow authenticated users to view apartments" ON public.apartments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert apartments" ON public.apartments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update apartments" ON public.apartments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete apartments" ON public.apartments
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para perfiles de usuario
CREATE POLICY "Allow users to view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow users to update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow users to insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 6. VERIFICAR POLÍTICAS CREADAS
-- =====================================================

-- Verificar políticas creadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'floors', 'apartments', 'user_profiles')
ORDER BY tablename, policyname;

-- =====================================================
-- 7. MENSAJE DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'RLS corregido exitosamente!';
    RAISE NOTICE 'Políticas simplificadas creadas para todas las tablas';
    RAISE NOTICE 'Acceso permitido para usuarios autenticados';
END $$;

