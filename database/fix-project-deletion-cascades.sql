-- Script para verificar y corregir las cascadas de eliminación
-- Cuando se borra un proyecto, debe borrar todo lo relacionado

-- 1. Verificar las cascadas actuales
SELECT 
    'Cascadas actuales:' as info,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name IN ('floors', 'apartments', 'apartment_tasks', 'task_comments')
         OR ccu.table_name = 'projects')
ORDER BY tc.table_name;

-- 2. Eliminar restricciones existentes que no tengan CASCADE
-- (Solo si es necesario, comentado por seguridad)

-- 3. Agregar cascadas correctas si no existen
-- Floors -> Projects (CASCADE)
DO $$
BEGIN
    -- Verificar si la restricción existe y no tiene CASCADE
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'floors' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND rc.delete_rule != 'CASCADE'
    ) THEN
        -- Eliminar restricción antigua
        ALTER TABLE floors DROP CONSTRAINT IF EXISTS floors_project_id_fkey;
        -- Crear nueva con CASCADE
        ALTER TABLE floors ADD CONSTRAINT floors_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Apartments -> Floors (CASCADE)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'apartments' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND rc.delete_rule != 'CASCADE'
    ) THEN
        ALTER TABLE apartments DROP CONSTRAINT IF EXISTS apartments_floor_id_fkey;
        ALTER TABLE apartments ADD CONSTRAINT apartments_floor_id_fkey 
        FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Apartment_tasks -> Apartments (CASCADE)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'apartment_tasks' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND rc.delete_rule != 'CASCADE'
    ) THEN
        ALTER TABLE apartment_tasks DROP CONSTRAINT IF EXISTS apartment_tasks_apartment_id_fkey;
        ALTER TABLE apartment_tasks ADD CONSTRAINT apartment_tasks_apartment_id_fkey 
        FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Task_comments -> Apartment_tasks (CASCADE)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'task_comments' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND rc.delete_rule != 'CASCADE'
    ) THEN
        ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_task_id_fkey;
        ALTER TABLE task_comments ADD CONSTRAINT task_comments_task_id_fkey 
        FOREIGN KEY (task_id) REFERENCES apartment_tasks(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Verificar las cascadas después de los cambios
SELECT 
    'Cascadas después de los cambios:' as info,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name IN ('floors', 'apartments', 'apartment_tasks', 'task_comments')
         OR ccu.table_name = 'projects')
ORDER BY tc.table_name;

