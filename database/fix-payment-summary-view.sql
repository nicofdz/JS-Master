-- =====================================================
-- CORREGIR VISTA DE RESUMEN DE PAGOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Eliminar la vista existente
DROP VIEW IF EXISTS public.worker_payment_summary;

-- Crear la vista corregida con la lógica adecuada
CREATE VIEW public.worker_payment_summary AS
SELECT 
    w.id as worker_id,
    w.full_name,
    w.rut,
    w.cargo,
    COUNT(at.id) as total_tasks,
    COUNT(CASE WHEN at.status = 'completed' THEN 1 END) as completed_tasks,
    -- Costos Pendientes: tareas pendientes/en progreso (NO completadas)
    COALESCE(SUM(CASE WHEN at.status IN ('pending', 'in_progress') THEN at.estimated_cost ELSE 0 END), 0) as pending_payment,
    -- Por Pagar: tareas completadas pero NO pagadas
    COALESCE(SUM(CASE WHEN at.status = 'completed' AND (at.is_paid = FALSE OR at.is_paid IS NULL) THEN at.worker_payment ELSE 0 END), 0) as uncompleted_payment,
    -- Total Pagado: suma del historial de pagos
    COALESCE((
        SELECT SUM(wph.total_amount) 
        FROM public.worker_payment_history wph 
        WHERE wph.worker_id = w.id
    ), 0) as total_paid
FROM public.workers w
LEFT JOIN public.apartment_tasks at ON w.id = at.assigned_to
WHERE w.is_active = true
GROUP BY w.id, w.full_name, w.rut, w.cargo
ORDER BY (COALESCE(SUM(CASE WHEN at.status IN ('pending', 'in_progress') THEN at.estimated_cost ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN at.status = 'completed' AND (at.is_paid = FALSE OR at.is_paid IS NULL) THEN at.worker_payment ELSE 0 END), 0)) DESC;

-- Comentario para la vista
COMMENT ON VIEW public.worker_payment_summary IS 'Vista corregida: Costos Pendientes (tareas pendientes/en progreso), Por Pagar (tareas completadas no pagadas), Total Pagado (historial)';
