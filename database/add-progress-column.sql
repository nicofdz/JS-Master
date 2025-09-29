-- Agregar columna progress a la tabla projects
ALTER TABLE projects ADD COLUMN progress INTEGER DEFAULT 0;

-- Actualizar proyectos existentes con progreso basado en su estado
UPDATE projects 
SET progress = CASE 
  WHEN status = 'planning' THEN 0
  WHEN status = 'active' THEN 25
  WHEN status = 'completed' THEN 100
  WHEN status = 'paused' THEN 15
  ELSE 0
END;

