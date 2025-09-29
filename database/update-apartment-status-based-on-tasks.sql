-- =====================================================
-- FUNCIÓN PARA ACTUALIZAR STATUS DE APARTAMENTO BASADO EN TAREAS
-- =====================================================

-- Función para actualizar el status de un apartamento basado en sus tareas
CREATE OR REPLACE FUNCTION update_apartment_status_from_tasks()
RETURNS TRIGGER AS $$
DECLARE
    apartment_id INTEGER;
    total_tasks INTEGER;
    completed_tasks INTEGER;
    in_progress_tasks INTEGER;
    new_status VARCHAR(50);
BEGIN
    -- Obtener el apartment_id del trigger
    IF TG_OP = 'DELETE' THEN
        apartment_id := OLD.apartment_id;
    ELSE
        apartment_id := NEW.apartment_id;
    END IF;

    -- Contar tareas del apartamento
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress
    INTO total_tasks, completed_tasks, in_progress_tasks
    FROM apartment_tasks 
    WHERE apartment_id = update_apartment_status_from_tasks.apartment_id;

    -- Determinar el nuevo status
    IF total_tasks = 0 THEN
        new_status := 'pending';
    ELSIF completed_tasks = total_tasks THEN
        new_status := 'completed';
    ELSIF in_progress_tasks > 0 THEN
        new_status := 'in-progress';
    ELSE
        new_status := 'pending';
    END IF;

    -- Actualizar el status del apartamento
    UPDATE apartments 
    SET status = new_status, updated_at = NOW()
    WHERE id = apartment_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar automáticamente el status
DROP TRIGGER IF EXISTS trigger_update_apartment_status ON apartment_tasks;

CREATE TRIGGER trigger_update_apartment_status
    AFTER INSERT OR UPDATE OR DELETE ON apartment_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_apartment_status_from_tasks();

-- Función para actualizar todos los apartamentos existentes
CREATE OR REPLACE FUNCTION update_all_apartment_statuses()
RETURNS void AS $$
DECLARE
    apartment_record RECORD;
    total_tasks INTEGER;
    completed_tasks INTEGER;
    in_progress_tasks INTEGER;
    new_status VARCHAR(50);
BEGIN
    FOR apartment_record IN 
        SELECT id FROM apartments
    LOOP
        -- Contar tareas del apartamento
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress
        INTO total_tasks, completed_tasks, in_progress_tasks
        FROM apartment_tasks 
        WHERE apartment_id = apartment_record.id;

        -- Determinar el nuevo status
        IF total_tasks = 0 THEN
            new_status := 'pending';
        ELSIF completed_tasks = total_tasks THEN
            new_status := 'completed';
        ELSIF in_progress_tasks > 0 THEN
            new_status := 'in-progress';
        ELSE
            new_status := 'pending';
        END IF;

        -- Actualizar el status del apartamento
        UPDATE apartments 
        SET status = new_status, updated_at = NOW()
        WHERE id = apartment_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la actualización para todos los apartamentos existentes
SELECT update_all_apartment_statuses();
