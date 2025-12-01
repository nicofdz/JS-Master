-- =====================================================
-- AGREGAR contract_type A LA VISTA tasks_with_workers_v2
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
  
  -- Apartment, Floor, Tower info with IDs
  a.apartment_number,
  f.id AS floor_id,
  f.floor_number,
  tw.id AS tower_id,
  tw.tower_number,
  
  -- Project info
  p.id AS project_id,
  p.name AS project_name,
  
  -- Worker counts
  COUNT(DISTINCT ta.id) AS total_workers,
  COUNT(DISTINCT CASE WHEN ta.completed_at IS NOT NULL THEN ta.id END) AS completed_workers,
  COUNT(DISTINCT CASE WHEN ta.is_paid = TRUE THEN ta.id END) AS paid_workers,
  
  -- Workers array as JSON (incluye contract_type)
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
            'completed_at', ta.completed_at,
            'is_paid', ta.is_paid,
            'contract_type', ta.contract_type  -- ✅ Usar contract_type desde task_assignments (snapshot histórico)
          )
        ELSE NULL
      END
    ) FILTER (WHERE ta.id IS NOT NULL),
    '[]'::json
  ) AS workers
  
FROM tasks t
INNER JOIN apartments a ON t.apartment_id = a.id
INNER JOIN floors f ON a.floor_id = f.id
INNER JOIN towers tw ON f.tower_id = tw.id
INNER JOIN projects p ON tw.project_id = p.id
LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.is_deleted = FALSE
LEFT JOIN workers w ON ta.worker_id = w.id
-- ✅ Usar contract_type desde task_assignments (snapshot histórico) en lugar de contract_history
-- LEFT JOIN contract_history ch ON ch.worker_id = w.id 
--   AND ch.project_id = p.id
--   AND ch.status = 'activo'
--   AND ch.is_active = true

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
  a.apartment_number,
  f.id,
  f.floor_number,
  tw.id,
  tw.tower_number,
  p.id,
  p.name

ORDER BY t.created_at DESC;

-- Add comment
COMMENT ON VIEW public.tasks_with_workers_v2 IS 
'Vista de tareas con información completa de trabajadores, apartamento, piso, torre y proyecto. Incluye IDs para filtrado jerárquico y contract_type de cada trabajador.';

