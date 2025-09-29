-- Crear vista project_progress para calcular progreso automáticamente
CREATE OR REPLACE VIEW project_progress AS
SELECT 
  p.id,
  p.name,
  p.address,
  p.total_floors,
  p.units_per_floor,
  p.start_date,
  p.estimated_completion,
  p.actual_completion,
  p.status,
  p.created_by,
  p.created_at,
  p.updated_at,
  -- Calcular progreso basado en actividades completadas
  CASE 
    WHEN COUNT(aa.id) = 0 THEN 0
    ELSE ROUND((COUNT(CASE WHEN aa.status = 'completed' THEN 1 END)::float / COUNT(aa.id)) * 100)
  END as progress_percentage,
  -- Estadísticas adicionales
  COUNT(DISTINCT f.id) as floors_created,
  COUNT(DISTINCT apt.id) as apartments_created,
  COUNT(CASE WHEN aa.status = 'completed' THEN 1 END) as activities_completed,
  COUNT(aa.id) as total_activities
FROM projects p
LEFT JOIN floors f ON f.project_id = p.id
LEFT JOIN apartments apt ON apt.floor_id = f.id
LEFT JOIN apartment_activities aa ON aa.apartment_id = apt.id
GROUP BY p.id, p.name, p.address, p.total_floors, p.units_per_floor, 
         p.start_date, p.estimated_completion, p.actual_completion, 
         p.status, p.created_by, p.created_at, p.updated_at;

