-- =====================================================
-- AGREGAR CAMPO 'consumed' A material_movements
-- =====================================================
-- Este campo permite marcar entregas de materiales como "consumidas"
-- para que no aparezcan en futuros selects de entregas disponibles
-- =====================================================

-- Agregar columna 'consumed' a material_movements
ALTER TABLE public.material_movements
ADD COLUMN IF NOT EXISTS consumed BOOLEAN DEFAULT FALSE NOT NULL;

-- Agregar columna 'consumed_at' para registrar cuándo se marcó como consumido
ALTER TABLE public.material_movements
ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMP WITH TIME ZONE;

-- Agregar columna 'consumed_by' para registrar quién lo marcó como consumido
ALTER TABLE public.material_movements
ADD COLUMN IF NOT EXISTS consumed_by UUID REFERENCES auth.users(id);

-- Crear índice para mejorar consultas de entregas no consumidas
CREATE INDEX IF NOT EXISTS idx_material_movements_consumed 
ON public.material_movements(consumed) 
WHERE consumed = FALSE;

-- Crear índice compuesto para filtrar entregas disponibles por trabajador
CREATE INDEX IF NOT EXISTS idx_material_movements_worker_consumed 
ON public.material_movements(worker_id, consumed, movement_type) 
WHERE consumed = FALSE AND movement_type = 'entrega';

-- Comentarios
COMMENT ON COLUMN public.material_movements.consumed IS 'Indica si la entrega de material fue completamente consumida/utilizada';
COMMENT ON COLUMN public.material_movements.consumed_at IS 'Fecha y hora en que se marcó como consumido';
COMMENT ON COLUMN public.material_movements.consumed_by IS 'Usuario que marcó la entrega como consumida';

-- Función para marcar una entrega como consumida
CREATE OR REPLACE FUNCTION mark_delivery_as_consumed(
  p_delivery_id INTEGER,
  p_consumed BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar que el movimiento existe y es una entrega
  IF NOT EXISTS(
    SELECT 1 FROM material_movements 
    WHERE id = p_delivery_id 
    AND movement_type = 'entrega'
  ) THEN
    RAISE EXCEPTION 'La entrega con ID % no existe', p_delivery_id;
  END IF;

  -- Actualizar el estado de consumido
  UPDATE material_movements
  SET 
    consumed = p_consumed,
    consumed_at = CASE WHEN p_consumed THEN NOW() ELSE NULL END,
    consumed_by = CASE WHEN p_consumed THEN auth.uid() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_delivery_id;

  RAISE NOTICE 'Entrega % marcada como %', p_delivery_id, CASE WHEN p_consumed THEN 'consumida' ELSE 'no consumida' END;
END;
$$;

COMMENT ON FUNCTION mark_delivery_as_consumed IS 'Marca una entrega de material como consumida o no consumida';

-- Trigger para auto-marcar como consumido cuando se asocia a una tarea
-- (Opcional - puedes decidir si quieres que sea automático o manual)
CREATE OR REPLACE FUNCTION auto_mark_delivery_consumed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cuando se crea una asociación de material a tarea, marcar como consumido
  UPDATE material_movements
  SET 
    consumed = TRUE,
    consumed_at = NOW(),
    consumed_by = auth.uid()
  WHERE id = NEW.delivery_id
  AND consumed = FALSE;
  
  RETURN NEW;
END;
$$;

-- Crear trigger (comentado por defecto - descomentar si quieres auto-marcado)
-- DROP TRIGGER IF EXISTS trigger_auto_mark_delivery_consumed ON task_assignment_materials;
-- CREATE TRIGGER trigger_auto_mark_delivery_consumed
--   AFTER INSERT ON task_assignment_materials
--   FOR EACH ROW
--   EXECUTE FUNCTION auto_mark_delivery_consumed();

COMMENT ON FUNCTION auto_mark_delivery_consumed IS 'Marca automáticamente una entrega como consumida cuando se asocia a una tarea';
