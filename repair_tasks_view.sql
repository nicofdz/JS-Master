-- =====================================================
-- FIX: Repair tasks_with_workers_v2 to include floor tasks
-- =====================================================

DROP VIEW IF EXISTS public.tasks_with_workers_v2 CASCADE;

CREATE OR REPLACE VIEW public.tasks_with_workers_v2 AS
SELECT 
  t.id AS task_id,
  t.apartment_id,
  t.task_name,
  t.task_description,
  t.task_category,
  t.status,
  t.total_budget,
  t.start_date,
  t.end_date,
  t.completed_at,
  t.is_delayed,
  t.delay_reason,
  t.priority,
  t.progress_photos,
  t.notes,
  t.created_at,
  t.updated_at,
  t.actual_duration_minutes,
  t.estimated_hours,
  
  -- Apartment info (can be null for floor tasks)
  a.apartment_number,
  
  -- Floor info (from task directly or via apartment)
  f.id AS floor_id,
  f.floor_number,
  
  -- Tower info
  tw.id AS tower_id,
  tw.tower_number,
  
  -- Project info
  p.id AS project_id,
  p.name AS project_name,
  
  -- Worker counts
  COUNT(DISTINCT ta.id) AS total_workers,
  COUNT(DISTINCT CASE WHEN ta.completed_at IS NOT NULL THEN ta.id END) AS completed_workers,
  COUNT(DISTINCT CASE WHEN ta.is_paid = TRUE THEN ta.id END) AS paid_workers,
  
  -- Workers array as JSON
  COALESCE(
    json_agg(
      CASE 
        WHEN ta.id IS NOT NULL THEN
          json_build_object(
            'assignment_id', ta.id,
            'id', w.id,
            'full_name', w.full_name,
            'role', ta.role,
            'payment_share_percentage', ta.payment_share_percentage,
            'worker_payment', ta.worker_payment,
            'assignment_status', ta.assignment_status,
            'started_at', ta.started_at,
            'completed_at', ta.completed_at,
            'is_paid', ta.is_paid,
            'contract_type', w.contract_type
          )
        ELSE NULL
      END
    ) FILTER (WHERE ta.id IS NOT NULL),
    '[]'::json
  ) AS workers
  
FROM tasks t
-- LEFT JOIN because apartment_id might be NULL for floor tasks
LEFT JOIN apartments a ON t.apartment_id = a.id
-- JOIN floors using either direct floor_id or apartment's floor_id
INNER JOIN floors f ON f.id = COALESCE(t.floor_id, a.floor_id)
INNER JOIN towers tw ON f.tower_id = tw.id
INNER JOIN projects p ON tw.project_id = p.id
LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.is_deleted = FALSE
LEFT JOIN workers w ON ta.worker_id = w.id

WHERE t.is_deleted = FALSE

GROUP BY 
  t.id,
  t.apartment_id,
  t.task_name,
  t.task_description,
  t.task_category,
  t.status,
  t.total_budget,
  t.start_date,
  t.end_date,
  t.completed_at,
  t.is_delayed,
  t.delay_reason,
  t.priority,
  t.progress_photos,
  t.notes,
  t.created_at,
  t.updated_at,
  t.actual_duration_minutes,
  t.estimated_hours,
  a.apartment_number,
  f.id,
  f.floor_number,
  tw.id,
  tw.tower_number,
  p.id,
  p.name

ORDER BY t.created_at DESC;

COMMENT ON VIEW public.tasks_with_workers_v2 IS 
'Vista de tareas corregida para incluir tareas de piso (sin departamento) y con duración real manual.';
