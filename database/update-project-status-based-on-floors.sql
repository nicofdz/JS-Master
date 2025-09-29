-- Script para actualizar el estado de proyectos basado en el estado de sus pisos
-- Lógica: 
-- - "Activo" si tiene al menos un piso en progreso
-- - "Planificación" si no tiene pisos en progreso (todos pendientes o completados)

-- Función para actualizar el estado de un proyecto específico
CREATE OR REPLACE FUNCTION update_project_status_from_floors(project_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    floors_in_progress INTEGER;
    total_floors INTEGER;
    new_status TEXT;
BEGIN
    -- Contar pisos en progreso para este proyecto
    SELECT COUNT(*) INTO floors_in_progress
    FROM floors 
    WHERE project_id = project_id_param 
    AND status = 'in-progress';
    
    -- Contar total de pisos para este proyecto
    SELECT COUNT(*) INTO total_floors
    FROM floors 
    WHERE project_id = project_id_param;
    
    -- Determinar el nuevo estado
    IF total_floors = 0 THEN
        -- Si no hay pisos, mantener en planificación
        new_status := 'planning';
    ELSIF floors_in_progress > 0 THEN
        -- Si hay al menos un piso en progreso, activo
        new_status := 'active';
    ELSE
        -- Si no hay pisos en progreso, planificación
        new_status := 'planning';
    END IF;
    
    -- Actualizar el estado del proyecto
    UPDATE projects 
    SET status = new_status,
        updated_at = NOW()
    WHERE id = project_id_param;
    
    RAISE NOTICE 'Proyecto % actualizado a estado: % (pisos en progreso: %, total pisos: %)', 
        project_id_param, new_status, floors_in_progress, total_floors;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente el estado del proyecto cuando cambie un piso
CREATE OR REPLACE FUNCTION trigger_update_project_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar el proyecto del piso que cambió
    PERFORM update_project_status_from_floors(COALESCE(NEW.project_id, OLD.project_id));
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger en la tabla floors
DROP TRIGGER IF EXISTS trigger_update_project_status ON floors;
CREATE TRIGGER trigger_update_project_status
    AFTER INSERT OR UPDATE OR DELETE ON floors
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_project_status();

-- Función para actualizar todos los proyectos
CREATE OR REPLACE FUNCTION update_all_project_statuses()
RETURNS VOID AS $$
DECLARE
    project_record RECORD;
BEGIN
    -- Iterar sobre todos los proyectos
    FOR project_record IN 
        SELECT id FROM projects
    LOOP
        -- Actualizar el estado de cada proyecto
        PERFORM update_project_status_from_floors(project_record.id);
    END LOOP;
    
    RAISE NOTICE 'Todos los estados de proyectos han sido actualizados';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la actualización inicial de todos los proyectos
SELECT update_all_project_statuses();

