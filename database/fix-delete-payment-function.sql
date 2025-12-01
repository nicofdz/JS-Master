-- =====================================================
-- CORREGIR FUNCIÓN DELETE_PAYMENT PARA QUE LAS TAREAS VUELVAN A POR PAGAR
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. VERIFICAR ESTRUCTURA ACTUAL
SELECT '=== VERIFICACIÓN INICIAL ===' as info;

-- Verificar si la función existe
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'delete_payment';

-- Verificar estructura de payment_tasks
SELECT 'Estructura de payment_tasks:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_tasks' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. FUNCIÓN CORREGIDA PARA ELIMINAR PAGOS
CREATE OR REPLACE FUNCTION public.delete_payment(
  p_payment_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_worker_id INTEGER;
  v_task_ids INTEGER[];
  v_deleted_count INTEGER;
BEGIN
  -- Obtener el worker_id y las tareas asociadas
  SELECT wph.worker_id, ARRAY_AGG(pt.task_id)
  INTO v_worker_id, v_task_ids
  FROM public.worker_payment_history wph
  LEFT JOIN public.payment_tasks pt ON wph.id = pt.payment_id
  WHERE wph.id = p_payment_id
  GROUP BY wph.worker_id;

  -- Si no se encuentra el pago, lanzar error
  IF v_worker_id IS NULL THEN
    RAISE EXCEPTION 'Pago con ID % no encontrado', p_payment_id;
  END IF;

  -- Eliminar las relaciones de tareas (si existen)
  DELETE FROM public.payment_tasks WHERE payment_id = p_payment_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Eliminar el pago del historial
  DELETE FROM public.worker_payment_history WHERE id = p_payment_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- CRÍTICO: Marcar las tareas como NO pagadas para que vuelvan a "Por Pagar"
  IF v_task_ids IS NOT NULL AND array_length(v_task_ids, 1) > 0 THEN
    UPDATE public.apartment_tasks 
    SET is_paid = FALSE 
    WHERE id = ANY(v_task_ids)
      AND assigned_to = v_worker_id;
    
    -- Log de la operación
    RAISE NOTICE 'Marcadas % tareas como no pagadas para el trabajador %', 
      array_length(v_task_ids, 1), v_worker_id;
  ELSE
    -- Si no hay tareas específicas, marcar todas las tareas completadas del trabajador como no pagadas
    UPDATE public.apartment_tasks 
    SET is_paid = FALSE 
    WHERE assigned_to = v_worker_id
      AND status = 'completed'
      AND is_paid = TRUE;
    
    RAISE NOTICE 'Marcadas todas las tareas completadas como no pagadas para el trabajador %', v_worker_id;
  END IF;

  RAISE NOTICE 'Pago eliminado exitosamente. ID: %, Trabajador: %, Tareas afectadas: %', 
    p_payment_id, v_worker_id, COALESCE(array_length(v_task_ids, 1), 0);
END;
$$;

-- 3. FUNCIÓN PARA VERIFICAR QUE TODO FUNCIONA
CREATE OR REPLACE FUNCTION public.test_delete_payment_flow(
  p_worker_id INTEGER
)
RETURNS TABLE (
  before_delete_unpaid INTEGER,
  before_delete_paid INTEGER,
  after_delete_unpaid INTEGER,
  after_delete_paid INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_id INTEGER;
  v_before_unpaid INTEGER;
  v_before_paid INTEGER;
  v_after_unpaid INTEGER;
  v_after_paid INTEGER;
BEGIN
  -- Obtener estado antes de la eliminación
  SELECT 
    COUNT(CASE WHEN is_paid = FALSE OR is_paid IS NULL THEN 1 END),
    COUNT(CASE WHEN is_paid = TRUE THEN 1 END)
  INTO v_before_unpaid, v_before_paid
  FROM public.apartment_tasks 
  WHERE assigned_to = p_worker_id 
    AND status = 'completed';

  -- Obtener el último pago del trabajador
  SELECT id INTO v_payment_id
  FROM public.worker_payment_history 
  WHERE worker_id = p_worker_id 
  ORDER BY payment_date DESC 
  LIMIT 1;

  -- Si hay un pago, eliminarlo
  IF v_payment_id IS NOT NULL THEN
    PERFORM public.delete_payment(v_payment_id);
  END IF;

  -- Obtener estado después de la eliminación
  SELECT 
    COUNT(CASE WHEN is_paid = FALSE OR is_paid IS NULL THEN 1 END),
    COUNT(CASE WHEN is_paid = TRUE THEN 1 END)
  INTO v_after_unpaid, v_after_paid
  FROM public.apartment_tasks 
  WHERE assigned_to = p_worker_id 
    AND status = 'completed';

  -- Retornar resultados
  RETURN QUERY SELECT v_before_unpaid, v_before_paid, v_after_unpaid, v_after_paid;
END;
$$;

-- 4. VERIFICAR QUE LA FUNCIÓN FUNCIONA
SELECT '=== VERIFICACIÓN FINAL ===' as info;

-- Comentarios
COMMENT ON FUNCTION public.delete_payment IS 'Elimina un pago y marca las tareas como no pagadas para que vuelvan a Por Pagar';
COMMENT ON FUNCTION public.test_delete_payment_flow IS 'Función de prueba para verificar que delete_payment funciona correctamente';

-- 5. INSTRUCCIONES DE USO
SELECT '=== INSTRUCCIONES ===' as info;
SELECT 'Para probar que funciona:' as paso1;
SELECT '1. Ve a la vista de pagos' as paso2;
SELECT '2. Haz un pago a un trabajador' as paso3;
SELECT '3. Ve al historial y elimina el pago' as paso4;
SELECT '4. Verifica que las tareas vuelven a "Por Pagar"' as paso5;







