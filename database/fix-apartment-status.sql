-- Script para verificar y corregir el campo status de apartamentos
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar apartamentos sin status
SELECT 
    id, 
    apartment_number, 
    status,
    CASE 
        WHEN status IS NULL THEN 'NULL'
        WHEN status = '' THEN 'EMPTY'
        ELSE 'OK'
    END as status_check
FROM apartments 
WHERE status IS NULL OR status = '';

-- 2. Actualizar apartamentos sin status a 'pending'
UPDATE apartments 
SET status = 'pending' 
WHERE status IS NULL OR status = '';

-- 3. Verificar que todos los apartamentos tengan status
SELECT 
    COUNT(*) as total_apartments,
    COUNT(CASE WHEN status IS NOT NULL AND status != '' THEN 1 END) as with_status,
    COUNT(CASE WHEN status IS NULL OR status = '' THEN 1 END) as without_status
FROM apartments;

