-- =====================================================
-- TRIGGER PARA ESTABLECER started_at Y completed_at EN task_assignments
-- =====================================================
-- Este trigger establece automáticamente:
-- - started_at cuando assignment_status cambia a 'working'
-- - completed_at cuando assignment_status cambia a 'completed'
-- =====================================================

-- Función trigger para actualizar timestamps de asignaciones
CREATE OR REPLACE FUNCTION update_assignment_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Establecer started_at cuando assignment_status cambia a 'working'
    IF NEW.assignment_status = 'working' AND (OLD.assignment_status IS NULL OR OLD.assignment_status != 'working') THEN
        IF NEW.started_at IS NULL THEN
            NEW.started_at := NOW();
        END IF;
    END IF;
    
    -- Establecer completed_at cuando assignment_status cambia a 'completed'
    IF NEW.assignment_status = 'completed' AND (OLD.assignment_status IS NULL OR OLD.assignment_status != 'completed') THEN
        IF NEW.completed_at IS NULL THEN
            NEW.completed_at := NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_update_assignment_timestamps ON task_assignments;

CREATE TRIGGER trigger_update_assignment_timestamps
    BEFORE UPDATE ON task_assignments
    FOR EACH ROW
    WHEN (OLD.assignment_status IS DISTINCT FROM NEW.assignment_status)
    EXECUTE FUNCTION update_assignment_timestamps();

-- Comentario
COMMENT ON FUNCTION update_assignment_timestamps() IS 'Establece automáticamente started_at y completed_at cuando cambia el assignment_status';

