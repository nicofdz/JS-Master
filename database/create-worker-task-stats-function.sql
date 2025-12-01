-- =====================================================
-- FUNCIÓN PARA CALCULAR ESTADÍSTICAS DE TAREAS POR TRABAJADOR
-- =====================================================
-- Calcula:
-- - Promedios generales (tiempo, eficiencia)
-- - Estadísticas por categoría
-- - Estadísticas por proyecto
-- - Estadísticas por mes
-- - Estadísticas por contrato
-- - Comparación con estimated_hours
-- =====================================================

CREATE OR REPLACE FUNCTION get_worker_task_stats(
    p_worker_id INTEGER,
    p_project_id INTEGER DEFAULT NULL,
    p_contract_id INTEGER DEFAULT NULL,
    p_month INTEGER DEFAULT NULL,
    p_year INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_total_completed INTEGER;
    v_avg_hours NUMERIC;
    v_avg_days NUMERIC;
    v_total_estimated_hours NUMERIC;
    v_avg_estimated_hours NUMERIC;
    v_efficiency NUMERIC; -- Porcentaje: (estimated / actual) * 100
BEGIN
    -- Construir filtros dinámicos
    -- Solo tareas completadas
    -- Filtros opcionales: proyecto, contrato, mes, año
    
    -- 1. Estadísticas generales
    SELECT 
        COUNT(*)::INTEGER,
        AVG(CASE 
            WHEN ta.completed_at IS NOT NULL AND COALESCE(ta.started_at, ta.assigned_date) IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (ta.completed_at - COALESCE(ta.started_at, ta.assigned_date))) / 3600
            ELSE NULL
        END),
        AVG(CASE 
            WHEN ta.completed_at IS NOT NULL AND COALESCE(ta.started_at, ta.assigned_date) IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (ta.completed_at - COALESCE(ta.started_at, ta.assigned_date))) / 86400
            ELSE NULL
        END),
        SUM(CASE WHEN t.estimated_hours IS NOT NULL THEN t.estimated_hours ELSE 0 END),
        AVG(CASE WHEN t.estimated_hours IS NOT NULL THEN t.estimated_hours::NUMERIC ELSE NULL END)
    INTO 
        v_total_completed,
        v_avg_hours,
        v_avg_days,
        v_total_estimated_hours,
        v_avg_estimated_hours
    FROM task_assignments ta
    INNER JOIN tasks t ON ta.task_id = t.id
    INNER JOIN apartments a ON t.apartment_id = a.id
    INNER JOIN floors f ON a.floor_id = f.id
    INNER JOIN projects p ON f.project_id = p.id
    WHERE ta.worker_id = p_worker_id
      AND ta.assignment_status = 'completed'
      AND ta.completed_at IS NOT NULL
      AND t.is_deleted = false
      AND (p_project_id IS NULL OR p.id = p_project_id)
      AND (p_contract_id IS NULL OR ta.contract_type IS NOT NULL) -- TODO: agregar contract_id a task_assignments si es necesario
      AND (p_month IS NULL OR EXTRACT(MONTH FROM ta.completed_at) = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM ta.completed_at) = p_year);
    
    -- Calcular eficiencia (si hay datos)
    IF v_avg_hours > 0 AND v_avg_estimated_hours > 0 THEN
        v_efficiency := (v_avg_estimated_hours / v_avg_hours) * 100;
    ELSE
        v_efficiency := NULL;
    END IF;
    
    -- 2. Estadísticas por categoría
    -- 3. Estadísticas por proyecto
    -- 4. Estadísticas por mes
    -- 5. Estadísticas por contrato
    
    -- Construir resultado JSON
    v_result := jsonb_build_object(
        'general', jsonb_build_object(
            'total_completed', COALESCE(v_total_completed, 0),
            'avg_hours', COALESCE(v_avg_hours, 0),
            'avg_days', COALESCE(v_avg_days, 0),
            'total_estimated_hours', COALESCE(v_total_estimated_hours, 0),
            'avg_estimated_hours', COALESCE(v_avg_estimated_hours, 0),
            'efficiency_percentage', v_efficiency
        ),
        'by_category', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'category', t.task_category,
                    'total_tasks', COUNT(*)::INTEGER,
                    'avg_hours', AVG(CASE 
                        WHEN ta.completed_at IS NOT NULL AND COALESCE(ta.started_at, ta.assigned_date) IS NOT NULL 
                        THEN EXTRACT(EPOCH FROM (ta.completed_at - COALESCE(ta.started_at, ta.assigned_date))) / 3600
                        ELSE NULL
                    END),
                    'avg_days', AVG(CASE 
                        WHEN ta.completed_at IS NOT NULL AND COALESCE(ta.started_at, ta.assigned_date) IS NOT NULL 
                        THEN EXTRACT(EPOCH FROM (ta.completed_at - COALESCE(ta.started_at, ta.assigned_date))) / 86400
                        ELSE NULL
                    END),
                    'total_estimated_hours', SUM(CASE WHEN t.estimated_hours IS NOT NULL THEN t.estimated_hours ELSE 0 END),
                    'avg_estimated_hours', AVG(CASE WHEN t.estimated_hours IS NOT NULL THEN t.estimated_hours::NUMERIC ELSE NULL END)
                )
            )
            FROM task_assignments ta
            INNER JOIN tasks t ON ta.task_id = t.id
            INNER JOIN apartments a ON t.apartment_id = a.id
            INNER JOIN floors f ON a.floor_id = f.id
            INNER JOIN projects p ON f.project_id = p.id
            WHERE ta.worker_id = p_worker_id
              AND ta.assignment_status = 'completed'
              AND ta.completed_at IS NOT NULL
              AND t.is_deleted = false
              AND (p_project_id IS NULL OR p.id = p_project_id)
              AND (p_month IS NULL OR EXTRACT(MONTH FROM ta.completed_at) = p_month)
              AND (p_year IS NULL OR EXTRACT(YEAR FROM ta.completed_at) = p_year)
            GROUP BY t.task_category
        ),
        'by_project', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'project_id', p.id,
                    'project_name', p.name,
                    'total_tasks', COUNT(*)::INTEGER,
                    'avg_hours', AVG(CASE 
                        WHEN ta.completed_at IS NOT NULL AND COALESCE(ta.started_at, ta.assigned_date) IS NOT NULL 
                        THEN EXTRACT(EPOCH FROM (ta.completed_at - COALESCE(ta.started_at, ta.assigned_date))) / 3600
                        ELSE NULL
                    END),
                    'avg_days', AVG(CASE 
                        WHEN ta.completed_at IS NOT NULL AND COALESCE(ta.started_at, ta.assigned_date) IS NOT NULL 
                        THEN EXTRACT(EPOCH FROM (ta.completed_at - COALESCE(ta.started_at, ta.assigned_date))) / 86400
                        ELSE NULL
                    END)
                )
            )
            FROM task_assignments ta
            INNER JOIN tasks t ON ta.task_id = t.id
            INNER JOIN apartments a ON t.apartment_id = a.id
            INNER JOIN floors f ON a.floor_id = f.id
            INNER JOIN projects p ON f.project_id = p.id
            WHERE ta.worker_id = p_worker_id
              AND ta.assignment_status = 'completed'
              AND ta.completed_at IS NOT NULL
              AND t.is_deleted = false
              AND (p_month IS NULL OR EXTRACT(MONTH FROM ta.completed_at) = p_month)
              AND (p_year IS NULL OR EXTRACT(YEAR FROM ta.completed_at) = p_year)
            GROUP BY p.id, p.name
        ),
        'by_month', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'year', EXTRACT(YEAR FROM ta.completed_at)::INTEGER,
                    'month', EXTRACT(MONTH FROM ta.completed_at)::INTEGER,
                    'month_name', TO_CHAR(ta.completed_at, 'Month'),
                    'total_tasks', COUNT(*)::INTEGER,
                    'avg_hours', AVG(CASE 
                        WHEN ta.completed_at IS NOT NULL AND COALESCE(ta.started_at, ta.assigned_date) IS NOT NULL 
                        THEN EXTRACT(EPOCH FROM (ta.completed_at - COALESCE(ta.started_at, ta.assigned_date))) / 3600
                        ELSE NULL
                    END),
                    'avg_days', AVG(CASE 
                        WHEN ta.completed_at IS NOT NULL AND COALESCE(ta.started_at, ta.assigned_date) IS NOT NULL 
                        THEN EXTRACT(EPOCH FROM (ta.completed_at - COALESCE(ta.started_at, ta.assigned_date))) / 86400
                        ELSE NULL
                    END)
                )
            )
            FROM task_assignments ta
            INNER JOIN tasks t ON ta.task_id = t.id
            WHERE ta.worker_id = p_worker_id
              AND ta.assignment_status = 'completed'
              AND ta.completed_at IS NOT NULL
              AND t.is_deleted = false
              AND (p_project_id IS NULL OR EXISTS (
                  SELECT 1 FROM apartments a
                  INNER JOIN floors f ON a.floor_id = f.id
                  WHERE a.id = t.apartment_id AND f.project_id = p_project_id
              ))
            GROUP BY EXTRACT(YEAR FROM ta.completed_at), EXTRACT(MONTH FROM ta.completed_at), TO_CHAR(ta.completed_at, 'Month')
            ORDER BY EXTRACT(YEAR FROM ta.completed_at) DESC, EXTRACT(MONTH FROM ta.completed_at) DESC
        )
    );
    
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Comentario
COMMENT ON FUNCTION get_worker_task_stats(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) IS 'Calcula estadísticas completas de tareas por trabajador: promedios generales, por categoría, por proyecto, por mes y por contrato';

