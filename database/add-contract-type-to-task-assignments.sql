-- =====================================================
-- AGREGAR contract_type A task_assignments
-- Para mantener trazabilidad histórica del tipo de contrato
-- =====================================================

-- 1. Agregar columna contract_type a task_assignments
ALTER TABLE public.task_assignments
ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20);

-- 2. Comentario para documentación
COMMENT ON COLUMN public.task_assignments.contract_type IS 
'Snapshot del tipo de contrato del trabajador al momento de la asignación (por_dia o a_trato). Se guarda para mantener trazabilidad histórica.';

-- 3. Actualizar registros existentes con el contract_type actual
-- Obtener el contract_type desde contract_history para asignaciones existentes
UPDATE public.task_assignments ta
SET contract_type = COALESCE(
  (
    SELECT ch.contract_type
    FROM tasks t
    JOIN apartments a ON t.apartment_id = a.id
    JOIN floors f ON a.floor_id = f.id
    JOIN towers tw ON f.tower_id = tw.id
    JOIN contract_history ch ON ch.worker_id = ta.worker_id 
      AND ch.project_id = tw.project_id
      AND ch.status = 'activo'
      AND ch.is_active = true
    WHERE ta.task_id = t.id
    ORDER BY ch.fecha_inicio DESC
    LIMIT 1
  ),
  'a_trato' -- Default si no se encuentra
)
WHERE ta.contract_type IS NULL;

-- 4. Hacer la columna NOT NULL después de actualizar los datos existentes
ALTER TABLE public.task_assignments
ALTER COLUMN contract_type SET NOT NULL;

-- 5. Agregar constraint CHECK para validar valores
ALTER TABLE public.task_assignments
ADD CONSTRAINT check_contract_type 
CHECK (contract_type IN ('por_dia', 'a_trato'));

-- 6. Crear índice para mejorar performance en consultas
CREATE INDEX IF NOT EXISTS idx_task_assignments_contract_type 
ON public.task_assignments(contract_type)
WHERE contract_type IS NOT NULL;

