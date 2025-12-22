-- Create a new RPC to get payment history with correct project name fallback
DROP FUNCTION IF EXISTS get_payment_history_v2(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_payment_history_v2(
  p_worker_id INTEGER DEFAULT NULL,
  p_project_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  worker_id INTEGER,
  project_id INTEGER,
  contract_type TEXT,
  payment_date DATE,
  created_at TIMESTAMPTZ,
  total_amount DECIMAL,
  work_days INTEGER,
  days_count INTEGER,
  tasks_count INTEGER,
  payment_month INTEGER,
  payment_year INTEGER,
  daily_rate DECIMAL,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  worker_name TEXT,
  worker_rut TEXT,
  project_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wph.id::INTEGER,
    wph.worker_id::INTEGER,
    wph.project_id::INTEGER,
    wph.contract_type::TEXT,
    wph.payment_date::DATE,
    wph.created_at,
    wph.total_amount::DECIMAL,
    wph.work_days::INTEGER,
    wph.days_count::INTEGER,
    wph.tasks_count::INTEGER,
    wph.payment_month::INTEGER,
    wph.payment_year::INTEGER,
    wph.daily_rate::DECIMAL,
    wph.start_date::DATE,
    wph.end_date::DATE,
    wph.notes::TEXT,
    w.full_name::TEXT as worker_name,
    w.rut::TEXT as worker_rut,
    COALESCE(
      p.name,
      (
        SELECT pr.name
        FROM payment_task_assignments pta
        JOIN task_assignments ta ON pta.task_assignment_id = ta.id
        JOIN tasks t ON ta.task_id = t.id
        JOIN apartments a ON t.apartment_id = a.id
        JOIN floors f ON a.floor_id = f.id
        JOIN projects pr ON f.project_id = pr.id
        WHERE pta.payment_id = wph.id
        LIMIT 1
      ),
      'Sin Proyecto'
    )::TEXT as project_name
  FROM worker_payment_history wph
  LEFT JOIN workers w ON wph.worker_id = w.id
  LEFT JOIN projects p ON wph.project_id = p.id
  WHERE
    wph.is_deleted = false
    AND wph.payment_status = 'completed'
    AND (p_worker_id IS NULL OR wph.worker_id = p_worker_id)
    AND (p_project_id IS NULL OR wph.project_id = p_project_id)
  ORDER BY wph.created_at DESC;
END;
$$ LANGUAGE plpgsql;
