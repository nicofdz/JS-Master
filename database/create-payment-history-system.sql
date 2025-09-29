-- =====================================================
-- SISTEMA DE HISTORIAL DE PAGOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Crear tabla de historial de pagos
CREATE TABLE IF NOT EXISTS public.worker_payment_history (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER REFERENCES public.workers(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(10,2) NOT NULL,
  tasks_count INTEGER NOT NULL DEFAULT 0,
  work_days INTEGER NOT NULL DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'completed' CHECK (payment_status IN ('completed', 'pending', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id)
);

-- 2. Crear tabla de relación entre pagos y tareas
CREATE TABLE IF NOT EXISTS public.payment_tasks (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER REFERENCES public.worker_payment_history(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES public.apartment_tasks(id) ON DELETE CASCADE,
  task_payment_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(payment_id, task_id)
);

-- 3. Agregar comentarios para documentar
COMMENT ON TABLE public.worker_payment_history IS 'Historial de pagos realizados a trabajadores';
COMMENT ON TABLE public.payment_tasks IS 'Relación entre pagos y las tareas que los generaron';

COMMENT ON COLUMN public.worker_payment_history.worker_id IS 'ID del trabajador que recibió el pago';
COMMENT ON COLUMN public.worker_payment_history.payment_date IS 'Fecha en que se realizó el pago';
COMMENT ON COLUMN public.worker_payment_history.total_amount IS 'Monto total pagado';
COMMENT ON COLUMN public.worker_payment_history.tasks_count IS 'Número de tareas incluidas en el pago';
COMMENT ON COLUMN public.worker_payment_history.work_days IS 'Días trabajados para este pago';
COMMENT ON COLUMN public.worker_payment_history.payment_status IS 'Estado del pago (completed, pending, cancelled)';

-- 4. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_worker_payment_history_worker_id ON public.worker_payment_history(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_payment_history_payment_date ON public.worker_payment_history(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_tasks_payment_id ON public.payment_tasks(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_tasks_task_id ON public.payment_tasks(task_id);

-- 5. Eliminar vista existente si existe y crear nueva
DROP VIEW IF EXISTS public.worker_payment_summary;

-- 6. Crear vista actualizada de resumen de pagos
CREATE VIEW public.worker_payment_summary AS
SELECT 
    w.id as worker_id,
    w.full_name,
    w.rut,
    w.cargo,
    COUNT(at.id) as total_tasks,
    COUNT(CASE WHEN at.status = 'completed' THEN 1 END) as completed_tasks,
    COALESCE(SUM(at.worker_payment), 0) as total_payment_due,
    COALESCE(SUM(CASE WHEN at.status = 'completed' THEN at.worker_payment ELSE 0 END), 0) as pending_payment,
    COALESCE(SUM(CASE WHEN at.status != 'completed' THEN at.worker_payment ELSE 0 END), 0) as uncompleted_payment,
    -- Agregar total pagado del historial
    COALESCE((
        SELECT SUM(wph.total_amount) 
        FROM public.worker_payment_history wph 
        WHERE wph.worker_id = w.id 
        AND wph.payment_status = 'completed'
    ), 0) as total_paid
FROM public.workers w
LEFT JOIN public.apartment_tasks at ON w.id = at.assigned_to
WHERE w.is_active = true
GROUP BY w.id, w.full_name, w.rut, w.cargo
ORDER BY total_payment_due DESC;

-- 6. Función para procesar un pago
CREATE OR REPLACE FUNCTION process_worker_payment(
    p_worker_id INTEGER,
    p_payment_date DATE DEFAULT CURRENT_DATE,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_payment_id INTEGER;
    v_total_amount DECIMAL(10,2);
    v_tasks_count INTEGER;
    v_work_days INTEGER;
    task_record RECORD;
BEGIN
    -- Calcular el total de pagos pendientes
    SELECT 
        COALESCE(SUM(worker_payment), 0),
        COUNT(*),
        COALESCE(EXTRACT(DAYS FROM (MAX(created_at) - MIN(created_at))) + 1, 1)
    INTO v_total_amount, v_tasks_count, v_work_days
    FROM public.apartment_tasks 
    WHERE assigned_to = p_worker_id 
    AND status = 'completed' 
    AND worker_payment IS NOT NULL 
    AND worker_payment > 0;

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
        p_payment_date, 
        v_total_amount, 
        v_tasks_count, 
        v_work_days, 
        p_notes, 
        p_created_by
    ) RETURNING id INTO v_payment_id;

    -- Crear las relaciones con las tareas
    FOR task_record IN 
        SELECT id, worker_payment 
        FROM public.apartment_tasks 
        WHERE assigned_to = p_worker_id 
        AND status = 'completed' 
        AND worker_payment IS NOT NULL 
        AND worker_payment > 0
    LOOP
        INSERT INTO public.payment_tasks (payment_id, task_id, task_payment_amount)
        VALUES (v_payment_id, task_record.id, task_record.worker_payment);
    END LOOP;

    -- Resetear los pagos de las tareas completadas
    UPDATE public.apartment_tasks 
    SET worker_payment = 0 
    WHERE assigned_to = p_worker_id 
    AND status = 'completed' 
    AND worker_payment IS NOT NULL 
    AND worker_payment > 0;

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Función para obtener historial de pagos de un trabajador
CREATE OR REPLACE FUNCTION get_worker_payment_history(p_worker_id INTEGER)
RETURNS TABLE (
    payment_id INTEGER,
    payment_date DATE,
    total_amount DECIMAL(10,2),
    tasks_count INTEGER,
    work_days INTEGER,
    payment_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wph.id,
        wph.payment_date,
        wph.total_amount,
        wph.tasks_count,
        wph.work_days,
        wph.payment_status,
        wph.notes,
        wph.created_at
    FROM public.worker_payment_history wph
    WHERE wph.worker_id = p_worker_id
    ORDER BY wph.payment_date DESC;
END;
$$ LANGUAGE plpgsql;

-- 8. Función para obtener detalles de tareas de un pago
CREATE OR REPLACE FUNCTION get_payment_task_details(p_payment_id INTEGER)
RETURNS TABLE (
    task_id INTEGER,
    task_name VARCHAR(255),
    project_name TEXT,
    apartment_number VARCHAR(20),
    task_payment_amount DECIMAL(10,2),
    task_status VARCHAR(50),
    task_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        at.id,
        at.task_name,
        p.name as project_name,
        a.apartment_number,
        pt.task_payment_amount,
        at.status,
        at.created_at
    FROM public.payment_tasks pt
    JOIN public.apartment_tasks at ON pt.task_id = at.id
    JOIN public.apartments a ON at.apartment_id = a.id
    JOIN public.floors f ON a.floor_id = f.id
    JOIN public.projects p ON f.project_id = p.id
    WHERE pt.payment_id = p_payment_id
    ORDER BY at.created_at;
END;
$$ LANGUAGE plpgsql;
