-- Script para calcular el progreso de proyectos basado en tareas reales
-- Lógica: Progreso = (Tareas completadas / Total de tareas) × 100

-- Función para calcular el progreso de un proyecto específico
CREATE OR REPLACE FUNCTION calculate_project_progress(project_id_param INTEGER)
RETURNS TABLE(
    total_tasks INTEGER,
    completed_tasks INTEGER,
    progress_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_tasks,
        COUNT(CASE WHEN at.status = 'completed' THEN 1 END)::INTEGER as completed_tasks,
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(
                (COUNT(CASE WHEN at.status = 'completed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
                2
            )
        END as progress_percentage
    FROM apartment_tasks at
    INNER JOIN apartments a ON at.apartment_id = a.id
    INNER JOIN floors f ON a.floor_id = f.id
    WHERE f.project_id = project_id_param;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar el progreso de todos los proyectos
CREATE OR REPLACE FUNCTION update_all_project_progress()
RETURNS VOID AS $$
DECLARE
    project_record RECORD;
    progress_data RECORD;
BEGIN
    -- Iterar sobre todos los proyectos
    FOR project_record IN 
        SELECT id FROM projects
    LOOP
        -- Calcular el progreso del proyecto
        SELECT * INTO progress_data
        FROM calculate_project_progress(project_record.id);
        
        -- Actualizar la tabla projects con el progreso calculado
        UPDATE projects 
        SET 
            progress_percentage = progress_data.progress_percentage,
            updated_at = NOW()
        WHERE id = project_record.id;
        
        RAISE NOTICE 'Proyecto % actualizado: % tareas completadas de % total (%%%)', 
            project_record.id, 
            progress_data.completed_tasks, 
            progress_data.total_tasks, 
            progress_data.progress_percentage;
    END LOOP;
    
    RAISE NOTICE 'Progreso de todos los proyectos actualizado';
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente el progreso cuando cambien las tareas
CREATE OR REPLACE FUNCTION trigger_update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
    project_id_to_update INTEGER;
BEGIN
    -- Obtener el project_id del apartamento afectado
    IF TG_OP = 'DELETE' THEN
        SELECT f.project_id INTO project_id_to_update
        FROM apartments a
        INNER JOIN floors f ON a.floor_id = f.id
        WHERE a.id = OLD.apartment_id;
    ELSE
        SELECT f.project_id INTO project_id_to_update
        FROM apartments a
        INNER JOIN floors f ON a.floor_id = f.id
        WHERE a.id = COALESCE(NEW.apartment_id, OLD.apartment_id);
    END IF;
    
    -- Actualizar el progreso del proyecto
    IF project_id_to_update IS NOT NULL THEN
        UPDATE projects 
        SET 
            progress_percentage = (
                SELECT 
                    CASE 
                        WHEN COUNT(*) = 0 THEN 0
                        ELSE ROUND(
                            (COUNT(CASE WHEN at.status = 'completed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
                            2
                        )
                    END
                FROM apartment_tasks at
                INNER JOIN apartments a ON at.apartment_id = a.id
                INNER JOIN floors f ON a.floor_id = f.id
                WHERE f.project_id = project_id_to_update
            ),
            updated_at = NOW()
        WHERE id = project_id_to_update;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger en la tabla apartment_tasks
DROP TRIGGER IF EXISTS trigger_update_project_progress ON apartment_tasks;
CREATE TRIGGER trigger_update_project_progress
    AFTER INSERT OR UPDATE OR DELETE ON apartment_tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_project_progress();

-- Ejecutar la actualización inicial de todos los proyectos
SELECT update_all_project_progress();

