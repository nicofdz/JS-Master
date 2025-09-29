-- =====================================================
-- AGREGAR CAMPO DE PAGO A TRABAJADOR EN TAREAS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Agregar columna worker_payment a la tabla apartment_tasks
ALTER TABLE public.apartment_tasks 
ADD COLUMN IF NOT EXISTS worker_payment DECIMAL(10,2) DEFAULT NULL;

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN public.apartment_tasks.estimated_cost IS 'Costo estimado de la tarea (materiales, herramientas, etc.)';
COMMENT ON COLUMN public.apartment_tasks.worker_payment IS 'Pago al trabajador asignado por esta tarea';

-- Crear índices para mejorar consultas por costos y pagos
CREATE INDEX IF NOT EXISTS idx_apartment_tasks_estimated_cost ON public.apartment_tasks(estimated_cost) WHERE estimated_cost IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apartment_tasks_worker_payment ON public.apartment_tasks(worker_payment) WHERE worker_payment IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apartment_tasks_assigned_to_payment ON public.apartment_tasks(assigned_to, worker_payment) WHERE assigned_to IS NOT NULL AND worker_payment IS NOT NULL;

-- Crear vista para seguimiento de pagos por trabajador
CREATE OR REPLACE VIEW public.worker_payment_summary AS
SELECT 
    w.id as worker_id,
    w.full_name,
    w.rut,
    w.cargo,
    COUNT(at.id) as total_tasks,
    COUNT(CASE WHEN at.status = 'completed' THEN 1 END) as completed_tasks,
    COALESCE(SUM(at.worker_payment), 0) as total_payment_due,
    COALESCE(SUM(CASE WHEN at.status = 'completed' THEN at.worker_payment ELSE 0 END), 0) as completed_payment,
    COALESCE(SUM(CASE WHEN at.status != 'completed' THEN at.worker_payment ELSE 0 END), 0) as pending_payment
FROM public.workers w
LEFT JOIN public.apartment_tasks at ON w.id = at.assigned_to
WHERE w.is_active = true
GROUP BY w.id, w.full_name, w.rut, w.cargo
ORDER BY total_payment_due DESC;

-- Comentario para la vista
COMMENT ON VIEW public.worker_payment_summary IS 'Resumen de pagos pendientes y completados por trabajador';

-- Función para calcular el total de pagos pendientes por trabajador
CREATE OR REPLACE FUNCTION get_worker_pending_payment(worker_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(worker_payment) 
         FROM public.apartment_tasks 
         WHERE assigned_to = worker_id 
         AND status != 'completed' 
         AND worker_payment IS NOT NULL), 
        0
    );
END;
$$ LANGUAGE plpgsql;

-- Función para calcular el total de pagos completados por trabajador
CREATE OR REPLACE FUNCTION get_worker_completed_payment(worker_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(worker_payment) 
         FROM public.apartment_tasks 
         WHERE assigned_to = worker_id 
         AND status = 'completed' 
         AND worker_payment IS NOT NULL), 
        0
    );
END;
$$ LANGUAGE plpgsql;

