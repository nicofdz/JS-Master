-- Verificar datos de apartamentos
SELECT 
  a.id,
  a.apartment_number,
  a.floor_id,
  f.floor_number,
  f.project_id,
  p.name as project_name
FROM apartments a
LEFT JOIN floors f ON a.floor_id = f.id
LEFT JOIN projects p ON f.project_id = p.id
ORDER BY a.id
LIMIT 10;

