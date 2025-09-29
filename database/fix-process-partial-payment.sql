-- =====================================================
-- CORREGIR FUNCIÓN process_partial_payment
-- Para incluir task_payment_amount en payment_tasks
-- =====================================================

-- Función corregida para procesar pago parcial
CREATE OR REPLACE FUNCTION public.process_partial_payment(
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
  task_record RECORD;
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

  -- Crear las relaciones con las tareas seleccionadas INCLUYENDO task_payment_amount
  FOR task_record IN 
    SELECT id, worker_payment 
    FROM public.apartment_tasks 
    WHERE id = ANY(p_selected_tasks)
      AND assigned_to = p_worker_id
      AND status = 'completed'
      AND (is_paid = FALSE OR is_paid IS NULL)
  LOOP
    INSERT INTO public.payment_tasks (payment_id, task_id, task_payment_amount)
    VALUES (v_payment_id, task_record.id, task_record.worker_payment);
  END LOOP;

  -- Marcar tareas seleccionadas como pagadas
  UPDATE public.apartment_tasks 
  SET is_paid = TRUE 
  WHERE id = ANY(p_selected_tasks)
    AND assigned_to = p_worker_id
    AND status = 'completed'
    AND (is_paid = FALSE OR is_paid IS NULL);

  RETURN v_payment_id;
END;
$$;

-- Comentario para la función
COMMENT ON FUNCTION public.process_partial_payment IS 'Procesa un pago parcial seleccionando tareas específicas con task_payment_amount';




