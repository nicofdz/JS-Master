-- =====================================================
-- AGREGAR CAMPO BUDGET A PROYECTOS
-- =====================================================

-- Agregar columna budget a la tabla projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2) DEFAULT NULL;

-- Agregar comentario para documentar el campo
COMMENT ON COLUMN projects.budget IS 'Presupuesto total del proyecto en la moneda local';

-- Crear índice para mejorar consultas por presupuesto
CREATE INDEX IF NOT EXISTS idx_projects_budget ON projects(budget) WHERE budget IS NOT NULL;
