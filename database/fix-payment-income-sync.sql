-- =====================================================
-- SOLUCIÓN: SINCRONIZACIÓN PAGOS CON INCOME_TRACKING
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- PROBLEMA IDENTIFICADO:
-- Las funciones process_worker_payment_simple y process_partial_payment_simple
-- NO están llamando a refresh_income_tracking_complete() al final
-- Por eso el "Dinero Disponible" no se actualiza automáticamente

-- 1. CORREGIR process_worker_payment_simple
CREATE OR REPLACE FUNCTION public.process_worker_payment_simple(
  p_worker_id INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_amount DECIMAL(10,2) := 0;
  v_tasks_count INTEGER := 0;
  v_work_days INTEGER := 0;
  v_payment_id INTEGER;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;

  -- Calcular total de pagos pendientes SOLO para tareas completadas NO pagadas
  SELECT 
    COALESCE(SUM(at.worker_payment), 0),
    COUNT(at.id),
    COALESCE(SUM(at.estimated_hours) / 8, 0)::INTEGER
  INTO v_total_amount, v_tasks_count, v_work_days
  FROM public.apartment_tasks at
  WHERE at.assigned_to = p_worker_id
    AND at.status = 'completed'
    AND (at.is_paid = FALSE OR at.is_paid IS NULL)
    AND at.worker_payment > 0;

  -- Si no hay pagos pendientes, retornar error
  IF v_total_amount = 0 THEN
      RAISE EXCEPTION 'No hay pagos pendientes para este trabajador';
  END IF;

  -- Crear el registro de pago
  INSERT INTO public.worker_payment_history (
      worker_id, 
      payment_date,
      total_amount, 
      tasks_count,
      work_days, 
      notes, 
      created_by
  ) VALUES (
      p_worker_id, 
      CURRENT_DATE,
      v_total_amount, 
      v_tasks_count,
      v_work_days, 
      p_notes, 
      v_user_id
  ) RETURNING id INTO v_payment_id;

  -- CRÍTICO: Marcar tareas como pagadas
  UPDATE public.apartment_tasks 
  SET is_paid = TRUE 
  WHERE assigned_to = p_worker_id 
    AND status = 'completed' 
    AND (is_paid = FALSE OR is_paid IS NULL)
    AND worker_payment > 0;

  -- 🔥 NUEVO: Actualizar income_tracking automáticamente
  PERFORM public.refresh_income_tracking_complete();
  
  RAISE NOTICE 'Pago procesado: $% - Income tracking actualizado', v_total_amount;

  RETURN v_payment_id;
END;
$$;

-- 2. CORREGIR process_partial_payment_simple
CREATE OR REPLACE FUNCTION public.process_partial_payment_simple(
  p_worker_id INTEGER,
  p_selected_tasks INTEGER[],
  p_amount DECIMAL(10,2),
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_id INTEGER;
  v_user_id UUID;
  v_work_days INTEGER;
  v_tasks_count INTEGER;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;

  -- Calcular días trabajados y cantidad de tareas
  SELECT 
    COALESCE(SUM(at.estimated_hours) / 8, 0)::INTEGER,
    COUNT(at.id)
  INTO v_work_days, v_tasks_count
  FROM public.apartment_tasks at
  WHERE at.id = ANY(p_selected_tasks)
    AND at.assigned_to = p_worker_id
    AND at.status = 'completed'
    AND (at.is_paid = FALSE OR at.is_paid IS NULL);

  -- Crear el registro de pago
  INSERT INTO public.worker_payment_history (
      worker_id, 
      payment_date,
      total_amount, 
      tasks_count,
      work_days, 
      notes, 
      created_by
  ) VALUES (
      p_worker_id, 
      CURRENT_DATE,
      p_amount, 
      v_tasks_count,
      v_work_days, 
      p_notes, 
      v_user_id
  ) RETURNING id INTO v_payment_id;

  -- CRÍTICO: Marcar tareas seleccionadas como pagadas
  UPDATE public.apartment_tasks 
  SET is_paid = TRUE 
  WHERE id = ANY(p_selected_tasks)
    AND assigned_to = p_worker_id 
    AND status = 'completed' 
    AND (is_paid = FALSE OR is_paid IS NULL);

  -- 🔥 NUEVO: Actualizar income_tracking automáticamente
  PERFORM public.refresh_income_tracking_complete();
  
  RAISE NOTICE 'Pago parcial procesado: $% - Income tracking actualizado', p_amount;

  RETURN v_payment_id;
END;
$$;

-- 3. VERIFICAR que delete_payment también actualiza income_tracking
-- (Ya debería estar corregido en fix-delete-payment-with-income-tracking.sql)

-- 4. Comentarios de las funciones
COMMENT ON FUNCTION public.process_worker_payment_simple IS 'Procesa pago completo y actualiza income_tracking automáticamente';
COMMENT ON FUNCTION public.process_partial_payment_simple IS 'Procesa pago parcial y actualiza income_tracking automáticamente';

-- 5. VERIFICACIÓN: Ejecutar refresh manual para asegurar consistencia
SELECT 'EJECUTANDO REFRESH INICIAL:' as info;
SELECT public.refresh_income_tracking_complete();

-- 6. Mostrar estado actual
SELECT 'ESTADO ACTUAL INCOME_TRACKING:' as info;
SELECT 
  total_income,
  total_spent_on_payments,
  (total_income - total_spent_on_payments) as dinero_disponible,
  updated_at
FROM income_tracking 
WHERE id = 1;

SELECT '✅ SOLUCIÓN APLICADA EXITOSAMENTE' as resultado;

