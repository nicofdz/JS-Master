-- =====================================================
-- FUNCIONES PARA PAGOS PARCIALES Y EDICIÓN
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Función para procesar pago parcial con tareas específicas
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
  INSERT INTO public.payment_tasks (payment_id, task_id)
  SELECT v_payment_id, unnest(p_selected_tasks);

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

-- Función para actualizar un pago existente
CREATE OR REPLACE FUNCTION public.update_payment(
  p_payment_id INTEGER,
  p_new_amount DECIMAL(10,2),
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;

  -- Actualizar el pago
  UPDATE public.worker_payment_history 
  SET 
    total_amount = p_new_amount,
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_payment_id;

  -- Log de la actualización
  INSERT INTO public.payment_updates_log (
    payment_id,
    old_amount,
    new_amount,
    updated_by,
    update_reason
  ) VALUES (
    p_payment_id,
    (SELECT total_amount FROM public.worker_payment_history WHERE id = p_payment_id),
    p_new_amount,
    v_user_id,
    'Manual update'
  );
END;
$$;

-- Función para eliminar un pago
CREATE OR REPLACE FUNCTION public.delete_payment(
  p_payment_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_worker_id INTEGER;
  v_task_ids INTEGER[];
BEGIN
  -- Obtener el worker_id y las tareas asociadas
  SELECT wph.worker_id, ARRAY_AGG(pt.task_id)
  INTO v_worker_id, v_task_ids
  FROM public.worker_payment_history wph
  LEFT JOIN public.payment_tasks pt ON wph.id = pt.payment_id
  WHERE wph.id = p_payment_id
  GROUP BY wph.worker_id;

  -- Eliminar las relaciones de tareas
  DELETE FROM public.payment_tasks WHERE payment_id = p_payment_id;

  -- Eliminar el pago
  DELETE FROM public.worker_payment_history WHERE id = p_payment_id;

  -- Marcar las tareas como no pagadas nuevamente
  UPDATE public.apartment_tasks 
  SET is_paid = FALSE 
  WHERE id = ANY(v_task_ids)
    AND assigned_to = v_worker_id;
END;
$$;

-- Función para obtener tareas disponibles para pago
CREATE OR REPLACE FUNCTION public.get_available_tasks_for_payment(
  p_worker_id INTEGER
)
RETURNS TABLE (
  task_id INTEGER,
  task_name VARCHAR(255),
  task_category VARCHAR(100),
  status VARCHAR(50),
  worker_payment DECIMAL(10,2),
  estimated_hours INTEGER,
  start_date DATE,
  apartment_number VARCHAR(20),
  floor_number INTEGER,
  project_name VARCHAR(255)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    at.id AS task_id,
    at.task_name,
    at.task_category,
    at.status,
    at.worker_payment,
    at.estimated_hours,
    at.start_date,
    a.apartment_number,
    f.floor_number,
    p.name AS project_name
  FROM
    public.apartment_tasks at
  JOIN
    public.apartments a ON at.apartment_id = a.id
  JOIN
    public.floors f ON a.floor_id = f.id
  JOIN
    public.projects p ON f.project_id = p.id
  WHERE
    at.assigned_to = p_worker_id
    AND at.status = 'completed'
    AND (at.is_paid = FALSE OR at.is_paid IS NULL)
    AND at.worker_payment > 0
  ORDER BY
    at.start_date ASC;
END;
$$;

-- Crear tabla de log de actualizaciones de pagos
CREATE TABLE IF NOT EXISTS public.payment_updates_log (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER REFERENCES public.worker_payment_history(id) ON DELETE CASCADE,
  old_amount DECIMAL(10,2),
  new_amount DECIMAL(10,2),
  updated_by UUID REFERENCES public.user_profiles(id),
  update_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios para las funciones
COMMENT ON FUNCTION public.process_partial_payment IS 'Procesa un pago parcial seleccionando tareas específicas';
COMMENT ON FUNCTION public.update_payment IS 'Actualiza el monto de un pago existente';
COMMENT ON FUNCTION public.delete_payment IS 'Elimina un pago y marca las tareas como no pagadas';
COMMENT ON FUNCTION public.get_available_tasks_for_payment IS 'Obtiene tareas disponibles para pago de un trabajador';














<<<<<<< HEAD
=======

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
