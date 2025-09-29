-- =====================================================
-- DIAGNÓSTICO COMPLETO DE RLS - EJECUTAR EN SUPABASE SQL EDITOR
-- =====================================================

-- 1. VERIFICAR ESTADO DE RLS EN TODAS LAS TABLAS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '🔴 RLS ACTIVO' 
        ELSE '🟢 RLS DESACTIVADO' 
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'floors', 'apartments', 'user_profiles', 'activity_templates', 'apartment_activities', 'teams', 'materials', 'notifications')
ORDER BY tablename;

-- 2. VERIFICAR POLÍTICAS EXISTENTES
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'floors', 'apartments', 'user_profiles', 'activity_templates', 'apartment_activities', 'teams', 'materials', 'notifications')
ORDER BY tablename, policyname;

-- 3. VERIFICAR PERMISOS DE USUARIO ACTUAL
SELECT 
    current_user as usuario_actual,
    session_user as usuario_sesion,
    auth.uid() as user_id_autenticado;

-- 4. VERIFICAR SI HAY RESTRICCIONES EN LA TABLA FLOORS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'floors'
ORDER BY ordinal_position;

-- 5. VERIFICAR TRIGGERS EN LA TABLA FLOORS
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
AND event_object_table = 'floors';

-- 6. VERIFICAR CONSTRAINTS EN LA TABLA FLOORS
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name = 'floors';


