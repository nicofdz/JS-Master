-- =====================================================
-- DESACTIVAR TRIGGERS DE AUDITORÍA
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. DESACTIVAR TRIGGER DE AUDITORÍA EN FLOORS
DROP TRIGGER IF EXISTS audit_floors ON public.floors;

-- 2. DESACTIVAR TRIGGER DE AUDITORÍA EN PROJECTS
DROP TRIGGER IF EXISTS audit_projects ON public.projects;

-- 3. DESACTIVAR TRIGGER DE AUDITORÍA EN APARTMENTS
DROP TRIGGER IF EXISTS audit_apartments ON public.apartments;

-- 4. VERIFICAR TRIGGERS ACTIVOS
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE 'audit_%'
ORDER BY trigger_name;

-- 5. MENSAJE DE CONFIRMACIÓN
SELECT '🎉 TRIGGERS DE AUDITORÍA DESACTIVADOS - Ahora deberías poder crear pisos sin problemas!' as resultado;


