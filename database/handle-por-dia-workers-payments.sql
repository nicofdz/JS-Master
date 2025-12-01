-- =====================================================
-- MANEJO DE TRABAJADORES "POR_DIA" EN TAREAS
-- Los trabajadores "por_dia" pueden participar en tareas
-- pero NO reciben pago (worker_payment = 0)
-- =====================================================

-- Función auxiliar para obtener contract_type de un trabajador en un proyecto
CREATE OR REPLACE FUNCTION get_worker_contract_type(
  p_worker_id INTEGER,
  p_project_id INTEGER
)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
DECLARE
  v_contract_type VARCHAR(20);
BEGIN
  SELECT contract_type INTO v_contract_type
  FROM contract_history
  WHERE worker_id = p_worker_id
    AND project_id = p_project_id
    AND status = 'activo'
    AND is_active = true
  ORDER BY fecha_inicio DESC
  LIMIT 1;
  
  RETURN COALESCE(v_contract_type, 'a_trato'); -- Default a 'a_trato' si no se encuentra
END;
$$;

COMMENT ON FUNCTION get_worker_contract_type IS 'Obtiene el tipo de contrato (por_dia o a_trato) de un trabajador en un proyecto específico';

-- =====================================================
-- MODIFICAR assign_worker_to_task
-- =====================================================

CREATE OR REPLACE FUNCTION public.assign_worker_to_task(
  p_task_id integer, 
  p_worker_id integer, 
  p_role character varying DEFAULT 'worker'::character varying
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  v_assignment_id INTEGER;
  v_task_exists BOOLEAN;
  v_worker_exists BOOLEAN;
  v_total_budget NUMERIC;
  v_current_workers_count INTEGER;
  v_old_distribution JSONB;
  v_existing_removed_assignment_id INTEGER;
  v_previous_percentage NUMERIC;
  v_restored_percentage NUMERIC;
  v_restored_amount NUMERIC;
  v_total_active_percentage NUMERIC;
  v_remaining_percentage NUMERIC;
  v_ratio NUMERIC;
  v_old_status VARCHAR(50);
  v_old_percentage NUMERIC;
  v_old_payment NUMERIC;
  v_new_percentage NUMERIC;
  v_new_payment NUMERIC;
  v_project_id INTEGER;
  v_contract_type VARCHAR(20);
  v_workers_a_trato_count INTEGER;
BEGIN
  -- 1. Validar que la tarea existe y no está eliminada
  SELECT EXISTS(
    SELECT 1 FROM tasks 
    WHERE id = p_task_id AND is_deleted = false
  ) INTO v_task_exists;
  
  IF NOT v_task_exists THEN
    RAISE EXCEPTION 'La tarea con ID % no existe o está eliminada', p_task_id;
  END IF;
  
  -- 2. Validar que el trabajador existe y está activo
  SELECT EXISTS(
    SELECT 1 FROM workers 
    WHERE id = p_worker_id AND is_active = true
  ) INTO v_worker_exists;
  
  IF NOT v_worker_exists THEN
    RAISE EXCEPTION 'El trabajador con ID % no existe o está inactivo', p_worker_id;
  END IF;
  
  -- 3. Obtener project_id de la tarea
  SELECT tw.project_id INTO v_project_id
  FROM tasks t
  JOIN apartments a ON t.apartment_id = a.id
  JOIN floors f ON a.floor_id = f.id
  JOIN towers tw ON f.tower_id = tw.id
  WHERE t.id = p_task_id;
  
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar el proyecto de la tarea %', p_task_id;
  END IF;
  
  -- 4. Obtener contract_type del trabajador
  v_contract_type := get_worker_contract_type(p_worker_id, v_project_id);
  
  -- 5. Verificar si ya existe una asignación activa (no removida)
  IF EXISTS(
    SELECT 1 FROM task_assignments 
    WHERE task_id = p_task_id 
      AND worker_id = p_worker_id 
      AND assignment_status NOT IN ('removed')
      AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'El trabajador ya está asignado a esta tarea';
  END IF;
  
  -- 6. Verificar si existe una asignación removida que se pueda reactivar
  SELECT 
    id,
    previous_payment_share_percentage,
    assignment_status,
    payment_share_percentage,
    worker_payment
  INTO v_existing_removed_assignment_id, v_previous_percentage, v_old_status, v_old_percentage, v_old_payment
  FROM task_assignments
  WHERE task_id = p_task_id
    AND worker_id = p_worker_id
    AND assignment_status = 'removed'
    AND is_deleted = false
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- 7. Obtener presupuesto total de la tarea
  SELECT total_budget INTO v_total_budget
  FROM tasks WHERE id = p_task_id;
  
  -- 8. Contar trabajadores actuales activos (sin contar removidos ni eliminados)
  SELECT COUNT(*) INTO v_current_workers_count
  FROM task_assignments
  WHERE task_id = p_task_id 
    AND assignment_status NOT IN ('removed')
    AND is_deleted = false;
  
  -- 9. Contar trabajadores "a_trato" activos (para distribución de pagos)
  -- ✅ Usar contract_type desde task_assignments (snapshot histórico)
  SELECT COUNT(*) INTO v_workers_a_trato_count
  FROM task_assignments ta
  WHERE ta.task_id = p_task_id
    AND ta.assignment_status NOT IN ('removed')
    AND ta.is_deleted = false
    AND ta.contract_type = 'a_trato';
  
  -- Si el trabajador a asignar es "por_dia", agregarlo al conteo de trabajadores pero no al de "a_trato"
  IF v_contract_type = 'por_dia' THEN
    -- No incrementar v_workers_a_trato_count
    NULL;
  ELSE
    -- Incrementar contador de trabajadores "a_trato"
    v_workers_a_trato_count := v_workers_a_trato_count + 1;
  END IF;
  
  -- 10. Guardar distribución antigua para auditoría
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'worker_id', ta.worker_id,
        'worker_name', w.full_name,
        'percentage', ta.payment_share_percentage,
        'amount', ta.worker_payment
      )
    ),
    '[]'::json
  )::jsonb INTO v_old_distribution
  FROM task_assignments ta
  LEFT JOIN workers w ON w.id = ta.worker_id
  WHERE ta.task_id = p_task_id 
    AND ta.assignment_status NOT IN ('removed')
    AND ta.is_deleted = false;
  
  -- 11. Determinar porcentaje y pago según contract_type
  IF v_contract_type = 'por_dia' THEN
    -- Trabajador "por_dia": pago = 0, porcentaje = 0
    v_new_percentage := 0;
    v_new_payment := 0;
    
    -- Si había porcentaje anterior, ignorarlo (siempre será 0 para "por_dia")
    v_restored_percentage := 0;
    v_restored_amount := 0;
  ELSE
    -- Trabajador "a_trato": calcular distribución normal
    -- Si existe una asignación removida con porcentaje anterior, restaurarlo
    IF v_existing_removed_assignment_id IS NOT NULL AND v_previous_percentage IS NOT NULL THEN
      v_restored_percentage := v_previous_percentage;
      v_restored_amount := (v_total_budget * v_restored_percentage / 100.0);
      v_new_percentage := v_restored_percentage;
      v_new_payment := v_restored_amount;
    ELSE
      -- Distribución equitativa solo entre trabajadores "a_trato"
      IF v_workers_a_trato_count > 0 THEN
        v_new_percentage := 100.0 / v_workers_a_trato_count;
        v_new_payment := v_total_budget / v_workers_a_trato_count;
      ELSE
        v_new_percentage := 100.0;
        v_new_payment := v_total_budget;
      END IF;
    END IF;
  END IF;
  
  -- 12. Si existe una asignación removida, reactivarla
  IF v_existing_removed_assignment_id IS NOT NULL THEN
    -- Reactivar el trabajador
    UPDATE task_assignments
    SET 
      assignment_status = 'assigned',
      role = p_role,
      payment_share_percentage = v_new_percentage,
      worker_payment = v_new_payment,
      previous_payment_share_percentage = NULL,
      contract_type = v_contract_type,  -- ✅ Actualizar contract_type al reactivar
      notes = CASE 
        WHEN notes IS NOT NULL AND notes != '' THEN
          notes || E'\n\n[Reactivado: ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || ']'
        ELSE
          '[Reactivado: ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || ']'
      END,
      updated_at = now()
    WHERE id = v_existing_removed_assignment_id
    RETURNING id INTO v_assignment_id;
    
    -- Registrar reactivación en historial
    INSERT INTO task_assignment_history (
      task_assignment_id,
      task_id,
      worker_id,
      action,
      action_by,
      old_status,
      new_status,
      old_percentage,
      new_percentage,
      old_payment,
      new_payment,
      notes_snapshot
    ) VALUES (
      v_assignment_id,
      p_task_id,
      p_worker_id,
      'reactivated',
      auth.uid(),
      v_old_status,
      'assigned',
      v_old_percentage,
      v_new_percentage,
      v_old_payment,
      v_new_payment,
      (SELECT notes FROM task_assignments WHERE id = v_assignment_id)
    );
  ELSE
    -- 13. Crear nueva asignación
    INSERT INTO task_assignments (
      task_id, 
      worker_id, 
      role,
      payment_share_percentage,
      worker_payment,
      previous_payment_share_percentage,
      assigned_by,
      contract_type  -- ✅ Guardar snapshot del tipo de contrato
    ) VALUES (
      p_task_id,
      p_worker_id,
      p_role,
      v_new_percentage,
      v_new_payment,
      NULL,
      auth.uid(),
      v_contract_type  -- ✅ Usar el contract_type obtenido anteriormente
    ) RETURNING id INTO v_assignment_id;
    
    -- Registrar asignación en historial
    INSERT INTO task_assignment_history (
      task_assignment_id,
      task_id,
      worker_id,
      action,
      action_by,
      old_status,
      new_status,
      old_percentage,
      new_percentage,
      old_payment,
      new_payment
    ) VALUES (
      v_assignment_id,
      p_task_id,
      p_worker_id,
      'assigned',
      auth.uid(),
      NULL,
      'assigned',
      NULL,
      v_new_percentage,
      NULL,
      v_new_payment
    );
  END IF;
  
  -- 14. Redistribuir pagos solo entre trabajadores "a_trato"
  -- ✅ Usar contract_type desde task_assignments (snapshot histórico)
  -- Calcular porcentaje total actual de trabajadores "a_trato"
  SELECT COALESCE(SUM(ta.payment_share_percentage), 0) INTO v_total_active_percentage
  FROM task_assignments ta
  WHERE ta.task_id = p_task_id
    AND ta.assignment_status NOT IN ('removed')
    AND ta.is_deleted = false
    AND ta.contract_type = 'a_trato';
  
  -- Redistribuir equitativamente solo entre trabajadores "a_trato"
  -- ✅ Usar contract_type desde task_assignments (snapshot histórico)
  IF v_workers_a_trato_count > 0 THEN
    UPDATE task_assignments
    SET 
      payment_share_percentage = 100.0 / v_workers_a_trato_count,
      worker_payment = (v_total_budget * (100.0 / v_workers_a_trato_count) / 100.0),
      updated_at = now()
    WHERE task_id = p_task_id
      AND assignment_status NOT IN ('removed')
      AND is_deleted = false
      AND contract_type = 'a_trato';
  END IF;
  
  -- 15. Registrar cambio en historial de distribución de pagos
  INSERT INTO payment_distribution_history (
    task_id,
    old_distribution,
    new_distribution,
    changed_by,
    change_reason
  )
  SELECT 
    p_task_id,
    v_old_distribution,
    json_agg(
      json_build_object(
        'worker_id', ta.worker_id,
        'worker_name', w.full_name,
        'percentage', ta.payment_share_percentage,
        'amount', ta.worker_payment
      )
    )::jsonb,
    auth.uid(),
    CASE 
      WHEN v_existing_removed_assignment_id IS NOT NULL AND v_previous_percentage IS NOT NULL THEN
        'Reactivación de trabajador removido - porcentaje restaurado'
      WHEN v_existing_removed_assignment_id IS NOT NULL THEN
        'Reactivación de trabajador removido - redistribución equitativa'
      WHEN v_contract_type = 'por_dia' THEN
        'Asignación de trabajador por_dia - sin pago'
      ELSE
        'Asignación automática de trabajador - redistribución equitativa'
    END
  FROM task_assignments ta
  LEFT JOIN workers w ON w.id = ta.worker_id
  WHERE ta.task_id = p_task_id 
    AND ta.assignment_status NOT IN ('removed')
    AND ta.is_deleted = false;
  
  RAISE NOTICE 'Trabajador % (contract_type: %) asignado a tarea %. Asignación ID: %. Porcentaje: %.2f%%, Pago: %', 
    p_worker_id, v_contract_type, p_task_id, v_assignment_id, v_new_percentage, v_new_payment;
  
  RETURN v_assignment_id;
END;
$function$;

COMMENT ON FUNCTION public.assign_worker_to_task IS 'Asigna un trabajador a una tarea. Si el trabajador es "por_dia", su worker_payment será 0. Solo trabajadores "a_trato" participan en la distribución del presupuesto.';

-- =====================================================
-- MODIFICAR adjust_payment_distribution
-- =====================================================

CREATE OR REPLACE FUNCTION public.adjust_payment_distribution(
  p_task_id integer, 
  p_distributions jsonb, 
  p_change_reason text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_total_budget NUMERIC;
  v_total_percentage NUMERIC := 0;
  v_distribution JSONB;
  v_worker_id INTEGER;
  v_percentage NUMERIC;
  v_amount NUMERIC;
  v_old_distribution JSONB;
  v_project_id INTEGER;
  v_contract_type VARCHAR(20);
BEGIN
  -- 1. Validar que la tarea existe
  IF NOT EXISTS(SELECT 1 FROM tasks WHERE id = p_task_id AND is_deleted = false) THEN
    RAISE EXCEPTION 'La tarea con ID % no existe o está eliminada', p_task_id;
  END IF;
  
  -- 2. Obtener presupuesto total
  SELECT total_budget INTO v_total_budget
  FROM tasks WHERE id = p_task_id;
  
  -- 3. Obtener project_id de la tarea
  SELECT tw.project_id INTO v_project_id
  FROM tasks t
  JOIN apartments a ON t.apartment_id = a.id
  JOIN floors f ON a.floor_id = f.id
  JOIN towers tw ON f.tower_id = tw.id
  WHERE t.id = p_task_id;
  
  -- 4. Validar que la suma de porcentajes sea 100% (solo trabajadores "a_trato")
  -- Primero, verificar que no se intente modificar trabajadores "por_dia"
  -- ✅ Usar contract_type desde task_assignments (snapshot histórico)
  FOR v_distribution IN SELECT * FROM jsonb_array_elements(p_distributions)
  LOOP
    v_worker_id := (v_distribution->>'worker_id')::INTEGER;
    
    -- Obtener contract_type desde task_assignments (snapshot histórico)
    SELECT contract_type INTO v_contract_type
    FROM task_assignments
    WHERE task_id = p_task_id
      AND worker_id = v_worker_id
      AND assignment_status != 'removed'
      AND is_deleted = false
    LIMIT 1;
    
    -- Si es "por_dia", verificar que el porcentaje sea 0
    IF v_contract_type = 'por_dia' THEN
      v_percentage := (v_distribution->>'percentage')::NUMERIC;
      IF v_percentage != 0 THEN
        RAISE EXCEPTION 'No se puede modificar el pago de trabajadores "por_dia". El porcentaje debe ser 0 para el trabajador %', v_worker_id;
      END IF;
    END IF;
  END LOOP;
  
  -- Calcular suma de porcentajes solo de trabajadores "a_trato"
  -- ✅ Usar contract_type desde task_assignments (snapshot histórico)
  SELECT COALESCE(SUM((value->>'percentage')::NUMERIC), 0) INTO v_total_percentage
  FROM jsonb_array_elements(p_distributions) dist
  JOIN task_assignments ta ON ta.task_id = p_task_id
    AND ta.worker_id = (dist->>'worker_id')::INTEGER
    AND ta.assignment_status != 'removed'
    AND ta.is_deleted = false
  WHERE ta.contract_type = 'a_trato';
  
  IF v_total_percentage != 100 THEN
    RAISE EXCEPTION 'La suma de porcentajes de trabajadores "a_trato" debe ser 100 porciento (actual: %)', v_total_percentage;
  END IF;
  
  -- 5. Validar que todos los trabajadores existan en la tarea
  FOR v_distribution IN SELECT * FROM jsonb_array_elements(p_distributions)
  LOOP
    v_worker_id := (v_distribution->>'worker_id')::INTEGER;
    
    IF NOT EXISTS(
      SELECT 1 FROM task_assignments 
      WHERE task_id = p_task_id 
        AND worker_id = v_worker_id
        AND assignment_status NOT IN ('removed')
        AND is_deleted = false
    ) THEN
      RAISE EXCEPTION 'El trabajador con ID % no está asignado a esta tarea', v_worker_id;
    END IF;
  END LOOP;
  
  -- 6. Guardar distribución antigua para auditoría
  SELECT json_agg(
    json_build_object(
      'worker_id', ta.worker_id,
      'worker_name', w.full_name,
      'percentage', ta.payment_share_percentage,
      'amount', ta.worker_payment
    )
  )::jsonb INTO v_old_distribution
  FROM task_assignments ta
  LEFT JOIN workers w ON w.id = ta.worker_id
  WHERE ta.task_id = p_task_id 
    AND ta.assignment_status NOT IN ('removed')
    AND ta.is_deleted = false;
  
  -- 7. Actualizar cada asignación con nueva distribución
  FOR v_distribution IN SELECT * FROM jsonb_array_elements(p_distributions)
  LOOP
    v_worker_id := (v_distribution->>'worker_id')::INTEGER;
    v_percentage := (v_distribution->>'percentage')::NUMERIC;
    v_amount := v_total_budget * v_percentage / 100;
    
    UPDATE task_assignments
    SET 
      payment_share_percentage = v_percentage,
      worker_payment = v_amount,
      updated_at = now()
    WHERE task_id = p_task_id
      AND worker_id = v_worker_id
      AND is_deleted = false;
  END LOOP;
  
  -- 8. Registrar cambio en historial (usar reason proporcionado o default)
  INSERT INTO payment_distribution_history (
    task_id,
    old_distribution,
    new_distribution,
    changed_by,
    change_reason
  )
  SELECT 
    p_task_id,
    v_old_distribution,
    json_agg(
      json_build_object(
        'worker_id', ta.worker_id,
        'worker_name', w.full_name,
        'percentage', ta.payment_share_percentage,
        'amount', ta.worker_payment
      )
    )::jsonb,
    auth.uid(),
    COALESCE(p_change_reason, 'Ajuste manual de distribución de pagos')
  FROM task_assignments ta
  LEFT JOIN workers w ON w.id = ta.worker_id
  WHERE ta.task_id = p_task_id 
    AND ta.assignment_status NOT IN ('removed')
    AND ta.is_deleted = false;
  
  RAISE NOTICE 'Distribución de pagos actualizada manualmente para tarea %', p_task_id;
END;
$function$;

COMMENT ON FUNCTION public.adjust_payment_distribution IS 'Ajusta la distribución de pagos de una tarea. No permite modificar pagos de trabajadores "por_dia" (deben mantener porcentaje 0). Solo trabajadores "a_trato" participan en el cálculo del 100%.';

-- =====================================================
-- MODIFICAR recalculate_payments_on_budget_change
-- =====================================================

CREATE OR REPLACE FUNCTION public.recalculate_payments_on_budget_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_old_distribution JSONB;
  v_project_id INTEGER;
BEGIN
  -- Solo ejecutar si cambió el presupuesto
  IF OLD.total_budget IS DISTINCT FROM NEW.total_budget THEN
    
    -- Obtener project_id de la tarea
    SELECT tw.project_id INTO v_project_id
    FROM tasks t
    JOIN apartments a ON t.apartment_id = a.id
    JOIN floors f ON a.floor_id = f.id
    JOIN towers tw ON f.tower_id = tw.id
    WHERE t.id = NEW.id;
    
    -- Guardar distribución antigua
    SELECT json_agg(
      json_build_object(
        'worker_id', ta.worker_id,
        'worker_name', w.full_name,
        'percentage', ta.payment_share_percentage,
        'amount', ta.worker_payment
      )
    )::jsonb INTO v_old_distribution
    FROM task_assignments ta
    LEFT JOIN workers w ON w.id = ta.worker_id
    WHERE ta.task_id = NEW.id 
      AND ta.assignment_status NOT IN ('removed')
      AND ta.is_deleted = false;
    
    -- Recalcular montos manteniendo porcentajes
    -- ✅ Usar contract_type desde task_assignments (snapshot histórico)
    -- Solo para trabajadores "a_trato" (los "por_dia" mantienen 0)
    UPDATE task_assignments ta
    SET 
      worker_payment = CASE 
        WHEN ta.contract_type = 'a_trato' THEN NEW.total_budget * ta.payment_share_percentage / 100
        ELSE 0  -- Mantener 0 para trabajadores "por_dia"
      END,
      updated_at = now()
    WHERE ta.task_id = NEW.id
      AND ta.is_deleted = false;
    
    -- Registrar cambio en historial solo si había asignaciones
    IF v_old_distribution IS NOT NULL AND jsonb_array_length(v_old_distribution) > 0 THEN
      INSERT INTO payment_distribution_history (
        task_id,
        old_distribution,
        new_distribution,
        changed_by,
        change_reason
      )
      SELECT 
        NEW.id,
        v_old_distribution,
        json_agg(
          json_build_object(
            'worker_id', ta.worker_id,
            'worker_name', w.full_name,
            'percentage', ta.payment_share_percentage,
            'amount', ta.worker_payment
          )
        )::jsonb,
        auth.uid(),
        format('Recalculo automático por cambio de presupuesto de $%s a $%s', 
          OLD.total_budget, NEW.total_budget)
      FROM task_assignments ta
      LEFT JOIN workers w ON w.id = ta.worker_id
      WHERE ta.task_id = NEW.id 
        AND ta.assignment_status NOT IN ('removed')
        AND ta.is_deleted = false;
    END IF;
    
    RAISE NOTICE 'Pagos recalculados para tarea % (presupuesto: $% → $%)', 
      NEW.id, OLD.total_budget, NEW.total_budget;
  END IF;
  
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.recalculate_payments_on_budget_change IS 'Recalcula los pagos cuando cambia el presupuesto de una tarea. Los trabajadores "por_dia" mantienen worker_payment = 0.';

