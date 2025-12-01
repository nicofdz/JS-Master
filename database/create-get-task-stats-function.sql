-- =====================================================
-- FUNCIÓN: get_task_stats
-- Obtiene estadísticas de tareas por estado
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_task_stats(p_project_id INTEGER DEFAULT NULL)
RETURNS TABLE (
  total_tasks BIGINT,
  pending_tasks BIGINT,
  in_progress_tasks BIGINT,
  completed_tasks BIGINT,
  blocked_tasks BIGINT,
  delayed_tasks BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE is_deleted = FALSE) AS total_tasks,
    COUNT(*) FILTER (WHERE status = 'pending' AND is_deleted = FALSE) AS pending_tasks,
    COUNT(*) FILTER (WHERE status = 'in_progress' AND is_deleted = FALSE) AS in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'completed' AND is_deleted = FALSE) AS completed_tasks,
    COUNT(*) FILTER (WHERE status = 'blocked' AND is_deleted = FALSE) AS blocked_tasks,
    COUNT(*) FILTER (WHERE is_delayed = TRUE AND is_deleted = FALSE) AS delayed_tasks
  FROM public.tasks t
  LEFT JOIN public.apartments a ON t.apartment_id = a.id
  LEFT JOIN public.floors f ON a.floor_id = f.id
  WHERE (p_project_id IS NULL OR f.project_id = p_project_id);
END;
$$;

COMMENT ON FUNCTION public.get_task_stats(INTEGER) IS 'Obtiene estadísticas de tareas agrupadas por estado. Permite filtrar por proyecto.';

