-- =====================================================
-- DESACTIVAR RLS EN TABLA AUDIT_LOG
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. DESACTIVAR RLS EN AUDIT_LOG
ALTER TABLE public.audit_log DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR POLÍTICAS DE AUDIT_LOG
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;

-- 3. VERIFICAR QUE NO QUEDAN POLÍTICAS
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'audit_log'
ORDER BY tablename, policyname;

-- 4. VERIFICAR ESTADO DE RLS
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
AND tablename = 'audit_log';

-- 5. MENSAJE DE CONFIRMACIÓN
SELECT '🎉 RLS DESACTIVADO EN AUDIT_LOG - Ahora deberías poder crear pisos sin problemas!' as resultado;


