-- =====================================================
-- ARREGLAR DELETE_PAYMENT PARA QUE ACTUALICE INCOME_TRACKING
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Función mejorada que actualiza income_tracking al eliminar un pago
CREATE OR REPLACE FUNCTION public.delete_payment(
  p_payment_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_worker_id INTEGER;
  v_payment_exists BOOLEAN;
  v_tasks_affected INTEGER;
BEGIN
  -- Verificar que el pago existe
  SELECT EXISTS(SELECT 1 FROM public.worker_payment_history WHERE id = p_payment_id)
  INTO v_payment_exists;
  
  IF NOT v_payment_exists THEN
    RAISE EXCEPTION 'Pago con ID % no encontrado', p_payment_id;
  END IF;

  -- Obtener el worker_id del pago
  SELECT worker_id INTO v_worker_id
  FROM public.worker_payment_history
  WHERE id = p_payment_id;

  RAISE NOTICE 'Eliminando pago ID: %, Trabajador: %', p_payment_id, v_worker_id;

  -- Eliminar el pago del historial
  DELETE FROM public.worker_payment_history WHERE id = p_payment_id;
  
  -- CRÍTICO: Marcar TODAS las tareas completadas del trabajador como NO pagadas
  UPDATE public.apartment_tasks 
  SET is_paid = FALSE 
  WHERE assigned_to = v_worker_id
    AND status = 'completed'
    AND is_paid = TRUE;
    
  GET DIAGNOSTICS v_tasks_affected = ROW_COUNT;

  RAISE NOTICE 'Pago eliminado. Trabajador %: % tareas marcadas como no pagadas', v_worker_id, v_tasks_affected;
  
  -- ACTUALIZAR INCOME_TRACKING después de eliminar el pago
  PERFORM public.refresh_income_tracking_complete();
  
  RAISE NOTICE 'Income tracking actualizado después de eliminar pago';
END;
$$;

-- Comentario
COMMENT ON FUNCTION public.delete_payment IS 'Elimina un pago, marca tareas como no pagadas y actualiza income_tracking';

-- Verificar que la función se creó
SELECT 'Función delete_payment actualizada exitosamente' as status;

-- Mostrar información de la función
SELECT 
  routine_name, 
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'delete_payment';

