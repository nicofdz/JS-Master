-- =====================================================
-- CORREGIR LÓGICA DE LA VISTA DE PAGOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Verificar qué campos tenemos en apartment_tasks
SELECT 'Campos disponibles en apartment_tasks:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'apartment_tasks' 
AND table_schema = 'public'
AND column_name IN ('estimated_cost', 'worker_payment', 'estimated_hours')
ORDER BY column_name;

-- Verificar algunos datos de ejemplo
SELECT 'Datos de ejemplo:' as info;
SELECT 
    task_name,
    status,
    estimated_cost,
    worker_payment,
    estimated_hours
FROM public.apartment_tasks 
LIMIT 5;

-- Eliminar la vista existente
DROP VIEW IF EXISTS public.worker_payment_summary;

-- Crear vista corregida con lógica clara
CREATE VIEW public.worker_payment_summary AS
SELECT 
    w.id as worker_id,
    w.full_name,
    w.rut,
    w.cargo,
    COUNT(at.id) as total_tasks,
    COUNT(CASE WHEN at.status = 'completed' THEN 1 END) as completed_tasks,
    -- Costos Pendientes: pago al trabajador para tareas pendientes/en progreso
    COALESCE(SUM(CASE WHEN at.status IN ('pending', 'in_progress') THEN at.worker_payment ELSE 0 END), 0) as pending_payment,
    -- Por Pagar: pago al trabajador para tareas completadas no pagadas
    COALESCE(SUM(CASE WHEN at.status = 'completed' AND (at.is_paid = FALSE OR at.is_paid IS NULL) THEN at.worker_payment ELSE 0 END), 0) as uncompleted_payment,
    -- Total Pagado: suma del historial de pagos
    COALESCE((
        SELECT SUM(wph.total_amount) 
        FROM public.worker_payment_history wph 
        WHERE wph.worker_id = w.id
    ), 0) as total_paid,
    -- Total Payment Due: suma de todos los pagos pendientes al trabajador
    COALESCE(SUM(CASE WHEN at.status = 'completed' AND (at.is_paid = FALSE OR at.is_paid IS NULL) THEN at.worker_payment ELSE 0 END), 0) as total_payment_due
FROM public.workers w
LEFT JOIN public.apartment_tasks at ON w.id = at.assigned_to
WHERE w.is_active = true
GROUP BY w.id, w.full_name, w.rut, w.cargo;

-- Comentario para la vista
COMMENT ON VIEW public.worker_payment_summary IS 'Vista corregida: Costos Pendientes (materiales), Por Pagar (pago trabajador), Total Pagado';

-- Verificar que la vista funciona
SELECT 'Verificación de la vista:' as info;
SELECT * FROM public.worker_payment_summary LIMIT 3;
