-- Script para agregar el estado 'blocked' a la restricción de la tabla projects
-- Primero verificamos la restricción actual
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'projects'::regclass 
AND conname = 'projects_status_check';

-- Eliminamos la restricción actual
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Creamos la nueva restricción que incluye 'blocked'
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
CHECK (status IN ('planning', 'active', 'completed', 'blocked'));

-- Verificamos que la nueva restricción se creó correctamente
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'projects'::regclass 
AND conname = 'projects_status_check';

