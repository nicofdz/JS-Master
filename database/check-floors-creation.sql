-- Script para verificar la creación automática de pisos
-- Ejecutar en Supabase SQL Editor

-- 1. Ver todos los pisos con su proyecto
SELECT 
    f.id,
    f.floor_number,
    f.status,
    p.name as project_name,
    p.total_floors
FROM floors f
JOIN projects p ON f.project_id = p.id
ORDER BY p.name, f.floor_number;

-- 2. Contar pisos por proyecto
SELECT 
    p.name as project_name,
    p.total_floors as expected_floors,
    COUNT(f.id) as actual_floors
FROM projects p
LEFT JOIN floors f ON p.id = f.project_id
GROUP BY p.id, p.name, p.total_floors
ORDER BY p.name;

-- 3. Verificar si hay proyectos sin pisos
SELECT 
    p.name,
    p.total_floors,
    COUNT(f.id) as floors_created
FROM projects p
LEFT JOIN floors f ON p.id = f.project_id
GROUP BY p.id, p.name, p.total_floors
HAVING COUNT(f.id) = 0 AND p.total_floors > 0;

