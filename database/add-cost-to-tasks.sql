-- =====================================================
-- AGREGAR CAMPO ESTIMATED_COST A TAREAS
-- =====================================================

-- Agregar columna estimated_cost a la tabla apartment_tasks
ALTER TABLE apartment_tasks 
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2) DEFAULT NULL;

-- Agregar comentario para documentar el campo
COMMENT ON COLUMN apartment_tasks.estimated_cost IS 'Costo estimado de la tarea en la moneda local';

-- Crear índice para mejorar consultas por costo
CREATE INDEX IF NOT EXISTS idx_apartment_tasks_estimated_cost ON apartment_tasks(estimated_cost) WHERE estimated_cost IS NOT NULL;
