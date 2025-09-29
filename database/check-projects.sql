-- =====================================================
-- VERIFICAR PROYECTOS EXISTENTES
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar proyectos existentes
SELECT 'Proyectos existentes:' as info;
SELECT id, name, status, created_at
FROM public.projects
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar si hay proyectos con planos
SELECT 'Proyectos con planos:' as info;
SELECT id, name, plan_pdf, plan_image_url, plan_uploaded_at
FROM public.projects
WHERE plan_pdf IS NOT NULL OR plan_image_url IS NOT NULL
ORDER BY plan_uploaded_at DESC;

-- 3. Contar proyectos por estado
SELECT 'Conteo por estado:' as info;
SELECT status, COUNT(*) as count
FROM public.projects
GROUP BY status
ORDER BY count DESC;








