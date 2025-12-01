-- Función para obtener proyectos con cálculo de progreso y conteo de torres
-- Incluye soft delete: solo retorna proyectos con is_active = true

CREATE OR REPLACE FUNCTION get_projects_with_progress()
RETURNS TABLE (
  id INTEGER,
  name VARCHAR,
  address TEXT,
  city VARCHAR,
  start_date DATE,
  estimated_completion DATE,
  actual_completion DATE,
  status VARCHAR,
  plan_pdf TEXT,
  plan_image_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  progress_percentage NUMERIC,
  progress NUMERIC,
  total_activities BIGINT,
  activities_completed BIGINT,
  towers_count BIGINT,
  total_floors_count BIGINT,
  apartments_count BIGINT,
  initial_budget NUMERIC,
  client_company_name VARCHAR,
  client_company_rut VARCHAR,
  client_company_contact VARCHAR,
  client_company_phone VARCHAR,
  site_admin_name VARCHAR,
  site_admin_rut VARCHAR,
  site_admin_phone VARCHAR,
  site_admin_email VARCHAR,
  contract_date DATE,
  contract_type VARCHAR,
  contract_amount NUMERIC,
  contract_pdf_url TEXT,
  specifications_pdf_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.address,
    p.city,
    p.start_date,
    p.estimated_completion,
    p.actual_completion,
    p.status,
    p.plan_pdf,
    p.plan_image_url,
    p.created_at,
    p.updated_at,
    -- Calcular progreso basado en tareas completadas (excluyendo canceladas)
    CASE 
      WHEN COUNT(at.id) = 0 THEN 0::NUMERIC
      ELSE ROUND(
        (COUNT(CASE WHEN at.status = 'completed' THEN 1 END)::NUMERIC / COUNT(at.id)::NUMERIC) * 100, 
        2
      )
    END as progress_percentage,
    -- Alias para compatibilidad
    CASE 
      WHEN COUNT(at.id) = 0 THEN 0::NUMERIC
      ELSE ROUND(
        (COUNT(CASE WHEN at.status = 'completed' THEN 1 END)::NUMERIC / COUNT(at.id)::NUMERIC) * 100, 
        2
      )
    END as progress,
    -- Estadísticas de tareas
    COUNT(at.id) as total_activities,
    COUNT(CASE WHEN at.status = 'completed' THEN 1 END) as activities_completed,
    -- Conteo de torres
    (
      SELECT COUNT(*)
      FROM towers t
      WHERE t.project_id = p.id
    ) as towers_count,
    -- Conteo total de pisos creados
    COUNT(DISTINCT f.id) as total_floors_count,
    -- Conteo real de apartamentos creados
    COUNT(DISTINCT a.id) as apartments_count,
    -- Campos adicionales
    p.initial_budget,
    p.client_company_name,
    p.client_company_rut,
    p.client_company_contact,
    p.client_company_phone,
    p.site_admin_name,
    p.site_admin_rut,
    p.site_admin_phone,
    p.site_admin_email,
    p.contract_date,
    p.contract_type,
    p.contract_amount,
    p.contract_pdf_url,
    p.specifications_pdf_url
  FROM projects p
  LEFT JOIN floors f ON f.project_id = p.id
  LEFT JOIN apartments a ON a.floor_id = f.id
  LEFT JOIN apartment_tasks at ON at.apartment_id = a.id 
    AND at.status != 'cancelled'  -- Excluir tareas canceladas del cálculo de progreso
  WHERE p.is_active = true  -- Solo proyectos activos (soft delete unificado)
  GROUP BY p.id, p.name, p.address, p.city,
           p.start_date, p.estimated_completion, p.actual_completion,
           p.status, p.plan_pdf, p.plan_image_url, p.created_at, p.updated_at,
           p.initial_budget, p.client_company_name, p.client_company_rut,
           p.client_company_contact, p.client_company_phone, p.site_admin_name,
           p.site_admin_rut, p.site_admin_phone, p.site_admin_email,
           p.contract_date, p.contract_type, p.contract_amount,
           p.contract_pdf_url, p.specifications_pdf_url
  ORDER BY p.name ASC;
END;
$$ LANGUAGE plpgsql;

-- Comentario explicativo
COMMENT ON FUNCTION get_projects_with_progress() IS 
'Retorna proyectos activos (is_active = true) con cálculos de progreso, conteo de torres, pisos y apartamentos. Excluye tareas canceladas del cálculo de progreso.';
