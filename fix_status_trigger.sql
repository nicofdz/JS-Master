CREATE OR REPLACE FUNCTION public.update_task_status_from_assignments()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_total_assignments INTEGER;
  v_completed_assignments INTEGER;
  v_working_assignments INTEGER;
  v_new_status VARCHAR(50);
  v_task_id INTEGER;
  v_current_status VARCHAR(50);
BEGIN
  -- Obtener task_id (puede venir de NEW o OLD dependiendo de la operación)
  v_task_id := COALESCE(NEW.task_id, OLD.task_id);
  
  -- Obtener estado actual
  SELECT status INTO v_current_status FROM tasks WHERE id = v_task_id;
  
  -- Contar asignaciones activas (no removidas ni eliminadas)
  SELECT 
    COUNT(*) FILTER (WHERE assignment_status NOT IN ('removed')),
    COUNT(*) FILTER (WHERE assignment_status = 'completed'),
    COUNT(*) FILTER (WHERE assignment_status = 'working')
  INTO v_total_assignments, v_completed_assignments, v_working_assignments
  FROM task_assignments
  WHERE task_id = v_task_id
    AND is_deleted = false;
  
  -- Determinar nuevo estado de la tarea (Lógica original)
  IF v_total_assignments = 0 THEN
    v_new_status := 'pending';
  ELSIF v_completed_assignments = v_total_assignments AND v_total_assignments > 0 THEN
    -- Todas las asignaciones completadas → tarea completada
    v_new_status := 'completed';
  ELSIF v_working_assignments > 0 THEN
    v_new_status := 'in_progress';
  ELSE
    v_new_status := 'pending';
  END IF;
  
  -- [FIX] Si la tarea ya está completada, NO cambiarla automáticamente a pending/in_progress
  -- Esto evita que al asignar un nuevo trabajador (assignment_status='assigned') 
  -- la tarea "lista" se vuelva a "pendiente".
  IF v_current_status = 'completed' AND v_new_status != 'completed' THEN
     v_new_status := 'completed';
  END IF;

  -- Actualizar tarea solo si cambió el estado
  UPDATE tasks
  SET 
    status = v_new_status,
    completed_at = CASE 
      WHEN v_new_status = 'completed' AND completed_at IS NULL 
      THEN now() 
      ELSE completed_at 
    END,
    updated_at = now()
  WHERE id = v_task_id
    AND status IS DISTINCT FROM v_new_status;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

COMMENT ON FUNCTION public.update_task_status_from_assignments IS 'Actualiza el estado de la tarea según sus asignaciones. FIX: Respeta el estado "completed" manual o previo al agregar nuevos trabajadores.';
