-- =====================================================
-- DIAGNÓSTICO Y SOLUCIÓN DE CLAVE FORÁNEA FLOORS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar qué proyectos existen
SELECT 
    id,
    name,
    status,
    created_at
FROM public.projects 
ORDER BY id;

-- 2. Verificar qué pisos existen y sus project_id
SELECT 
    f.id,
    f.project_id,
    f.floor_number,
    f.status,
    p.name as project_name
FROM public.floors f
LEFT JOIN public.projects p ON f.project_id = p.id
ORDER BY f.project_id, f.floor_number;

-- 3. Verificar si hay pisos con project_id que no existen
SELECT 
    f.id,
    f.project_id,
    f.floor_number,
    f.status
FROM public.floors f
WHERE f.project_id NOT IN (SELECT id FROM public.projects);

-- 4. Si hay pisos huérfanos, eliminarlos o asignarlos a un proyecto existente
-- OPCIÓN A: Eliminar pisos huérfanos (CUIDADO: esto eliminará datos)
-- DELETE FROM public.floors WHERE project_id NOT IN (SELECT id FROM public.projects);

-- OPCIÓN B: Asignar pisos huérfanos al primer proyecto disponible
UPDATE public.floors 
SET project_id = (SELECT id FROM public.projects ORDER BY id LIMIT 1)
WHERE project_id NOT IN (SELECT id FROM public.projects);

-- 5. Verificar que la corrección funcionó
SELECT 
    f.id,
    f.project_id,
    f.floor_number,
    f.status,
    p.name as project_name
FROM public.floors f
LEFT JOIN public.projects p ON f.project_id = p.id
ORDER BY f.project_id, f.floor_number;
