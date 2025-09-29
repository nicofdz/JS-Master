-- =====================================================
-- ACTUALIZAR STATUS DE PISOS BASADO EN APARTAMENTOS
-- =====================================================

-- Función para actualizar el status de un piso basado en sus apartamentos
CREATE OR REPLACE FUNCTION update_floor_status_from_apartments()
RETURNS TRIGGER AS $$
DECLARE
    target_floor_id INTEGER;
    total_apartments INTEGER;
    completed_apartments INTEGER;
    in_progress_apartments INTEGER;
    new_status VARCHAR(50);
BEGIN
    -- Obtener el floor_id del trigger
    IF TG_OP = 'DELETE' THEN
        target_floor_id := OLD.floor_id;
    ELSE
        target_floor_id := NEW.floor_id;
    END IF;

    -- Contar apartamentos del piso (excluyendo bloqueados)
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress
    INTO total_apartments, completed_apartments, in_progress_apartments
    FROM apartments 
    WHERE floor_id = target_floor_id 
    AND status != 'blocked';

    -- Determinar el nuevo status
    IF total_apartments = 0 THEN
        new_status := 'pending';
    ELSIF completed_apartments = total_apartments THEN
        new_status := 'completed';
    ELSIF in_progress_apartments > 0 OR completed_apartments > 0 THEN
        new_status := 'in-progress';
    ELSE
        new_status := 'pending';
    END IF;

    -- Actualizar el status del piso
    UPDATE floors 
    SET status = new_status, updated_at = NOW()
    WHERE id = target_floor_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar automáticamente el status
DROP TRIGGER IF EXISTS trigger_update_floor_status ON apartments;

CREATE TRIGGER trigger_update_floor_status
    AFTER INSERT OR UPDATE OR DELETE ON apartments
    FOR EACH ROW
    EXECUTE FUNCTION update_floor_status_from_apartments();

-- Función para actualizar todos los pisos existentes
CREATE OR REPLACE FUNCTION update_all_floor_statuses()
RETURNS void AS $$
DECLARE
    floor_record RECORD;
    total_apartments INTEGER;
    completed_apartments INTEGER;
    in_progress_apartments INTEGER;
    new_status VARCHAR(50);
BEGIN
    FOR floor_record IN 
        SELECT id FROM floors
    LOOP
        -- Contar apartamentos del piso (excluyendo bloqueados)
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress
        INTO total_apartments, completed_apartments, in_progress_apartments
        FROM apartments 
        WHERE floor_id = floor_record.id 
        AND status != 'blocked';

        -- Determinar el nuevo status
        IF total_apartments = 0 THEN
            new_status := 'pending';
        ELSIF completed_apartments = total_apartments THEN
            new_status := 'completed';
        ELSIF in_progress_apartments > 0 OR completed_apartments > 0 THEN
            new_status := 'in-progress';
        ELSE
            new_status := 'pending';
        END IF;

        -- Actualizar el status del piso
        UPDATE floors 
        SET status = new_status, updated_at = NOW()
        WHERE id = floor_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la actualización para todos los pisos existentes
SELECT update_all_floor_statuses();
