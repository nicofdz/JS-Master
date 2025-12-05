-- Fix for incorrectly named column in validate_task_deletion trigger function
-- Previous code used 'assignment_id' which does not exist in payment_task_assignments
-- Correct column is 'task_assignment_id'

CREATE OR REPLACE FUNCTION validate_task_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_has_payments BOOLEAN;
BEGIN
  -- Verificar si tiene pagos asociados
  SELECT EXISTS(
    SELECT 1 
    FROM payment_task_assignments pta
    INNER JOIN task_assignments ta ON ta.id = pta.task_assignment_id -- Fixed column name from assignment_id
    WHERE ta.task_id = OLD.id
  ) INTO v_has_payments;
  
  IF v_has_payments THEN
    RAISE EXCEPTION 'No se puede eliminar permanentemente la tarea porque tiene pagos asociados';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Fix for incorrectly named column in handle_payment_soft_delete function
-- Same error: used 'assignment_id' instead of 'task_assignment_id'

CREATE OR REPLACE FUNCTION handle_payment_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se está marcando como eliminado
  IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
    
    -- Marcar todas las asignaciones de este pago como no pagadas
    UPDATE task_assignments ta
    SET 
      is_paid = false,
      updated_at = now()
    FROM payment_task_assignments pta
    WHERE pta.payment_id = NEW.id
      AND pta.task_assignment_id = ta.id; -- Fixed column name from assignment_id
    
    RAISE NOTICE 'Asignaciones del pago % marcadas como no pagadas', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
