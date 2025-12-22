-- 1. Modificar process_worker_payment_v2 para aceptar fecha personalizada
CREATE OR REPLACE FUNCTION public.process_worker_payment_v2(
  p_worker_id integer, 
  p_payment_amount numeric, 
  p_payment_notes text DEFAULT NULL::text, 
  p_assignment_ids integer[] DEFAULT NULL::integer[],
  p_payment_date timestamp DEFAULT NULL::timestamp -- Nuevo parámetro opcional
)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_payment_id INTEGER;
  v_assignments_to_pay INTEGER[];
  v_total_amount NUMERIC := 0;
  v_assignment_id INTEGER;
  v_tasks_count INTEGER;
  v_task_status VARCHAR(50);
  v_final_payment_date TIMESTAMP;
BEGIN
  -- Determinar fecha de pago (usar la proporcionada o now())
  v_final_payment_date := COALESCE(p_payment_date, now());

  -- 1. Validar que el trabajador existe
  IF NOT EXISTS(SELECT 1 FROM workers WHERE id = p_worker_id) THEN
    RAISE EXCEPTION 'El trabajador con ID % no existe', p_worker_id;
  END IF;
  
  -- 2. Determinar qué asignaciones pagar
  IF p_assignment_ids IS NULL THEN
    -- Pagar todas las asignaciones completadas y no pagadas
    SELECT ARRAY_AGG(ta.id)
    INTO v_assignments_to_pay
    FROM task_assignments ta
    INNER JOIN tasks t ON ta.task_id = t.id
    WHERE ta.worker_id = p_worker_id
      AND ta.assignment_status = 'completed'
      AND ta.is_paid = false
      AND ta.is_deleted = false
      AND t.status = 'completed'
      AND t.is_deleted = false;
  ELSE
    -- Validar que todas las asignaciones existen, pertenecen al trabajador,
    -- están completadas Y la tarea también está completada
    FOR v_assignment_id IN SELECT unnest(p_assignment_ids)
    LOOP
      SELECT t.status INTO v_task_status
      FROM task_assignments ta
      INNER JOIN tasks t ON ta.task_id = t.id
      WHERE ta.id = v_assignment_id 
        AND ta.worker_id = p_worker_id
        AND ta.assignment_status = 'completed'
        AND ta.is_paid = false
        AND ta.is_deleted = false
        AND t.is_deleted = false;
      
      IF v_task_status IS NULL THEN
        RAISE EXCEPTION 'La asignación % no existe, no pertenece al trabajador, no está completada o ya fue pagada', v_assignment_id;
      END IF;
      
      IF v_task_status != 'completed' THEN
        RAISE EXCEPTION 'La asignación % pertenece a una tarea que no está completada (estado: %). Solo se pueden pagar tareas completadas.', 
          v_assignment_id, v_task_status;
      END IF;
    END LOOP;
    
    v_assignments_to_pay := p_assignment_ids;
  END IF;
  
  -- 3. Verificar que hay asignaciones para pagar
  IF v_assignments_to_pay IS NULL OR array_length(v_assignments_to_pay, 1) = 0 THEN
    RAISE EXCEPTION 'No hay asignaciones completadas y pendientes de pago para este trabajador. Asegúrate de que las tareas estén marcadas como completadas.';
  END IF;
  
  -- 4. Calcular monto total y contar tareas
  SELECT 
    SUM(ta.worker_payment),
    COUNT(DISTINCT ta.task_id)
  INTO v_total_amount, v_tasks_count
  FROM task_assignments ta
  INNER JOIN tasks t ON ta.task_id = t.id
  WHERE ta.id = ANY(v_assignments_to_pay)
    AND t.status = 'completed'
    AND t.is_deleted = false;
  
  -- 5. Validar que el monto del pago coincide con el total
  IF p_payment_amount != v_total_amount THEN
    RAISE EXCEPTION 'El monto del pago ($%) no coincide con el total de las asignaciones ($%)', 
      p_payment_amount, v_total_amount;
  END IF;
  
  -- 6. Crear registro de pago (usando la fecha determinada)
  INSERT INTO worker_payment_history (
    worker_id,
    payment_date,
    total_amount,
    tasks_count,
    payment_status,
    notes,
    contract_type,
    created_by
  ) VALUES (
    p_worker_id,
    v_final_payment_date, -- Usar fecha calculada
    p_payment_amount,
    v_tasks_count,
    'completed',
    p_payment_notes,
    'a_trato',
    auth.uid()
  ) RETURNING id INTO v_payment_id;
  
  -- 7. Crear relaciones pago-asignaciones
  INSERT INTO payment_task_assignments (payment_id, task_assignment_id, amount_paid, task_id)
  SELECT 
    v_payment_id, 
    ta.id,
    ta.worker_payment,
    ta.task_id
  FROM task_assignments ta
  INNER JOIN tasks t ON ta.task_id = t.id
  WHERE ta.id = ANY(v_assignments_to_pay)
    AND t.status = 'completed'
    AND t.is_deleted = false;
  
  -- 8. Marcar asignaciones como pagadas
  UPDATE task_assignments
  SET 
    is_paid = true,
    paid_at = v_final_payment_date, -- Usar misma fecha
    updated_at = now()
  WHERE id = ANY(v_assignments_to_pay);
  
  -- 9. Actualizar income_tracking
  PERFORM update_income_tracking_payment(p_payment_amount);
  
  RETURN v_payment_id;
END;
$function$;

-- 2. Nueva función para actualizar la fecha de un pago existente
CREATE OR REPLACE FUNCTION public.update_payment_date(
  p_payment_id integer,
  p_new_date timestamp
)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Validar que el pago existe y no está eliminado
  IF NOT EXISTS (SELECT 1 FROM worker_payment_history WHERE id = p_payment_id AND is_deleted = false) THEN
    RAISE EXCEPTION 'El pago % no existe', p_payment_id;
  END IF;

  -- Actualizar historial
  UPDATE worker_payment_history
  SET payment_date = p_new_date
  WHERE id = p_payment_id;

  -- Actualizar assignments si existen
  -- Esto es opcional, pero mantiene coherencia si queremos saber cuándo se pagó la tarea realmente
  UPDATE task_assignments
  SET paid_at = p_new_date
  FROM payment_task_assignments pta
  WHERE task_assignments.id = pta.task_assignment_id
  AND pta.payment_id = p_payment_id;

  RETURN true;
END;
$function$;
