-- =====================================================
-- SOLUCIÓN FINAL PARA DELETE_PAYMENT
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Eliminar las funciones existentes primero
DROP FUNCTION IF EXISTS public.delete_payment(integer);
DROP FUNCTION IF EXISTS public.test_delete_payment_flow(integer);
DROP FUNCTION IF EXISTS public.test_delete_payment(integer);

-- Función simple y directa que funciona
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
END;
$$;

-- Función de prueba para verificar que funciona
CREATE OR REPLACE FUNCTION public.test_delete_payment_flow(
  p_worker_id INTEGER
)
RETURNS TABLE (
  before_unpaid INTEGER,
  before_paid INTEGER,
  after_unpaid INTEGER,
  after_paid INTEGER,
  payment_deleted BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_id INTEGER;
  v_before_unpaid INTEGER;
  v_before_paid INTEGER;
  v_after_unpaid INTEGER;
  v_after_paid INTEGER;
  v_payment_deleted BOOLEAN := FALSE;
BEGIN
  -- Obtener estado antes
  SELECT 
    COUNT(CASE WHEN (is_paid = FALSE OR is_paid IS NULL) THEN 1 END),
    COUNT(CASE WHEN is_paid = TRUE THEN 1 END)
  INTO v_before_unpaid, v_before_paid
  FROM public.apartment_tasks 
  WHERE assigned_to = p_worker_id 
    AND status = 'completed';

  -- Obtener el último pago
  SELECT id INTO v_payment_id
  FROM public.worker_payment_history 
  WHERE worker_id = p_worker_id 
  ORDER BY payment_date DESC 
  LIMIT 1;

  -- Si hay un pago, eliminarlo
  IF v_payment_id IS NOT NULL THEN
    PERFORM public.delete_payment(v_payment_id);
    v_payment_deleted := TRUE;
  END IF;

  -- Obtener estado después
  SELECT 
    COUNT(CASE WHEN (is_paid = FALSE OR is_paid IS NULL) THEN 1 END),
    COUNT(CASE WHEN is_paid = TRUE THEN 1 END)
  INTO v_after_unpaid, v_after_paid
  FROM public.apartment_tasks 
  WHERE assigned_to = p_worker_id 
    AND status = 'completed';

  RETURN QUERY SELECT v_before_unpaid, v_before_paid, v_after_unpaid, v_after_paid, v_payment_deleted;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION public.delete_payment IS 'Elimina un pago y marca las tareas como no pagadas - versión final';
COMMENT ON FUNCTION public.test_delete_payment_flow IS 'Función de prueba para verificar que delete_payment funciona correctamente';

-- Verificar que la función se creó
SELECT 'Función delete_payment creada exitosamente' as status;

-- Mostrar información de la función
SELECT 
  routine_name, 
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'delete_payment';
