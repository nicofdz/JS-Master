-- =====================================================
-- ACTUALIZAR restore_task PARA INCLUIR MATERIALES
-- =====================================================

-- Actualizar la función para restaurar también materiales asociados
CREATE OR REPLACE FUNCTION public.restore_task(p_task_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_role VARCHAR(50);
  v_assignments_count INTEGER;
  v_materials_count INTEGER;
BEGIN
  -- 1. Verificar que el usuario es admin
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden restaurar tareas eliminadas';
  END IF;
  
  -- 2. Validar que la tarea existe
  IF NOT EXISTS(SELECT 1 FROM tasks WHERE id = p_task_id) THEN
    RAISE EXCEPTION 'La tarea con ID % no existe', p_task_id;
  END IF;
  
  -- 3. Verificar que está eliminada
  IF NOT EXISTS(SELECT 1 FROM tasks WHERE id = p_task_id AND is_deleted = true) THEN
    RAISE EXCEPTION 'La tarea no está eliminada';
  END IF;
  
  -- 4. Restaurar la tarea
  UPDATE tasks
  SET 
    is_deleted = false,
    deleted_at = NULL,
    deleted_by = NULL,
    deletion_reason = NULL,
    updated_at = now()
  WHERE id = p_task_id;
  
  -- 5. Restaurar todas las asignaciones
  UPDATE task_assignments
  SET 
    is_deleted = false,
    deleted_at = NULL,
    deleted_by = NULL,
    deletion_reason = NULL,
    updated_at = now()
  WHERE task_id = p_task_id;
  
  GET DIAGNOSTICS v_assignments_count = ROW_COUNT;
  
  -- 6. ✅ NUEVO: Restaurar materiales asociados a las asignaciones
  UPDATE task_assignment_materials tam
  SET 
    is_deleted = false,
    deleted_at = NULL,
    updated_at = now()
  FROM task_assignments ta
  WHERE tam.task_assignment_id = ta.id
    AND ta.task_id = p_task_id
    AND tam.is_deleted = true;
  
  GET DIAGNOSTICS v_materials_count = ROW_COUNT;
  
  RAISE NOTICE 'Tarea % restaurada junto con % asignaciones y % materiales asociados', 
    p_task_id, v_assignments_count, v_materials_count;
END;
$function$;

-- Comentario actualizado
COMMENT ON FUNCTION public.restore_task IS 'Restaura una tarea eliminada (soft delete) junto con sus asignaciones y materiales asociados. Solo disponible para administradores.';

