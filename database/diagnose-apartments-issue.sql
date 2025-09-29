-- Diagnóstico completo del problema de apartamentos

-- 1. Verificar estructura de la tabla apartments
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'apartments' 
ORDER BY ordinal_position;

-- 2. Verificar estructura de la tabla floors
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'floors' 
ORDER BY ordinal_position;

-- 3. Verificar estructura de la tabla projects
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;

-- 4. Verificar relaciones entre tablas
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name = 'apartments' OR tc.table_name = 'floors')
ORDER BY tc.table_name, kcu.column_name;

-- 5. Verificar datos de ejemplo
SELECT 
    a.id,
    a.apartment_number,
    a.floor_id,
    f.floor_number,
    f.project_id,
    p.name as project_name
FROM apartments a
LEFT JOIN floors f ON a.floor_id = f.id
LEFT JOIN projects p ON f.project_id = p.id
LIMIT 5;

