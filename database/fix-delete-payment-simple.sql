-- =====================================================
-- SOLUCIÓN SIMPLE PARA DELETE_PAYMENT
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Función simple y directa para eliminar pagos
CREATE OR REPLACE FUNCTION public.delete_payment(
  p_payment_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_worker_id INTEGER;
BEGIN
  -- Obtener el worker_id del pago
  SELECT worker_id INTO v_worker_id
  FROM public.worker_payment_history
  WHERE id = p_payment_id;

  -- Si no existe el pago, lanzar error
  IF v_worker_id IS NULL THEN
    RAISE EXCEPTION 'Pago con ID % no encontrado', p_payment_id;
  END IF;

  -- Eliminar el pago del historial
  DELETE FROM public.worker_payment_history WHERE id = p_payment_id;

  -- CRÍTICO: Marcar TODAS las tareas completadas del trabajador como NO pagadas
  -- Esto asegura que vuelvan a aparecer en "Por Pagar"
  UPDATE public.apartment_tasks 
  SET is_paid = FALSE 
  WHERE assigned_to = v_worker_id
    AND status = 'completed'
    AND is_paid = TRUE;

  RAISE NOTICE 'Pago eliminado. Trabajador %: tareas marcadas como no pagadas', v_worker_id;
END;
$$;

-- Verificar que la función se creó correctamente
SELECT 'Función delete_payment creada exitosamente' as status;







