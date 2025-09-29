-- Script para verificar el estado de los apartamentos
-- Ejecutar en Supabase SQL Editor

-- 1. Ver todos los apartamentos con su estado actual
SELECT 
    a.id,
    a.apartment_number,
    a.status,
    f.floor_number,
    p.name as project_name
FROM apartments a
JOIN floors f ON a.floor_id = f.id
JOIN projects p ON f.project_id = p.id
ORDER BY p.name, f.floor_number, a.apartment_number;

-- 2. Contar apartamentos por estado
SELECT 
    status,
    COUNT(*) as count
FROM apartments
GROUP BY status
ORDER BY status;

-- 3. Verificar si hay apartamentos sin status
SELECT 
    COUNT(*) as total_apartments,
    COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status,
    COUNT(CASE WHEN status = '' THEN 1 END) as empty_status,
    COUNT(CASE WHEN status IS NOT NULL AND status != '' THEN 1 END) as valid_status
FROM apartments;

