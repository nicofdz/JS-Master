-- =====================================================
-- SCRIPT PARA ANALIZAR Y EXPORTAR ESQUEMA DE BASE DE DATOS
-- Ejecutar en Supabase SQL Editor para ver toda la estructura
-- =====================================================

-- =====================================================
-- 1. LISTAR TODAS LAS TABLAS Y SU INFORMACIÓN
-- =====================================================
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '🔴 RLS ACTIVO' 
        ELSE '🟢 RLS DESACTIVADO' 
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- =====================================================
-- 2. VER TODAS LAS COLUMNAS DE CADA TABLA
-- =====================================================
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.character_maximum_length,
    CASE 
        WHEN c.is_nullable = 'NO' THEN 'NOT NULL'
        ELSE 'NULL'
    END as null_constraint
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- =====================================================
-- 3. VER TODAS LAS RELACIONES (FOREIGN KEYS)
-- =====================================================
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- 4. VER TODAS LAS VISTAS (VIEWS)
-- =====================================================
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- =====================================================
-- 5. VER TODAS LAS FUNCIONES
-- =====================================================
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- =====================================================
-- 6. VER TODOS LOS TRIGGERS
-- =====================================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- 7. VER TODAS LAS POLÍTICAS RLS
-- =====================================================
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
ORDER BY tablename, policyname;

-- =====================================================
-- 8. CONTAR REGISTROS EN CADA TABLA
-- =====================================================
DO $$
DECLARE
    r RECORD;
    total_records INTEGER;
BEGIN
    RAISE NOTICE '=== CONTEO DE REGISTROS POR TABLA ===';
    
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', r.table_name) INTO total_records;
        RAISE NOTICE 'Tabla: % | Registros: %', r.table_name, total_records;
    END LOOP;
END $$;

-- =====================================================
-- 9. VER ESTRUCTURA DETALLADA DE TABLAS PRINCIPALES
-- =====================================================

-- Estructura de projects
SELECT 'PROJECTS TABLE STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'projects' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Estructura de floors
SELECT 'FLOORS TABLE STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'floors' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Estructura de apartments
SELECT 'APARTMENTS TABLE STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'apartments' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 10. VER DATOS DE EJEMPLO DE CADA TABLA
-- =====================================================

-- Datos de proyectos
SELECT 'PROJECTS DATA:' as info;
SELECT * FROM public.projects LIMIT 5;

-- Datos de pisos
SELECT 'FLOORS DATA:' as info;
SELECT * FROM public.floors LIMIT 10;

-- Datos de apartamentos
SELECT 'APARTMENTS DATA:' as info;
SELECT * FROM public.apartments LIMIT 10;

-- Datos de equipos
SELECT 'TEAMS DATA:' as info;
SELECT * FROM public.teams LIMIT 5;

-- Datos de plantillas de actividades
SELECT 'ACTIVITY TEMPLATES DATA:' as info;
SELECT * FROM public.activity_templates LIMIT 10;

-- =====================================================
-- 11. VER ESTADÍSTICAS DE USO
-- =====================================================
SELECT 'DATABASE STATISTICS:' as info;

-- Tamaño de la base de datos
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Tamaño de cada tabla
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- 12. VERIFICAR INTEGRIDAD DE DATOS
-- =====================================================
SELECT 'DATA INTEGRITY CHECK:' as info;

-- Verificar proyectos sin pisos
SELECT 'Proyectos sin pisos:' as check_type, COUNT(*) as count
FROM public.projects p
LEFT JOIN public.floors f ON p.id = f.project_id
WHERE f.id IS NULL;

-- Verificar pisos sin apartamentos
SELECT 'Pisos sin apartamentos:' as check_type, COUNT(*) as count
FROM public.floors f
LEFT JOIN public.apartments a ON f.id = a.floor_id
WHERE a.id IS NULL;

-- Verificar apartamentos sin actividades
SELECT 'Apartamentos sin actividades:' as check_type, COUNT(*) as count
FROM public.apartments a
LEFT JOIN public.apartment_activities aa ON a.id = aa.apartment_id
WHERE aa.id IS NULL;

-- =====================================================
-- MENSAJE FINAL
-- =====================================================
SELECT '🎉 ANÁLISIS COMPLETO DE LA BASE DE DATOS FINALIZADO' as resultado;


