-- =====================================================
-- CREAR VISTA SIMPLE DE PAGOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Eliminar la vista existente si existe
DROP VIEW IF EXISTS public.worker_payment_summary;

-- Crear vista simple que funcione
CREATE VIEW public.worker_payment_summary AS
SELECT 
    w.id as worker_id,
    w.full_name,
    w.rut,
    w.cargo,
    COUNT(at.id) as total_tasks,
    COUNT(CASE WHEN at.status = 'completed' THEN 1 END) as completed_tasks,
    -- Costos Pendientes: tareas pendientes/en progreso
    COALESCE(SUM(CASE WHEN at.status IN ('pending', 'in_progress') THEN at.estimated_cost ELSE 0 END), 0) as pending_payment,
    -- Por Pagar: tareas completadas no pagadas
    COALESCE(SUM(CASE WHEN at.status = 'completed' AND (at.is_paid = FALSE OR at.is_paid IS NULL) THEN at.worker_payment ELSE 0 END), 0) as uncompleted_payment,
    -- Total Pagado: suma del historial
    COALESCE((
        SELECT SUM(wph.total_amount) 
        FROM public.worker_payment_history wph 
        WHERE wph.worker_id = w.id
    ), 0) as total_paid,
    -- Total Payment Due: suma de todos los pagos pendientes
    COALESCE(SUM(CASE WHEN at.status = 'completed' AND (at.is_paid = FALSE OR at.is_paid IS NULL) THEN at.worker_payment ELSE 0 END), 0) as total_payment_due
FROM public.workers w
LEFT JOIN public.apartment_tasks at ON w.id = at.assigned_to
WHERE w.is_active = true
GROUP BY w.id, w.full_name, w.rut, w.cargo;

-- Comentario para la vista
COMMENT ON VIEW public.worker_payment_summary IS 'Vista simple de pagos: Costos Pendientes, Por Pagar, Total Pagado';
