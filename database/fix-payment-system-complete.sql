-- =====================================================
-- CORREGIR SISTEMA COMPLETO DE PAGOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Primero verificar la estructura de payment_tasks
SELECT 'Verificando estructura de payment_tasks:' as status;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'payment_tasks'
ORDER BY ordinal_position;

-- 2. Corregir la función process_partial_payment
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

  -- Crear las relaciones con las tareas seleccionadas
  -- Verificar si la tabla tiene task_payment_amount
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'payment_tasks' 
      AND column_name = 'task_payment_amount'
  ) THEN
    -- Versión con task_payment_amount
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
  ELSE
    -- Versión simple sin task_payment_amount
    INSERT INTO public.payment_tasks (payment_id, task_id)
    SELECT v_payment_id, unnest(p_selected_tasks);
  END IF;

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

-- 3. Recrear la vista worker_payment_summary
DROP VIEW IF EXISTS public.worker_payment_summary;

CREATE VIEW public.worker_payment_summary AS
SELECT 
    w.id as worker_id,
    w.full_name,
    w.rut,
    w.cargo,
    COUNT(at.id) as total_tasks,
    COUNT(CASE WHEN at.status = 'completed' THEN 1 END) as completed_tasks,
    -- Costos Pendientes: tareas pendientes/en progreso
    COALESCE(SUM(CASE WHEN at.status IN ('pending', 'in_progress') THEN at.worker_payment ELSE 0 END), 0) as pending_payment,
    -- Por Pagar: tareas completadas no pagadas
    COALESCE(SUM(CASE WHEN at.status = 'completed' AND (at.is_paid = FALSE OR at.is_paid IS NULL) THEN at.worker_payment ELSE 0 END), 0) as uncompleted_payment,
    -- Total Pagado: suma del historial
    COALESCE((
        SELECT SUM(wph.total_amount) 
        FROM public.worker_payment_history wph 
        WHERE wph.worker_id = w.id
    ), 0) as total_paid,
    -- Total Payment Due: igual a uncompleted_payment
    COALESCE(SUM(CASE WHEN at.status = 'completed' AND (at.is_paid = FALSE OR at.is_paid IS NULL) THEN at.worker_payment ELSE 0 END), 0) as total_payment_due
FROM public.workers w
LEFT JOIN public.apartment_tasks at ON w.id = at.assigned_to
WHERE w.is_active = true
GROUP BY w.id, w.full_name, w.rut, w.cargo;

-- 4. Comentarios
COMMENT ON FUNCTION public.process_partial_payment IS 'Procesa pagos parciales con tareas específicas';
COMMENT ON VIEW public.worker_payment_summary IS 'Vista de resumen de pagos: Costos Pendientes, Por Pagar, Total Pagado';

-- 5. Verificar que todo funciona
SELECT 'Verificación final:' as status;
SELECT * FROM public.worker_payment_summary LIMIT 3;






