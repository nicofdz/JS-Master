-- =====================================================
-- ACTUALIZAR calculate_project_progress() PARA USAR tasks V2
-- =====================================================
-- Migración: Cambiar de apartment_tasks a tasks (sistema V2)
-- Fecha: 2024
-- Descripción: Actualiza la función para calcular progreso usando la nueva tabla tasks
--              en lugar de apartment_tasks, incluyendo filtro de soft delete

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
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::INTEGER as completed_tasks,
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(
                (COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
                2
            )
        END as progress_percentage
    FROM tasks t
    INNER JOIN apartments a ON t.apartment_id = a.id
    INNER JOIN floors f ON a.floor_id = f.id
    WHERE f.project_id = project_id_param
      AND t.is_deleted = false      -- Excluir tareas eliminadas (soft delete)
      AND t.status != 'cancelled';   -- Excluir tareas canceladas
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
        SELECT id FROM projects WHERE is_active = true
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

-- Actualizar el trigger para usar tasks en lugar de apartment_tasks
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
                            (COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
                            2
                        )
                    END
                FROM tasks t
                INNER JOIN apartments a ON t.apartment_id = a.id
                INNER JOIN floors f ON a.floor_id = f.id
                WHERE f.project_id = project_id_to_update
                  AND t.is_deleted = false      -- Excluir tareas eliminadas
                  AND t.status != 'cancelled'    -- Excluir tareas canceladas
            ),
            updated_at = NOW()
        WHERE id = project_id_to_update;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Eliminar el trigger antiguo si existe (estaba en apartment_tasks)
DROP TRIGGER IF EXISTS trigger_update_project_progress ON apartment_tasks;

-- Crear el trigger en la tabla tasks (si se necesita actualización automática)
-- NOTA: El trigger se puede crear en tasks si se desea actualización automática
-- cuando cambien las tareas. Por ahora, lo dejamos comentado ya que get_projects_with_progress()
-- calcula el progreso dinámicamente.
-- DROP TRIGGER IF EXISTS trigger_update_project_progress_on_tasks ON tasks;
-- CREATE TRIGGER trigger_update_project_progress_on_tasks
--     AFTER INSERT OR UPDATE OR DELETE ON tasks
--     FOR EACH ROW
--     EXECUTE FUNCTION trigger_update_project_progress();

-- Comentarios actualizados
COMMENT ON FUNCTION calculate_project_progress(INTEGER) IS 
'Calcula el progreso de un proyecto específico usando tasks V2. Excluye tareas eliminadas (soft delete) y canceladas.';

COMMENT ON FUNCTION update_all_project_progress() IS 
'Actualiza el progreso de todos los proyectos activos usando tasks V2.';

