-- =====================================================
-- FIX v2: Repair tasks_with_workers_v2 to include PRECISE contract type causing NO duplicates
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
  t.created_by,
  
  -- Creator info
  up.full_name AS created_by_name,

  -- Apartment info
  a.apartment_number,
  
  -- Floor info
  f.id AS floor_id,
  f.floor_number,
  
  -- Tower info
  tw.id AS tower_id,
  tw.tower_number,
  tw.name AS tower_name,
  
  -- Project info
  p.id AS project_id,
  p.name AS project_name,
  p.is_active AS project_is_active,
  
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
            -- FIX: Use correlated subquery to fetch ONE contract type safely
            'contract_type', COALESCE(
              (
                SELECT ch.contract_type 
                FROM contract_history ch 
                WHERE ch.worker_id = w.id 
                  AND ch.project_id = p.id 
                  AND ch.is_active = TRUE 
                LIMIT 1
              ), 
              w.contract_type
            )
          )
        ELSE NULL
      END
    ) FILTER (WHERE ta.id IS NOT NULL),
    '[]'::json
  ) AS workers
  
FROM tasks t
LEFT JOIN apartments a ON t.apartment_id = a.id
INNER JOIN floors f ON f.id = COALESCE(t.floor_id, a.floor_id)
INNER JOIN towers tw ON f.tower_id = tw.id
INNER JOIN projects p ON tw.project_id = p.id
LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.is_deleted = FALSE
LEFT JOIN workers w ON ta.worker_id = w.id
LEFT JOIN user_profiles up ON t.created_by = up.id

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
  t.created_by,
  up.full_name,
  a.apartment_number,
  f.id,
  f.floor_number,
  tw.id,
  tw.tower_number,
  tw.name,
  p.id,
  p.name,
  p.is_active

ORDER BY t.created_at DESC;

COMMENT ON VIEW public.tasks_with_workers_v2 IS 
'Vista de tareas corregida v2: Evita duplicados por contratos múltiples.';
