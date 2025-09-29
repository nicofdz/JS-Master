-- =====================================================
-- SOLUCIÓN COMPLETA DE PAGOS DESDE CERO
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. VERIFICAR ESTRUCTURA ACTUAL
SELECT '=== ESTRUCTURA ACTUAL ===' as info;

-- Verificar campos de apartment_tasks
SELECT 'Campos de apartment_tasks:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'apartment_tasks' 
  AND table_schema = 'public'
  AND column_name IN ('is_paid', 'worker_payment', 'status')
ORDER BY column_name;

-- Verificar datos de Diego Sandoval específicamente
SELECT 'Datos de Diego Sandoval:' as info;
SELECT 
    at.id,
    at.task_name,
    at.status,
    at.worker_payment,
    at.is_paid,
    w.full_name
FROM apartment_tasks at
JOIN workers w ON at.assigned_to = w.id
WHERE w.full_name ILIKE '%Diego%Sandoval%'
ORDER BY at.created_at DESC;

-- 2. FUNCIÓN SIMPLE Y DIRECTA PARA PAGOS COMPLETOS
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

  RETURN v_payment_id;
END;
$$;

-- 3. FUNCIÓN SIMPLE PARA PAGOS PARCIALES
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

  RETURN v_payment_id;
END;
$$;

-- 4. RECREAR VISTA CON LÓGICA CLARA
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
    -- Por Pagar: tareas completadas NO pagadas (CRÍTICO)
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

-- 5. VERIFICAR RESULTADO
SELECT '=== VERIFICACIÓN FINAL ===' as info;
SELECT 
    worker_id,
    full_name,
    uncompleted_payment as "POR PAGAR",
    total_paid as "TOTAL PAGADO"
FROM public.worker_payment_summary 
WHERE full_name ILIKE '%Diego%Sandoval%';

-- 6. Comentarios
COMMENT ON FUNCTION public.process_worker_payment_simple IS 'Función simple para pagos completos - marca is_paid = TRUE';
COMMENT ON FUNCTION public.process_partial_payment_simple IS 'Función simple para pagos parciales - marca is_paid = TRUE';
COMMENT ON VIEW public.worker_payment_summary IS 'Vista que calcula POR PAGAR basándose en is_paid = FALSE';


