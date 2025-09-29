-- Script para verificar la restricción de estado en la tabla projects
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'projects'::regclass 
AND conname = 'projects_status_check';

