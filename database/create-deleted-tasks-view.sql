-- =====================================================
-- CREAR VISTA DE TAREAS ELIMINADAS
-- =====================================================

-- Vista para obtener tareas eliminadas con información completa
CREATE OR REPLACE VIEW deleted_tasks_view AS
SELECT 
  t.id,
  t.task_name,
  t.task_category,
  t.task_description,
  t.status,
  t.priority,
  t.total_budget,
  t.start_date,
  t.end_date,
  t.completed_at,
  t.deleted_at,
  t.deletion_reason,
  t.progress_photos,
  t.notes,
  t.created_at,
  t.updated_at,
  -- Información de ubicación
  a.apartment_number,
  f.floor_number,
  tw.tower_number,
  p.name AS project_name,
  p.id AS project_id,
  -- Información de quién eliminó
  up.full_name AS deleted_by_name,
  t.deleted_by,
  -- Contadores
  (SELECT COUNT(*) FROM task_assignments ta WHERE ta.task_id = t.id AND ta.is_deleted = false) AS active_assignments_count,
  (SELECT COUNT(*) FROM task_assignments ta WHERE ta.task_id = t.id AND ta.is_deleted = true) AS deleted_assignments_count
FROM tasks t
LEFT JOIN apartments a ON t.apartment_id = a.id
LEFT JOIN floors f ON a.floor_id = f.id
LEFT JOIN towers tw ON f.tower_id = tw.id
LEFT JOIN projects p ON f.project_id = p.id
LEFT JOIN user_profiles up ON t.deleted_by = up.id
WHERE t.is_deleted = true
ORDER BY t.deleted_at DESC;

-- Comentario
COMMENT ON VIEW deleted_tasks_view IS 'Vista de tareas eliminadas (soft delete) con información completa para la papelera';

