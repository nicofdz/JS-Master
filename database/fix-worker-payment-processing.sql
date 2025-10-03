-- =====================================================
-- CORREGIR FUNCIÓN DE PROCESAMIENTO DE PAGOS
-- Para que funcione con la vista worker_payment_summary
-- =====================================================

-- Función corregida para procesar pagos
CREATE OR REPLACE FUNCTION public.process_worker_payment(
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
  task_record RECORD;
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

  -- Crear el registro de pago en worker_payment_history
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

  -- CREAR REGISTRO EN worker_payments para que aparezca en la vista
  INSERT INTO public.worker_payments (
      worker_id,
      amount,
      payment_date,
      payment_method,
      description,
      status,
      is_paid,
      paid_at,
      created_by
  ) VALUES (
      p_worker_id,
      v_total_amount,
      CURRENT_DATE,
      'Efectivo', -- Método por defecto
      COALESCE(p_notes, 'Pago procesado automáticamente'),
      'paid',
      TRUE,
      NOW(),
      v_user_id
  );

  -- Marcar tareas completadas como pagadas
  UPDATE public.apartment_tasks 
  SET is_paid = TRUE 
  WHERE assigned_to = p_worker_id 
  AND status = 'completed' 
  AND (is_paid = FALSE OR is_paid IS NULL)
  AND worker_payment IS NOT NULL 
  AND worker_payment > 0;

  RETURN v_payment_id;
END;
$$;

-- Comentario para la función
COMMENT ON FUNCTION public.process_worker_payment IS 'Procesa pagos y crea registros en worker_payments para que aparezcan en la vista worker_payment_summary';











