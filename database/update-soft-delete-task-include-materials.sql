-- =====================================================
-- ACTUALIZAR soft_delete_task PARA INCLUIR MATERIALES
-- =====================================================

-- Actualizar la función para hacer soft delete de materiales asociados
CREATE OR REPLACE FUNCTION public.soft_delete_task(
  p_task_id integer, 
  p_deletion_reason text DEFAULT NULL::text
)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_has_payments BOOLEAN;
  v_assignments_count INTEGER;
  v_materials_count INTEGER;
BEGIN
  -- 1. Validar que la tarea existe
  IF NOT EXISTS(SELECT 1 FROM tasks WHERE id = p_task_id) THEN
    RAISE EXCEPTION 'La tarea con ID % no existe', p_task_id;
  END IF;
  
  -- 2. Verificar si ya está eliminada
  IF EXISTS(SELECT 1 FROM tasks WHERE id = p_task_id AND is_deleted = true) THEN
    RAISE EXCEPTION 'La tarea ya está eliminada';
  END IF;
  
  -- 3. Verificar si tiene pagos asociados
  SELECT EXISTS(
    SELECT 1 
    FROM payment_task_assignments pta
    INNER JOIN task_assignments ta ON ta.id = pta.task_assignment_id
    WHERE ta.task_id = p_task_id
  ) INTO v_has_payments;
  
  IF v_has_payments THEN
    RAISE EXCEPTION 'No se puede eliminar la tarea porque tiene pagos asociados. Use eliminación permanente después de revisar los pagos.';
  END IF;
  
  -- 4. Soft delete de la tarea
  UPDATE tasks
  SET 
    is_deleted = true,
    deleted_at = now(),
    deleted_by = auth.uid(),
    deletion_reason = p_deletion_reason,
    updated_at = now()
  WHERE id = p_task_id;
  
  -- 5. Soft delete de todas las asignaciones
  UPDATE task_assignments
  SET 
    is_deleted = true,
    deleted_at = now(),
    deleted_by = auth.uid(),
    deletion_reason = COALESCE(p_deletion_reason, 'Eliminada junto con tarea'),
    updated_at = now()
  WHERE task_id = p_task_id;
  
  GET DIAGNOSTICS v_assignments_count = ROW_COUNT;
  
  -- 6. ✅ NUEVO: Soft delete de materiales asociados a las asignaciones
  UPDATE task_assignment_materials tam
  SET 
    is_deleted = true,
    deleted_at = now(),
    updated_at = now()
  FROM task_assignments ta
  WHERE tam.task_assignment_id = ta.id
    AND ta.task_id = p_task_id
    AND tam.is_deleted = false;
  
  GET DIAGNOSTICS v_materials_count = ROW_COUNT;
  
  RAISE NOTICE 'Tarea % eliminada (soft delete) junto con % asignaciones y % materiales asociados', 
    p_task_id, v_assignments_count, v_materials_count;
END;
$function$;

-- Comentario actualizado
COMMENT ON FUNCTION public.soft_delete_task IS 'Elimina una tarea (soft delete) junto con sus asignaciones y materiales asociados. No elimina fotos de progreso para mantener auditoría.';

