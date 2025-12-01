-- =====================================================
-- VINCULAR CONTRATOS CON TAREAS
-- =====================================================
-- Esta migración agrega el campo contract_id a apartment_tasks
-- para poder rastrear bajo qué contrato se realizó cada tarea.
-- Incluye validación automática y funciones helper.
-- =====================================================

-- =====================================================
-- 1. AGREGAR CAMPO contract_id A apartment_tasks
-- =====================================================

ALTER TABLE public.apartment_tasks 
ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES public.contract_history(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.apartment_tasks.contract_id IS 
'ID del contrato bajo el cual se asignó esta tarea. Permite rastrear qué tareas se hicieron con cada contrato específico y validar que el trabajador tenga contrato activo en el proyecto.';

-- =====================================================
-- 2. CREAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice básico en contract_id
CREATE INDEX IF NOT EXISTS idx_apartment_tasks_contract_id 
ON public.apartment_tasks(contract_id) 
WHERE contract_id IS NOT NULL;

-- Índice compuesto para búsquedas frecuentes (trabajador + contrato)
CREATE INDEX IF NOT EXISTS idx_apartment_tasks_worker_contract 
ON public.apartment_tasks(assigned_to, contract_id) 
WHERE assigned_to IS NOT NULL AND contract_id IS NOT NULL;

-- Índice compuesto para búsquedas por contrato y estado
CREATE INDEX IF NOT EXISTS idx_apartment_tasks_contract_status
ON public.apartment_tasks(contract_id, status)
WHERE contract_id IS NOT NULL;

-- =====================================================
-- 3. FUNCIÓN PARA OBTENER TRABAJADORES DISPONIBLES
-- =====================================================
-- Retorna solo trabajadores con contrato activo en un proyecto

CREATE OR REPLACE FUNCTION get_available_workers_for_project(p_project_id INTEGER)
RETURNS TABLE (
  worker_id INTEGER,
  worker_name TEXT,
  worker_rut TEXT,
  worker_cargo TEXT,
  contract_id INTEGER,
  contract_number TEXT,
  contract_type TEXT,
  daily_rate NUMERIC(10,2),
  contract_start DATE,
  contract_end DATE
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id as worker_id,
    w.full_name as worker_name,
    w.rut as worker_rut,
    w.cargo as worker_cargo,
    ch.id as contract_id,
    ch.contract_number,
    ch.contract_type,
    ch.daily_rate,
    ch.fecha_inicio as contract_start,
    ch.fecha_termino as contract_end
  FROM workers w
  INNER JOIN contract_history ch ON w.id = ch.worker_id
  WHERE ch.project_id = p_project_id
    AND ch.status = 'activo'
    AND ch.is_active = true
    AND w.is_active = true
    AND (w.is_deleted = false OR w.is_deleted IS NULL)
  ORDER BY w.full_name;
END;
$$;

COMMENT ON FUNCTION get_available_workers_for_project IS 
'Obtiene lista de trabajadores con contrato activo en un proyecto específico. Usado al asignar tareas.';

-- =====================================================
-- 4. FUNCIÓN DE VALIDACIÓN DE ASIGNACIÓN
-- =====================================================
-- Valida que el trabajador tenga contrato activo en el proyecto
-- Si no se especifica contract_id, lo busca automáticamente

CREATE OR REPLACE FUNCTION validate_task_assignment()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id INTEGER;
  v_contract_active BOOLEAN;
  v_auto_contract_id INTEGER;
BEGIN
  -- Solo validar si se está asignando un trabajador
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Obtener el project_id de la tarea
  SELECT p.id INTO v_project_id
  FROM apartments a
  INNER JOIN floors f ON a.floor_id = f.id
  INNER JOIN projects p ON f.project_id = p.id
  WHERE a.id = NEW.apartment_id;
  
  -- Si no se puede determinar el proyecto, permitir (por compatibilidad)
  IF v_project_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- CASO 1: Se especificó tanto trabajador como contract_id
  IF NEW.contract_id IS NOT NULL THEN
    -- Verificar que el contrato existe, es del trabajador, es del proyecto correcto y está activo
    SELECT EXISTS(
      SELECT 1 FROM contract_history
      WHERE id = NEW.contract_id
        AND worker_id = NEW.assigned_to
        AND project_id = v_project_id
        AND status = 'activo'
        AND is_active = true
    ) INTO v_contract_active;
    
    IF NOT v_contract_active THEN
      RAISE EXCEPTION 'El contrato especificado (ID: %) no es válido, no pertenece al trabajador % o no está activo en el proyecto %', 
        NEW.contract_id, NEW.assigned_to, v_project_id;
    END IF;
    
    -- Contrato válido, continuar
    RETURN NEW;
  END IF;
  
  -- CASO 2: Se especificó trabajador pero NO contract_id
  -- Buscar automáticamente el contrato activo del trabajador en este proyecto
  SELECT id INTO v_auto_contract_id
  FROM contract_history
  WHERE worker_id = NEW.assigned_to
    AND project_id = v_project_id
    AND status = 'activo'
    AND is_active = true
  ORDER BY fecha_inicio DESC  -- Tomar el más reciente si hay varios
  LIMIT 1;
  
  -- Si se encontró contrato activo, asignarlo automáticamente
  IF v_auto_contract_id IS NOT NULL THEN
    NEW.contract_id := v_auto_contract_id;
    RETURN NEW;
  END IF;
  
  -- Si NO se encontró contrato activo, rechazar la asignación
  RAISE EXCEPTION 'El trabajador (ID: %) no tiene un contrato activo en el proyecto (ID: %). Debe crear un contrato primero antes de asignar tareas.', 
    NEW.assigned_to, v_project_id;
    
END;
$$;

COMMENT ON FUNCTION validate_task_assignment IS 
'Trigger function que valida asignaciones de tareas. Verifica que el trabajador tenga contrato activo en el proyecto. Si no se especifica contract_id, lo busca automáticamente.';

-- =====================================================
-- 5. CREAR TRIGGER PARA VALIDAR ASIGNACIONES
-- =====================================================

DROP TRIGGER IF EXISTS validate_task_assignment_trigger ON public.apartment_tasks;

CREATE TRIGGER validate_task_assignment_trigger
  BEFORE INSERT OR UPDATE OF assigned_to, contract_id ON public.apartment_tasks
  FOR EACH ROW
  WHEN (NEW.assigned_to IS NOT NULL)
  EXECUTE FUNCTION validate_task_assignment();

-- =====================================================
-- 6. VISTA ENRIQUECIDA CON INFORMACIÓN DE CONTRATO
-- =====================================================

CREATE OR REPLACE VIEW public.tasks_with_contract_info AS
SELECT 
  at.id as task_id,
  at.task_name,
  at.task_description,
  at.task_category,
  at.status,
  at.priority,
  at.worker_payment,
  at.is_paid,
  at.start_date,
  at.end_date,
  at.completed_at,
  at.is_delayed,
  at.delay_reason,
  
  -- Información del apartamento y proyecto
  a.id as apartment_id,
  a.apartment_number,
  f.id as floor_id,
  f.floor_number,
  p.id as project_id,
  p.name as project_name,
  
  -- Información del trabajador
  w.id as worker_id,
  w.full_name as worker_name,
  w.rut as worker_rut,
  w.cargo as worker_cargo,
  
  -- Información del contrato
  ch.id as contract_id,
  ch.contract_number,
  ch.contract_type,
  ch.daily_rate as contract_daily_rate,
  ch.fecha_inicio as contract_start,
  ch.fecha_termino as contract_end,
  ch.status as contract_status,
  
  -- Timestamps
  at.created_at,
  at.updated_at
FROM apartment_tasks at
INNER JOIN apartments a ON at.apartment_id = a.id
INNER JOIN floors f ON a.floor_id = f.id
INNER JOIN projects p ON f.project_id = p.id
LEFT JOIN workers w ON at.assigned_to = w.id
LEFT JOIN contract_history ch ON at.contract_id = ch.id
ORDER BY at.created_at DESC;

COMMENT ON VIEW public.tasks_with_contract_info IS 
'Vista enriquecida de tareas con información completa de contrato, trabajador y proyecto. Útil para reportes y consultas.';

-- =====================================================
-- 7. FUNCIÓN PARA OBTENER RESUMEN DE TAREAS POR CONTRATO
-- =====================================================

CREATE OR REPLACE FUNCTION get_contract_task_summary(p_contract_id INTEGER)
RETURNS TABLE (
  contract_id INTEGER,
  contract_number TEXT,
  worker_name TEXT,
  project_name TEXT,
  total_tasks BIGINT,
  pending_tasks BIGINT,
  in_progress_tasks BIGINT,
  completed_tasks BIGINT,
  total_budget NUMERIC,
  total_paid NUMERIC,
  total_pending NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ch.id as contract_id,
    ch.contract_number,
    w.full_name as worker_name,
    p.name as project_name,
    COUNT(at.id) as total_tasks,
    COUNT(CASE WHEN at.status = 'pending' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN at.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN at.status = 'completed' THEN 1 END) as completed_tasks,
    COALESCE(SUM(at.worker_payment), 0) as total_budget,
    COALESCE(SUM(CASE WHEN at.is_paid THEN at.worker_payment ELSE 0 END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN NOT at.is_paid THEN at.worker_payment ELSE 0 END), 0) as total_pending
  FROM contract_history ch
  INNER JOIN workers w ON ch.worker_id = w.id
  INNER JOIN projects p ON ch.project_id = p.id
  LEFT JOIN apartment_tasks at ON ch.id = at.contract_id
  WHERE ch.id = p_contract_id
  GROUP BY ch.id, ch.contract_number, w.full_name, p.name;
END;
$$;

COMMENT ON FUNCTION get_contract_task_summary IS 
'Obtiene resumen estadístico de tareas realizadas bajo un contrato específico. Incluye conteos por estado y montos.';

-- =====================================================
-- 8. ACTUALIZAR TAREAS EXISTENTES CON contract_id
-- =====================================================
-- Busca y asigna automáticamente el contract_id a tareas que tienen
-- assigned_to pero no tienen contract_id

DO $$
DECLARE
  task_record RECORD;
  v_project_id INTEGER;
  v_contract_id INTEGER;
  v_updated_count INTEGER := 0;
  v_no_contract_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Iniciando actualización de tareas existentes con contract_id...';
  
  FOR task_record IN 
    SELECT at.id, at.assigned_to, at.apartment_id
    FROM apartment_tasks at
    WHERE at.assigned_to IS NOT NULL
      AND at.contract_id IS NULL
  LOOP
    -- Obtener project_id de la tarea
    SELECT p.id INTO v_project_id
    FROM apartments a
    INNER JOIN floors f ON a.floor_id = f.id
    INNER JOIN projects p ON f.project_id = p.id
    WHERE a.id = task_record.apartment_id;
    
    IF v_project_id IS NULL THEN
      CONTINUE;  -- Saltar si no se puede determinar el proyecto
    END IF;
    
    -- Buscar contrato activo del trabajador en ese proyecto
    SELECT id INTO v_contract_id
    FROM contract_history
    WHERE worker_id = task_record.assigned_to
      AND project_id = v_project_id
      AND status = 'activo'
      AND is_active = true
    ORDER BY fecha_inicio DESC
    LIMIT 1;
    
    -- Si encontró contrato, actualizar la tarea
    IF v_contract_id IS NOT NULL THEN
      UPDATE apartment_tasks
      SET contract_id = v_contract_id
      WHERE id = task_record.id;
      
      v_updated_count := v_updated_count + 1;
    ELSE
      v_no_contract_count := v_no_contract_count + 1;
      RAISE NOTICE '⚠️  Tarea ID % no tiene contrato activo disponible (trabajador % en proyecto %)', 
        task_record.id, task_record.assigned_to, v_project_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Actualización completada:';
  RAISE NOTICE '   - Tareas actualizadas con contract_id: %', v_updated_count;
  RAISE NOTICE '   - Tareas sin contrato activo: %', v_no_contract_count;
END $$;

-- =====================================================
-- 9. VERIFICAR RESULTADOS
-- =====================================================

DO $$
DECLARE
  v_total_tasks BIGINT;
  v_tasks_with_worker BIGINT;
  v_tasks_with_contract BIGINT;
  v_tasks_without_contract BIGINT;
  v_percentage NUMERIC;
BEGIN
  -- Contar tareas
  SELECT COUNT(*) INTO v_total_tasks
  FROM apartment_tasks;
  
  SELECT COUNT(*) INTO v_tasks_with_worker
  FROM apartment_tasks
  WHERE assigned_to IS NOT NULL;
  
  SELECT COUNT(*) INTO v_tasks_with_contract
  FROM apartment_tasks
  WHERE assigned_to IS NOT NULL AND contract_id IS NOT NULL;
  
  SELECT COUNT(*) INTO v_tasks_without_contract
  FROM apartment_tasks
  WHERE assigned_to IS NOT NULL AND contract_id IS NULL;
  
  -- Calcular porcentaje
  IF v_tasks_with_worker > 0 THEN
    v_percentage := ROUND((v_tasks_with_contract::NUMERIC / v_tasks_with_worker::NUMERIC) * 100, 2);
  ELSE
    v_percentage := 0;
  END IF;
  
  -- Mostrar resultados
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '📊 RESUMEN DE MIGRACIÓN';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total de tareas: %', v_total_tasks;
  RAISE NOTICE 'Tareas con trabajador asignado: %', v_tasks_with_worker;
  RAISE NOTICE 'Tareas con contract_id: % (%%%)', v_tasks_with_contract, v_percentage;
  RAISE NOTICE 'Tareas sin contract_id: %', v_tasks_without_contract;
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  
  -- Mostrar algunos ejemplos
  RAISE NOTICE '📋 Ejemplos de tareas con contrato:';
  FOR v_record IN (
    SELECT 
      at.id,
      at.task_name,
      w.full_name as worker,
      ch.contract_number,
      p.name as project
    FROM apartment_tasks at
    LEFT JOIN workers w ON at.assigned_to = w.id
    LEFT JOIN contract_history ch ON at.contract_id = ch.id
    LEFT JOIN apartments a ON at.apartment_id = a.id
    LEFT JOIN floors f ON a.floor_id = f.id
    LEFT JOIN projects p ON f.project_id = p.id
    WHERE at.contract_id IS NOT NULL
    LIMIT 5
  )
  LOOP
    RAISE NOTICE '   Tarea #%: % - % (Contrato: %) - Proyecto: %', 
      v_record.id, v_record.task_name, v_record.worker, v_record.contract_number, v_record.project;
  END LOOP;
END $$;

-- =====================================================
-- 10. GRANT PERMISSIONS (si es necesario)
-- =====================================================

-- Asegurar que los usuarios autenticados puedan usar las nuevas funciones
GRANT EXECUTE ON FUNCTION get_available_workers_for_project TO authenticated;
GRANT EXECUTE ON FUNCTION get_contract_task_summary TO authenticated;

-- Asegurar que puedan leer la vista
GRANT SELECT ON public.tasks_with_contract_info TO authenticated;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

-- Log final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '🔗 Las tareas ahora están vinculadas a contratos';
  RAISE NOTICE '🛡️  Validación automática activada';
  RAISE NOTICE '';
END $$;

