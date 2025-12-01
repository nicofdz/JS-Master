-- =====================================================
-- CONSOLIDACIÓN DE TAREAS DUPLICADAS
-- =====================================================
-- Este script consolida tareas duplicadas en tasks
-- que fueron creadas incorrectamente durante la migración
-- 
-- Proceso:
-- 1. Identifica grupos de tareas duplicadas (mismo apartment_id, task_name, task_category)
-- 2. Mantiene la tarea más antigua (ID más bajo)
-- 3. Consolida presupuesto, estados, notas, fotos
-- 4. Mueve todas las asignaciones a la tarea principal
-- 5. Recalcula porcentajes y montos
-- 6. Actualiza referencias en tablas relacionadas
-- 7. Soft delete de tareas duplicadas
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: Crear tabla temporal con grupos de tareas duplicadas
-- =====================================================

CREATE TEMP TABLE tareas_duplicadas_grupos AS
SELECT 
  apartment_id,
  task_name,
  task_category,
  MIN(id) as task_id_principal,  -- Mantener la más antigua
  ARRAY_AGG(id ORDER BY id) as todos_los_ids,
  SUM(total_budget) as total_budget_consolidado,
  MIN(created_at) as fecha_creacion,
  MAX(completed_at) as fecha_completado,  -- Tomar la más reciente si existe
  -- Tomar el estado más avanzado
  CASE 
    WHEN BOOL_OR(status = 'completed') THEN 'completed'
    WHEN BOOL_OR(status = 'in_progress') THEN 'in_progress'
    WHEN BOOL_OR(status = 'blocked') THEN 'blocked'
    WHEN BOOL_OR(status = 'cancelled') THEN 'cancelled'
    WHEN BOOL_OR(status = 'on_hold') THEN 'on_hold'
    ELSE 'pending'
  END as status_consolidado,
  -- Consolidar notas (concatenar si hay múltiples)
  STRING_AGG(
    DISTINCT COALESCE(notes, ''), 
    ' | ' 
    ORDER BY COALESCE(notes, '')
  ) FILTER (WHERE notes IS NOT NULL AND notes != '') as notas_consolidadas,
  -- Consolidar fotos (combinar arrays JSONB)
  COALESCE(
    (
      SELECT jsonb_agg(DISTINCT foto)
      FROM (
        SELECT jsonb_array_elements(progress_photos) as foto
        FROM tasks
        WHERE apartment_id = t.apartment_id
          AND task_name = t.task_name
          AND task_category = t.task_category
          AND is_deleted = false
          AND progress_photos IS NOT NULL
          AND jsonb_array_length(progress_photos) > 0
      ) fotos_individuales
    ),
    '[]'::jsonb
  ) as fotos_consolidadas,
  -- Consolidar otras fechas importantes
  MIN(start_date) as start_date_consolidado,
  MAX(end_date) as end_date_consolidado,
  MIN(estimated_hours) as estimated_hours_consolidado,
  MAX(priority) FILTER (WHERE priority IN ('urgent', 'high', 'medium', 'low')) as priority_consolidado
FROM tasks t
WHERE is_deleted = false
GROUP BY apartment_id, task_name, task_category
HAVING COUNT(*) > 1;

-- Verificar cuántos grupos se encontraron
DO $$
DECLARE
  grupos_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO grupos_count FROM tareas_duplicadas_grupos;
  RAISE NOTICE 'Grupos de tareas duplicadas encontrados: %', grupos_count;
END $$;

-- =====================================================
-- PASO 2: Actualizar tarea principal con datos consolidados
-- =====================================================

UPDATE tasks t
SET 
  total_budget = td.total_budget_consolidado,
  status = td.status_consolidado,
  notes = CASE 
    WHEN t.notes IS NULL OR t.notes = '' THEN td.notas_consolidadas
    WHEN td.notas_consolidadas IS NULL OR td.notas_consolidadas = '' THEN t.notes
    ELSE t.notes || ' | ' || td.notas_consolidadas
  END,
  progress_photos = CASE
    WHEN td.fotos_consolidadas IS NULL OR td.fotos_consolidadas = '[]'::jsonb THEN 
      COALESCE(t.progress_photos, '[]'::jsonb)
    WHEN t.progress_photos IS NULL OR t.progress_photos = '[]'::jsonb THEN 
      td.fotos_consolidadas
    ELSE 
      -- Combinar arrays sin duplicados
      (
        SELECT jsonb_agg(DISTINCT foto)
        FROM (
          SELECT jsonb_array_elements(t.progress_photos) as foto
          UNION
          SELECT jsonb_array_elements(td.fotos_consolidadas) as foto
        ) fotos_combinadas
      )
  END,
  start_date = COALESCE(td.start_date_consolidado, t.start_date),
  end_date = COALESCE(td.end_date_consolidado, t.end_date),
  estimated_hours = COALESCE(td.estimated_hours_consolidado, t.estimated_hours),
  priority = COALESCE(td.priority_consolidado, t.priority),
  completed_at = COALESCE(td.fecha_completado, t.completed_at),
  updated_at = NOW()
FROM tareas_duplicadas_grupos td
WHERE t.id = td.task_id_principal;

-- =====================================================
-- PASO 3: Mover asignaciones de tareas duplicadas a la principal
-- =====================================================

UPDATE task_assignments ta
SET 
  task_id = td.task_id_principal,
  updated_at = NOW()
FROM tareas_duplicadas_grupos td
WHERE ta.task_id = ANY(td.todos_los_ids[2:])  -- Todos excepto el primero (la principal)
  AND ta.is_deleted = false;

-- =====================================================
-- PASO 4: Recalcular porcentajes y montos de asignaciones
-- =====================================================
-- Esto se hace automáticamente con el trigger recalculate_payments_on_budget_change
-- cuando actualizamos total_budget, pero lo hacemos manualmente para asegurar

DO $$
DECLARE
  task_rec RECORD;
  total_workers INTEGER;
  percentage_per_worker NUMERIC;
  total_budget_task NUMERIC;
BEGIN
  FOR task_rec IN 
    SELECT DISTINCT task_id_principal, total_budget_consolidado
    FROM tareas_duplicadas_grupos
  LOOP
    -- Contar trabajadores activos en esta tarea
    SELECT COUNT(*) INTO total_workers
    FROM task_assignments
    WHERE task_id = task_rec.task_id_principal
      AND is_deleted = false;
    
    IF total_workers > 0 THEN
      -- Calcular porcentaje equitativo
      percentage_per_worker := 100.0 / total_workers;
      total_budget_task := task_rec.total_budget_consolidado;
      
      -- Actualizar porcentajes y montos
      UPDATE task_assignments
      SET 
        payment_share_percentage = percentage_per_worker,
        worker_payment = (total_budget_task * percentage_per_worker / 100.0),
        updated_at = NOW()
      WHERE task_id = task_rec.task_id_principal
        AND is_deleted = false;
      
      RAISE NOTICE 'Tarea %: % trabajadores, %%% por trabajador, presupuesto total: %', 
        task_rec.task_id_principal, total_workers, percentage_per_worker, total_budget_task;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- PASO 5: Actualizar referencias en payment_task_assignments
-- =====================================================

UPDATE payment_task_assignments pta
SET task_id = td.task_id_principal
FROM tareas_duplicadas_grupos td
WHERE pta.task_id = ANY(td.todos_los_ids[2:]);

-- =====================================================
-- PASO 6: Actualizar referencias en payment_distribution_history
-- =====================================================

UPDATE payment_distribution_history pdh
SET task_id = td.task_id_principal
FROM tareas_duplicadas_grupos td
WHERE pdh.task_id = ANY(td.todos_los_ids[2:]);

-- =====================================================
-- PASO 7: Soft delete de tareas duplicadas
-- =====================================================

UPDATE tasks
SET 
  is_deleted = true,
  deleted_at = NOW(),
  deleted_by = (SELECT id FROM auth.users LIMIT 1),  -- Usuario del sistema
  deletion_reason = 'Consolidada en tarea principal (ID: ' || 
    (SELECT task_id_principal FROM tareas_duplicadas_grupos td 
     WHERE tasks.apartment_id = td.apartment_id 
       AND tasks.task_name = td.task_name 
       AND tasks.task_category = td.task_category 
     LIMIT 1) || 
    ') durante migración de consolidación'
WHERE id IN (
  SELECT unnest(todos_los_ids[2:])
  FROM tareas_duplicadas_grupos
);

-- =====================================================
-- PASO 8: Verificación y Reporte
-- =====================================================

DO $$
DECLARE
  grupos_consolidados INTEGER;
  tareas_eliminadas INTEGER;
  asignaciones_movidas INTEGER;
BEGIN
  SELECT COUNT(*) INTO grupos_consolidados FROM tareas_duplicadas_grupos;
  
  SELECT COUNT(*) INTO tareas_eliminadas
  FROM tasks
  WHERE is_deleted = true
    AND deletion_reason LIKE '%Consolidada en tarea principal%';
  
  SELECT COUNT(*) INTO asignaciones_movidas
  FROM task_assignments
  WHERE updated_at > NOW() - INTERVAL '1 minute';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE CONSOLIDACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Grupos consolidados: %', grupos_consolidados;
  RAISE NOTICE 'Tareas eliminadas (soft delete): %', tareas_eliminadas;
  RAISE NOTICE 'Asignaciones movidas: %', asignaciones_movidas;
  RAISE NOTICE '========================================';
END $$;

-- Mostrar algunos ejemplos de consolidación
SELECT 
  'Ejemplo de consolidación' as tipo,
  td.apartment_id,
  td.task_name,
  td.task_category,
  td.task_id_principal as tarea_principal,
  array_length(td.todos_los_ids, 1) - 1 as tareas_eliminadas,
  td.total_budget_consolidado as presupuesto_total,
  (
    SELECT COUNT(*) 
    FROM task_assignments 
    WHERE task_id = td.task_id_principal AND is_deleted = false
  ) as trabajadores_asignados
FROM tareas_duplicadas_grupos td
ORDER BY td.apartment_id
LIMIT 10;

COMMIT;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que no queden tareas duplicadas
SELECT 
  'Verificación: Tareas duplicadas restantes' as verificacion,
  COUNT(*) as cantidad
FROM (
  SELECT apartment_id, task_name, task_category
  FROM tasks
  WHERE is_deleted = false
  GROUP BY apartment_id, task_name, task_category
  HAVING COUNT(*) > 1
) duplicados_restantes;

-- Si la cantidad es 0, la consolidación fue exitosa

